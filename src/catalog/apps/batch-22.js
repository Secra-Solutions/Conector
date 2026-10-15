// Batch 22 of the catalog (from the Composio catalog): webhooks, API design, background jobs, remote commands, DevOps, captchas,
// networking, feature flags, monitoring, web development AI, phone numbers, identity, databases, scraping and images.

const count = (d, one, many) => (Array.isArray(d) ? `${d.length} ${d.length === 1 ? one : many}` : null);

export default [
  {
    id: "svix", name: "Svix", category: "developer", description: "Webhooks: applications, endpoints, messages and retries",
    website: "https://www.svix.com", docs: "https://api.svix.com/docs", logo: { favicon: "https://www.svix.com" },
    baseUrl: "https://{server}/api/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "Authentication key (testsk_… or sk_…)", secret: true },
             { id: "server", label: "Region", default: "api.svix.com",
               options: [["api.svix.com", "Global (api.svix.com)"], ["api.eu.svix.com", "European Union"], ["api.us.svix.com", "US"],
                          ["api.ca.svix.com", "Canada"], ["api.au.svix.com", "Australia"], ["api.in.svix.com", "India"]],
               help: "The region of your environment: the end of the key indicates it (e.g. .eu)." }],
    keyUrl: "https://dashboard.svix.com/api-access",
    help: "1) In the Svix dashboard open “API Access”. 2) Create a key for the environment you use (testing or production) and copy it. "
      + "3) Choose the region of the environment here.",
    test: { path: "/app", query: { limit: 1 }, message: "Authentication key is valid" },
    examples: "Examples: GET /app?limit=20, POST /app {\"name\": \"…\", \"uid\": \"…\"}, POST /app/{appId}/msg {\"eventType\": \"invoice.created\", "
      + "\"payload\": {…}}, GET /app/{appId}/endpoint, POST /app/{appId}/endpoint {\"url\": \"https://…\"}, GET /app/{appId}/msg?limit=20.",
  },
  {
    id: "swaggerhub", name: "SwaggerHub", category: "developer", description: "API design: OpenAPI definitions, versions and organizations",
    website: "https://swagger.io/tools/swaggerhub/", docs: "https://app.swaggerhub.com/apis-docs/swagger-hub/registry-api", logo: { simpleIcons: "swagger" },
    baseUrl: "https://api.swaggerhub.com",
    auth: { type: "header", name: "Authorization" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://app.swaggerhub.com/settings/apiKey",
    help: "1) In SwaggerHub open your account → “Settings” → “API Key”. 2) Copy the key (or generate a new one).",
    test: { path: "/user-management/v1/orgs", message: "API key is valid" },
    examples: "Examples: GET /apis/{owner}, GET /apis/{owner}/{api}, GET /apis/{owner}/{api}/{version} (definition), "
      + "POST /apis/{owner}/{api} (YAML or JSON body with the right Content-Type), GET /specs?query=…&limit=20, GET /user-management/v1/orgs.",
  },
  {
    id: "triggerdev", name: "Trigger.dev", category: "automation", description: "Background jobs: runs, retries and schedules",
    website: "https://trigger.dev", docs: "https://trigger.dev/docs/management/overview", logo: { favicon: "https://trigger.dev" },
    baseUrl: "https://api.trigger.dev",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "Environment secret key (tr_dev_… or tr_prod_…)", secret: true }],
    help: "1) In the Trigger.dev dashboard open your project → “API Keys”. 2) Copy the “Secret key” of the environment you want to use (development, "
      + "staging or production).",
    test: { path: "/api/v1/runs", query: { "page[size]": 1 }, message: "Secret key is valid" },
    examples: "Examples: GET /api/v1/runs?page[size]=20&filter[status]=FAILED, GET /api/v3/runs/{runId}, POST /api/v1/tasks/{taskId}/trigger "
      + "{\"payload\": {…}}, POST /api/v2/runs/{runId}/cancel, POST /api/v1/runs/{runId}/replay, GET /api/v1/schedules.",
  },
  {
    id: "triggercmd", name: "TRIGGERcmd", category: "automation", description: "Run commands on your computers from the cloud",
    website: "https://www.triggercmd.com", docs: "https://docs.triggercmd.com", logo: { favicon: "https://www.triggercmd.com" },
    baseUrl: "https://www.triggercmd.com/api",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "TRIGGERcmd token", secret: true }],
    help: "1) Sign in to triggercmd.com → “Instructions” (or your profile) and copy your token. 2) Conector only runs the commands you have "
      + "defined in the agent on each computer.",
    test: { path: "/computer/list", message: (d) => count(d?.records, "computer", "computers") || "Token is valid" },
    examples: "Examples: GET /computer/list, GET /command/list?computer_id=…, POST /run/triggerSave {\"computer\": \"…\", \"trigger\": \"…\", "
      + "\"params\": \"…\"} (runs a command), GET /run/list?computer_id=….",
  },
  {
    id: "turbotpipes", name: "Turbot Pipes", category: "security", description: "SQL queries to the cloud (Steampipe), dashboards and automations",
    website: "https://turbot.com/pipes", docs: "https://turbot.com/pipes/docs/openapi", logo: { favicon: "https://turbot.com" },
    baseUrl: "https://pipes.turbot.com/api/v0",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API token (tpt_…)", secret: true, example: "tpt_c8l1ad4pc3jldm7mtehgabcdefghijklmnop12345" }],
    keyUrl: "https://pipes.turbot.com/user/settings/tokens",
    help: "1) In Turbot Pipes open your profile → “Settings” → “Tokens” and click “New Token”. 2) Copy the token (it starts with tpt_).",
    test: { path: "/actor", account: (d) => d?.handle || d?.display_name },
    examples: "Examples: GET /actor, GET /actor/workspace, GET /user/{handle}/workspace/{workspace}/connection, "
      + "POST /user/{handle}/workspace/{workspace}/query {\"sql\": \"select * from aws_s3_bucket limit 10\"}, "
      + "GET /org/{org}/workspace/{workspace}/pipeline.",
  },
  {
    id: "twocaptcha", name: "2Captcha", category: "automation", description: "Captcha solving: tasks, results and balance",
    website: "https://2captcha.com", docs: "https://2captcha.com/api-docs", logo: { favicon: "https://2captcha.com" },
    baseUrl: "https://api.2captcha.com",
    // The 2Captcha v2 API only reads the key inside the JSON (clientKey); errors arrive with 200 and errorId.
    auth: { type: "body", name: "clientKey" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://2captcha.com/enterpage",
    help: "1) Sign in to 2captcha.com and open your dashboard. 2) Copy the “API Key”. 3) Each solved captcha is charged to the balance; the "
      + "connection test only checks the balance.",
    test: { method: "POST", path: "/getBalance",
              validate: (d) => { if (d?.errorId) throw new Error(`2Captcha: ${d.errorDescription || d.errorCode}`); },
              message: (d) => (d?.balance != null ? `Balance: ${d.balance} USD` : "API key is valid") },
    examples: "All calls are POST with JSON (Conector adds clientKey). Examples: POST /createTask {\"task\": {\"type\": "
      + "\"RecaptchaV2TaskProxyless\", \"websiteURL\": \"…\", \"websiteKey\": \"…\"}}, POST /getTaskResult {\"taskId\": …}, POST /getBalance.",
  },
  {
    id: "unifi", name: "UniFi", category: "developer", description: "Ubiquiti networks: consoles, sites, devices and metrics",
    website: "https://ui.com", docs: "https://developer.ui.com/site-manager-api/", logo: { simpleIcons: "ubiquiti" },
    baseUrl: "https://api.ui.com",
    auth: { type: "header", name: "X-API-Key" },
    fields: [{ id: "token", label: "Site Manager API key", secret: true }],
    keyUrl: "https://unifi.ui.com/settings/api-keys",
    help: "1) At unifi.ui.com open “Settings” → “API Keys” (Site Manager). 2) Click “Create API Key” and copy the key: it is shown only "
      + "once. 3) It gives read access to all the consoles of your account.",
    test: { path: "/v1/hosts", message: (d) => count(d?.data, "console", "consoles") || "API key is valid" },
    examples: "Examples: GET /v1/hosts, GET /v1/hosts/{id}, GET /v1/sites, GET /v1/devices, GET /ea/isp-metrics/5m?duration=24h, "
      + "GET /ea/sd-wan-configs.",
  },
  {
    id: "unleash", name: "Unleash", category: "developer", description: "Feature flags: projects, environments, strategies and metrics",
    website: "https://www.getunleash.io", docs: "https://docs.getunleash.io/reference/api/unleash", logo: { favicon: "https://www.getunleash.io" },
    baseUrl: "{url}/api",
    auth: { type: "header", name: "Authorization" },
    fields: [{ id: "url", label: "Your Unleash URL", format: "url",
               help: "The URL of your instance, e.g. https://us.app.unleash-hosted.com/example or that of your own server." },
             { id: "token", label: "Admin or personal token", secret: true }],
    help: "1) In Unleash open your profile → “View profile settings” → “Personal API tokens” (or, as an administrator, “Admin” → “API access” → "
      + "“Admin token”). 2) Create the token and copy it. 3) Enter the URL of your instance here.",
    test: { path: "/admin/projects", message: (d) => count(d?.projects, "project", "projects") || "Token is valid" },
    examples: "Examples: GET /admin/projects, GET /admin/projects/{projectId}/features, GET /admin/projects/{projectId}/features/{flag}, "
      + "POST /admin/projects/{projectId}/features/{flag}/environments/{env}/on, POST …/off, GET /admin/search/features?query=….",
  },
  {
    id: "updownio", name: "updown.io", category: "developer", description: "Website monitoring: checks, downtimes and metrics",
    website: "https://updown.io", docs: "https://updown.io/api", logo: { favicon: "https://updown.io" },
    baseUrl: "https://updown.io/api",
    auth: { type: "query", name: "api-key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://updown.io/settings/edit",
    help: "1) In updown.io open “Settings”. 2) Copy the “API key” (the full one, not the read-only one, if you will create or change checks).",
    test: { path: "/checks", message: (d) => count(d, "check", "checks") || "API key is valid" },
    examples: "Examples: GET /checks, GET /checks/{token}, GET /checks/{token}/downtimes, GET /checks/{token}/metrics?from=…, "
      + "POST /checks with a form url=https://…&period=60, PUT /checks/{token}, DELETE /checks/{token}.",
  },
  {
    id: "vzero", name: "v0", category: "ai", description: "Vercel AI to build websites and components: chats and projects",
    website: "https://v0.app", docs: "https://v0.app/docs/api/platform", logo: { simpleIcons: "v0" },
    baseUrl: "https://api.v0.dev/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "v0 API key", secret: true }],
    keyUrl: "https://v0.app/settings/keys",
    help: "1) In v0 open “Settings” → “Keys” and create an API key. 2) Copy it. 3) The API needs a paid v0 plan and each message "
      + "uses credits.",
    test: { path: "/user", account: (d) => d?.email || d?.name },
    examples: "Examples: GET /projects, POST /chats {\"message\": \"Create a landing page for …\"}, GET /chats/{chatId}, "
      + "POST /chats/{chatId}/messages {\"message\": \"…\"}, GET /user/billing.",
  },
  {
    id: "veriphone", name: "Veriphone", category: "data", description: "Phone validation: format, line type, carrier and country",
    website: "https://veriphone.io", docs: "https://veriphone.io/docs/v2", logo: { favicon: "https://veriphone.io" },
    baseUrl: "https://api.veriphone.io/v2",
    auth: { type: "query", name: "key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) Create an account at veriphone.io (it includes 1,000 free verifications per month). 2) Copy the API key from your dashboard. "
      + "3) Each verification uses one; the connection test does too.",
    test: { path: "/verify", query: { phone: "+12025550123" }, message: "API key is valid" },
    examples: "Examples: GET /verify?phone=+14155550100, GET /verify?phone=4155550100&default_country=US, GET /example?type=mobile&country_code=US.",
  },
  {
    id: "workos", name: "WorkOS", category: "security", description: "Enterprise identity: SSO, directories, organizations and users",
    website: "https://workos.com", docs: "https://workos.com/docs/reference", logo: { favicon: "https://workos.com" },
    baseUrl: "https://api.workos.com",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "Secret key (sk_…)", secret: true }],
    keyUrl: "https://dashboard.workos.com/api-keys",
    help: "1) In the WorkOS dashboard open “API Keys” for the environment you use (staging or production). 2) Copy the “Secret key” (sk_…).",
    test: { path: "/organizations", query: { limit: 1 }, message: "Secret key is valid" },
    examples: "Examples: GET /organizations?limit=20, POST /organizations {\"name\": \"…\", \"domain_data\": [{\"domain\": \"…\", \"state\": "
      + "\"verified\"}]}, GET /user_management/users?email=…, GET /directories, GET /directory_users?directory=…, GET /events?events=dsync.user.created.",
  },
  {
    id: "xata", name: "Xata", category: "data", description: "Cloud Postgres with branches: organizations, projects and branches",
    website: "https://xata.io", docs: "https://xata.io/docs/api", logo: { favicon: "https://xata.io" },
    baseUrl: "https://api.xata.tech",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) In the Xata console open your profile → “Account settings” → “API keys”. 2) Create a key and copy it: it is shown only once.",
    test: { path: "/organizations", message: (d) => count(d?.organizations || d, "organization", "organizations") || "API key is valid" },
    examples: "Examples: GET /organizations, GET /organizations/{orgId}/projects, GET /organizations/{orgId}/projects/{projectId}/branches, "
      + "POST /organizations/{orgId}/projects/{projectId}/branches {\"name\": \"…\", \"parentID\": \"…\"} (a branch created from another branch).",
  },
  {
    id: "zenrows", name: "ZenRows", category: "data", description: "Scraping with anti-bot, JavaScript and residential proxies",
    website: "https://www.zenrows.com", docs: "https://docs.zenrows.com", logo: { favicon: "https://www.zenrows.com" },
    baseUrl: "https://api.zenrows.com/v1",
    // Scraping reads the key from the URL (apikey); the usage query reads it from the header.
    auth: [{ type: "query", name: "apikey" }, { type: "header", name: "X-API-Key" }],
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://app.zenrows.com/builder",
    help: "1) Create an account at zenrows.com (it includes a free trial). 2) Copy the API key shown in the “Builder” of the dashboard. "
      + "3) Each request uses credits depending on the options (js_render, premium_proxy…); the connection test does not.",
    test: { path: "/subscriptions/self/details", message: "API key is valid" },
    examples: "Examples: GET /?url=https://…, GET /?url=…&js_render=true&premium_proxy=true, GET /?url=…&css_extractor={\"title\":\"h1\"}, "
      + "GET /?url=…&autoparse=true, GET /subscriptions/self/details.",
  },
  {
    id: "abyssale", name: "Abyssale", category: "design", description: "Images, videos and GIFs from templates, in bulk",
    website: "https://www.abyssale.com", docs: "https://developers.abyssale.com", logo: { favicon: "https://www.abyssale.com" },
    baseUrl: "https://api.abyssale.com",
    auth: { type: "header", name: "x-api-key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) In Abyssale open “Workspace settings” → “API key”. 2) Copy the key. 3) Each generated image uses credits from your plan.",
    test: { path: "/templates", message: (d) => count(d, "template", "templates") || "API key is valid" },
    examples: "Examples: GET /templates, GET /templates/{id} (editable elements and formats), POST /banner-builder/{templateId}/generate "
      + "{\"template_format_name\": \"…\", \"elements\": {\"title\": {\"payload\": \"…\"}}}, GET /banners/{bannerId}.",
  },
  {
    id: "alttextai", name: "AltText.ai", category: "design", description: "Automatic alt text for images (accessibility and SEO)",
    website: "https://alttext.ai", docs: "https://alttext.ai/apidocs", logo: { favicon: "https://alttext.ai" },
    baseUrl: "https://alttext.ai/api/v1",
    auth: { type: "header", name: "X-API-Key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://alttext.ai/account/api_keys",
    help: "1) Create an account at alttext.ai (it includes trial credits). 2) In “Account” → “API Keys” create a key and copy it. "
      + "3) Each processed image uses one credit.",
    test: { path: "/account", account: (d) => d?.email || d?.name },
    examples: "Examples: POST /images {\"image\": {\"url\": \"https://…/photo.jpg\"}, \"lang\": \"en\"}, GET /images/{asset_id}, "
      + "GET /images?page=1, GET /account.",
  },
  {
    id: "arena", name: "Are.na", category: "design", description: "Channels and blocks of visual references and links",
    website: "https://www.are.na", docs: "https://dev.are.na", logo: { favicon: "https://www.are.na" },
    baseUrl: "https://api.are.na/v3",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "Personal access token", secret: true }],
    keyUrl: "https://dev.are.na/oauth/applications",
    help: "1) Sign in to dev.are.na with your Are.na account and create a personal application. 2) Copy its “Personal access token”. "
      + "3) It has the same permissions as your user.",
    test: { path: "/me", account: (d) => d?.slug || d?.name },
    examples: "API v3. Examples: GET /me, GET /channels/{slug}, GET /channels/{slug}/contents, GET /users/{slug}, GET /search?q=….",
  },
  {
    id: "bannerbear", name: "Bannerbear", category: "design", description: "Automatic images and videos from templates",
    website: "https://www.bannerbear.com", docs: "https://developers.bannerbear.com", logo: { favicon: "https://www.bannerbear.com" },
    baseUrl: "https://api.bannerbear.com/v2",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "Project API key", secret: true }],
    help: "1) In Bannerbear open your project → “Settings” → “API Key”. 2) Copy the project key (or a master key of the account). "
      + "3) Each generated image or video uses credits from your plan.",
    test: { path: "/auth", message: (d) => (d?.project ? `Project ${d.project}` : "API key is valid") },
    examples: "Examples: GET /templates, POST /images {\"template\": \"…\", \"modifications\": [{\"name\": \"title\", \"text\": \"…\"}]}, "
      + "GET /images/{uid}, POST /videos {…}, GET /account.",
  },
];
