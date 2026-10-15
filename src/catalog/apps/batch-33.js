// Batch 33 of the catalog: marketing (customer messaging, short links, email verification, webinars, developer community,
// email marketing, SMS, testimonials, post-purchase surveys, social proof and handwritten letters).

const count = (d, one, many) => (Array.isArray(d) ? `${d.length} ${d.length === 1 ? one : many}` : null);

export default [
  {
    id: "customerio", name: "Customer.io", category: "marketing", description: "Customer messaging: campaigns, customers, segments and sends",
    website: "https://customer.io", docs: "https://docs.customer.io/api/app/", logo: { favicon: "https://customer.io" },
    baseUrl: "https://{server}/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "App API key", secret: true },
             { id: "server", label: "Region", default: "api.customer.io",
               options: [["api.customer.io", "US"], ["api-eu.customer.io", "European Union"]] }],
    keyUrl: "https://fly.customer.io/settings/api_credentials?keyType=app",
    help: "1) In Customer.io open “Settings” → “API Credentials” → “App API Keys” and create a key. 2) Copy it and choose your workspace's "
      + "region here.",
    test: { path: "/campaigns", message: (d) => count(d?.campaigns, "campaign", "campaigns") || "Key is valid" },
    examples: "Examples: GET /campaigns, GET /campaigns/{id}/metrics, GET /customers/{id}/attributes, POST /customers/attributes {\"ids\": [\"…\"]}, "
      + "POST /send/email {\"transactional_message_id\": …, \"to\": \"…\", \"identifiers\": {\"id\": \"…\"}}, GET /segments.",
  },
  {
    id: "cuttly", name: "Cutt.ly", category: "marketing", description: "Link shortener with click statistics",
    website: "https://cutt.ly", docs: "https://cutt.ly/cuttly-api", logo: { favicon: "https://cutt.ly" },
    baseUrl: "https://cutt.ly/api",
    auth: { type: "query", name: "key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://cutt.ly/edit",
    help: "1) In Cutt.ly open “Edit Account” and copy the API key (cutt.ly/edit). 2) The free plan has a limit on calls per minute.",
    // Key errors come back with auth: false.
    test: { path: "/api.php", query: { stats: "https://cutt.ly/conector-check" },
              validate: (d) => { if (d?.auth === false) throw new Error(`Cutt.ly: ${d.message || "invalid key"}`); }, message: "API key is valid" },
    examples: "Examples: GET /api.php?short=https://…&name=alias (shortens), GET /api.php?stats=https://cutt.ly/… (clicks, countries, devices), "
      + "GET /api.php?edit=https://cutt.ly/…&tag=… (edits).",
  },
  {
    id: "debounce", name: "DeBounce", category: "marketing", description: "Email verification: single addresses, lists and balance",
    website: "https://debounce.io", docs: "https://developers.debounce.io", logo: { favicon: "https://debounce.io" },
    baseUrl: "https://api.debounce.io/v1",
    auth: { type: "query", name: "api" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://app.debounce.io/api",
    help: "1) In DeBounce open “API” and create a key. 2) Copy it. 3) Each verification uses one credit; the test only checks the balance.",
    test: { path: "/balance/", validate: (d) => { if (d?.success === "0") throw new Error(`DeBounce: ${d.debounce?.error || "invalid key"}`); },
              message: (d) => (d?.balance != null ? `${d.balance} credits` : "API key is valid") },
    examples: "Examples: GET /?email=… (real-time verification), GET /balance/, POST /upload {\"url\": \"https://…/list.csv\"} (list), "
      + "GET /status/?list_id=….",
  },
  {
    id: "demio", name: "Demio", category: "marketing", description: "Webinars: events, sessions, registrants and attendance",
    website: "https://www.demio.com", docs: "https://publicdemioapi.docs.apiary.io", logo: { favicon: "https://www.demio.com" },
    baseUrl: "https://my.demio.com/api/v1",
    auth: [{ type: "header", name: "Api-Key", field: "username" }, { type: "header", name: "Api-Secret" }],
    fields: [{ id: "username", label: "API Key" }, { id: "token", label: "API Secret", secret: true }],
    help: "1) In Demio open “Settings” → “API” and copy the “API Key” and the “API Secret”.",
    test: { path: "/ping/query", validate: (d) => { if (d?.pong === false) throw new Error(`Demio: ${d.messages?.[0] || "invalid credentials"}`); },
              message: "Credentials are valid" },
    examples: "Examples: GET /events?type=upcoming, GET /event/{id}, GET /event/{id}/date/{dateId}/participants, PUT /event/register "
      + "{\"id\": …, \"name\": \"…\", \"email\": \"…\"}, GET /report/{dateId}/participants.",
  },
  {
    id: "devto", name: "DEV Community", category: "marketing", description: "Publish and manage articles on dev.to and Forem",
    website: "https://dev.to", docs: "https://developers.forem.com/api/v1", logo: { favicon: "https://dev.to" },
    baseUrl: "https://dev.to/api", headers: { Accept: "application/vnd.forem.api-v1+json" },
    auth: { type: "header", name: "api-key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://dev.to/settings/extensions",
    help: "1) In dev.to open “Settings” → “Extensions” → “DEV Community API Keys”. 2) Enter a description, click “Generate API Key” and copy it.",
    test: { path: "/users/me", account: (d) => d?.username },
    examples: "Examples: GET /articles/me?per_page=20, POST /articles {\"article\": {\"title\": \"…\", \"body_markdown\": \"…\", \"published\": false, "
      + "\"tags\": [\"…\"]}}, PUT /articles/{id} {…}, GET /articles?tag=javascript&top=7, GET /comments?a_id=….",
  },
  {
    id: "dopplermarketing", name: "Doppler (email marketing)", category: "marketing", description: "Doppler email marketing: lists, subscribers and campaigns",
    website: "https://www.fromdoppler.com", docs: "https://restapi.fromdoppler.com/docs", logo: { favicon: "https://www.fromdoppler.com" },
    baseUrl: "https://restapi.fromdoppler.com/accounts/{email}",
    auth: { type: "header", name: "Authorization", prefix: "token " },
    fields: [{ id: "email", label: "Your Doppler account email", format: "email" },
             { id: "token", label: "API key", secret: true }],
    help: "1) In Doppler (fromdoppler.com) open “Control Panel” → “API y Conexiones” and copy your API key. 2) Enter the email you sign in to "
      + "Doppler with. Not to be confused with Doppler, the secrets manager.",
    test: { path: "/lists", query: { page: 1, per_page: 1 }, message: "API key is valid" },
    examples: "Examples: GET /lists, POST /lists {\"name\": \"…\"}, POST /lists/{listId}/subscribers {\"email\": \"…\", \"fields\": [{\"name\": "
      + "\"FIRSTNAME\", \"value\": \"…\"}]}, GET /subscribers?email=…, GET /campaigns, POST /campaigns {…}.",
  },
  {
    id: "dripcel", name: "Dripcel", category: "marketing", description: "AI SMS marketing: campaigns, contacts and replies",
    website: "https://dripcel.com", docs: "https://docs.dripcel.com", logo: { favicon: "https://dripcel.com" },
    baseUrl: "https://api.dripcel.com",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) In Dripcel open “Settings” → “API Keys” and create a key. 2) Copy it. 3) Each SMS sent is charged.",
    test: { path: "/campaigns", message: "API key is valid" },
    examples: "Examples: GET /campaigns, GET /contacts?page=1, POST /contacts {\"cell\": \"+27…\", \"tags\": [\"…\"]}, POST /send/sms "
      + "{\"cell\": \"…\", \"content\": \"…\"} (this really sends the message), GET /replies.",
  },
  {
    id: "elasticemail", name: "Elastic Email", category: "marketing", description: "Transactional email and marketing: campaigns, contacts and statistics",
    website: "https://elasticemail.com", docs: "https://elasticemail.com/developers/api-documentation/rest-api", logo: { favicon: "https://elasticemail.com" },
    baseUrl: "https://api.elasticemail.com/v4",
    auth: { type: "header", name: "X-ElasticEmail-ApiKey" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://app.elasticemail.com/marketing/settings/new/manage-api",
    help: "1) In Elastic Email open “Settings” → “Manage API Keys” and create a key with the permissions you need. 2) Copy it: it is shown "
      + "only once.",
    test: { path: "/campaigns", query: { limit: 1 }, message: "API key is valid" },
    examples: "Examples: GET /campaigns, POST /emails/transactional {\"Recipients\": {\"To\": [\"…\"]}, \"Content\": {\"From\": \"…\", \"Subject\": "
      + "\"…\", \"Body\": [{\"ContentType\": \"HTML\", \"Content\": \"…\"}]}}, GET /contacts?limit=50, GET /statistics?from=…, GET /lists.",
  },
  {
    id: "emaillistverify", name: "EmailListVerify", category: "marketing", description: "Email verification: single addresses, lists and credits",
    website: "https://www.emaillistverify.com", docs: "https://www.emaillistverify.com/docs", logo: { favicon: "https://www.emaillistverify.com" },
    baseUrl: "https://api.emaillistverify.com/api",
    auth: { type: "query", name: "secret" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) In EmailListVerify open “API” and copy the key. 2) Each verification uses one credit; so does the connection test.",
    test: { path: "/verifyEmail", query: { email: "info@emaillistverify.com" }, message: "API key is valid" },
    examples: "Examples: GET /verifyEmail?email=… (ok, invalid, disposable, unknown…), POST /verifyApiFile (multipart with the list).",
  },
  {
    id: "emailoctopus", name: "EmailOctopus", category: "marketing", description: "Simple email marketing: lists, contacts and campaigns",
    website: "https://emailoctopus.com", docs: "https://emailoctopus.com/api-documentation/v2", logo: { favicon: "https://emailoctopus.com" },
    baseUrl: "https://api.emailoctopus.com",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://emailoctopus.com/developer/api-keys",
    help: "1) In EmailOctopus open “Integrations & API” → “API keys” and create a key. 2) Copy it.",
    test: { path: "/lists", message: (d) => count(d?.data, "list", "lists") || "API key is valid" },
    examples: "Examples: GET /lists, GET /lists/{listId}/contacts?limit=50, POST /lists/{listId}/contacts {\"email_address\": \"…\", \"fields\": "
      + "{\"FirstName\": \"…\"}}, GET /campaigns, GET /campaigns/{id}/reports/summary.",
  },
  {
    id: "endorsal", name: "Endorsal", category: "marketing", description: "Customer testimonials: collection, moderation and publishing",
    website: "https://endorsal.io", docs: "https://help.endorsal.io/en/collections/api", logo: { favicon: "https://endorsal.io" },
    baseUrl: "https://api.endorsal.io/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) In Endorsal open “Settings” → “API” and copy the key.",
    test: { path: "/testimonials", message: "API key is valid" },
    examples: "Examples: GET /testimonials, GET /testimonials/{id}, POST /testimonials {\"name\": \"…\", \"comments\": \"…\", \"rating\": 5}, "
      + "GET /contacts, POST /contacts {\"name\": \"…\", \"email\": \"…\"}.",
  },
  {
    id: "esputnik", name: "eSputnik", category: "marketing", description: "Marketing automation: email, SMS, push and contacts",
    website: "https://esputnik.com", docs: "https://docs.esputnik.com/reference", logo: { favicon: "https://esputnik.com" },
    baseUrl: "https://esputnik.com/api/v1",
    // eSputnik accepts any username in Basic auth: what counts is the API key as the password.
    auth: { type: "basic", fixedUsername: "conector", passwordField: "token" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) In eSputnik open “Settings” → “API Keys” and create a key with the permissions you need. 2) Copy it.",
    test: { path: "/account/info", account: (d) => d?.userEmail || d?.organisationName },
    examples: "Examples: GET /contacts?email=…, POST /contact {\"channels\": [{\"type\": \"email\", \"value\": \"…\"}], \"firstName\": \"…\"}, "
      + "GET /groups, POST /message/email {…}, GET /messages/email?startindex=1&maxrows=20, GET /balance.",
  },
  {
    id: "fairing", name: "Fairing", category: "marketing", description: "Post-purchase surveys and attribution for online stores",
    website: "https://fairing.co", docs: "https://docs.fairing.co", logo: { favicon: "https://fairing.co" },
    baseUrl: "https://app.fairing.co/api",
    auth: { type: "header", name: "Authorization" },
    fields: [{ id: "token", label: "API token", secret: true }],
    help: "1) In Fairing open “Settings” → “Integrations” → “API” and copy the token.",
    test: { path: "/questions", message: (d) => count(d?.data, "question", "questions") || "API token is valid" },
    examples: "Examples: GET /questions, GET /responses?since=2026-10-01&limit=100, GET /responses?question_id=…, GET /attribution?…",
  },
  {
    id: "fomo", name: "Fomo", category: "marketing", description: "Social proof: purchase and activity notifications on your site",
    website: "https://fomo.com", docs: "https://docs.fomo.com/reference", logo: { favicon: "https://fomo.com" },
    baseUrl: "https://api.fomo.com/api/v1",
    auth: { type: "header", name: "Authorization", prefix: "Token " },
    fields: [{ id: "token", label: "Authentication token", secret: true }],
    help: "1) In Fomo open “Settings” → “Site” and copy the API “Auth Token”. 2) With a wrong token, the API responds with a 500 error.",
    test: { path: "/applications/me", account: (d) => d?.name },
    examples: "Examples: GET /applications/me, GET /applications/me/events?per_page=20, POST /applications/me/events {\"event\": {\"event_type_tag\": "
      + "\"purchase\", \"first_name\": \"…\", \"city\": \"New York\", \"url\": \"https://…\"}}, DELETE /applications/me/events/{id}.",
  },
  {
    id: "getresponse", name: "GetResponse", category: "marketing", description: "Email marketing and automation: lists, contacts and newsletters",
    website: "https://www.getresponse.com", docs: "https://apireference.getresponse.com", logo: { favicon: "https://www.getresponse.com" },
    baseUrl: "https://api.getresponse.com/v3",
    auth: { type: "header", name: "X-Auth-Token", prefix: "api-key " },
    fields: [{ id: "token", label: "API key", secret: true }],
    // One click: OAuth application registered in GetResponse.
    oauth: { scopes: [], provider: { name: "GetResponse", key: "getresponse", redirect: "localhost", clientAuth: "basic",
      authorizeUrl: "https://app.getresponse.com/oauth2_authorize.html", tokenUrl: "https://api.getresponse.com/v3/token",
      help: "1) In GetResponse open “Integrations & API” → “API” → “OAuth” and register an application named “Conector”. 2) Paste the "
        + "redirect URI shown below into “Redirect URL”. 3) Copy the “Client ID” and the “Client Secret”." } },
    keyUrl: "https://app.getresponse.com/api",
    help: "1) In GetResponse open “Integrations & API” → “API”. 2) Click “Generate API key”, name it and copy the key.",
    test: { path: "/accounts", account: (d) => d?.email },
    examples: "Examples: GET /campaigns (lists), GET /contacts?query[email]=…, POST /contacts {\"email\": \"…\", \"campaign\": {\"campaignId\": "
      + "\"…\"}}, GET /newsletters, GET /statistics/contacts?query[campaignId]=…, GET /accounts.",
  },
  {
    id: "handwrite", name: "Handwrite.io", category: "marketing", description: "Letters and cards handwritten by robots and sent by mail",
    website: "https://www.handwrite.io", docs: "https://documentation.handwrite.io", logo: { favicon: "https://www.handwrite.io" },
    baseUrl: "https://api.handwrite.io/v1",
    auth: { type: "header", name: "Authorization" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://app.handwrite.io/settings/api",
    help: "1) In Handwrite.io open “Settings” → “API” and copy the key (test_hw_… for testing, live_hw_… for real sends). 2) Each real send "
      + "is charged.",
    test: { path: "/handwriting", message: (d) => count(d, "handwriting style", "handwriting styles") || "API key is valid" },
    examples: "Examples: GET /handwriting, GET /stationery, POST /send {\"message\": \"…\", \"handwriting\": \"…\", \"card\": \"…\", \"recipients\": "
      + "[{\"firstName\": \"…\", \"street1\": \"…\", \"city\": \"…\", \"zip\": \"…\", \"country\": \"…\"}]}, GET /orders/{id}.",
  },
];
