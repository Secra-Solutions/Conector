// Batch 01 of the Composio catalog: automation, forms and API utilities. Form builders go under “productivity”, like
// Typeform, Jotform or SurveyMonkey. Customer-specific URLs (Crowdin Enterprise, CrewAI…) cannot be tested without real
// credentials: they were checked by hand against each service's documentation.

const LONG_TIMEOUT = 300_000; // ms: browser sessions, file conversions and AI apps can take minutes
const count = (n, singular, plural) => `${n} ${n === 1 ? singular : plural}`;
// “N items” if the response is a list; otherwise the fallback text.
const list = (d, one, many, fallback = "Credentials are valid") => (Array.isArray(d) ? count(d.length, one, many) : fallback);

export default [
  {
    id: "codekit", name: "0CodeKit", category: "automation",
    description: "API utilities: AI, PDF, image, validation and storage",
    website: "https://www.0codekit.com", docs: "https://docs.0codekit.com/api/0-codekit-api/", logo: { favicon: "https://www.0codekit.com" },
    baseUrl: "https://prod.0codekit.com", timeout: LONG_TIMEOUT,
    auth: { type: "header", name: "auth" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) Create an account at 0codekit.com (the free plan includes 250 credits per month) and sign in to the dashboard. "
      + "2) In your account tab, copy the API key. Each call uses credits depending on the operation (e.g. 50 for running "
      + "JavaScript). If you regenerate the key, update it in every automation that uses it.",
    test: { method: "POST", path: "/user/retrievecredits", body: {}, message: (d) => `${d?.credits ?? "?"} credits available` },
    examples: "All calls are POST with a JSON body. Examples: POST /user/retrievecredits {}, "
      + "POST /business/validate/email {\"email\": \"…\"}, POST /ai/translate {\"text\": \"…\", \"resultLang\": \"es\"}, "
      + "POST /convert/currency {\"sourceCurrency\": \"EUR\", \"targetCurrency\": \"USD\", \"amount\": 100}, "
      + "POST /pdf/html {\"url\": \"https://…\", \"getAsUrl\": true}.",
  },
  {
    id: "airtop", name: "Airtop", category: "automation",
    description: "Cloud browsers to automate and extract data from websites",
    website: "https://www.airtop.ai", docs: "https://docs.airtop.ai/api-reference", logo: { favicon: "https://www.airtop.ai" },
    baseUrl: "https://api.airtop.ai/api/v1", timeout: LONG_TIMEOUT,
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://portal.airtop.ai/api-keys",
    help: "1) Go to portal.airtop.ai/api-keys and sign in with your Airtop account. 2) Create an API key and copy it. Browser "
      + "sessions and AI queries use credits from your plan: close each session when you finish (DELETE /sessions/{id}); "
      + "otherwise it expires on its own after a few minutes of inactivity.",
    test: { path: "/sessions", query: { limit: 1 }, message: "API key is valid" },
    examples: "Responses are wrapped in “data”. Examples: GET /sessions?status=running, "
      + "POST /sessions {\"configuration\": {\"timeoutMinutes\": 10}}, POST /sessions/{id}/windows {\"url\": \"https://…\"}, "
      + "POST /sessions/{id}/windows/{windowId}/page-query {\"prompt\": \"…\"}, "
      + "POST /sessions/{id}/windows/{windowId}/scrape-content {}, DELETE /sessions/{id}.",
  },
  {
    id: "apilio", name: "Apilio", category: "automation",
    description: "Home automation: variables, conditions and logicblocks",
    website: "https://apilio.com", docs: "https://documenter.getpostman.com/view/13480928/TzCHAVD2", logo: { favicon: "https://apilio.com" },
    baseUrl: "https://api.apilio.com/api/v1",
    auth: { type: "basic", usernameField: "client_id", passwordField: "client_secret" },
    fields: [{ id: "client_id", label: "Client ID (API username)" },
             { id: "client_secret", label: "Client secret (API password)", secret: true }],
    help: "1) Access to the Apilio REST API is enabled with a paid plan (on the free trial you must upgrade the account). "
      + "2) In your Apilio account, open the API section and generate the credentials (Client ID and Secret). 3) Copy them: "
      + "they are sent as username and password (basic authentication). Writes (PUT) wrap the object in a key named after it, "
      + "e.g. {\"boolean_variable\": {\"value\": true}}.",
    test: { path: "/boolean_variables" },
    examples: "Examples: GET /boolean_variables, GET /numeric_variables, GET /string_variables/{uuid}, "
      + "PUT /boolean_variables/{uuid} {\"boolean_variable\": {\"value\": true}}, GET /conditions, GET /logicblocks, "
      + "POST /logicblocks/{uuid}/evaluate.",
  },
  {
    id: "basin", name: "Basin", category: "productivity", description: "Serverless forms: submissions, projects and webhooks",
    website: "https://usebasin.com", docs: "https://docs.usebasin.com/developer-features/api-reference/",
    logo: { favicon: "https://usebasin.com" },
    baseUrl: "https://usebasin.com/api/v1",
    auth: { type: "header", name: "Authorization", prefix: "Token " },
    fields: [{ id: "token", label: "API key (32 characters)", secret: true, example: "0123456789abcdef0123456789abcdef" }],
    keyUrl: "https://usebasin.com/app/api_settings",
    help: "1) You need a Growth, Pro or Agency plan: the API is not included in the free one. 2) In Basin, open “Account "
      + "Settings” → “API Settings” (usebasin.com/app/api_settings) and copy the account key, which sees all forms and projects. "
      + "Keys for a single form (“Form” → “Integrations” → “API”) only see that form and may fail the connection test.",
    test: { path: "/forms" },
    examples: "Examples: GET /forms?query=contact, GET /submissions/?form_id={id}&filter_by=new&order_by=date_desc, "
      + "GET /submissions/{id}, PATCH /submissions/{id} (spam, read or trash), GET /projects, GET /form_webhooks.",
  },
  {
    id: "bika", name: "Bika.ai", category: "automation",
    description: "Databases and automations: spaces, records and webhooks",
    website: "https://bika.ai", docs: "https://bika.ai/help/guide/developer/openapi", logo: { favicon: "https://bika.ai", initials: true, color: "#111827" },
    baseUrl: "https://bika.ai/api/openapi/bika/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API token", secret: true }],
    help: "1) Sign in at bika.ai. 2) In your user settings, find the developer / API section and generate a token. "
      + "3) Paste it here. To read or write records you need the space id (GET /spaces) and the id of the "
      + "database node.",
    test: { path: "/spaces", message: (d) => list(d?.data, "accessible space", "accessible spaces", "Token is valid") },
    examples: "Examples: GET /spaces, GET /spaces/{spaceId}/resources/databases/{nodeId}/records, "
      + "POST /spaces/{spaceId}/resources/databases/{nodeId}/records {\"cells\": {\"Name\": \"…\"}} (create), "
      + "PATCH …/records {\"id\": \"rec…\", \"cells\": {…}} (update), DELETE …/records/{recordId}, "
      + "GET /spaces/{spaceId}/resources/automation/{nodeId}/triggers.",
  },
  {
    id: "botster", name: "Botster", category: "automation",
    description: "Web data collection bots: launch, track and download",
    website: "https://botster.io", docs: "https://botster.io/info/api-docs", logo: { favicon: "https://botster.io" },
    baseUrl: "https://botster.io/api/v2",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API token", secret: true }],
    keyUrl: "https://botster.io/settings",
    help: "1) Sign in at botster.io. 2) Open botster.io/settings and copy your “API token” (you can reset it there at any "
      + "time). The bots API is in public beta. Launching or restarting a bot uses credits: check the balance first "
      + "(GET /credits).",
    test: { path: "/credits", message: "Token is valid" },
    examples: "Examples: GET /credits, GET /bots?search=scraping&page=1&per=50, GET /jobs?page=1&per=50, GET /jobs/{uuid}, "
      + "GET /runs/{uuid} (results of a run, as JSON).",
  },
  {
    id: "bouncer", name: "Bouncer", category: "automation",
    description: "Real-time and batch email verification",
    website: "https://www.usebouncer.com", docs: "https://docs.usebouncer.com", logo: { favicon: "https://www.usebouncer.com" },
    baseUrl: "https://api.usebouncer.com/v1.1",
    auth: { type: "header", name: "x-api-key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://app.usebouncer.com/member/api",
    help: "1) Sign in at app.usebouncer.com. 2) In the left menu, open “API” and click “Generate API Key”. "
      + "Each verification uses one credit (test emails @sandbox.usebouncer.com are free) and the balance check "
      + "allows 10 requests per minute.",
    test: { path: "/credits", message: (d) => `${d?.credits ?? "?"} credits available` },
    examples: "Examples: GET /email/verify?email=deliverable@sandbox.usebouncer.com&timeout=10 (1 credit), "
      + "GET /domain?domain=example.com (1 credit), POST /email/verify/batch [{\"email\": \"…\"}], "
      + "GET /email/verify/batch/{batchId}?with-stats=true, GET /email/verify/batch/{batchId}/download?download=all.",
  },
  {
    id: "browseract", name: "BrowserAct", category: "automation",
    description: "Cloud browser bots: run tasks and collect results",
    website: "https://www.browseract.com", docs: "https://docs.browseract.com/workflow/api-reference/bots/list-bots",
    logo: { favicon: "https://www.browseract.com" },
    baseUrl: "https://api.browseract.com",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) Open your BrowserAct dashboard and go to “Integrations”. 2) Click “Manage API Keys” → “Create New API Key”, give "
      + "it a name and choose whether the CLI should ask for confirmation on critical actions. 3) Copy the key. Running bots "
      + "uses credits from your plan.",
    test: { path: "/v3/bots", query: { limit: 1 } },
    examples: "Examples: GET /v3/bots?keyword=…&page=1&limit=20, GET /v3/bots/{bot_id}, POST /v3/bots/{bot_id}/runs (creates a task; "
      + "the body follows the bot's input_schema), GET /v3/bots/runs/{task_id}/status, GET /v3/bots/runs/{task_id}, "
      + "POST /v3/bots/runs/{task_id}/cancel, GET /v3/bots/templates.",
  },
  {
    id: "celigo", name: "Celigo", category: "automation", description: "iPaaS platform: integrations, flows and connections",
    website: "https://www.celigo.com", docs: "https://developer.celigo.com/api/getting-started/getting-started",
    logo: { favicon: "https://www.celigo.com" },
    baseUrl: "https://{server}/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "integrator.io API token", secret: true },
             { id: "server", label: "Region", default: "api.integrator.io",
               options: [["api.integrator.io", "US"], ["api.eu.integrator.io", "Europe"]],
               help: "The two environments are isolated: a US token does not work in Europe." }],
    help: "1) Sign in at integrator.io (or eu.integrator.io if your account is European). 2) Open “Resources” → “API tokens” → "
      + "“Generate token”. An administrator can create service tokens (full access or limited to certain resources); "
      + "any user can create a personal one with their own permissions. 3) Choose when it is deleted automatically (“Auto purge "
      + "token”) and copy the token: it is shown only once.",
    test: { path: "/tokenInfo", message: "Token is valid" },
    examples: "Examples: GET /tokenInfo, GET /integrations, GET /flows, GET /flows/{id}/errors, POST /flows/{id}/run (starts the flow), "
      + "GET /connections, GET /exports/{id}, GET /imports/{id}.",
  },
  {
    id: "checkflow", name: "CheckFlow", category: "automation",
    description: "Checklists and processes: templates, tasks and teams",
    website: "https://checkflow.io", docs: "https://docs.checkflow.io/docs/api-v3/overview", logo: { favicon: "https://checkflow.io" },
    baseUrl: "https://{server}/v3",
    auth: { type: "header", name: "X-API-KEY" },
    fields: [{ id: "token", label: "API key", secret: true },
             { id: "server", label: "Region", default: "api.checkflow.io",
               options: [["api.checkflow.io", "US"], ["api-eu.checkflow.io", "Europe"]],
               help: "The region of your workspace: a key sent to the other region is rejected (WRONG_REGION error)." }],
    keyUrl: "https://app.checkflow.io/team/api",
    help: "1) As a CheckFlow administrator, open “Team Management” → “API & Integrations” tab and click “Create API key”. "
      + "2) Give it a name and choose who it acts as: the workspace, an administrator or a member (the key has their "
      + "permissions and changes are recorded under their name); optionally add an expiration date. 3) Copy the key.",
    test: { path: "/auth/test", account: (d) => d?.teamName },
    examples: "Lists are paginated with a cursor (pageSize, after). Examples: GET /auth/test, GET /templates, GET /checklists, "
      + "POST /checklists {\"templateKey\": \"…\", \"name\": \"…\"} (with the Idempotency-Key header), POST /checklists/search, "
      + "GET /tags, GET /members, GET /webhooks.",
  },
  {
    id: "conveyor", name: "Conveyor", category: "security",
    description: "Automated security questionnaires and Trust Center",
    website: "https://www.conveyor.com", docs: "https://docs.conveyor.com/reference", logo: { favicon: "https://www.conveyor.com" },
    baseUrl: "https://api.conveyor.com/api",
    auth: { type: "header", name: "X-API-KEY" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://app.conveyor.com/settings/organization/integrations",
    help: "1) Sign in at app.conveyor.com as a Superadmin, a Conveyor Admin, or a user with admin-level access to the "
      + "“Integrations” module. 2) Open “Settings” → “Integrations” → “Add Integration”, choose “Conveyor API” at the end of "
      + "the list and click “Next Step”. 3) Give it a name, select the permissions and click “Create”: copy the key, because "
      + "it is shown only once. Limit: 2,000 requests every 5 minutes.",
    test: { path: "/v2/product_lines" },
    examples: "An invalid key returns 403 with no body. Examples: GET /v2/questionnaires?status=ready_for_review&page=1&per_page=50, "
      + "GET /v2/questionnaires/questions?questionnaire_id=…, GET /v2/knowledge_base/search?query_text=…, GET /v2/projects, "
      + "GET /v2/trust_center/conversations, GET /v2/audit_events/?start_date=2026-10-01, GET /v2/subprocessors.",
  },
  {
    id: "crewai", name: "CrewAI", category: "automation",
    description: "Run crews deployed on CrewAI AMP and check their status",
    website: "https://www.crewai.com", docs: "https://docs.crewai.com/en/api-reference/introduction", logo: { simpleIcons: "crewai" },
    baseUrl: "{url}", timeout: LONG_TIMEOUT,
    auth: { type: "bearer" },
    fields: [{ id: "url", label: "Crew URL (https://…crewai.com)", format: "url",
               help: "Each deployed crew has its own: it appears on its detail page in CrewAI AMP." },
             { id: "token", label: "Crew bearer token", secret: true }],
    help: "1) In CrewAI AMP, open the deployed crew and copy its URL (e.g. https://my-crew.crewai.com). 2) In that crew's "
      + "“Status” tab, copy the “Bearer Token” (organization-level access, for server-to-server integrations) or a “User "
      + "Bearer Token” (with a user's permissions). Each crew has its own URL and token: connect one per crew.",
    test: { path: "/inputs", message: (d) => `Crew inputs: ${(d?.inputs || []).join(", ") || "none"}` },
    examples: "Examples: GET /inputs (parameters the crew expects), POST /kickoff {\"inputs\": {\"topic\": \"…\"}} (starts a "
      + "run and returns kickoff_id), GET /status/{kickoff_id} (status and result).",
  },
  {
    id: "crowdin", name: "Crowdin", category: "automation",
    description: "Localization: projects, files, strings and translations",
    website: "https://crowdin.com", docs: "https://developer.crowdin.com/api/v2/", logo: { simpleIcons: "crowdin" },
    baseUrl: "https://{domain}/api/v2",
    derived: { domain: (c) => (c.organization ? `${c.organization}.api.crowdin.com` : "api.crowdin.com") },
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "Personal access token", secret: true },
             { id: "organization", label: "Organization (Crowdin Enterprise only)", optional: true, format: "subdomain",
               help: "The part before .crowdin.com in your Enterprise address. Leave it empty if you use crowdin.com." }],
    // Crowdin and Enterprise share accounts.crowdin.com; the token is requested as JSON, lasts 2 hours and is renewed with the refresh token.
    oauth: { scopes: ["project", "project.settings", "project.source", "project.translation", "project.status", "language", "tm",
                        "glossary"], fields: ["organization"],
      provider: { name: "Crowdin", key: "crowdin", redirect: "localhost", json: true,
        authorizeUrl: "https://accounts.crowdin.com/oauth/authorize", tokenUrl: "https://accounts.crowdin.com/oauth/token",
        help: "1) In Crowdin, click your profile picture → “Settings” → “OAuth” tab → “New Application” (in Crowdin Enterprise: "
          + "“Organization Settings” → “OAuth apps” → “New App”). 2) Name it “Conector”, paste the redirect URI shown below into "
          + "“Authorization callback URLs”, leave “Confidential” checked, select the scopes shown below and click “Create”. "
          + "3) In the application list, open the “Actions” menu → “Edit” and copy the “Client ID” and the “Client Secret”. "
          + "A new application only gives access to the projects of the account that created it (to open it to all of Crowdin "
          + "you must ask Crowdin support): connect with that same account. With Crowdin Enterprise, register the application "
          + "in your organization and enter its name when connecting." } },
    keyUrl: "https://crowdin.com/settings#api-key",
    help: "1) In Crowdin, click your profile picture → “Settings” → “API” tab (in Crowdin Enterprise: “Account Settings” → "
      + "“Access tokens”). 2) Click “New Token” (under “Personal Access Tokens”), give it a name and select the scopes you "
      + "need: projects, files, translations… 3) Copy the token: it is shown only once. With Crowdin Enterprise, also enter "
      + "your organization name.",
    test: { path: "/user", account: (d) => d?.data?.username || d?.data?.email },
    examples: "Responses are wrapped in “data”. Examples: GET /projects?limit=25, GET /projects/{projectId}/files, "
      + "GET /projects/{projectId}/languages/progress, GET /projects/{projectId}/strings?limit=100, "
      + "POST /projects/{projectId}/translations/builds (generates a translation package), GET /languages.",
  },
  {
    id: "detrack", name: "Detrack", category: "automation",
    description: "Delivery management: jobs, routes, depots and proof of delivery",
    website: "https://www.detrack.com", docs: "https://detrackapiv2.docs.apiary.io/", logo: { favicon: "https://www.detrack.com" },
    baseUrl: "https://app.detrack.com/api/v2",
    auth: { type: "header", name: "X-API-KEY" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) Sign in at Detrack (app.detrack.com). 2) Open “Integrations” → “API Key” and click “Generate a new API "
      + "Key”. 3) Copy it. To give access to third parties, create a sub-user with its own key instead of sharing the "
      + "owner's key. Limit: 60 requests per minute.",
    test: { path: "/dn/jobs", query: { limit: 1 } },
    examples: "Responses are wrapped in “data”. Examples: GET /dn/jobs?date=2026-10-20&limit=50&page=1, "
      + "GET /dn/jobs/show?do_number=DO12345&date=2026-10-20, "
      + "POST /dn/jobs {\"data\": {\"type\": \"Delivery\", \"do_number\": \"DO12345\", \"date\": \"2026-10-20\", \"address\": \"…\"}}, "
      + "POST /dn/jobs/search {\"data\": {\"do_number\": \"…\"}}, GET /dn/routes?date=2026-10-20, GET /dn/depots.",
  },
  {
    id: "dify", name: "Dify", category: "automation", description: "Published AI apps: run workflows and check their history",
    website: "https://dify.ai", docs: "https://docs.dify.ai", logo: { simpleIcons: "dify" },
    baseUrl: "{url}/v1", timeout: LONG_TIMEOUT,
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "App API key (app-…)", secret: true },
             { id: "url", label: "Dify URL", format: "url", default: "https://api.dify.ai",
               help: "https://api.dify.ai for Dify Cloud; for a self-hosted installation, its address (without /v1)." }],
    help: "1) In Dify, open the application you want to use (chatbot, agent, chatflow or workflow) and click “API Access” in the "
      + "side menu. 2) Click “API Key” → “Create new Secret key” and copy it: each app has its own keys and this "
      + "connection only sees that app. 3) With Dify Cloud, keep the default address; for a self-hosted installation, enter its URL.",
    test: { path: "/info", account: (d) => d?.name },
    examples: "Depends on the app type. Always use response_mode “blocking”. Examples: GET /info, GET /parameters, "
      + "POST /workflows/run {\"inputs\": {…}, \"response_mode\": \"blocking\", \"user\": \"conector\"}, "
      + "GET /workflows/run/{workflow_run_id}, GET /workflows/logs?limit=20, "
      + "POST /chat-messages {\"query\": \"…\", \"inputs\": {}, \"response_mode\": \"blocking\", \"user\": \"conector\"}.",
  },
  {
    id: "digitalhumani", name: "Digital Humani", category: "automation",
    description: "Reforestation: planting projects and planted trees",
    website: "https://digitalhumani.com", docs: "https://docs.digitalhumani.com", logo: { favicon: "https://digitalhumani.com" },
    baseUrl: "https://{server}",
    auth: { type: "header", name: "X-Api-Key" },
    fields: [{ id: "token", label: "API key", secret: true },
             { id: "server", label: "Environment", default: "api.sandbox.digitalhumani.com",
               options: [["api.sandbox.digitalhumani.com", "Sandbox (test, planting is free)"],
                          ["api.digitalhumani.com", "Production (planting costs money)"]],
               help: "Each environment has its own key: use the one for the selected environment." }],
    help: "1) Sign up at my.digitalhumani.com and open the “Developer” page of the dashboard: your API key and your "
      + "enterpriseId are there. 2) Production and Sandbox have different keys; start with Sandbox, where planting trees is free. "
      + "3) In production each tree costs 1 USD (paid to the reforestation organization), so a real POST /tree "
      + "costs money.",
    test: { path: "/project", message: (d) => list(d, "available project", "available projects") },
    examples: "Examples: GET /project (available projects), GET /enterprise/{enterpriseId}, GET /tree/{uuid}, "
      + "GET /tree?enterpriseId=…&user=… (a user's trees), "
      + "POST /tree {\"enterpriseId\": \"…\", \"projectId\": \"…\", \"user\": \"…\", \"treeCount\": 1} "
      + "(in production it costs 1 USD per tree).",
  },
  {
    id: "dnsfilter", name: "DNSFilter", category: "security",
    description: "DNS filtering: organizations, networks, policies and traffic reports",
    website: "https://www.dnsfilter.com", docs: "https://api.dnsfilter.com/docs", logo: { favicon: "https://www.dnsfilter.com" },
    baseUrl: "https://api.dnsfilter.com",
    auth: { type: "header", name: "Authorization" },
    fields: [{ id: "token", label: "API key (eyJ…)", secret: true }],
    help: "1) Sign in to the DNSFilter dashboard (app.dnsfilter.com). 2) Go to “Account Settings” → “Security” → “API Keys” "
      + "and generate a new key: each user can have up to 5 active keys, and a key is shown only once. 3) Copy it as is, "
      + "without the “Bearer” prefix. The key has your user's permissions.",
    test: { path: "/v1/current_user", account: (d) => d?.data?.attributes?.email || d?.data?.email },
    examples: "The version is part of the path. Examples: GET /v1/current_user, GET /v1/organizations, GET /v1/networks, GET /v1/policies, "
      + "GET /v1/categories, GET /v1/traffic_reports/total_requests, GET /v1/traffic_reports/total_threats.",
  },
  {
    id: "enforcedflow", name: "EnforcedFlow", category: "automation",
    description: "Advanced round-robin work distribution among agents",
    website: "https://enforcedflow.com", docs: "https://app.enforcedflow.com/docs/api", logo: { favicon: "https://enforcedflow.com" },
    baseUrl: "https://app.enforcedflow.com",
    auth: { type: "header", name: "Authorization" },
    fields: [{ id: "token", label: "Provider Key", secret: true }],
    help: "1) Sign in at app.enforcedflow.com. 2) From your account dashboard, generate a “Provider Key” and copy it. "
      + "It is sent as is in the Authorization header, without the “Bearer” prefix.",
    test: { path: "/api/v1/advanced-round-robin/groups", message: (d) => list(d?.data, "group", "groups", "Key is valid") },
    examples: "Examples: GET /api/v1/advanced-round-robin/groups, GET /api/v1/advanced-round-robin/{groupId}/fields, "
      + "GET /api/v1/advanced-round-robin/{groupId}/agents, "
      + "PUT /api/v1/advanced-round-robin/{groupId}/agents (creates or updates an agent), "
      + "POST /api/v1/advanced-round-robin/{groupId}/next-agent {\"language\": [\"English\"]} (picks an agent and advances the turn), "
      + "POST /api/v1/advanced-round-robin/{groupId}/email-next-agent (also sends the agent an email).",
  },
  {
    id: "feathery", name: "Feathery", category: "productivity",
    description: "Forms with advanced logic: forms, fields and submissions",
    website: "https://www.feathery.io", docs: "https://api-docs.feathery.io", logo: { favicon: "https://www.feathery.io" },
    baseUrl: "https://{server}/api",
    auth: { type: "header", name: "Authorization", prefix: "Token " },
    fields: [{ id: "token", label: "Environment API key", secret: true, example: "11111111-2222-3333-4444-555555555555" },
             { id: "server", label: "Region", default: "api.feathery.io",
               options: [["api.feathery.io", "US"], ["api-eu.feathery.io", "European Union"], ["api-ca.feathery.io", "Canada"],
                          ["api-au.feathery.io", "Australia"], ["api-jp.feathery.io", "Japan"]],
               help: "The region of your Feathery workspace." }],
    help: "1) Sign in to the Feathery dashboard and open “Settings”. 2) Copy the admin API key of the environment you work "
      + "with (sandbox or production): it is not the SDK key used to embed forms. 3) Choose your account's region below. "
      + "Anyone with the key can read and modify the data in that environment.",
    test: { path: "/form/" },
    examples: "Paths end in “/”. Examples: GET /form/, GET /form/{form_id}/ (form schema), "
      + "GET /form/submission/?form_id=…, POST /form/submission/ {\"fields\": {\"age\": 21}, \"user_id\": \"…\", \"forms\": [\"…\"]} "
      + "(creates or updates a submission), GET /user/ (end users), GET /field/, GET /account/.",
  },
  {
    id: "filloutforms", name: "Fillout", category: "productivity",
    description: "Forms and responses: read forms and manage submissions",
    website: "https://www.fillout.com", docs: "https://www.fillout.com/help/fillout-rest-api", logo: { simpleIcons: "fillout" },
    baseUrl: "https://{server}/v1/api",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true, example: "fake_123456" },
             { id: "server", label: "Region", default: "api.fillout.com",
               options: [["api.fillout.com", "US"], ["eu-api.fillout.com", "European Union"]],
               help: "European accounts use the EU address; your account's address appears in the developer dashboard." }],
    keyUrl: "https://build.fillout.com/home/settings/developer",
    help: "1) Sign in to Fillout and open “Settings” → “Developer” tab (build.fillout.com/home/settings/developer). 2) Copy "
      + "your API key; you can also regenerate or revoke it there. 3) Choose your account's region. Limit: 5 requests per second.",
    test: { path: "/forms", message: (d) => list(d, "form", "forms", "API key is valid") },
    examples: "Examples: GET /forms, GET /forms/{formId}, GET /forms/{formId}/submissions?limit=50&sort=desc, "
      + "GET /forms/{formId}/submissions/{submissionId}, "
      + "POST /forms/{formId}/submissions {\"submissions\": [{\"questions\": [{\"id\": \"…\", \"value\": \"…\"}]}]}.",
  },
  {
    id: "formcrafts", name: "Formcrafts", category: "productivity",
    description: "Online forms: forms, responses and uploaded files",
    website: "https://formcrafts.com", docs: "https://formcrafts.com/help/developers/api-docs-v2",
    logo: { favicon: "https://formcrafts.com" },
    baseUrl: "https://api.formcrafts.com/v2",
    auth: { type: "basic", usernameField: "token", fixedPassword: "" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) Sign in to Formcrafts and open “Organization” → “Settings” → “API Keys”. 2) Create a key and copy it. It is sent "
      + "as the Basic auth username, with an empty password.",
    test: { path: "/forms" },
    examples: "Examples: GET /forms?page=1, GET /forms/{formId}, GET /forms/{formId}/responses?page=1, GET /files, GET /workspaces.",
  },
  {
    id: "formdesk", name: "Formdesk", category: "productivity",
    description: "Online forms: forms, fields, visitors and results",
    website: "https://www.formdesk.com", docs: "https://formdesk.com/en/features/webservice-api/",
    logo: { favicon: "https://www.formdesk.com" },
    baseUrl: "https://{server}.formdesk.com/api/rest/v1/{folder}",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true },
             { id: "server", label: "Server (e.g. fd7)", format: "subdomain", example: "fd7",
               help: "The first part of the address you use to sign in to Formdesk: in https://fd7.formdesk.com/… it is “fd7”." },
             { id: "folder", label: "Forms folder (domain)", example: "fake-folder",
               help: "The unique name of your account: it comes right after the server in the address of your forms." }],
    help: "1) In Formdesk, open “User Management” and create or copy your API key. 2) The server (fd7, fd8…) and the forms "
      + "folder (also called “domain”, the unique name of your account) appear in the address when you sign in to Formdesk. "
      + "3) Almost every call uses 1 API credit (some use more if they return a lot of data): each account includes 100 "
      + "free credits and more can be purchased afterward (€50 for 5,000). The remaining balance is returned in the “Credits” header.",
    test: { path: "/forms" },
    examples: "Almost every call uses 1 credit. Examples: GET /forms (forms in the folder), GET /users, and each form's resources "
      + "under /forms/{formId}/… (fields, visitors, results): see the Formdesk REST v1 reference.",
  },
  {
    id: "formsite", name: "Formsite", category: "productivity",
    description: "Forms and surveys: forms, items and results",
    website: "https://www.formsite.com", docs: "https://support.formsite.com/hc/en-us/articles/360000288594-Formsite-API",
    logo: { favicon: "https://www.formsite.com" },
    baseUrl: "https://{server}.formsite.com/api/v2/{directory}",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API token", secret: true },
             { id: "server", label: "Server (e.g. fs3)", format: "subdomain", example: "fs1",
               help: "The first part of the address of your forms: in https://fs3.formsite.com/… it is “fs3”." },
             { id: "directory", label: "User directory", example: "fake-directory",
               help: "It comes after the server in the links to your forms: in https://fs3.formsite.com/example/form1/ it is “example”." }],
    help: "1) You need a Formsite Pro account. 2) Open the form → “Settings” → “Integrations” → “Formsite API”: that page "
      + "shows the token, the server and the user directory. 3) Paste them here. Limits: 50 calls per minute and 10,000 "
      + "per day.",
    test: { path: "/forms", message: (d) => list(d?.forms, "form", "forms", "Token is valid") },
    examples: "Examples: GET /forms, GET /forms/{form_dir}, GET /forms/{form_dir}/items (fields), "
      + "GET /forms/{form_dir}/results (responses), GET /forms/{form_dir}/webhooks, POST /forms/{form_dir}/webhooks.",
  },
  {
    id: "graphhopper", name: "GraphHopper", category: "automation",
    description: "Routing, matrices, isochrones, geocoding and fleet optimization",
    website: "https://www.graphhopper.com", docs: "https://docs.graphhopper.com", logo: { favicon: "https://www.graphhopper.com" },
    baseUrl: "https://graphhopper.com/api/1",
    auth: { type: "query", name: "key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://graphhopper.com/dashboard/api-keys",
    help: "1) Sign up at graphhopper.com and open the developer dashboard (graphhopper.com/dashboard). 2) Under “API Keys”, "
      + "create a key and copy it. The free account comes with a daily credit quota meant for development; paid plans "
      + "raise it and allow commercial use. 3) Each request uses credits (the connection test, 1); the "
      + "X-RateLimit-Remaining header shows how many are left.",
    test: { path: "/geocode", query: { q: "London", limit: 1 }, message: "API key is valid" },
    examples: "Examples: GET /route?point=40.4168,-3.7038&point=41.3874,2.1686&profile=car&locale=en, "
      + "GET /geocode?q=Trafalgar Square, London&limit=3, GET /isochrone?point=51.5080,-0.1281&time_limit=900&profile=car, "
      + "POST /vrp (fleet route optimization), POST /matrix (times and distances between points).",
  },
  {
    id: "hitl", name: "HITL.sh", category: "automation",
    description: "Human approval for AI agents: loops and review requests",
    website: "https://hitl.sh", docs: "https://docs.hitl.sh/api-reference/introduction", logo: { favicon: "https://hitl.sh" },
    baseUrl: "https://api.hitl.sh/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) Sign in at my.hitl.sh. 2) Open “Settings” → “API Keys” and click “Create New API Key”. 3) Copy the key right "
      + "away: it is shown only once. Each key allows 100 requests per hour.",
    test: { path: "/test", account: (d) => d?.data?.email },
    examples: "Examples: GET /test, GET /loops, POST /loops {\"name\": \"…\", \"icon\": \"shield-check\"}, "
      + "POST /loops/{loopId}/requests {\"processing_type\": \"time-sensitive\", \"type\": \"markdown\", \"priority\": \"medium\", "
      + "\"request_text\": \"…\", \"timeout_seconds\": 1800, \"response_type\": \"single_select\", \"response_config\": "
      + "{\"options\": [{\"value\": \"approve\", \"label\": \"Approve\"}, {\"value\": \"reject\", \"label\": \"Reject\"}], "
      + "\"required\": true}, \"default_response\": \"reject\", \"platform\": \"api\"}, GET /requests/{id}, "
      + "DELETE /requests/{id} (cancels).",
  },
];
