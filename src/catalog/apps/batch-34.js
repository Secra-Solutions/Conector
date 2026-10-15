// Batch 34 of the catalog, from the Composio catalog: marketing (LinkedIn and email prospecting, influencers, blogs, multichannel
// platforms, search rankings, email verification, newsletters and tracking links).

const count = (d, one, many) => (Array.isArray(d) ? `${d.length} ${d.length === 1 ? one : many}` : null);

export default [
  {
    id: "heyreach", name: "HeyReach", category: "marketing", description: "Multichannel LinkedIn prospecting: campaigns, accounts and leads",
    website: "https://www.heyreach.io", docs: "https://documenter.getpostman.com/view/23808049/2sA2xb5F75", logo: { favicon: "https://www.heyreach.io" },
    baseUrl: "https://api.heyreach.io/api/public",
    auth: { type: "header", name: "X-API-KEY" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) In HeyReach, open “Integrations” → “HeyReach API” and create a key. 2) Copy it.",
    test: { path: "/auth/CheckApiKey", message: "API key is valid" },
    examples: "List queries are POST. Examples: POST /campaign/GetAll {\"offset\": 0, \"limit\": 20}, POST /campaign/AddLeadsToCampaignV2 "
      + "{\"campaignId\": …, \"accountLeadPairs\": [{\"lead\": {\"profileUrl\": \"…\"}}]}, POST /list/GetAll {…}, POST /inbox/GetConversationsV2 {…}.",
  },
  {
    id: "hypeauditor", name: "HypeAuditor", category: "marketing", description: "Influencers: audience reports, quality and profile search",
    website: "https://hypeauditor.com", docs: "https://hypeauditor.readme.io", logo: { favicon: "https://hypeauditor.com" },
    baseUrl: "https://hypeauditor.com/api/method",
    auth: [{ type: "header", name: "X-Auth-Id", field: "username" }, { type: "header", name: "X-Auth-Token" }],
    fields: [{ id: "username", label: "Client ID (X-Auth-Id)" }, { id: "token", label: "API token", secret: true }],
    help: "1) Request access to the HypeAuditor API (enterprise plan) from their website. 2) Copy the “Client ID” and the token. 3) Each report uses "
      + "credits; the connection test requests one.",
    test: { path: "/auditor.report/", query: { username: "instagram" }, message: "Credentials are valid" },
    examples: "Examples: GET /auditor.report/?username=… (Instagram), GET /auditor.youtube/?channel=…, GET /auditor.tiktok/?channel=…, "
      + "POST /auditor.search/ {\"social_network\": \"instagram\", \"account_geo\": {\"country\": [\"es\"]}} (discovery).",
  },
  {
    id: "inblog", name: "Inblog", category: "ecommerce", description: "AI blog: posts, authors, tags and publishing",
    website: "https://inblog.ai", docs: "https://inblog.ai/docs/api", logo: { favicon: "https://inblog.ai" },
    baseUrl: "https://inblog.ai/api/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) In Inblog, open “Settings” → “API Keys” and create a key. 2) Copy it.",
    test: { path: "/posts", query: { "page[size]": 1 }, message: "API key is valid" },
    examples: "JSON:API format. Examples: GET /posts?page[size]=20, GET /posts/{id}, POST /posts {\"data\": {\"type\": \"posts\", \"attributes\": "
      + "{\"title\": \"…\", \"content_html\": \"…\"}}}, GET /authors, GET /tags.",
  },
  {
    id: "instantly", name: "Instantly", category: "marketing", description: "Cold email: sending accounts, campaigns, leads and replies",
    website: "https://instantly.ai", docs: "https://developer.instantly.ai", logo: { favicon: "https://instantly.ai" },
    baseUrl: "https://api.instantly.ai/api/v2",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key (v2)", secret: true }],
    keyUrl: "https://app.instantly.ai/app/settings/integrations",
    help: "1) In Instantly, open “Settings” → “Integrations” → “API Keys” and create a v2 API key with the required permissions. 2) Copy it.",
    test: { path: "/accounts", query: { limit: 1 }, message: "API key is valid" },
    examples: "Examples: GET /accounts?limit=20, GET /campaigns?limit=20, POST /leads {\"campaign\": \"…\", \"email\": \"…\", \"first_name\": \"…\"}, "
      + "POST /leads/list {\"campaign\": \"…\", \"limit\": 50}, GET /emails?limit=20 (unified inbox), GET /campaigns/analytics.",
  },
  {
    id: "iterable", name: "Iterable", category: "marketing", description: "Multichannel marketing: users, events, lists and campaigns",
    website: "https://iterable.com", docs: "https://api.iterable.com/api/docs", logo: { favicon: "https://iterable.com" },
    baseUrl: "https://{server}/api",
    auth: { type: "header", name: "Api-Key" },
    fields: [{ id: "token", label: "API key", secret: true },
             { id: "server", label: "Data center", default: "api.iterable.com",
               options: [["api.iterable.com", "US"], ["api.eu.iterable.com", "European Union"]] }],
    help: "1) In Iterable, open “Integrations” → “API Keys” and create a key of type “Standard”. 2) Copy it and choose the data center here.",
    test: { path: "/lists", message: (d) => count(d?.lists, "list", "lists") || "API key is valid" },
    examples: "Examples: GET /lists, POST /users/update {\"email\": \"…\", \"dataFields\": {…}}, POST /events/track {\"email\": \"…\", \"eventName\": "
      + "\"…\"}, GET /campaigns, POST /email/target {\"campaignId\": …, \"recipientEmail\": \"…\"}, GET /users/{email}.",
  },
  {
    id: "keywordcom", name: "Keyword.com", category: "marketing", description: "Search engine rank tracking: groups, keywords and rankings",
    website: "https://keyword.com", docs: "https://keyword.com/api-docs/", logo: { favicon: "https://keyword.com" },
    baseUrl: "https://app.keyword.com/api/v2",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API token", secret: true }],
    help: "1) In Keyword.com, open “Settings” → “Account” → “API Access” and copy the token.",
    test: { path: "/groups", message: "API token is valid" },
    examples: "Examples: GET /groups, GET /groups/{groupName}/keywords, POST /groups/{groupName}/keywords {\"keywords\": [\"…\"], \"region\": "
      + "\"google.com\"}, GET /groups/{groupName}/keywords/{keywordId}/history.",
  },
  {
    id: "kickbox", name: "Kickbox", category: "marketing", description: "Real-time email verification and credit balance",
    website: "https://kickbox.com", docs: "https://docs.kickbox.com/docs", logo: { favicon: "https://kickbox.com" },
    baseUrl: "https://api.kickbox.com/v2",
    auth: { type: "query", name: "apikey" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://app.kickbox.com/settings/keys",
    help: "1) In Kickbox, open “Settings” → “API Keys” and create a key (test keys start with test_). 2) Copy it. 3) Each verification "
      + "uses one credit; the test only checks the balance.",
    test: { path: "/balance", message: (d) => (d?.balance != null ? `${d.balance} credits` : "API key is valid") },
    examples: "Examples: GET /verify?email=… (deliverable, undeliverable, risky; disposable, role, free), GET /balance.",
  },
  {
    id: "laposta", name: "Laposta", category: "marketing", description: "Newsletters (Netherlands): lists, contacts, fields and campaigns",
    website: "https://laposta.nl", docs: "https://api.laposta.nl/doc/", logo: { favicon: "https://laposta.nl" },
    baseUrl: "https://api.laposta.nl/v2",
    auth: { type: "basic", usernameField: "token", fixedPassword: "" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) In Laposta, open “Instellingen” → “Koppelingen” → “API” and copy the key. 2) Conector sends it as the Basic auth username with an empty password.",
    test: { path: "/list", message: (d) => count(d?.data, "list", "lists") || "API key is valid" },
    examples: "Examples: GET /list, GET /member?list_id=…, POST /member with form list_id=…&ip=…&email=…, GET /field?list_id=…, "
      + "GET /campaign, GET /report?campaign_id=….",
  },
  {
    id: "linkly", name: "Linkly", category: "marketing", description: "Tracking links and smart links with statistics",
    website: "https://linklyhq.com", docs: "https://linklyhq.com/support/api", logo: { image: "https://app.linklyhq.com/assets/apple-touch-icon-10641cb2c5e121ae96cec4660829ea63.png?vsn=d" },
    baseUrl: "https://app.linklyhq.com/api/v1/workspace/{workspace}",
    auth: { type: "query", name: "api_key" },
    fields: [{ id: "workspace", label: "Workspace ID", format: "segment", example: "1234",
               help: "The number in the Linkly URL (app.linklyhq.com/dashboard/workspace/1234)." },
             { id: "token", label: "API key", secret: true }],
    help: "1) In Linkly, open “Account” → “API” and copy the key. 2) Enter the workspace ID here.",
    test: { path: "/list_links", message: "API key is valid" },
    examples: "Examples: GET /list_links, POST /links {\"url\": \"https://…\", \"name\": \"…\", \"domain\": \"…\"}, GET /clicks?…, "
      + "GET /links/{id}/clicks.",
  },
  {
    id: "mailcoach", name: "Mailcoach", category: "marketing", description: "Email marketing: lists, subscribers, campaigns and automations",
    website: "https://www.mailcoach.app", docs: "https://www.mailcoach.app/api-documentation", logo: { favicon: "https://www.mailcoach.app" },
    baseUrl: "https://{subdomain}.mailcoach.app/api",
    auth: { type: "bearer" },
    fields: [{ id: "subdomain", label: "Your Mailcoach subdomain", format: "subdomain",
               help: "The part before .mailcoach.app (e.g. “example” if you sign in at example.mailcoach.app)." },
             { id: "token", label: "API token", secret: true }],
    help: "1) In Mailcoach, open your profile → “API Tokens” and create a token. 2) Enter your account subdomain and the token here.",
    test: { path: "/email-lists", message: (d) => count(d?.data, "list", "lists") || "API token is valid" },
    examples: "Examples: GET /email-lists, GET /email-lists/{uuid}/subscribers?filter[email]=…, POST /email-lists/{uuid}/subscribers "
      + "{\"email\": \"…\"}, GET /campaigns, POST /campaigns/{uuid}/send-test {\"email\": \"…\"}, GET /transactional-mails.",
  },
  {
    id: "maildroppa", name: "Maildroppa", category: "marketing", description: "European email marketing: subscribers, segments and newsletters",
    website: "https://maildroppa.com", docs: "https://maildroppa.com/api-docs", logo: { favicon: "https://maildroppa.com" },
    baseUrl: "https://api.maildroppa.com/v1",
    auth: { type: "header", name: "X-Api-Key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) In Maildroppa, open “Settings” → “API” and create a key. 2) Copy it.",
    test: { path: "/subscribers", message: "API key is valid" },
    examples: "Examples: GET /subscribers?page=0&size=20, POST /subscribers {\"email\": \"…\", \"firstName\": \"…\"}, GET /segments, "
      + "GET /tags, GET /newsletters.",
  },
  {
    id: "mailercheck", name: "MailerCheck", category: "marketing", description: "Email verification: single addresses and lists",
    website: "https://www.mailercheck.com", docs: "https://developers.mailercheck.com", logo: { favicon: "https://www.mailercheck.com" },
    baseUrl: "https://app.mailercheck.com/api",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API token", secret: true }],
    help: "1) In MailerCheck, open “API” and generate a token. 2) Copy it. 3) Each verification uses one credit; the connection test does too.",
    test: { method: "POST", path: "/check/single", body: { email: "info@mailercheck.com" }, message: "API token is valid" },
    examples: "Examples: POST /check/single {\"email\": \"…\"}, POST /lists {\"name\": \"…\", \"emails\": [\"…\"]}, PUT /lists/{id}/verify, "
      + "GET /lists/{id}/results.",
  },
  {
    id: "mailercloud", name: "Mailercloud", category: "marketing", description: "Email marketing: lists, contacts, campaigns and automations",
    website: "https://www.mailercloud.com", docs: "https://apidoc.mailercloud.com", logo: { favicon: "https://www.mailercloud.com" },
    baseUrl: "https://cloudapi.mailercloud.com/v1",
    auth: { type: "header", name: "Authorization" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) In Mailercloud, open “Account” → “Integrations” → “API Keys” and create a key. 2) Copy it.",
    test: { method: "POST", path: "/lists/search", body: { limit: 1, page: 1 }, message: "API key is valid" },
    examples: "Examples: POST /lists/search {\"limit\": 20, \"page\": 1}, POST /contacts {\"email\": \"…\", \"list_id\": \"…\"}, "
      + "POST /contacts/search/{listId} {\"limit\": 20, \"page\": 1}, POST /campaigns/search {…}.",
  },
  {
    id: "mailsso", name: "Mails.so", category: "marketing", description: "Email validation: format, domain, mailbox and disposable addresses",
    website: "https://mails.so", docs: "https://mails.so/docs", logo: { favicon: "https://mails.so" },
    baseUrl: "https://api.mails.so/v1",
    auth: { type: "header", name: "x-mails-api-key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://mails.so/dashboard/api",
    help: "1) Create an account at mails.so and copy the API key from the dashboard. 2) Each validation uses one credit; the test does too.",
    test: { path: "/validate", query: { email: "info@mails.so" }, message: "API key is valid" },
    examples: "Examples: GET /validate?email=…, POST /batch {\"emails\": [\"…\", \"…\"]}, GET /batch/{id}.",
  },
];
