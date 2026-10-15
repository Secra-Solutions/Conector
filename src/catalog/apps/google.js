// Google services (OAuth with your own Google Cloud client; the same client works for all of them).
import { z } from "zod";
import { ensureOk } from "../define.js";

const IDENTITY = "https://openidconnect.googleapis.com/v1/userinfo";
const google = (...scopes) => ({ type: "oauth", provider: "google", scopes: scopes });
const api = (name) => `Enable the “${name}” in the project.`;

function mimeMessage({ to, subject, body: content, cc, html }) {
  for (const d of [...to, ...(cc || [])]) if (/[\r\n,;<>]/.test(d)) throw new Error(`Invalid address: ${d}`);
  const lines = [`To: ${to.join(", ")}`, ...(cc?.length ? [`Cc: ${cc.join(", ")}`] : []),
    `Subject: =?UTF-8?B?${Buffer.from(subject).toString("base64")}?=`, "MIME-Version: 1.0",
    `Content-Type: text/${html ? "html" : "plain"}; charset="UTF-8"`, "Content-Transfer-Encoding: base64", "",
    Buffer.from(content).toString("base64")];
  return Buffer.from(lines.join("\r\n")).toString("base64url");
}

export default [
  {
    id: "gmail", name: "Gmail", category: "communication", description: "Google mail: search, read, send and label",
    website: "https://mail.google.com", docs: "https://developers.google.com/workspace/gmail/api/reference/rest", logo: { simpleIcons: "gmail" },
    baseUrl: "https://gmail.googleapis.com/gmail/v1",
    auth: google("https://www.googleapis.com/auth/gmail.modify"),
    help: api("Gmail API"),
    test: { path: "/users/me/profile", account: (d) => d.emailAddress },
    examples: "Examples: GET /users/me/messages?q=from:x is:unread, GET /users/me/messages/{id}?format=full, GET /users/me/labels, "
      + "POST /users/me/messages/{id}/modify {\"addLabelIds\": […]}.",
    tools: [
      { name: "gmail_search", title: "Gmail: search emails", annotations: { readOnlyHint: true },
        description: "Searches with Gmail syntax (from:, subject:, has:attachment, after:2026/10/01…). Returns id, sender, subject, date and snippet.",
        schema: { query: z.string().default(""), max: z.number().int().min(1).max(25).default(10) },
        async run({ query, max }, p) {
          const list = ensureOk(await p({ path: "/users/me/messages", query: { q: query, maxResults: max } }), "Gmail").messages || [];
          return Promise.all(list.map(async ({ id }) => {
            const m = ensureOk(await p({ path: `/users/me/messages/${id}`, query: { format: "metadata" } }), "Gmail");
            const h = (n) => m.payload?.headers?.find((x) => x.name.toLowerCase() === n)?.value;
            return { id, thread: m.threadId, from: h("from"), subject: h("subject"), date: h("date"), snippet: m.snippet, labels: m.labelIds };
          }));
        } },
      { name: "gmail_send_mail", title: "Gmail: send an email", annotations: { openWorldHint: true },
        description: "Sends an email from the connected Gmail account.",
        schema: { to: z.array(z.string()).min(1), subject: z.string(), body: z.string().describe("Body as HTML or text"),
                   cc: z.array(z.string()).optional(), html: z.boolean().default(true) },
        async run(a, p) {
          const d = ensureOk(await p({ method: "POST", path: "/users/me/messages/send", body: { raw: mimeMessage(a) } }), "Gmail");
          return { sent: true, id: d.id };
        } },
    ],
  },
  {
    id: "googledrive", name: "Google Drive", category: "productivity", description: "Drive files, folders and permissions",
    website: "https://drive.google.com", docs: "https://developers.google.com/workspace/drive/api/reference/rest/v3", logo: { simpleIcons: "googledrive" },
    baseUrl: "https://www.googleapis.com/drive/v3",
    auth: google("https://www.googleapis.com/auth/drive"),
    help: api("Google Drive API"),
    test: { path: "/about", query: { fields: "user" }, account: (d) => d.user?.emailAddress },
    examples: "Examples: GET /files?q=name contains 'invoice'&fields=files(id,name,mimeType,modifiedTime), GET /files/{id}?alt=media, "
      + "GET /files/{id}/export?mimeType=application/pdf, upload: POST https://www.googleapis.com/upload/drive/v3/files?uploadType=media.",
  },
  {
    id: "googlecalendar", name: "Google Calendar", category: "productivity", description: "Calendars and events",
    website: "https://calendar.google.com", docs: "https://developers.google.com/workspace/calendar/api/v3/reference", logo: { simpleIcons: "googlecalendar" },
    baseUrl: "https://www.googleapis.com/calendar/v3",
    auth: google("https://www.googleapis.com/auth/calendar"),
    help: api("Google Calendar API"),
    test: { path: "/users/me/calendarList", query: { maxResults: 1, minAccessRole: "owner" }, account: (d) => d.items?.[0]?.id },
    examples: "Examples: GET /calendars/primary/events?timeMin=2026-10-01T00:00:00Z&singleEvents=true&orderBy=startTime, "
      + "POST /calendars/primary/events, GET /users/me/calendarList.",
  },
  {
    id: "googlesheets", name: "Google Sheets", category: "productivity", description: "Spreadsheets: read and write cells",
    website: "https://sheets.google.com", docs: "https://developers.google.com/workspace/sheets/api/reference/rest", logo: { simpleIcons: "googlesheets" },
    baseUrl: "https://sheets.googleapis.com/v4", allowedOrigins: ["https://openidconnect.googleapis.com"],
    auth: google("https://www.googleapis.com/auth/spreadsheets", "openid", "email"),
    help: api("Google Sheets API"),
    test: { path: IDENTITY, account: (d) => d.email },
    examples: "Examples: GET /spreadsheets/{id}?fields=sheets.properties, GET /spreadsheets/{id}/values/Sheet1!A1:D20, "
      + "PUT /spreadsheets/{id}/values/Sheet1!A1?valueInputOption=USER_ENTERED, POST /spreadsheets/{id}/values/Sheet1:append?valueInputOption=USER_ENTERED.",
  },
  {
    id: "googledocs", name: "Google Docs", category: "productivity", description: "Text documents: read and edit",
    website: "https://docs.google.com", docs: "https://developers.google.com/workspace/docs/api/reference/rest", logo: { simpleIcons: "googledocs" },
    baseUrl: "https://docs.googleapis.com/v1", allowedOrigins: ["https://openidconnect.googleapis.com"],
    auth: google("https://www.googleapis.com/auth/documents", "openid", "email"),
    help: api("Google Docs API"),
    test: { path: IDENTITY, account: (d) => d.email },
    examples: "Examples: GET /documents/{id}, POST /documents {\"title\": \"…\"}, POST /documents/{id}:batchUpdate with requests (insertText, replaceAllText…).",
  },
  {
    id: "googlesearchconsole", name: "Google Search Console", category: "marketing", description: "Google search performance, indexing and sitemaps",
    website: "https://search.google.com/search-console", docs: "https://developers.google.com/webmaster-tools/v1/api_reference_index",
    logo: { simpleIcons: "googlesearchconsole" },
    baseUrl: "https://www.googleapis.com/webmasters/v3", allowedOrigins: ["https://searchconsole.googleapis.com"],
    auth: google("https://www.googleapis.com/auth/webmasters"),
    help: api("Google Search Console API"),
    test: { path: "/sites", message: (d) => `${(d.siteEntry || []).length} accessible properties` },
    examples: "Examples: GET /sites, GET /sites/{encoded url}/sitemaps, POST https://searchconsole.googleapis.com/v1/urlInspection/index:inspect.",
    tools: [
      { name: "googlesearchconsole_performance", title: "Search Console: search performance", annotations: { readOnlyHint: true },
        description: "Clicks, impressions, CTR and average position by query, page, country, device or date.",
        schema: { site: z.string().describe("Property, e.g. sc-domain:example.com or https://www.example.com/"),
                   start_date: z.string().describe("YYYY-MM-DD"), end_date: z.string().describe("YYYY-MM-DD"),
                   dimensions: z.array(z.enum(["query", "page", "country", "device", "date"])).default(["query"]),
                   max: z.number().int().min(1).max(5000).default(100) },
        run: async ({ site, start_date, end_date, dimensions, max }, p) => ensureOk(await p({ method: "POST",
          path: `/sites/${encodeURIComponent(site)}/searchAnalytics/query`,
          body: { startDate: start_date, endDate: end_date, dimensions: dimensions, rowLimit: max } }), "Search Console").rows || [] },
    ],
  },
  {
    id: "googleanalytics", name: "Google Analytics", category: "marketing", description: "Traffic and conversion reports (GA4)",
    website: "https://analytics.google.com", docs: "https://developers.google.com/analytics/devguides/reporting/data/v1/rest",
    logo: { simpleIcons: "googleanalytics" },
    baseUrl: "https://analyticsdata.googleapis.com/v1beta", allowedOrigins: ["https://analyticsadmin.googleapis.com"],
    auth: google("https://www.googleapis.com/auth/analytics.readonly"),
    help: `${api("Google Analytics Data API")} Also enable the “Google Analytics Admin API” to list the properties.`,
    test: { path: "https://analyticsadmin.googleapis.com/v1beta/accountSummaries",
              message: (d) => `${(d.accountSummaries || []).length} accessible Analytics accounts` },
    examples: "Examples: GET https://analyticsadmin.googleapis.com/v1beta/accountSummaries (properties), POST /properties/{id}:runReport, "
      + "POST /properties/{id}:runRealtimeReport.",
    tools: [
      { name: "googleanalytics_report", title: "Analytics: report", annotations: { readOnlyHint: true },
        description: "GA4 report for a property: metrics (sessions, activeUsers, conversions…) by dimensions (date, pagePath, sessionSource…).",
        schema: { property: z.string().describe("Numeric ID of the GA4 property"), start_date: z.string().default("28daysAgo"),
                   end_date: z.string().default("today"), metrics: z.array(z.string()).default(["sessions", "activeUsers"]),
                   dimensions: z.array(z.string()).default(["date"]), max: z.number().int().min(1).max(10000).default(100) },
        run: async ({ property, start_date, end_date, metrics, dimensions, max }, p) => ensureOk(await p({ method: "POST",
          path: `/properties/${property.replace(/\D/g, "")}:runReport`, body: { dateRanges: [{ startDate: start_date, endDate: end_date }],
            metrics: metrics.map((name) => ({ name })), dimensions: dimensions.map((name) => ({ name })), limit: max } }), "Analytics") },
    ],
  },
  {
    id: "youtube", name: "YouTube", category: "marketing", description: "Channel, videos, playlists and statistics",
    website: "https://www.youtube.com", docs: "https://developers.google.com/youtube/v3/docs", logo: { simpleIcons: "youtube" },
    baseUrl: "https://www.googleapis.com/youtube/v3",
    auth: google("https://www.googleapis.com/auth/youtube.readonly"),
    help: api("YouTube Data API v3"),
    test: { path: "/channels", query: { part: "snippet", mine: "true" }, account: (d) => d.items?.[0]?.snippet?.title },
    examples: "Examples: GET /channels?part=snippet,statistics&mine=true, GET /search?part=snippet&forMine=true&type=video, GET /videos?part=statistics&id=…",
  },
  {
    id: "googletagmanager", name: "Google Tag Manager", category: "marketing", description: "Containers, tags, triggers and versions",
    website: "https://tagmanager.google.com", docs: "https://developers.google.com/tag-platform/tag-manager/api/reference/rest",
    logo: { simpleIcons: "googletagmanager" },
    baseUrl: "https://tagmanager.googleapis.com/tagmanager/v2",
    auth: google("https://www.googleapis.com/auth/tagmanager.readonly", "https://www.googleapis.com/auth/tagmanager.edit.containers"),
    help: api("Tag Manager API"),
    test: { path: "/accounts", message: (d) => `${(d.account || []).length} accessible Tag Manager accounts` },
    examples: "Examples: GET /accounts, GET /accounts/{id}/containers, GET /accounts/{id}/containers/{id}/workspaces, "
      + "GET …/workspaces/{id}/tags, POST …/workspaces/{id}/tags (create a tag), GET …/versions:live.",
  },
  {
    id: "googlechat", name: "Google Chat", category: "communication", description: "Google Chat spaces, messages and members",
    website: "https://chat.google.com", docs: "https://developers.google.com/workspace/chat/api/reference/rest", logo: { simpleIcons: "googlechat" },
    baseUrl: "https://chat.googleapis.com/v1",
    auth: google("https://www.googleapis.com/auth/chat.spaces.readonly", "https://www.googleapis.com/auth/chat.messages"),
    help: `${api("Google Chat API")} Also, on the Chat API configuration page of the project, fill in the app details `
      + "(name, avatar and description): Google requires it even if the app is only used with your own account.",
    test: { path: "/spaces", query: { pageSize: 1 }, message: "Access to your Chat spaces" },
    examples: "Examples: GET /spaces, GET /spaces/{id}/messages?pageSize=20&orderBy=createTime desc, "
      + "POST /spaces/{id}/messages {\"text\": \"…\"}, GET /spaces/{id}/members.",
  },
  {
    id: "googletasks", name: "Google Tasks", category: "productivity", description: "Google task lists and tasks",
    website: "https://tasks.google.com", docs: "https://developers.google.com/workspace/tasks/reference/rest", logo: { simpleIcons: "googletasks" },
    baseUrl: "https://tasks.googleapis.com/tasks/v1",
    auth: google("https://www.googleapis.com/auth/tasks"),
    help: api("Google Tasks API"),
    test: { path: "/users/@me/lists", query: { maxResults: 20 }, message: (d) => `${(d.items || []).length} task lists` },
    examples: "Examples: GET /users/@me/lists, GET /lists/{list}/tasks?showCompleted=false, POST /lists/{list}/tasks "
      + "{\"title\": \"…\", \"due\": \"2026-10-20T00:00:00Z\"}, PATCH /lists/{list}/tasks/{id} {\"status\": \"completed\"}.",
  },
  {
    id: "googlecontacts", name: "Google Contacts", category: "productivity", description: "Contacts and directory (People API)",
    website: "https://contacts.google.com", docs: "https://developers.google.com/people/api/rest", logo: { favicon: "https://contacts.google.com" },
    baseUrl: "https://people.googleapis.com/v1",
    auth: google("https://www.googleapis.com/auth/contacts", "https://www.googleapis.com/auth/directory.readonly"),
    help: api("People API"),
    test: { path: "/people/me", query: { personFields: "names,emailAddresses" }, account: (d) => d.emailAddresses?.[0]?.value },
    examples: "Examples: GET /people/me/connections?personFields=names,emailAddresses,phoneNumbers&pageSize=100, "
      + "GET /people:searchContacts?query=…&readMask=names,emailAddresses, POST /people:createContact, "
      + "GET /people:listDirectoryPeople?sources=DIRECTORY_SOURCE_TYPE_DOMAIN_PROFILE&readMask=names,emailAddresses (company directory).",
  },
  {
    id: "googleforms", name: "Google Forms", category: "productivity", description: "Google Forms and their responses",
    website: "https://forms.google.com", docs: "https://developers.google.com/workspace/forms/api/reference/rest", logo: { simpleIcons: "googleforms" },
    baseUrl: "https://forms.googleapis.com/v1", allowedOrigins: ["https://openidconnect.googleapis.com"],
    auth: google("https://www.googleapis.com/auth/forms.body", "https://www.googleapis.com/auth/forms.responses.readonly", "openid", "email"),
    help: `${api("Google Forms API")} To find the forms, also connect Google Drive (they are stored in Drive).`,
    test: { path: IDENTITY, account: (d) => d.email },
    examples: "Examples: GET /forms/{id} (questions), GET /forms/{id}/responses, POST /forms {\"info\": {\"title\": \"…\"}}, "
      + "POST /forms/{id}:batchUpdate (add questions). The id is the one in the form's URL.",
  },
  {
    id: "googleslides", name: "Google Slides", category: "productivity", description: "Presentations: read, create and edit slides",
    website: "https://slides.google.com", docs: "https://developers.google.com/workspace/slides/api/reference/rest", logo: { simpleIcons: "googleslides" },
    baseUrl: "https://slides.googleapis.com/v1", allowedOrigins: ["https://openidconnect.googleapis.com"],
    auth: google("https://www.googleapis.com/auth/presentations", "openid", "email"),
    help: api("Google Slides API"),
    test: { path: IDENTITY, account: (d) => d.email },
    examples: "Examples: GET /presentations/{id}, POST /presentations {\"title\": \"…\"}, POST /presentations/{id}:batchUpdate with "
      + "requests (createSlide, insertText, replaceAllText, createImage…), GET /presentations/{id}/pages/{page}/thumbnail.",
  },
  {
    id: "googlemeet", name: "Google Meet", category: "communication", description: "Meetings, participants, recordings and transcripts",
    website: "https://meet.google.com", docs: "https://developers.google.com/workspace/meet/api/reference/rest/v2", logo: { simpleIcons: "googlemeet" },
    baseUrl: "https://meet.googleapis.com/v2",
    auth: google("https://www.googleapis.com/auth/meetings.space.created", "https://www.googleapis.com/auth/meetings.space.readonly"),
    help: api("Google Meet REST API"),
    test: { path: "/conferenceRecords", query: { pageSize: 1 }, message: "Access to your Meet meetings" },
    examples: "Examples: POST /spaces {} (create a room), GET /conferenceRecords?filter=space.meeting_code=\"abc-mnop-xyz\", "
      + "GET /conferenceRecords/{id}/participants, GET /conferenceRecords/{id}/transcripts, GET /conferenceRecords/{id}/transcripts/{t}/entries.",
  },
  {
    id: "googlebigquery", name: "Google BigQuery", category: "developer", description: "SQL queries, datasets and tables",
    website: "https://cloud.google.com/bigquery", docs: "https://cloud.google.com/bigquery/docs/reference/rest", logo: { simpleIcons: "googlebigquery" },
    baseUrl: "https://bigquery.googleapis.com/bigquery/v2",
    auth: google("https://www.googleapis.com/auth/bigquery"),
    help: `${api("BigQuery API")} Each query is billed for the data it reads: use LIMIT and filter by partition.`,
    test: { path: "/projects", message: (d) => `${(d.projects || []).length} projects with BigQuery` },
    examples: "Examples: GET /projects, GET /projects/{p}/datasets, GET /projects/{p}/datasets/{d}/tables, "
      + "GET /projects/{p}/datasets/{d}/tables/{t} (schema), POST /projects/{p}/queries {\"query\": \"SELECT …\", \"useLegacySql\": false}.",
    tools: [
      { name: "googlebigquery_query", title: "BigQuery: SQL query", annotations: { openWorldHint: true },
        description: "Runs a standard SQL query and returns the rows (at most 1000). Billed for the data read.",
        schema: { project: z.string(), query: z.string().describe("Standard SQL, e.g. SELECT … FROM `project.dataset.table` LIMIT 100"),
                   max: z.number().int().min(1).max(1000).default(100) },
        async run({ project, query, max }, p) {
          const d = ensureOk(await p({ method: "POST", path: `/projects/${encodeURIComponent(project)}/queries`,
            body: { query: query, useLegacySql: false, maxResults: max, timeoutMs: 60000 } }), "BigQuery");
          if (!d.jobComplete) return { pending: true, job: d.jobReference };
          const columns = (d.schema?.fields || []).map((f) => f.name);
          return { rows: (d.rows || []).map((r) => Object.fromEntries(r.f.map((c, i) => [columns[i], c.v]))), total: d.totalRows,
                   bytes: d.totalBytesProcessed };
        } },
    ],
  },
  {
    id: "googleads", name: "Google Ads", category: "marketing", description: "Campaigns, metrics and reports",
    website: "https://ads.google.com", docs: "https://developers.google.com/google-ads/api/rest/overview", logo: { simpleIcons: "googleads" },
    baseUrl: "https://googleads.googleapis.com/{version}",
    auth: google("https://www.googleapis.com/auth/adwords"),
    fields: [{ id: "developer_token", label: "Developer token", secret: true, help: "Google Ads → Tools → API Center." },
             { id: "login_customer_id", label: "Manager account ID (MCC)", optional: true },
             { id: "version", label: "API version", default: "v25", optional: true }],
    headers: (c) => ({ "developer-token": c.developer_token || "",
                         ...(c.login_customer_id ? { "login-customer-id": c.login_customer_id.replace(/\D/g, "") } : {}) }),
    help: `${api("Google Ads API")} You also need the “developer token” (Google Ads → Tools → API Center; Google has `
      + "to approve basic access) and, if you use a manager account (MCC), its ID.",
    test: { path: "/customers:listAccessibleCustomers", message: (d) => `${(d.resourceNames || []).length} accessible accounts` },
    examples: "Examples: GET /customers:listAccessibleCustomers, POST /customers/{id}/googleAds:search with {\"query\": \"SELECT …\"}.",
    tools: [
      { name: "googleads_query", title: "Google Ads: GAQL query", annotations: { readOnlyHint: true },
        description: "Runs a GAQL query on an account (campaigns, metrics, etc.).",
        schema: { account: z.string().describe("Account ID (digits only)"),
                   query: z.string().describe("e.g. SELECT campaign.name, metrics.clicks FROM campaign WHERE segments.date DURING LAST_30_DAYS") },
        run: async ({ account, query }, p) => ensureOk(await p({ method: "POST",
          path: `/customers/${account.replace(/\D/g, "")}/googleAds:search`, body: { query: query } }), "Google Ads") },
    ],
  },
];
