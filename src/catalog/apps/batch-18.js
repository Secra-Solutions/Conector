// Batch 18 of the catalog: developer tools (headless browsers, CI/CD, error tracking, feature flags, CDN, sandboxes, licensing)
// and certificates. Browserless, Bubble, BugBug, Bugsnag, Buildkite, Bunny.net, CaptureKit, Cloudflare Browser Rendering,
// Cloudsmith, Codacy, Codemagic, Conductor, ConfigCat, Convex, Cronly, Cursor, CustomJS, Daytona, DeployHQ, DevCycle,
// Devolens / Cryptolens and DigiCert.

export default [
  {
    id: "browserless", name: "Browserless", category: "developer",
    description: "Headless browser: content, screenshots, PDF and scraping",
    website: "https://www.browserless.io", docs: "https://docs.browserless.io/rest-apis/intro", logo: { favicon: "https://www.browserless.io", initials: true },
    baseUrl: "https://{region}.browserless.io",
    auth: { type: "query", name: "token" },
    fields: [{ id: "region", label: "Your plan's region", format: "subdomain", default: "production-sfo",
               options: [["production-sfo", "US (San Francisco)"], ["production-lon", "United Kingdom (London)"],
                          ["production-ams", "Europe (Amsterdam)"]] },
             { id: "token", label: "API token", secret: true }],
    keyUrl: "https://www.browserless.io/account/",
    help: "1) Create an account at browserless.io (there is a free plan) and open your dashboard, “Account” section. 2) Copy your API token "
      + "(you can also rotate it from there). 3) Choose the region your plan is in: US, United Kingdom or Amsterdam. "
      + "Private fleets (chrome.browserless.io) and self-hosted installations use a different address and are not supported here.",
    // A fake token gives 401 “Invalid API key”. A 402/403 would be a valid token on a plan without the crawl API (Cloud only,
    // according to the documentation).
    test: { path: "/crawl", query: { limit: 1 }, acceptStatus: [402, 403], message: "API token is valid" },
    examples: "Examples: POST /content {\"url\": \"https://example.com\"} (rendered HTML), "
      + "POST /screenshot {\"url\": \"https://example.com\", \"options\": {\"fullPage\": true}}, "
      + "POST /pdf {\"url\": \"https://example.com\"}, "
      + "POST /scrape {\"url\": \"https://example.com\", \"elements\": [{\"selector\": \"h1\"}]}, GET /crawl (crawl jobs).",
  },
  {
    id: "bubble", name: "Bubble", category: "developer", description: "Bubble app data and workflows through its API",
    website: "https://bubble.io", docs: "https://manual.bubble.io/core-resources/api/the-bubble-api/the-data-api",
    logo: { favicon: "https://bubble.io" },
    baseUrl: "{url}/api/1.1",
    auth: { type: "bearer" },
    fields: [{ id: "url", label: "Your app address", format: "url",
               help: "e.g. https://myapp.bubbleapps.io or your own domain (without /api). "
                 + "For the test version add /version-test." },
             { id: "token", label: "API token", secret: true }],
    help: "1) In the Bubble editor open your app → “Settings” → “API” tab. 2) Check “This app exposes a Data API” and enable "
      + "the data types you want to expose (to run workflows also check “This app exposes a Workflow API” "
      + "and the specific workflows). 3) In “API Tokens” click “Generate a new API token”, give it a name and copy it: an "
      + "admin token bypasses the privacy rules, so use it with care. The address is that of your published app.",
    // /meta does not check the token; /obj/user does (401 if it is fake). With a valid token and the “user” type not exposed
    // it gives a 404 in JSON.
    test: { path: "/obj/user", query: { limit: 1 }, acceptStatus: [404], message: "Token is valid",
              validate: (d, r) => {
                if (r.status === 404 && d?.body?.status !== "NOT_FOUND") {
                  throw new Error("Bubble: the API was not found at that address; check the URL and that the Data API is enabled");
                }
              } },
    examples: "Examples: GET /obj/{type}?limit=20&cursor=0 (type name in lowercase without spaces, e.g. user), "
      + "GET /obj/{type}/{id}, POST /obj/{type} {…fields…}, POST /wf/{workflow} {…parameters…}, GET /meta (exposed types and workflows). "
      + "Filters: constraints=[{\"key\":\"field\",\"constraint_type\":\"equals\",\"value\":\"x\"}] (JSON in the URL); "
      + "PATCH and DELETE /obj/{type}/{id} modify and delete.",
  },
  {
    id: "bugbug", name: "BugBug", category: "developer", description: "BugBug end-to-end tests, suites and runs",
    website: "https://bugbug.io", docs: "https://docs.bugbug.io/integrations/public-api", logo: { favicon: "https://bugbug.io" },
    baseUrl: "https://api.bugbug.io/v2",
    auth: { type: "header", name: "Authorization", prefix: "Token " },
    fields: [{ id: "token", label: "Project API token", secret: true }],
    help: "1) In BugBug (app.bugbug.io) open your project and go to “Integrations” → “API” tab. 2) Copy the API token: "
      + "it belongs to a single project, so it only gives access to that project. 3) The public API requires a paid BugBug plan.",
    test: { path: "/tests/", query: { page_size: 1 }, message: "API token is valid" },
    examples: "Examples (paths end in /): GET /tests/, GET /suites/, GET /testruns/?page_size=20, "
      + "POST /testruns/ {\"testId\": \"<uuid>\"} (runs a test), POST /suiteruns/ {\"suiteId\": \"<uuid>\"} (runs a suite).",
  },
  {
    id: "bugsnag", name: "Bugsnag", category: "developer", description: "Bugsnag errors, projects and events (Data Access API)",
    website: "https://www.bugsnag.com", docs: "https://developer.smartbear.com/bugsnag/docs/data-access",
    logo: { favicon: "https://www.bugsnag.com" },
    baseUrl: "https://api.bugsnag.com",
    auth: { type: "header", name: "Authorization", prefix: "token " },
    headers: { "X-Version": "2" },
    fields: [{ id: "token", label: "Personal auth token", secret: true }],
    help: "1) In app.bugsnag.com open your avatar menu (top right) → “My account settings”. 2) In “Data Access "
      + "API” choose “Personal auth tokens” and click “Generate new auth token”. 3) Give it a description and copy the token: it is shown "
      + "only once and has the same permissions as your user (to modify errors, your user must be able to edit the project).",
    test: { path: "/user", account: (d) => d.email },
    examples: "Examples: GET /user/organizations, GET /organizations/{organization}/projects, "
      + "GET /projects/{project}/errors?sort=last_seen&direction=desc&per_page=10, GET /projects/{project}/errors/{error}, "
      + "PATCH /projects/{project}/errors/{error} {\"operation\": \"fix\"}.",
  },
  {
    id: "buildkite", name: "Buildkite", category: "developer", description: "Buildkite CI/CD pipelines, builds and agents",
    website: "https://buildkite.com", docs: "https://buildkite.com/docs/apis/rest-api", logo: { simpleIcons: "buildkite" },
    baseUrl: "https://api.buildkite.com/v2", allowedOrigins: ["https://graphql.buildkite.com"],
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API access token", secret: true }],
    keyUrl: "https://buildkite.com/user/api-access-tokens",
    help: "1) In Buildkite open “Personal Settings” → “API Access Tokens” and click “New API Access Token”. 2) Choose the organization "
      + "and the permissions you need: to read, “read_organizations”, “read_pipelines”, “read_builds” and “read_user”; to "
      + "start or cancel builds, “write_builds”. Check “Enable GraphQL API Access” if you also want to use GraphQL. 3) Copy the "
      + "token: it is shown only once.",
    test: { path: "/access-token", account: (d) => d.user?.email || d.description },
    examples: "Examples: GET /organizations, GET /organizations/{org}/pipelines, "
      + "GET /organizations/{org}/pipelines/{pipeline}/builds?state=failed, "
      + "POST /organizations/{org}/pipelines/{pipeline}/builds {\"commit\": \"HEAD\", \"branch\": \"main\"}. "
      + "GraphQL: POST https://graphql.buildkite.com/v1 {\"query\": \"{ viewer { user { name } } }\"}.",
  },
  {
    id: "bunnycdn", name: "Bunny.net", category: "developer", description: "Bunny.net CDN: pull zones, storage, DNS and statistics",
    website: "https://bunny.net", docs: "https://bunny.net/docs/api-reference/core", logo: { simpleIcons: "bunnydotnet" },
    baseUrl: "https://api.bunny.net",
    auth: { type: "header", name: "AccessKey" },
    fields: [{ id: "token", label: "Account API key", secret: true }],
    keyUrl: "https://dash.bunny.net/account/api-key",
    help: "1) In dash.bunny.net open your account menu → “API Key” (dash.bunny.net/account/api-key) and copy your account's API "
      + "key. 2) That key gives access to the whole account: pull zones (CDN), storage zones, DNS, statistics and billing. "
      + "Storage zones (storage.bunnycdn.com) and Bunny Stream (video.bunnycdn.com) use their own keys and other "
      + "addresses: they are not covered here.",
    test: { path: "/pullzone", query: { page: 1, perPage: 5 }, message: "API key is valid" },
    examples: "Examples: GET /pullzone?page=1&perPage=20, POST /pullzone/{id}/purgeCache (purges the cache), GET /storagezone, GET /dnszone, "
      + "GET /statistics?dateFrom=2026-10-01&dateTo=2026-10-15.",
  },
  {
    id: "capturekit", name: "CaptureKit", category: "developer", description: "Screenshots, web content and AI analysis",
    website: "https://capturekit.dev", docs: "https://docs.capturekit.dev", logo: { favicon: "https://capturekit.dev" },
    baseUrl: "https://api.capturekit.dev",
    auth: { type: "header", name: "x-api-key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) Create an account at capturekit.dev and open the dashboard (app.capturekit.dev). 2) Open “API Keys” in the side menu and "
      + "click “New API Key”: give it a name, a category and, optionally, an expiry and request limits. 3) Copy the "
      + "secret: it is shown only once. Each capture, extraction or analysis uses credits; checking usage (/v1/usage) is free.",
    test: { path: "/v1/usage", message: "API key is valid" },
    examples: "Examples: GET /v1/usage (credits and limits, free), GET /v1/capture?url=https://example.com&format=png (image or PDF), "
      + "GET /v1/content?url=https://example.com&include_markdown=true (metadata, links and Markdown), "
      + "GET /v1/analyze?url=https://example.com (AI analysis of the page).",
  },
  {
    id: "cloudflarebrowser", name: "Cloudflare Browser Rendering", category: "developer",
    description: "Cloudflare headless browser: screenshots, PDF and Markdown",
    website: "https://developers.cloudflare.com/browser-run/", docs: "https://developers.cloudflare.com/browser-run/quick-actions/",
    logo: { simpleIcons: "cloudflare" },
    baseUrl: "https://api.cloudflare.com/client/v4/accounts/{account}/browser-run",
    auth: { type: "bearer" },
    fields: [{ id: "account", label: "Cloudflare Account ID", format: "segment",
               help: "32 hexadecimal characters: they appear in the dashboard URL (dash.cloudflare.com/<ID>) and in the account." },
             { id: "token", label: "API token", secret: true }],
    keyUrl: "https://dash.cloudflare.com/profile/api-tokens",
    help: "1) Copy the “Account ID” of your Cloudflare account (it is in the dashboard URL, right after dash.cloudflare.com/). "
      + "2) Go to “My Profile” → “API Tokens” → “Create Token” → “Create Custom Token”. 3) Add the permission “Account” → "
      + "“Browser Run” (formerly “Browser Rendering”) → “Edit”, limit it to your account and create it. 4) Copy the token: it is shown only "
      + "once. The free Workers plan has usage limits. For DNS, zones or WAF use the “Cloudflare” connector.",
    test: { path: "https://api.cloudflare.com/client/v4/user/tokens/verify",
              message: (d) => (d?.result?.status === "active" ? "Token is active" : "Token is valid") },
    examples: "Paths are under /accounts/{account}/browser-run. Examples: POST /content {\"url\": \"https://example.com\"} "
      + "(rendered HTML), POST /screenshot {\"url\": \"https://example.com\"} (image), POST /pdf {\"url\": \"https://example.com\"}, "
      + "POST /markdown {\"url\": \"https://example.com\"}, POST /scrape {\"url\": \"https://example.com\", "
      + "\"elements\": [{\"selector\": \"h1\"}]}.",
  },
  {
    id: "cloudsmith", name: "Cloudsmith", category: "developer", description: "Cloudsmith repositories, packages and artifacts",
    website: "https://cloudsmith.com", docs: "https://docs.cloudsmith.com/api", logo: { simpleIcons: "cloudsmith" },
    baseUrl: "https://api.cloudsmith.io/v1",
    auth: { type: "header", name: "X-Api-Key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://cloudsmith.io/user/settings/api/",
    help: "1) In cloudsmith.io open your avatar menu → “User Settings” → “API Key” (it asks you to confirm your password). 2) Copy "
      + "your API key: it acts with the same permissions as your user. 3) For automations it is better to create a "
      + "service account (the organization's “Service Accounts”) with limited permissions and use its own key. Entitlement "
      + "tokens only work to download packages, not for the API.",
    // Without valid credentials this endpoint answers 200 with authenticated=false, so it must be checked.
    test: { path: "/user/self/", account: (d) => d.email || d.slug,
              validate: (d) => {
                if (d?.authenticated === false) throw new Error("Cloudsmith does not recognize the API key");
              } },
    examples: "Examples (paths end in /): GET /orgs/, GET /repos/{owner}/, "
      + "GET /packages/{owner}/{repository}/?query=name:foo, GET /packages/{owner}/{repository}/{identifier}/, "
      + "GET /entitlements/{owner}/{repository}/.",
  },
  {
    id: "codacy", name: "Codacy", category: "developer", description: "Codacy code quality, repositories and issues",
    website: "https://www.codacy.com", docs: "https://docs.codacy.com/codacy-api/using-the-codacy-api/", logo: { simpleIcons: "codacy" },
    baseUrl: "https://api.codacy.com/api/v3",
    auth: { type: "header", name: "api-token" },
    fields: [{ id: "token", label: "Account API token", secret: true }],
    keyUrl: "https://app.codacy.com/account/access-management",
    help: "1) In app.codacy.com open your account (avatar menu, top right) and go to the “Access management” tab. "
      + "2) In “Account API tokens” click “Create API token”, choose the expiry (7, 30 or 90 days, or a date within a year) and "
      + "copy the token: it is shown only once. 3) The token has your user's permissions. It only works for Codacy Cloud (self-hosted "
      + "installations use a different address).",
    test: { path: "/user", account: (d) => d.data?.mainEmail || d.data?.name },
    examples: "Examples: GET /user/organizations, GET /organizations/{provider}/{organization}/repositories (provider: gh, gl or bb), "
      + "GET /analysis/organizations/{provider}/{organization}/repositories/{repository}, "
      + "POST /analysis/organizations/{provider}/{organization}/repositories/{repository}/issues/search {}.",
  },
  {
    id: "codemagic", name: "Codemagic", category: "developer", description: "Codemagic mobile CI/CD apps, workflows and builds",
    website: "https://codemagic.io", docs: "https://docs.codemagic.io/rest-api/codemagic-rest-api/", logo: { simpleIcons: "codemagic" },
    baseUrl: "https://api.codemagic.io",
    auth: { type: "header", name: "x-auth-token" },
    fields: [{ id: "token", label: "Personal API token", secret: true }],
    keyUrl: "https://codemagic.io/settings",
    help: "1) In codemagic.io open “Account settings” (your avatar menu) → “API token”. 2) Copy the personal token (if it appears "
      + "hidden, click “Show”). 3) It gives access to the apps of your account and of the teams you belong to.",
    test: { path: "/apps", message: "API token is valid" },
    examples: "Examples: GET /apps, GET /builds?appId={appId}, GET /builds/{buildId}, "
      + "POST /builds {\"appId\": \"<id>\", \"workflowId\": \"<workflow>\", \"branch\": \"main\"} (starts a build), "
      + "POST /builds/{buildId}/cancel.",
  },
  {
    id: "conductor", name: "Conductor", category: "developer",
    description: "Cloud workspaces and coding agent sessions",
    website: "https://conductor.build", docs: "https://api.conductor.build/v0", logo: { favicon: "https://conductor.build" },
    baseUrl: "https://api.conductor.build",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://app.conductor.build/home/api-keys",
    help: "1) In app.conductor.build open “API Keys” and create a user API key. 2) Copy it. With it the API can create "
      + "cloud workspaces and start agent sessions (Claude, Codex, Cursor…), which consumes resources from your plan.",
    test: { path: "/me", account: (d) => [d.email, d.organizationName].filter(Boolean).join(" · ") },
    examples: "Examples: GET /v0/projects, POST /v0/workspaces {\"projectId\": \"<id>\"} (creates a workspace and its first session), "
      + "GET /v0/sessions/{id}/messages, POST /v0/sessions/{id}/messages {…prompt…}, "
      + "POST /v0/sql (read-only SQL query over the transcripts).",
  },
  {
    id: "configcat", name: "ConfigCat", category: "developer", description: "ConfigCat feature flags, environments and configs",
    website: "https://configcat.com", docs: "https://configcat.com/docs/api/reference/configcat-public-management-api/",
    logo: { favicon: "https://configcat.com" },
    baseUrl: "https://api.configcat.com",
    auth: { type: "basic", usernameField: "username", passwordField: "key" },
    fields: [{ id: "username", label: "Basic Auth User Name" },
             { id: "key", label: "Basic Auth Password", secret: true }],
    keyUrl: "https://app.configcat.com/my-account/public-api-credentials",
    help: "1) In app.configcat.com open “My Account” → “Public API credentials” and create new credentials. 2) Copy the "
      + "“Basic Auth User Name” and the “Basic Auth Password”: the password is shown only once. 3) These are not SDK keys: "
      + "these credentials manage products, configs and flags with your user's permissions.",
    test: { path: "/v1/me", account: (d) => d.email },
    examples: "Examples (the version is in the path): GET /v1/products, GET /v1/products/{productId}/configs, "
      + "GET /v1/configs/{configId}/settings, GET /v1/environments/{environmentId}/settings/{settingId}/value, "
      + "PATCH /v2/environments/{environmentId}/settings/{settingId}/value (changes a flag's value).",
  },
  {
    id: "convex", name: "Convex", category: "developer", description: "Convex projects, deployments and keys (management API)",
    website: "https://www.convex.dev", docs: "https://docs.convex.dev/management-api", logo: { simpleIcons: "convex" },
    baseUrl: "https://api.convex.dev/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "Access token (team or personal)", secret: true }],
    // One click: team OAuth app in Convex (open registration; unverified apps work for up to 100 teams). The token response
    // only contains access_token (no refresh token or expiry).
    oauth: { scopes: [],
      provider: { name: "Convex", key: "convex", redirect: "localhost",
        authorizeUrl: "https://dashboard.convex.dev/oauth/authorize/team", tokenUrl: "https://api.convex.dev/oauth/token",
        help: "1) In dashboard.convex.dev open “Team Settings” → “Applications” → “OAuth apps” and create an application. 2) Name it "
          + "“Conector” and add the redirect URI shown below as “Redirect URI”. 3) Copy the “Client ID” and the "
          + "“Client secret”. 4) Unverified applications can be authorized by up to 100 teams: more than enough for "
          + "personal use. The resulting token is a team token and has the permissions of whoever authorizes." } },
    keyUrl: "https://dashboard.convex.dev/team/settings/access-tokens",
    help: "1) In dashboard.convex.dev open “Team Settings” → “Access Tokens” and create a team access token (“Team Access "
      + "Token”); copy it: it is shown only once. 2) A personal access token (in your user settings) also works, "
      + "and acts with your permissions. 3) This API manages teams, projects, deployments and deploy keys. To run "
      + "functions or export data from a deployment you need its URL (*.convex.cloud) and its “Deploy key”, which are not used here.",
    test: { path: "/token_details", account: (d) => d.name },
    examples: "Examples: GET /token_details (returns the ID of the token's team), GET /teams/{team_id}/projects, "
      + "GET /projects/{project_id}/list_deployments, GET /deployments/{deployment_name}, GET /teams/{team_id}/list_members.",
  },
  {
    id: "cronly", name: "Cronly", category: "developer", description: "Cronly cron job monitors and SSL certificates",
    website: "https://cronly.app", docs: "https://docs.cronly.app/", logo: { favicon: "https://cronly.app" },
    baseUrl: "https://cronly.app/api",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) Sign in to cronly.app with a user with the “Developer” or “Admin” role (users with the “User” role cannot create "
      + "API keys). 2) In the dashboard find the API keys section of your account, create one and copy it. 3) Be careful with "
      + "GET /companies: it returns sensitive account data (for example, the Slack bot token and the Zapier key).",
    test: { path: "/projects", message: "API key is valid" },
    examples: "Examples: GET /projects, GET /monitors, GET /certificates, "
      + "POST /monitors {\"name\": \"Nightly backup\", \"timezone\": \"America/New_York\", \"schedule\": \"0 3 * * *\", \"duration\": 10}, "
      + "DELETE /monitors/{id}. There are also users, servers, backups and notifications (see the documentation).",
  },
  {
    id: "cursor", name: "Cursor", category: "developer", description: "Cursor cloud agents and team administration",
    website: "https://cursor.com", docs: "https://cursor.com/docs/api", logo: { simpleIcons: "cursor" },
    baseUrl: "https://api.cursor.com",
    auth: { type: "basic", usernameField: "token", fixedPassword: "" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://cursor.com/dashboard/api",
    help: "1) Go to cursor.com/dashboard → “API Keys” and click “New API Key”. 2) Copy the key: it is shown only once. "
      + "3) With a user key the cloud agents API works (/v1/…, in beta, all plans) and it is the one the "
      + "connection check uses (/v1/me). The team administration API (/teams/…: members, usage, spend) requires an "
      + "admin key and the Enterprise plan.",
    test: { path: "/v1/me", account: (d) => d.userEmail || d.email || d.apiKeyName },
    examples: "Examples: GET /v1/me, GET /v1/agents, GET /v1/agents/{id}/runs, POST /v1/agents/{id}/runs {…prompt…} (new run), "
      + "GET /teams/members (administration, Enterprise).",
  },
  {
    id: "customjs", name: "CustomJS", category: "developer", description: "Generate PDFs, screenshots and run JavaScript with CustomJS",
    website: "https://www.customjs.space", docs: "https://www.customjs.space/integration/native-api/documentation",
    logo: { favicon: "https://www.customjs.space" },
    baseUrl: "https://e.customjs.io",
    auth: { type: "header", name: "x-api-key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://app.customjs.space",
    help: "1) Create an account at customjs.space (the free plan includes 600 requests per month) and open the dashboard "
      + "app.customjs.space. 2) In the “API Key” section click “Show” and copy the key. 3) CustomJS has no endpoint to "
      + "check the key: the test sends an empty conversion to /html2pdf and accepts the key if the service accepts it and "
      + "only complains about the content.",
    test: { method: "POST", path: "/html2pdf", body: {}, acceptStatus: [400, 422, 500], message: "API key accepted" },
    examples: "Examples (all are POST with a JSON body): /html2pdf {\"input\": {\"html\": \"<h1>Hello</h1>\"}} (returns the PDF), "
      + "/markdown2pdf, /screenshot, /scraper, /__js1- {\"input\": \"{\\\"greeting\\\":\\\"hello\\\"}\", \"code\": \"return input.greeting\"} "
      + "(runs JavaScript). Each response includes the headers x-ratelimit-limit, x-ratelimit-used and x-ratelimit-remaining.",
  },
  {
    id: "daytona", name: "Daytona", category: "developer", description: "Daytona sandboxes, snapshots and volumes",
    website: "https://www.daytona.io", docs: "https://www.daytona.io/docs/en/tools/api/", logo: { favicon: "https://www.daytona.io", initials: true },
    baseUrl: "https://app.daytona.io/api",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://app.daytona.io/dashboard/keys",
    help: "1) Go to app.daytona.io and open “API Keys” (app.daytona.io/dashboard/keys) to create a new key. 2) Give it a "
      + "name, choose the permissions (for example, write access to sandboxes and read access to volumes) and the expiry, and copy the key: "
      + "it is shown only once. 3) The key belongs to the organization that is active when you create it.",
    test: { path: "/api-keys/current", account: (d) => d.name },
    examples: "Examples: GET /sandbox, POST /sandbox {…config…}, POST /sandbox/{idOrName}/start, "
      + "POST /sandbox/{idOrName}/stop, GET /snapshots.",
  },
  {
    id: "deployhq", name: "DeployHQ", category: "developer", description: "DeployHQ projects, servers and deployments",
    website: "https://www.deployhq.com", docs: "https://www.deployhq.com/support/api", logo: { favicon: "https://www.deployhq.com" },
    baseUrl: "https://{account}.deployhq.com",
    auth: { type: "basic", usernameField: "email", passwordField: "token" },
    headers: { "Content-Type": "application/json" },
    fields: [{ id: "account", label: "Your DeployHQ account name", format: "subdomain",
               help: "The part before .deployhq.com in your account address "
                 + "(e.g. mycompany if you sign in at mycompany.deployhq.com)." },
             { id: "email", label: "Your DeployHQ user email" },
             { id: "token", label: "API key", secret: true }],
    help: "1) Sign in to your DeployHQ account (https://<account>.deployhq.com). 2) Open “Settings” → “Security” and copy your “API "
      + "key” (40 characters). 3) The username is the email you sign in with. The key has your user's permissions.",
    test: { path: "/projects", message: "Credentials are valid" },
    examples: "Examples: GET /projects, GET /projects/{permalink}, GET /projects/{permalink}/servers, "
      + "GET /projects/{permalink}/deployments, "
      + "POST /projects/{permalink}/deployments {\"deployment\": {\"parent_identifier\": \"<server ID>\", \"mode\": \"queue\"}}.",
  },
  {
    id: "devcycle", name: "DevCycle", category: "developer", description: "DevCycle feature flags, variations and environments",
    website: "https://devcycle.com", docs: "https://docs.devcycle.com/management-api/", logo: { favicon: "https://devcycle.com" },
    baseUrl: "https://api.devcycle.com",
    auth: { type: "client_credentials", url: "https://auth.devcycle.com/oauth/token", credentialsIn: "body",
            params: { grant_type: "client_credentials", audience: "https://api.devcycle.com/" } },
    fields: [{ id: "client_id", label: "Client ID" },
             { id: "client_secret", label: "Client secret", secret: true }],
    keyUrl: "https://app.devcycle.com/r/settings",
    help: "1) In app.devcycle.com click the gear icon (“Settings”) in the header and scroll down to the “API Authentication” section. "
      + "2) Copy the “Client ID” and the “Client Secret” shown there: they are the organization's management API credentials and allow "
      + "reading and modifying all its projects, so do not share them. 3) Conector requests the DevCycle access token by itself with "
      + "those credentials (client credentials) whenever it needs one.",
    test: { path: "/v1/projects", message: "Credentials are valid" },
    examples: "Examples: GET /v1/projects, GET /v1/projects/{project}/features, GET /v1/projects/{project}/features/{feature}, "
      + "GET /v1/projects/{project}/environments, "
      + "PATCH /v1/projects/{project}/features/{feature}/configurations?environment={environment} (changes a flag's rules).",
  },
  {
    id: "devolens", name: "Devolens / Cryptolens", category: "developer",
    description: "Devolens / Cryptolens licenses, products and customers",
    website: "https://devolens.com", docs: "https://app.cryptolens.io/docs/api/v3/", logo: { favicon: "https://devolens.com" },
    baseUrl: "https://api.cryptolens.io/api",
    auth: { type: "query", name: "token" },
    fields: [{ id: "token", label: "Access token", secret: true }],
    keyUrl: "https://app.cryptolens.io/User/AccessToken",
    help: "1) Go to app.cryptolens.io (Devolens) and open “Access Tokens” (your account menu). 2) Click “Create Access Token” "
      + "and select the methods you need (for example, read products, keys and customers; create or extend licenses): the token "
      + "will only be able to use those methods. 3) Copy the token: it is shown only once.",
    // Fake token: 401 “Unable to authenticate”. Valid token without the GetProducts permission: “Access denied” (this also
    // counts as valid).
    test: { path: "/product/GetProducts", acceptStatus: [401, 403], message: "Access token recognized",
              validate: (d) => {
                if (d?.result === 1 && !/access denied/i.test(d.message || "")) {
                  throw new Error(`Devolens: ${d.message || "the token is not valid"}`);
                }
              } },
    examples: "Examples (each method needs that permission on the token): GET /product/GetProducts, GET /product/GetKeys?ProductId=…&page=1, "
      + "GET /key/GetKey?ProductId=…&Key=…, GET /key/CreateKey?ProductId=…&Period=30, GET /customer/GetCustomers. "
      + "Responses include \"result\": 0 (success) or 1 (error) and \"message\".",
  },
  {
    id: "digicert", name: "DigiCert", category: "security", description: "TLS/SSL certificates, orders, domains and organizations",
    website: "https://www.digicert.com", docs: "https://dev.digicert.com/en/certcentral-apis/services-api.html",
    logo: { favicon: "https://www.digicert.com" },
    baseUrl: "https://{server}/services/v2",
    auth: { type: "header", name: "X-DC-DEVKEY" },
    fields: [{ id: "server", label: "CertCentral console", format: "domain", default: "www.digicert.com",
               options: [["www.digicert.com", "CertCentral US (www.digicert.com)"],
                          ["certcentral.digicert.eu", "CertCentral Europe (certcentral.digicert.eu)"]] },
             { id: "token", label: "API key", secret: true }],
    keyUrl: "https://www.digicert.com/secure/automation/api-keys",
    help: "1) Sign in to CertCentral (if “CertCentral Europe” appears at the top left, choose the Europe console). "
      + "2) Open “Automation” → “API Keys” and click “Add API Key”. 3) Enter a description and link the key to a user or to a "
      + "service user: it will have their permissions (only administrators can create service users). If you will only "
      + "read data, in the restrictions choose “View Only” (GET requests only). 4) Copy the key: it is shown only once.",
    test: { path: "/user/me", account: (d) => d.email || d.username },
    examples: "Examples: GET /user/me, GET /order/certificate?limit=20, GET /domain, GET /organization, "
      + "POST /order/certificate/{product_name_id} {…order data…}.",
  },
];
