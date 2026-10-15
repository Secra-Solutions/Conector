// Batch 32 of the catalog, from the Composio catalog: marketing (creatives, affiliate marketing, push, social media, QR, product updates,
// newsletters, email, short links, email verification, brands, engagement, postal mail, SMS and company data).

const count = (d, one, many) => (Array.isArray(d) ? `${d.length} ${d.length === 1 ? one : many}` : null);

export default [
  {
    id: "adrapid", name: "Adrapid", category: "marketing", description: "Marketing creatives from templates: banners and videos",
    website: "https://www.adrapid.com", docs: "https://docs.adrapid.com", logo: { favicon: "https://www.adrapid.com" },
    baseUrl: "https://api.adrapid.com",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API token", secret: true }],
    help: "1) In Adrapid open “Settings” → “API” and generate a token. 2) Copy it. 3) Each render uses credits from your plan.",
    test: { path: "/templates", message: (d) => count(d, "template", "templates") || "API token is valid" },
    examples: "Examples: GET /templates, GET /templates/{id}, POST /banners {\"templateId\": \"…\", \"modes\": {\"png\": true}, \"overrides\": "
      + "{\"title\": {\"text\": \"…\"}}}, GET /banners/{id}.",
  },
  {
    id: "adtraction", name: "Adtraction", category: "marketing", description: "Affiliate marketing: programs, links, transactions and statistics",
    website: "https://adtraction.com", docs: "https://adtraction.docs.apiary.io", logo: { favicon: "https://adtraction.com" },
    baseUrl: "https://api.adtraction.com/v3",
    auth: { type: "header", name: "X-Token" },
    fields: [{ id: "token", label: "API token", secret: true }],
    help: "1) In Adtraction open your account → “Settings” → “API” and copy the token. 2) It works for both affiliate and advertiser accounts.",
    // The API uses POST for queries.
    test: { method: "POST", path: "/partner/programs", body: {}, message: "API token is valid" },
    examples: "Queries are POST with JSON. Examples: POST /partner/programs {\"market\": \"ES\"}, POST /partner/transactions "
      + "{\"fromDate\": \"2026-10-01\", \"toDate\": \"2026-10-15\"}, POST /partner/tracking/url {\"programId\": …, \"channelId\": …, \"url\": \"https://…\"}.",
  },
  {
    id: "aimtell", name: "Aimtell", category: "marketing", description: "Web push notifications: sites, subscribers and campaigns",
    website: "https://aimtell.com", docs: "https://aimtell.com/files/docs/api", logo: { favicon: "https://aimtell.com" },
    baseUrl: "https://api.aimtell.com/prod",
    auth: { type: "header", name: "X-Authorization-Api-Key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) In Aimtell open “Account” → “API Key” and copy the key.",
    test: { path: "/sites", message: (d) => count(d, "site", "sites") || "API key is valid" },
    examples: "Examples: GET /sites, GET /site/{siteId}/subscribers, POST /push {\"idSite\": …, \"title\": \"…\", \"body\": \"…\", \"link\": "
      + "\"https://…\"}, GET /site/{siteId}/campaigns.",
  },
  {
    id: "ayrshare", name: "Ayrshare", category: "marketing", description: "Social media API: post, schedule and analyze on 13 networks",
    website: "https://www.ayrshare.com", docs: "https://www.ayrshare.com/docs/apis/overview", logo: { favicon: "https://www.ayrshare.com" },
    baseUrl: "https://api.ayrshare.com/api",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://app.ayrshare.com/api",
    help: "1) In Ayrshare connect your social networks and open “API Key”. 2) Copy the key.",
    test: { path: "/user", account: (d) => d?.email || d?.displayNames?.[0]?.displayName },
    examples: "Examples: POST /post {\"post\": \"…\", \"platforms\": [\"linkedin\", \"instagram\"], \"mediaUrls\": [\"https://…\"]}, "
      + "POST /post with scheduleDate (to schedule), GET /history?lastRecords=20, POST /analytics/post {\"id\": \"…\", \"platforms\": [\"…\"]}, GET /user.",
  },
  {
    id: "beaconstac", name: "Uniqode (Beaconstac)", category: "marketing", description: "Dynamic QR codes and digital business cards",
    website: "https://www.uniqode.com", docs: "https://docs.uniqode.com", logo: { favicon: "https://www.uniqode.com" },
    baseUrl: "https://api.beaconstac.com/api/2.0",
    auth: { type: "header", name: "Authorization", prefix: "Token " },
    fields: [{ id: "token", label: "API token", secret: true }],
    help: "1) In Uniqode (formerly Beaconstac) open “Account” → “API Key” and copy the token. 2) It requires a plan with API access.",
    test: { path: "/users/", message: "API token is valid" },
    examples: "Examples: GET /qrcodes/?organization=…, POST /qrcodes/ {\"name\": \"…\", \"organization\": …, \"qr_type\": 2, \"fields_data\": "
      + "{\"qr_type\": 1, \"url\": \"https://…\"}}, GET /qrcodes/{id}/, GET /qrcodes/{id}/download/?size=1024&error_correction_level=5.",
  },
  {
    id: "beamer", name: "Beamer", category: "marketing", description: "Product updates and changelog: posts and comments",
    website: "https://www.getbeamer.com", docs: "https://www.getbeamer.com/api", logo: { favicon: "https://www.getbeamer.com" },
    baseUrl: "https://api.getbeamer.com/v0",
    auth: { type: "header", name: "Beamer-Api-Key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://app.getbeamer.com/settings#api",
    help: "1) In Beamer open “Settings” → “API” and create a key (with read or write permissions). 2) Copy it.",
    test: { path: "/ping", message: "API key is valid" },
    examples: "Examples: GET /posts?maxResults=20, POST /posts {\"title\": [\"…\"], \"content\": [\"…\"], \"category\": \"new\", \"language\": [\"EN\"]}, "
      + "GET /posts/{id}/comments, GET /feature-requests, GET /nps.",
  },
  {
    id: "beehiiv", name: "beehiiv", category: "marketing", description: "Newsletters: publications, subscribers, posts and segments",
    website: "https://www.beehiiv.com", docs: "https://developers.beehiiv.com", logo: { favicon: "https://www.beehiiv.com" },
    baseUrl: "https://api.beehiiv.com/v2",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) In beehiiv open “Settings” → “Workspace” → “API” and create a key. 2) Copy it (the publication ID appears on the same page).",
    test: { path: "/publications", message: (d) => count(d?.data, "publication", "publications") || "API key is valid" },
    examples: "Examples: GET /publications, GET /publications/{pubId}/subscriptions?limit=20, POST /publications/{pubId}/subscriptions "
      + "{\"email\": \"…\", \"send_welcome_email\": true}, GET /publications/{pubId}/posts?status=confirmed, GET /publications/{pubId}/segments.",
  },
  {
    id: "benchmarkemail", name: "Benchmark Email", category: "marketing", description: "Email marketing: lists, contacts, campaigns and reports",
    website: "https://www.benchmarkemail.com", docs: "https://developer.benchmarkemail.com", logo: { favicon: "https://www.benchmarkemail.com" },
    baseUrl: "https://clientapi.benchmarkemail.com",
    auth: { type: "header", name: "AuthToken" },
    fields: [{ id: "token", label: "API token", secret: true }],
    help: "1) In Benchmark Email open your account → “Integrations” → “API Key” and copy the token.",
    test: { path: "/Client/Setting", message: "API token is valid" },
    examples: "Examples: GET /Contact/?PageSize=20, GET /Contact/{listId}/ContactDetails, POST /Contact/{listId}/ContactDetails {\"Data\": "
      + "{\"Email\": \"…\"}}, GET /Emails/?PageSize=20, GET /Emails/{id}/Report.",
  },
  {
    id: "bigmailer", name: "BigMailer", category: "marketing", description: "Multi-brand email marketing: lists, contacts and campaigns",
    website: "https://www.bigmailer.io", docs: "https://docs.bigmailer.io", logo: { favicon: "https://www.bigmailer.io" },
    baseUrl: "https://api.bigmailer.io/v1",
    auth: { type: "header", name: "X-API-Key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) In BigMailer open “Account” → “API” and create a key. 2) Copy it.",
    test: { path: "/me", account: (d) => d?.email || d?.name },
    examples: "Examples: GET /brands, GET /brands/{brandId}/contacts?limit=20, POST /brands/{brandId}/contacts {\"email\": \"…\", \"list_ids\": "
      + "[\"…\"]}, GET /brands/{brandId}/lists, GET /brands/{brandId}/bulk-campaigns.",
  },
  {
    id: "bitly", name: "Bitly", category: "marketing", description: "Short links, QR codes and click statistics",
    website: "https://bitly.com", docs: "https://dev.bitly.com/api-reference", logo: { favicon: "https://bitly.com" },
    baseUrl: "https://api-ssl.bitly.com/v4",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "Access token", secret: true }],
    // One click: Conector's OAuth app on Bitly (tokens do not expire).
    oauth: { scopes: [], provider: { name: "Bitly", key: "bitly", redirect: "localhost",
      authorizeUrl: "https://bitly.com/oauth/authorize", tokenUrl: "https://api-ssl.bitly.com/oauth/access_token",
      help: "1) In Bitly open “Settings” → “Developer settings” → “OAuth” and register an application named “Conector”. 2) In “Redirect URIs” "
        + "paste the redirect URI shown below. 3) Copy the “Client ID” and the “Client Secret”." } },
    keyUrl: "https://app.bitly.com/settings/api/",
    help: "1) In Bitly open “Settings” → “Developer settings” → “API”. 2) Enter your password and click “Generate token”. 3) Copy the token.",
    test: { path: "/user", account: (d) => d?.login || d?.name },
    examples: "Examples: POST /shorten {\"long_url\": \"https://…\"}, GET /groups, GET /groups/{guid}/bitlinks?size=20, "
      + "GET /bitlinks/{bitlink}/clicks/summary?unit=day&units=30, POST /qr-codes {…}.",
  },
  {
    id: "bouncify", name: "Bouncify", category: "marketing", description: "Email verification: single addresses and lists",
    website: "https://bouncify.io", docs: "https://docs.bouncify.io", logo: { favicon: "https://bouncify.io" },
    baseUrl: "https://api.bouncify.io/v1",
    auth: { type: "query", name: "apikey" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://app.bouncify.io/api",
    help: "1) In Bouncify open “API” in the dashboard and copy the key. 2) Each verification uses one credit; the test only checks the balance.",
    test: { path: "/info", message: (d) => (d?.credits_info?.credits_remaining != null ? `Credits remaining: ${d.credits_info.credits_remaining}` : "API key is valid") },
    examples: "Examples: GET /verify?email=…, POST /bulk (multipart with the CSV), GET /bulk?job_id=…, GET /download?job_id=…, GET /info.",
  },
  {
    id: "brandfetch", name: "Brandfetch", category: "marketing", description: "Brand logos, colors, fonts and information by domain",
    website: "https://brandfetch.com", docs: "https://docs.brandfetch.com", logo: { favicon: "https://brandfetch.com" },
    baseUrl: "https://api.brandfetch.io/v2",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) Create an account at developers.brandfetch.com and copy the API key (there is a free monthly quota). 2) Each brand lookup "
      + "counts against the quota; so does the connection test.",
    test: { path: "/brands/brandfetch.com", account: (d) => d?.name },
    examples: "Examples: GET /brands/{domain} (logos, colors, fonts, social links), GET /search/{name} (brand search), "
      + "GET /brands/transaction?query=… (brand from a payment description).",
  },
  {
    id: "braze", name: "Braze", category: "marketing", description: "Engagement: users, campaigns, canvases, segments and messages",
    website: "https://www.braze.com", docs: "https://www.braze.com/docs/api/basics/", logo: { favicon: "https://www.braze.com" },
    baseUrl: "https://{server}",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "REST API key", secret: true },
             { id: "server", label: "Instance", default: "rest.fra-01.braze.eu",
               options: [["rest.fra-01.braze.eu", "EU-01"], ["rest.fra-02.braze.eu", "EU-02"], ["rest.iad-01.braze.com", "US-01"],
                          ["rest.iad-02.braze.com", "US-02"], ["rest.iad-03.braze.com", "US-03"], ["rest.iad-04.braze.com", "US-04"],
                          ["rest.iad-05.braze.com", "US-05"], ["rest.iad-06.braze.com", "US-06"], ["rest.iad-07.braze.com", "US-07"],
                          ["rest.iad-08.braze.com", "US-08"]],
               help: "The one in your dashboard URL (e.g. dashboard-01.braze.eu → EU-01)." }],
    help: "1) In Braze open “Settings” → “APIs and Identifiers” → “API Keys” and create a key with the permissions you need. 2) Copy it and "
      + "choose the instance of your account here.",
    test: { path: "/campaigns/list", query: { page: 0 }, message: "API key is valid" },
    examples: "Examples: GET /campaigns/list, GET /canvas/list, POST /users/track {\"attributes\": [{\"external_id\": \"…\", \"email\": \"…\"}]}, "
      + "POST /users/export/ids {\"external_ids\": [\"…\"]}, POST /messages/send {…}, GET /segments/list.",
  },
  {
    id: "bulkemailchecker", name: "Bulk Email Checker", category: "marketing", description: "Real-time and bulk email verification",
    website: "https://www.bulkemailchecker.com", docs: "https://www.bulkemailchecker.com/api/", logo: { favicon: "https://www.bulkemailchecker.com" },
    baseUrl: "https://api.bulkemailchecker.com",
    auth: { type: "query", name: "key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) In Bulk Email Checker open “API” in your account and copy the key. 2) Each verification uses one credit; so does the test.",
    // Errors come back with 200 and an error field.
    test: { path: "/real-time/", query: { email: "info@bulkemailchecker.com" },
              validate: (d) => { if (d?.error) throw new Error(`Bulk Email Checker: ${d.error}`); }, message: "API key is valid" },
    examples: "Examples: GET /real-time/?email=… (status passed, failed or unknown, the reason and whether it is disposable).",
  },
  {
    id: "cardly", name: "Cardly", category: "marketing", description: "Personalized cards and letters sent by postal mail",
    website: "https://www.cardly.net", docs: "https://api.card.ly/docs", logo: { favicon: "https://www.cardly.net" },
    baseUrl: "https://api.card.ly/v2",
    auth: { type: "header", name: "API-Key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) In Cardly open “Settings” → “API Keys” and create a key (a test key starts with test_). 2) Copy it. 3) Each card sent is charged.",
    test: { path: "/account/balance", message: "API key is valid" },
    examples: "Examples: GET /account/balance, GET /artwork, GET /templates, POST /orders/place {\"lines\": [{\"product\": \"…\", \"artwork\": "
      + "\"…\", \"recipient\": {…}, \"variables\": {…}}]}, GET /orders/{id}.",
  },
  {
    id: "clicksend", name: "ClickSend", category: "communication", description: "SMS, MMS, voice, email and postal mail: sending and balance",
    website: "https://www.clicksend.com", docs: "https://developers.clicksend.com/docs/", logo: { favicon: "https://www.clicksend.com" },
    baseUrl: "https://rest.clicksend.com/v3",
    auth: { type: "basic", usernameField: "username", passwordField: "token" },
    fields: [{ id: "username", label: "ClickSend username" }, { id: "token", label: "API key", secret: true }],
    keyUrl: "https://dashboard.clicksend.com/account/subaccounts",
    help: "1) In the ClickSend dashboard open “Developers” → “API Credentials”. 2) Copy the username and the API key (each sub-account has its own).",
    test: { path: "/account", account: (d) => d?.data?.user_email || d?.data?.username },
    examples: "Examples: POST /sms/send {\"messages\": [{\"to\": \"+1…\", \"body\": \"…\", \"source\": \"conector\"}]} (it really sends the message), "
      + "POST /sms/price (price without sending), GET /sms/history?date_from=…, GET /account, GET /email/addresses.",
  },
  {
    id: "contentstudio", name: "ContentStudio", category: "marketing", description: "Social media management: workspaces, accounts, posts and scheduling",
    website: "https://contentstudio.io", docs: "https://docs.contentstudio.io", logo: { favicon: "https://contentstudio.io" },
    baseUrl: "https://api.contentstudio.io/api/v1",
    auth: { type: "header", name: "X-API-Key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) In ContentStudio open “Settings” → “API Keys” and create a key. 2) Copy it.",
    test: { path: "/workspaces", message: (d) => count(d?.data, "workspace", "workspaces") || "API key is valid" },
    examples: "Examples: GET /workspaces, GET /workspaces/{id}/accounts, POST /workspaces/{id}/posts {\"content\": {\"text\": \"…\"}, \"accounts\": "
      + "[\"…\"], \"scheduling\": {\"publish_type\": \"scheduled\", \"scheduled_at\": \"…\"}}, GET /workspaces/{id}/posts.",
  },
  {
    id: "crustdata", name: "Crustdata", category: "crm", description: "Real-time company and people data: headcount and signals",
    website: "https://crustdata.com", docs: "https://fulldocs.crustdata.com", logo: { favicon: "https://crustdata.com" },
    baseUrl: "https://api.crustdata.com",
    auth: { type: "header", name: "Authorization", prefix: "Token " },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) Request access at crustdata.com and copy the key they assign to you. 2) Each query uses credits; so does the connection test.",
    test: { path: "/screener/company", query: { company_domain: "crustdata.com" }, message: "API key is valid" },
    examples: "Examples: GET /screener/company?company_domain=…, POST /screener/person/enrich {\"linkedin_profile_url\": \"…\"}, "
      + "POST /screener/companydb/search {\"filters\": [{…}]}, GET /screener/linkedin_posts?company_domain=….",
  },
];
