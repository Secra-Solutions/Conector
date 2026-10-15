// Batch 45 of the Composio catalog: PDF from templates, IPFS, online booking, postal mail, CMS, subscriptions,
// product management, projects, bookmarks, fundraising, reading, equipment rental, databases,
// time tracking, customer onboarding, inspections and appointment scheduling.

const count = (d, one, many) => (Array.isArray(d) ? `${d.length} ${d.length === 1 ? one : many}` : null);

export default [
  {
    id: "pdfless", name: "Pdfless", category: "productivity", description: "PDFs from HTML templates with dynamic data",
    website: "https://pdfless.com", docs: "https://docs.pdfless.com", logo: { favicon: "https://pdfless.com" },
    baseUrl: "https://api.pdfless.com/v1",
    auth: { type: "header", name: "apikey" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) In Pdfless open “Workspace settings” → “API keys” and create a key. 2) Copy it.",
    test: { path: "/document-templates", message: "API key is valid" },
    examples: "Examples: GET /document-templates, POST /pdfs {\"template_id\": \"…\", \"payload\": {\"customer\": \"…\"}} (returns the URL of the "
      + "PDF).",
  },
  {
    id: "pdfmonkey", name: "PDFMonkey", category: "productivity", description: "PDFs from templates: templates, documents and statuses",
    website: "https://www.pdfmonkey.io", docs: "https://docs.pdfmonkey.io", logo: { favicon: "https://www.pdfmonkey.io" },
    baseUrl: "https://api.pdfmonkey.io/api/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "Secret API key", secret: true }],
    keyUrl: "https://dashboard.pdfmonkey.io/account",
    help: "1) In PDFMonkey open “My Account” and copy the secret API key. 2) Paste it here.",
    test: { path: "/current_user", account: (d) => d?.current_user?.email },
    examples: "Examples: GET /document_templates, POST /documents {\"document\": {\"document_template_id\": \"…\", \"payload\": {…}, \"status\": "
      + "\"pending\"}} (generates the PDF), GET /documents/{id} (status and download_url), GET /document_cards?q[document_template_id]=…, "
      + "DELETE /documents/{id}.",
  },
  {
    id: "pinata", name: "Pinata", category: "developer", description: "IPFS storage: files, pins and metadata",
    website: "https://pinata.cloud", docs: "https://docs.pinata.cloud", logo: { favicon: "https://pinata.cloud" },
    baseUrl: "https://api.pinata.cloud",
    allowedOrigins: ["https://uploads.pinata.cloud"],
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key JWT", secret: true }],
    keyUrl: "https://app.pinata.cloud/developers/api-keys",
    help: "1) In Pinata open “API Keys” → “New Key”, choose the permissions and create it. 2) Copy the “JWT” (it is shown only once).",
    test: { path: "/data/testAuthentication", message: "JWT is valid" },
    examples: "Examples: GET /v3/files/public?limit=20, GET /v3/files/public/{id}, DELETE /v3/files/public/{id}, "
      + "POST /pinning/pinJSONToIPFS {\"pinataContent\": {…}, \"pinataMetadata\": {\"name\": \"…\"}}, GET /data/pinList?status=pinned&pageLimit=10, "
      + "DELETE /pinning/unpin/{cid}; file uploads at https://uploads.pinata.cloud/v3/files.",
  },
  {
    id: "planyo", name: "Planyo", category: "ecommerce", description: "Online booking: resources, reservations, availability and customers",
    website: "https://www.planyo.com", docs: "https://www.planyo.com/api.php", logo: { favicon: "https://www.planyo.com" },
    baseUrl: "https://www.planyo.com/rest",
    auth: { type: "query", name: "api_key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) In Planyo open “Settings” → “Integration” → “API key” and generate the key. 2) Copy it.",
    // Planyo always answers 200; response_code 0 means success and 1 an invalid key or method.
    test: { path: "/", query: { method: "get_site_info" }, account: (d) => d?.data?.name,
              validate: (d) => {
                if (d?.response_code !== 0) throw new Error(`Planyo: ${d?.response_message || "invalid response"}`);
              } },
    examples: "Everything goes in the query string with method=…. Examples: GET /?method=list_resources, GET /?method=list_reservations&start_time=2026-10-01"
      + "&end_time=2026-10-31, GET /?method=get_reservation_data&reservation_id=…, GET /?method=can_make_reservation&resource_id=…&start_time=…"
      + "&end_time=…&quantity=1, GET /?method=make_reservation&…, GET /?method=list_users.",
  },
  {
    id: "postgrid", name: "PostGrid", category: "marketing", description: "Postal mail via API and address verification",
    website: "https://www.postgrid.com", docs: "https://docs.postgrid.com", logo: { favicon: "https://www.postgrid.com" },
    baseUrl: "https://api.postgrid.com/print-mail/v1",
    auth: { type: "header", name: "x-api-key" },
    fields: [{ id: "token", label: "API key (test_… or live_…)", secret: true }],
    help: "1) In the PostGrid dashboard open “Settings” → “API Keys”. 2) Copy the test key (test_…) or the live one (live_…, which sends mail and charges).",
    test: { path: "/contacts", query: { limit: 1 }, message: "API key is valid" },
    examples: "Examples: POST /contacts {\"firstName\": \"…\", \"addressLine1\": \"…\", \"city\": \"…\", \"countryCode\": \"ES\"}, POST /letters "
      + "{\"to\": \"contact_…\", \"from\": \"contact_…\", \"pdf\": \"https://…\"}, POST /postcards {…}, GET /letters?limit=20, GET /templates, "
      + "POST https://api.postgrid.com/v1/addver/verifications {\"address\": {…}} (address verification).",
  },
  {
    id: "prismic", name: "Prismic", category: "ecommerce", description: "Headless CMS: custom types, slices and published content",
    website: "https://prismic.io", docs: "https://prismic.io/docs/custom-types-api", logo: { simpleIcons: "prismic" },
    baseUrl: "https://customtypes.prismic.io",
    allowedOrigins: ["https://{repositorio}.cdn.prismic.io"],
    headers: (c) => ({ repository: c.repositorio }),
    auth: { type: "bearer" },
    fields: [{ id: "repositorio", label: "Repository name", format: "subdomain",
               help: "The part before .prismic.io in the address of your repository." },
             { id: "token", label: "Write token (Write API)", secret: true }],
    help: "1) In Prismic open “Settings” → “API & Security” → “Write APIs” and generate a token. 2) Enter the repository name here.",
    test: { path: "/customtypes", message: (d) => count(d, "type", "types") || "Token is valid" },
    examples: "Examples: GET /customtypes, GET /customtypes/{id}, POST /customtypes/insert {…}, POST /customtypes/update {…}, GET /slices; "
      + "published content: GET https://{repository}.cdn.prismic.io/api/v2 (master ref) and GET https://{repository}.cdn.prismic.io/api/v2"
      + "/documents/search?ref=…&q=[[at(document.type,\"blog_post\")]].",
  },
  {
    id: "proabono", name: "ProAbono", category: "finance", description: "Subscriptions and recurring billing: customers, offers and sign-ups",
    website: "https://www.proabono.com", docs: "https://docs.proabono.com/api/", logo: { favicon: "https://www.proabono.com" },
    baseUrl: "https://{server}/v1",
    auth: { type: "basic", usernameField: "username", passwordField: "token" },
    fields: [{ id: "username", label: "Agent Key" }, { id: "token", label: "API Key", secret: true },
             { id: "server", label: "API endpoint", default: "api-2.proabono.com", format: "domain",
               help: "The one shown next to your keys in ProAbono (e.g. api-2.proabono.com)." }],
    help: "1) In ProAbono open “Integration” → “API” and copy the “Agent Key”, the “API Key” and the endpoint. 2) Paste them here.",
    test: { path: "/Customers", query: { SizePage: 1 }, message: "Credentials are valid" },
    examples: "Examples: GET /Customers?SizePage=20, GET /Customer?ReferenceCustomer=…, POST /Customer {\"ReferenceCustomer\": \"…\", "
      + "\"Name\": \"…\", \"Email\": \"…\"}, GET /Offers, GET /Subscriptions?ReferenceCustomer=…, POST /Subscription {…}.",
  },
  {
    id: "productboard", name: "Productboard", category: "projects", description: "Product management: features, customer notes and roadmap",
    website: "https://www.productboard.com", docs: "https://developer.productboard.com", logo: { favicon: "https://www.productboard.com" },
    baseUrl: "https://api.productboard.com",
    headers: { "X-Version": "1" },
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "Access token", secret: true }],
    help: "1) In Productboard open “Workspace settings” → “Integrations” → “Public API” and generate a token. 2) Copy it.",
    test: { path: "/features", query: { pageLimit: 1 }, message: "Token is valid" },
    examples: "Examples: GET /features?pageLimit=50, POST /features {\"data\": {\"name\": \"…\", \"type\": \"feature\", \"status\": {\"name\": "
      + "\"Candidate\"}, \"parent\": {\"component\": {\"id\": \"…\"}}}}, GET /notes, POST /notes {\"title\": \"…\", \"content\": \"…\", "
      + "\"customer_email\": \"…\"}, GET /components, GET /products, GET /releases.",
  },
  {
    id: "projectbubble", name: "Project Bubble", category: "projects", description: "Project management: projects, tasks, users and time entries",
    website: "https://www.projectbubble.com", docs: "https://www.projectbubble.com/api", logo: { favicon: "https://www.projectbubble.com" },
    baseUrl: "https://api.projectbubble.com/v2",
    headers: (c) => ({ domain: c.domain }),
    auth: { type: "header", name: "key" },
    fields: [{ id: "token", label: "API key", secret: true },
             { id: "domain", label: "Subdomain", format: "subdomain",
               help: "The part before .projectbubble.com in the address of your account." }],
    help: "1) In Project Bubble open “Settings” → “API” and copy the key. 2) Enter your account subdomain here.",
    test: { path: "/users", message: "API key is valid" },
    examples: "Examples: GET /projects, GET /tasks?project_id=…, POST /tasks {\"project_id\": …, \"task_name\": \"…\"}, GET /users, "
      + "GET /time_entries?….",
  },
  {
    id: "raindrop", name: "Raindrop.io", category: "productivity", description: "Bookmarks: collections, saved links and tags",
    website: "https://raindrop.io", docs: "https://developer.raindrop.io", logo: { simpleIcons: "raindrop" },
    baseUrl: "https://api.raindrop.io/rest/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "Test token", secret: true }],
    keyUrl: "https://app.raindrop.io/settings/integrations",
    help: "1) In Raindrop.io open “Settings” → “Integrations” → “Create new app” and, in the app you created, click “Create test token”. 2) Copy "
      + "the token: it gives access to your account.",
    test: { path: "/user", account: (d) => d?.user?.email || d?.user?.fullName },
    examples: "Examples: GET /collections, GET /raindrops/0?search=…&perpage=25 (0 = all bookmarks), POST /raindrop {\"link\": "
      + "\"https://…\", \"title\": \"…\", \"tags\": [\"…\"], \"collection\": {\"$id\": …}}, PUT /raindrop/{id} {…}, DELETE /raindrop/{id}, "
      + "GET /tags.",
  },
  {
    id: "raisely", name: "Raisely", category: "marketing", description: "Fundraising: campaigns, donations and profiles",
    website: "https://raisely.com", docs: "https://developers.raisely.com", logo: { favicon: "https://raisely.com" },
    baseUrl: "https://api.raisely.com/v3",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) In Raisely open “Settings” → “API & Webhooks” and copy the secret key. 2) Paste it here.",
    test: { path: "/users/me", account: (d) => d?.data?.email || d?.data?.fullName },
    examples: "Examples: GET /campaigns, GET /campaigns/{path}/donations?limit=20, GET /campaigns/{path}/profiles, GET /donations/{uuid}, "
      + "GET /users?campaign=….",
  },
  {
    id: "readwise", name: "Readwise Reader", category: "productivity", description: "Reading and highlights: saved documents, notes and books",
    website: "https://readwise.io", docs: "https://readwise.io/reader_api", logo: { favicon: "https://readwise.io" },
    baseUrl: "https://readwise.io/api",
    auth: { type: "header", name: "Authorization", prefix: "Token " },
    fields: [{ id: "token", label: "Access token", secret: true }],
    keyUrl: "https://readwise.io/access_token",
    help: "1) Open readwise.io/access_token with your Readwise account. 2) Copy the token: it works for Reader and for highlights.",
    test: { path: "/v2/auth/", message: "Token is valid" },
    examples: "Examples: GET /v3/list/?location=new (Reader), POST /v3/save/ {\"url\": \"https://…\", \"tags\": [\"…\"]}, PATCH /v3/update/{id}/ "
      + "{\"location\": \"archive\"}, GET /v2/export/?updatedAfter=… (highlights), POST /v2/highlights/ {\"highlights\": [{\"text\": \"…\", "
      + "\"title\": \"…\"}]}, GET /v2/books/.",
  },
  {
    id: "rentman", name: "Rentman", category: "projects", description: "Event equipment rental: equipment, projects and crew",
    website: "https://rentman.io", docs: "https://api.rentman.net", logo: { favicon: "https://rentman.io" },
    baseUrl: "https://api.rentman.net",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API token", secret: true }],
    help: "1) In Rentman open “Configuration” → “Extensions” → “API” and generate a token. 2) Copy it.",
    test: { path: "/equipment", query: { limit: 1 }, message: "Token is valid" },
    examples: "Examples: GET /equipment?limit=50, GET /projects?limit=20, GET /projects/{id}/projectequipment, GET /contacts, POST /contacts "
      + "{…}, GET /crew, GET /crewavailability?….",
  },
  {
    id: "retable", name: "Retable", category: "productivity", description: "Collaborative spreadsheets: workspaces, projects and tables",
    website: "https://www.retable.io", docs: "https://www.retable.io/docs/api", logo: { favicon: "https://www.retable.io" },
    baseUrl: "https://api.retable.io/v1/public",
    auth: { type: "header", name: "ApiKey" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) In Retable open your profile → “API” and generate a key. 2) Copy it.",
    test: { path: "/workspace", message: "API key is valid" },
    examples: "Examples: GET /workspace, GET /workspace/{workspaceId}/project, GET /project/{projectId}/retable, GET /retable/{retableId}/data, "
      + "POST /retable/{retableId}/data {\"data\": [{\"columns\": [{\"column_id\": \"…\", \"cell_value\": \"…\"}]}]}.",
  },
  {
    id: "rize", name: "Rize", category: "productivity", description: "Automatic time tracking: sessions, projects and focus (GraphQL)",
    website: "https://rize.io", docs: "https://rize.io/docs/api", logo: { favicon: "https://rize.io" },
    baseUrl: "https://api.rize.io/api/v1", graphql: { path: "/graphql" },
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API token", secret: true }],
    help: "1) In Rize open “Settings” → “API” and create a token. 2) Copy it.",
    test: { method: "POST", path: "/graphql", body: { query: "{ currentUser { email name } }" }, account: (d) => d?.data?.currentUser?.email,
              validate: (d) => {
                if (!d?.data?.currentUser) throw new Error(`Rize: ${d?.errors?.[0]?.message || "did not return your user"}`);
              } },
    examples: "The API is GraphQL (POST /graphql): use rize_graphql. Examples: { currentUser { email name } }, { projects { id name } }, "
      + "{ sessions(startTime: \"2026-10-15T00:00:00Z\", endTime: \"2026-10-16T00:00:00Z\") { id title startTime endTime } }.",
  },
  {
    id: "rocketlane", name: "Rocketlane", category: "projects", description: "Customer onboarding: projects, tasks and hours",
    website: "https://www.rocketlane.com", docs: "https://developer.rocketlane.com", logo: { favicon: "https://www.rocketlane.com" },
    baseUrl: "https://api.rocketlane.com/api/1.0",
    auth: { type: "header", name: "api-key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) In Rocketlane open “Settings” → “API” and generate a key. 2) Copy it.",
    test: { path: "/projects", query: { pageSize: 1 }, message: "API key is valid" },
    examples: "Examples: GET /projects?pageSize=20, GET /projects/{projectId}, GET /tasks?projectId.eq=…, POST /tasks {\"taskName\": \"…\", "
      + "\"project\": {\"projectId\": …}}, GET /users, GET /time-entries?…, POST /time-entries {…}.",
  },
  {
    id: "safetyculture", name: "SafetyCulture", category: "productivity", description: "Inspections and safety (iAuditor): audits and actions",
    website: "https://safetyculture.com", docs: "https://developer.safetyculture.com/reference", logo: { favicon: "https://safetyculture.com" },
    baseUrl: "https://api.safetyculture.io",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API token", secret: true }],
    help: "1) In SafetyCulture open your profile → “Integrations” → “API Tokens” and generate a token (Premium or Enterprise plan). 2) Copy it.",
    test: { path: "/accounts/user/v1/user:WhoAmI", account: (d) => d?.email || d?.firstname },
    examples: "Examples: GET /audits/search?field=audit_id&field=modified_at&modified_after=2026-10-01T00:00:00Z, GET /audits/{auditId}, "
      + "GET /templates/search?field=template_id&field=name, POST /audits {\"template_id\": \"…\"}, GET /tasks/v1/actions?…, "
      + "GET /users/search?….",
  },
  {
    id: "oncehub", name: "OnceHub (ScheduleOnce)", category: "productivity", description: "Online appointment scheduling: bookings, pages and event types",
    website: "https://www.oncehub.com", docs: "https://developers.oncehub.com/reference", logo: { favicon: "https://www.oncehub.com" },
    baseUrl: "https://api.oncehub.com/v2",
    auth: { type: "header", name: "API-Key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) In OnceHub open “Settings” → “API & Webhooks” and copy the key. 2) Paste it here.",
    test: { path: "/users", message: "API key is valid" },
    examples: "Examples: GET /bookings?limit=20&starting_time.gt=…, GET /bookings/{id}, GET /booking-pages, GET /master-pages, GET /event-types, "
      + "GET /users, POST /webhooks {\"name\": \"…\", \"url\": \"https://…\", \"events\": [\"booking\"]}.",
  },
];
