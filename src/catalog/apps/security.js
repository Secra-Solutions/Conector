// Cybersecurity: Internet exposure, threat intelligence, vulnerabilities, data leaks and bug bounty.
// The specific tools return compact summaries; the full detail is requested with *_request.
import { z } from "zod";
import { ensureOk } from "../define.js";

const IP = z.string().describe("IP address, e.g. 8.8.8.8");
const segment = (v) => encodeURIComponent(String(v).trim());
const truncate = (t, n = 300) => (typeof t === "string" && t.length > n ? `${t.slice(0, n)}…` : t);
const day = (t) => (t ? String(typeof t === "number" ? new Date(t * 1000).toISOString() : t).slice(0, 10) : undefined);
const values = (list) => list?.map((x) => x?.value ?? x?.name ?? x).filter(Boolean);

const ABUSEIPDB_CATEGORIES = [null, "DNS Compromise", "DNS Poisoning", "Fraud Orders", "DDoS Attack", "FTP Brute-Force",
  "Ping of Death", "Phishing", "Fraud VoIP", "Open Proxy", "Web Spam", "Email Spam", "Blog Spam", "VPN IP", "Port Scan", "Hacking",
  "SQL Injection", "Spoofing", "Brute-Force", "Bad Web Bot", "Exploited Host", "Web App Attack", "SSH", "IoT Targeted"];
const VIRUSTOTAL_PATHS = { hash: "files", domain: "domains", ip: "ip_addresses", url: "urls" };
const OTX_TYPES = { ipv4: "IPv4", ipv6: "IPv6", domain: "domain", host: "hostname", url: "url", hash: "file", cve: "cve" };
const SNYK_VERSION = "2024-10-15";

const shodanService = (b) => ({
  port: b.port, transport: b.transport, product: b.product, version: b.version, cpe: b.cpe23 || b.cpe,
  http: b.http ? { title: truncate(b.http.title, 120), server: b.http.server, status: b.http.status } : undefined,
  certificate: b.ssl?.cert?.subject?.CN, vulns: b.vulns ? Object.keys(b.vulns) : undefined, banner: truncate(b.data, 200),
  date: day(b.timestamp),
});

function virusTotalSummary(d) {
  const a = d.data?.attributes || {};
  const detections = Object.entries(a.last_analysis_results || {}).filter(([, r]) => ["malicious", "suspicious"].includes(r.category))
    .map(([engine, r]) => `${engine}: ${r.result || r.category}`);
  return {
    id: d.data?.id, type: d.data?.type, stats: a.last_analysis_stats, detections: detections.slice(0, 40),
    reputation: a.reputation, votes: a.total_votes, analyzed: day(a.last_analysis_date), tags: a.tags,
    name: a.meaningful_name, file_type: a.type_description, size: a.size, sha256: a.sha256, md5: a.md5,
    threat: a.popular_threat_classification?.suggested_threat_label, url: a.url, final_url: a.last_final_url, title: a.title,
    registrar: a.registrar, created: day(a.creation_date), categories: a.categories, asn: a.asn, as_owner: a.as_owner,
    country: a.country, network: a.network,
  };
}

function nvdCvss(m = {}) {
  for (const k of ["cvssMetricV40", "cvssMetricV31", "cvssMetricV30", "cvssMetricV2"]) {
    const x = m[k]?.find((e) => e.type === "Primary") || m[k]?.[0];
    if (x) {
      return { version: x.cvssData?.version, score: x.cvssData?.baseScore, severity: x.cvssData?.baseSeverity || x.baseSeverity,
               vector: x.cvssData?.vectorString, source: x.source };
    }
  }
  return undefined;
}

const cpeRange = (m) => [m.criteria, m.versionStartIncluding && `>= ${m.versionStartIncluding}`,
  m.versionStartExcluding && `> ${m.versionStartExcluding}`, m.versionEndIncluding && `<= ${m.versionEndIncluding}`,
  m.versionEndExcluding && `< ${m.versionEndExcluding}`].filter(Boolean).join(" ");

const cveSummary = ({ cve: c }) => ({
  id: c.id, published: day(c.published), modified: day(c.lastModified), status: c.vulnStatus,
  description: c.descriptions?.find((x) => x.lang === "en")?.value, cvss: nvdCvss(c.metrics),
  cwe: [...new Set((c.weaknesses || []).flatMap((w) => w.description || []).map((x) => x.value))],
  kev: c.cisaExploitAdd ? { added: c.cisaExploitAdd, due: c.cisaActionDue, action: c.cisaRequiredAction } : undefined,
  affected: (c.configurations || []).flatMap((x) => x.nodes || []).flatMap((n) => n.cpeMatch || []).filter((m) => m.vulnerable)
    .slice(0, 15).map(cpeRange),
  references: (c.references || []).slice(0, 8).map((r) => r.url),
});

export default [
  {
    id: "shodan", name: "Shodan", category: "security",
    description: "Internet-exposed devices: hosts, ports, banners and CVEs",
    website: "https://www.shodan.io", docs: "https://developer.shodan.io/api", logo: { favicon: "https://www.shodan.io" },
    baseUrl: "https://api.shodan.io",
    auth: { type: "query", name: "key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://account.shodan.io",
    help: "1) Sign in at account.shodan.io with your account. 2) In “Overview” copy your “API Key”. The free account barely allows using "
      + "the API; the plans (Membership, Freelancer…) include monthly query credits: searches with filters and every page from "
      + "the second one on use one, while looking up a host or counting results (/shodan/host/count) uses none.",
    test: { path: "/api-info",
              message: (d) => `Plan ${d?.plan ?? "?"}: query credits: ${d?.query_credits ?? "?"}, `
                + `scan credits: ${d?.scan_credits ?? "?"}` },
    examples: "Examples: GET /shodan/host/{ip}?minify=true, GET /shodan/host/count?query=org:\"…\"&facets=port,country (no credits), "
      + "GET /shodan/host/search?query=hostname:example.com, GET /dns/domain/{domain} (1 credit), GET /dns/resolve?hostnames=a.com,b.com, "
      + "GET /dns/reverse?ips=…, GET /shodan/host/search/filters, GET /api-info.",
    tools: [
      { name: "shodan_host", title: "Shodan: host information", annotations: { readOnlyHint: true },
        description: "Ports and services of an IP (product, version, CPE, HTTP title, certificate and banner excerpt), detected CVEs, "
          + "organization, ASN, location and hostnames. It does not use query credits.",
        schema: { ip: IP, history: z.boolean().default(false).describe("Also include the historical banners") },
        async run({ ip, history }, p) {
          const r = await p({ path: `/shodan/host/${segment(ip)}`, query: history ? { history: "true" } : undefined });
          if (r.status === 404) return { ip, message: "Shodan has no data for this IP" };
          const h = ensureOk(r, "Shodan");
          return { ip: h.ip_str, org: h.org, isp: h.isp, asn: h.asn, os: h.os, country: h.country_code, city: h.city,
                   hostnames: h.hostnames, domains: h.domains, ports: h.ports, vulns: h.vulns, tags: h.tags,
                   updated: day(h.last_update), services: (h.data || []).map(shodanService) };
        } },
      { name: "shodan_search", title: "Shodan: search", annotations: { readOnlyHint: true },
        description: "Search with Shodan syntax (hostname:, org:\"…\", net:, port:, product:, vuln:, ssl.cert.subject.cn:, "
          + "http.title:…). Uses 1 query credit if it has filters and another one for each page from the 2nd on (100 results per "
          + "page). Returns the total, the requested facets and the summarized results.",
        schema: { query: z.string().describe("e.g. ssl.cert.subject.cn:example.com port:443"),
                   facets: z.string().optional().describe("e.g. port,country:10,org"), page: z.number().int().min(1).default(1),
                   max: z.number().int().min(1).max(100).default(50).describe("Number of results from the page to return") },
        async run({ query, facets, page, max }, p) {
          const d = ensureOk(await p({ path: "/shodan/host/search",
                                     query: { query: query, facets: facets, page: page, minify: "true" } }), "Shodan");
          return { total: d.total, facets: d.facets, results: (d.matches || []).slice(0, max).map((m) => ({
            ip: m.ip_str, org: m.org, asn: m.asn, hostnames: m.hostnames, country: m.location?.country_code, ...shodanService(m) })) };
        } },
    ],
  },
  {
    id: "virustotal", name: "VirusTotal", category: "security",
    description: "File, URL, domain and IP reputation from dozens of engines",
    website: "https://www.virustotal.com", docs: "https://docs.virustotal.com/reference/overview", logo: { simpleIcons: "virustotal" },
    baseUrl: "https://www.virustotal.com/api/v3",
    auth: { type: "header", name: "x-apikey" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://www.virustotal.com/gui/my-apikey",
    help: "1) Sign in at virustotal.com with your account. 2) In your user menu (top right) choose “API key” and copy the key. "
      + "The public API is free but limited (4 requests per minute and 500 per day) and its terms prohibit commercial use: "
      + "for work with clients you need the Premium API.",
    test: { path: "/users/{token}", account: (d) => d.data?.id },
    examples: "Examples: GET /files/{sha256, sha1 or md5}, GET /domains/{domain}, GET /ip_addresses/{ip}, GET /urls/{id} (id = the URL in "
      + "base64url without “=”), POST /urls with a form {\"url\": \"https://…\"} (submits it for analysis), GET /analyses/{id}, "
      + "GET /domains/{domain}/subdomains?limit=40, GET /domains/{domain}/resolutions, GET /ip_addresses/{ip}/resolutions.",
    tools: [
      { name: "virustotal_report", title: "VirusTotal: indicator report", annotations: { readOnlyHint: true },
        description: "Latest analysis of a hash (MD5, SHA-1 or SHA-256), domain, IP or URL: count by verdict, engines that "
          + "detect it, reputation, votes, tags and basic data (file name and type, registrar and categories of the domain, "
          + "ASN and country of the IP…). It only looks up what VirusTotal already has: it submits nothing for analysis.",
        schema: { type: z.enum(["hash", "domain", "ip", "url"]), value: z.string().describe("Hash, domain, IP or full URL") },
        async run({ type, value }, p) {
          const id = type === "url" ? Buffer.from(value.trim()).toString("base64url") : segment(value);
          const r = await p({ path: `/${VIRUSTOTAL_PATHS[type]}/${id}` });
          if (r.status === 404) return { value, message: "VirusTotal has no report for this indicator" };
          return virusTotalSummary(ensureOk(r, "VirusTotal"));
        } },
    ],
  },
  {
    id: "haveibeenpwned", toolPrefix: "hibp", name: "Have I Been Pwned", category: "security",
    description: "Data breaches that include email accounts or domains",
    website: "https://haveibeenpwned.com", docs: "https://haveibeenpwned.com/API/v3", logo: { simpleIcons: "haveibeenpwned" },
    baseUrl: "https://haveibeenpwned.com/api/v3",
    auth: { type: "header", name: "hibp-api-key" },
    fields: [{ id: "token", label: "API key (32 hexadecimal characters)", secret: true }],
    keyUrl: "https://haveibeenpwned.com/API/Key",
    help: "The API is paid. 1) Get a subscription at haveibeenpwned.com/API/Key (Core, Pro…). 2) Copy the key from the dashboard of "
      + "your account (haveibeenpwned.com/Dashboard). The plan sets the requests per minute (if exceeded, it responds 429); to search by "
      + "domain you must verify it first in the dashboard, and “stealer logs” require the Pro plan.",
    test: { path: "/subscription/status",
              message: (d) => `Subscription ${d?.SubscriptionName ?? "?"} (${d?.Rpm ?? "?"} requests/min) `
                + `until ${day(d?.SubscribedUntil) ?? "?"}` },
    examples: "Examples: GET /breachedaccount/{email}?truncateResponse=false, GET /pasteaccount/{email}, "
      + "GET /breacheddomain/{verified domain}, GET /subscribeddomains, GET /stealerlogsbyemail/{email} (Pro), "
      + "GET /breaches?Domain=adobe.com, GET /breach/{Name}, GET /latestbreach, GET /dataclasses. A 404 means there are no results.",
    tools: [
      { name: "hibp_account_breaches", title: "Have I Been Pwned: breaches of an account", annotations: { readOnlyHint: true },
        description: "Public breaches that include an email address: name, domain, date, affected accounts and types of "
          + "exposed data (passwords, phone numbers…). It counts toward the plan's requests-per-minute limit.",
        schema: { email: z.string().describe("Email address"),
                   include_unverified: z.boolean().default(true).describe("Include unverified breaches") },
        async run({ email, include_unverified }, p) {
          const r = await p({ path: `/breachedaccount/${segment(email)}`,
                              query: { truncateResponse: "false", ...(include_unverified ? {} : { IncludeUnverified: "false" }) } });
          if (r.status === 404) return { email, breaches: [], message: "It does not appear in any known breach" };
          const list = ensureOk(r, "Have I Been Pwned");
          return { email, breaches: (Array.isArray(list) ? list : []).map((b) => ({
            name: b.Name, title: b.Title, domain: b.Domain, date: b.BreachDate, accounts: b.PwnCount, data: b.DataClasses,
            verified: b.IsVerified, sensitive: b.IsSensitive || undefined, spam_list: b.IsSpamList || undefined,
            malware: b.IsMalware || undefined })) };
        } },
    ],
  },
  {
    id: "censys", name: "Censys", category: "security", description: "Internet-exposed hosts, services, certificates and websites",
    website: "https://censys.com", docs: "https://docs.censys.com/reference/get-started", logo: { favicon: "https://censys.com" },
    baseUrl: "https://api.platform.censys.io/v3",
    auth: [{ type: "bearer" }, { type: "header", name: "X-Organization-ID", field: "organization" }],
    fields: [{ id: "token", label: "Personal access token (PAT)", secret: true },
             { id: "organization", label: "Organization ID", optional: true,
               help: "Only with a paid plan (Starter, Search or Core): it is in the “Current Organization” box. "
                 + "Empty: free account." }],
    keyUrl: "https://accounts.censys.io/settings/personal-access-tokens",
    help: "This uses the Censys Platform API (the old Search API v2, with API ID and secret, is deprecated). 1) At platform.censys.io click "
      + "your user icon (top right) → “API Access”. 2) Click “Create New Token”, give it a name and copy the token. 3) With an "
      + "organization plan (Starter, Search or Core), also copy its ID and ask an administrator for the “API Access” role. Queries "
      + "use credits (a host, web property or certificate record uses one; a search, five); the free account has 100 per month and only "
      + "allows looking up records.",
    test: { path: "/accounts/users/credits",
              message: (d) => `Token is valid (free account credits: ${d?.result?.balance ?? "?"})` },
    examples: "Examples: GET /global/asset/host/{ip}, GET /global/asset/webproperty/{host}:{port}, "
      + "GET /global/asset/certificate/{sha256}, "
      + "POST /global/search/query {\"query\": \"host.services.port: 3389 and host.location.country_code: US\", \"page_size\": 25}, "
      + "POST /global/search/aggregate {\"query\": …, \"field\": \"host.services.port\"}, "
      + "GET /accounts/organizations/{id}/credits (free).",
    tools: [
      { name: "censys_host", title: "Censys: host information", annotations: { readOnlyHint: true },
        description: "Services of an IP (port, protocol, software, CVEs, threats and labels), ASN, location, operating system and "
          + "DNS names. Uses 1 credit.",
        schema: { ip: IP, date: z.string().optional().describe("State at a past date (RFC 3339), e.g. 2026-01-01T00:00:00Z") },
        async run({ ip, date }, p) {
          const r = ensureOk(await p({ path: `/global/asset/host/${segment(ip)}`, query: { at_time: date } }), "Censys");
          const h = r.result?.resource || {};
          const software = (s) => (s.software || []).map((x) => [x.vendor, x.product, x.version].filter(Boolean).join(" ")).filter(Boolean);
          return { ip: h.ip, asn: h.autonomous_system?.asn, as: h.autonomous_system?.name, country: h.location?.country_code,
                   city: h.location?.city, os: h.operating_system?.product, dns: h.dns?.names?.slice(0, 25), tags: values(h.labels),
                   service_count: h.service_count, services: (h.services || []).map((s) => ({
                     port: s.port, protocol: s.protocol, transport: s.transport_protocol, software: software(s),
                     vulns: (s.vulns || []).map((v) => v.id), threats: (s.threats || []).map((t) => t.name),
                     labels: values(s.labels) })) };
        } },
    ],
  },
  {
    id: "urlscan", name: "urlscan.io", category: "security",
    description: "Suspicious URL analysis: screenshots, requests, IPs and verdicts",
    website: "https://urlscan.io", docs: "https://urlscan.io/docs/api/", logo: { favicon: "https://urlscan.io" },
    baseUrl: "https://urlscan.io/api/v1",
    auth: { type: "header", name: "API-Key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://urlscan.io/user/profile/",
    help: "1) Sign in at urlscan.io with your account. 2) In your user menu open “Settings & API”, click “New API key”, give it a "
      + "description and copy the key. The per-minute, hourly and daily quotas depend on the plan and the action (search, public scan, unlisted "
      + "or private) and only 200 responses count.",
    test: { path: "https://urlscan.io/user/quotas/" },
    examples: "Examples: GET /search/?q=domain:example.com AND date:>now-30d&size=100, GET /result/{uuid}/, "
      + "POST /scan/ {\"url\": \"https://…\", \"visibility\": \"private\"} (anyone can see public scans), "
      + "GET https://urlscan.io/screenshots/{uuid}.png, "
      + "GET https://urlscan.io/dom/{uuid}/, GET https://urlscan.io/user/quotas/.",
    tools: [
      { name: "urlscan_search", title: "urlscan.io: search scans", annotations: { readOnlyHint: true },
        description: "Search existing scans with urlscan syntax (domain:example.com, page.ip:1.2.3.4, page.asn:AS15169, hash:…, "
          + "date:>now-7d). Returns UUID, date, URL, IP, country, server, title and link to the screenshot.",
        schema: { query: z.string().describe("e.g. domain:example.com AND date:>now-30d"),
                   max: z.number().int().min(1).max(100).default(20) },
        async run({ query, max }, p) {
          const d = ensureOk(await p({ path: "/search/", query: { q: query, size: max } }), "urlscan.io");
          return { total: d.total, has_more: d.has_more, results: (d.results || []).map((r) => ({
            uuid: r._id, date: r.task?.time, url: r.task?.url, visibility: r.task?.visibility, domain: r.page?.domain, ip: r.page?.ip,
            country: r.page?.country, asn: r.page?.asnname, server: r.page?.server, status: r.page?.status,
            title: truncate(r.page?.title, 120), malicious: r.verdicts?.malicious, screenshot: r.screenshot })) };
        } },
      { name: "urlscan_result", title: "urlscan.io: scan result", annotations: { readOnlyHint: true },
        description: "Summary of a scan by its UUID: final page, verdicts, IPs, countries, contacted domains, certificates and "
          + "links to the screenshot and the DOM. While the scan is still running it responds 404: retry after a few seconds.",
        schema: { uuid: z.string().describe("Scan UUID") },
        async run({ uuid }, p) {
          const d = ensureOk(await p({ path: `/result/${segment(uuid)}/` }), "urlscan.io");
          const pg = d.page || {};
          const l = d.lists || {};
          return { url: d.task?.url, date: d.task?.time, visibility: d.task?.visibility,
                   page: { url: pg.url, domain: pg.domain, ip: pg.ip, country: pg.country, asn: pg.asnname, server: pg.server,
                           title: pg.title, status: pg.status, tls_issuer: pg.tlsIssuer },
                   verdict: d.verdicts?.overall, ips: l.ips?.slice(0, 50), countries: l.countries, domains: l.domains?.slice(0, 100),
                   url_count: l.urls?.length,
                   certificates: l.certificates?.slice(0, 20)
                     .map((c) => ({ subject: c.subjectName, issuer: c.issuer, until: day(c.validTo) })),
                   screenshot: d.task?.screenshotURL, dom: d.task?.domURL };
        } },
    ],
  },
  {
    id: "abuseipdb", name: "AbuseIPDB", category: "security", description: "IP reputation based on abuse reports and blacklist",
    website: "https://www.abuseipdb.com", docs: "https://docs.abuseipdb.com", logo: { favicon: "https://www.abuseipdb.com" },
    baseUrl: "https://api.abuseipdb.com/api/v2",
    auth: { type: "header", name: "Key" },
    fields: [{ id: "token", label: "API key (v2)", secret: true }],
    keyUrl: "https://www.abuseipdb.com/account/api",
    help: "1) Sign in at abuseipdb.com with your account. 2) In “Account”, “API” tab, click “Create Key”, give it a name and copy the key. "
      + "The free plan allows, per day, 1,000 /check queries and 1,000 reports, 100 each of /check-block and /reports, and five "
      + "/blacklist downloads; the connection test uses one query.",
    test: { path: "/check", query: { ipAddress: "127.0.0.1" }, message: "API key is valid" },
    examples: "Examples: GET /check?ipAddress=1.2.3.4&maxAgeInDays=90&verbose, GET /reports?ipAddress=…&perPage=25, "
      + "GET /check-block?network=1.2.3.0/24, GET /blacklist?confidenceMinimum=90&limit=1000, POST /report with a form "
      + "{\"ip\": …, \"categories\": \"18,22\", \"comment\": …} (public report under your account).",
    tools: [
      { name: "abuseipdb_check_ip", title: "AbuseIPDB: reputation of an IP", annotations: { readOnlyHint: true },
        description: "Abuse score (0-100), number of reports and distinct reporters, last report, ISP, domain, usage type, country "
          + "and whether it is a Tor node. With detail=true it adds the latest reports with their categories and comments. Uses 1 query of the "
          + "daily quota.",
        schema: { ip: IP, days: z.number().int().min(1).max(365).default(90).describe("Maximum age of the reports"),
                   detail: z.boolean().default(false) },
        async run({ ip, days, detail }, p) {
          const query = { ipAddress: ip.trim(), maxAgeInDays: days, ...(detail ? { verbose: "" } : {}) };
          const d = ensureOk(await p({ path: "/check", query }), "AbuseIPDB").data || {};
          if (!detail) return d;
          return { ...d, reports: (d.reports || []).slice(0, 25).map((r) => ({ date: r.reportedAt, country: r.reporterCountryCode,
            categories: (r.categories || []).map((c) => ABUSEIPDB_CATEGORIES[c] || c), comment: truncate(r.comment, 200) })) };
        } },
    ],
  },
  {
    id: "greynoise", name: "GreyNoise", category: "security",
    description: "Separates mass-scanner noise from targeted attacks",
    website: "https://www.greynoise.io", docs: "https://docs.greynoise.io/reference/ping", logo: { favicon: "https://www.greynoise.io" },
    baseUrl: "https://api.greynoise.io",
    auth: { type: "header", name: "key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://viz.greynoise.io/account/api-key",
    help: "1) Sign in at viz.greynoise.io with your account (a free account only gets a key if you sign up with a business email). 2) Click "
      + "your name (top right) → “My API Key” and copy the key. The free account can only use the Community API "
      + "(/v3/community/{ip}), with about 50 weekly lookups shared with the web viewer; IP Lookup, GNQL and CVE require a paid plan.",
    test: { path: "/ping",
              message: (d) => `API key is valid${d?.plan ? ` (plan ${d.plan}${d.expiration ? `, expires ${d.expiration}` : ""})` : ""}` },
    examples: "Examples: GET /v3/community/{ip} (free), GET /v3/ip/{ip}?quick=true, POST /v3/ip {\"ips\": [\"…\"]} (up to 10,000), "
      + "GET /v3/gnql?query=classification:malicious tags:\"…\"&size=100, GET /v3/gnql/stats?query=…, GET /v1/cve/{CVE}, GET /ping.",
    tools: [
      { name: "greynoise_ip", title: "GreyNoise: context of an IP", annotations: { readOnlyHint: true },
        description: "Check whether an IP scans the Internet at scale (noise) or belongs to a known business service, with its "
          + "classification (benign, malicious, unknown) and last activity. With full=true it uses IP Lookup (paid): tags, actor, "
          + "exploited CVEs, ASN, rDNS, VPN and Tor.",
        schema: { ip: IP, full: z.boolean().default(false).describe("false: Community API (free); true: IP Lookup v3 (paid)") },
        async run({ ip, full }, p) {
          const r = await p({ path: `/v3/${full ? "ip" : "community"}/${segment(ip)}` });
          if (!full && r.status === 404) return r.data;
          const d = ensureOk(r, "GreyNoise");
          if (!full) return d;
          const scanner = { ...d.internet_scanner_intelligence };
          delete scanner.raw_data;
          return { ip: d.ip, scanner: { ...scanner, tags: scanner.tags?.map((t) => t.name || t) },
                   service: d.business_service_intelligence, restricted: d.request_metadata?.restricted_fields };
        } },
    ],
  },
  {
    id: "securitytrails", name: "SecurityTrails", category: "security",
    description: "Current and historical DNS, subdomains and WHOIS data",
    website: "https://securitytrails.com", docs: "https://docs.securitytrails.com/docs/authentication",
    logo: { favicon: "https://securitytrails.com" },
    baseUrl: "https://api.securitytrails.com/v1",
    auth: { type: "header", name: "APIKEY" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://securitytrails.com/app/account/credentials",
    help: "1) Sign in at securitytrails.com with your account and open securitytrails.com/app/account/credentials. 2) Click “Create New API "
      + "Key”, write a note and copy the key. Each query uses part of the plan's monthly quota; GET /account/usage shows what has been used.",
    test: { path: "/ping", message: "API key is valid" },
    examples: "Examples: GET /domain/{domain}, GET /domain/{domain}/subdomains, GET /domain/{domain}/tags, GET /domain/{domain}/whois, "
      + "GET /history/{domain}/dns/a (also aaaa, mx, ns, soa, txt), GET /history/{domain}/whois, GET /domain/{domain}/associated, "
      + "POST /domains/list {\"filter\": {\"ipv4\": \"1.2.3.4\"}} (domains that point to an IP), GET /account/usage.",
    tools: [
      { name: "securitytrails_subdomains", title: "SecurityTrails: subdomains", annotations: { readOnlyHint: true },
        description: "Known subdomains of a domain (passive DNS), already complete (e.g. api.example.com). Uses 1 query of the monthly "
          + "quota.",
        schema: { domain: z.string().describe("Domain, e.g. example.com") },
        async run({ domain }, p) {
          const dom = domain.trim().toLowerCase();
          const d = ensureOk(await p({ path: `/domain/${segment(dom)}/subdomains` }), "SecurityTrails");
          const list = (d.subdomains || []).map((s) => `${s}.${dom}`);
          return { domain: dom, total: d.subdomain_count ?? list.length, limit_reached: d.meta?.limit_reached, subdomains: list };
        } },
      { name: "securitytrails_domain", title: "SecurityTrails: current DNS of a domain", annotations: { readOnlyHint: true },
        description: "Current DNS records of a domain (A, AAAA, MX, NS, SOA and TXT, with since when they are seen and how many domains "
          + "share each value) and number of subdomains. Uses 1 query of the monthly quota.",
        schema: { domain: z.string().describe("Domain, e.g. example.com") },
        run: async ({ domain }, p) => ensureOk(await p({ path: `/domain/${segment(domain.toLowerCase())}` }), "SecurityTrails") },
    ],
  },
  {
    id: "otx", name: "AlienVault OTX", category: "security",
    description: "Indicators of compromise and community threat pulses",
    website: "https://otx.alienvault.com", docs: "https://otx.alienvault.com/api", logo: { favicon: "https://otx.alienvault.com" },
    baseUrl: "https://otx.alienvault.com/api/v1",
    auth: { type: "header", name: "X-OTX-API-KEY" },
    fields: [{ id: "token", label: "OTX Key", secret: true }],
    keyUrl: "https://otx.alienvault.com/settings",
    help: "Open Threat Exchange (from LevelBlue, formerly AT&T Cybersecurity) is free. 1) Sign in at otx.alienvault.com with your account. "
      + "2) Click the gear icon (top right), open “Settings” and copy the “OTX Key” from the API section.",
    test: { path: "/users/me", account: (d) => d.username },
    examples: "Examples: GET /indicators/IPv4/{ip}/general (sections: general, reputation, geo, malware, url_list, passive_dns), "
      + "GET /indicators/domain/{domain}/passive_dns, GET /indicators/hostname/{host}/url_list, GET /indicators/file/{hash}/analysis, "
      + "GET /indicators/cve/{CVE}/general, GET /search/pulses?q=…&limit=20, GET /pulses/subscribed?limit=20&modified_since=2026-10-01, "
      + "GET /pulses/{id}/indicators.",
    tools: [
      { name: "otx_indicator", title: "OTX: indicator information", annotations: { readOnlyHint: true },
        description: "Pulses (community reports) that mention an IP, domain, host, URL, hash or CVE, with malware "
          + "families, adversaries, tags, validation and country/ASN. The other sections return the data as is: reputation, geo, "
          + "malware, url_list, passive_dns, http_scans, analysis (hash), whois.",
        schema: { type: z.enum(["ipv4", "ipv6", "domain", "host", "url", "hash", "cve"]), value: z.string().describe("Indicator"),
                   section: z.string().default("general").describe("general, reputation, geo, malware, url_list, passive_dns, analysis…") },
        async run({ type, value, section }, p) {
          const indicator = type === "url" ? encodeURI(value.trim()).replace(/\?/g, "%3F").replace(/#/g, "%23") : segment(value);
          const d = ensureOk(await p({ path: `/indicators/${OTX_TYPES[type]}/${indicator}/${segment(section)}` }), "OTX");
          if (section !== "general" || type === "cve") return d;
          const pi = d.pulse_info || {};
          return { indicator: d.indicator, type: d.type, pulses: pi.count, related: pi.related, validation: values(d.validation),
                   false_positive: d.false_positive?.length ? d.false_positive : undefined, reputation: d.reputation,
                   country: d.country_name, asn: d.asn, latest_pulses: (pi.pulses || []).slice(0, 10).map((x) => ({
                     id: x.id, name: x.name, created: day(x.created), modified: day(x.modified), author: x.author?.username,
                     tags: x.tags?.slice(0, 10), adversary: x.adversary || undefined,
                     malware: values(x.malware_families?.map((m) => m.display_name || m)), tlp: x.TLP })) };
        } },
    ],
  },
  {
    id: "intruder", name: "Intruder", category: "security",
    description: "Vulnerability scanner: targets, scans and issues",
    website: "https://www.intruder.io", docs: "https://developers.intruder.io", logo: { favicon: "https://www.intruder.io" },
    baseUrl: "https://api.intruder.io/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API access token", secret: true }],
    keyUrl: "https://portal.intruder.io/settings/account",
    help: "1) At portal.intruder.io open “My account” (portal.intruder.io/settings/account) → “API Access Tokens”. 2) Enter a name "
      + "and, if you want, an expiry date, and confirm with your password. 3) Copy the token: it is shown only once. The API is available on "
      + "the Cloud, Pro, Enterprise and Vanguard plans, for administrators only, and the token has all the access of whoever creates it (it "
      + "cannot be limited to tags or targets).",
    test: { path: "/health/", account: (d) => [].concat(d || [])[0]?.authenticated_as,
              validate: (d) => {
                const authenticatedAs = [].concat(d || [])[0]?.authenticated_as;
                if (!authenticatedAs || /^not authenticated/i.test(authenticatedAs)) throw new Error("Intruder does not recognize the token (Not authenticated)");
              } },
    examples: "Examples: GET /issues/?severity=critical&limit=50, GET /issues/{id}/occurrences/, GET /targets/?target_status=live, "
      + "GET /scans/?status=in_progress, GET /scans/{id}/, POST /scans/ (starts a scan), GET /occurrences/fixed/, GET /licenses/, "
      + "GET /tags/. Paths end in “/” and pagination uses limit and offset.",
    tools: [
      { name: "intruder_issues", title: "Intruder: open issues", annotations: { readOnlyHint: true },
        description: "Vulnerabilities detected on your targets (id, severity, title, CVSS, exploit likelihood, "
          + "category and date), filterable by severity, target or tag. To see where each one appears use intruder_occurrences.",
        schema: { severity: z.enum(["critical", "high", "medium", "low"]).optional(),
                   targets: z.string().optional().describe("Target addresses separated by commas"),
                   tags: z.string().optional().describe("Tags separated by commas"),
                   snoozed: z.boolean().default(false).describe("true: only the snoozed ones"),
                   max: z.number().int().min(1).max(100).default(50), offset: z.number().int().min(0).default(0).describe("offset") },
        async run({ severity, targets, tags, snoozed, max, offset }, p) {
          const query = { severity: severity, target_addresses: targets, tag_names: tags, snoozed: snoozed, limit: max,
                          offset: offset };
          const d = ensureOk(await p({ path: "/issues/", query }), "Intruder");
          return { total: d.count, next: d.next, issues: (d.results || []).map((i) => ({
            id: i.id, severity: i.severity, title: i.title, cvss: i.cvss_score, exploit_likelihood: i.exploit_likelihood,
            category: i.vulnerability_category, first_seen: day(i.first_seen_at) })) };
        } },
      { name: "intruder_occurrences", title: "Intruder: occurrences of an issue", annotations: { readOnlyHint: true },
        description: "Where an issue appears: target, port, protocol, CVE, CVSS, first detection, last scan and extra "
          + "scanner data (URL, parameter, version…).",
        schema: { issue: z.number().int().describe("Issue ID"), max: z.number().int().min(1).max(100).default(50),
                   offset: z.number().int().min(0).default(0).describe("offset") },
        async run({ issue, max, offset }, p) {
          const d = ensureOk(await p({ path: `/issues/${issue}/occurrences/`, query: { limit: max, offset: offset } }), "Intruder");
          return { total: d.count, next: d.next, occurrences: (d.results || []).map((o) => ({
            id: o.occurrence_id, target: o.target, address: o.display_address, port: o.port, protocol: o.protocol, cves: o.cves,
            cvss: o.cvss_score, first_seen: day(o.first_seen_at), last_scan: day(o.target_last_scanned_at),
            snoozed: o.snoozed || undefined, extra: o.extra_info })) };
        } },
    ],
  },
  {
    id: "nvd", name: "NVD (NIST)", category: "security",
    description: "NIST CVE database: CVSS, CWE, affected products and KEV",
    website: "https://nvd.nist.gov", docs: "https://nvd.nist.gov/developers/vulnerabilities", logo: { favicon: "https://www.nist.gov" },
    baseUrl: "https://services.nvd.nist.gov/rest/json",
    auth: { type: "header", name: "apiKey" },
    fields: [{ id: "token", label: "API key", secret: true, optional: true,
               help: "Without a key: 5 requests every 30 seconds; with a key: 50." }],
    keyUrl: "https://nvd.nist.gov/developers/request-an-api-key",
    help: "The API is public and free: without a key it allows 5 requests every 30 seconds and with a key, 50. 1) Request the key at "
      + "nvd.nist.gov/developers/request-an-api-key with the organization name, an email and the organization type. 2) Open the "
      + "link that arrives by email (single-use, it expires after seven days) to activate it and see it. An invalid key makes NVD "
      + "respond 404 to everything; leave the field empty to use the API without a key.",
    // NVD responds 404 (header “message: Invalid apiKey.”) if the key is not valid: it is turned into a clear error.
    test: { path: "/cves/2.0", query: { cveId: "CVE-2021-44228" }, acceptStatus: [404],
              message: "API is reachable (and the key, if there is one, is valid)",
              validate: (d, r) => {
                if (r.status === 404) throw new Error("NVD responded 404: the API key is not valid or is not activated");
              } },
    examples: "Examples: GET /cves/2.0?cveId=CVE-2024-3400, GET /cves/2.0?keywordSearch=fortinet ssl vpn&resultsPerPage=50, "
      + "GET /cves/2.0?cpeName=cpe:2.3:a:apache:http_server:2.4.49:*:*:*:*:*:*:*, "
      + "GET /cves/2.0?virtualMatchString=cpe:2.3:a:apache:http_server, "
      + "GET /cves/2.0?hasKev&pubStartDate=2026-09-01T00:00:00.000&pubEndDate=2026-10-15T00:00:00.000 (ranges of 120 days at most), "
      + "GET /cvehistory/2.0?cveId=…, GET /cpes/2.0?keywordSearch=…. Parameters without a value (hasKev, noRejected, keywordExactMatch) "
      + "are written in the path, not in query.",
    tools: [
      { name: "nvd_search_cves", title: "NVD: search CVEs", annotations: { readOnlyHint: true },
        description: "Search CVEs by identifier, keywords, product (CPE), CVSS v3 severity, CWE, inclusion in CISA's KEV catalog "
          + "or publication date. Returns description, CVSS (v4, v3.1, v3.0 or v2), CWE, KEV data, affected versions and "
          + "references. Rejected CVEs are excluded unless a specific one is requested.",
        schema: { cve: z.string().optional().describe("Identifier, e.g. CVE-2024-3400"),
                   text: z.string().optional().describe("Keywords in the description"),
                   exact: z.boolean().default(false).describe("Search the text as an exact phrase"),
                   cpe: z.string().optional().describe("Full CPE 2.3 name, e.g. cpe:2.3:o:fortinet:fortios:7.2.4:*:*:*:*:*:*:*"),
                   severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional().describe("CVSS v3 severity"),
                   cwe: z.string().optional().describe("e.g. CWE-79"),
                   kev: z.boolean().default(false).describe("Only CVEs in CISA's KEV catalog"),
                   from: z.string().optional().describe("Published from (YYYY-MM-DD); requires “to”, 120 days at most"),
                   to: z.string().optional().describe("Published until (YYYY-MM-DD)"),
                   max: z.number().int().min(1).max(100).default(20), start: z.number().int().min(0).default(0).describe("startIndex") },
        async run(a, p) {
          if (a.from || a.to) {
            const days = (Date.parse(a.to) - Date.parse(a.from)) / 86_400_000;
            if (!(days >= 0 && days < 120)) throw new Error("NVD: provide “from” and “to” (YYYY-MM-DD) with 120 days at most");
          }
          // The query is built by hand: hasKev, noRejected and keywordExactMatch go without “=value”.
          const q = [];
          const put = (k, v) => q.push(v === true ? k : `${k}=${encodeURIComponent(String(v).trim())}`);
          if (a.cve) put("cveId", a.cve.toUpperCase());
          if (a.text) put("keywordSearch", a.text);
          if (a.text && a.exact) put("keywordExactMatch", true);
          if (a.cpe) put("cpeName", a.cpe);
          if (a.severity) put("cvssV3Severity", a.severity);
          if (a.cwe) put("cweId", a.cwe.toUpperCase());
          if (a.kev) put("hasKev", true);
          if (a.from) put("pubStartDate", `${a.from.trim()}T00:00:00.000`);
          if (a.to) put("pubEndDate", `${a.to.trim()}T23:59:59.999`);
          if (!a.cve) put("noRejected", true);
          put("resultsPerPage", a.max);
          put("startIndex", a.start);
          const r = await p({ path: `/cves/2.0?${q.join("&")}` });
          // NVD only explains its errors in a header; a 404 is an invalid parameter or an invalid API key.
          if (r.status === 404) {
            throw new Error("NVD responded 404: some parameter is not valid (CPE, CWE, dates…) or the API key is not valid");
          }
          const d = ensureOk(r, "NVD");
          return { total: d.totalResults, start: d.startIndex, cves: (d.vulnerabilities || []).map(cveSummary) };
        } },
    ],
  },
  {
    id: "hackerone", name: "HackerOne", category: "security", description: "Bug bounty: programs, scope, reports and rewards",
    website: "https://www.hackerone.com", docs: "https://api.hackerone.com", logo: { simpleIcons: "hackerone" },
    baseUrl: "https://api.hackerone.com/v1",
    auth: { type: "basic", usernameField: "username", passwordField: "token" },
    fields: [{ id: "username", label: "Token identifier",
               help: "Hacker: your HackerOne username. Organization: the identifier you gave when creating the token." },
             { id: "token", label: "Token value", secret: true },
             { id: "api", label: "Account type", default: "hackers",
               options: [["hackers", "Hacker (researcher)"], ["me", "Organization (own program)"]],
               help: "The API the token belongs to: the hacker one (/hackers/…) or the organization one." }],
    keyUrl: "https://hackerone.com/settings/api_token/edit",
    help: "With a hacker account: at hackerone.com open “Settings” → “API Token”, click “Generate API token” (it revokes the previous one) and copy the "
      + "value, which is shown only once; the identifier is your username. With an organization account: an administrator goes "
      + "to “Organization Settings” → “API Tokens” → “Create API Token”, enters an identifier, chooses the groups (the permissions of the "
      + "token) and copies the value; the plan must include the API. Limits: 600 reads per minute and 25 writes every 20 seconds.",
    test: { path: "/{api}/programs", query: { "page[size]": 1 },
              message: (d) => (d?.data?.[0]?.attributes?.handle
                ? `Token is valid (visible program: ${d.data[0].attributes.handle})` : "Token is valid") },
    examples: "Hacker: GET /hackers/programs?page[size]=100, GET /hackers/programs/{handle}, "
      + "GET /hackers/programs/{handle}/structured_scopes, "
      + "GET /hackers/me/reports, GET /hackers/reports/{id}, GET /hackers/hacktivity?queryString=severity_rating:critical, "
      + "GET /hackers/payments/balance. Organization: GET /me/programs, GET /reports?filter[program][]={handle}&filter[state][]=triaged, "
      + "GET /reports/{id}, POST /reports/{id}/activities, GET /programs/{id}/structured_scopes.",
    tools: [
      { name: "hackerone_scope", title: "HackerOne: scope of a program", annotations: { readOnlyHint: true },
        description: "Assets of a bug bounty program with their type, identifier, whether they are in scope (accept reports) and have "
          + "a bounty, maximum severity and instructions. Only with a hacker token.",
        schema: { program: z.string().describe("Program handle, e.g. security"),
                   max: z.number().int().min(1).max(100).default(100) },
        async run({ program, max }, p) {
          const route = `/hackers/programs/${segment(program)}/structured_scopes`;
          const d = ensureOk(await p({ path: route, query: { "page[size]": max } }), "HackerOne");
          return (d.data || []).map(({ attributes: a = {} }) => ({ type: a.asset_type, asset: a.asset_identifier,
            in_scope: a.eligible_for_submission, bounty: a.eligible_for_bounty, max_severity: a.max_severity,
            instructions: truncate(a.instruction, 300) }));
        } },
      { name: "hackerone_reports", title: "HackerOne: reports of a program", annotations: { readOnlyHint: true },
        description: "Reports received in a program of your organization: id, title, state, severity, weakness, asset, "
          + "researcher and date. Only with an organization token.",
        schema: { program: z.string().describe("Program handle"),
                   state: z.string().optional()
                     .describe("new, triaged, needs-more-info, resolved, duplicate, informative, not-applicable…"),
                   max: z.number().int().min(1).max(100).default(25), page: z.number().int().min(1).default(1) },
        async run({ program, state: reportState, max, page }, p) {
          const query = { "filter[program][]": program.trim(), "filter[state][]": reportState, "page[size]": max, "page[number]": page };
          const d = ensureOk(await p({ path: "/reports", query }), "HackerOne");
          return (d.data || []).map((r) => {
            const a = r.attributes || {};
            const rel = r.relationships || {};
            return { id: r.id, title: a.title, state: a.state, created: day(a.created_at),
                     severity: rel.severity?.data?.attributes?.rating,
                     weakness: rel.weakness?.data?.attributes?.name, asset: rel.structured_scope?.data?.attributes?.asset_identifier,
                     researcher: rel.reporter?.data?.attributes?.username };
          });
        } },
    ],
  },
  {
    id: "snyk", name: "Snyk", category: "security", description: "Vulnerabilities in code, dependencies, containers and IaC",
    website: "https://snyk.io", docs: "https://docs.snyk.io/snyk-api", logo: { simpleIcons: "snyk" },
    baseUrl: "https://{server}.snyk.io", headers: { Accept: "application/vnd.api+json, application/json" },
    auth: { type: "header", name: "Authorization", prefix: "token " },
    fields: [{ id: "token", label: "API token", secret: true },
             { id: "server", label: "Region", default: "api",
               options: [["api", "SNYK-US-01 (app.snyk.io)"], ["api.us", "SNYK-US-02 (app.us.snyk.io)"],
                          ["api.eu", "SNYK-EU-01 (app.eu.snyk.io)"], ["api.au", "SNYK-AU-01 (app.au.snyk.io)"]],
               help: "The one matching the address you sign in to Snyk with: a token only works in its own region." }],
    help: "The API requires the Enterprise plan (on Free and Team the token only works for the CLI and IDEs). For automations use a "
      + "service account: in the organization or group settings → “Service accounts”, create it with the minimum role needed "
      + "(e.g. Org Collaborator or a custom read-only role) and copy the token. A personal token also works: your account → "
      + "“Account settings” → “Personal access tokens” (or the classic “Auth Token”).",
    test: { path: "/rest/self", query: { version: SNYK_VERSION }, account: (d) => d.data?.attributes?.email || d.data?.attributes?.name },
    examples: `Examples (on /rest the version is required): GET /rest/orgs?version=${SNYK_VERSION}, `
      + `GET /rest/orgs/{org_id}/projects?version=${SNYK_VERSION}&limit=100, `
      + `GET /rest/orgs/{org_id}/issues?version=${SNYK_VERSION}&effective_severity_level=critical,high&status=open, `
      + `GET /rest/orgs/{org_id}/targets?version=${SNYK_VERSION}. The v1 API is still at /v1/…. To write to /rest send the body in `
      + "body_base64 with content_type application/vnd.api+json.",
    tools: [
      { name: "snyk_organizations", title: "Snyk: organizations", annotations: { readOnlyHint: true },
        description: "Organizations accessible with the token (id, name, slug and group). The id is the one the other routes ask for.",
        schema: {},
        run: async (_, p) => (ensureOk(await p({ path: "/rest/orgs", query: { version: SNYK_VERSION, limit: 100 } }), "Snyk").data || [])
          .map((o) => ({ id: o.id, name: o.attributes?.name, slug: o.attributes?.slug, group: o.attributes?.group_id })) },
      { name: "snyk_issues", title: "Snyk: issues of an organization", annotations: { readOnlyHint: true },
        description: "Security issues of an organization (dependencies, code, containers, IaC, secrets): title, type, "
          + "severity, status, identifiers (SNYK-…, CVE) and project, with filters by severity, status and type.",
        schema: { org: z.string().describe("Organization ID (snyk_organizations)"),
                   severity: z.array(z.enum(["critical", "high", "medium", "low", "info"])).optional(),
                   status: z.enum(["open", "resolved"]).default("open"),
                   type: z.enum(["package_vulnerability", "license", "code", "cloud", "config", "custom", "secrets"]).optional(),
                   max: z.number().int().min(10).max(100).multipleOf(10).default(50) },
        async run({ org, severity, status: issueStatus, type, max }, p) {
          const query = { version: SNYK_VERSION, limit: max, status: issueStatus, effective_severity_level: severity?.join(","), type: type };
          const d = ensureOk(await p({ path: `/rest/orgs/${segment(org)}/issues`, query }), "Snyk");
          return { next: d.links?.next, issues: (d.data || []).map((i) => {
            const a = i.attributes || {};
            return { id: i.id, title: a.title, type: a.type, severity: a.effective_severity_level, status: a.status,
                     ignored: a.ignored || undefined, problems: a.problems?.map((x) => x.id),
                     project: i.relationships?.scan_item?.data?.id, created: day(a.created_at) };
          }) };
        } },
    ],
  },
  {
    id: "ipinfo", name: "IPinfo", category: "security", description: "IP geolocation, ASN, operator and privacy data",
    website: "https://ipinfo.io", docs: "https://ipinfo.io/developers", logo: { favicon: "https://ipinfo.io" },
    baseUrl: "https://api.ipinfo.io", allowedOrigins: ["https://ipinfo.io"],
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "Access token", secret: true }],
    keyUrl: "https://ipinfo.io/account/token",
    help: "1) Sign up at ipinfo.io. 2) Copy the access token from your account dashboard (“Token” section). The Lite plan is free and "
      + "unlimited (country, continent and ASN); city, coordinates, hostname and privacy (VPN, proxy, Tor, hosting) require Core or "
      + "higher, with a monthly quota.",
    test: { path: "https://ipinfo.io/me",
              message: (d) => (d?.requests ? `Token is valid (requests this month: ${d.requests.month ?? 0})` : "Token is valid") },
    examples: "Examples: GET /lite/{ip} (free), GET /lookup/{ip} (Core or higher), GET /lite/8.8.8.8/country_code (a single field), "
      + "GET /lite/me (your public IP), GET https://ipinfo.io/me (token usage), GET https://ipinfo.io/{ip} (old plans).",
    tools: [
      { name: "ipinfo_ip", title: "IPinfo: data of an IP", annotations: { readOnlyHint: true },
        description: "ASN, AS name and domain, country and continent of an IP (IPinfo Lite, free). With full=true it uses the Core API "
          + "(paid): also city, region, coordinates, hostname, AS type and whether it is anycast, hosting, mobile or anonymous.",
        schema: { ip: IP, full: z.boolean().default(false) },
        run: async ({ ip, full }, p) => ensureOk(await p({ path: `/${full ? "lookup" : "lite"}/${segment(ip)}` }), "IPinfo") },
    ],
  },
  {
    id: "fullhunt", name: "FullHunt", category: "security",
    description: "Attack surface: subdomains, hosts, ports and technologies",
    website: "https://fullhunt.io", docs: "https://docs.fullhunt.io/docs/intro", logo: { favicon: "https://fullhunt.io" },
    baseUrl: "https://fullhunt.io/api/v1",
    auth: { type: "header", name: "X-API-KEY" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://fullhunt.io/user/settings/",
    help: "1) Create an account at fullhunt.io. 2) Copy the API key from your profile settings. Queries use credits from the "
      + "monthly quota and the plan limits the results per request (also, 200 requests per hour on each endpoint); GET /auth/status "
      + "shows the plan and the remaining credits.",
    test: { path: "/auth/status", account: (d) => [d.user?.email, d.user?.plan && `plan ${d.user.plan}`].filter(Boolean).join(" · ") },
    examples: "Examples: GET /domain/{domain}/subdomains, GET /domain/{domain}/details?resolvable_only=true (hosts with IP, ports, "
      + "technologies and TLS), GET /host/{host or IP}, GET /auth/status (remaining credits).",
  },
];
