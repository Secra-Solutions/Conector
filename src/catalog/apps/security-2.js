// Cybersecurity (2): vulnerability scanners and DAST, malware sandboxes, threat intelligence, SOC/EDR and package
// vulnerabilities. The specific tools return compact summaries; the full detail is requested with *_request.
import crypto from "node:crypto";
import { z } from "zod";
import { USER_AGENT, httpRequest } from "../../http.js";
import { ensureOk, normalizeUrl } from "../define.js";

const seg = (v) => encodeURIComponent(String(v).trim());
const truncate = (t, n = 300) => (typeof t === "string" && t.length > n ? `${t.slice(0, n)}…` : t);
// Dates as seconds or milliseconds since 1970 (number or text) or ISO 8601 → YYYY-MM-DD.
function day(t) {
  if (!t) return undefined;
  const n = typeof t === "number" ? t : /^\d{9,}$/.test(String(t)) ? Number(t) : null;
  return (n === null ? String(t) : new Date(n > 1e11 ? n : n * 1000).toISOString()).slice(0, 10);
}
const fql = (t) => String(t).trim().replace(/\\/g, "\\\\").replace(/'/g, "\\'");

// GraphQL: if there are errors and no data, a readable error is thrown.
async function graphql(p, route, query, variables, service) {
  const d = ensureOk(await p({ method: "POST", path: route, body: { query, variables } }), service);
  if (d?.errors?.length && !Object.values(d.data || {}).some((v) => v != null)) {
    throw new Error(`${service}: ${d.errors.map((e) => e.message).join("; ")}`);
  }
  return d.data || {};
}

const TENABLE_SEVERITY = ["info", "low", "medium", "high", "critical"];

const QUALYS_PLATFORMS = [
  ["qualysapi.qualys.eu", "EU1 (qualysguard.qualys.eu)"], ["qualysapi.qg2.apps.qualys.eu", "EU2 (qualysguard.qg2.apps.qualys.eu)"],
  ["qualysapi.qg3.apps.qualys.it", "EU3 (qualysguard.qg3.apps.qualys.it)"], ["qualysapi.qualys.com", "US1 (qualysguard.qualys.com)"],
  ["qualysapi.qg2.apps.qualys.com", "US2 (qualysguard.qg2.apps.qualys.com)"],
  ["qualysapi.qg3.apps.qualys.com", "US3 (qualysguard.qg3.apps.qualys.com)"],
  ["qualysapi.qg4.apps.qualys.com", "US4 (qualysguard.qg4.apps.qualys.com)"],
  ["qualysapi.qg1.apps.qualys.co.uk", "UK1 (qualysguard.qg1.apps.qualys.co.uk)"],
  ["qualysapi.qg1.apps.qualys.ca", "CA1 (qualysguard.qg1.apps.qualys.ca)"],
  ["qualysapi.qg1.apps.qualys.in", "IN1 (qualysguard.qg1.apps.qualys.in)"],
  ["qualysapi.qg1.apps.qualys.ae", "AE1 (qualysguard.qg1.apps.qualys.ae)"],
  ["qualysapi.qg1.apps.qualys.com.au", "AU1 (qualysguard.qg1.apps.qualys.com.au)"],
  ["qualysapi.qg1.apps.qualysksa.com", "KSA1 (qualysguard.qg1.apps.qualysksa.com)"],
];

const BURP_COUNTS = "issue_counts { total high { total } medium { total } low { total } info { total } }";
const BURP_SCANS_QUERY = `query Scans($max: Int, $statuses: [ScanStatus]) {
  scans(offset: 0, limit: $max, sort_column: start, sort_order: desc, scan_status: $statuses) {
    id status start_time end_time duration_in_seconds scan_failure_message scan_target { id name } ${BURP_COUNTS}
  }
}`;
const BURP_ISSUES_QUERY = `query Issues($id: ID!, $start: Int!, $max: Int!, $severities: [Severity]) {
  scan(id: $id) {
    id status scan_target { name } ${BURP_COUNTS}
    issues(start: $start, count: $max, severities: $severities) {
      serial_number severity confidence novelty origin path issue_type { name type_index }
    }
  }
}`;
const burpCounts = (c) => (c
  ? { total: c.total, high: c.high?.total, medium: c.medium?.total, low: c.low?.total, info: c.info?.total } : undefined);

const ZAP_RISKS = { Informational: 0, Low: 1, Medium: 2, High: 3 };
const ZAP_LEVELS = { informational: 0, low: 1, medium: 2, high: 3 };

const MISP_THREAT = { 1: "high", 2: "medium", 3: "low", 4: "undefined" };
const MISP_ANALYSIS = { 0: "initial", 1: "ongoing", 2: "completed" };
const mispAttribute = (a) => ({ id: a.id, category: a.category, type: a.type, value: a.value, ids: a.to_ids, date: day(a.timestamp),
                               comment: truncate(a.comment, 150) || undefined, tags: a.Tag?.map((t) => t.name) });

const OPENCTI_QUERY = `query Search($text: String, $max: Int, $types: [String]) {
  stixCoreObjects(search: $text, first: $max, types: $types) {
    pageInfo { globalCount }
    edges { node {
      id entity_type created_at updated_at representative { main secondary } createdBy { name }
      objectLabel { value } objectMarking { definition }
      ... on StixCyberObservable { observable_value x_opencti_score }
      ... on Indicator { pattern valid_until x_opencti_score }
      ... on StixDomainObject { confidence }
    } }
  }
}`;

// TheHive 5: queries for the /query API (list → filter → sort → page).
function theHiveQuery(list, { stage, min_severity, text, max, offset }) {
  const filters = [stage && { _eq: { _field: "stage", _value: stage } },
    min_severity && { _gte: { _field: "severity", _value: min_severity } },
    text && { _like: { _field: "title", _value: `*${text.trim()}*` } }].filter(Boolean);
  return { query: [{ _name: list },
    ...(filters.length ? [{ _name: "filter", ...(filters.length === 1 ? filters[0] : { _and: filters }) }] : []),
    { _name: "sort", _fields: [{ _createdAt: "desc" }] }, { _name: "page", from: offset, to: offset + max }] };
}
const THEHIVE_SEVERITY = z.number().int().min(1).max(4).optional().describe("Minimum severity: 1 low, 2 medium, 3 high, 4 critical");
const THEHIVE_TEXT = z.string().optional().describe("Text contained in the title");

// Wazuh: the JWT is requested with username and password (POST /security/user/authenticate) and kept in memory until shortly
// before it expires (15 minutes by default; at most 5 minutes here, in case the server revokes tokens when it restarts).
let wazuhToken = null;
async function getWazuhToken(c) {
  const url = normalizeUrl(c.url);
  const fingerprint = crypto.createHash("sha256").update(JSON.stringify([url, c.username, c.key])).digest("hex");
  if (wazuhToken?.fingerprint === fingerprint && wazuhToken.expires > Date.now() + 30_000) return wazuhToken.token;
  const basicAuth = Buffer.from(`${c.username}:${c.key}`).toString("base64");
  const d = ensureOk(await httpRequest(`${url}/security/user/authenticate`, { method: "POST",
    headers: { Accept: "application/json", "User-Agent": USER_AGENT, Authorization: `Basic ${basicAuth}` } }), "Wazuh");
  const token = d?.data?.token;
  if (!token) throw new Error("Wazuh: the authentication response does not include a token");
  let expires = Date.now() + 300_000;
  try {
    const { exp } = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
    if (exp) expires = Math.min(expires, exp * 1000);
  } catch {
    // A token that is not a JWT: renewed after 5 minutes.
  }
  wazuhToken = { fingerprint, token, expires };
  return token;
}

// abuse.ch: indicator type inferred from its shape.
function iocType(v) {
  if (/^(?:[a-f0-9]{32}|[a-f0-9]{40}|[a-f0-9]{64})$/i.test(v)) return "hash";
  if (/^https?:\/\//i.test(v)) return "url";
  if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(v) || (v.includes(":") && /^[0-9a-f:.]+$/i.test(v))) return "ip";
  return "domain";
}
const urlhausSummary = (d) => ({
  reference: d.urlhaus_reference, status: d.url_status, threat: d.threat, family: d.signature, file_type: d.file_type,
  first_seen: d.firstseen || d.date_added, last_seen: d.lastseen || d.last_online, tags: d.tags, blacklists: d.blacklists,
  url_count: d.url_count, urls: d.urls?.slice(0, 15).map((u) => ({ url: u.url, status: u.url_status, threat: u.threat,
                                                                    date: u.date_added || u.firstseen, tags: u.tags })),
  samples: d.payloads?.slice(0, 10).map((m) => ({ file: m.filename, type: m.file_type, sha256: m.response_sha256,
                                                    family: m.signature, date: m.firstseen })),
});
function malwareBazaarSummary(m = {}) {
  const vendors = Object.entries(m.vendor_intel || {}).map(([k, x]) => {
    const y = Array.isArray(x) ? x[0] : x;
    return [k, y?.verdict || y?.malware_family || y?.family_name || y?.threat_name || y?.status || y?.score];
  }).filter(([, v]) => v);
  return { sha256: m.sha256_hash, md5: m.md5_hash, sha1: m.sha1_hash, name: m.file_name, type: m.file_type, size: m.file_size,
           family: m.signature, tags: m.tags, first_seen: m.first_seen, last_seen: m.last_seen, country: m.origin_country,
           delivery: m.delivery_method, clamav: m.intelligence?.clamav, downloads: m.intelligence?.downloads,
           yara: m.yara_rules?.slice(0, 15).map((r) => r.rule_name), vendors: Object.fromEntries(vendors) };
}

// OSV: affected version ranges (introduced/fixed/last_affected) as compact text.
function osvRanges(events = []) {
  const output = [];
  let start = null;
  for (const e of events) {
    if (e.introduced !== undefined) {
      if (start) output.push(start);
      start = `>= ${e.introduced}`;
    } else if (e.fixed !== undefined || e.last_affected !== undefined || e.limit !== undefined) {
      const end = e.fixed !== undefined ? `< ${e.fixed}` : e.last_affected !== undefined ? `<= ${e.last_affected}` : `< ${e.limit}`;
      output.push(`${start || ">= 0"}, ${end}`);
      start = null;
    }
  }
  if (start) output.push(start);
  return output.join(" | ");
}
function osvSummary(v, pkg) {
  const affected = (v.affected || []).filter((a) => !pkg || a.package?.name?.toLowerCase() === pkg.toLowerCase());
  const fixed = affected.flatMap((a) => (a.ranges || []).filter((r) => r.type !== "GIT")
    .flatMap((r) => (r.events || []).map((e) => e.fixed).filter(Boolean)));
  return { id: v.id, alias: v.aliases, summary: v.summary || truncate(v.details, 200), severity: v.database_specific?.severity,
           cvss: v.severity?.map((s) => s.score), cwe: v.database_specific?.cwe_ids, fixed_in: [...new Set(fixed)].slice(0, 10),
           published: day(v.published), withdrawn: v.withdrawn ? day(v.withdrawn) : undefined };
}

export default [
  {
    id: "tenable", name: "Tenable Vulnerability Management", category: "security",
    description: "Tenable scans, assets and vulnerabilities (formerly Tenable.io)",
    website: "https://www.tenable.com/products/vulnerability-management", docs: "https://developer.tenable.com/reference/navigate",
    logo: { favicon: "https://www.tenable.com" },
    baseUrl: "https://cloud.tenable.com",
    auth: { type: "custom",
            apply: (c) => ({ headers: { "X-ApiKeys": `accessKey=${c.access_key}; secretKey=${c.secret_key}` } }) },
    fields: [{ id: "access_key", label: "Access key", secret: true },
             { id: "secret_key", label: "Secret key", secret: true }],
    help: "1) At cloud.tenable.com click your user icon (top right) → “My Profile” → “API Keys” → “Generate” and "
      + "copy the Access key and the Secret key: they are shown only once and generating new ones invalidates the previous ones. 2) Prefer a "
      + "dedicated user with the minimum permissions (the keys inherit them): an administrator creates it under “Settings” → “Access "
      + "Control” → “Users”, where they can also generate its keys; the user must have API access enabled. The API limits requests "
      + "per minute (it answers 429 when the limit is exceeded).",
    test: { path: "/session", account: (d) => [d.username || d.email, d.container_name].filter(Boolean).join(" · ") },
    examples: "Examples: GET /scans, GET /scans/{scan_id} (hosts and vulnerabilities of the latest result), "
      + "GET /workbenches/vulnerabilities?date_range=30&severity=critical, GET /workbenches/vulnerabilities/{plugin_id}/info, "
      + "GET /workbenches/assets?date_range=30, GET /workbenches/assets/{asset_uuid}/vulnerabilities, "
      + "POST /vulns/export {\"num_assets\": 500, \"filters\": {\"severity\": [\"critical\", \"high\"]}} → "
      + "GET /vulns/export/{uuid}/status → GET /vulns/export/{uuid}/chunks/{n}, GET /plugins/plugin/{id}, GET /scanners, "
      + "POST /scans/{scan_id}/launch (launches a scan).",
    tools: [
      { name: "tenable_vulnerabilities", title: "Tenable: detected vulnerabilities", annotations: { readOnlyHint: true },
        description: "Workbench vulnerabilities grouped by plugin: plugin id and name, family, severity, VPR, CVSS, "
          + "number of occurrences and state, from most to least severe. Filters by severity, age and whether a known exploit "
          + "exists; the detail of a plugin is requested with GET /workbenches/vulnerabilities/{plugin_id}/info.",
        schema: { severity: z.enum(["critical", "high", "medium", "low"]).optional(),
                   days: z.number().int().min(1).max(365).default(30).describe("Seen in the last N days"),
                   exploitable: z.boolean().default(false).describe("Only those with a known exploit"),
                   max: z.number().int().min(1).max(500).default(100) },
        async run({ severity, days, exploitable, max }, p) {
          const query = { date_range: days, severity: severity, ...(exploitable ? { exploitable: "true" } : {}) };
          const d = ensureOk(await p({ path: "/workbenches/vulnerabilities", query }), "Tenable");
          const list = (d.vulnerabilities || []).sort((a, b) => (b.severity - a.severity)
            || ((b.vpr_score || 0) - (a.vpr_score || 0)) || (b.count - a.count));
          return { total: d.total_vulnerability_count, assets: d.total_asset_count, vulnerabilities: list.slice(0, max).map((v) => ({
            plugin: v.plugin_id, name: v.plugin_name, family: v.plugin_family, severity: TENABLE_SEVERITY[v.severity] ?? v.severity,
            vpr: v.vpr_score, cvss3: v.cvss3_base_score, cvss: v.cvss_base_score, occurrences: v.count, state: v.vulnerability_state })) };
        } },
      { name: "tenable_scans", title: "Tenable: scans", annotations: { readOnlyHint: true },
        description: "Configured scans from newest to oldest: id, name, status of the last result, type, "
          + "schedule, folder, owner and dates. The results of one scan are requested with GET /scans/{id}.",
        schema: { status: z.string().optional().describe("completed, running, canceled, aborted, empty…"),
                   max: z.number().int().min(1).max(200).default(50) },
        async run({ status: statusFilter, max }, p) {
          const d = ensureOk(await p({ path: "/scans" }), "Tenable");
          const folders = Object.fromEntries((d.folders || []).map((f) => [f.id, f.name]));
          return (d.scans || []).filter((s) => !statusFilter || s.status === statusFilter)
            .sort((a, b) => (b.last_modification_date || 0) - (a.last_modification_date || 0)).slice(0, max)
            .map((s) => ({ id: s.id, name: s.name, status: s.status, type: s.type, schedule: s.enabled ? s.rrules : undefined,
                           folder: folders[s.folder_id], owner: s.owner, created: day(s.creation_date),
                           modified: day(s.last_modification_date) }));
        } },
    ],
  },
  {
    id: "qualys", name: "Qualys VMDR", category: "security", description: "Scans, hosts and vulnerability detections (VMDR)",
    website: "https://www.qualys.com", docs: "https://docs.qualys.com/en/vm/api/", logo: { simpleIcons: "qualys" },
    baseUrl: "https://{platform}", headers: { "X-Requested-With": "conector" }, timeout: 300_000,
    auth: { type: "basic", usernameField: "username", passwordField: "key" },
    fields: [{ id: "platform", label: "Platform", default: "qualysapi.qualys.eu", options: QUALYS_PLATFORMS,
               help: "The one matching the address you use to sign in to Qualys (see qualys.com/platform-identification)." },
             { id: "username", label: "Qualys username" },
             { id: "key", label: "Password", secret: true }],
    help: "The VM/PC API is used with a username and password. 1) A Manager enables API access for the user: “Users” → "
      + "edit the user → “User Role” → select “API” under “Allow access to”. 2) Prefer a dedicated user with the Reader (or "
      + "Scanner) role and only the necessary asset groups; SSO accounts do not work. 3) Choose the platform according to the address "
      + "you use to sign in (qualysguard.qualys.eu → EU1, qualysguard.qg2.apps.qualys.eu → EU2…). The subscription limits calls "
      + "per hour and concurrent calls (X-RateLimit-* headers).",
    test: { path: "/api/5.0/fo/asset/host/", query: { action: "list", truncation_limit: 1 }, message: "Credentials are valid" },
    examples: "Responses are XML. Qualys is retiring the old paths (/api/2.0 and /api/3.0 in several functions): use the versions in "
      + "these examples and, if a response carries the comment “API EOS Warning”, switch to the path it indicates. Examples: "
      + "GET /api/4.0/fo/asset/host/vm/detection/?action=list&severities=4-5&status=New,Active,Re-Opened&truncation_limit=100 "
      + "(detections per host), GET /api/5.0/fo/asset/host/?action=list&details=Basic&truncation_limit=100, "
      + "GET /api/4.0/fo/knowledge_base/vuln/?action=list&ids={QID}&details=All, "
      + "GET /api/3.0/fo/scan/?action=list&launched_after_datetime=2026-10-01, "
      + "GET /api/3.0/fo/scan/?action=fetch&scan_ref=scan/…&output_format=json_extended (as JSON), "
      + "GET /api/2.0/fo/asset/group/?action=list, GET /api/3.0/fo/report/?action=list, "
      + "POST /api/3.0/fo/scan/?action=launch&scan_title=…&ip=…&option_title=… (launches a scan).",
  },
  {
    id: "burpsuite", name: "Burp Suite DAST", category: "security",
    description: "Burp Suite DAST (formerly Enterprise): sites, scans and issues",
    website: "https://portswigger.net/burp/dast",
    docs: "https://portswigger.net/burp/documentation/dast/user-guide/api-documentation/graphql-api", logo: { simpleIcons: "burpsuite" },
    baseUrl: "{url}",
    auth: { type: "header", name: "Authorization" },
    fields: [{ id: "url", label: "Burp Suite DAST URL", format: "url",
               help: "The URL of the Burp Suite DAST web server, e.g. https://burp.example.com (with the port if it is not 443)." },
             { id: "token", label: "API key", secret: true }],
    help: "1) Sign in to Burp Suite DAST as an administrator and open “Team” → “Add a new user”. 2) Enter a recognizable name and "
      + "username (e.g. “Conector”) and an email, choose “API Key” as the login type and add the user to a group with "
      + "the necessary permissions (e.g. only view sites and scans). 3) Save (icon at the top right) and copy the key: it cannot be "
      + "retrieved later. The server must be reachable over https with a valid certificate.",
    test: { method: "POST", path: "/graphql/v1", body: { query: "query Check { scans(limit: 1) { id } }" }, message: "Key is valid" },
    graphql: { path: "/graphql/v1" },
    examples: "GraphQL API (use burpsuite_graphql; queries must have a name), e.g. "
      + "query Sites { site_tree { sites { id name parent_id } folders { id name } } }, "
      + "query Scan { scan(id: \"12\") { status issues(start: 0, count: 100, severities: [high]) { serial_number path "
      + "issue_type { name } } } }, query Detail { issue(scan_id: \"12\", serial_number: \"…\") { issue_type { name } "
      + "description_html remediation_html } }, query Report { scan_report(scan_id: \"12\", include_false_positives: false) "
      + "{ report_html } }, query Configs { scan_configurations { id name } }. Mutations such as create_schedule_item schedule scans.",
    tools: [
      { name: "burpsuite_scans", title: "Burp Suite DAST: recent scans", annotations: { readOnlyHint: true },
        description: "Scans from newest to oldest: id, site, status, start, end, duration, issue counts by "
          + "severity and the failure reason, if any.",
        schema: { statuses: z.array(z.enum(["queued", "running", "succeeded", "cancelled", "failed", "paused"])).optional(),
                   max: z.number().int().min(1).max(100).default(20) },
        async run({ statuses, max }, p) {
          const d = await graphql(p, "/graphql/v1", BURP_SCANS_QUERY, { max, statuses }, "Burp Suite DAST");
          return (d.scans || []).map((s) => ({ id: s.id, site: s.scan_target?.name, status: s.status, start: s.start_time,
            end: s.end_time, minutes: s.duration_in_seconds ? Math.round(s.duration_in_seconds / 60) : undefined,
            issues: burpCounts(s.issue_counts), error: s.scan_failure_message || undefined }));
        } },
      { name: "burpsuite_issues", title: "Burp Suite DAST: issues of a scan", annotations: { readOnlyHint: true },
        description: "Issues of a scan: serial number, type, severity, confidence, novelty compared to the previous scan and "
          + "URL. The detail (description, remediation and evidence) is requested with the issue(scan_id, serial_number) query.",
        schema: { scan: z.string().describe("Scan ID (burpsuite_scans)"),
                   severities: z.array(z.enum(["high", "medium", "low", "info"])).optional(),
                   max: z.number().int().min(1).max(1000).default(200), start: z.number().int().min(0).default(0) },
        async run({ scan, severities, max, start }, p) {
          const variables = { id: scan.trim(), start, max, severities };
          const s = (await graphql(p, "/graphql/v1", BURP_ISSUES_QUERY, variables, "Burp Suite DAST")).scan;
          if (!s) return { scan, message: "That scan does not exist or you do not have access to it" };
          return { scan: s.id, site: s.scan_target?.name, status: s.status, counts: burpCounts(s.issue_counts),
                   issues: (s.issues || []).map((i) => ({ serial: i.serial_number, type: i.issue_type?.name, severity: i.severity,
                     confidence: i.confidence, novelty: i.novelty, url: `${i.origin}${i.path}` })) };
        } },
    ],
  },
  {
    id: "zap", name: "ZAP (Zed Attack Proxy)", category: "security",
    description: "Local ZAP DAST proxy and scanner: alerts, spider and active scan",
    website: "https://www.zaproxy.org", docs: "https://www.zaproxy.org/docs/api/", logo: { simpleIcons: "zap" },
    baseUrl: "{url}",
    auth: { type: "header", name: "X-ZAP-API-Key" },
    fields: [{ id: "url", label: "ZAP API address", format: "url", default: "http://localhost:8080",
               example: "https://example.invalid",
               help: "The address and port where ZAP listens on this server (default http://localhost:8080)." },
             { id: "token", label: "API key", secret: true }],
    help: "ZAP must be running on this server (desktop app or daemon mode, e.g. zap.sh -daemon -port 8080). 1) In ZAP: “Tools” → "
      + "“Options” → “API”: check that the API is enabled and copy the “API Key” (or set it at startup with -config api.key=…). "
      + "2) Leave only 127.0.0.1 in “Permitted addresses”. Conector only accepts http with localhost or 127.0.0.1; a ZAP on another "
      + "machine needs https with a valid certificate. Run spider and active scans only against targets you are authorized to test.",
    test: { path: "/JSON/core/view/version/", message: (d) => `ZAP ${d?.version ?? "?"} is responding` },
    examples: "Everything is GET (actions too). Examples: GET /JSON/core/view/sites/, GET /JSON/core/view/urls/?baseurl=https://…, "
      + "GET /JSON/alert/view/alertsSummary/?baseurl=…, GET /JSON/alert/view/alerts/?baseurl=…&riskId=3&start=0&count=100 (riskId: 0 "
      + "informational … 3 high), GET /JSON/alert/view/alert/?id=…, GET /JSON/spider/action/scan/?url=…&maxChildren=10 → "
      + "GET /JSON/spider/view/status/?scanId=…, GET /JSON/ajaxSpider/action/scan/?url=…, "
      + "GET /JSON/ascan/action/scan/?url=…&recurse=true (active scan) → GET /JSON/ascan/view/status/?scanId=…, "
      + "GET /JSON/pscan/view/recordsToScan/, GET /OTHER/core/other/jsonreport/ (full report).",
    tools: [
      { name: "zap_alerts", title: "ZAP: grouped alerts", annotations: { readOnlyHint: true },
        description: "ZAP alerts grouped by type and risk (name, risk, confidence, CWE, WASC, plugin, number of "
          + "occurrences, summarized solution and example URLs with their parameter and evidence), from most to least severe and without false "
          + "positives. Filters by base URL and minimum risk; the detail of an alert is requested with GET /JSON/alert/view/alert/?id=….",
        schema: { base_url: z.string().optional().describe("Only alerts under this URL, e.g. https://app.example.com"),
                   min_risk: z.enum(["informational", "low", "medium", "high"]).default("low"),
                   examples: z.number().int().min(1).max(20).default(3).describe("Example URLs per alert type") },
        async run({ base_url, min_risk, examples }, p) {
          const d = ensureOk(await p({ path: "/JSON/alert/view/alerts/", query: { baseurl: base_url, start: 0, count: 5000 } }), "ZAP");
          const groups = new Map();
          for (const a of d.alerts || []) {
            if ((ZAP_RISKS[a.risk] ?? 0) < ZAP_LEVELS[min_risk] || a.confidence === "False Positive") continue;
            const key = `${a.pluginId}|${a.alertRef || a.name}|${a.risk}`;
            const g = groups.get(key) || { alert: a.name || a.alert, risk: a.risk, confidence: a.confidence, cwe: a.cweid,
              wasc: a.wascid, plugin: a.pluginId, example_id: a.id, occurrences: 0, solution: truncate(a.solution, 200), urls: [] };
            g.occurrences++;
            if (g.urls.length < examples) {
              g.urls.push({ url: a.url, method: a.method, parameter: a.param || undefined,
                            evidence: truncate(a.evidence, 120) || undefined });
            }
            groups.set(key, g);
          }
          const types = [...groups.values()]
            .sort((x, y) => (ZAP_RISKS[y.risk] - ZAP_RISKS[x.risk]) || (y.occurrences - x.occurrences));
          const summary = {};
          for (const g of types) summary[g.risk] = (summary[g.risk] || 0) + g.occurrences;
          return { reviewed_alerts: (d.alerts || []).length, summary, types };
        } },
    ],
  },
  {
    id: "hybridanalysis", name: "Hybrid Analysis", category: "security",
    description: "Free CrowdStrike sandbox: malware reports by hash or URL",
    website: "https://hybrid-analysis.com", docs: "https://hybrid-analysis.com/docs/api/v2", logo: { favicon: "https://hybrid-analysis.com" },
    baseUrl: "https://hybrid-analysis.com/api/v2",
    headers: { "User-Agent": "Falcon Sandbox" },
    auth: { type: "header", name: "api-key" },
    fields: [{ id: "token", label: "API key", secret: true,
               example: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef" }],
    keyUrl: "https://hybrid-analysis.com/profile",
    help: "1) Create a free account at hybrid-analysis.com and sign in. 2) Open your profile (user menu → “Profile”) → “API key” "
      + "tab → “Create API key” and copy the key (if the API says the key is not compatible with v2, generate another one). The "
      + "basic key lets you search and query public reports with per-minute and per-hour quotas; downloading samples or viewing some "
      + "reports requires requesting verification (“vetting”). Everything submitted for analysis is public.",
    test: { path: "/key/current", message: (d) => `Key is valid (level ${d?.auth_level_name ?? d?.auth_level ?? "?"})` },
    examples: "Examples: GET /search/hash?hash={md5, sha1 or sha256}, POST /search/terms with a form {\"domain\": \"…\"} "
      + "(also host, url, filename, vx_family, tag, verdict…), GET /overview/{sha256}, GET /overview/{sha256}/summary, "
      + "GET /report/{id}/summary (id = sha256:environment or job id), GET /report/{id}/state, GET /feed/latest, GET /key/current. "
      + "POST /quick-scan/url with a form {\"scan_type\": \"all\", \"url\": \"…\"} and POST /submit/url submit the URL for analysis "
      + "(public result).",
    tools: [
      { name: "hybridanalysis_hash", title: "Hybrid Analysis: report for a hash", annotations: { readOnlyHint: true },
        description: "What Hybrid Analysis knows about a file by its hash (MD5, SHA-1 or SHA-256): verdict, threat score, "
          + "family, tags, names it has been seen with, type, size, engine results (multiscan) and available "
          + "reports. Query only: nothing is submitted for analysis.",
        schema: { hash: z.string().describe("MD5, SHA-1 or SHA-256") },
        async run({ hash }, p) {
          const noData = { hash, message: "Hybrid Analysis has no reports for this hash" };
          let sha256 = hash.trim().toLowerCase();
          if (!/^[a-f0-9]{64}$/.test(sha256)) {
            const r = await p({ path: "/search/hash", query: { hash: sha256 } });
            if (r.status === 404) return noData;
            const d = ensureOk(r, "Hybrid Analysis");
            const list = Array.isArray(d) ? d : d?.reports || d?.result || [];
            sha256 = list.find((x) => x?.sha256)?.sha256 || d?.sha256s?.[0] || d?.sha256;
            if (!sha256) return noData;
          }
          const r = await p({ path: `/overview/${seg(sha256)}` });
          if (r.status === 404) return noData;
          const o = ensureOk(r, "Hybrid Analysis");
          const engines = new Map();
          for (const s of [...(o.scanners || []), ...Object.values(o.scanners_v2 || {})]) {
            if (s?.name && !engines.has(s.name)) engines.set(s.name, { status: s.status, positives: s.positives, total: s.total });
          }
          return { sha256: o.sha256, md5: o.md5, sha1: o.sha1, name: o.last_file_name, other_names: o.other_file_name?.slice(0, 10),
                   type: o.type, size: o.size, verdict: o.verdict, threat_score: o.threat_score, family: o.vx_family,
                   tags: o.tags, multiscan: o.multiscan_result, analyzed: day(o.analysis_start_time),
                   engines: Object.fromEntries(engines),
                   reports: (o.reports || []).slice(0, 10).map((x) => (typeof x === "string" ? x : x?.id || x?.job_id)) };
        } },
    ],
  },
  {
    id: "anyrun", name: "ANY.RUN", category: "security", description: "Interactive malware sandbox: analyses, verdicts and IOCs",
    website: "https://any.run", docs: "https://any.run/api-documentation/", logo: { favicon: "https://any.run" },
    baseUrl: "https://api.any.run/v1",
    auth: { type: "header", name: "Authorization", prefix: "API-Key " },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://app.any.run/profile/",
    help: "The API requires a paid plan (Hunter or Enterprise); TI Lookup and TI Feeds are purchased separately. 1) Sign in to "
      + "app.any.run. 2) User menu → “Profile” → “API and Limits” → “Generate key” and copy the key. Analyses launched "
      + "through the API use the plan quota; for customer samples use the owner or byteam privacy (opt_privacy_type), never "
      + "public.",
    test: { path: "/user", message: "Key is valid" },
    examples: "Examples: GET /analysis?skip=0&limit=25 (history; team=true for the team history), GET /analysis/{uuid} (full JSON "
      + "report), GET /analysis/monitor/{uuid} (status), GET https://api.any.run/report/{uuid}/ioc/json (IOCs), "
      + "GET https://api.any.run/report/{uuid}/summary/stix (also misp, html), GET /environment, GET /user (limits), "
      + "GET /user/presets, POST /analysis {\"obj_type\": \"url\", \"obj_url\": \"https://…\", \"opt_privacy_type\": \"owner\"} "
      + "(launches an analysis: uses quota), POST /intelligence/api/search {\"query\": \"domainName:\\\"example.com\\\"\"} (TI Lookup).",
    tools: [
      { name: "anyrun_report", title: "ANY.RUN: summary of an analysis", annotations: { readOnlyHint: true },
        description: "Summary of an analysis by its UUID: verdict and score, analyzed object (file or URL, hashes), tags, "
          + "counters (processes, network, files), detected behaviors, MITRE ATT&CK techniques, network threats (Suricata), "
          + "DNS requests and connections with their reputation.",
        schema: { uuid: z.string().describe("UUID of the analysis (it is in the URL app.any.run/tasks/{uuid})") },
        async run({ uuid }, p) {
          const d = ensureOk(await p({ path: `/analysis/${seg(uuid)}` }), "ANY.RUN")?.data || {};
          const a = d.analysis || {};
          const obj = a.content?.mainObject || {};
          const net = d.network || {};
          return { uuid: a.uuid, link: a.permanentUrl, verdict: a.scores?.verdict?.threatLevelText,
                   score: a.scores?.verdict?.score, created: a.creationText || a.creation, tags: a.tags?.map((t) => t.tag || t),
                   object: { type: obj.type, name: obj.filename, url: obj.url, sha256: obj.hashes?.sha256, md5: obj.hashes?.md5 },
                   counters: d.counters,
                   behaviors: d.incidents?.slice(0, 25).map((i) => ({ title: i.title, level: i.threatLevel, mitre: i.mitre })),
                   mitre: d.mitre?.slice(0, 40).map((m) => [m.id, m.name].filter(Boolean).join(" ")),
                   network_threats: net.threats?.slice(0, 20).map((t) => t.msg || t.message || t),
                   dns: net.dnsRequests?.slice(0, 30).map((x) => ({ domain: x.domain, ips: x.ips?.slice(0, 5),
                                                                    reputation: x.reputation })),
                   connections: net.connections?.slice(0, 30).map((x) => ({ ip: x.ip, port: x.port, country: x.country,
                                                                           reputation: x.reputation })) };
        } },
      { name: "anyrun_history", title: "ANY.RUN: recent analyses", annotations: { readOnlyHint: true },
        description: "Latest analyses of your account (or your team): UUID, object name, verdict, date, tags and link.",
        schema: { team: z.boolean().default(false).describe("true: team history"),
                   max: z.number().int().min(1).max(100).default(25),
                   skip: z.number().int().min(0).default(0).describe("Analyses to skip (pagination)") },
        async run({ team, max, skip }, p) {
          const query = { team: team ? "true" : "false", skip: skip, limit: max };
          const d = ensureOk(await p({ path: "/analysis", query }), "ANY.RUN");
          return (d?.data?.tasks || []).map((t) => ({ uuid: t.uuid || t.taskid || t.related?.split("/").filter(Boolean).pop(),
            name: t.name, verdict: t.verdict, date: t.date, tags: t.tags, sha256: t.hashes?.sha256, link: t.related }));
        } },
    ],
  },
  {
    id: "misp", name: "MISP", category: "security", description: "Threat intelligence sharing: events, attributes and IOCs",
    website: "https://www.misp-project.org", docs: "https://www.misp-project.org/openapi/", logo: { favicon: "https://www.misp-project.org" },
    baseUrl: "{url}",
    auth: { type: "header", name: "Authorization" },
    fields: [{ id: "url", label: "MISP URL", format: "url", help: "e.g. https://misp.example.com" },
             { id: "token", label: "API key (authkey)", secret: true }],
    help: "1) In MISP: “Global Actions” → “My Profile” → “Auth keys” → “Add authentication key”. 2) Enter a comment, select "
      + "“Read only” if you will only query and, if you want, restrict the source IPs; copy the key, which is shown only once. The "
      + "key has the permissions of your user. The server must use https with a valid certificate (self-signed ones do not "
      + "work).",
    test: { path: "/users/view/me", account: (d) => [d.User?.email, d.Organisation?.name].filter(Boolean).join(" · ") },
    examples: "Examples: POST /attributes/restSearch {\"value\": \"8.8.8.8\", \"limit\": 50} (wildcard %: \"%example.com%\"), "
      + "POST /events/restSearch {\"tags\": [\"tlp:clear\"], \"last\": \"7d\", \"metadata\": true, \"limit\": 20}, "
      + "GET /events/view/{id}, POST /events/index {\"eventinfo\": \"…\", \"limit\": 20}, GET /tags/index, GET /galaxies/index, "
      + "POST /sightings/add {\"value\": \"…\"} (sighting), POST /events/add and POST /attributes/add/{event_id} (create data), "
      + "GET /servers/getVersion.",
    tools: [
      { name: "misp_search", title: "MISP: search for an indicator", annotations: { readOnlyHint: true },
        description: "Searches for a value (IP, domain, URL, hash, email…) in MISP attributes; the % wildcard is supported (for example "
          + "%example.com%). Returns each match with its event (id and info), category, type, whether it is IDS, date and tags.",
        schema: { value: z.string().describe("Exact value or with %"),
                   type: z.string().optional().describe("MISP attribute type: ip-dst, ip-src, domain, hostname, url, md5, sha256…"),
                   ids_only: z.boolean().default(false).describe("Only attributes flagged for detection (to_ids)"),
                   max: z.number().int().min(1).max(200).default(50), page: z.number().int().min(1).default(1) },
        async run({ value, type, ids_only, max, page }, p) {
          const body = { returnFormat: "json", value: value.trim(), type: type, to_ids: ids_only || undefined, limit: max,
                           page: page, includeEventTags: true };
          const d = ensureOk(await p({ method: "POST", path: "/attributes/restSearch", body: body }), "MISP");
          const list = d?.response?.Attribute || [];
          return { found: list.length,
                   attributes: list.map((a) => ({ event: a.event_id, info: a.Event?.info, ...mispAttribute(a) })) };
        } },
      { name: "misp_event", title: "MISP: summary of an event", annotations: { readOnlyHint: true },
        description: "Summary of an event: information, date, organization, threat level, analysis status, tags, "
          + "galaxies (actors, families, techniques), attributes (including those of objects) and related events.",
        schema: { id: z.string().describe("Event ID or UUID"),
                   max: z.number().int().min(1).max(1000).default(200).describe("Attributes to return") },
        async run({ id, max }, p) {
          const e = ensureOk(await p({ path: `/events/view/${seg(id)}` }), "MISP")?.Event || {};
          const fromObjects = (e.Object || []).flatMap((o) => (o.Attribute || []).map((a) => ({ ...a, object: o.name })));
          const attributes = [...(e.Attribute || []), ...fromObjects];
          return { id: e.id, uuid: e.uuid, info: e.info, date: e.date, published: e.published, organization: e.Orgc?.name,
                   threat: MISP_THREAT[e.threat_level_id], analysis: MISP_ANALYSIS[e.analysis], tags: e.Tag?.map((t) => t.name),
                   galaxies: (e.Galaxy || []).flatMap((g) => (g.GalaxyCluster || []).map((c) => `${g.name}: ${c.value}`)),
                   attribute_count: attributes.length,
                   attributes: attributes.slice(0, max).map((a) => ({ ...mispAttribute(a), object: a.object })),
                   related: e.RelatedEvent?.slice(0, 20).map((r) => ({ id: r.Event?.id, info: r.Event?.info })) };
        } },
    ],
  },
  {
    id: "opencti", name: "OpenCTI", category: "security",
    description: "STIX threat intelligence: actors, IOCs, reports and relationships",
    website: "https://filigran.io/platforms/opencti/", docs: "https://docs.opencti.io/latest/reference/api/",
    logo: { image: "https://github.com/OpenCTI-Platform.png" },
    baseUrl: "{url}",
    auth: { type: "bearer" },
    fields: [{ id: "url", label: "OpenCTI URL", format: "url", help: "e.g. https://opencti.example.com" },
             { id: "token", label: "API token", secret: true }],
    help: "1) In OpenCTI click your user icon (top right) → “Profile”. 2) In the “API access” section copy the token "
      + "(a UUID). Prefer a dedicated user with a read-only role and only the groups and markings (TLP) it needs to see: the token has "
      + "its permissions. The server must use https with a valid certificate.",
    test: { method: "POST", path: "/graphql", body: { query: "query Check { me { name user_email } }" },
              account: (d) => d.data?.me?.user_email || d.data?.me?.name,
              validate: (d) => {
                if (!d?.data?.me) throw new Error(`OpenCTI does not recognize the token: ${d?.errors?.[0]?.message || "no user data"}`);
              } },
    graphql: { path: "/graphql" },
    examples: "GraphQL API (use opencti_graphql), e.g. { stixCyberObservables(search: \"8.8.8.8\", first: 10) { edges { node { "
      + "id entity_type observable_value x_opencti_score } } } }, { indicators(search: \"…\", first: 10) { edges { node { id name "
      + "pattern valid_until x_opencti_score } } } }, { reports(first: 10, orderBy: published, orderMode: desc) { edges { node { id "
      + "name published } } } }, { intrusionSets(search: \"APT29\", first: 5) { edges { node { id name aliases description } } } }, "
      + "{ vulnerabilities(search: \"CVE-2024-3400\") { edges { node { id name x_opencti_cvss_base_score x_opencti_epss_score } } } }, "
      + "{ stixCoreRelationships(fromId: [\"…\"], first: 50) { edges { node { relationship_type to { ... on StixCoreObject { id "
      + "entity_type representative { main } } } } } } }.",
    tools: [
      { name: "opencti_search", title: "OpenCTI: search the knowledge base", annotations: { readOnlyHint: true },
        description: "Searches by text (IP, domain, hash, actor name, malware, CVE…) across all STIX entities: type, name, "
          + "score (observables and indicators), indicator pattern, labels, TLP markings, author and dates. The types narrow "
          + "the search: Indicator, IPv4-Addr, Domain-Name, Url, StixFile, Malware, Intrusion-Set, Threat-Actor-Group, Report, "
          + "Vulnerability…",
        schema: { text: z.string().describe("Text or value to search for"), types: z.array(z.string()).optional(),
                   max: z.number().int().min(1).max(100).default(25) },
        async run({ text, types, max }, p) {
          const d = await graphql(p, "/graphql", OPENCTI_QUERY, { text: text.trim(), max, types }, "OpenCTI");
          const c = d.stixCoreObjects || {};
          return { total: c.pageInfo?.globalCount, results: (c.edges || []).map(({ node: n }) => ({
            id: n.id, type: n.entity_type, name: n.observable_value || n.representative?.main,
            detail: truncate(n.representative?.secondary, 160) || undefined, score: n.x_opencti_score ?? undefined,
            confidence: n.confidence ?? undefined, pattern: n.pattern, valid_until: day(n.valid_until),
            labels: n.objectLabel?.map((l) => l.value), markings: n.objectMarking?.map((m) => m.definition), author: n.createdBy?.name,
            created: day(n.created_at), updated: day(n.updated_at) })) };
        } },
    ],
  },
  {
    id: "thehive", name: "TheHive", category: "security",
    description: "SOC incident response: cases, alerts, tasks and observables",
    website: "https://strangebee.com/thehive/", docs: "https://docs.strangebee.com/thehive/api-docs/",
    logo: { favicon: "https://strangebee.com" },
    baseUrl: "{url}/api/v1",
    auth: [{ type: "bearer" }, { type: "header", name: "X-Organisation", field: "organization" }],
    fields: [{ id: "url", label: "TheHive URL", format: "url",
               help: "e.g. https://thehive.example.com (with the subfolder if there is one, without /api)." },
             { id: "token", label: "API key", secret: true },
             { id: "organization", label: "Organization", optional: true,
               help: "Only if the user belongs to several: the organization to work in. Empty: the default one." }],
    help: "For TheHive 5. 1) An organization administrator creates a “Service” type user (“Organization” → “Users” → "
      + "“+”) with the minimum profile needed (e.g. read-only or analyst). 2) On the page of the user click “Create” in the "
      + "“API key” section and copy the key. With your own user: user menu → “Settings” → “API key”. The server must use https with "
      + "a valid certificate.",
    test: { path: "/user/current", account: (d) => [d.login, d.organisation].filter(Boolean).join(" · ") },
    examples: "Queries with POST /query {\"query\": [{\"_name\": \"listCase\"}, {\"_name\": \"filter\", \"_eq\": {\"_field\": "
      + "\"stage\", \"_value\": \"New\"}}, {\"_name\": \"sort\", \"_fields\": [{\"_createdAt\": \"desc\"}]}, {\"_name\": \"page\", "
      + "\"from\": 0, \"to\": 20}]} (also listAlert, listObservable; filters _and, _or, _not, _like, _in, _gte, _between…); "
      + "observables of a case: [{\"_name\": \"getCase\", \"idOrName\": \"…\"}, {\"_name\": \"observables\"}] (or \"tasks\"). "
      + "Others: GET /case/{id}, GET /alert/{id}, POST /case (creates a case), PATCH /case/{id}, POST /case/{id}/observable, "
      + "POST /alert, POST /alert/{id}/case (turns it into a case).",
    tools: [
      { name: "thehive_cases", title: "TheHive: recent cases", annotations: { readOnlyHint: true },
        description: "Cases from newest to oldest (number, title, severity, status, stage, TLP, tags, assignee and "
          + "date), filterable by stage, minimum severity and title text.",
        schema: { stage: z.enum(["New", "InProgress", "Closed"]).optional(), min_severity: THEHIVE_SEVERITY, text: THEHIVE_TEXT,
                   max: z.number().int().min(1).max(100).default(25), offset: z.number().int().min(0).default(0) },
        async run(a, p) {
          const body = theHiveQuery("listCase", a);
          const d = ensureOk(await p({ method: "POST", path: "/query", query: { name: "cases" }, body: body }), "TheHive");
          return (Array.isArray(d) ? d : []).map((c) => ({ id: c._id, number: c.number, title: c.title, severity: c.severityLabel,
            status: c.status, stage: c.stage, tlp: c.tlpLabel, tags: c.tags, assignee: c.assignee, created: day(c._createdAt),
            summary: truncate(c.summary, 200) || undefined }));
        } },
      { name: "thehive_alerts", title: "TheHive: recent alerts", annotations: { readOnlyHint: true },
        description: "Alerts from newest to oldest (title, type, source and reference, severity, status, stage, number "
          + "of observables, associated case, tags and date), filterable by stage, minimum severity and title text.",
        schema: { stage: z.enum(["New", "InProgress", "Imported", "Closed"]).optional(), min_severity: THEHIVE_SEVERITY,
                   text: THEHIVE_TEXT, max: z.number().int().min(1).max(100).default(25), offset: z.number().int().min(0).default(0) },
        async run(a, p) {
          const body = theHiveQuery("listAlert", a);
          const d = ensureOk(await p({ method: "POST", path: "/query", query: { name: "alerts" }, body: body }), "TheHive");
          return (Array.isArray(d) ? d : []).map((x) => ({ id: x._id, title: x.title, type: x.type, source: x.source,
            reference: x.sourceRef, severity: x.severityLabel, status: x.status, stage: x.stage, observables: x.observableCount,
            case_id: x.caseId, tags: x.tags, date: day(x.date) }));
        } },
    ],
  },
  {
    id: "wazuh", name: "Wazuh", category: "security",
    description: "SIEM/XDR: agents, inventory and configuration assessment (SCA)",
    website: "https://wazuh.com", docs: "https://documentation.wazuh.com/current/user-manual/api/reference.html",
    logo: { favicon: "https://wazuh.com" },
    baseUrl: "{url}",
    auth: { type: "custom", apply: async (c) => ({ headers: { Authorization: `Bearer ${await getWazuhToken(c)}` } }) },
    fields: [{ id: "url", label: "Server API URL", format: "url",
               help: "The Wazuh server URL with its port, e.g. https://wazuh.example.com:55000 (not the dashboard or the "
                 + "indexer one)." },
             { id: "username", label: "API username" },
             { id: "key", label: "Password", secret: true }],
    help: "1) In the Wazuh dashboard: menu ☰ → “Server management” → “Security” (in earlier versions, “Wazuh” → “Security”) → "
      + "“Users” → “Create user” with a username and password. 2) Assign it the “readonly” role (or the one it needs) on the page of the user "
      + "or in “Roles mapping”. Conector requests a JWT token on the fly with those credentials. The server API (port 55000) uses "
      + "a self-signed certificate by default, which Conector does not accept: install a valid one (api.yaml → https) or publish it behind "
      + "a reverse proxy with https.",
    test: { path: "/security/users/me", account: (d) => d.data?.affected_items?.[0]?.username },
    examples: "Examples: GET /agents?status=disconnected&select=id,name,ip,lastKeepAlive&limit=100, GET /agents/summary/status, "
      + "GET /syscollector/{agent}/packages?search=openssl, GET /syscollector/{agent}/ports, GET /syscollector/{agent}/os, "
      + "GET /sca/{agent}, GET /sca/{agent}/checks/{policy_id}?result=failed, GET /rootcheck/{agent}, GET /manager/info, "
      + "GET /cluster/healthcheck, GET /mitre/techniques?search=…, GET /rules?search=…, PUT /active-response?agents_list=… "
      + "(runs an active response). Alerts and, since 4.8, vulnerabilities are in the indexer, not in this API.",
    tools: [
      { name: "wazuh_agents", title: "Wazuh: agents", annotations: { readOnlyHint: true },
        description: "Registered agents (id, name, IP, operating system, agent version, status, last contact, groups and "
          + "node), filterable by status, group or text. Useful to find disconnected hosts or hosts with old agents.",
        schema: { status: z.enum(["active", "disconnected", "never_connected", "pending"]).optional(),
                   group: z.string().optional(), text: z.string().optional().describe("Searches in name, IP, operating system…"),
                   max: z.number().int().min(1).max(500).default(100), offset: z.number().int().min(0).default(0).describe("offset") },
        async run({ status: statusFilter, group, text, max, offset }, p) {
          const query = { status: statusFilter, group: group, search: text, limit: max, offset: offset,
                          select: "id,name,ip,status,os.name,os.version,version,lastKeepAlive,group,node_name" };
          const d = ensureOk(await p({ path: "/agents", query }), "Wazuh")?.data || {};
          return { total: d.total_affected_items, agents: (d.affected_items || []).map((x) => ({ id: x.id, name: x.name, ip: x.ip,
            status: x.status, os: [x.os?.name, x.os?.version].filter(Boolean).join(" ") || undefined, version: x.version,
            last_contact: x.lastKeepAlive, groups: x.group, node: x.node_name })) };
        } },
      { name: "wazuh_sca", title: "Wazuh: configuration assessment (SCA)", annotations: { readOnlyHint: true },
        description: "Security Configuration Assessment of an agent: evaluated policies (CIS…) with passed and failed checks and "
          + "score. If you specify the policy, it lists the failed checks with their remediation and compliance references.",
        schema: { agent: z.string().describe("Agent ID, e.g. 001"),
                   policy: z.string().optional().describe("policy_id, e.g. cis_ubuntu22-04"),
                   max: z.number().int().min(1).max(500).default(100) },
        async run({ agent, policy, max }, p) {
          if (!policy) {
            const d = ensureOk(await p({ path: `/sca/${seg(agent)}` }), "Wazuh")?.data || {};
            return (d.affected_items || []).map((x) => ({ policy: x.policy_id, name: x.name, passed: x.pass, failed: x.fail,
              not_applicable: x.invalid, total: x.total_checks, score: x.score, date: x.end_scan }));
          }
          const route = `/sca/${seg(agent)}/checks/${seg(policy)}`;
          const d = ensureOk(await p({ path: route, query: { result: "failed", limit: max } }), "Wazuh")?.data || {};
          return { failed: d.total_affected_items, checks: (d.affected_items || []).map((c) => ({ id: c.id, title: c.title,
            remediation: truncate(c.remediation, 300), compliance: c.compliance?.slice(0, 6).map((x) => `${x.key}: ${x.value}`) })) };
        } },
    ],
  },
  {
    id: "crowdstrike", name: "CrowdStrike Falcon", category: "security",
    description: "Falcon EDR: hosts, alerts, vulnerabilities and intelligence",
    website: "https://www.crowdstrike.com", docs: "https://developer.crowdstrike.com/", logo: { favicon: "https://www.crowdstrike.com" },
    baseUrl: "https://{region}",
    auth: { type: "client_credentials", url: "https://{region}/oauth2/token", credentialsIn: "body" },
    fields: [{ id: "client_id", label: "Client ID" },
             { id: "client_secret", label: "Client secret", secret: true },
             { id: "region", label: "Cloud", default: "api.eu-1.crowdstrike.com",
               options: [["api.eu-1.crowdstrike.com", "EU-1 (falcon.eu-1.crowdstrike.com)"],
                          ["api.crowdstrike.com", "US-1 (falcon.crowdstrike.com)"],
                          ["api.us-2.crowdstrike.com", "US-2 (falcon.us-2.crowdstrike.com)"],
                          ["api.laggar.gcw.crowdstrike.com", "US-GOV-1 (falcon.laggar.gcw.crowdstrike.com)"]],
               help: "The one matching the address you use to sign in to the Falcon console." }],
    help: "1) In the Falcon console: “Support and resources” → “API clients and keys” → “Create API client” (requires the "
      + "Falcon Administrator role). 2) Give it a name and select only the read scopes you need: at least “Hosts: Read” (used by the "
      + "connection test) and, depending on use, “Alerts: Read”, “Vulnerabilities: Read” (Spotlight), “IOC Management: Read” or those of "
      + "Falcon Intelligence (Actors, Indicators, Reports). 3) Copy the Client ID and the Client secret (the secret is shown only "
      + "once) and choose the cloud shown in the “Base URL” of the dialog.",
    test: { path: "/devices/queries/devices/v1", query: { limit: 1 },
              message: (d) => `Credentials are valid (${d?.meta?.pagination?.total ?? "?"} hosts)` },
    examples: "Examples (FQL filters): GET /devices/combined/devices/v1?filter=hostname:'PC-01'&limit=50, "
      + "GET /devices/queries/devices/v1?filter=platform_name:'Windows'+last_seen:>='now-7d' → POST /devices/entities/devices/v2 "
      + "{\"ids\": […]}, POST /alerts/combined/alerts/v1 {\"filter\": \"status:'new'\", \"sort\": \"created_timestamp|desc\", "
      + "\"limit\": 50}, GET /spotlight/combined/vulnerabilities/v1?filter=status:'open'+cve.severity:'CRITICAL'&facet=cve"
      + "&facet=host_info&limit=100, GET /intel/combined/indicators/v1?filter=indicator:'…', GET /intel/combined/actors/v1?q=…, "
      + "GET /iocs/combined/indicator/v1?filter=value:'…', POST /devices/entities/devices-actions/v2?action_name=contain "
      + "{\"ids\": […]} (isolates the host from the network).",
    tools: [
      { name: "crowdstrike_hosts", title: "CrowdStrike: search hosts", annotations: { readOnlyHint: true },
        description: "Hosts with the Falcon sensor (id, name, local and external IP, operating system, sensor version, first and "
          + "last seen, containment status, domain, tags and prevention policy), by name, IP or FQL filter. "
          + "Requires Hosts: Read.",
        schema: { name: z.string().optional().describe("Host name (supports * as a wildcard, e.g. web-*)"),
                   ip: z.string().optional().describe("Local or external IP"),
                   filter: z.string().optional().describe("Additional FQL, e.g. platform_name:'Windows'+last_seen:>='now-7d'"),
                   max: z.number().int().min(1).max(500).default(50) },
        async run({ name, ip, filter, max }, p) {
          const parts = [name && (name.includes("*") ? `hostname:*'${fql(name)}'` : `hostname:'${fql(name)}'`),
            ip && `(local_ip:'${fql(ip)}',external_ip:'${fql(ip)}')`, filter].filter(Boolean);
          const query = { limit: max, sort: "last_seen.desc", filter: parts.join("+") || undefined };
          const d = ensureOk(await p({ path: "/devices/combined/devices/v1", query }), "CrowdStrike");
          return { total: d.meta?.pagination?.total, hosts: (d.resources || []).map((h) => ({ id: h.device_id, name: h.hostname,
            ip: h.local_ip, external_ip: h.external_ip, os: h.os_version, platform: h.platform_name, sensor: h.agent_version,
            first_seen: day(h.first_seen), last_seen: h.last_seen, status: h.status, domain: h.machine_domain, tags: h.tags,
            prevention: h.device_policies?.prevention?.policy_id })) };
        } },
      { name: "crowdstrike_alerts", title: "CrowdStrike: recent alerts", annotations: { readOnlyHint: true },
        description: "Falcon alerts (EDR, identity, cloud…) from newest to oldest: severity, status, name, "
          + "MITRE tactic and technique, host, user, file, command line and link to the console. Requires Alerts: Read.",
        schema: { status: z.enum(["new", "in_progress", "reopened", "closed"]).optional(),
                   severities: z.array(z.enum(["Critical", "High", "Medium", "Low", "Informational"])).optional(),
                   filter: z.string().optional().describe("Additional FQL, e.g. created_timestamp:>='now-24h'"),
                   max: z.number().int().min(1).max(200).default(50) },
        async run({ status: statusFilter, severities, filter, max }, p) {
          const parts = [statusFilter && `status:'${statusFilter}'`,
            severities?.length && `severity_name:[${severities.map((s) => `'${s}'`).join(",")}]`, filter].filter(Boolean);
          const body = { filter: parts.join("+") || undefined, sort: "created_timestamp|desc", limit: max };
          const d = ensureOk(await p({ method: "POST", path: "/alerts/combined/alerts/v1", body: body }), "CrowdStrike");
          return { total: d.meta?.pagination?.total, alerts: (d.resources || []).map((x) => ({ id: x.composite_id,
            date: x.created_timestamp, severity: x.severity_name || x.severity, status: x.status, name: x.display_name || x.name,
            description: truncate(x.description, 200), tactic: x.tactic, technique: [x.technique_id, x.technique].filter(Boolean).join(" "),
            product: x.product, host: x.device?.hostname || x.hostname, user: x.user_name, file: x.filepath || x.filename,
            command: truncate(x.cmdline, 200), sha256: x.sha256, link: x.falcon_host_link })) };
        } },
    ],
  },
  {
    id: "sentinelone", name: "SentinelOne", category: "security",
    description: "Singularity EDR: agents, threats, alerts and response",
    website: "https://www.sentinelone.com", docs: "https://usea1-partners.sentinelone.net/api-doc/overview",
    logo: { favicon: "https://www.sentinelone.com" },
    baseUrl: "{url}/web/api/v2.1",
    auth: { type: "header", name: "Authorization", prefix: "ApiToken " },
    fields: [{ id: "url", label: "Console URL", format: "url",
               help: "e.g. https://euce1-123.sentinelone.net (without /web/…)." },
             { id: "token", label: "API token", secret: true }],
    help: "1) In the console: “Settings” → “Users” → “Service Users” (in newer consoles, “Policy & Settings” → “User "
      + "Management” → “Service Users”) → “Actions” → “Create New Service User”. 2) Give it a name and an expiration date, choose the "
      + "scope (account or site) and the Viewer role, unless you need response actions. 3) Copy the token: it is shown only "
      + "once and stops working on the chosen date, so it will have to be renewed.",
    test: { path: "/agents", query: { limit: 1 }, message: (d) => `Token is valid (${d?.pagination?.totalItems ?? "?"} agents)` },
    examples: "Examples: GET /agents?computerName__contains=PC-01&limit=50, GET /agents?isActive=true&infected=true, "
      + "GET /threats?resolved=false&limit=50&sortBy=createdAt&sortOrder=desc, GET /threats?query=…, GET /threats/{id}/timeline, "
      + "GET /cloud-detection/alerts?limit=50 (STAR alerts), GET /activities?limit=50&sortOrder=desc, GET /sites, GET /accounts, "
      + "GET /groups, POST /agents/actions/disconnect {\"filter\": {\"ids\": [\"…\"]}} (isolates the host from the network), "
      + "POST /threats/mitigate/kill {\"filter\": {\"ids\": [\"…\"]}}. Cursor pagination (pagination.nextCursor).",
    tools: [
      { name: "sentinelone_threats", title: "SentinelOne: threats", annotations: { readOnlyHint: true },
        description: "Detected threats from newest to oldest: name, classification, confidence, mitigation and incident "
          + "status, analyst verdict, host, site, path and SHA-1 of the file. By default, only "
          + "unresolved ones.",
        schema: { resolved: z.boolean().default(false).describe("true: also include resolved ones"),
                   confidence: z.enum(["malicious", "suspicious"]).optional(),
                   text: z.string().optional().describe("Free search (host, file, hash…)"),
                   max: z.number().int().min(1).max(200).default(50), cursor: z.string().optional() },
        async run({ resolved, confidence, text, max, cursor }, p) {
          const query = { limit: max, sortBy: "createdAt", sortOrder: "desc", resolved: resolved ? undefined : "false",
                          confidenceLevels: confidence, query: text, cursor };
          const d = ensureOk(await p({ path: "/threats", query }), "SentinelOne");
          return { total: d.pagination?.totalItems, next: d.pagination?.nextCursor, threats: (d.data || []).map((t) => {
            const i = t.threatInfo || {};
            return { id: t.id, name: i.threatName, classification: i.classification, confidence: i.confidenceLevel,
                     mitigation: i.mitigationStatus, incident: i.incidentStatus, verdict: i.analystVerdict,
                     host: t.agentRealtimeInfo?.agentComputerName, site: t.agentRealtimeInfo?.siteName, path: i.filePath,
                     sha1: i.sha1, date: i.createdAt };
          }) };
        } },
      { name: "sentinelone_agents", title: "SentinelOne: agents", annotations: { readOnlyHint: true },
        description: "Installed agents (id, host, operating system, version, whether it is active and infected, active threats, "
          + "network or isolation status, last activity, IP, domain, site and group), filterable by host name, activity "
          + "and infection.",
        schema: { host: z.string().optional().describe("Part of the host name"), active: z.boolean().optional(),
                   infected: z.boolean().optional(), max: z.number().int().min(1).max(200).default(50), cursor: z.string().optional() },
        async run({ host, active, infected, max, cursor }, p) {
          const query = { limit: max, computerName__contains: host, isActive: active, infected: infected, cursor };
          const d = ensureOk(await p({ path: "/agents", query }), "SentinelOne");
          return { total: d.pagination?.totalItems, next: d.pagination?.nextCursor, agents: (d.data || []).map((x) => ({
            id: x.id, host: x.computerName, os: x.osName, version: x.agentVersion, active: x.isActive, infected: x.infected,
            threats: x.activeThreats, network: x.networkStatus, last_activity: x.lastActiveDate, ip: x.lastIpToMgmt,
            external_ip: x.externalIp, domain: x.domain, site: x.siteName, group: x.groupName })) };
        } },
    ],
  },
  {
    id: "securityscorecard", name: "SecurityScorecard", category: "security",
    description: "Security rating (A-F) of companies and their risk factors",
    website: "https://securityscorecard.com", docs: "https://securityscorecard.readme.io/reference/",
    logo: { simpleIcons: "securityscorecard" },
    baseUrl: "https://api.securityscorecard.io",
    auth: { type: "header", name: "Authorization", prefix: "Token " },
    fields: [{ id: "token", label: "API token", secret: true, example: "0123456789abcdef0123456789abcdef" }],
    keyUrl: "https://platform.securityscorecard.io/#/my-settings/api",
    help: "The API is only available on paid accounts. 1) At platform.securityscorecard.io click your avatar → “My Settings” → "
      + "“API” tab → “Generate New API Token” and confirm; copy the token (generating another one invalidates the previous one). 2) For "
      + "integrations a bot user is better: an administrator invites it under “Admin Settings” → “People Management”, marks it as a "
      + "bot, gives it an access level and generates its token.",
    test: { path: "/portfolios", message: (d) => `Token is valid (${d?.total ?? d?.entries?.length ?? 0} portfolios)` },
    examples: "Examples: GET /companies/{domain} (score and grade), GET /companies/{domain}/factors, "
      + "GET /companies/{domain}/issues/{type} (findings of an issue type, e.g. csp_no_policy_v2), "
      + "GET /companies/{domain}/history/score, GET /companies/{domain}/history/factors/score, GET /portfolios, "
      + "GET /portfolios/{id}/companies, PUT /portfolios/{id}/companies/{domain} (adds the company to the portfolio), "
      + "GET /metadata/issue-types.",
    tools: [
      { name: "securityscorecard_company", title: "SecurityScorecard: rating of a company", annotations: { readOnlyHint: true },
        description: "Score (0-100) and grade (A-F) of a company by its domain, with industry, size and 30-day change, and its "
          + "factors (application security, DNS, network, patching…) with their grade and the issue types detected.",
        schema: { domain: z.string().describe("Main domain of the company, e.g. example.com") },
        async run({ domain }, p) {
          const dom = seg(domain.toLowerCase());
          const e = ensureOk(await p({ path: `/companies/${dom}` }), "SecurityScorecard");
          const f = ensureOk(await p({ path: `/companies/${dom}/factors` }), "SecurityScorecard");
          return { domain: e.domain, name: e.name, industry: e.industry, size: e.size, score: e.score, grade: e.grade,
                   change_30_days: e.last30day_score_change, factors: (f.entries || []).map((x) => ({ factor: x.name, score: x.score,
                     grade: x.grade, issues: (x.issue_summary || []).filter((i) => i.count)
                       .map((i) => ({ type: i.type, count: i.count, severity: i.severity })) })) };
        } },
    ],
  },
  {
    id: "abusech", name: "abuse.ch", category: "security",
    description: "ThreatFox, URLhaus, MalwareBazaar: IOCs, malicious URLs, samples",
    website: "https://abuse.ch", docs: "https://threatfox.abuse.ch/api/", logo: { favicon: "https://abuse.ch" },
    baseUrl: "https://threatfox-api.abuse.ch/api/v1", allowedOrigins: ["https://urlhaus-api.abuse.ch", "https://mb-api.abuse.ch"],
    auth: { type: "header", name: "Auth-Key" },
    fields: [{ id: "token", label: "Auth-Key", secret: true }],
    keyUrl: "https://auth.abuse.ch/",
    help: "A single key works for ThreatFox, URLhaus and MalwareBazaar. 1) Sign in to auth.abuse.ch with your account (GitHub, Google, "
      + "LinkedIn or X). 2) In your profile generate an “Auth-Key” (“Generate Key”) and copy it. The platforms are free for fair "
      + "use (query quotas); commercial use may require a paid subscription managed by Spamhaus "
      + "(abuse.ch/terms-of-use).",
    test: { method: "POST", path: "/", body: { query: "types" }, message: "Key is valid",
              validate: (d) => {
                if (d?.query_status !== "ok") throw new Error(`abuse.ch responded: ${d?.query_status || "unexpected response"}`);
              } },
    examples: "ThreatFox (JSON to the base URL): POST / {\"query\": \"search_ioc\", \"search_term\": \"1.2.3.4\"}, POST / {\"query\": "
      + "\"search_hash\", \"hash\": \"…\"}, POST / {\"query\": \"get_iocs\", \"days\": 1}, POST / {\"query\": \"taginfo\", \"tag\": "
      + "\"Emotet\", \"limit\": 50}, POST / {\"query\": \"malwareinfo\", \"malware\": \"win.cobalt_strike\", \"limit\": 50}. "
      + "URLhaus (form): POST https://urlhaus-api.abuse.ch/v1/url/ {\"url\": …}, …/v1/host/ {\"host\": …}, "
      + "…/v1/payload/ {\"sha256_hash\": …}, …/v1/tag/ {\"tag\": …}, GET https://urlhaus-api.abuse.ch/v1/urls/recent/limit/50/. "
      + "MalwareBazaar (form): POST https://mb-api.abuse.ch/api/v1/ {\"query\": \"get_info\", \"hash\": …}, "
      + "{\"query\": \"get_taginfo\", \"tag\": …, \"limit\": 50}, {\"query\": \"get_siginfo\", \"signature\": …}, "
      + "{\"query\": \"get_recent\", \"selector\": \"time\"}.",
    tools: [
      { name: "abusech_ioc", title: "abuse.ch: search for an indicator", annotations: { readOnlyHint: true },
        description: "Searches for an IP, domain, URL or hash in ThreatFox (malware and botnet IOCs: family, threat type, confidence, "
          + "dates, tags and reference) and URLhaus (malware distribution URLs and their samples); hashes are also looked up in "
          + "MalwareBazaar (name, type, family, YARA rules and verdicts from other engines). The type is inferred from the value; with "
          + "SHA-1 only MalwareBazaar is queried.",
        schema: { value: z.string().describe("IP, domain, URL or hash (MD5, SHA-1 or SHA-256)") },
        async run({ value }, p) {
          const v = value.trim();
          const type = iocType(v);
          const status = (d, summary) => (d?.query_status === "ok" ? summary(d) : d?.query_status);
          const output = { value: v, type };
          if (!(type === "hash" && v.length === 40)) {
            const body = type === "hash" ? { query: "search_hash", hash: v } : { query: "search_ioc", search_term: v };
            const tf = ensureOk(await p({ method: "POST", path: "/", body: body }), "ThreatFox");
            output.threatfox = status(tf, (d) => (Array.isArray(d.data) ? d.data : []).slice(0, 25).map((x) => ({ id: x.id,
              ioc: x.ioc, type: x.ioc_type, threat: x.threat_type, malware: x.malware_printable, confidence: x.confidence_level,
              first_seen: x.first_seen, last_seen: x.last_seen || undefined, tags: x.tags, reference: x.reference || undefined })));
            const [route, form] = type === "url" ? ["url", { url: v }] : type === "hash"
              ? ["payload", { [v.length === 32 ? "md5_hash" : "sha256_hash"]: v }] : ["host", { host: v }];
            const uh = ensureOk(await p({ method: "POST", path: `https://urlhaus-api.abuse.ch/v1/${route}/`, form: form }), "URLhaus");
            output.urlhaus = status(uh, urlhausSummary);
          }
          if (type === "hash") {
            const form = { query: "get_info", hash: v };
            const mb = ensureOk(await p({ method: "POST", path: "https://mb-api.abuse.ch/api/v1/", form: form }), "MalwareBazaar");
            output.malwarebazaar = status(mb, (d) => malwareBazaarSummary(d.data?.[0]));
          }
          return output;
        } },
    ],
  },
  {
    id: "osv", name: "OSV (Open Source Vulnerabilities)", category: "security",
    description: "Open-source package vulnerabilities (OSV.dev, Google)",
    website: "https://osv.dev", docs: "https://google.github.io/osv.dev/api/", logo: { favicon: "https://osv.dev" },
    baseUrl: "https://api.osv.dev/v1",
    auth: { type: "none" }, fields: [],
    help: "Free public database from Google: it needs no credentials. Click “Enable” so agents can query it. It gathers "
      + "advisories from GitHub (GHSA), PyPI, Go, RustSec, Linux distributions and CVEs with the affected and fixed versions of each "
      + "package, useful for reviewing dependencies in code audits.",
    test: { path: "/vulns/GHSA-jfh8-c2jp-5v3q", message: "Service available" },
    examples: "Examples: POST /query {\"package\": {\"name\": \"lodash\", \"ecosystem\": \"npm\"}, \"version\": \"4.17.20\"}, "
      + "POST /query {\"package\": {\"purl\": \"pkg:pypi/django@4.2.0\"}}, POST /query {\"commit\": \"…\"}, "
      + "POST /querybatch {\"queries\": [{…}, {…}]} (returns only the ids; up to 1,000 queries), GET /vulns/{id} (GHSA-…, CVE-…, "
      + "PYSEC-…, GO-…, RUSTSEC-…, DSA-…). Ecosystems: npm, PyPI, Maven, Go, NuGet, RubyGems, crates.io, Packagist, Debian:12, "
      + "Alpine:v3.20… Long responses are paginated with page_token (next_page_token).",
    tools: [
      { name: "osv_query", title: "OSV: vulnerabilities of a package", annotations: { readOnlyHint: true },
        description: "Known vulnerabilities of an open-source package in one version (or in all if none is given): id "
          + "(GHSA, PYSEC, RUSTSEC…), CVE aliases, summary, severity, CVSS vector, CWE and the versions that fix them. Accepts name + "
          + "ecosystem, a purl (pkg:npm/lodash@4.17.20) or a commit.",
        schema: { package_name: z.string().optional().describe("Package name, e.g. lodash, django, org.apache.logging.log4j:log4j-core"),
                   ecosystem: z.string().optional().describe("npm, PyPI, Maven, Go, NuGet, RubyGems, crates.io, Packagist, Debian:12…"),
                   version: z.string().optional().describe("Installed version; without it, all the vulnerabilities of the package are returned"),
                   purl: z.string().optional().describe("Package URL instead of name and ecosystem"),
                   commit: z.string().optional().describe("Commit hash (instead of package)") },
        async run({ package_name, ecosystem, version, purl, commit }, p) {
          if (!commit && !purl && !(package_name && ecosystem)) throw new Error("OSV: provide the package and ecosystem, a purl or a commit");
          const query = commit ? { commit: commit.trim() } : { version: purl?.includes("@") ? undefined : version,
            package: purl ? { purl: purl.trim() } : { name: package_name.trim(), ecosystem: ecosystem.trim() } };
          const vulns = [];
          let token;
          do {
            const d = ensureOk(await p({ method: "POST", path: "/query", body: { ...query, page_token: token } }), "OSV");
            vulns.push(...(d.vulns || []));
            token = d.next_page_token;
          } while (token && vulns.length < 1000);
          return { total: vulns.length, vulnerabilities: vulns.map((v) => osvSummary(v, package_name)) };
        } },
      { name: "osv_vulnerability", title: "OSV: details of a vulnerability", annotations: { readOnlyHint: true },
        description: "Details of a vulnerability by its id (GHSA-…, CVE-…, PYSEC-…, GO-…, RUSTSEC-…): aliases, summary, details, "
          + "CVSS, CWE, dates, affected packages with their version ranges (affected and fixed) and references.",
        schema: { id: z.string().describe("Identifier, e.g. GHSA-jfh8-c2jp-5v3q or CVE-2021-44228") },
        async run({ id }, p) {
          const r = await p({ path: `/vulns/${seg(id)}` });
          if (r.status === 404) return { id, message: "OSV does not have this vulnerability" };
          const v = ensureOk(r, "OSV");
          return { id: v.id, alias: v.aliases, related: v.related, summary: v.summary, details: truncate(v.details, 1500),
                   cvss: v.severity?.map((s) => `${s.type}: ${s.score}`), severity: v.database_specific?.severity,
                   cwe: v.database_specific?.cwe_ids, published: day(v.published), modified: day(v.modified),
                   withdrawn: v.withdrawn ? day(v.withdrawn) : undefined,
                   affected: v.affected?.slice(0, 30).map((a) => ({ ecosystem: a.package?.ecosystem, package: a.package?.name,
                     purl: a.package?.purl, versions: (a.ranges || []).filter((x) => x.type !== "GIT").map((x) => osvRanges(x.events))
                       .filter(Boolean).join(" | ") || undefined, version_count: a.versions?.length })),
                   references: v.references?.slice(0, 12).map((x) => `${x.type}: ${x.url}`) };
        } },
    ],
  },
];
