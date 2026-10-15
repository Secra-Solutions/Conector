// Batch 35 of the Composio catalog: marketing (cold email, newsletters, SEO, email verification, push notifications,
// social media, Wallet passes, loyalty, direct mail, social proof, giveaways and referral programs).

const count = (d, one, many) => (Array.isArray(d) ? `${d.length} ${d.length === 1 ? one : many}` : null);

export default [
  {
    id: "manyreach", name: "ManyReach", category: "marketing", description: "Cold email: campaigns, sequences, prospects and senders",
    website: "https://manyreach.com", docs: "https://api.manyreach.com/api", logo: { favicon: "https://manyreach.com" },
    baseUrl: "https://api.manyreach.com/api/v2",
    auth: { type: "header", name: "X-API-Key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) In ManyReach, open “Settings” → “API” and generate a key. 2) Copy it.",
    test: { path: "/account", message: "API key is valid" },
    examples: "Examples: GET /campaigns, GET /campaigns/{id}/stats, GET /campaigns/{id}/prospects, POST /prospects {\"email\": \"…\", "
      + "\"firstName\": \"…\"}, POST /prospects/bulk {…}, GET /senders, GET /lists, GET /messages?type=…, POST /campaigns/{id}/pause "
      + "(starting a campaign sends real emails: POST /campaigns/{id}/start).",
  },
  {
    id: "moosend", name: "Moosend", category: "marketing", description: "Email marketing: lists, subscribers, campaigns and segments",
    website: "https://moosend.com", docs: "https://moosend.com/developers/api-documentation/en/index.html", logo: { favicon: "https://moosend.com" },
    baseUrl: "https://api.moosend.com/v3",
    auth: { type: "query", name: "apikey" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) In Moosend, open “More” → “Settings” → “API key”. 2) Copy the key (a UUID-like code).",
    // Moosend also responds 200 to a bad key: {"Code": 100, "Error": "USER_NOT_FOUND"}.
    test: { path: "/lists.json", query: { PageSize: 1 }, message: "API key is valid",
              validate: (d) => {
                if (d?.Code !== 0) throw new Error(`Moosend: ${d?.Error || "invalid response"}`);
              } },
    examples: "All paths end in .json and responses include Code (0 = success) and Context. Examples: GET /lists.json, "
      + "GET /lists/{listId}/subscribers/Subscribed.json, POST /subscribers/{listId}/subscribe.json {\"Email\": \"…\", \"Name\": \"…\"}, "
      + "GET /campaigns.json, GET /campaigns/{id}/view.json, GET /lists/{listId}/segments.json.",
  },
  {
    id: "moz", name: "Moz", category: "marketing", description: "SEO: domain authority, links, keywords and rankings",
    website: "https://moz.com", docs: "https://moz.com/api/docs", logo: { favicon: "https://moz.com" },
    baseUrl: "https://api.moz.com",
    auth: { type: "header", name: "x-moz-token" },
    fields: [{ id: "token", label: "API token", secret: true }],
    keyUrl: "https://moz.com/api/dashboard",
    help: "1) Open the Moz API dashboard (moz.com/api/dashboard) and create a token. 2) Copy it. 3) Each query deducts rows from "
      + "the monthly quota; the connection test only checks the quota.",
    test: { method: "POST", path: "/jsonrpc",
              body: { jsonrpc: "2.0", id: "conector-connection-check-000001", method: "quota.lookup", params: { data: { path: "api.limits.data.rows" } } },
              message: "Token is valid",
              validate: (d) => {
                if (d?.error) throw new Error(`Moz: ${d.error.message}`);
              } },
    examples: "JSON-RPC API: POST /jsonrpc {\"jsonrpc\": \"2.0\", \"id\": \"<24 characters or more>\", \"method\": \"…\", \"params\": {\"data\": "
      + "{…}}}. Methods: data.site.metrics.fetch {\"site_query\": {\"query\": \"example.com\", \"scope\": \"domain\"}}, "
      + "data.site.metrics.brand.authority.fetch, data.site.link.list, data.site.linking.domain.list, data.site.anchor.text.list, "
      + "data.site.top.page.list, data.site.ranking.keywords.list {\"target_query\": {…}}, data.keyword.metrics.fetch {\"serp_query\": "
      + "{\"keyword\": \"…\", \"locale\": \"en-US\"}}, data.keyword.suggestions.list, data.keyword.search.intent.fetch, quota.lookup.",
  },
  {
    id: "myemailverifier", name: "MyEmailVerifier", category: "marketing", description: "Single email verification and credit balance",
    website: "https://myemailverifier.com", docs: "https://myemailverifier.com/real-time-email-verification",
    logo: { favicon: "https://myemailverifier.com" },
    baseUrl: "https://client.myemailverifier.com/verifier",
    // The key goes at the end of the path (…/getcredits/<key>, …/validate_single/<email>/<key>): it is added when signing.
    auth: { type: "signature", sign: ({ url, cred }) => {
      url.pathname = `${url.pathname.replace(/\/+$/, "")}/${encodeURIComponent(cred.token)}`;
    } },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) In MyEmailVerifier, open “API” in the dashboard and copy the key. 2) Conector adds it to the end of each path. 3) Each "
      + "verification uses one credit; the test only checks the balance.",
    test: { path: "/getcredits", message: (d) => (d?.credits != null ? `${d.credits} credits` : "API key is valid") },
    examples: "Do not include the key in the path: it is added automatically. Examples: GET /validate_single/you@example.com (Status: Valid, Invalid, "
      + "Unknown, Catch All; disposable, role, free), GET /getcredits.",
  },
  {
    id: "neuronwriter", name: "NeuronWriter", category: "marketing", description: "Content SEO: keyword analysis and scoring",
    website: "https://neuronwriter.com", docs: "https://neuronwriter.com/faqs/neuronwriter-api-how-to-use/", logo: { favicon: "https://neuronwriter.com" },
    baseUrl: "https://app.neuronwriter.com/neuron-api/0.5/writer",
    auth: { type: "header", name: "X-API-KEY" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) In NeuronWriter, open your profile → “Neuron API access” and copy the key (the API is on Gold plans or higher). "
      + "2) Each new analysis uses credits from the plan; the test only lists the projects.",
    test: { method: "POST", path: "/list-projects", body: {}, message: (d) => count(d, "project", "projects") || "API key is valid" },
    examples: "All calls are POST. Examples: /list-projects {}, /new-query {\"project\": \"…\", \"keyword\": \"…\", \"engine\": "
      + "\"google.com\", \"language\": \"English\"}, /get-query {\"query\": \"…\"} (terms, questions and competitors when status = "
      + "ready), /list-queries {\"project\": \"…\"}, /import-content {\"query\": \"…\", \"html\": \"…\"}, /evaluate-content {…}.",
  },
  {
    id: "neverbounce", name: "NeverBounce", category: "marketing", description: "Single and batch email verification",
    website: "https://neverbounce.com", docs: "https://developers.neverbounce.com/reference", logo: { favicon: "https://neverbounce.com" },
    baseUrl: "https://api.neverbounce.com/v4.2",
    auth: { type: "query", name: "key" },
    fields: [{ id: "token", label: "API key (secret_…)", secret: true }],
    keyUrl: "https://app.neverbounce.com/apps",
    help: "1) In NeverBounce, open “Apps” → “Create Custom Integration” and copy the “API Key” (secret_…). 2) Each verification uses "
      + "one credit; the test only queries the account.",
    // NeverBounce responds 200 to a bad key: {"status": "auth_failure", "message": "Invalid API key …"}.
    test: { path: "/account/info", message: (d) => (d?.credits_info ? "Key is valid: account has credits" : "API key is valid"),
              validate: (d) => {
                if (d?.status !== "success") throw new Error(`NeverBounce: ${d?.message || d?.status || "invalid response"}`);
              } },
    examples: "Examples: GET /single/check?email=… (valid, invalid, disposable, catchall, unknown), POST /jobs/create {\"input_location\": "
      + "\"supplied\", \"input\": [[\"you@example.com\"]], \"auto_parse\": true, \"auto_start\": true}, GET /jobs/status?job_id=…, "
      + "GET /jobs/results?job_id=…, GET /account/info.",
  },
  {
    id: "niftyimages", name: "NiftyImages", category: "marketing", description: "Dynamic images for email: timers and personalization",
    website: "https://niftyimages.com", docs: "https://api.niftyimages.com", logo: { favicon: "https://niftyimages.com" },
    baseUrl: "https://api.niftyimages.com/v1",
    auth: { type: "header", name: "ApiKey" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) In NiftyImages, open “Account” → “API Keys” and create a key. 2) Copy it.",
    test: { path: "/Widgets", message: "API key is valid" },
    examples: "Examples: GET /Widgets (timers and images), GET /Widgets/{widgetKey}?startDate=…&endDate=… (statistics), "
      + "GET /Images, GET /DataStores/{storeKey}/records, POST /DataStores/{storeKey}/records [{…}].",
  },
  {
    id: "omnisend", name: "Omnisend", category: "marketing", description: "Email and SMS for ecommerce: contacts, events and campaigns",
    website: "https://www.omnisend.com", docs: "https://api-docs.omnisend.com", logo: { favicon: "https://www.omnisend.com" },
    baseUrl: "https://api.omnisend.com/v5",
    auth: { type: "header", name: "X-API-KEY" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) In Omnisend, open “Store settings” → “API keys” → “Create API key”, name it and select the permissions you need. 2) Copy the "
      + "key: it is shown only once.",
    test: { path: "/contacts", query: { limit: 1 }, message: "API key is valid" },
    examples: "Examples: GET /contacts?limit=50, GET /contacts?email=…, POST /contacts {\"identifiers\": [{\"type\": \"email\", \"id\": "
      + "\"…\", \"channels\": {\"email\": {\"status\": \"subscribed\"}}}]}, POST /events {\"eventName\": \"…\", \"contact\": {\"email\": "
      + "\"…\"}, \"properties\": {…}}, GET /campaigns, GET /segments, GET /products.",
  },
  {
    id: "onesignal", name: "OneSignal", category: "marketing", description: "Push, email and SMS notifications for an app: sends and users",
    website: "https://onesignal.com", docs: "https://documentation.onesignal.com/reference", logo: { favicon: "https://onesignal.com" },
    baseUrl: "https://api.onesignal.com",
    auth: { type: "header", name: "Authorization", prefix: "Key " },
    fields: [{ id: "app", label: "App ID", format: "segment", example: "5eb5a37e-b458-11e3-ac11-000c2940e62c" },
             { id: "token", label: "App API Key", secret: true }],
    help: "1) In OneSignal, open your app → “Settings” → “Keys & IDs”. 2) Copy the “App ID” and create an app “API Key” (the key is shown "
      + "only once). To manage several apps, use the “OneSignal (organization)” connector.",
    test: { path: "/notifications?app_id={app}&limit=1", message: "App key is valid" },
    examples: "Examples: POST /notifications {\"app_id\": \"…\", \"contents\": {\"en\": \"…\", \"es\": \"…\"}, \"included_segments\": "
      + "[\"Total Subscriptions\"]} (really sends), GET /notifications?app_id=…&limit=20, GET /notifications/{id}?app_id=…, "
      + "GET /apps/{appId}/segments, GET /apps/{appId}/users/by/external_id/{id}, POST /apps/{appId}/users {…}.",
  },
  {
    id: "onesignalorg", name: "OneSignal (organization)", category: "marketing", description: "Manage the apps of a OneSignal organization",
    website: "https://onesignal.com", docs: "https://documentation.onesignal.com/reference/view-apps", logo: { favicon: "https://onesignal.com" },
    baseUrl: "https://api.onesignal.com",
    auth: { type: "header", name: "Authorization", prefix: "Key " },
    fields: [{ id: "token", label: "Organization API Key", secret: true }],
    help: "1) In OneSignal, open “Organizations” → your organization → “Keys & IDs” and create an “Organization API Key”. 2) Copy it: it is "
      + "shown only once. It is used to create and configure apps; to send notifications, use the “OneSignal” connector with the app key.",
    test: { path: "/apps", message: (d) => count(d, "app", "apps") || "Organization key is valid" },
    examples: "Examples: GET /apps, GET /apps/{appId}, POST /apps {\"name\": \"…\", \"organization_id\": \"…\"}, PUT /apps/{appId} {…}, "
      + "GET /apps/{appId}/api_keys, POST /apps/{appId}/auth/tokens {\"name\": \"…\"} (creates an app key).",
  },
  {
    id: "oneup", name: "OneUp", category: "marketing", description: "Scheduling posts on social media and Google Business",
    website: "https://www.oneupapp.io", docs: "https://www.oneupapp.io/api-access", logo: { favicon: "https://www.oneupapp.io" },
    baseUrl: "https://www.oneupapp.io/api",
    auth: { type: "query", name: "apiKey" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://www.oneupapp.io/api-access",
    help: "1) In OneUp, open “API Access” (oneupapp.io/api-access) and copy the key. 2) Paste it here.",
    // OneUp responds 200 to a bad key: {"message": "Invalid API Key", "error": true}.
    test: { path: "/listcategory", message: (d) => count(d?.data, "category", "categories") || "API key is valid",
              validate: (d) => {
                if (d?.error) throw new Error(`OneUp: ${d.message || "invalid response"}`);
              } },
    examples: "Examples: GET /listcategory, GET /listsocialaccounts, GET /listcategoryaccount?category_id=…, "
      + "POST /scheduletextpost?category_id=…&social_network_id=…&scheduled_date_time=2026-10-20 10:00&content=…, "
      + "POST /scheduleimagepost (with image_url), GET /getscheduledposts.",
  },
  {
    id: "onlysocial", name: "OnlySocial", category: "marketing", description: "Social media publishing: accounts, posts, media and tags",
    website: "https://onlysocial.io", docs: "https://onlysocial.io/api", logo: { favicon: "https://onlysocial.io" },
    baseUrl: "https://app.onlysocial.io/os/api/{workspace}",
    auth: { type: "bearer" },
    fields: [{ id: "workspace", label: "Workspace UUID", format: "segment", example: "9a1b2c3d-4e5f-4a6b-8c7d-0e1f2a3b4c5d",
               help: "It appears in the OnlySocial URL when you open the workspace." },
             { id: "token", label: "Access token", secret: true }],
    help: "1) In OnlySocial, open your profile → “Access Tokens” and create a token. 2) Also copy the workspace UUID from the URL.",
    test: { path: "/accounts", message: (d) => count(d?.data ?? d, "account", "accounts") || "Token is valid" },
    examples: "Examples: GET /accounts, GET /posts?page=1, GET /posts/{uuid}, POST /posts {\"accounts\": [1], \"date\": \"2026-10-20\", "
      + "\"time\": \"10:00\", \"timezone\": \"America/New_York\", \"schedule\": true, \"versions\": [{\"account_id\": 0, \"is_original\": "
      + "true, \"content\": [{\"body\": \"…\", \"media\": []}]}]}, DELETE /posts/{uuid}, GET /media, GET /tags, POST /tags {\"name\": "
      + "\"…\", \"hex_color\": \"#1188ff\"}.",
  },
  {
    id: "ordinal", name: "Ordinal", category: "marketing", description: "Social calendar for LinkedIn and X: posts, approvals and analytics",
    website: "https://www.tryordinal.com", docs: "https://docs.tryordinal.com/api/introduction", logo: { favicon: "https://www.tryordinal.com" },
    baseUrl: "https://app.tryordinal.com/api/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key (ord_…)", secret: true }],
    help: "1) In Ordinal, open the workspace settings → “API Keys” → “Create an API Key” (Pro plan or higher). 2) Copy the "
      + "key: it is shown only once. Each workspace has its own keys.",
    test: { path: "/workspace", account: (d) => d?.name },
    examples: "Examples: GET /workspace, GET /posts, GET /posts/{id}, POST /posts {…}, GET /profiles, GET /labels, GET /approvals, "
      + "GET /analytics/linkedin/posts, GET /analytics/x/posts, POST /uploads {\"url\": \"https://…\"} (uploads a media file from a URL).",
  },
  {
    id: "passcreator", name: "Passcreator", category: "marketing", description: "Apple Wallet and Google Wallet passes: templates, passes and scans",
    website: "https://www.passcreator.com", docs: "https://developer.passcreator.com", logo: { favicon: "https://www.passcreator.com" },
    baseUrl: "https://app.passcreator.com/api",
    auth: { type: "header", name: "Authorization" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) In Passcreator, open “Settings” → “API” and copy the key (or create a new one). 2) Paste it here.",
    test: { path: "/pass-template", message: (d) => count(d, "template", "templates") || "API key is valid" },
    examples: "Examples: GET /pass-template (templates), GET /v3/pass?passTemplate=… (passes), POST /pass?passtemplate={uid} {…template "
      + "fields} (creates a pass), GET /pass/{id}, POST /pass/{id} {…} (updates), GET /appconfiguration (scan configurations), "
      + "GET /appconfiguration/{id}/scans.",
  },
  {
    id: "passslot", name: "PassSlot", category: "marketing", description: "Apple Wallet passes: templates, passes and scanners",
    website: "https://www.passslot.com", docs: "https://www.passslot.com/developer/api", logo: { favicon: "https://www.passslot.com" },
    baseUrl: "https://api.passslot.com/v1",
    auth: { type: "basic", usernameField: "token", fixedPassword: "" },
    fields: [{ id: "token", label: "App Key", secret: true }],
    help: "1) In PassSlot, open “Account” → “App Keys” and create a key (with “Full Access” if you will manage scanners). 2) Copy it: "
      + "Conector sends it as the Basic auth username with an empty password.",
    test: { path: "/templates", message: (d) => count(d, "template", "templates") || "Key is valid" },
    examples: "Examples: GET /templates, POST /templates/{templateId}/pass {\"name\": \"…\"} (creates a pass with the template "
      + "values), GET /passes, GET /passes/{passTypeIdentifier}/{serialNumber}, PUT /passes/{passTypeIdentifier}/{serialNumber}/values "
      + "{…}, GET /passes/{passTypeIdentifier}/{serialNumber}/url, GET /passtypes, GET /scanners.",
  },
  {
    id: "piggy", name: "Leat (formerly Piggy)", category: "marketing", description: "Loyalty: contacts, credits, rewards and vouchers",
    website: "https://www.leat.com", docs: "https://docs.leat.com", logo: { favicon: "https://www.leat.com" },
    baseUrl: "https://api.leat.com/api/v3/oauth/clients",
    headers: { Accept: "application/json" },
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) In Leat (formerly Piggy), open “Settings” → “Integrations” → “API keys” and create a key. 2) Copy it.",
    test: { path: "/shops", message: (d) => count(d?.data, "shop", "shops") || "API key is valid" },
    examples: "Examples: GET /shops, GET /contacts/find-or-create?email=…, GET /contacts/{uuid}, GET /contacts/{uuid}/credit-balance, "
      + "POST /credit-receptions {\"shop_uuid\": \"…\", \"contact_uuid\": \"…\", \"unit_value\": 25}, GET /rewards, GET /perks, GET /forms.",
  },
  {
    id: "planly", name: "Planly", category: "marketing", description: "Social media scheduling: teams, channels, posts and media",
    website: "https://www.planly.com", docs: "https://docs.planly.com", logo: { favicon: "https://www.planly.com" },
    baseUrl: "https://app.planly.com/api",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://app.planly.com/settings/account/security",
    help: "1) In Planly, open “Settings” → “Security” and create an API key. 2) Copy it.",
    // Planly responds 200 with {"error": {"code": 401, …}} to a bad key.
    test: { method: "POST", path: "/teams/list", body: {}, message: "API key is valid",
              validate: (d) => {
                if (d?.error) throw new Error(`Planly: ${d.error.message || "invalid response"}`);
              } },
    examples: "Almost all queries are POST with JSON. Examples: POST /teams/list {}, POST /v2/channels/list {\"teamId\": \"…\"}, "
      + "POST /v2/schedules/list {\"teamId\": \"…\"}, GET /v2/ai/credits?teamId=…, POST /v2/medias/list {\"teamId\": \"…\"}.",
  },
  {
    id: "popupsmart", name: "Popupsmart", category: "marketing", description: "No-code popups: export the leads of a campaign",
    website: "https://popupsmart.com", docs: "https://popupsmart.com/help/analytics/how-to-download-leads-with-api", logo: { favicon: "https://popupsmart.com" },
    baseUrl: "https://app.popupsmart.com/api",
    headers: (c) => ({ "x-campaign-id": c.campaign }),
    auth: { type: "header", name: "x-token" },
    fields: [{ id: "campaign", label: "Campaign ID", format: "segment", example: "123456",
               help: "The campaign number: it appears in its URL inside Popupsmart." },
             { id: "token", label: "API key", secret: true }],
    help: "1) In Popupsmart, open your profile (“Account”) and copy the API key. 2) Enter the ID of the campaign whose leads you want to read.",
    test: { path: "/leads", query: { take: 1 }, message: "API key is valid" },
    examples: "Examples: GET /leads?take=50&skip=0, GET /leads?startDate=2026-10-01&endDate=2026-10-15 (response with “leads”).",
  },
  {
    id: "postalytics", name: "Postalytics", category: "marketing", description: "Automated direct mail: campaigns, templates and lists",
    website: "https://www.postalytics.com", docs: "https://www.postalytics.com/developers/", logo: { favicon: "https://www.postalytics.com" },
    baseUrl: "https://api.postalytics.com/api/v1",
    auth: { type: "basic", usernameField: "token", fixedPassword: "" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) In Postalytics, open “Account” → “API Keys” and copy the key. 2) Conector sends it as the Basic auth username with an empty password. "
      + "Sending campaigns costs real money (printing and postage).",
    test: { path: "/templates", message: "API key is valid" },
    examples: "Examples: GET /campaigns, GET /templates, GET /contacts/list/{listId}, POST /contacts/list/{listId} {\"first_name\": \"…\", "
      + "\"address_street\": \"…\", …}, GET /suppressionlists, GET /webhooks, POST /campaigns {…} (creates a direct mail campaign).",
  },
  {
    id: "postpone", name: "Postpone", category: "marketing", description: "Scheduling on Reddit, X, Instagram, TikTok and more (GraphQL)",
    website: "https://www.postpone.app", docs: "https://developers.postpone.app", logo: { favicon: "https://www.postpone.app" },
    baseUrl: "https://api.postpone.app", graphql: { path: "/gql" },
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API token", secret: true }],
    keyUrl: "https://www.postpone.app/settings",
    help: "1) In Postpone, open “Settings” → “API Token” and copy the personal token (the API is on paid plans). 2) Paste it here.",
    test: { method: "POST", path: "/gql", body: { query: "query profile { profile { id username email } }", operationName: "profile" },
              account: (d) => d?.data?.profile?.username,
              validate: (d) => {
                if (!d?.data?.profile) throw new Error(`Postpone: ${d?.errors?.[0]?.message || "it did not return your profile"}`);
              } },
    examples: "The API is GraphQL (POST /gql): use postpone_graphql. Examples: { profile { id username email } }, queries for scheduled posts "
      + "and their submissions, and mutations to schedule on Reddit, X, Instagram, TikTok, LinkedIn… Explore the "
      + "schema in the Postpone playground.",
  },
  {
    id: "proofly", name: "Proofly", category: "marketing", description: "Social proof notifications: campaigns and activity",
    website: "https://proofly.io", docs: "https://proofly.io/developers", logo: { favicon: "https://proofly.io" },
    baseUrl: "https://proofly.io/api",
    auth: { type: "query", name: "api_key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) In Proofly, open “Account” → “API” and copy the key. 2) Paste it here.",
    test: { path: "/user", message: "API key is valid" },
    examples: "Examples: GET /user (account), GET /campaigns (campaigns and their notifications), GET /activity (activity log).",
  },
  {
    id: "pushalert", name: "PushAlert", category: "marketing", description: "Web push notifications: sends, segments and statistics",
    website: "https://pushalert.co", docs: "https://pushalert.co/documentation/rest-api-v2/web-push", logo: { favicon: "https://pushalert.co" },
    baseUrl: "https://api.pushalert.co/rest/v2/web-push",
    auth: { type: "header", name: "Authorization", prefix: "api_key=" },
    fields: [{ id: "token", label: "REST API key", secret: true }],
    help: "1) In PushAlert, open “Settings” → “API” and copy the “REST API Key”. 2) Paste it here.",
    test: { path: "/segments", message: "API key is valid" },
    examples: "Sends use a form. Examples: POST /send with form title=…&message=…&url=https://… (sends to all "
      + "subscribers), POST /segment/{id}/send {…}, GET /segments, POST /segment/create with form name=…, GET /info/{id} "
      + "(statistics for a notification), POST /attribute/put {…}.",
  },
  {
    id: "rafflys", name: "Rafflys", category: "marketing", description: "Social media giveaways and contests: promotions and account",
    website: "https://app-sorteos.com", docs: "https://app-sorteos.com/en/api", logo: { favicon: "https://app-sorteos.com" },
    baseUrl: "https://app-sorteos.com/api/v2",
    auth: { type: "header", name: "X-API-KEY" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) In Rafflys (app-sorteos.com), open your account → “API” and copy the key. 2) Paste it here.",
    test: { path: "/users/me", account: (d) => d?.data?.email || d?.data?.name },
    examples: "Examples: GET /users/me, GET /promotions (giveaways with status, deadline and entries).",
  },
  {
    id: "referralrock", name: "Referral Rock", category: "marketing", description: "Referral programs: members, referrals and rewards",
    website: "https://referralrock.com", docs: "https://api.referralrock.com/help", logo: { favicon: "https://referralrock.com" },
    baseUrl: "https://api.referralrock.com/api",
    auth: { type: "basic", usernameField: "username", passwordField: "token" },
    fields: [{ id: "username", label: "Public key" }, { id: "token", label: "Private key", secret: true }],
    help: "1) In Referral Rock, open “Settings” → “Integrations” → “API Keys” and generate a key pair. 2) Copy the public key and the "
      + "private key (which is shown only once).",
    test: { path: "/programs", message: "Keys are valid" },
    examples: "Examples: GET /programs, GET /members?count=50, POST /members {\"programId\": \"…\", \"firstName\": \"…\", \"email\": \"…\"}, "
      + "GET /referrals, POST /referrals {…}, POST /referrals/status {…}, GET /rewards, POST /rewards/issue {…}, GET /payouts/pending.",
  },
];
