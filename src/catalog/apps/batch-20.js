// Batch 20 of the Composio catalog: status pages, directory, blockchain, licensing, feature flags, test email,
// logs, documentation, networking, integrations, tunnels, deployment and monitoring.

const count = (d, one, many) => (Array.isArray(d) ? `${d.length} ${d.length === 1 ? one : many}` : null);

export default [
  {
    id: "instatus", name: "Instatus", category: "developer", description: "Status pages, incidents, maintenances and components",
    website: "https://instatus.com", docs: "https://instatus.com/help/api", logo: { simpleIcons: "instatus" },
    baseUrl: "https://api.instatus.com",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://dashboard.instatus.com/developer",
    help: "1) In the Instatus dashboard open your profile → “Developer” (dashboard.instatus.com/developer). 2) Copy the API key or generate "
      + "a new one. 3) The key gives access to all your status pages.",
    test: { path: "/v2/pages", message: (d) => count(d, "status page", "status pages") || "API key is valid" },
    examples: "Examples: GET /v2/pages, GET /v1/{page_id}/components, GET /v1/{page_id}/incidents, POST /v1/{page_id}/incidents "
      + "{\"name\": \"…\", \"message\": \"…\", \"components\": [\"…\"], \"status\": \"INVESTIGATING\", \"statuses\": [{\"id\": \"…\", "
      + "\"status\": \"MAJOROUTAGE\"}]}, GET /v1/{page_id}/maintenances.",
  },
  {
    id: "jumpcloud", name: "JumpCloud", category: "security", description: "Cloud directory: users, groups and devices",
    website: "https://jumpcloud.com", docs: "https://docs.jumpcloud.com/api/", logo: { favicon: "https://jumpcloud.com" },
    baseUrl: "https://{server}/api",
    auth: { type: "header", name: "x-api-key" },
    headers: (c) => (c.org ? { "x-org-id": c.org } : {}),
    fields: [{ id: "token", label: "API key", secret: true },
             { id: "server", label: "Region", default: "console.jumpcloud.com",
               options: [["console.jumpcloud.com", "US (console.jumpcloud.com)"], ["console.eu.jumpcloud.com", "European Union (console.eu.jumpcloud.com)"]] },
             { id: "org", label: "Organization ID", optional: true, format: "segment",
               help: "Only if you manage several organizations (MSP); otherwise leave it empty." }],
    help: "1) In the JumpCloud admin console click your name (top right) → “My API Key”. 2) Generate the key and "
      + "copy it: generating another one invalidates the previous one. 3) It has the permissions of your administrator role.",
    test: { path: "/systemusers", query: { limit: 1 },
              message: (d) => (d?.totalCount != null ? `${d.totalCount} user(s) in the directory` : "API key is valid") },
    examples: "Examples: GET /systemusers?limit=50, GET /systemusers/{id}, GET /systems?limit=50, GET /v2/usergroups, "
      + "GET /v2/usergroups/{id}/members, POST /systemusers {\"username\": \"…\", \"email\": \"…\"}.",
  },
  {
    id: "kaleido", name: "Kaleido", category: "developer", description: "Enterprise blockchain networks: consortia, environments and nodes",
    website: "https://www.kaleido.io", docs: "https://api.kaleido.io/platform.html", logo: { favicon: "https://www.kaleido.io" },
    baseUrl: "https://{server}/api/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true },
             { id: "server", label: "Region", default: "console.kaleido.io",
               options: [["console.kaleido.io", "US"], ["console-eu.kaleido.io", "European Union"], ["console-ap.kaleido.io", "Asia-Pacific"],
                          ["console-ko.kaleido.io", "Korea"]] }],
    help: "1) In the Kaleido console open your account menu → “API Keys” and click “New API Key”. 2) Copy the key: it is shown "
      + "only once. 3) Choose here the region where your account is (the one of the classic Kaleido console).",
    test: { path: "/consortia", message: (d) => count(d, "consortium", "consortia") || "API key is valid" },
    examples: "Examples: GET /consortia, GET /consortia/{id}/environments, GET /consortia/{id}/environments/{env}/nodes, "
      + "GET /consortia/{id}/memberships, GET /audit?limit=20.",
  },
  {
    id: "netlicensing", name: "NetLicensing", category: "developer", description: "Software licensing: products, licensees and validation",
    website: "https://netlicensing.io", docs: "https://netlicensing.io/wiki/restful-api", logo: { favicon: "https://netlicensing.io" },
    baseUrl: "https://go.netlicensing.io/core/v2/rest",
    // Labs64 documents the API key as the password with the fixed username “apiKey”.
    auth: { type: "basic", fixedUsername: "apiKey", passwordField: "token" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) Log in to the NetLicensing console (ui.netlicensing.io) → “Settings” → “API Keys” and create a key with the role you "
      + "need (“ROLE_APIKEY_LICENSEE” to validate, “ROLE_APIKEY_ADMIN” to manage). 2) Paste it here: Conector sends it "
      + "with the username “apiKey”, as Labs64 specifies.",
    test: { path: "/product", message: "API key is valid" },
    examples: "Examples: GET /product, GET /product/{number}, GET /productmodule, GET /licensee?productnumber=…, "
      + "GET /license?licenseenumber=…, POST /licensee/{number}/validate with form data productNumber=….",
  },
  {
    id: "launchdarkly", name: "LaunchDarkly", category: "developer", description: "Feature flags, environments, segments and audit log",
    website: "https://launchdarkly.com", docs: "https://launchdarkly.com/docs/api", logo: { favicon: "https://launchdarkly.com" },
    baseUrl: "https://{server}/api/v2",
    auth: { type: "header", name: "Authorization" },
    fields: [{ id: "token", label: "Access token", secret: true },
             { id: "server", label: "Instance", default: "app.launchdarkly.com",
               options: [["app.launchdarkly.com", "Standard (app.launchdarkly.com)"], ["app.eu.launchdarkly.com", "European Union"],
                          ["app.launchdarkly.us", "Federal (US)"]] }],
    keyUrl: "https://app.launchdarkly.com/settings/authorization",
    help: "1) In LaunchDarkly open “Organization settings” → “Authorization”. 2) Under “Access tokens” click “Create token”, choose a role "
      + "(Reader to read, Writer to change flags) and copy the token. 3) The token has the permissions of the role you choose.",
    test: { path: "/caller-identity", account: (d) => d?.tokenName || d?.memberId, message: "Access token is valid" },
    examples: "Examples: GET /projects, GET /flags/{projectKey}?limit=20, GET /flags/{projectKey}/{flagKey}, PATCH /flags/{projectKey}/"
      + "{flagKey} (JSON Patch, or semantic patch with Content-Type application/json; domain-model=launchdarkly.semanticpatch), "
      + "GET /projects/{projectKey}/environments, GET /auditlog?limit=20.",
  },
  {
    id: "mailboxlayer", name: "Mailboxlayer", category: "marketing", description: "Real-time email address verification",
    website: "https://mailboxlayer.com", docs: "https://mailboxlayer.com/documentation", logo: { favicon: "https://mailboxlayer.com" },
    baseUrl: "https://apilayer.net/api",
    auth: { type: "query", name: "access_key" },
    fields: [{ id: "token", label: "Access key", secret: true }],
    keyUrl: "https://mailboxlayer.com/dashboard",
    help: "1) Create an account at mailboxlayer.com (there is a free plan with 100 checks per month). 2) Copy the “API Access Key” from your "
      + "dashboard. 3) Conector only uses HTTPS: if the test warns about “https_access_restricted”, your plan does not include it.",
    // Errors arrive with status 200 and success: false. The test uses up one check.
    test: { path: "/check", query: { email: "support@apilayer.com", smtp: 0 },
              validate: (d) => { if (d?.success === false) throw new Error(`Mailboxlayer: ${d.error?.info || d.error?.type || "invalid key"}`); },
              message: "Access key is valid" },
    examples: "Examples: GET /check?email=…&smtp=1 (format, MX, SMTP, disposable, role, free and score), GET /check?email=…&catch_all=1.",
  },
  {
    id: "mailboxvalidator", name: "MailboxValidator", category: "marketing", description: "Email validation: syntax, domain, SMTP and disposable addresses",
    website: "https://www.mailboxvalidator.com", docs: "https://www.mailboxvalidator.com/api-email-validation", logo: { favicon: "https://www.mailboxvalidator.com" },
    baseUrl: "https://api.mailboxvalidator.com/v2",
    auth: { type: "query", name: "key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) Create an account at mailboxvalidator.com (the free plan includes 300 validations per month). 2) In your dashboard, copy the "
      + "API key. 3) Each validation uses one credit; so does the connection test.",
    test: { path: "/validation/single", query: { email: "info@mailboxvalidator.com", format: "json" }, message: "API key is valid" },
    examples: "Examples: GET /validation/single?email=…&format=json (full validation), GET /email/disposable?email=… (disposable?), "
      + "GET /email/free?email=… (free provider?).",
  },
  {
    id: "mailslurp", name: "MailSlurp", category: "developer", description: "Test email and SMS inboxes: create, send and wait for messages",
    website: "https://www.mailslurp.com", docs: "https://docs.mailslurp.com/api/", logo: { favicon: "https://www.mailslurp.com" },
    baseUrl: "https://api.mailslurp.com",
    auth: { type: "header", name: "x-api-key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) Create an account at app.mailslurp.com. 2) On the main page of the dashboard copy the “API Key”. 3) The free plan allows "
      + "few inboxes and messages per month.",
    test: { path: "/user/info", account: (d) => d?.emailAddress || d?.username },
    examples: "Examples: GET /inboxes?size=20, POST /inboxes (creates an inbox), GET /inboxes/{inboxId}/emails, GET /emails/{emailId}, "
      + "POST /inboxes/{inboxId} {\"to\": [\"…\"], \"subject\": \"…\", \"body\": \"…\"} (sends), GET /waitForLatestEmail?inboxId=…&timeout=30000.",
  },
  {
    id: "mezmo", name: "Mezmo", category: "developer", description: "Logs (formerly LogDNA): views, export and usage",
    website: "https://www.mezmo.com", docs: "https://docs.mezmo.com/log-analysis-api", logo: { simpleIcons: "mezmo" },
    baseUrl: "https://api.mezmo.com",
    auth: { type: "header", name: "servicekey" },
    fields: [{ id: "token", label: "Service key", secret: true }],
    help: "1) In Mezmo (app.mezmo.com) open “Settings” → “Organization” → “API Keys”. 2) Under “Service Keys” click “Generate” and copy the "
      + "key (not the ingestion key). 3) It gives access to the organization's configuration and log export.",
    test: { path: "/v1/config/view", message: (d) => count(d, "view", "views") || "Service key is valid" },
    examples: "Examples: GET /v1/config/view, GET /v2/export?from=…&to=…&size=100 (exports log lines; from and to in seconds), "
      + "GET /v1/config/categories/views, POST /v1/config/view {\"name\": \"…\", \"query\": \"…\"}, GET /v1/usage/apps?from=…&to=….",
  },
  {
    id: "mintlify", name: "Mintlify", category: "developer", description: "Documentation: redeploy and check the status of updates",
    website: "https://www.mintlify.com", docs: "https://www.mintlify.com/docs/api/introduction", logo: { simpleIcons: "mintlify" },
    baseUrl: "https://api.mintlify.com/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "Admin API key (mint_…)", secret: true }],
    keyUrl: "https://dashboard.mintlify.com/settings/organization/api-keys",
    help: "1) In the Mintlify dashboard open “Settings” → “API keys”. 2) Create an “Admin API key” (it starts with mint_) and copy it; the ID of the "
      + "project appears on the same page. 3) The admin API is available on paid plans.",
    // There is no account endpoint: with a valid key, a nonexistent status id answers 400/404.
    test: { path: "/project/update-status/check", acceptStatus: [400, 404], message: "Admin key is valid" },
    examples: "Examples: POST /project/update/{projectId} (redeploys the documentation; returns statusId), "
      + "GET /project/update-status/{statusId}.",
  },
  {
    id: "mxtoolbox", name: "MxToolbox", category: "security", description: "DNS, MX, SPF, DMARC, blacklists and monitors",
    website: "https://mxtoolbox.com", docs: "https://mxtoolbox.com/restapi.aspx", logo: { favicon: "https://mxtoolbox.com" },
    baseUrl: "https://api.mxtoolbox.com/api/v1",
    auth: { type: "header", name: "Authorization" },
    fields: [{ id: "token", label: "API key", secret: true, example: "1b4e28ba-2fa1-41d2-883f-0016d3cca427" }],
    keyUrl: "https://mxtoolbox.com/User/Api/",
    help: "1) Log in at mxtoolbox.com and open “My Account” → “API”. 2) Copy the API key (it is a UUID). 3) The "
      + "free plan includes few lookups per day; paid plans include more.",
    test: { path: "/usage", message: "API key is valid" },
    examples: "Examples: GET /lookup/mx/{domain}, GET /lookup/blacklist/{domain or IP}, GET /lookup/spf/{domain}, "
      + "GET /lookup/dmarc/{domain}, GET /monitor, GET /usage.",
  },
  {
    id: "nango", name: "Nango", category: "automation", description: "Integrations with 250+ APIs: connections, syncs and proxy",
    website: "https://www.nango.dev", docs: "https://nango.dev/docs/reference/api", logo: { favicon: "https://www.nango.dev" },
    baseUrl: "https://api.nango.dev",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "Secret key", secret: true }],
    help: "1) In the Nango dashboard (app.nango.dev) open “Environment Settings” of the environment you use (dev or prod). 2) Copy the “Secret "
      + "key”. 3) Each environment has its own key.",
    test: { path: "/integrations", message: (d) => count(d?.data, "integration", "integrations") || "Secret key is valid" },
    examples: "Examples: GET /integrations, GET /connection?limit=20, GET /connection/{connectionId}?provider_config_key=…, "
      + "GET /records?model=…, POST /sync/trigger {\"provider_config_key\": \"…\", \"syncs\": [\"…\"]}. To call the API of a "
      + "connected provider: GET /proxy/{path} with the Connection-Id and Provider-Config-Key headers.",
  },
  {
    id: "ngrok", name: "ngrok", category: "developer", description: "Tunnels, endpoints, reserved domains and credentials",
    website: "https://ngrok.com", docs: "https://ngrok.com/docs/api/", logo: { simpleIcons: "ngrok" },
    baseUrl: "https://api.ngrok.com", headers: { "Ngrok-Version": "2" },
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://dashboard.ngrok.com/api-keys",
    help: "1) In the ngrok dashboard open “API Keys” and click “New API Key”. 2) Add a description and copy the key: it is shown only "
      + "once. 3) It is not the agent's “authtoken”: it is the management API key.",
    test: { path: "/tunnels", message: (d) => count(d?.tunnels, "active tunnel", "active tunnels") || "API key is valid" },
    examples: "Examples: GET /tunnels, GET /endpoints, GET /reserved_domains, GET /tunnel_sessions, POST /reserved_domains "
      + "{\"domain\": \"…\"}, GET /credentials.",
  },
  {
    id: "nmkrstudio", name: "NMKR Studio", category: "developer", description: "NFTs on Cardano: projects, minting and sales",
    website: "https://www.nmkr.io", docs: "https://studio-api.nmkr.io/swagger/index.html", logo: { favicon: "https://www.nmkr.io" },
    baseUrl: "https://studio-api.nmkr.io/v2",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) In NMKR Studio (studio.nmkr.io) open your account → “API Keys” and create a key (you can limit its permissions and IPs). "
      + "2) Copy it: Conector sends it as a Bearer token.",
    test: { path: "/ListProjects/1/1", message: "API key is valid" },
    examples: "Examples: GET /ListProjects/{count}/{page}, GET /GetProjectDetails/{projectUid}, GET /GetCounts/{projectUid}, "
      + "GET /GetNfts/{projectUid}/{state}/{count}/{page} (state: all, free, reserved, sold…).",
  },
  {
    id: "northflank", name: "Northflank", category: "developer", description: "Deployment: projects, services, jobs and databases",
    website: "https://northflank.com", docs: "https://northflank.com/docs/v1/api/introduction", logo: { favicon: "https://northflank.com" },
    baseUrl: "https://api.northflank.com/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API token", secret: true }],
    help: "1) In Northflank open the settings of your account or team → “API” → “Tokens”. 2) Create a token with an API role (read or "
      + "write access to projects and services) and copy it: it is shown only once.",
    test: { path: "/projects", message: (d) => count(d?.data?.projects, "project", "projects") || "API token is valid" },
    examples: "Examples: GET /projects, GET /projects/{projectId}/services, GET /projects/{projectId}/services/{serviceId}, "
      + "POST /projects/{projectId}/services/{serviceId}/restart, GET /projects/{projectId}/addons, GET /projects/{projectId}/jobs.",
  },
  {
    id: "orgo", name: "Orgo", category: "automation", description: "Cloud computers for agents: mouse, keyboard and terminal",
    website: "https://www.orgo.ai", docs: "https://docs.orgo.ai", logo: { favicon: "https://www.orgo.ai", initials: true },
    baseUrl: "https://www.orgo.ai/api",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key (sk_…)", secret: true }],
    help: "1) At orgo.ai open the dashboard → “API Keys” and create a key. 2) Copy it: Conector sends it as a Bearer token.",
    test: { path: "/projects", message: "API key is valid" },
    examples: "Examples: GET /projects, POST /computers {\"project\": \"…\"} (creates a computer), GET /computers/{id}, "
      + "POST /computers/{id}/bash {\"command\": \"ls\"}, POST /computers/{id}/screenshot.",
  },
  {
    id: "paradym", name: "Paradym", category: "security", description: "Verifiable credentials: issuance, verification and templates",
    website: "https://paradym.id", docs: "https://docs.paradym.id", logo: { favicon: "https://paradym.id" },
    baseUrl: "https://api.paradym.id/v1",
    auth: { type: "header", name: "x-access-token" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) In the Paradym dashboard open “Settings” → “API keys” and create a key. 2) Copy it: Conector sends it in the "
      + "x-access-token header.",
    test: { path: "/projects", message: "API key is valid" },
    examples: "Examples: GET /projects, GET /projects/{projectId}/templates/credentials/sd-jwt-vc, "
      + "POST /projects/{projectId}/openid4vc/issuance/offer {…}, GET /projects/{projectId}/openid4vc/verification/requests, "
      + "GET /projects/{projectId}/webhooks.",
  },
  {
    id: "pilvio", name: "Pilvio", category: "developer", description: "European cloud: virtual machines, networks and S3 storage",
    website: "https://pilvio.com", docs: "https://api.pilvio.com/docs", logo: { favicon: "https://pilvio.com" },
    baseUrl: "https://api.pilvio.com/v1",
    auth: { type: "header", name: "apikey" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) In the Pilvio dashboard (app.pilvio.com) open “API” and create a key. 2) Copy it: Conector sends it in the apikey header.",
    test: { path: "/user-resource/user", account: (d) => d?.email || d?.name },
    examples: "Examples: GET /user-resource/vm/list, GET /user-resource/vm?uuid=…, POST /user-resource/vm (creates a machine), "
      + "GET /storage/bucket/list, GET /network/ip_addresses.",
  },
  {
    id: "pingdom", name: "Pingdom", category: "developer", description: "Website monitoring: checks, results and alerts",
    website: "https://www.pingdom.com", docs: "https://docs.pingdom.com/api/", logo: { simpleIcons: "pingdom" },
    baseUrl: "https://api.pingdom.com/api/3.1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API token", secret: true }],
    keyUrl: "https://my.pingdom.com/app/api-tokens",
    help: "1) In My Pingdom open “Settings” → “Pingdom API”. 2) Click “Add API token”, choose “Read-Write” (or “Read” for "
      + "read-only access) and copy the token.",
    test: { path: "/checks", query: { limit: 1 }, message: (d) => (d?.counts ? `${d.counts.total} check(s)` : "API token is valid") },
    examples: "Examples: GET /checks, GET /checks/{checkid}, GET /results/{checkid}?limit=20, GET /summary.average/{checkid}?from=…&to=…, "
      + "POST /checks {\"name\": \"…\", \"host\": \"…\", \"type\": \"http\"}, GET /alerts?limit=20.",
  },
];
