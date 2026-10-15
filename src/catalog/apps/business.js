// Business: e-signature, documents, scheduling and time tracking, HR, payments and subscriptions, CRM and accounting.
import { z } from "zod";
import { USER_AGENT, saveDownload } from "../../http.js";
import { ensureOk } from "../define.js";

// Square publishes a version every month (earlier ones stay active); it goes in the Square-Version header.
const SQUARE_VERSION = "2026-09-16";
// Salesforce: Summer '26 is already on all instances (Winter '27, v68.0, is still rolling out in October 2026).
const SALESFORCE_VERSION = "v67.0";
// Cal.com requires its own cal-api-version header for each group of routes.
const CAL = { bookings: "2026-05-01", create: "2026-02-25", types: "2026-06-12", slots: "2024-09-04", schedules: "2024-06-11" };

const DOCUSIGN_SERVERS = [["account.docusign.com", "Production"], ["account-d.docusign.com", "Demo (developer account)"]];
const SALESFORCE_SERVERS = [["login.salesforce.com", "Production or Developer Edition"], ["test.salesforce.com", "Sandbox"]];
// Xero: since March 2026 new apps can only request granular scopes; the accounting report scopes are restricted.
const XERO_SCOPES = ["offline_access", "accounting.settings", "accounting.contacts", "accounting.invoices", "accounting.payments",
  "accounting.banktransactions", "accounting.attachments"];

const fullName = (...parts) => parts.filter(Boolean).join(" ");
const isoDay = (v, end) => (/^\d{4}-\d{2}-\d{2}$/.test(v || "") ? `${v}T${end ? "23:59:59" : "00:00:00"}Z` : v);
const daysAgo = (n) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);

// PDF or other binary file returned by the API → Conector's downloads folder.
function savePdf(d, name, service) {
  if (!d?.base64) throw new Error(`${service} returned no file`);
  return saveDownload(name, Buffer.from(d.base64, "base64"));
}

// Salesforce: removes the “attributes” metadata from each record (also in subqueries).
const cleanSalesforce = (v) => (Array.isArray(v) ? v.map(cleanSalesforce) : v && typeof v === "object"
  ? Object.fromEntries(Object.entries(v).filter(([k]) => k !== "attributes").map(([k, x]) => [k, cleanSalesforce(x)])) : v);

// Salesforce login server: the My Domain if given (always under .my.salesforce.com) or the chosen one.
function salesforceLoginHost(c) {
  const domain = String(c.my_domain || "").trim().toLowerCase();
  if (domain) {
    if (/^[a-z0-9-]+(\.[a-z0-9-]+)*\.my\.salesforce\.com$/.test(domain)) return domain;
    throw new Error("“My Domain” must end in .my.salesforce.com");
  }
  const server = c.server || SALESFORCE_SERVERS[0][0];
  if (!SALESFORCE_SERVERS.some(([v]) => v === server)) throw new Error("Salesforce: invalid organization type");
  return server;
}

// DocuSign: after authorizing, the user's default account and its server (base_uri), according to /oauth/userinfo.
async function docusignAccount(token, c, httpRequest) {
  const server = DOCUSIGN_SERVERS.some(([v]) => v === c.server) ? c.server : DOCUSIGN_SERVERS[0][0];
  const d = ensureOk(await httpRequest(`https://${server}/oauth/userinfo`,
    { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } }), "DocuSign");
  const account = (d.accounts || []).find((x) => x.is_default === true || x.is_default === "true") || d.accounts?.[0];
  if (!account?.account_id) throw new Error("DocuSign: the user has no eSignature account");
  const base = String(account.base_uri || "").replace(/\/$/, "");
  if (!/^https:\/\/[a-z0-9.-]+\.docusign\.(net|com)$/i.test(base)) throw new Error("DocuSign: unexpected account server");
  return { base_uri: base, account_id: account.account_id };
}

// Xero: after authorizing, the most recently connected organization (the one chosen on the authorization screen).
async function xeroOrganization(token, c, httpRequest) {
  const d = ensureOk(await httpRequest("https://api.xero.com/connections",
    { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } }), "Xero");
  const date = (x) => String(x.updatedDateUtc || x.createdDateUtc || "");
  const [org] = (Array.isArray(d) ? d : []).filter((x) => x.tenantType === "ORGANISATION").sort((a, b) => date(b).localeCompare(date(a)));
  if (!org?.tenantId) throw new Error("Xero: no organization is connected; authorize again and choose one");
  return { tenant_id: org.tenantId, organization: org.tenantName };
}

// Harvest: after authorizing, the user's Harvest account (not the Forecast one): the one already given, if still accessible, or the first.
async function harvestAccount(token, c, httpRequest) {
  const d = ensureOk(await httpRequest("https://id.getharvest.com/api/v2/accounts",
    { headers: { Authorization: `Bearer ${token}`, Accept: "application/json", "User-Agent": USER_AGENT } }), "Harvest");
  const accounts = (Array.isArray(d?.accounts) ? d.accounts : []).filter((x) => x.product === "harvest");
  const account = accounts.find((x) => String(x.id) === String(c.account ?? "")) || accounts[0];
  if (!account) throw new Error("Harvest: the authorized user has no Harvest account (only Forecast)");
  return { account: String(account.id) };
}

// Square: the flow with a secret is used, without PKCE (with code_challenge Square switches to the PKCE flow, which does not use the secret
// and gives a single-use refresh token that expires). Square gives the expiry as a date (expires_at) and here it is converted to expires_in.
const SQUARE = {
  name: "Square", key: "square", redirect: "https", json: true, extraParams: { session: "false" },
  authorizeUrl: "https://connect.squareup.com/oauth2/authorize", tokenUrl: "https://connect.squareup.com/oauth2/token",
  params: (params) => Object.fromEntries(Object.entries(params).filter(([k]) => !k.startsWith("code_challenge"))),
  tokenBody: (body) => Object.fromEntries(Object.entries(body).filter(([k]) => k !== "code_verifier")),
  parseResponse: (d) => {
    const seconds = Math.floor((Date.parse(d?.expires_at) - Date.now()) / 1000);
    return Number.isFinite(seconds) ? { ...d, expires_in: Math.max(seconds, 60) } : d;
  },
  help: "1) At developer.squareup.com/apps open your application (or create one named “Conector”) and choose “Production” at the top. "
    + "2) In the left menu open “OAuth”, click “Update” under “Redirect URL”, paste the redirect URI shown below "
    + "(Square requires HTTPS) and click “Confirm”. 3) Copy the “Application ID” (the client ID) and, with “Show”, the “Application "
    + "secret”. It only works for the production account (for Sandbox testing, use the access token). Whoever connects accepts "
    + "the permissions (scopes) listed below.",
};

export default [
  {
    id: "sesamehr", name: "Sesame HR", category: "hr", description: "Employees, time clock, vacations and absences",
    website: "https://www.sesamehr.es", docs: "https://apidocs.sesametime.com", logo: { favicon: "https://www.sesamehr.es" },
    baseUrl: "https://api-{region}.sesametime.com",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API token", secret: true },
             { id: "region", label: "Data region", default: "eu1", format: "subdomain",
               help: "Shown on Sesame's API tokens page (eu1, eu2… or br1)." }],
    keyUrl: "https://app.sesametime.com/admin/configuration/integrations/api-tokens",
    help: "1) As an admin user, at app.sesametime.com go to “Settings” → “Integrations” → “API” "
      + "(app.sesametime.com/admin/configuration/integrations/api-tokens). 2) Click “Generate token”, give it a name and copy it. "
      + "3) Enter the data region shown on that same page (eu1, eu2…). The token gives access to the data of the whole "
      + "company.",
    test: { path: "/core/v3/info", account: (d) => d.data?.company?.name },
    examples: "Examples: GET /core/v3/employees?status=active&limit=100&page=1, GET /core/v3/employees?email=…, "
      + "GET /core/v3/employees/{id}, GET /schedule/v1/work-entries?employeeId=…&from=2026-10-01&to=2026-10-15 (clock entries), "
      + "POST /schedule/v1/work-entries/clock-in {\"employeeId\": \"…\"} (clock in; /clock-out to clock out), "
      + "GET /schedule/v1/reports/worked-hours?from=2026-10-01&to=2026-10-31, GET /schedule/v1/vacation-day-off-requests?status=pending, "
      + "GET /schedule/v1/check-incidences. Pagination: page and limit (meta.lastPage is the last page).",
    tools: [
      { name: "sesamehr_employees", title: "Sesame HR: employees", annotations: { readOnlyHint: true },
        description: "Lists employees (active by default): id, name, email, code, phone and current presence (online, "
          + "offline, paused or remote). Can search by email.",
        schema: { status: z.enum(["active", "inactive"]).default("active"), email: z.string().optional(),
                   page: z.number().int().min(1).default(1), max: z.number().int().min(1).max(100).default(100) },
        async run({ status: state, email, page, max }, p) {
          const query = { status: state, email, page: page, limit: max };
          const d = ensureOk(await p({ path: "/core/v3/employees", query }), "Sesame HR");
          return { page: d.meta?.currentPage, pages: d.meta?.lastPage, total: d.meta?.total,
                   employees: (d.data || []).map((e) => ({ id: e.id, name: fullName(e.firstName, e.lastName, e.secondLastName),
                     email: e.email, code: e.code, phone: e.phone, presence: e.workStatus })) };
        } },
      { name: "sesamehr_work_entries", title: "Sesame HR: clock entries", annotations: { readOnlyHint: true },
        description: "Work entries (clock-ins and clock-outs) for the whole company or one employee between two dates: employee, type, "
          + "clock-in, clock-out (empty if still open), hours worked and entry source.",
        schema: { from: z.string().describe("YYYY-MM-DD"), to: z.string().describe("YYYY-MM-DD"),
                   employee: z.string().optional().describe("Employee ID (see sesamehr_employees); empty: all"),
                   page: z.number().int().min(1).default(1), max: z.number().int().min(1).max(100).default(100) },
        async run({ from, to, employee, page, max }, p) {
          const d = ensureOk(await p({ path: "/schedule/v1/work-entries",
            query: { from: from, to: to, employeeId: employee, page: page, limit: max } }), "Sesame HR");
          return { page: d.meta?.currentPage, pages: d.meta?.lastPage, total: d.meta?.total,
                   entries: (d.data || []).map((f) => ({ id: f.id, employee: fullName(f.employee?.firstName, f.employee?.lastName),
                     employee_id: f.employee?.id, type: f.workEntryType, clock_in: f.workEntryIn?.date, clock_out: f.workEntryOut?.date || null,
                     hours: f.workedSeconds == null ? null : Math.round(f.workedSeconds / 36) / 100, source: f.workEntryIn?.origin })) };
        } },
    ],
  },
  {
    id: "signaturit", name: "Signaturit", category: "productivity",
    description: "E-signature: requests, signers and signed documents",
    website: "https://www.signaturit.com", docs: "https://docs.signaturit.com/api/latest", logo: { favicon: "https://www.signaturit.com" },
    baseUrl: "https://{environment}/v3",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API access token", secret: true },
             { id: "environment", label: "Environment", default: "api.signaturit.com",
               options: [["api.signaturit.com", "Production"], ["api.sandbox.signaturit.com", "Sandbox (testing)"]] }],
    help: "1) In Signaturit (app.signaturit.com), as an admin user, open “Settings” → “Integrations”. 2) Copy the "
      + "API access token, shown at the top of that tab (API access depends on your plan). 3) For "
      + "testing, create a free sandbox account at account.sandbox.signaturit.com and choose the “Sandbox” environment here: its token is "
      + "different from the production one.",
    test: { path: "/signatures/count.json", message: (d) => `Token is valid (${d?.count ?? 0} signature requests)` },
    examples: "Examples: GET /signatures.json?limit=20&status=completed&since=2026-10-01, GET /signatures/count.json?status=signing, "
      + "GET /signatures/{id}.json, GET /signatures/{id}/documents/{documentId}/download/signed (PDF: better with signaturit_download), "
      + "POST /signatures/{id}/reminder.json (reminder to the signers), PATCH /signatures/{id}/cancel.json, GET /templates.json, "
      + "POST /signatures.json from a template with the “form” parameter {\"templates[0]\": \"#NDA\", \"recipients[0][name]\": \"…\", "
      + "\"recipients[0][email]\": \"…\", \"delivery_type\": \"email\"} (with your own PDF it is multipart, field files[0]).",
    tools: [
      { name: "signaturit_requests", title: "Signaturit: signature requests", annotations: { readOnlyHint: true },
        description: "Lists signature requests with their documents: request id and date and, per document, id, file, signer and "
          + "status (ready, signing, completed, declined, expired…). The ids work with signaturit_download.",
        schema: { status: z.enum(["in_queue", "ready", "signing", "completed", "expired", "canceled", "declined", "error"]).optional(),
                   from: z.string().optional().describe("Created since this date (YYYY-MM-DD)"),
                   to: z.string().optional().describe("Created until this date (YYYY-MM-DD)"),
                   max: z.number().int().min(1).max(100).default(25),
                   skip: z.number().int().min(0).default(0).describe("Results to skip (pagination)") },
        async run({ status: state, from, to, max, skip }, p) {
          const d = ensureOk(await p({ path: "/signatures.json",
            query: { status: state, since: from, until: to, limit: max, offset: skip } }), "Signaturit");
          return (Array.isArray(d) ? d : []).map((s) => ({ id: s.id, created: s.created_at,
            documents: (s.documents || []).map((x) => ({ id: x.id, file: x.file?.name,
              signer: fullName(x.name, x.email && `<${x.email}>`), status: x.status })) }));
        } },
      { name: "signaturit_download", title: "Signaturit: download signed document", annotations: { readOnlyHint: true },
        description: "Downloads the signed document (or its audit report) of a request as a PDF and saves it on the server "
          + "(Conector's downloads folder). Returns the file path.",
        schema: { request: z.string().describe("Signature request ID"),
                   document: z.string().describe("Document ID (see signaturit_requests)"),
                   type: z.enum(["signed", "audit_trail"]).default("signed")
                     .describe("signed: signed document; audit_trail: audit report") },
        async run({ request, document, type }, p) {
          const d = ensureOk(await p({ path: `/signatures/${encodeURIComponent(request)}/documents/${encodeURIComponent(document)}`
            + `/download/${type}`, headers: { Accept: "application/pdf" } }), "Signaturit");
          return savePdf(d, `signaturit_${document}_${type === "signed" ? "signed" : "audit"}.pdf`, "Signaturit");
        } },
    ],
  },
  {
    id: "docusign", name: "DocuSign", category: "productivity",
    description: "E-signature: envelopes, templates, signers and documents",
    website: "https://www.docusign.com", docs: "https://developers.docusign.com/docs/esign-rest-api/reference/",
    logo: { favicon: "https://www.docusign.com" },
    baseUrl: "{base_uri}/restapi/v2.1/accounts/{account_id}",
    auth: { type: "oauth", scopes: ["signature", "extended"], provider: {
      name: "DocuSign", authorizeUrl: "https://{server}/oauth/auth", tokenUrl: "https://{server}/oauth/token", clientAuth: "basic",
      redirect: "localhost", after: docusignAccount,
      help: "1) In DocuSign (to start, in a free developer account at developers.docusign.com) open “Settings” → "
        + "“Apps and Keys” and click “Add App and Integration Key”. 2) Under “Authentication” choose “Authorization Code Grant”, indicate that "
        + "the app can keep a secret, click “Add Secret Key” and copy the secret (it is shown only once). 3) Under “Additional "
        + "settings” → “Redirect URIs” add the redirect URI shown below and save. 4) Copy the “Integration Key” (the "
        + "client ID), choose the environment here and click “Continue with DocuSign”: the user's default account is used. For the real account, the "
        + "app must first pass the “Go-Live” review; then create a new secret in the production account and add the same URI. "
        + "If Conector is not used for more than 30 days, you have to authorize again.",
    } },
    fields: [{ id: "server", label: "Environment", default: "account.docusign.com", options: DOCUSIGN_SERVERS },
             { id: "base_uri", label: "Account server", format: "url", hidden: true },
             { id: "account_id", label: "Account ID", hidden: true }],
    test: { path: "{base_uri}/restapi/v2.1/accounts/{account_id}", account: (d) => d.accountName },
    examples: "Paths relative to the account (…/restapi/v2.1/accounts/{account_id}). Examples: "
      + "GET /envelopes?from_date=2026-10-01&status=sent,delivered,completed&order_by=last_modified&order=desc, "
      + "GET /envelopes/{envelopeId}, GET /envelopes/{envelopeId}/recipients, GET /envelopes/{envelopeId}/documents, "
      + "GET /templates?search_text=…, POST /envelopes {\"templateId\": \"…\", \"templateRoles\": [{\"roleName\": \"Signer\", "
      + "\"name\": \"…\", \"email\": \"…\"}], \"status\": \"sent\"}, POST /envelopes {\"emailSubject\": \"…\", \"documents\": "
      + "[{\"documentBase64\": \"…\", \"name\": \"contract.pdf\", \"fileExtension\": \"pdf\", \"documentId\": \"1\"}], \"recipients\": "
      + "{\"signers\": [{\"email\": \"…\", \"name\": \"…\", \"recipientId\": \"1\"}]}, \"status\": \"sent\"}, "
      + "PUT /envelopes/{envelopeId} {\"status\": \"voided\", \"voidedReason\": \"…\"}, GET /users?email=….",
    tools: [
      { name: "docusign_envelopes", title: "DocuSign: recent envelopes", annotations: { readOnlyHint: true },
        description: "Envelopes (documents sent for signature) with changes since a date, from newest to oldest: id, subject, status (sent, "
          + "delivered, completed, declined, voided…), sender and the dates sent, fully signed and last changed.",
        schema: { from: z.string().optional().describe("YYYY-MM-DD (default: 30 days ago)"),
                   status: z.string().optional()
                     .describe("One or more separated by commas: created, sent, delivered, completed, declined, voided"),
                   text: z.string().optional().describe("Searches the subject, sender and recipients"),
                   max: z.number().int().min(1).max(100).default(25) },
        async run({ from, status: state, text, max }, p) {
          const d = ensureOk(await p({ path: "/envelopes", query: { from_date: from || daysAgo(30), status: state, search_text: text,
            count: max, order_by: "last_modified", order: "desc" } }), "DocuSign");
          return { total: Number(d.totalSetSize || 0), envelopes: (d.envelopes || []).map((s) => ({ id: s.envelopeId, subject: s.emailSubject,
            status: s.status, sender: s.sender?.email, sent: s.sentDateTime, completed: s.completedDateTime,
            last_change: s.statusChangedDateTime })) };
        } },
      { name: "docusign_download", title: "DocuSign: download an envelope's documents", annotations: { readOnlyHint: true },
        description: "Downloads the documents of an envelope as a PDF (all combined), its certificate of completion or a specific "
          + "document, and saves it on the server (Conector's downloads folder). Returns the file path.",
        schema: { envelope: z.string().describe("Envelope ID (envelopeId)"),
                   document: z.string().default("combined")
                     .describe("combined (all in one PDF), certificate (certificate) or the documentId") },
        async run({ envelope, document }, p) {
          const d = ensureOk(await p({ path: `/envelopes/${encodeURIComponent(envelope)}/documents/${encodeURIComponent(document)}`,
            headers: { Accept: "application/pdf" } }), "DocuSign");
          return savePdf(d, `docusign_${envelope}_${document}.pdf`, "DocuSign");
        } },
    ],
  },
  {
    id: "box", name: "Box", category: "productivity", description: "Files, folders, search, collaborations and shared links",
    website: "https://www.box.com", docs: "https://developer.box.com/reference/", logo: { simpleIcons: "box" },
    baseUrl: "https://api.box.com/2.0", allowedOrigins: ["https://upload.box.com"],
    auth: { type: "client_credentials", url: "https://api.box.com/oauth2/token", credentialsIn: "body",
            params: { grant_type: "client_credentials", box_subject_type: "{kind}", box_subject_id: "{subject}" } },
    fields: [{ id: "client_id", label: "Client ID" },
             { id: "client_secret", label: "Client secret", secret: true },
             { id: "kind", label: "Act as", default: "enterprise",
               options: [["enterprise", "The app's service account"], ["user", "A specific user"]] },
             { id: "subject", label: "Enterprise ID (or user ID)",
               help: "Enterprise ID: under “General Settings” in the app or in Admin Console → “Account & Billing”. User ID: Admin "
                 + "Console → “Users and Groups”." }],
    // “Continue with Box”: user authentication app (OAuth 2.0); the permissions are set in the app, not in the request.
    oauth: { scopes: [], provider: { name: "Box", key: "box", redirect: "localhost",
      authorizeUrl: "https://account.box.com/api/oauth2/authorize", tokenUrl: "https://api.box.com/oauth2/token",
      help: "1) In the Box Developer Console (app.box.com/developers/console) click “Create Platform App” → “Custom App” and choose "
        + "the “User Authentication (OAuth 2.0)” authentication; name it “Conector”. 2) In “Configuration” paste the redirect URI shown below "
        + "into “OAuth 2.0 Redirect URIs”, select “Read all files and folders stored in Box” and “Write all files and folders "
        + "stored in Box” under “Application Scopes” and save. 3) Copy the “Client ID” and the “Client Secret” (Box "
        + "asks for two-step verification). If your Box admin restricts custom apps, they must authorize it first in "
        + "Admin Console → “Integrations” → “Platform Apps Manager”." } },
    keyUrl: "https://app.box.com/developers/console",
    help: "1) In the Box Developer Console (app.box.com/developers/console) click “Create Platform App” → “Custom App” with the "
      + "“Server Authentication (Client Credentials Grant)” authentication. 2) In “Configuration” choose the access (“App Access Only” or "
      + "“App + Enterprise Access”), select the permissions (e.g. read and write all files and folders) and copy the Client ID and the "
      + "Client secret (two-step verification is required). 3) In “Authorization” click “Review and Submit”: a Box admin must "
      + "authorize it in Admin Console → “Integrations” → “Platform Apps Manager”. 4) Choose here how to act: as the app's service account "
      + "(with the Enterprise ID) or as a specific user (their ID; requires enabling “Generate user access tokens” in “Advanced "
      + "Features”). The service account only sees what is shared with it.",
    test: { path: "/users/me", account: (d) => d.login || d.name },
    examples: "Examples: GET /folders/0/items?limit=100&fields=name,size,modified_at (0 = root folder), "
      + "GET /search?query=…&type=file&file_extensions=pdf, GET /files/{id}, GET /files/{id}/content (better with box_download), "
      + "POST /folders {\"name\": \"…\", \"parent\": {\"id\": \"0\"}}, PUT /files/{id}?fields=shared_link {\"shared_link\": {\"access\": "
      + "\"company\"}} (shared link), POST /collaborations {\"item\": {\"type\": \"folder\", \"id\": \"…\"}, \"accessible_by\": "
      + "{\"type\": \"user\", \"login\": \"…\"}, \"role\": \"editor\"}, upload: POST https://upload.box.com/api/2.0/files/content "
      + "(multipart with attributes and file). To act as another user, use the As-User: {id} header.",
    tools: [
      { name: "box_search", title: "Box: search files and folders", annotations: { readOnlyHint: true },
        description: "Searches by name and content among the accessible files and folders. Returns id, type, name, size, modification "
          + "date and path.",
        schema: { query: z.string().min(1), type: z.enum(["file", "folder"]).optional(),
                   extensions: z.string().optional().describe("Comma-separated, e.g. pdf,docx"),
                   folder: z.string().optional().describe("ID of the folder to search in (includes subfolders)"),
                   max: z.number().int().min(1).max(200).default(25) },
        async run({ query, type, extensions, folder, max }, p) {
          const d = ensureOk(await p({ path: "/search", query: { query: query, type: type, file_extensions: extensions,
            ancestor_folder_ids: folder, limit: max, fields: "id,type,name,size,modified_at,path_collection" } }), "Box");
          return { total: d.total_count, results: (d.entries || []).map((e) => ({ id: e.id, type: e.type, name: e.name, size: e.size,
            modified: e.modified_at, path: (e.path_collection?.entries || []).map((x) => x.name).join("/") })) };
        } },
      { name: "box_download", title: "Box: download a file", annotations: { readOnlyHint: true },
        description: "Downloads a file from Box (up to 200 MB) and saves it on the server (Conector's downloads folder). Returns the "
          + "path and size.",
        schema: { file: z.string().describe("File ID (see box_search)") },
        async run({ file }, p) {
          const filePath = `/files/${encodeURIComponent(file)}`;
          const info = ensureOk(await p({ path: filePath, query: { fields: "name,size" } }), "Box");
          if (info.size > 200 * 1024 * 1024) throw new Error("Box: the file exceeds 200 MB");
          const d = ensureOk(await p({ path: `${filePath}/content`, headers: { Accept: "*/*" } }), "Box");
          // Text or JSON files arrive already decoded, not as base64.
          const text = typeof d === "string" ? d : JSON.stringify(d ?? "");
          return saveDownload(info.name || `box_${file}`, d?.base64 ? Buffer.from(d.base64, "base64") : Buffer.from(text, "utf8"));
        } },
    ],
  },
  {
    id: "calcom", name: "Cal.com", category: "productivity", description: "Bookings, event types, availability and schedules",
    website: "https://cal.com", docs: "https://cal.com/docs/api-reference/v2/introduction", logo: { favicon: "https://cal.com" },
    baseUrl: "https://{server}/v2",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key (cal_live_…)", secret: true },
             { id: "server", label: "Account region", default: "api.cal.com",
               options: [["api.cal.com", "Global (app.cal.com)"], ["api.cal.eu", "European Union (app.cal.eu)"]] }],
    keyUrl: "https://app.cal.com/settings/developer/api-keys",
    help: "1) In Cal.com open “Settings” → “Developer” → “API Keys”. 2) Click “New”, give it a name and an expiry (or mark it as "
      + "never expiring) and save it. 3) Copy the key (cal_live_…): it is shown only once and has your user's permissions. If you sign in "
      + "at app.cal.eu, choose the “European Union” region here.",
    test: { path: "/me", account: (d) => d.data?.email || d.data?.username },
    examples: "Each group of routes requires its own cal-api-version header (pass it in “headers”): "
      + `GET /bookings?status=upcoming&limit=20 (${CAL.bookings}; pagination with cursor=pagination.nextCursor), `
      + "POST /bookings {\"start\": \"2026-10-20T09:00:00Z\", \"eventTypeId\": …, \"attendee\": {\"name\": \"…\", \"email\": \"…\", "
      + `"timeZone": "America/New_York"}} and POST /bookings/{uid}/cancel {"cancellationReason": "…"} (${CAL.create}), `
      + `GET /event-types (${CAL.types}), GET /slots?eventTypeId=…&start=2026-10-20&end=2026-10-24&timeZone=America/New_York (${CAL.slots}), `
      + `GET /schedules (${CAL.schedules}), GET /me.`,
    tools: [
      { name: "calcom_bookings", title: "Cal.com: bookings", annotations: { readOnlyHint: true },
        description: "Upcoming (default), past, cancelled or unconfirmed bookings: uid, title, status, start, end, event "
          + "type, attendees and meeting link.",
        schema: { status: z.enum(["upcoming", "past", "cancelled", "unconfirmed", "recurring"]).default("upcoming"),
                   email: z.string().optional().describe("Only this attendee's bookings"),
                   from: z.string().optional().describe("Starting after this date (YYYY-MM-DD or ISO 8601)"),
                   to: z.string().optional().describe("Ending before this date"),
                   max: z.number().int().min(1).max(100).default(20),
                   cursor: z.string().optional().describe("The “next” value from the previous call") },
        async run({ status: state, email, from, to, max, cursor }, p) {
          const d = ensureOk(await p({ path: "/bookings", headers: { "cal-api-version": CAL.bookings }, query: { status: state,
            attendeeEmail: email, afterStart: from, beforeEnd: to, limit: max, cursor,
            sortStart: state === "upcoming" ? "asc" : "desc" } }), "Cal.com");
          return { next: d.pagination?.nextCursor || null, bookings: (d.data || []).map((b) => ({ uid: b.uid, title: b.title,
            status: b.status, start: b.start, end: b.end, type: b.eventType?.slug, link: b.meetingUrl || b.location,
            attendees: (b.attendees || []).map((a) => fullName(a.name, a.email && `<${a.email}>`)) })) };
        } },
      { name: "calcom_slots", title: "Cal.com: free slots", annotations: { readOnlyHint: true },
        description: "Available times to book an event type between two dates, grouped by day, in the given time zone.",
        schema: { event_type: z.number().int().describe("Event type ID (GET /event-types)"),
                   from: z.string().describe("YYYY-MM-DD"), to: z.string().describe("YYYY-MM-DD (inclusive)"),
                   timezone: z.string().default("UTC"),
                   duration: z.number().int().min(5).optional().describe("Minutes, only if the event supports several durations") },
        async run({ event_type, from, to, timezone, duration }, p) {
          const d = ensureOk(await p({ path: "/slots", headers: { "cal-api-version": CAL.slots },
            query: { eventTypeId: event_type, start: from, end: to, timeZone: timezone, duration: duration } }), "Cal.com");
          return Object.fromEntries(Object.entries(d.data || {}).map(([day, slots]) => [day,
            (slots || []).map((h) => String(h.start || h).slice(11, 16))]));
        } },
    ],
  },
  {
    id: "harvest", name: "Harvest", category: "productivity", description: "Hours, projects, clients, expenses and invoices",
    website: "https://www.getharvest.com", docs: "https://help.getharvest.com/api-v2/", logo: { favicon: "https://www.getharvest.com" },
    baseUrl: "https://api.harvestapp.com/v2",
    headers: (c) => ({ "Harvest-Account-Id": String(c.account || "").replace(/\D/g, "") }),
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "Personal access token", secret: true },
             { id: "account", label: "Account ID", help: "Harvest account number; it appears next to the token." }],
    // With OAuth the “Account ID” is looked up when authorizing (harvestAccount); access tokens last 14 days and are renewed.
    oauth: { scopes: [], provider: { name: "Harvest", key: "harvest", redirect: "localhost",
      authorizeUrl: "https://id.getharvest.com/oauth2/authorize", tokenUrl: "https://id.getharvest.com/api/v2/oauth2/token",
      after: harvestAccount,
      help: "1) Sign in at id.getharvest.com/developers with your Harvest user, open “OAuth2 Applications” and click “Create new "
        + "OAuth2 Application”. 2) Name it “Conector”, choose the “Harvest” product, paste the redirect URI shown below into “Redirect URL” "
        + "and click “Create Application”. 3) Copy the “Client ID” and the “Client Secret”. When connecting, your Harvest account is "
        + "used (if you have several, the first one, unless you had already given its Account ID with a personal token)." } },
    keyUrl: "https://id.getharvest.com/developers",
    help: "1) Sign in at id.getharvest.com/developers with your Harvest user. 2) Click “Create new personal access token”, give it a "
      + "name and create it. 3) Copy the token and, from the “Choose account” dropdown on that page, the “Account ID” of your Harvest account. "
      + "The token has your user's permissions: an admin sees the hours of the whole team.",
    test: { path: "/users/me", account: (d) => d.email || fullName(d.first_name, d.last_name) },
    examples: "Examples: GET /time_entries?from=2026-10-01&to=2026-10-15&user_id=…, GET /users/me/project_assignments (projects and "
      + "tasks you can log time to), POST /time_entries {\"project_id\": …, \"task_id\": …, \"spent_date\": \"2026-10-15\", "
      + "\"hours\": 2.5, \"notes\": \"…\"}, PATCH /time_entries/{id}, GET /projects?is_active=true, GET /clients, "
      + "GET /invoices?state=open, GET /expenses?from=2026-10-01, GET /reports/time/projects?from=20261001&to=20261031. "
      + "Pagination: page and per_page (max. 2000); check next_page in the response.",
    tools: [
      { name: "harvest_hours", title: "Harvest: logged hours", annotations: { readOnlyHint: true },
        description: "Hours logged between two dates (for everyone or for one user, client or project): date, hours, person, client, "
          + "project, task, notes and whether it is billable or already billed, with the total hours of what is returned.",
        schema: { from: z.string().describe("YYYY-MM-DD"), to: z.string().describe("YYYY-MM-DD"),
                   user: z.number().int().optional().describe("User ID (empty: all the users the token can see)"),
                   client: z.number().int().optional(), project: z.number().int().optional(),
                   max: z.number().int().min(1).max(2000).default(200) },
        async run({ from, to, user, client, project, max }, p) {
          const d = ensureOk(await p({ path: "/time_entries", query: { from: from, to: to, user_id: user, client_id: client,
            project_id: project, per_page: max } }), "Harvest");
          const entries = (d.time_entries || []).map((t) => ({ id: t.id, date: t.spent_date, hours: t.hours, person: t.user?.name,
            client: t.client?.name, project: t.project?.name, task: t.task?.name, notes: t.notes || undefined, billable: t.billable,
            billed: t.is_billed }));
          return { hours: Math.round(entries.reduce((s, t) => s + (t.hours || 0), 0) * 100) / 100, records: d.total_entries,
                   has_more: Boolean(d.next_page), entries };
        } },
    ],
  },
  {
    id: "webex", name: "Webex", category: "communication", description: "Webex messages, spaces, people and meetings",
    website: "https://www.webex.com", docs: "https://developer.webex.com/docs", logo: { simpleIcons: "webex" },
    baseUrl: "https://webexapis.com/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "Bot access token", secret: true }],
    // Webex integration (OAuth 2.0): acts as the user who authorizes; the access token lasts 14 days and the refresh token 90.
    oauth: { scopes: ["spark:all", "meeting:schedules_read", "meeting:schedules_write"],
      provider: { name: "Webex", key: "webex", redirect: "localhost",
        authorizeUrl: "https://webexapis.com/v1/authorize", tokenUrl: "https://webexapis.com/v1/access_token",
        help: "1) Sign in at developer.webex.com with your Webex account, open “My Webex Apps” → “Create a New App” and choose “Create an "
          + "Integration”. 2) Name it “Conector”, add a description and a contact email; in “Redirect URI(s)” paste the "
          + "redirect URI shown below and select the permissions (scopes) listed below. 3) Click “Add Integration” and copy "
          + "the “Client ID” and the “Client Secret” (the secret is shown only once). It acts as the user who authorizes, so "
          + "meetings (GET /meetings) also work, which they do not with a bot." } },
    keyUrl: "https://developer.webex.com/my-apps/new/bot",
    help: "1) Sign in at developer.webex.com and open “My Webex Apps” → “Create a New App” → “Create a Bot”. 2) Give it a name, a "
      + "username and an icon and click “Add Bot”. 3) Copy the “Bot Access Token”: it does not expire (if you lose it, you have to regenerate it). The bot "
      + "only sees the spaces you add it to (in group spaces, only the messages that mention it) and can message anyone "
      + "by email. The personal token from the developer website also works, but it expires after 12 hours.",
    test: { path: "/people/me", account: (d) => d.displayName || d.emails?.[0] },
    examples: "Examples: GET /rooms?sortBy=lastactivity&max=20, GET /messages?roomId=…&max=50, POST /messages {\"roomId\": \"…\" "
      + "(or \"toPersonEmail\": \"…\"), \"markdown\": \"…\"} (with \"parentId\" it replies in a thread), GET /memberships?roomId=…, "
      + "POST /memberships {\"roomId\": \"…\", \"personEmail\": \"…\"}, GET /people?email=…, GET /rooms/{id}/meetingInfo. "
      + "Meetings (GET /meetings) need a user token, not a bot token.",
    tools: [
      { name: "webex_send_message", title: "Webex: send a message", annotations: { openWorldHint: true },
        description: "Sends a message (Markdown) to a Webex space or, privately, to a person by email. "
          + "Returns the message id.",
        schema: { to: z.string().describe("Space ID (roomId, see GET /rooms) or the person's email"),
                   message: z.string().min(1).describe("Markdown text"),
                   reply_to: z.string().optional().describe("ID of the message being replied to, to answer in its thread") },
        async run({ to, message, reply_to }, p) {
          const recipient = to.includes("@") ? { toPersonEmail: to.trim() } : { roomId: to.trim() };
          const d = ensureOk(await p({ method: "POST", path: "/messages", body: { ...recipient, markdown: message, parentId: reply_to } }), "Webex");
          return { sent: true, id: d.id, space: d.roomId, date: d.created };
        } },
    ],
  },
  {
    id: "front", name: "Front", category: "support", description: "Shared inboxes: conversations, contacts, tags and notes",
    website: "https://front.com", docs: "https://dev.frontapp.com/reference/introduction", logo: { favicon: "https://front.com" },
    baseUrl: "https://api2.frontapp.com",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API token", secret: true }],
    // Private company app in Front (OAuth 2.0): permissions are chosen in the app; access tokens last 1 hour and are renewed.
    oauth: { scopes: [], provider: { name: "Front", key: "front", redirect: "localhost", clientAuth: "basic",
      authorizeUrl: "https://app.frontapp.com/oauth/authorize", tokenUrl: "https://app.frontapp.com/oauth/token",
      help: "1) As an admin, in Front open “Settings” → “Company” → “Developers” and click “Create app”: name it “Conector” "
        + "and add a short description. 2) In the “Features” tab click “Add feature” → “OAuth” → “Enable OAuth”, copy the "
        + "“Client ID” and the “Client secret” and click “Add Redirect URL” to paste the redirect URI shown below. 3) Choose the "
        + "resources and permissions it will have: “Shared resources” (and “Private resources”, if needed) with read, write and send. "
        + "The app is private to your company and whoever authorizes it when connecting must be an admin." } },
    help: "1) As an admin, in Front open “Settings” → “Company” → “Developers” → “API tokens” tab. 2) Click “Create API "
      + "token”, give it a name and choose the scope: “Shared resources” (shared inboxes) and, if needed, “Private resources”. "
      + "3) Copy the token. Actions are taken on behalf of the company; to reply you must specify the teammate who signs (author_id).",
    test: { path: "/me", account: (d) => d.name },
    examples: "Examples: GET /conversations/search/{encoded query} (e.g. is:open tag:\"urgent\"), GET /conversations/{id}, "
      + "GET /conversations/{id}/messages, POST /conversations/{id}/comments {\"body\": \"…\"} (internal note), "
      + "POST /conversations/{id}/messages {\"body\": \"…\", \"author_id\": \"tea_…\"} (reply), PATCH /conversations/{id} "
      + "{\"status\": \"archived\"}, PUT /conversations/{id}/assignee {\"assignee_id\": \"tea_…\"}, GET /inboxes, GET /teammates, "
      + "GET /contacts/alt:email:{email}, GET /tags. Pagination: follow _pagination.next.",
    tools: [
      { name: "front_search", title: "Front: search conversations", annotations: { readOnlyHint: true },
        description: "Searches conversations with Front's syntax: free text and filters such as is:open, is:unassigned, tag:\"…\", "
          + "from:email, inbox:inb_… or after:<Unix date>. Returns id, subject, status, assignee, contact, tags and date.",
        schema: { query: z.string().min(1).describe("e.g. invoice is:open, or from:customer@example.com is:unassigned"),
                   max: z.number().int().min(1).max(100).default(25) },
        async run({ query, max }, p) {
          const d = ensureOk(await p({ path: `/conversations/search/${encodeURIComponent(query)}`, query: { limit: max } }), "Front");
          return { total: d._total, conversations: (d._results || []).map((c) => ({ id: c.id, subject: c.subject, status: c.status,
            assignee: c.assignee?.email || null, contact: c.recipient?.handle, tags: (c.tags || []).map((t) => t.name),
            created: c.created_at ? new Date(c.created_at * 1000).toISOString() : undefined })) };
        } },
    ],
  },
  {
    id: "bamboohr", name: "BambooHR", category: "hr", description: "Employees, directory, absences, time off and reports",
    website: "https://www.bamboohr.com", docs: "https://documentation.bamboohr.com/docs/getting-started",
    logo: { favicon: "https://www.bamboohr.com" },
    baseUrl: "https://{company}.bamboohr.com/api/v1",
    auth: { type: "basic", usernameField: "token", fixedPassword: "x" },
    fields: [{ id: "company", label: "Your company's BambooHR domain", format: "subdomain",
               help: "If you sign in at https://example.bamboohr.com, enter “example”." },
             { id: "token", label: "API key", secret: true }],
    // BambooHR OAuth 2.0: sign-in and the token are on the company's domain and the API accepts the “Bearer” token at
    // the same address as the key. Without offline_access there is no refresh token (access lasts 1 hour).
    oauth: { scopes: ["openid", "offline_access", "employee", "employee.write", "employee_directory", "time_off", "time_off.write",
                        "report", "company:info"],
      fields: ["company"], test: { path: "/employees/directory", account: (_, c) => `${c.company}.bamboohr.com` },
      provider: { name: "BambooHR", key: "bamboohr", redirect: "localhost", json: true,
        authorizeUrl: "https://{company}.bamboohr.com/authorize.php?request=authorize",
        tokenUrl: "https://{company}.bamboohr.com/token.php?request=token",
        help: "1) Create a free account at developers.bamboohr.com, open “Applications” and click “Add application”. 2) Name it "
          + "“Conector”. In “App details” paste the redirect URI shown below into “Redirect URI” and save; in "
          + "“Application Scopes” select the permissions (scopes) listed below (the exact names appear in that portal list; "
          + "openid and offline_access are required). 3) In “App Credentials” copy the “Client ID” and the “Client Secret”. "
          + "4) Enter your company's BambooHR domain here and click “Continue with BambooHR”: the application acts with the permissions of the user "
          + "who authorizes." } },
    help: "1) In BambooHR click your name (bottom left) and choose “API Keys” (it only appears if your access level allows it). "
      + "2) Click “Add New Key”, give it a name and copy it: it is shown only once. It has the same permissions as your user, so, "
      + "if you will only be reading data, it is better to create it with a limited-access user.",
    test: { path: "/employees/0", query: { fields: "firstName,lastName,workEmail" },
              account: (d) => d.workEmail || fullName(d.firstName, d.lastName) },
    examples: "Examples: GET /employees/directory, GET /employees/{id}?fields=firstName,lastName,jobTitle,department,hireDate,supervisor "
      + "(0 = your own employee), GET /time_off/whos_out?start=2026-10-15&end=2026-10-31, "
      + "GET /time_off/requests?start=2026-10-01&end=2026-12-31&status=requested, GET /meta/fields, GET /meta/lists, "
      + "POST /reports/custom?format=JSON {\"fields\": [\"firstName\", \"lastName\", \"hireDate\"]}, GET /employees/{id}/tables/jobInfo, "
      + "POST /employees/{id} {\"mobilePhone\": \"…\"} (update).",
    tools: [
      { name: "bamboohr_directory", title: "BambooHR: employee directory", annotations: { readOnlyHint: true },
        description: "Company directory: id, name, job title, department, division, location, work email and phone, and "
          + "supervisor. Can be filtered by text.",
        schema: { filter: z.string().optional().describe("Text that must appear in the name, job title, department or email") },
        async run({ filter }, p) {
          const d = ensureOk(await p({ path: "/employees/directory" }), "BambooHR");
          const text = (filter || "").toLowerCase();
          const matches = (e) => !text
            || [e.name, e.job_title, e.department, e.email].some((v) => String(v || "").toLowerCase().includes(text));
          return (d.employees || []).map((e) => ({ id: e.id, name: e.displayName, job_title: e.jobTitle, department: e.department,
            division: e.division, location: e.location, email: e.workEmail, phone: e.workPhone || e.mobilePhone,
            supervisor: e.supervisor })).filter(matches);
        } },
      { name: "bamboohr_absences", title: "BambooHR: who is out", annotations: { readOnlyHint: true },
        description: "Approved absences and company holidays between two dates (default: the next 14 days): name, type, "
          + "start and end.",
        schema: { from: z.string().optional().describe("YYYY-MM-DD (default: today)"),
                   to: z.string().optional().describe("YYYY-MM-DD (default: in 14 days)") },
        async run({ from, to }, p) {
          const query = { start: from || daysAgo(0), end: to || daysAgo(-14) };
          const d = ensureOk(await p({ path: "/time_off/whos_out", query }), "BambooHR");
          return (Array.isArray(d) ? d : []).map((x) => ({ name: x.name, type: x.type === "holiday" ? "holiday" : "absence",
            employee_id: x.employeeId, start: x.start, end: x.end }));
        } },
    ],
  },
  {
    id: "gocardless", name: "GoCardless", category: "finance",
    description: "Direct debits: customers, mandates, payments and subscriptions",
    website: "https://gocardless.com", docs: "https://docs.gocardless.com/docs/api-reference", logo: { favicon: "https://gocardless.com" },
    baseUrl: "https://{environment}", headers: { "GoCardless-Version": "2015-07-06" },
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "Access token", secret: true },
             { id: "environment", label: "Environment", default: "api.gocardless.com",
               options: [["api.gocardless.com", "Live"], ["api-sandbox.gocardless.com", "Sandbox (testing)"]] }],
    keyUrl: "https://manage.gocardless.com/developers",
    help: "1) In the GoCardless dashboard (manage.gocardless.com, or manage-sandbox.gocardless.com for testing) go to “Developers” → "
      + "“Create” → “Access token”. 2) Give it a name, choose “Read-only” or “Read-write” and create it. 3) Copy it: it is shown only once. "
      + "Choose here the same environment you created it in.",
    test: { path: "/creditors", query: { limit: 1 }, account: (d) => d.creditors?.[0]?.name },
    examples: "Amounts in cents. Examples: GET /payments?status=confirmed&created_at[gte]=2026-10-01T00:00:00Z&limit=50, "
      + "GET /payments/{id}, GET /customers?email=…, GET /mandates?customer=CU…&status=active, POST /payments {\"payments\": "
      + "{\"amount\": 1500, \"currency\": \"EUR\", \"description\": \"…\", \"links\": {\"mandate\": \"MD…\"}}} (with the "
      + "Idempotency-Key header), POST /payments/{id}/actions/cancel, GET /subscriptions?mandate=MD…, GET /payouts?limit=20, "
      + "GET /events?resource_type=payments&limit=50. Pagination: after=meta.cursors.after.",
    tools: [
      { name: "gocardless_payments", title: "GoCardless: payments", annotations: { readOnlyHint: true },
        description: "Direct debit payments: id, amount, currency, status, charge date, description, reference, mandate and "
          + "subscription. Filters by status, customer and creation date.",
        schema: { status: z.enum(["pending_customer_approval", "pending_submission", "submitted", "confirmed", "paid_out", "cancelled",
                     "customer_approval_denied", "failed", "charged_back"]).optional(),
                   from: z.string().optional().describe("Created since this date (YYYY-MM-DD)"),
                   customer: z.string().optional().describe("Customer ID (CU…)"),
                   max: z.number().int().min(1).max(500).default(50),
                   cursor: z.string().optional().describe("The “next” value from the previous call") },
        async run({ status: state, from, customer, max, cursor }, p) {
          const d = ensureOk(await p({ path: "/payments", query: { status: state, customer: customer, limit: max, after: cursor,
            "created_at[gte]": isoDay(from) } }), "GoCardless");
          return { next: d.meta?.cursors?.after || null, payments: (d.payments || []).map((x) => ({ id: x.id, amount: x.amount / 100,
            currency: x.currency, status: x.status, charge_date: x.charge_date, description: x.description, reference: x.reference,
            mandate: x.links?.mandate, subscription: x.links?.subscription })) };
        } },
    ],
  },
  {
    id: "mollie", name: "Mollie", category: "finance",
    description: "Online payments, refunds, payment links, customers and subscriptions",
    website: "https://www.mollie.com", docs: "https://docs.mollie.com/reference/overview", logo: { favicon: "https://www.mollie.com" },
    baseUrl: "https://api.mollie.com/v2",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key (live_… or test_…)", secret: true, example: `test_${"x".repeat(30)}` }],
    keyUrl: "https://my.mollie.com/dashboard/developers/api-keys",
    help: "1) In the Mollie dashboard (my.mollie.com) open “Developers” → “API keys”. 2) Choose the website or "
      + "store profile and copy the “Live API key” (live_…) or, for testing, the “Test API key” (test_…). Each key gives full access to the payments "
      + "of that profile. Organization settlements and balances are not available with these keys.",
    test: { path: "/profiles/me", account: (d) => d.name },
    examples: "Amounts as text with two decimals. Examples: GET /payments?limit=25, GET /payments/{id}, POST /payments {\"amount\": "
      + "{\"currency\": \"EUR\", \"value\": \"10.00\"}, \"description\": \"…\", \"redirectUrl\": \"https://…\"}, POST /payment-links "
      + "{\"amount\": {\"currency\": \"EUR\", \"value\": \"25.00\"}, \"description\": \"…\"}, POST /payments/{id}/refunds {\"amount\": "
      + "{…}}, GET /refunds, GET /customers, GET /customers/{id}/subscriptions, GET /methods. Pagination: from with the id from "
      + "_links.next.",
    tools: [
      { name: "mollie_payments", title: "Mollie: recent payments", annotations: { readOnlyHint: true },
        description: "Payments from newest to oldest: id, status, amount, description, method, creation and payment dates and "
          + "refunded amount.",
        schema: { max: z.number().int().min(1).max(250).default(25),
                   from: z.string().optional().describe("The “next” value from the previous call (tr_… id)") },
        async run({ max, from }, p) {
          const d = ensureOk(await p({ path: "/payments", query: { limit: max, from: from } }), "Mollie");
          const next = d._links?.next?.href ? new URL(d._links.next.href).searchParams.get("from") : null;
          const money = (a) => (a ? `${a.value} ${a.currency}` : undefined);
          return { next, payments: (d._embedded?.payments || []).map((x) => ({ id: x.id, status: x.status, amount: money(x.amount),
            description: x.description, method: x.method, created: x.createdAt, paid: x.paidAt,
            refunded: Number(x.amountRefunded?.value) ? money(x.amountRefunded) : undefined })) };
        } },
    ],
  },
  {
    id: "square", name: "Square", category: "finance", description: "Payments, orders, customers, catalog and inventory for your business",
    website: "https://squareup.com", docs: "https://developer.squareup.com/reference/square", logo: { simpleIcons: "square" },
    baseUrl: "https://{environment}/v2", headers: { "Square-Version": SQUARE_VERSION },
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "Access token", secret: true },
             { id: "environment", label: "Environment", default: "connect.squareup.com",
               options: [["connect.squareup.com", "Production"], ["connect.squareupsandbox.com", "Sandbox (testing)"]] }],
    // “Continue with Square” only works for production (the Sandbox has its own application and access token).
    oauth: { scopes: ["MERCHANT_PROFILE_READ", "PAYMENTS_READ", "PAYMENTS_WRITE", "ORDERS_READ", "ORDERS_WRITE", "CUSTOMERS_READ",
                        "CUSTOMERS_WRITE", "ITEMS_READ", "ITEMS_WRITE", "INVENTORY_READ", "INVOICES_READ"],
      baseUrl: "https://connect.squareup.com/v2", provider: SQUARE },
    keyUrl: "https://developer.squareup.com/apps",
    help: "1) At developer.squareup.com/apps sign in with your Square account and create an application (or open one). 2) In "
      + "“Credentials” choose “Production” at the top (or “Sandbox” for testing) and copy the “Access token”. 3) Choose the same environment here. "
      + "That token has full access to the business account: keep it safe.",
    test: { path: "/locations", account: (d) => d.locations?.[0]?.business_name || d.locations?.[0]?.name },
    examples: "Amounts in cents (amount_money.amount). Examples: GET /locations, "
      + "GET /payments?begin_time=2026-10-01T00:00:00Z&limit=50, GET /payments/{id}, POST /orders/search {\"location_ids\": [\"…\"], "
      + "\"query\": {\"filter\": {\"state_filter\": {\"states\": [\"COMPLETED\"]}}}}, "
      + "POST /customers/search {\"query\": {\"filter\": {\"email_address\": {\"exact\": \"…\"}}}}, "
      + "GET /catalog/list?types=ITEM, POST /inventory/counts/batch-retrieve {\"location_ids\": [\"…\"]}, POST /refunds "
      + "{\"idempotency_key\": \"…\", \"payment_id\": \"…\", \"amount_money\": {\"amount\": 500, \"currency\": \"EUR\"}}, "
      + "GET /invoices?location_id=…. Pagination: cursor.",
    tools: [
      { name: "square_payments", title: "Square: payments", annotations: { readOnlyHint: true },
        description: "Payments from newest to oldest: id, date, amount, status, source (card, cash…), card brand, "
          + "location, order, note and receipt.",
        schema: { from: z.string().optional().describe("YYYY-MM-DD or ISO 8601 (default: last year)"),
                   to: z.string().optional().describe("YYYY-MM-DD or ISO 8601"),
                   location: z.string().optional().describe("Location ID (GET /locations)"),
                   max: z.number().int().min(1).max(100).default(50),
                   cursor: z.string().optional().describe("The “next” value from the previous call") },
        async run({ from, to, location, max, cursor }, p) {
          const query = { begin_time: isoDay(from), end_time: isoDay(to, true), location_id: location, limit: max, cursor,
                          sort_order: "DESC" };
          const d = ensureOk(await p({ path: "/payments", query }), "Square");
          return { next: d.cursor || null, payments: (d.payments || []).map((x) => ({ id: x.id, date: x.created_at,
            amount: x.amount_money ? x.amount_money.amount / 100 : null, currency: x.amount_money?.currency, status: x.status,
            source: x.source_type, card: x.card_details?.card?.card_brand, location: x.location_id, order: x.order_id, note: x.note,
            receipt: x.receipt_url })) };
        } },
    ],
  },
  {
    id: "sumup", name: "SumUp", category: "finance", description: "Card reader and online payments, transactions and refunds",
    website: "https://www.sumup.com", docs: "https://developer.sumup.com/api", logo: { simpleIcons: "sumup" },
    baseUrl: "https://api.sumup.com",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "Secret API key (sup_sk_…)", secret: true }],
    // SumUp OAuth 2.0: these scopes are read-only; the payments scopes are verified separately by SumUp.
    oauth: { scopes: ["transactions.history", "user.profile_readonly"], provider: { name: "SumUp", key: "sumup",
      redirect: "localhost", authorizeUrl: "https://api.sumup.com/authorize", tokenUrl: "https://api.sumup.com/token",
      help: "1) Sign in at me.sumup.com/settings/oauth2-applications with your merchant account and click “Create application”. 2) Name "
        + "it “Conector”, type “Web”, a website (e.g. https://www.example.com), select the permissions (scopes) listed "
        + "below and paste the redirect URI shown below into “Authorized redirect URL”. 3) Open the application, click “Create "
        + "client secret”, save and copy the “Client ID” and the “Client secret” (the secret is shown only once). These permissions "
        + "only allow reading the account and the transaction history; to create payments or refunds you must use the API key, because "
        + "the “payments” scope is verified separately by SumUp." } },
    keyUrl: "https://me.sumup.com/settings/api-keys",
    help: "1) Sign in at me.sumup.com, expand your profile and open “Settings”. 2) Go to “For Developers” → “Toolkit” → “API Keys” "
      + "and click “Create”; give it a name. 3) Copy or download the key (sup_sk_…): SumUp does not store it. Do not use the public key "
      + "(sup_pk_…). The key gives full access to the merchant account.",
    test: { path: "/v0.1/me", account: (d) => d.merchant_profile?.company_name || d.account?.username },
    examples: "The merchant code (merchant_code) comes from GET /v0.1/me. Examples: "
      + "GET /v2.1/merchants/{merchant_code}/transactions/history?limit=50&order=descending&oldest_time=2026-10-01T00:00:00Z, "
      + "GET /v2.1/merchants/{merchant_code}/transactions?transaction_code=…, "
      + "GET /v1.0/merchants/{merchant_code}/payouts?start_date=2026-10-01&end_date=2026-10-15, POST /v0.1/me/refund/{txn_id} "
      + "{\"amount\": 5.0} (partial; without a body, full), POST /v0.1/checkouts {\"checkout_reference\": \"…\", \"amount\": 10.0, "
      + "\"currency\": \"EUR\", \"merchant_code\": \"…\"}, GET /v0.1/checkouts/{id}, GET /v0.1/merchants/{merchant_code}/readers.",
    tools: [
      { name: "sumup_transactions", title: "SumUp: transactions", annotations: { readOnlyHint: true },
        description: "Merchant transaction history, from newest to oldest: code, date, amount, status, type "
          + "(payment or refund), payment method and card.",
        schema: { from: z.string().optional().describe("YYYY-MM-DD or ISO 8601"),
                   to: z.string().optional().describe("YYYY-MM-DD or ISO 8601"),
                   max: z.number().int().min(1).max(100).default(50) },
        async run({ from, to, max }, p) {
          const code = ensureOk(await p({ path: "/v0.1/me" }), "SumUp").merchant_profile?.merchant_code;
          if (!code) throw new Error("SumUp: the account has no merchant code");
          const d = ensureOk(await p({ path: `/v2.1/merchants/${encodeURIComponent(code)}/transactions/history`,
            query: { limit: max, order: "descending", oldest_time: isoDay(from), newest_time: isoDay(to, true) } }), "SumUp");
          return (d.items || []).map((t) => ({ id: t.id, code: t.transaction_code, date: t.timestamp, amount: t.amount,
            currency: t.currency, status: t.status, type: t.type, payment_type: t.payment_type, card: t.card_type }));
        } },
    ],
  },
  {
    id: "chargebee", name: "Chargebee", category: "finance",
    description: "Subscriptions, customers, invoices, plans and recurring billing",
    website: "https://www.chargebee.com", docs: "https://apidocs.chargebee.com/docs/api", logo: { favicon: "https://www.chargebee.com" },
    baseUrl: "https://{site}.chargebee.com/api/v2",
    auth: { type: "basic", usernameField: "token", fixedPassword: "" },
    fields: [{ id: "site", label: "Chargebee site", format: "subdomain",
               help: "If you sign in at https://example.chargebee.com, enter “example” (the test site is usually “example-test”)." },
             { id: "token", label: "API key", secret: true }],
    help: "1) In Chargebee go to “Settings” → “Configure Chargebee” → “API Keys and Webhooks” → “API Keys” tab. 2) Click “Add API "
      + "Key” and choose the type: “Read-Only Key” (for everything or for some resources) if you will only be reading, or “Full-Access Key” to create and "
      + "modify. 3) Give it a name, create it and copy it. Each site (live and test) has its own keys.",
    test: { path: "/customers", query: { limit: 1 }, message: "API key is valid (customers can be read)" },
    examples: "Writes are sent as a form (application/x-www-form-urlencoded), not JSON: use the “form” parameter, with keys like "
      + "billing_address[city] or subscription_items[item_price_id][0]. Examples: GET /customers?email[is]=…, "
      + "GET /subscriptions?status[is]=active&limit=50, GET /subscriptions/{id}, GET /invoices?status[is]=payment_due&sort_by[desc]=date, "
      + "POST /invoices/{id}/pdf (download link), GET /item_prices?item_type[is]=plan, POST /customers form "
      + "{\"first_name\": \"…\", \"email\": \"…\"}, POST /subscriptions/{id}/cancel_for_items form {\"end_of_term\": \"true\"}. "
      + "Pagination: offset=next_offset.",
  },
  {
    id: "salesforce", name: "Salesforce", category: "crm", description: "Accounts, contacts, opportunities, cases and SOQL queries",
    website: "https://www.salesforce.com", docs: "https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/intro_rest.htm",
    logo: { favicon: "https://www.salesforce.com" },
    baseUrl: `{instance_url}/services/data/${SALESFORCE_VERSION}`,
    derived: { loginHost: salesforceLoginHost },
    auth: { type: "oauth", scopes: ["api", "refresh_token"], provider: {
      name: "Salesforce", authorizeUrl: "https://{loginHost}/services/oauth2/authorize", tokenUrl: "https://{loginHost}/services/oauth2/token",
      redirect: "localhost", keep: ["instance_url"],
      help: "1) In Salesforce: “Setup” → “External Client App Manager” → “New External Client App” (in older "
        + "orgs, “App Manager” → “New Connected App”). 2) Give it a name and a contact email, enable OAuth, set the "
        + "redirect URI shown below as the “Callback URL” and add the scopes “Manage user data via APIs (api)” and “Perform requests at any time "
        + "(refresh_token, offline_access)”. 3) Leave “Require secret for Web Server Flow” and “Require PKCE” selected and save. 4) Under "
        + "“Settings” → “OAuth Settings” click “Consumer Key and Secret” and copy both (client ID and secret); the app may take a few "
        + "minutes to become active. If your organization does not allow signing in through login.salesforce.com, enter your My Domain. The "
        + "session must last at least 1 hour (Salesforce does not say when the token expires).",
    } },
    fields: [{ id: "server", label: "Organization type", default: "login.salesforce.com", options: SALESFORCE_SERVERS },
             { id: "my_domain", label: "My Domain", optional: true, format: "domain",
               help: "e.g. example.my.salesforce.com or example--test.sandbox.my.salesforce.com; if you set it, it is used instead "
                 + "of the organization type." },
             { id: "instance_url", label: "Instance", format: "url", hidden: true }],
    // /limits would require the “View Setup and Configuration” permission: the version root works for any user with API access.
    test: { path: "/", account: (d, c) => (c.instance_url ? new URL(c.instance_url).hostname : null) },
    examples: `Paths relative to /services/data/${SALESFORCE_VERSION} (other APIs of the instance, such as /services/apexrest/…, with the full `
      + "URL). Examples: GET /query?q=SELECT Id, Name FROM Account WHERE Name LIKE '%Acme%' LIMIT 20, GET /sobjects/Account/{id}, "
      + "GET /sobjects/Opportunity/describe, POST /sobjects/Contact {\"LastName\": \"…\", \"Email\": \"…\", \"AccountId\": \"…\"}, "
      + "PATCH /sobjects/Opportunity/{id} {\"StageName\": \"Closed Won\"}, GET /search?q=FIND {Acme} IN ALL FIELDS RETURNING "
      + "Account(Id, Name), Contact(Id, Name, Email), GET /sobjects (available objects), GET /limits (requires permission to view the "
      + "setup). Pagination: nextRecordsUrl (with salesforce_soql, pass it as “next”).",
    tools: [
      { name: "salesforce_soql", title: "Salesforce: SOQL query", annotations: { readOnlyHint: true },
        description: "Runs a SOQL query and returns the records without metadata, with the total. If there are more (up to 2000 per page), "
          + "it returns “next” to request the next page.",
        schema: { query: z.string().optional()
                     .describe("e.g. SELECT Id, Name, StageName, Amount, CloseDate FROM Opportunity WHERE IsClosed = false LIMIT 50"),
                   next: z.string().optional().describe("The “next” value from the previous call (instead of the query)"),
                   include_deleted: z.boolean().default(false).describe("Include deleted or archived records (queryAll)") },
        async run({ query, next, include_deleted }, p) {
          if (!query && !next) throw new Error("Provide the SOQL query or the “next” value");
          const route = next ? next.replace(/^\/services\/data\/v[\d.]+/, "") : include_deleted ? "/queryAll" : "/query";
          const d = ensureOk(await p({ path: route, query: next ? undefined : { q: query } }), "Salesforce");
          return { total: d.totalSize, next: d.done ? null : d.nextRecordsUrl, records: cleanSalesforce(d.records || []) };
        } },
    ],
  },
  {
    id: "xero", name: "Xero", category: "finance", description: "Accounting: invoices, contacts, payments, banks and organization",
    website: "https://www.xero.com", docs: "https://developer.xero.com/documentation/api/accounting/overview", logo: { simpleIcons: "xero" },
    baseUrl: "https://api.xero.com/api.xro/2.0",
    headers: (c) => (c.tenant_id ? { "xero-tenant-id": c.tenant_id } : {}),
    auth: { type: "oauth", scopes: XERO_SCOPES, provider: {
      name: "Xero", authorizeUrl: "https://login.xero.com/identity/connect/authorize", tokenUrl: "https://identity.xero.com/connect/token",
      clientAuth: "basic", redirect: "localhost", after: xeroOrganization,
      help: "1) At developer.xero.com/app/manage click “New app”: type “Web app”, a name, the company website (e.g. "
        + "https://www.example.com) and, as “Redirect URI”, the redirect URI shown below. 2) Create it and, in “Configuration”, click "
        + "“Generate a secret”; copy the Client ID and the Client secret. 3) When you click “Continue with Xero”, choose the Xero organization: the "
        + "last one you authorize is used. Permissions are requested for settings, contacts, invoices, payments, bank transactions and attachments; accounting reports "
        + "(profit and loss, balance sheet) need scopes that Xero restricts to its partners.",
    } },
    fields: [{ id: "tenant_id", label: "Xero organization (tenant)", hidden: true },
             { id: "organization", label: "Organization name", hidden: true }],
    test: { path: "/Organisation", account: (d) => d.Organisations?.[0]?.Name },
    examples: "For another connected organization, pass the xero-tenant-id header (lowercase) with its tenantId from "
      + "GET https://api.xero.com/connections. Examples: GET /Invoices?Statuses=AUTHORISED&where=Type==\"ACCREC\"&order=DueDate"
      + "&page=1&summaryOnly=true, GET /Invoices/{id or number}, GET /Contacts?searchTerm=…, POST /Invoices {\"Invoices\": "
      + "[{\"Type\": \"ACCREC\", \"Contact\": {\"ContactID\": \"…\"}, \"LineItems\": [{\"Description\": \"…\", \"Quantity\": 1, "
      + "\"UnitAmount\": 100, \"AccountCode\": \"200\"}], \"Status\": \"DRAFT\"}]}, GET /Payments?where=Date>=DateTime(2026,10,01), "
      + "GET /BankTransactions?page=1, GET /Accounts, GET /TaxRates, GET /Items, GET /Invoices/{id}/OnlineInvoice. Pagination: page "
      + "(100 per page).",
    tools: [
      { name: "xero_invoices", title: "Xero: invoices", annotations: { readOnlyHint: true },
        description: "Issued (ACCREC) or received (ACCPAY) invoices, from newest to oldest: number, contact, date, "
          + "due date, status, total, amount due and currency. 100 per page.",
        schema: { type: z.enum(["ACCREC", "ACCPAY"]).default("ACCREC").describe("ACCREC: issued (sales); ACCPAY: received (purchases)"),
                   statuses: z.array(z.enum(["DRAFT", "SUBMITTED", "AUTHORISED", "PAID", "VOIDED", "DELETED"])).optional()
                     .describe("Default: all except voided and deleted"),
                   from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("Invoice date from (YYYY-MM-DD)"),
                   contact: z.string().optional().describe("ContactID of the customer or supplier"),
                   text: z.string().optional().describe("Searches the number and the reference"),
                   page: z.number().int().min(1).default(1) },
        async run({ type, statuses, from, contact, text, page }, p) {
          const conditions = [`Type=="${type}"`, ...(from ? [`Date>=DateTime(${from.split("-").map(Number).join(",")})`] : [])];
          const d = ensureOk(await p({ path: "/Invoices", query: { where: conditions.join(" AND "), order: "Date DESC", page: page,
            summaryOnly: "true", Statuses: (statuses?.length ? statuses : ["DRAFT", "SUBMITTED", "AUTHORISED", "PAID"]).join(","),
            ContactIDs: contact, SearchTerm: text } }), "Xero");
          return (d.Invoices || []).map((f) => ({ id: f.InvoiceID, number: f.InvoiceNumber, reference: f.Reference || undefined,
            contact: f.Contact?.Name, date: f.DateString?.slice(0, 10), due: f.DueDateString?.slice(0, 10), status: f.Status,
            total: f.Total, outstanding: f.AmountDue, currency: f.CurrencyCode }));
        } },
      { name: "xero_invoice_pdf", title: "Xero: download an invoice as PDF", annotations: { readOnlyHint: true },
        description: "Downloads the PDF of an invoice and saves it on the server (Conector's downloads folder). "
          + "Returns the file path.",
        schema: { invoice: z.string().describe("InvoiceID or invoice number (e.g. INV-0042)") },
        async run({ invoice }, p) {
          const d = ensureOk(await p({ path: `/Invoices/${encodeURIComponent(invoice)}`, headers: { Accept: "application/pdf" } }), "Xero");
          return savePdf(d, `xero_${invoice}.pdf`, "Xero");
        } },
    ],
  },
];
