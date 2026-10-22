// Batch 43 of the catalog (from the Composio catalog): travel, kanban boards, no-code databases, CMS, sales calls, postal mail
// and addresses, vacation rentals, translation, email, formula OCR, digital twins, AI memory, fitness centers, email sales,
// time tracking and invoicing, and planning.

const count = (d, one, many) => (Array.isArray(d) ? `${d.length} ${d.length === 1 ? one : many}` : null);

export default [
  {
    id: "jinko", name: "Jinko", category: "ecommerce", description: "Travel API for agents: airports, flights and hotels",
    website: "https://gojinko.com", docs: "https://docs.gojinko.com", logo: { favicon: "https://gojinko.com" },
    baseUrl: "https://api.gojinko.com/v1",
    auth: { type: "header", name: "x-api-key" },
    fields: [{ id: "token", label: "API key (jnk_…)", secret: true, example: "jnk_000000000000000000000000" }],
    help: "1) In the Jinko panel create an API key (it starts with jnk_). 2) Copy it.",
    test: { path: "/flights/airports", query: { query: "madrid" }, message: "API key is valid" },
    examples: "Examples: GET /flights/airports?query=…, GET /flights/search?origin=JFK&destination=LAX&departure_date=2026-11-02&adults=1, "
      + "GET /hotels/search?…. See the full reference at docs.gojinko.com.",
  },
  {
    id: "kanbantool", name: "Kanban Tool", category: "projects", description: "Kanban boards: boards, tasks, comments and time tracking",
    website: "https://kanbantool.com", docs: "https://kanbantool.com/developer/api-v3", logo: { favicon: "https://kanbantool.com" },
    baseUrl: "https://{domain}.kanbantool.com/api/v3",
    auth: { type: "bearer" },
    fields: [{ id: "domain", label: "Your account name", format: "subdomain",
               help: "The part before .kanbantool.com in your account address." },
             { id: "token", label: "API token", secret: true }],
    help: "1) In Kanban Tool open “My profile” → “API access” and copy the token. 2) Enter your account name here.",
    test: { path: "/users/current.json", account: (d) => d?.email || d?.name },
    examples: "Examples: GET /boards.json, GET /boards/{boardId}.json (columns, lanes and tasks), POST /tasks.json {\"board_id\": …, "
      + "\"name\": \"…\", \"workflow_stage_id\": …}, PUT /tasks/{taskId}.json {…}, GET /tasks/{taskId}/comments.json.",
  },
  {
    id: "kanbanize", name: "Businessmap (Kanbanize)", category: "projects", description: "Kanban workflow management: boards, cards and users",
    website: "https://businessmap.io", docs: "https://businessmap.io/api", logo: { favicon: "https://businessmap.io" },
    baseUrl: "https://{subdomain}.kanbanize.com/api/v2",
    auth: { type: "header", name: "apikey" },
    fields: [{ id: "subdomain", label: "Subdomain", format: "subdomain",
               help: "The part before .kanbanize.com (or .businessmap.io) in your address." },
             { id: "token", label: "API key", secret: true }],
    help: "1) In Businessmap open your avatar → “API” and copy the key. 2) Enter your account subdomain here.",
    test: { path: "/me", account: (d) => d?.data?.email || d?.data?.username },
    examples: "Examples: GET /boards, GET /cards?board_ids=…&per_page=50, POST /cards {\"board_id\": …, \"workflow_id\": …, \"title\": \"…\"}, "
      + "PATCH /cards/{cardId} {…}, GET /boards/{boardId}/structure, GET /users.",
  },
  {
    id: "karakeep", name: "Karakeep", category: "productivity", description: "Self-hosted bookmarks, notes, lists and tags",
    website: "https://karakeep.app", docs: "https://docs.karakeep.app/api/karakeep-api", logo: { favicon: "https://karakeep.app" },
    baseUrl: "{url}/api/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true },
             { id: "url", label: "Karakeep URL", format: "url",
               help: "Use the root URL of your Karakeep instance, without /api/v1." }],
    help: "1) Sign in to your Karakeep instance. 2) Open “Settings” → “API Keys” and create or copy an API key. "
      + "3) Enter your instance's root URL below (without /api/v1) and paste the key.",
    test: { path: "/users/me", account: (d) => d?.email || d?.name },
    examples: "Examples: GET /bookmarks?limit=20, GET /bookmarks/search?q=…, POST /bookmarks {\"type\": \"link\", \"url\": \"https://…\"}, "
      + "GET /lists, GET /tags, GET /users/me. See the full reference at docs.karakeep.app/api/karakeep-api.",
  },
  {
    id: "kintone", name: "Kintone", category: "productivity", description: "No-code business apps: applications, records and fields",
    website: "https://kintone.com", docs: "https://kintone.dev/en/docs/kintone/rest-api/", logo: { favicon: "https://kintone.com" },
    baseUrl: "https://{server}/k/v1",
    // Kintone username and password in X-Cybozu-Authorization (base64 of username:password): gives access to all your apps.
    auth: { type: "signature", sign: ({ headers: headers, cred }) => {
      headers["X-Cybozu-Authorization"] = Buffer.from(`${cred.username}:${cred.token}`).toString("base64");
    } },
    fields: [{ id: "server", label: "Kintone domain", format: "domain", example: "example.kintone.com",
               help: "Your Kintone address: <company>.kintone.com or <company>.cybozu.com." },
             { id: "username", label: "Username (login)" }, { id: "token", label: "Password", secret: true }],
    help: "1) Enter your Kintone domain and the username and password you sign in with. 2) Conector only sees the apps that "
      + "user has access to; if your company uses single sign-on (SAML), ask for a user with a password.",
    test: { path: "/apps.json", query: { limit: 1 }, message: "Credentials are valid" },
    examples: "Examples: GET /apps.json, GET /app/form/fields.json?app=…, GET /records.json?app=…&query=Status in (\"Open\") limit 50, "
      + "POST /record.json {\"app\": 1, \"record\": {\"Title\": {\"value\": \"…\"}}}, PUT /record.json {\"app\": 1, \"id\": 10, \"record\": {…}}, "
      + "DELETE /records.json?app=…&ids[0]=….",
  },
  {
    id: "knack", name: "Knack", category: "productivity", description: "No-code databases and apps: objects and records",
    website: "https://www.knack.com", docs: "https://docs.knack.com/docs/introduction-to-the-api", logo: { favicon: "https://www.knack.com" },
    baseUrl: "https://api.knack.com/v1",
    auth: [{ type: "header", name: "X-Knack-Application-Id", field: "application" }, { type: "header", name: "X-Knack-REST-API-Key" }],
    fields: [{ id: "application", label: "Application ID" }, { id: "token", label: "REST API Key", secret: true }],
    help: "1) In the Knack builder open “Settings” → “API & Code”. 2) Copy the “Application ID” and the “API Key”.",
    test: { path: "/objects", message: (d) => count(d?.objects, "object", "objects") || "Credentials are valid" },
    examples: "Examples: GET /objects, GET /objects/{objectKey}/records?rows_per_page=25&filters=…, POST /objects/{objectKey}/records "
      + "{\"field_1\": \"…\"}, PUT /objects/{objectKey}/records/{recordId} {…}, DELETE /objects/{objectKey}/records/{recordId}.",
  },
  {
    id: "kontentai", name: "Kontent.ai", category: "ecommerce", description: "Headless CMS: types, elements, language variants and assets",
    website: "https://kontent.ai", docs: "https://kontent.ai/learn/docs/apis/openapi/management-api-v2/", logo: { favicon: "https://kontent.ai" },
    baseUrl: "https://manage.kontent.ai/v2/projects/{environment}",
    auth: { type: "bearer" },
    fields: [{ id: "environment", label: "Environment ID", format: "segment", example: "00000000-0000-0000-0000-000000000000" },
             { id: "token", label: "Management API key", secret: true }],
    help: "1) In Kontent.ai open “Project settings” → “API keys” → “Management API” and create a key. 2) Also copy the “Environment ID”.",
    test: { path: "/types", message: "API key is valid" },
    examples: "Examples: GET /types, GET /items, GET /items/{itemId}/variants, PUT /items/{itemId}/variants/codename/{language} {\"elements\": [{…}]}, "
      + "PUT /items/{itemId}/variants/codename/{language}/publish, GET /languages, GET /assets, GET /taxonomies.",
  },
  {
    id: "leexi", name: "Leexi", category: "crm", description: "AI sales call notes: calls, summaries and users",
    website: "https://www.leexi.ai", docs: "https://public-api.leexi.ai", logo: { favicon: "https://www.leexi.ai" },
    baseUrl: "https://public-api.leexi.ai/v1",
    auth: { type: "basic", usernameField: "username", passwordField: "token" },
    fields: [{ id: "username", label: "Key ID" }, { id: "token", label: "Key Secret", secret: true }],
    help: "1) In Leexi open “Settings” → “Company” → “API keys” and create a key. 2) Copy the “Key ID” and the “Key Secret”.",
    test: { path: "/users", message: "Credentials are valid" },
    examples: "Examples: GET /users, GET /calls?page=1&items=20, GET /calls/{uuid} (transcript, summary and topics), GET /meeting_events.",
  },
  {
    id: "lob", name: "Lob", category: "marketing", description: "Postal mail via API and address verification",
    website: "https://www.lob.com", docs: "https://docs.lob.com", logo: { favicon: "https://www.lob.com" },
    baseUrl: "https://api.lob.com/v1",
    auth: { type: "basic", usernameField: "token", fixedPassword: "" },
    fields: [{ id: "token", label: "API key (test_… or live_…)", secret: true }],
    keyUrl: "https://dashboard.lob.com/settings/api-keys",
    help: "1) In the Lob panel open “Settings” → “API Keys”. 2) Copy the test key (test_…, free) or the live key (live_…, it sends "
      + "mail and charges for real).",
    test: { path: "/addresses", query: { limit: 1 }, message: "API key is valid" },
    examples: "Examples: POST /us_verifications {\"primary_line\": \"…\", \"city\": \"…\", \"state\": \"…\", \"zip_code\": \"…\"}, "
      + "POST /intl_verifications {\"primary_line\": \"…\", \"country\": \"GB\", …}, POST /postcards {…}, POST /letters {…}, GET /letters?limit=20, "
      + "GET /addresses, POST /addresses {…}.",
  },
  {
    id: "lodgify", name: "Lodgify", category: "ecommerce", description: "Vacation rentals: properties, bookings, availability and rates",
    website: "https://www.lodgify.com", docs: "https://docs.lodgify.com", logo: { favicon: "https://www.lodgify.com" },
    baseUrl: "https://api.lodgify.com",
    auth: { type: "header", name: "X-ApiKey" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) In Lodgify open “Settings” → “Public API” and copy the key. 2) Paste it here.",
    test: { path: "/v2/properties", message: "API key is valid" },
    examples: "Examples: GET /v2/properties, GET /v2/reservations/bookings?page=1&size=50, GET /v2/availability/{propertyId}?start=…&end=…, "
      + "GET /v2/rates/calendar?HouseId=…&StartDate=…&EndDate=…, GET /v1/quote/{propertyId}?arrival=…&departure=…&roomTypes[0].Id=….",
  },
  {
    id: "lokalise", name: "Lokalise", category: "automation", description: "Translation and localization: projects, keys and files",
    website: "https://lokalise.com", docs: "https://developers.lokalise.com/reference/lokalise-rest-api", logo: { simpleIcons: "lokalise" },
    baseUrl: "https://api.lokalise.com/api2",
    auth: { type: "header", name: "X-Api-Token" },
    fields: [{ id: "token", label: "API token", secret: true }],
    keyUrl: "https://app.lokalise.com/profile#apitokens",
    help: "1) In Lokalise open your profile → “API tokens” and generate a token (read-only or read and write). 2) Copy it.",
    test: { path: "/projects", query: { limit: 1 }, message: "Token is valid" },
    examples: "Examples: GET /projects, GET /projects/{projectId}/keys?limit=100&include_translations=1, POST /projects/{projectId}/keys "
      + "{\"keys\": [{…}]}, GET /projects/{projectId}/languages, POST /projects/{projectId}/files/download {\"format\": \"json\"}, "
      + "POST /projects/{projectId}/files/upload {\"data\": \"<base64>\", \"filename\": \"en.json\", \"lang_iso\": \"en\"}.",
  },
  {
    id: "loopsso", name: "Loops", category: "marketing", description: "Email for SaaS: contacts, events and transactional sends",
    website: "https://loops.so", docs: "https://loops.so/docs/api-reference", logo: { favicon: "https://loops.so" },
    baseUrl: "https://app.loops.so/api/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://app.loops.so/settings?page=api",
    help: "1) In Loops open “Settings” → “API” and generate a key. 2) Copy it.",
    test: { path: "/api-key", account: (d) => d?.teamName },
    examples: "Examples: POST /contacts/create {\"email\": \"…\", \"firstName\": \"…\"}, PUT /contacts/update {…}, GET /contacts/find?email=…, "
      + "POST /events/send {\"email\": \"…\", \"eventName\": \"…\"}, POST /transactional {\"transactionalId\": \"…\", \"email\": \"…\", "
      + "\"dataVariables\": {…}}, GET /lists, GET /contacts/properties.",
  },
  {
    id: "mailtrap", name: "Mailtrap", category: "developer", description: "Email testing and sending: test inboxes and messages",
    website: "https://mailtrap.io", docs: "https://api-docs.mailtrap.io", logo: { favicon: "https://mailtrap.io" },
    baseUrl: "https://mailtrap.io/api",
    allowedOrigins: ["https://send.api.mailtrap.io", "https://sandbox.api.mailtrap.io", "https://bulk.api.mailtrap.io"],
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API token", secret: true }],
    keyUrl: "https://mailtrap.io/api-tokens",
    help: "1) In Mailtrap open “Settings” → “API Tokens” and create a token with the permissions you need. 2) Copy it.",
    test: { path: "/accounts", message: (d) => count(d, "account", "accounts") || "Token is valid" },
    examples: "Examples: GET /accounts, GET /accounts/{accountId}/inboxes, GET /accounts/{accountId}/inboxes/{inboxId}/messages, "
      + "GET /accounts/{accountId}/inboxes/{inboxId}/messages/{id}/body.html, POST https://send.api.mailtrap.io/api/send {\"from\": "
      + "{\"email\": \"…\"}, \"to\": [{\"email\": \"…\"}], \"subject\": \"…\", \"text\": \"…\"} (real send), "
      + "POST https://sandbox.api.mailtrap.io/api/send/{inboxId} (to a test inbox).",
  },
  {
    id: "mathpix", name: "Mathpix", category: "ai", description: "OCR for formulas, tables and scientific PDFs to LaTeX and Markdown",
    website: "https://mathpix.com", docs: "https://docs.mathpix.com", logo: { favicon: "https://mathpix.com" },
    baseUrl: "https://api.mathpix.com/v3",
    auth: [{ type: "header", name: "app_id", field: "application" }, { type: "header", name: "app_key" }],
    fields: [{ id: "application", label: "App ID" }, { id: "token", label: "App Key", secret: true }],
    keyUrl: "https://console.mathpix.com",
    help: "1) At console.mathpix.com create an organization and an API key. 2) Copy the “App ID” and the “App Key”. You are charged for "
      + "each image or page processed.",
    test: { path: "/pdf-results", query: { per_page: 1 }, message: "Credentials are valid" },
    examples: "Examples: POST /text {\"src\": \"https://…/formula.png\", \"formats\": [\"text\", \"latex_styled\"]}, POST /pdf {\"url\": "
      + "\"https://…/article.pdf\"}, GET /pdf/{pdfId} (status), GET /pdf/{pdfId}.mmd (Markdown), GET /pdf/{pdfId}.docx, GET /pdf-results.",
  },
  {
    id: "matterport", name: "Matterport", category: "design", description: "3D digital twins: models, tags and measurements (GraphQL)",
    website: "https://matterport.com", docs: "https://api.matterport.com/docs/reference", logo: { favicon: "https://matterport.com" },
    baseUrl: "https://api.matterport.com/api/models", graphql: { path: "/graph" },
    auth: { type: "basic", usernameField: "username", passwordField: "token" },
    fields: [{ id: "username", label: "Token ID" }, { id: "token", label: "Token Secret", secret: true }],
    help: "1) In Matterport open “Settings” → “Developer Tools” → “API Token Management” and generate a token. 2) Copy the “Token ID” and the "
      + "“Token Secret” (the secret is shown only once). The API requires an Enterprise or developer plan.",
    test: { method: "POST", path: "/graph", body: { query: "{ models { totalResults } }" },
              message: (d) => (d?.data?.models?.totalResults != null ? `${d.data.models.totalResults} models` : "Credentials are valid"),
              validate: (d) => {
                if (!d?.data) throw new Error(`Matterport: ${d?.errors?.[0]?.message || "invalid response"}`);
              } },
    examples: "The API is GraphQL (POST /graph): use matterport_graphql. Examples: { models(pageSize: 20) { results { id name created } } }, "
      + "{ model(id: \"…\") { name address { city } mattertags { label description } } }.",
  },
  {
    id: "mem", name: "Mem", category: "productivity", description: "AI notes: notes, collections and “mem it” to organize",
    website: "https://get.mem.ai", docs: "https://docs.mem.ai", logo: { favicon: "https://get.mem.ai" },
    baseUrl: "https://api.mem.ai/v2",
    auth: { type: "header", name: "Authorization", prefix: "ApiAccessToken " },
    fields: [{ id: "token", label: "API key", secret: true, example: "00000000-0000-4000-8000-000000000000" }],
    help: "1) In Mem open “Settings” → “API” and create a key. 2) Copy it.",
    test: { path: "/notes", query: { limit: 1 }, message: "API key is valid" },
    examples: "Examples: POST /mem-it {\"input\": \"…\"} (Mem saves and organizes the text), POST /notes {\"content\": \"# Title\\n…\"}, "
      + "GET /notes?limit=20, GET /notes/{noteId}, DELETE /notes/{noteId}, GET /collections, POST /collections {\"title\": \"…\"}.",
  },
  {
    id: "mem0", name: "Mem0", category: "ai", description: "Persistent memory for AI agents: memories and search",
    website: "https://mem0.ai", docs: "https://docs.mem0.ai/api-reference", logo: { favicon: "https://mem0.ai" },
    baseUrl: "https://api.mem0.ai",
    auth: { type: "header", name: "Authorization", prefix: "Token " },
    fields: [{ id: "token", label: "API key (m0-…)", secret: true }],
    keyUrl: "https://app.mem0.ai/dashboard/api-keys",
    help: "1) At app.mem0.ai open “API Keys” and create a key. 2) Copy it.",
    test: { path: "/v1/entities/", message: "API key is valid" },
    examples: "Examples: POST /v1/memories/ {\"messages\": [{\"role\": \"user\", \"content\": \"…\"}], \"user_id\": \"…\"}, "
      + "POST /v2/memories/search/ {\"query\": \"…\", \"filters\": {\"user_id\": \"…\"}}, GET /v1/memories/?user_id=…, "
      + "DELETE /v1/memories/{memoryId}/, GET /v1/entities/.",
  },
  {
    id: "mindbody", name: "Mindbody", category: "ecommerce", description: "Gyms, studios and spas: classes, clients and appointments",
    website: "https://www.mindbodyonline.com", docs: "https://developers.mindbodyonline.com/PublicDocumentation/V6", logo: { favicon: "https://www.mindbodyonline.com" },
    baseUrl: "https://api.mindbodyonline.com/public/v6",
    headers: (c) => ({ SiteId: c.site }),
    auth: { type: "header", name: "Api-Key" },
    fields: [{ id: "token", label: "API Key (developer)", secret: true },
             { id: "site", label: "Site ID", format: "segment", default: "-99", help: "-99 is Mindbody's test site." }],
    help: "1) At developers.mindbodyonline.com create a developer account and copy the “API Key”. 2) Enter the business's Site ID "
      + "(its owner must activate your access) or -99 for the test site.",
    test: { path: "/site/sites", message: "API key is valid" },
    examples: "Examples: GET /site/sites, GET /site/locations, GET /class/classes?StartDateTime=…&EndDateTime=…, GET /client/clients?SearchText=…, "
      + "POST /usertoken/issue {\"Username\": \"…\", \"Password\": \"…\"} (staff token for operations that require it), "
      + "GET /appointment/staffappointments?….",
  },
  {
    id: "mixmax", name: "Mixmax", category: "crm", description: "Email sales: sequences, messages, templates and meetings",
    website: "https://www.mixmax.com", docs: "https://developer.mixmax.com/reference", logo: { favicon: "https://www.mixmax.com" },
    baseUrl: "https://api.mixmax.com/v1",
    auth: { type: "header", name: "X-API-Token" },
    fields: [{ id: "token", label: "API token", secret: true }],
    keyUrl: "https://app.mixmax.com/dashboard/settings/personal/integrations",
    help: "1) In Mixmax open “Settings” → “Integrations” → “API” and create a token. 2) Copy it.",
    test: { path: "/users/me", account: (d) => d?.email || d?.name },
    examples: "Examples: GET /sequences, POST /sequences/{sequenceId}/recipients {\"recipients\": [{\"email\": \"…\", \"variables\": {…}}]}, "
      + "GET /messages?limit=20, GET /snippets, GET /meetingtypes, GET /livefeed?…, GET /rules.",
  },
  {
    id: "moco", name: "MOCO", category: "finance", description: "Time, projects and invoicing for agencies: activities and invoices",
    website: "https://www.mocoapp.com", docs: "https://everii-group.github.io/mocoapp-api-docs/", logo: { favicon: "https://www.mocoapp.com" },
    baseUrl: "https://{subdomain}.mocoapp.com/api/v1",
    auth: { type: "header", name: "Authorization", prefix: "Token token=" },
    fields: [{ id: "subdomain", label: "MOCO subdomain", format: "subdomain",
               help: "The part before .mocoapp.com in your address." },
             { id: "token", label: "Personal API key", secret: true }],
    help: "1) In MOCO open your profile → “Integrations” and copy the personal API key. 2) Enter your account subdomain.",
    test: { path: "/session", account: (d) => d?.firstname ? `${d.firstname} ${d.lastname || ""}`.trim() : null },
    examples: "Examples: GET /projects?include_archived=false, GET /activities?from=2026-10-01&to=2026-10-15, POST /activities {\"date\": "
      + "\"2026-10-15\", \"project_id\": …, \"task_id\": …, \"hours\": 1.5, \"description\": \"…\"}, GET /invoices, GET /companies, GET /users.",
  },
  {
    id: "motion", name: "Motion", category: "productivity", description: "AI planner: tasks, projects, workspaces and calendars",
    website: "https://www.usemotion.com", docs: "https://docs.usemotion.com", logo: { favicon: "https://www.usemotion.com" },
    baseUrl: "https://api.usemotion.com/v1",
    auth: { type: "header", name: "X-API-Key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) In Motion open “Settings” → “API” and create a key. 2) Copy it: it is shown only once. Limit: 12 requests per minute.",
    test: { path: "/users/me", account: (d) => d?.email || d?.name },
    examples: "Examples: GET /workspaces, GET /tasks?workspaceId=…, POST /tasks {\"name\": \"…\", \"workspaceId\": \"…\", \"dueDate\": "
      + "\"2026-10-20T17:00:00Z\", \"duration\": 30}, PATCH /tasks/{taskId} {…}, GET /projects?workspaceId=…, GET /schedules, GET /statuses.",
  },
  {
    id: "nanonets", name: "Nanonets", category: "ai", description: "OCR and document data extraction with trainable models",
    website: "https://nanonets.com", docs: "https://nanonets.com/documentation/", logo: { favicon: "https://nanonets.com" },
    baseUrl: "https://app.nanonets.com/api/v2",
    auth: { type: "basic", usernameField: "token", fixedPassword: "" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://app.nanonets.com/#/keys",
    help: "1) In Nanonets open “Account” → “API Keys” and copy the key. 2) Conector sends it as the Basic auth username with an empty password.",
    test: { path: "/OCR/Models/", message: (d) => count(d, "model", "models") || "API key is valid" },
    examples: "Examples: GET /OCR/Models/, GET /OCR/Model/{modelId}, POST /OCR/Model/{modelId}/LabelUrls/ with form "
      + "urls=https://…/invoice.pdf (extracts the data), GET /Inferences/Model/{modelId}/ImageLevelInferences?start_day_interval=…"
      + "&current_batch_day=… (results).",
  },
];
