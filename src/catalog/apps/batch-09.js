// Batch 09 of the Composio catalog: CRM, sales and customer messaging (Simplesat to Zixflow) plus data and API utilities
// (21RISK, Abstract, AccuWeather, Adafruit IO, AgentQL).
import crypto from "node:crypto";
import { USER_AGENT, httpRequest } from "../../http.js";
import { ensureOk } from "../define.js";

const LONG_TIMEOUT = 180_000; // ms: Tomba verifies emails live and AgentQL opens real pages, and they can take over a minute
const count = (n, singular, plural) => `${n} ${n === 1 ? singular : plural}`;
// “N things” if the response is a list; otherwise the fallback text.
const list = (d, one, many, fallback = "Credentials are valid") => (Array.isArray(d) ? count(d.length, one, many) : fallback);

// WildApricot: the API key is exchanged for an access token that expires after 30 minutes (“client credentials” with the fixed
// user APIKEY). The token is kept in memory until it expires.
let wildApricotToken = null;
async function wildApricotAccess(c) {
  const fingerprint = crypto.createHash("sha256").update(String(c.token)).digest("hex");
  if (wildApricotToken?.fingerprint === fingerprint && wildApricotToken.expires > Date.now() + 60_000) return wildApricotToken.token;
  const basic = Buffer.from(`APIKEY:${c.token}`).toString("base64");
  const d = ensureOk(await httpRequest("https://oauth.wildapricot.org/auth/token", { method: "POST",
    headers: { Accept: "application/json", "User-Agent": USER_AGENT, Authorization: `Basic ${basic}` },
    body: new URLSearchParams({ grant_type: "client_credentials", scope: "auto" }) }), "WildApricot");
  if (!d?.access_token) throw new Error("WildApricot: the authentication response has no token");
  wildApricotToken = { fingerprint, token: d.access_token, expires: Date.now() + (Number(d.expires_in) || 1800) * 1000 };
  return d.access_token;
}

// Abstract: each API (email, phone, IP…) lives on its own subdomain and has its own key. The key is chosen by the request's
// domain and added as the api_key parameter. The fictitious path /check (used by the connection test) is redirected to the
// first API in the list whose key is filled in.
const ABSTRACT_APIS = {
  emailreputation: { field: "email_key", name: "Email Reputation", test: ["/v1/", { email: "test@example.com" }] },
  phoneintelligence: { field: "phone_key", name: "Phone Intelligence", test: ["/v1/", { phone: "14154582468" }] },
  "ip-intelligence": { field: "ip_key", name: "IP Intelligence", test: ["/v1/", { ip_address: "8.8.8.8" }] },
  companyenrichment: { field: "company_key", name: "Company Enrichment", test: ["/v2/", { domain: "abstractapi.com" }] },
  ibanvalidation: { field: "iban_key", name: "IBAN Validation", test: ["/v1/", { iban: "BE71096123456769" }] },
  vat: { field: "vat_key", name: "VAT Validation", test: ["/v1/validate/", { vat_number: "ESB12345678" }] },
  "exchange-rates": { field: "exchange_key", name: "Exchange Rates", test: ["/v1/live/", { base: "EUR", target: "USD" }] },
  holidays: { field: "holidays_key", name: "Public Holidays", test: ["/v1/", { country: "ES", year: 2026, month: 1, day: 1 }] },
};
function abstractApiKey({ url, cred }) {
  if (url.pathname === "/check") {
    const [subdomain, api] = Object.entries(ABSTRACT_APIS).find(([, a]) => cred[a.field]) || [];
    if (!api) throw new Error("Abstract: fill in the key of at least one of its APIs");
    url.hostname = `${subdomain}.abstractapi.com`;
    [url.pathname] = api.test;
    url.search = new URLSearchParams(Object.entries(api.test[1]).map(([k, v]) => [k, String(v)])).toString();
  }
  const api = ABSTRACT_APIS[/^([a-z0-9-]+)\.abstractapi\.com$/.exec(url.hostname)?.[1]];
  if (!api) {
    throw new Error(`Abstract: use the full URL of one of its APIs (${Object.keys(ABSTRACT_APIS).join(", ")}, on .abstractapi.com)`);
  }
  if (!cred[api.field]) throw new Error(`Abstract: missing the key for ${api.name}`);
  url.searchParams.set("api_key", cred[api.field]);
}

export default [
  {
    id: "risk21", name: "21RISK", category: "data",
    description: "Audits and compliance: actions, reports and auditors (OData)",
    website: "https://21risk.com", docs: "https://21risk.com/api", logo: { favicon: "https://21risk.com" },
    baseUrl: "https://21risk.com/odata/v5",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key (21RISK.ND.…)", secret: true, example: "21RISK.ND.0123456789abcdef" }],
    keyUrl: "https://app.21risk.com/profile/account",
    help: "1) Sign in to 21RISK and open app.21risk.com/profile/account (your profile). 2) Generate a new API key and copy it: it "
      + "starts with 21RISK.ND. Creating keys requires a specific permission; if you do not see the option, ask whoever administers "
      + "21RISK in your organization. The API documentation (21risk.com/api) is only visible when signed in.",
    test: { path: "/actions", query: { $top: 1 }, message: "API key is valid" },
    examples: "OData v5 API that accepts $top, $skip, $filter, $select, $orderby and $count. Examples: GET /actions?$top=20, "
      + "GET /reports?$top=20, GET /auditor, GET /$metadata (full entity catalog, in XML).",
  },
  {
    id: "abstract", name: "Abstract API", category: "data",
    description: "Validation and enrichment: email, phone, IP, IBAN, VAT and more",
    website: "https://www.abstractapi.com", docs: "https://docs.abstractapi.com/api", logo: { favicon: "https://www.abstractapi.com" },
    baseUrl: "https://www.abstractapi.com", allowedOrigins: ["^https://[a-z0-9-]+\\.abstractapi\\.com$"],
    auth: { type: "signature", sign: abstractApiKey },
    fields: [{ id: "email_key", label: "Email Reputation API key", secret: true, optional: true },
             { id: "phone_key", label: "Phone Intelligence API key", secret: true, optional: true },
             { id: "ip_key", label: "IP Intelligence API key", secret: true, optional: true },
             { id: "company_key", label: "Company Enrichment API key", secret: true, optional: true },
             { id: "iban_key", label: "IBAN Validation API key", secret: true, optional: true },
             { id: "vat_key", label: "VAT Validation API key", secret: true, optional: true },
             { id: "exchange_key", label: "Exchange Rates API key", secret: true, optional: true },
             { id: "holidays_key", label: "Public Holidays API key", secret: true, optional: true }],
    keyUrl: "https://app.abstractapi.com/",
    help: "1) Sign in to app.abstractapi.com (the Abstract API dashboard) and open the API you want to use: each one has its own key "
      + "and its own plan, and the free plan has a small monthly quota. 2) Copy the “API key” of that API and paste it in its field; "
      + "fill in only the APIs you use. 3) Connecting tests the first key that is filled in and uses one request from its quota. "
      + "The free plan allows one request per second.",
    test: { path: "/check", message: "API key is valid" },
    examples: "Each API has its own domain: always use the full URL (Conector adds api_key according to the domain). Examples: "
      + "GET https://emailreputation.abstractapi.com/v1/?email=you@example.com, "
      + "GET https://phoneintelligence.abstractapi.com/v1/?phone=14155550123, "
      + "GET https://ip-intelligence.abstractapi.com/v1/?ip_address=8.8.8.8, "
      + "GET https://companyenrichment.abstractapi.com/v2/?domain=example.com, "
      + "GET https://exchange-rates.abstractapi.com/v1/live/?base=EUR&target=USD. Also ibanvalidation (?iban=), "
      + "vat (/v1/validate/?vat_number=) and holidays (?country=US&year=2026).",
  },
  {
    id: "accuweather", name: "AccuWeather", category: "data",
    description: "Current weather, hourly and daily forecasts, alerts and indices",
    website: "https://www.accuweather.com", docs: "https://developer.accuweather.com/apis", logo: { simpleIcons: "accuweather" },
    baseUrl: "https://{server}",
    auth: { type: "query", name: "apikey" },
    fields: [{ id: "token", label: "API key", secret: true },
             { id: "server", label: "Server", default: "dataservice.accuweather.com",
               options: [["dataservice.accuweather.com", "Developer portal (own key)"],
                          ["api.accuweather.com", "Enterprise contract"]],
               help: "Almost everyone uses the first one; the second is for keys that AccuWeather gives to customers under contract." }],
    keyUrl: "https://developer.accuweather.com/subscriptions",
    help: "1) Sign up (or sign in) at developer.accuweather.com and open “Subscriptions”. 2) Choose a plan (there is a free trial one, "
      + "14 days and 500 daily calls to Core Weather) and copy the API key of the subscription. 3) Alerts, images or "
      + "the longer forecasts require paid plans (Prime or Elite); MinuteCast and Lightning are separate products, each one "
      + "with its own subscription.",
    test: { path: "/locations/v1/cities/autocomplete", query: { q: "London" }, message: "API key is valid" },
    examples: "Almost everything depends on a location's “Key”. Examples: "
      + "GET /locations/v1/cities/search?q=London&language=en-us (returns the Key), GET /currentconditions/v1/{key}?details=true, "
      + "GET /forecasts/v1/daily/5day/{key}?metric=true&language=en-us, GET /forecasts/v1/hourly/12hour/{key}?metric=true, "
      + "GET /alerts/v1/{key}.",
  },
  {
    id: "adafruitio", name: "Adafruit IO", category: "data",
    description: "Cloud IoT platform: feeds, sensor data, dashboards and groups",
    website: "https://io.adafruit.com", docs: "https://io.adafruit.com/api/docs/", logo: { simpleIcons: "adafruit" },
    baseUrl: "https://io.adafruit.com/api/v2",
    auth: { type: "header", name: "X-AIO-Key" },
    fields: [{ id: "token", label: "AIO Key", secret: true }],
    keyUrl: "https://io.adafruit.com/",
    help: "1) Sign in to io.adafruit.com with your Adafruit account. 2) Click “AIO Key” (the key icon, top right) and "
      + "copy the key, which starts with aio_. 3) If you regenerate it, the previous one stops working. The free plan has low limits "
      + "(30 data points per minute and 10 feeds); IO+ raises them.",
    test: { path: "/user", account: (d) => d?.username },
    examples: "Almost everything depends on your username (it appears in GET /user). Examples: GET /{username}/feeds, "
      + "GET /{username}/feeds/{feed}/data?limit=10, POST /{username}/feeds/{feed}/data {\"value\": \"23.5\"}, "
      + "GET /{username}/dashboards, GET /{username}/groups.",
  },
  {
    id: "agentql", name: "AgentQL", category: "ai",
    description: "Extract structured data from web pages and documents with AI",
    website: "https://www.agentql.com", docs: "https://docs.agentql.com/rest-api/api-reference", logo: { favicon: "https://www.agentql.com" },
    baseUrl: "https://api.agentql.com/v1", timeout: LONG_TIMEOUT,
    auth: { type: "header", name: "X-API-Key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://dev.agentql.com/api-keys",
    help: "1) Sign in to dev.agentql.com (the AgentQL developer portal) and open dev.agentql.com/api-keys. 2) Create an API key "
      + "and copy it. 3) Each data query uses calls from your plan, and the free plan has a limited quota; the connection "
      + "test (GET /usage) does not use any.",
    test: { path: "/usage", message: "API key is valid" },
    examples: "Examples: GET /usage (usage and subscription), "
      + "POST /query-data {\"url\": \"https://…\", \"query\": \"{ products[] { name price } }\"}, "
      + "POST /query-data {\"url\": \"https://…\", \"prompt\": \"the products with their price\"} (generates the query with AI), "
      + "POST /tetra/sessions (opens a remote browser), GET /tetra/usage.",
  },
  {
    id: "simplesat", name: "Simplesat", category: "support",
    description: "Satisfaction surveys (CSAT): responses, customers and team",
    website: "https://www.simplesat.io", docs: "https://developer.simplesat.io/api", logo: { favicon: "https://www.simplesat.io" },
    baseUrl: "https://api.simplesat.io/api/v1",
    auth: { type: "header", name: "X-Simplesat-Token" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://app.simplesat.io/settings/api-keys",
    help: "1) Sign in to Simplesat as an owner or admin and open app.simplesat.io/settings/api-keys. 2) Create an API key and "
      + "select the permissions (scopes) you need: read access to surveys, responses and customers, and write access if you will create or "
      + "update customers. The connection test needs “read surveys”. 3) Copy the key. The API is included in all plans.",
    test: { path: "/surveys", query: { page_size: 1 },
              message: (d) => (d?.count != null ? count(d.count, "active survey", "active surveys") : "API key is valid") },
    examples: "Lists are paginated with page and page_size. Examples: GET /surveys, GET /customers?page_size=50, "
      + "POST /answers/search {\"start_date\": \"2026-10-01T00:00:00Z\", \"filters\": [{\"key\": \"sentiment\", "
      + "\"comparison\": \"is\", \"values\": [\"negative\"]}]}, POST /responses/search {…}, "
      + "POST /customers {\"email\": \"…\", \"name\": \"…\"} (creates or updates).",
  },
  {
    id: "sitespeakai", name: "SiteSpeakAI", category: "support",
    description: "AI chatbots trained on your website: conversations and leads",
    website: "https://sitespeak.ai", docs: "https://sitespeak.ai/docs/api-reference/introduction", logo: { favicon: "https://sitespeak.ai" },
    baseUrl: "https://api.sitespeak.ai/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API token", secret: true }],
    keyUrl: "https://sitespeak.ai/user/api-tokens",
    help: "1) Sign in to sitespeak.ai and open sitespeak.ai/user/api-tokens (your account page). 2) Create an API token and copy it. "
      + "3) The ID of each chatbot is on that chatbot's settings page (it also appears in GET /me/chatbots). "
      + "The documentation does not state a minimum plan.",
    test: { path: "/me", account: (d) => d?.user?.email || d?.user?.name },
    examples: "Examples: GET /me/chatbots, GET /{chatbot_id} (settings), GET /{chatbot_id}/conversations?limit=10&order=desc, "
      + "GET /{chatbot_id}/leads, POST /{chatbot_id}/query {\"prompt\": \"…\"}.",
  },
  {
    id: "smartlead", name: "Smartlead", category: "crm",
    description: "Cold email: campaigns, leads, sending mailboxes and statistics",
    website: "https://www.smartlead.ai", docs: "https://api.smartlead.ai/introduction", logo: { favicon: "https://www.smartlead.ai" },
    baseUrl: "https://server.smartlead.ai/api/v1",
    auth: { type: "query", name: "api_key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) Sign in to app.smartlead.ai, click your profile picture and open “Settings” → “API Keys”. 2) Click “Generate New API Key” and "
      + "copy it: it is shown only once. 3) The API usually requires the Pro plan or higher (Basic does not include it according to the published "
      + "pricing tables). Limit: 60 requests per minute on the standard plan and 120 on Pro.",
    test: { path: "/campaigns/", message: (d) => list(d, "campaign", "campaigns", "API key is valid") },
    examples: "Examples: GET /campaigns/, GET /campaigns/{id}/statistics, GET /campaigns/{id}/leads?offset=0&limit=100, "
      + "POST /campaigns/create {\"name\": \"…\"}, GET /leads/?email=…. GET /email-accounts/ also returns the SMTP/IMAP "
      + "credentials of the mailboxes: use it only if needed.",
  },
  {
    id: "spoki", name: "Spoki", category: "communication",
    description: "WhatsApp Business: contacts, templates, messages and campaigns",
    website: "https://spoki.com", docs: "https://documenter.getpostman.com/view/21611004/UzBqnPvF", logo: { favicon: "https://spoki.com" },
    baseUrl: "https://api.spoki.com/api/1",
    auth: { type: "header", name: "X-Spoki-Api-Key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) Sign in to your Spoki account and open “Integrazioni” (Integrations) → “API”. 2) Click “Request API Key” and copy the "
      + "key: each Spoki account has its own. 3) Outside WhatsApp's 24-hour window only approved "
      + "templates can be sent. Limit: 120 requests per minute.",
    test: { path: "/lists/", message: "API key is valid" },
    examples: "Paths end in “/”. Examples: GET /contacts/, POST /contacts/sync/ (creates or updates a contact), "
      + "GET /templates/, POST /messages/send/ {\"type\": \"Message\", \"content_type\": \"Text\", \"phone\": \"+14155550123\", "
      + "\"text\": \"…\"}, GET /campaigns/.",
  },
  {
    id: "suitedash", name: "SuiteDash", category: "crm",
    description: "CRM and client portal: contacts, companies and projects",
    website: "https://suitedash.com", docs: "https://app.suitedash.com/secure-api/swagger", logo: { favicon: "https://suitedash.com" },
    baseUrl: "https://app.suitedash.com/secure-api",
    auth: [{ type: "header", name: "X-Public-ID", field: "public_id" },
           { type: "header", name: "X-Secret-Key", field: "secret_key" }],
    fields: [{ id: "public_id", label: "Public ID" },
             { id: "secret_key", label: "Secret Key", secret: true }],
    help: "1) Sign in to SuiteDash as an admin and open “Integrations” → “Secure API”. 2) Copy the Public ID and generate the Secret "
      + "Key (only admins can see it). 3) The key gives access to the account's contacts, companies and projects, and "
      + "calls count toward your plan's monthly limit, which is shown on that same screen.",
    test: { path: "/contact/meta", message: "Credentials are valid" },
    examples: "Responses come inside “data”. Examples: GET /contacts?page=1&orderBy=created.desc, "
      + "GET /contact/{uid or email}, POST /contact {\"first_name\": \"…\", \"last_name\": \"…\", \"email\": \"…\", "
      + "\"role\": \"Lead\"}, GET /companies, GET /projects.",
  },
  {
    id: "supportbee", name: "SupportBee", category: "support",
    description: "Email support: tickets, replies, labels and teams",
    website: "https://supportbee.com", docs: "https://supportbee.com/docs/api/reference", logo: { favicon: "https://supportbee.com" },
    baseUrl: "https://{company}.supportbee.com",
    auth: { type: "bearer" },
    fields: [{ id: "company", label: "Your SupportBee subdomain (the part before .supportbee.com)", format: "subdomain" },
             { id: "token", label: "API token", secret: true }],
    help: "1) Sign in to your SupportBee (example.supportbee.com) as an agent user. 2) Click your profile picture, top "
      + "left, and choose “API Token”. 3) Copy the token: it acts with that user's permissions. The subdomain is the part before "
      + ".supportbee.com in the address; the documentation does not state a minimum plan.",
    test: { path: "/tickets", query: { per_page: 1 },
              message: (d) => (d?.total != null ? `${count(d.total, "ticket", "tickets")} in the inbox` : "Token is valid") },
    examples: "Examples: GET /tickets?per_page=20&assigned_user=me, GET /tickets/search?query=…, "
      + "POST /tickets/{id}/replies {\"reply\": {\"content\": {\"text\": \"…\"}}}, POST /tickets/{id}/archive, GET /labels.",
  },
  {
    id: "surecontact", name: "SureContact", category: "crm",
    description: "Marketing and CRM: contacts, lists, campaigns, deals and forms",
    website: "https://surecontact.com", docs: "https://api.surecontact.com/docs", logo: { favicon: "https://surecontact.com" },
    baseUrl: "https://api.surecontact.com/api/v1/public",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key (surecontact_…)", secret: true, example: "surecontact_0123456789abcdef" }],
    help: "1) Sign in to SureContact as a user with the Manager role or higher. 2) Open your profile (top bar) → “API Keys” (under "
      + "“Settings” → “Developer”) and create a key with the permissions you need: read, write or delete. 3) Copy it: it is "
      + "shown only once and is valid for the workspace where you create it.",
    test: { path: "/lists", message: "API key is valid" },
    examples: "Limits depend on the plan (X-RateLimit-* headers). Examples: GET /contacts, GET /contacts/email/{email}, "
      + "GET /lists, GET /deals, GET /reports/overview.",
  },
  {
    id: "synthflowai", name: "Synthflow AI", category: "ai",
    description: "AI voice agents: agents, calls, numbers and chats",
    website: "https://synthflow.ai", docs: "https://docs.synthflow.ai/authentication", logo: { favicon: "https://synthflow.ai" },
    baseUrl: "https://{server}/v2",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true },
             { id: "server", label: "Region", default: "api.synthflow.ai",
               options: [["api.synthflow.ai", "Global"], ["api.us.synthflow.ai", "United States"],
                          ["api.eu.synthflow.ai", "European Union"]],
               help: "The region of your workspace in Synthflow." }],
    help: "1) Sign in to your Synthflow workspace and open “Settings” → “Workspace Settings” → “API Keys” (depending on your role). 2) Click "
      + "“Create new API key” and copy the value. 3) Choose your workspace's region below. Calls, chats and call campaigns "
      + "use minutes or credits from your plan.",
    test: { path: "/assistants", query: { limit: 1 },
              message: (d) => (d?.response?.pagination?.total_records != null
                ? `${count(d.response.pagination.total_records, "agent", "agents")} in Synthflow` : "API key is valid") },
    examples: "Examples: GET /assistants?limit=20&offset=0, GET /calls?model_id={agent id}&limit=20 (model_id is required), "
      + "GET /numbers, GET /voices, POST /calls {\"model_id\": \"…\", \"phone\": \"+14155550123\", \"name\": \"…\"} "
      + "(starts a call and uses minutes).",
  },
  {
    id: "teltel", name: "TelTel", category: "communication",
    description: "Voice and SMS carrier: calls, SMS, numbers and auto-dialer",
    website: "https://teltel.io", docs: "https://apidoc.teltel.io/", logo: { favicon: "https://teltel.io" },
    baseUrl: "https://api.teltel.io/v2",
    auth: { type: "header", name: "X-API-KEY" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) Sign in to your TelTel account and open “Settings”. 2) Copy the API key: Conector sends it in the "
      + "X-API-KEY header. 3) Calls and SMS are charged to your account balance; the documentation does not state a minimum plan.",
    test: { path: "/account/balance",
              message: (d) => (d?.data?.[0]?.balance != null ? `Available balance: ${d.data[0].balance}` : "API key is valid") },
    examples: "Responses come inside “data” and errors inside “errors”. Examples: GET /account/balance, GET /users, "
      + "GET /dids/my-numbers, GET /calls?limit=20, "
      + "POST /sms/text {\"data\": {\"from\": \"Conector\", \"to\": \"14155550123\", \"message\": \"…\"}} (uses balance).",
  },
  {
    id: "theorg", name: "The Org", category: "crm",
    description: "Company org charts: people, positions, managers and lead lists",
    website: "https://theorg.com", docs: "https://developers.theorg.com/api", logo: { favicon: "https://theorg.com" },
    baseUrl: "https://api.theorg.com/v1.1",
    auth: { type: "header", name: "X-Api-Key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) Create an account at theorg.com: the free one includes 10 API credits per month and more can be bought. 2) Open the menu "
      + "→ “Manage subscription” and scroll down to the “Developers” section. 3) Give the key a name and click “Create”. Searches for "
      + "companies, positions and jobs use one credit per row returned.",
    test: { path: "/usage", message: (d) => {
      const u = d?.data;
      if (!u) return "API key is valid";
      return `${u.unlimited ? "Unlimited credits" : `${u.monthlyCredits} monthly credits`} (renews on ${u.resetDate})`;
    } },
    examples: "Examples: GET /usage (free), POST /positions {\"limit\": 10, \"offset\": 0, \"filters\": {\"companyDomains\": "
      + "[\"example.com\"], \"jobTitles\": [\"CTO\"]}} (1 credit per row), POST /companies {\"limit\": 10, \"offset\": 0, "
      + "\"filters\": {\"isHiring\": true, \"locations\": [{\"country\": \"US\"}]}}, POST /jobs {…}, GET /lists (free).",
  },
  {
    id: "thecompaniesapi", name: "The Companies API", category: "crm",
    description: "Company data by domain: profiles, search and technologies",
    website: "https://www.thecompaniesapi.com", docs: "https://www.thecompaniesapi.com/api/docs",
    logo: { favicon: "https://www.thecompaniesapi.com" },
    baseUrl: "https://api.thecompaniesapi.com/v2",
    auth: { type: "header", name: "Authorization", prefix: "Basic " },
    fields: [{ id: "token", label: "API token", secret: true }],
    keyUrl: "https://www.thecompaniesapi.com/settings/api-tokens",
    help: "1) Sign up at thecompaniesapi.com (500 free credits, no card) and sign in. 2) Open "
      + "thecompaniesapi.com/settings/api-tokens and create a token: it does not expire. 3) Copy it. Conector sends it in the header "
      + "Authorization with the “Basic ” prefix (the token as is, not base64). Each company returned by searches and "
      + "enrichments uses credits.",
    test: { path: "/user", account: (d) => d?.email || d?.fullName },
    examples: "Examples: GET /companies/{domain} (profile of a company), GET /companies/by-name?name=…, "
      + "GET /companies/by-email?email=…, GET /companies?size=10&search=… (search), GET /technologies?search=….",
  },
  {
    id: "theirstack", name: "TheirStack", category: "crm",
    description: "Job postings, companies and their technologies, for prospecting",
    website: "https://theirstack.com", docs: "https://theirstack.com/en/docs/api-reference", logo: { favicon: "https://theirstack.com" },
    baseUrl: "https://api.theirstack.com",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://app.theirstack.com/settings/api-key",
    help: "1) Sign up at app.theirstack.com: the free plan includes 200 API credits per month and does not ask for a card. 2) Open "
      + "app.theirstack.com/settings/api-key, click “Create API key” and choose a name and expiry. 3) Copy the key: it is shown only "
      + "once. Each job returned uses 1 credit and each company 3; the free plan allows 10 requests per minute.",
    test: { path: "/v0/billing/credit-balance",
              message: (d) => (d?.api_credits != null ? `${d.api_credits} API credits available` : "API key is valid") },
    examples: "Examples: GET /v0/billing/credit-balance (free), POST /v1/jobs/search {\"limit\": 10, \"page\": 0, "
      + "\"job_country_code_or\": [\"US\"], \"posted_at_max_age_days\": 7}, "
      + "POST /v1/companies/search {\"limit\": 10, \"company_domain_or\": [\"example.com\"]}, "
      + "POST /v1/companies/technologies {\"company_domain\": \"example.com\"} (3 credits), GET /v0/catalog/keywords?q=….",
  },
  {
    id: "tomba", name: "Tomba", category: "crm",
    description: "Find and verify business emails and enrich companies",
    website: "https://tomba.io", docs: "https://docs.tomba.io/introduction", logo: { favicon: "https://tomba.io" },
    baseUrl: "https://api.tomba.io/v1", timeout: LONG_TIMEOUT,
    auth: [{ type: "header", name: "X-Tomba-Key", field: "api_key" },
           { type: "header", name: "X-Tomba-Secret", field: "api_secret" }],
    fields: [{ id: "api_key", label: "API key (ta_…)", secret: true, example: "ta_0123456789abcdef" },
             { id: "api_secret", label: "Secret (ts_…)", secret: true, example: "ts_0123456789abcdef" }],
    keyUrl: "https://app.tomba.io/api",
    help: "1) Sign up at app.tomba.io (the free plan includes 25 searches per month) and open app.tomba.io/api. 2) Create a key "
      + "or copy the one you already have: it starts with ta_. 3) Also copy the secret from the same page: it starts with ts_. Keys "
      + "expire, so if they stop working check their expiry date.",
    test: { path: "/me", account: (d) => d?.data?.email },
    examples: "Responses come inside “data”. Examples: GET /me (account and balance; includes the API secret, which Conector "
      + "hides), GET /domain-search?domain=example.com&limit=10, "
      + "GET /email-finder?domain=example.com&first_name=Jane&last_name=Doe, "
      + "GET /email-verifier?email=… (uses one verification), GET /enrich?email=….",
  },
  {
    id: "twenty", name: "Twenty", category: "crm",
    description: "Open-source CRM: people, companies, opportunities and tasks",
    website: "https://twenty.com", docs: "https://docs.twenty.com/developers/api-and-webhooks/api", logo: { simpleIcons: "twenty" },
    baseUrl: "{url}", graphql: { path: "/graphql" },
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true },
             { id: "url", label: "Twenty URL", format: "url", default: "https://api.twenty.com",
               help: "https://api.twenty.com on Twenty Cloud; on a self-hosted installation, its address (https://crm.example.com)." }],
    help: "1) In Twenty open “Settings” → “Developers” → “API” and click “+ Create key”. 2) Give it a name and an expiry; to "
      + "limit what it can see, assign it a role in “Settings” → “Members” → “Roles”. 3) Copy the key: it is shown only once. With "
      + "Twenty Cloud leave the default URL; with a self-hosted installation, enter its URL.",
    test: { path: "/rest/people", query: { limit: 1 }, message: "API key is valid" },
    examples: "The API is generated from your workspace's schema (custom objects also get a path). "
      + "Examples: GET /rest/people?limit=20, GET /rest/companies?limit=20, GET /rest/opportunities, "
      + "POST /rest/people {\"name\": {\"firstName\": \"Jane\", \"lastName\": \"Doe\"}}, GET /rest/metadata/objects (schema), "
      + "and GraphQL with twenty_graphql.",
  },
  {
    id: "wati", name: "Wati", category: "communication",
    description: "WhatsApp Business: contacts, templates, conversations and campaigns",
    website: "https://www.wati.io", docs: "https://docs.wati.io/reference/introduction", logo: { favicon: "https://www.wati.io" },
    baseUrl: "https://{server}",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API token", secret: true },
             { id: "server", label: "API server", format: "domain", default: "live-mt-server.wati.io",
               help: "Change it only if your account uses another server (e.g. live-server-12345.wati.io, shown on the "
                 + "API page of your dashboard)." }],
    help: "1) In Wati open “API” in the menu (or “Connector” → “API”) and click “Generate new token”. 2) Give it a name and select the "
      + "permissions (scopes) you need, e.g. contacts:read, contacts:write and messagetemplate:read; optionally, an expiry "
      + "date. 3) Copy the token: it is shown only once. The connection test needs the “api” or "
      + "“wati_integration:read” permission.",
    test: { path: "/api/ext/v3/account/credits", message: (d) => {
      const c = d?.credit ?? d?.data?.credit;
      return c != null ? `Account credit: ${c} ${d?.currency ?? d?.data?.currency ?? ""}`.trim() : "Token is valid";
    } },
    examples: "API v3 (recommended) lives under /api/ext/v3 and does not include the workspace ID. Examples: "
      + "GET /api/ext/v3/contacts?page_number=1&page_size=50, GET /api/ext/v3/messageTemplates?page_number=1&page_size=50, "
      + "GET /api/ext/v3/channels?page_number=1&page_size=10, GET /api/ext/v3/broadcasts?page_number=1&page_size=20. "
      + "API v1 (legacy) uses the full URL https://live-mt-server.wati.io/{tenantId}/api/v1/getContacts.",
  },
  {
    id: "whautomate", name: "Whautomate", category: "communication",
    description: "WhatsApp and omnichannel: clients, messages, appointments, broadcasts",
    website: "https://whautomate.com", docs: "https://help.whautomate.com/product-guides/whautomate-rest-api",
    logo: { favicon: "https://whautomate.com" },
    baseUrl: "https://{server}/v1",
    auth: { type: "header", name: "x-api-key" },
    fields: [{ id: "token", label: "API key", secret: true },
             { id: "server", label: "Region", default: "api.whautomate.com",
               options: [["api.whautomate.com", "Global"], ["api.in.whautomate.com", "India"]],
               help: "The one shown in your dashboard under “Integrations” → “REST API”." }],
    help: "1) In Whautomate open “Integrations”, scroll down to “REST API” and click “Connect”. 2) Copy the host (global or India) and click "
      + "“New API Key”: give it a name and click “Generate”. 3) Copy the key. Limits: 60 requests per minute and 100 per day on the "
      + "free trial; 300 per minute and 432,000 per day on a paid plan.",
    test: { path: "/locations", message: "API key is valid" },
    examples: "Examples: GET /clients, GET /contacts, GET /appointments, GET /broadcasts, "
      + "POST /messages/whatsapp/sendtext (sends a WhatsApp text message).",
  },
  {
    id: "wildapricot", name: "WildApricot", category: "crm",
    description: "Association management: contacts, memberships, events and invoices",
    website: "https://www.wildapricot.com", docs: "https://gethelp.wildapricot.com/en/articles/182-authenticating-api-calls",
    logo: { favicon: "https://www.wildapricot.com" },
    baseUrl: "https://api.wildapricot.org/v2.2",
    auth: { type: "custom", apply: async (c) => ({ headers: { Authorization: `Bearer ${await wildApricotAccess(c)}` } }) },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) Sign in as an admin to your WildApricot and open “Settings” → “Authorized applications”. 2) Click “Authorize "
      + "application”, choose “Server application”, give it a name, select the access (“Full access” or read-only) and save. "
      + "3) Copy the API key of that application. Conector exchanges it for an access token that lasts 30 minutes and renews it automatically.",
    test: { path: "/accounts", account: (d) => d?.[0]?.PrimaryDomainName || d?.[0]?.Name },
    examples: "Almost everything depends on your account ID, which GET /accounts returns. With $async=false the response comes back directly; "
      + "otherwise you have to poll the result URL. Examples: GET /accounts/{id}/contacts?$async=false&$top=20, "
      + "GET /accounts/{id}/events, GET /accounts/{id}/invoices?$async=false, GET /accounts/{id}/membershiplevels.",
  },
  {
    id: "woodpeckerco", name: "Woodpecker.co", category: "crm",
    description: "Cold email: campaigns, prospects, mailboxes and replies",
    website: "https://woodpecker.co", docs: "https://developers.woodpecker.co/docs/introduction", logo: { favicon: "https://woodpecker.co" },
    baseUrl: "https://api.woodpecker.co/rest",
    auth: { type: "header", name: "x-api-key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) Sign in to app.woodpecker.co and open “Add-ons” (top right) → “API & Integrations” → “API keys”. 2) Click "
      + "“Create a key”, give it a label (e.g. Conector) and copy it: each user sees only their own. 3) The API processes one "
      + "request at a time and queues up to six more; the rest get a 429 error.",
    test: { path: "/v2/users", message: "API key is valid" },
    examples: "The version is in the path; campaigns and prospects are still on v1 (legacy, but working). Examples: "
      + "GET /v2/mailboxes, GET /v2/campaigns/{id}, GET /v2/inbox/messages?per_page=20, "
      + "GET /v1/campaign_list?status=RUNNING,PAUSED, GET /v1/prospects?status=REPLIED&per_page=50.",
  },
  {
    id: "zixflow", name: "Zixflow", category: "crm",
    description: "CRM and messaging (SMS, email, WhatsApp): records and campaigns",
    website: "https://zixflow.com", docs: "https://docs.zixflow.com/api-reference/introduction", logo: { favicon: "https://zixflow.com" },
    baseUrl: "https://api.zixflow.com/api/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) Sign in to Zixflow and open “Settings” → “Workspace Settings” → “Developer” → “API Key”. 2) Click “Create an API”, "
      + "give it a name and set the permissions, an optional expiry date and, if you want, the allowed IPs. 3) Copy the key: "
      + "whatever you do with it affects the real data in your workspace. Limit: 150 requests per second.",
    test: { path: "/collections", message: (d) => list(d?.data, "collection", "collections", "API key is valid") },
    examples: "Examples: GET /collections, GET /workspace-members, "
      + "POST /collection-records/{collectionId}/query {\"filter\": {}, \"sort\": [], \"limit\": 10, \"offset\": 0}, "
      + "POST /collection-records/{collectionId} (creates a record with the attributes by their key), "
      + "POST /campaign/sms/send (uses balance).",
  },
];
