// Batch 21 of the catalog, from the Composio catalog: technical SEO, databases, errors and incidents, testing, scraping, screenshots,
// search, servers, images, code signing, translation, CMS, proxies, code, certificates and monitoring.

const count = (d, one, many) => (Array.isArray(d) ? `${d.length} ${d.length === 1 ? one : many}` : null);

export default [
  {
    id: "prerender", name: "Prerender", category: "ecommerce", description: "SEO prerendering: recache URLs and search cached pages",
    website: "https://prerender.io", docs: "https://docs.prerender.io/docs/api", logo: { favicon: "https://prerender.io" },
    baseUrl: "https://api.prerender.io",
    // The Prerender API only reads the token from inside the JSON body (prerenderToken).
    auth: { type: "body", name: "prerenderToken" },
    fields: [{ id: "token", label: "Prerender token", secret: true }],
    help: "1) In the Prerender dashboard open “Security and Access” (or “Settings”). 2) Copy the “Prerender Token” of your account. 3) "
      + "Recache calls use rendering quota depending on your plan.",
    test: { method: "POST", path: "/search", body: { query: "", start: 0, num: 1 }, message: "Prerender token is valid" },
    examples: "All calls are POST with JSON (Conector adds the token). Examples: POST /search {\"query\": \"/blog\", \"start\": 0, "
      + "\"num\": 50} (cached URLs), POST /recache {\"url\": \"https://…\"}, POST /recache {\"urls\": [\"https://…\", \"https://…\"]}, "
      + "POST /search {\"query\": \"…\", \"exactMatch\": true}.",
  },
  {
    id: "prisma", name: "Prisma Data Platform", category: "data", description: "Prisma Postgres: workspaces, projects, databases and connections",
    website: "https://www.prisma.io", docs: "https://www.prisma.io/docs/postgres/introduction/management-api", logo: { simpleIcons: "prisma" },
    baseUrl: "https://api.prisma.io/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "Service token", secret: true }],
    help: "1) In the Prisma console (console.prisma.io) open your workspace → “Settings” → “Service Tokens”. 2) Click “New Service "
      + "Token”, give it a name and copy it: it is shown only once. 3) It gives access to the management API of that workspace.",
    test: { path: "/workspaces", message: (d) => count(d?.data, "workspace", "workspaces") || "Service token is valid" },
    examples: "Examples: GET /workspaces, GET /projects, POST /projects {\"name\": \"…\", \"region\": \"eu-central-1\"}, "
      + "GET /projects/{id}/databases, POST /databases/{databaseId}/connections {\"name\": \"…\"} (connection string), DELETE /projects/{id}.",
  },
  {
    id: "purechecker", name: "PureChecker", category: "marketing", description: "Email verification: syntax, domain and mailbox",
    website: "https://purechecker.com", docs: "https://purechecker.com/docs", logo: { favicon: "https://purechecker.com" },
    baseUrl: "https://purechecker.com/api/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) Create an account at purechecker.com and open the API section of your dashboard. 2) Generate a key and copy it. 3) Each verification "
      + "uses one credit; so does the connection test.",
    test: { path: "/single-check", query: { email: "info@purechecker.com" }, message: "API key is valid" },
    examples: "Examples: GET /single-check?email=… (verifies one address), POST /bulk-check {\"emails\": [\"…\", \"…\"]} (batch).",
  },
  {
    id: "redirectpizza", name: "redirect.pizza", category: "ecommerce", description: "Domain and URL redirects with automatic HTTPS",
    website: "https://redirect.pizza", docs: "https://redirect.pizza/docs", logo: { favicon: "https://redirect.pizza" },
    baseUrl: "https://redirect.pizza/api/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API token", secret: true }],
    help: "1) In redirect.pizza open your account → “API tokens”. 2) Create a token and copy it. 3) The API is available on paid plans.",
    test: { path: "/redirects", message: (d) => count(d?.data, "redirect", "redirects") || "API token is valid" },
    examples: "Examples: GET /redirects, GET /redirects/{id}, POST /redirects {\"sources\": [\"old.example.com\"], \"destination\": \"https://new.example.com\", "
      + "\"redirect_type\": \"permanent\", \"uri_forwarding\": true}, PUT /redirects/{id}, DELETE /redirects/{id}.",
  },
  {
    id: "rollbar", name: "Rollbar", category: "developer", description: "Application errors: projects, items and deploys",
    website: "https://rollbar.com", docs: "https://docs.rollbar.com/reference", logo: { simpleIcons: "rollbar" },
    baseUrl: "https://api.rollbar.com/api/1",
    auth: { type: "header", name: "X-Rollbar-Access-Token" },
    fields: [{ id: "token", label: "Account access token (read)", secret: true }],
    help: "1) In Rollbar open the account “Settings” → “Account Access Tokens”. 2) Create a token with the “read” scope (and “write” if you are "
      + "going to resolve items) and copy it. 3) To query the items of a specific project a project token also works "
      + "(“Project Access Tokens” → “read”), but then the connection test will fail.",
    test: { path: "/projects", message: (d) => count(d?.result, "project", "projects") || "Access token is valid" },
    examples: "Examples: GET /projects, GET /items?status=active&level=error (with a project token), GET /item/{id}, "
      + "PATCH /item/{id} {\"status\": \"resolved\"}, GET /deploys, POST /deploy {\"environment\": \"production\", \"revision\": \"…\"}.",
  },
  {
    id: "rootly", name: "Rootly", category: "developer", description: "Incident management: incidents, alerts, on-call and retrospectives",
    website: "https://rootly.com", docs: "https://docs.rootly.com/api-reference/overview", logo: { favicon: "https://rootly.com" },
    baseUrl: "https://api.rootly.com/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) In Rootly open “Organization Settings” → “API Keys” and click “Generate New API Key”. 2) Choose the scope (global, team "
      + "or personal) and copy it.",
    test: { path: "/users/me", account: (d) => d?.data?.attributes?.email || d?.data?.attributes?.name },
    examples: "JSON:API format. Examples: GET /incidents?page[size]=20&sort=-created_at, GET /incidents/{id}, POST /incidents {\"data\": "
      + "{\"type\": \"incidents\", \"attributes\": {\"title\": \"…\", \"severity_id\": \"…\"}}}, GET /alerts, GET /schedules, GET /services.",
  },
  {
    id: "rudderstack", name: "RudderStack (transformations)", category: "data", description: "RudderStack event transformations and libraries",
    website: "https://www.rudderstack.com", docs: "https://www.rudderstack.com/docs/api/transformation-api/", logo: { favicon: "https://www.rudderstack.com" },
    baseUrl: "https://api.rudderstack.com",
    auth: { type: "basic", usernameField: "email", passwordField: "token" },
    fields: [{ id: "email", label: "Your RudderStack account email" },
             { id: "token", label: "Personal access token", secret: true }],
    help: "1) In RudderStack open “Settings” → “Your Profile” → “Account” → “Personal Access Tokens” and generate a token with "
      + "admin permissions. 2) Enter your account email and the token here.",
    test: { path: "/transformations", message: (d) => count(d?.transformations, "transformation", "transformations") || "Credentials are valid" },
    examples: "Examples: GET /transformations, GET /transformations/{id}, POST /transformations {\"name\": \"…\", \"code\": \"…\", "
      + "\"language\": \"javascript\"}, POST /transformations/test {\"input\": [{…}], \"code\": \"…\"}, GET /libraries.",
  },
  {
    id: "saucelabs", name: "Sauce Labs", category: "developer", description: "Cloud testing: jobs, builds, users and devices",
    website: "https://saucelabs.com", docs: "https://docs.saucelabs.com/dev/api/", logo: { simpleIcons: "saucelabs" },
    baseUrl: "https://{server}",
    auth: { type: "basic", usernameField: "username", passwordField: "token" },
    fields: [{ id: "username", label: "Sauce Labs username" },
             { id: "token", label: "Access key", secret: true },
             { id: "server", label: "Data center", default: "api.us-west-1.saucelabs.com",
               options: [["api.us-west-1.saucelabs.com", "US West"], ["api.us-east-4.saucelabs.com", "US East"],
                          ["api.eu-central-1.saucelabs.com", "European Union"]] }],
    keyUrl: "https://app.saucelabs.com/user-settings",
    help: "1) In Sauce Labs open your account → “User Settings”. 2) Copy your username and the “Access Key”. 3) Choose the data center of your "
      + "account here.",
    test: { path: "/team-management/v1/users/me", account: (d) => d?.email || d?.username },
    examples: "Examples: GET /rest/v1/{username}/jobs?limit=20, GET /rest/v1/{username}/jobs/{jobId}, GET /v2/builds/vdc/?limit=20, "
      + "GET /v1/rdc/devices/available, GET /team-management/v1/users/, GET /rest/v1.2/users/{username}/concurrency.",
  },
  {
    id: "scrapingbee", name: "ScrapingBee", category: "data", description: "Scraping with a browser and rotating proxies",
    website: "https://www.scrapingbee.com", docs: "https://www.scrapingbee.com/documentation/", logo: { favicon: "https://www.scrapingbee.com" },
    baseUrl: "https://app.scrapingbee.com/api/v1",
    auth: { type: "query", name: "api_key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://app.scrapingbee.com/account/manage/api_key",
    help: "1) Create an account at scrapingbee.com (it includes 1,000 trial credits). 2) Copy the API key from your dashboard. 3) Each "
      + "request uses credits depending on the options (render_js, premium_proxy…); the connection test does not.",
    test: { path: "/usage", message: (d) => (d?.max_api_credit ? `${d.used_api_credit ?? 0} of ${d.max_api_credit} credits used` : "API key is valid") },
    examples: "Examples: GET /?url=https://…&render_js=false, GET /?url=…&extract_rules={\"title\":\"h1\"}, GET /?url=…&screenshot=true, "
      + "GET /store/google?search=…, GET /usage.",
  },
  {
    id: "screenshotone", name: "ScreenshotOne", category: "ecommerce", description: "Website and HTML screenshots as images or PDF",
    website: "https://screenshotone.com", docs: "https://screenshotone.com/docs/", logo: { favicon: "https://screenshotone.com" },
    baseUrl: "https://api.screenshotone.com",
    auth: { type: "query", name: "access_key" },
    fields: [{ id: "token", label: "Access key", secret: true }],
    keyUrl: "https://dash.screenshotone.com/access",
    help: "1) Create an account at screenshotone.com (the free plan includes 100 screenshots per month). 2) In “Access” copy the “Access Key”. "
      + "3) Each screenshot counts against the quota; the connection test does not.",
    // Key errors come back with 200 and is_successful: false.
    test: { path: "/usage",
              validate: (d) => { if (d?.is_successful === false) throw new Error(`ScreenshotOne: ${d.error_message || d.error_code}`); },
              message: (d) => (d?.total != null ? `${d.used ?? 0} of ${d.total} screenshots used` : "Access key is valid") },
    examples: "Examples: GET /take?url=https://…&format=png&viewport_width=1280&full_page=true, GET /take?html=…&format=pdf, "
      + "GET /take?url=…&block_cookie_banners=true&block_ads=true, GET /usage.",
  },
  {
    id: "serper", name: "Serper", category: "marketing", description: "Google results via API: web, news, images and places",
    website: "https://serper.dev", docs: "https://serper.dev/playground", logo: { favicon: "https://serper.dev" },
    baseUrl: "https://google.serper.dev",
    auth: { type: "header", name: "X-API-KEY" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) Create an account at serper.dev (it includes 2,500 free searches). 2) In “API Keys” copy the key. 3) Each search uses "
      + "credits; the connection test checks the balance.",
    test: { path: "/account", message: (d) => (d?.balance != null ? `Credits available: ${d.balance}` : "API key is valid") },
    examples: "Examples: POST /search {\"q\": \"…\", \"gl\": \"us\", \"hl\": \"en\", \"num\": 10}, POST /news {\"q\": \"…\"}, "
      + "POST /images {\"q\": \"…\"}, POST /places {\"q\": \"restaurants New York\"}, POST /autocomplete {\"q\": \"…\"}.",
  },
  {
    id: "serveravatar", name: "ServerAvatar", category: "developer", description: "Server management: applications, databases and SSL",
    website: "https://serveravatar.com", docs: "https://serveravatar.com/api-docs", logo: { favicon: "https://serveravatar.com" },
    baseUrl: "https://api.serveravatar.com",
    auth: { type: "header", name: "Authorization" },
    fields: [{ id: "token", label: "API token", secret: true }],
    help: "1) In the ServerAvatar dashboard open your profile → “API Tokens”. 2) Create a token and copy it: it is shown only once.",
    test: { path: "/organizations", message: (d) => count(d?.organizations, "organization", "organizations") || "API token is valid" },
    examples: "Examples: GET /organizations, GET /organizations/{orgId}/servers, GET /organizations/{orgId}/servers/{serverId}/applications, "
      + "POST /organizations/{orgId}/servers/{serverId}/applications {…}, GET /organizations/{orgId}/servers/{serverId}/databases.",
  },
  {
    id: "shortpixel", name: "ShortPixel", category: "ecommerce", description: "Image and PDF optimization and compression",
    website: "https://shortpixel.com", docs: "https://shortpixel.com/api-docs", logo: { favicon: "https://shortpixel.com" },
    baseUrl: "https://api.shortpixel.com/v2",
    // The key goes in the URL for queries and inside the JSON for optimizations (POST).
    auth: [{ type: "query", name: "key" }, { type: "body", name: "key" }],
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) Create an account at shortpixel.com (100 free images per month). 2) Copy the API key shown in your dashboard and in the "
      + "welcome email. 3) Each optimized image uses one credit; the connection test does not.",
    // Errors come back with 200 and a negative Status.Code.
    test: { path: "/api-status.php",
              validate: (d) => { if (Number(d?.Status?.Code) < 0) throw new Error(`ShortPixel: ${d.Status.Message}`); },
              message: (d) => (d?.APICallsMade != null ? `${d.APICallsMade} of ${d.APICallsQuota} credits used` : "API key is valid") },
    examples: "Examples: GET /api-status.php (credits), POST /reducer.php {\"plugin_version\": \"conector\", \"lossy\": 1, \"urllist\": [\"https://…/photo.jpg\"]} "
      + "(optimizes by URL; Conector adds the key to the body), GET /cleanup.php.",
  },
  {
    id: "signpath", name: "SignPath", category: "security", description: "Code signing: signing requests, projects and policies",
    website: "https://about.signpath.io", docs: "https://about.signpath.io/documentation/build-system-integration", logo: { favicon: "https://about.signpath.io" },
    baseUrl: "https://app.signpath.io/API/v1/{organization}",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API token", secret: true },
             { id: "organization", label: "Organization ID", format: "segment", example: "c2099ac1-b4b5-4b30-934e-3933c2d9922d",
               help: "It appears in the SignPath URL and in the organization's “Settings”." }],
    help: "1) In SignPath open “Users and Groups” and create a CI user (or use your own) → “Generate API Token”. 2) Copy the token and the "
      + "organization ID. 3) The user needs the role that allows submitting signing requests in the projects you use.",
    test: { path: "/SigningRequests", query: { top: 1 }, acceptStatus: [403], message: "API token is valid" },
    examples: "Examples: GET /SigningRequests/{id}, POST /SigningRequests (multipart with ProjectSlug, SigningPolicySlug and the artifact), "
      + "GET /SigningRequests/{id}/SignedArtifact, POST /SigningRequests/{id}/Resubmit.",
  },
  {
    id: "simplelocalize", name: "SimpleLocalize", category: "productivity", description: "Translations: keys, languages, environments and publishing",
    website: "https://simplelocalize.io", docs: "https://simplelocalize.io/docs/api/get-started/", logo: { simpleIcons: "simplelocalize" },
    baseUrl: "https://api.simplelocalize.io/api",
    auth: { type: "header", name: "X-SimpleLocalize-Token" },
    fields: [{ id: "token", label: "Project API key", secret: true }],
    help: "1) In SimpleLocalize open the project → “Settings” → “Credentials”. 2) Copy the project's “API Key”.",
    test: { path: "/v2/environments", message: "API key is valid" },
    examples: "Examples: GET /v2/translations?language=en, PATCH /v2/translations {\"translations\": [{\"key\": \"…\", \"language\": \"en\", "
      + "\"text\": \"…\"}]}, GET /v1/languages, GET /v2/environments, POST /v2/environments/_latest/publish, GET /v2/jobs.",
  },
  {
    id: "siteleaf", name: "Siteleaf", category: "ecommerce", description: "CMS for Jekyll sites: sites, pages, collections and publishing",
    website: "https://www.siteleaf.com", docs: "https://learn.siteleaf.com/api/", logo: { favicon: "https://www.siteleaf.com" },
    baseUrl: "https://api.siteleaf.com/v2",
    auth: { type: "basic", usernameField: "username", passwordField: "token" },
    fields: [{ id: "username", label: "API key" }, { id: "token", label: "API secret", secret: true }],
    help: "1) In Siteleaf open your account → “API keys” and click “Generate API key”. 2) Copy the key and the secret (the secret is shown "
      + "only once).",
    test: { path: "/sites", message: (d) => count(d, "site", "sites") || "Credentials are valid" },
    examples: "Examples: GET /sites, GET /sites/{id}/pages, GET /sites/{id}/collections/{collection}/documents, POST /sites/{id}/pages "
      + "{\"title\": \"…\", \"body\": \"…\"}, POST /sites/{id}/publish.",
  },
  {
    id: "smartproxy", name: "Decodo (formerly Smartproxy)", category: "data", description: "Proxies and scraping: subscriptions, users and traffic",
    website: "https://decodo.com", docs: "https://help.decodo.com/reference/public-api-key-authentication", logo: { favicon: "https://decodo.com" },
    baseUrl: "https://api.decodo.com/v2",
    auth: { type: "header", name: "Authorization" },
    fields: [{ id: "token", label: "Public API key", secret: true }],
    help: "1) In the Decodo dashboard (formerly Smartproxy) open “Settings” → “API keys”. 2) Generate a public API key and copy it.",
    test: { path: "/subscriptions", message: "API key is valid" },
    examples: "Examples: GET /subscriptions, GET /sub-users?service_type=residential_proxies, POST /sub-users {\"username\": \"…\", "
      + "\"password\": \"…\", \"service_type\": \"residential_proxies\"}, GET /statistics/traffic?…, GET /endpoints.",
  },
  {
    id: "sourcegraph", name: "Sourcegraph", category: "developer", description: "Code search and intelligence across all repositories",
    website: "https://sourcegraph.com", docs: "https://sourcegraph.com/docs/api/graphql", logo: { favicon: "https://sourcegraph.com" },
    baseUrl: "{url}/.api", graphql: { path: "/graphql" },
    auth: { type: "header", name: "Authorization", prefix: "token " },
    fields: [{ id: "url", label: "Your Sourcegraph URL", format: "url", default: "https://sourcegraph.com",
               help: "https://sourcegraph.com or the URL of your instance (e.g. https://sourcegraph.example.com)." },
             { id: "token", label: "Access token", secret: true }],
    help: "1) In Sourcegraph open your profile → “Settings” → “Access tokens” and click “Generate new token”. 2) Copy the token (it starts with "
      + "sgp_): it is shown only once.",
    test: { method: "POST", path: "/graphql", body: { query: "{ currentUser { username email } }" },
              account: (d) => d?.data?.currentUser?.email || d?.data?.currentUser?.username },
    examples: "Examples: POST /graphql {\"query\": \"{ search(query: \\\"repo:… lang:go func main\\\", version: V3) { results { matchCount } } }\"} "
      + "(better with sourcegraph_graphql), GET /search/stream?q=… (streaming results), POST /graphql with repositories(first: 20).",
  },
  {
    id: "certspotter", name: "Cert Spotter (SSLMate)", category: "security", description: "Certificates issued for your domains (transparency logs)",
    website: "https://sslmate.com/certspotter/", docs: "https://sslmate.com/help/reference/ct_search_api_v1", logo: { favicon: "https://sslmate.com" },
    baseUrl: "https://api.certspotter.com/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://sslmate.com/account/api_keys",
    help: "1) Create an account at sslmate.com and open “Account” → “API Keys”. 2) Copy the API key. 3) Without a key there is a small "
      + "quota; with one, the quota of your plan applies.",
    test: { path: "/issuances", query: { domain: "example.com", expand: "dns_names" }, message: "API key is valid" },
    examples: "Examples: GET /issuances?domain=example.com&include_subdomains=true&expand=dns_names&expand=issuer, "
      + "GET /issuances?domain=…&after={id} (pagination), GET /issuances?domain=…&match_wildcards=true.",
  },
  {
    id: "statsig", name: "Statsig", category: "developer", description: "Feature gates, experiments, dynamic configs and metrics",
    website: "https://www.statsig.com", docs: "https://docs.statsig.com/console-api/introduction", logo: { favicon: "https://www.statsig.com" },
    baseUrl: "https://statsigapi.net/console/v1",
    auth: { type: "header", name: "STATSIG-API-KEY" },
    fields: [{ id: "token", label: "Console API key", secret: true }],
    help: "1) In the Statsig console open “Project Settings” → “Keys & Environments”. 2) Create a “Console API Key” (not the client key or "
      + "the server key) and copy it.",
    test: { path: "/gates", query: { limit: 1 }, message: "Console API key is valid" },
    examples: "Examples: GET /gates, GET /gates/{id}, PATCH /gates/{id} {\"isEnabled\": false}, GET /experiments, "
      + "GET /dynamic_configs, GET /metrics/list.",
  },
  {
    id: "statuscake", name: "StatusCake", category: "developer", description: "Website uptime, speed and SSL monitoring",
    website: "https://www.statuscake.com", docs: "https://developers.statuscake.com/api/", logo: { favicon: "https://www.statuscake.com" },
    baseUrl: "https://api.statuscake.com/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) In StatusCake open “Account” → “Manage API Keys” and create a key. 2) Copy it: Conector sends it as a Bearer token.",
    test: { path: "/uptime", query: { limit: 1 }, message: "API key is valid" },
    examples: "Examples: GET /uptime, GET /uptime/{id}, GET /uptime/{id}/history?limit=20, POST /uptime with a form containing name, test_type=HTTP, "
      + "website_url, check_rate=300, GET /ssl, GET /pagespeed.",
  },
];
