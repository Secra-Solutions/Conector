// Batch 42 of the catalog, from the Composio catalog: headless CMS, highlights, restaurant bookings, files, field services,
// relational spreadsheets, habits, notes, handwritten cards, transcription, fleets, projects, Wi-Fi, planning,
// tickets, PDF, images and postal mail.
import crypto from "node:crypto";
import { USER_AGENT, httpRequest } from "../../http.js";

const count = (d, one, many) => (Array.isArray(d) ? `${d.length} ${d.length === 1 ? one : many}` : null);

// iLovePDF: the public key is exchanged for a two-hour token, which is kept in memory until shortly before it expires.
const iLovePdfTokens = new Map();
async function iLovePdfToken(c) {
  const fingerprint = crypto.createHash("sha256").update(c.token).digest("hex");
  const cached = iLovePdfTokens.get(fingerprint);
  if (cached && cached.expires > Date.now() + 60_000) return cached.token;
  const r = await httpRequest("https://api.ilovepdf.com/v1/auth", { method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", "User-Agent": USER_AGENT },
    body: JSON.stringify({ public_key: c.token }) });
  // iLovePDF responds 500 (not 401) to a public key that does not exist.
  if (!r.ok || !r.data?.token) throw new Error(`iLovePDF responded 401: the public key is not valid (${r.status})`);
  iLovePdfTokens.set(fingerprint, { token: r.data.token, expires: Date.now() + 110 * 60_000 });
  return r.data.token;
}

export default [
  {
    id: "flotiq", name: "Flotiq", category: "ecommerce", description: "Headless CMS: content types, entries and media",
    website: "https://flotiq.com", docs: "https://flotiq.com/docs/API/", logo: { favicon: "https://flotiq.com" },
    baseUrl: "https://api.flotiq.com/api/v1",
    auth: { type: "header", name: "X-AUTH-TOKEN" },
    fields: [{ id: "token", label: "API key (read, or read and write)", secret: true }],
    keyUrl: "https://editor.flotiq.com/api-keys",
    help: "1) In the Flotiq editor open “API keys”. 2) Copy the read-only key or the read and write key.",
    test: { path: "/internal/contenttype", query: { limit: 1 }, message: "API key is valid" },
    examples: "Examples: GET /internal/contenttype (content types), GET /content/{type}?limit=20&filters={…}, GET /content/{type}/{id}, "
      + "POST /content/{type} {…}, PUT /content/{type}/{id} {…}, DELETE /content/{type}/{id}, GET /content/_media?limit=20.",
  },
  {
    id: "glasp", name: "Glasp", category: "productivity", description: "Highlights and notes from the web and PDFs",
    website: "https://glasp.co", docs: "https://glasp.co/docs/api", logo: { favicon: "https://glasp.co" },
    baseUrl: "https://api.glasp.co/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "Access token", secret: true }],
    help: "1) In Glasp open “Settings” → “Access Token” and generate a token. 2) Copy it.",
    test: { path: "/highlights/export", message: "Token is valid" },
    examples: "Examples: GET /highlights/export (documents with their highlights and notes; paginate with pageCursor), "
      + "GET /highlights/export?updatedAfter=2026-10-01T00:00:00Z.",
  },
  {
    id: "gotable", name: "GoTable", category: "ecommerce", description: "Restaurant bookings: restaurants, reservations and availability",
    website: "https://gotable.app", docs: "https://gotable.app/developer/rest-api", logo: { favicon: "https://gotable.app" },
    baseUrl: "https://gotable.app/api/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key (restaurant, account or partner)", secret: true }],
    help: "1) In GoTable open the integrations page of the restaurant (or your account settings) and create an API key. 2) Copy it. "
      + "Limit: 60 requests per minute.",
    test: { path: "/restaurants", message: "API key is valid" },
    examples: "Examples: GET /restaurants, GET /restaurants/{id}, GET /restaurants/{id}/reservations?date=2026-10-20, "
      + "GET /restaurants/{id}/availability?date=…&party_size=2, POST /restaurants/{id}/reservations {…}.",
  },
  {
    id: "gofile", name: "Gofile", category: "productivity", description: "File storage and sharing: folders and contents",
    website: "https://gofile.io", docs: "https://gofile.io/api", logo: { favicon: "https://gofile.io" },
    baseUrl: "https://api.gofile.io",
    allowedOrigins: ["https://upload.gofile.io"],
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "Account token", secret: true }],
    keyUrl: "https://gofile.io/myprofile",
    help: "1) In gofile.io open “My profile” and copy the “Account API token”. 2) Paste it here.",
    test: { path: "/accounts/getid", message: "Token is valid" },
    examples: "Examples: GET /accounts/getid, GET /accounts/{accountId} (root folder and usage), GET /contents/{contentId}, "
      + "POST /contents/createFolder {\"parentFolderId\": \"…\", \"folderName\": \"…\"}, PUT /contents/{contentId}/update {\"attribute\": "
      + "\"public\", \"attributeValue\": \"true\"}, DELETE /contents {\"contentsId\": \"…\"}; uploads at https://upload.gofile.io/uploadfile.",
  },
  {
    id: "gorilladesk", name: "GorillaDesk", category: "crm", description: "Field services (pest control, pools…): customers, jobs and invoices",
    website: "https://gorilladesk.com", docs: "https://gorilladesk.com/api", logo: { favicon: "https://gorilladesk.com" },
    baseUrl: "https://api.gorilladesk.com/v1",
    headers: { Accept: "application/json" },
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) In GorillaDesk open “Settings” → “Integrations” → “API” and generate a key. 2) Copy it.",
    test: { path: "/customers", query: { limit: 1 }, message: "API key is valid" },
    examples: "Examples: GET /customers?limit=50, GET /customers/{id}, POST /customers {…}, GET /jobs?start=…&end=…, GET /invoices, "
      + "GET /estimates.",
  },
  {
    id: "grist", name: "Grist", category: "productivity", description: "Relational spreadsheets: documents, tables and records",
    website: "https://www.getgrist.com", docs: "https://support.getgrist.com/api/", logo: { favicon: "https://www.getgrist.com" },
    baseUrl: "https://{server}/api",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true },
             { id: "server", label: "Server", default: "docs.getgrist.com", format: "domain",
               help: "docs.getgrist.com for a personal account; <team>.getgrist.com for a team, or your own domain if you self-host." }],
    keyUrl: "https://docs.getgrist.com/account",
    help: "1) In Grist open your profile → “Profile Settings” → “API” and create the key. 2) If you use a team site, enter its domain in “Server”.",
    test: { path: "/orgs", message: (d) => count(d, "organization", "organizations") || "API key is valid" },
    examples: "Examples: GET /orgs, GET /orgs/{orgId}/workspaces, GET /docs/{docId}/tables, GET /docs/{docId}/tables/{tableId}/records?limit=50, "
      + "POST /docs/{docId}/tables/{tableId}/records {\"records\": [{\"fields\": {\"Name\": \"…\"}}]}, PATCH (same body with id), "
      + "POST /docs/{docId}/sql {\"sql\": \"select * from Table1 limit 10\"}.",
  },
  {
    id: "habitica", name: "Habitica", category: "productivity", description: "Habits and tasks as a game: to-dos, dailies and rewards",
    website: "https://habitica.com", docs: "https://habitica.com/apidoc/", logo: { favicon: "https://habitica.com" },
    baseUrl: "https://habitica.com/api/v3",
    // Habitica asks to identify the application in x-client: <author's user ID>-<app name>.
    headers: (c) => ({ "x-client": `${c.username}-Conector` }),
    auth: [{ type: "header", name: "x-api-user", field: "username" }, { type: "header", name: "x-api-key" }],
    fields: [{ id: "username", label: "User ID", format: "segment", example: "00000000-0000-4000-8000-000000000000" },
             { id: "token", label: "API Token", secret: true }],
    keyUrl: "https://habitica.com/user/settings/siteData",
    help: "1) In Habitica open “Settings” → “Site Data” (or “API”). 2) Copy the “User ID” and the “API Token”.",
    test: { path: "/user", query: { userFields: "profile.name" }, account: (d) => d?.data?.profile?.name },
    examples: "Examples: GET /tasks/user?type=todos, POST /tasks/user {\"text\": \"…\", \"type\": \"todo\"}, POST /tasks/{taskId}/score/up, "
      + "GET /user?userFields=stats, GET /groups/party, POST /cron.",
  },
  {
    id: "hackmd", name: "HackMD", category: "productivity", description: "Collaborative Markdown notes: notes and teams",
    website: "https://hackmd.io", docs: "https://hackmd.io/@hackmd-api/developer-portal", logo: { favicon: "https://hackmd.io" },
    baseUrl: "https://api.hackmd.io/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API token", secret: true }],
    keyUrl: "https://hackmd.io/settings#api",
    help: "1) In HackMD open “Settings” → “API” → “Create API token”. 2) Copy the token.",
    test: { path: "/me", account: (d) => d?.email || d?.name },
    examples: "Examples: GET /notes, GET /notes/{noteId}, POST /notes {\"title\": \"…\", \"content\": \"# …\", \"readPermission\": \"owner\", "
      + "\"writePermission\": \"owner\"}, PATCH /notes/{noteId} {\"content\": \"…\"}, DELETE /notes/{noteId}, GET /teams, "
      + "GET /teams/{teamPath}/notes.",
  },
  {
    id: "handwrytten", name: "Handwrytten", category: "marketing", description: "Cards handwritten by robots and sent by mail",
    website: "https://www.handwrytten.com", docs: "https://www.handwrytten.com/api/", logo: { favicon: "https://www.handwrytten.com" },
    baseUrl: "https://api.handwrytten.com/v2",
    auth: { type: "header", name: "Authorization" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) In Handwrytten open “Account” → “API Keys” and generate a key. 2) Copy it. Each card sent is charged.",
    test: { path: "/cards/list", message: "API key is valid" },
    examples: "Examples: GET /cards/list, GET /fonts/list, GET /orders/list, POST /orders/singleStepOrder {\"card_id\": …, \"font\": \"…\", "
      + "\"message\": \"…\", \"recipient_name\": \"…\", \"recipient_address1\": \"…\", …} (sends a real card).",
  },
  {
    id: "happyscribe", name: "Happy Scribe", category: "media", description: "Transcription and subtitles: transcriptions and exports",
    website: "https://www.happyscribe.com", docs: "https://dev.happyscribe.com", logo: { favicon: "https://www.happyscribe.com" },
    baseUrl: "https://www.happyscribe.com/api/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true },
             { id: "organization", label: "Organization ID", format: "segment", example: "123456",
               help: "It appears on the Happy Scribe API page next to the key." }],
    help: "1) In Happy Scribe open “Account” → “API” and copy the key and the organization ID. 2) Each minute transcribed uses credit.",
    test: { path: "/transcriptions?organization_id={organization}", message: "API key is valid" },
    examples: "Examples: GET /transcriptions?organization_id=…, POST /transcriptions {\"transcription\": {\"name\": \"…\", \"language\": \"en-US\", "
      + "\"tmp_url\": \"https://…/audio.mp3\", \"organization_id\": \"…\"}}, GET /transcriptions/{id}, POST /exports {\"export\": {\"format\": "
      + "\"srt\", \"transcription_ids\": [\"…\"]}}, GET /exports/{id}.",
  },
  {
    id: "hellotracks", name: "Hellotracks", category: "productivity", description: "Field teams: jobs, routes and live location",
    website: "https://hellotracks.com", docs: "https://hellotracks.com/developer", logo: { favicon: "https://hellotracks.com" },
    baseUrl: "https://api.hellotracks.com/api",
    auth: { type: "header", name: "API-Key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) Sign in to the Hellotracks website and open “Settings” → “API Key”. 2) Copy the key.",
    // Hellotracks responds 200 to a bad key: {"status": -8, "errorMsg": "Invalid api-key…"}.
    test: { path: "/getaccounts", message: "API key is valid",
              validate: (d) => {
                if (d?.status !== 0) throw new Error(`Hellotracks: ${d?.errorMsg || "invalid response"}`);
              } },
    examples: "Examples: GET /getaccounts (team members), POST /getjobs {\"data\": {\"day\": 20261015}}, POST /createjobs "
      + "{\"data\": {\"jobs\": [{…}]}}, POST /getlocations {\"data\": {…}} (recent positions).",
  },
  {
    id: "hive", name: "Hive", category: "projects", description: "Project management: workspaces, projects, actions and people",
    website: "https://hive.com", docs: "https://developers.hive.com", logo: { favicon: "https://hive.com" },
    baseUrl: "https://app.hive.com/api/v1",
    auth: [{ type: "header", name: "api_key" }, { type: "header", name: "user_id", field: "username" }],
    fields: [{ id: "token", label: "API Key", secret: true }, { id: "username", label: "User ID", format: "segment" }],
    help: "1) In Hive open your profile → “Edit profile” → “API Info”. 2) Copy the “API Key” and the “User ID”.",
    test: { path: "/workspaces", message: (d) => count(d, "workspace", "workspaces") || "Credentials are valid" },
    examples: "Examples: GET /workspaces, GET /workspaces/{workspaceId}/projects, GET /workspaces/{workspaceId}/actions?first=50, "
      + "POST /actions {\"workspace\": \"…\", \"title\": \"…\", \"projectId\": \"…\"}, PUT /actions/{actionId} {…}, "
      + "GET /workspaces/{workspaceId}/users.",
  },
  {
    id: "hjarni", name: "Hjarni", category: "productivity", description: "Knowledge base for AI: notes, tags and search",
    website: "https://hjarni.com", docs: "https://hjarni.com/docs", logo: { favicon: "https://hjarni.com" },
    baseUrl: "https://hjarni.com/api/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "Personal API token", secret: true }],
    help: "1) In Hjarni open “Settings” → “Connections” and create a personal API token. 2) Copy it.",
    test: { path: "/notes", query: { per_page: 1 }, message: "Token is valid" },
    examples: "Examples: GET /notes?page=1, GET /notes/{id}, POST /notes {\"title\": \"…\", \"body\": \"…\"}, PATCH /notes/{id} {…}, "
      + "DELETE /notes/{id}, GET /tags.",
  },
  {
    id: "hotspotsystem", name: "HotspotSystem", category: "ecommerce", description: "Business Wi-Fi: locations, customers and vouchers",
    website: "https://www.hotspotsystem.com", docs: "https://www.hotspotsystem.com/apidocs/api/reference", logo: { favicon: "https://www.hotspotsystem.com" },
    baseUrl: "https://api.hotspotsystem.com/v2.0",
    auth: { type: "header", name: "sn-apikey" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) In the HotspotSystem dashboard open “Settings” → “API” and generate a key. 2) Copy it.",
    test: { path: "/me", account: (d) => d?.operator || d?.name },
    examples: "Examples: GET /me, GET /locations, GET /locations/{locationId}/customers, GET /locations/{locationId}/vouchers, "
      + "GET /locations/{locationId}/subscribers, GET /locations/{locationId}/transactions/mac_payment.",
  },
  {
    id: "hubplanner", name: "Hub Planner", category: "projects", description: "Resource planning: people, projects, bookings and hours",
    website: "https://hubplanner.com", docs: "https://github.com/hubplanner/API", logo: { favicon: "https://hubplanner.com" },
    baseUrl: "https://api.hubplanner.com/v1",
    auth: { type: "header", name: "Authorization" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) In Hub Planner open “Settings” → “API” and generate a key with the permissions you need. 2) Copy it.",
    test: { path: "/resource", query: { limit: 1 }, message: "API key is valid" },
    examples: "Examples: GET /resource, GET /project, GET /booking?start=2026-10-01&end=2026-10-31, POST /booking {\"resource\": \"…\", "
      + "\"project\": \"…\", \"start\": \"…\", \"end\": \"…\"}, GET /timeentry?…, POST /timeentry {…}, GET /client.",
  },
  {
    id: "humanitix", name: "Humanitix", category: "marketing", description: "Ticketing for charity events: events, orders and tickets",
    website: "https://humanitix.com", docs: "https://humanitix.stoplight.io", logo: { favicon: "https://humanitix.com" },
    baseUrl: "https://api.humanitix.com/v1",
    auth: { type: "header", name: "x-api-key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) In Humanitix open “Account” → “Advanced” → “API Key” and generate the key. 2) Copy it.",
    test: { path: "/events", query: { page: 1 }, message: "API key is valid" },
    examples: "Lists require page. Examples: GET /events?page=1, GET /events/{eventId}, GET /events/{eventId}/orders?page=1, "
      + "GET /events/{eventId}/tickets?page=1, GET /events/{eventId}/orders/{orderId}.",
  },
  {
    id: "ilovepdf", name: "iLovePDF", category: "productivity", description: "PDF tools: compress, merge, convert, OCR and sign",
    website: "https://www.ilovepdf.com", docs: "https://www.iloveapi.com/docs/api-reference", logo: { favicon: "https://www.ilovepdf.com" },
    baseUrl: "https://api.ilovepdf.com/v1",
    // Each task runs on the server that /start assigns (api1…api99.ilovepdf.com).
    allowedOrigins: ["^https://api[0-9]+\\.ilovepdf\\.com$"],
    auth: { type: "custom", apply: async (c) => ({ headers: { Authorization: `Bearer ${await iLovePdfToken(c)}` } }) },
    fields: [{ id: "token", label: "Project public key (project_public_…)", secret: true }],
    keyUrl: "https://www.iloveapi.com/user/projects",
    help: "1) In iloveapi.com (the iLovePDF API) open “Projects” and copy the public key of the project. 2) Conector requests the access token "
      + "on its own. The free plan allows about 250 tasks per month.",
    test: { path: "/start/compress", message: "Public key is valid" },
    examples: "Flow: GET /start/{tool} (compress, merge, split, officepdf, pdfjpg, imagepdf, pdfocr, protect, watermark…) → returns "
      + "server and task; POST https://{server}/v1/upload {\"task\": \"…\", \"cloud_file\": \"https://…\"}; POST https://{server}/v1/process "
      + "{\"task\": \"…\", \"tool\": \"compress\", \"files\": [{\"server_filename\": \"…\", \"filename\": \"…\"}]}; "
      + "GET https://{server}/v1/download/{task}.",
  },
  {
    id: "imgbb", name: "ImgBB", category: "ecommerce", description: "Image hosting: upload by URL or base64 with a direct link",
    website: "https://imgbb.com", docs: "https://api.imgbb.com", logo: { favicon: "https://imgbb.com" },
    baseUrl: "https://api.imgbb.com/1",
    auth: { type: "query", name: "key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://api.imgbb.com",
    help: "1) Sign in at imgbb.com and open api.imgbb.com. 2) Click “Get API key” and copy the key.",
    // The API only has /upload: without an image, a valid key responds 400 “Empty upload source” and a bad one, code 100.
    test: { path: "/upload", acceptStatus: [400], message: "API key is valid",
              validate: (d) => {
                if (d?.error?.code === 100) throw new Error(`ImgBB: ${d.error.message}`);
              } },
    examples: "Examples: POST /upload with a form image=<base64 or image URL>&name=…&expiration=600 (seconds; optional). The "
      + "response includes data.url (direct link), data.display_url and data.delete_url.",
  },
  {
    id: "intelliprint", name: "Intelliprint", category: "marketing", description: "Letters and postcards by postal mail (UK) from PDF",
    website: "https://www.intelliprint.net", docs: "https://docs.intelliprint.net", logo: { favicon: "https://www.intelliprint.net" },
    baseUrl: "https://api.intelliprint.net/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) In Intelliprint open “Settings” → “API Keys” and create a key. 2) Copy it. Use testmode for tests without sending.",
    test: { path: "/prints", query: { limit: 1 }, message: "API key is valid" },
    examples: "Examples: GET /prints?limit=20, GET /prints/{id}, POST /prints {\"testmode\": true, …} (creates a mailing from a PDF), "
      + "POST /prints/{id}/confirm (sends it to print), DELETE /prints/{id}, GET /mailing_lists.",
  },
];
