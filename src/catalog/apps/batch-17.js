// Batch 17 of the catalog: Yelp, You.com, Zenserp, Zigpoll, Zyte API, 1Password, Ably, Alchemy, Anakin, Anchor Browser, ApiFlash,
// APIVerve, Appcircle, AppVeyor, Authyo, Backendless, Baserow, BlazeMeter, Bolt IoT, Bonsai, Browser Use and Browserbase.
import crypto from "node:crypto";
import { USER_AGENT, httpRequest } from "../../http.js";
import { ensureOk } from "../define.js";

// Appcircle exchanges the Personal Access Key for an access token (about 4 h), which is kept in memory until it expires.
let appcircleCache = null;
async function appcircleAccessToken(c) {
  const key = c.token.trim();
  const fingerprint = crypto.createHash("sha256").update(key).digest("hex");
  if (appcircleCache?.fingerprint === fingerprint && appcircleCache.expires > Date.now() + 60_000) return appcircleCache.token;
  const r = await httpRequest("https://auth.appcircle.io/auth/v3/token", { method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded", "User-Agent": USER_AGENT },
    body: new URLSearchParams({ personalAccessKey: key }) });
  // With a key that does not exist, Appcircle responds 500 “hash_error” instead of 401.
  if (!r.ok && /hash_error/.test(JSON.stringify(r.data))) throw new Error("Appcircle responded 401: the Personal Access Key is not valid");
  const d = ensureOk(r, "Appcircle");
  const token = d?.access_token;
  if (!token) throw new Error("Appcircle: the authentication response does not include a token");
  appcircleCache = { fingerprint, token, expires: Date.now() + (Number(d.expires_in) || 3600) * 1000 };
  return token;
}

// Ably uses basic authentication with the full key (app.key:secret) encoded in Base64.
const ablyAuthorization = (c) => ({ headers: { Authorization: `Basic ${Buffer.from(c.token.trim()).toString("base64")}` } });

// Bonsai: new tokens (bonsai_<key>_<secret>) go as Bearer; old ones are written key:secret and go as Basic.
function bonsaiAuthorization(c) {
  const token = c.token.trim();
  return { headers: { Authorization: token.includes(":") ? `Basic ${Buffer.from(token).toString("base64")}` : `Bearer ${token}` } };
}

// AppVeyor user keys (v2) require the account in the path (/api/account/<account>/…); the account token does not.
function appveyorBaseUrl(c) {
  const account = (c.account || "").trim();
  if (!account) return "https://ci.appveyor.com/api";
  if (!/^[A-Za-z0-9._-]+$/.test(account)) throw new Error("“AppVeyor account” is not valid: only letters, numbers, dots, hyphens and underscores");
  return `https://ci.appveyor.com/api/account/${account}`;
}

export default [
  {
    id: "yelp", name: "Yelp", category: "data", description: "Businesses, reviews and local details (Yelp Places API)",
    website: "https://www.yelp.com", docs: "https://docs.developer.yelp.com/docs/places-intro", logo: { simpleIcons: "yelp" },
    baseUrl: "https://api.yelp.com/v3",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://www.yelp.com/developers/v3/manage_app",
    help: "1) Choose a Yelp Places API plan at business.yelp.com/data/products/places-api and sign in at yelp.com/developers with "
      + "your Yelp account. 2) Click “Create New App”, fill in the name, the industry and your contact details, accept the terms of use and submit "
      + "the form. 3) In “Manage App” copy the “API Key” (a long string). Call limits depend on the chosen plan.",
    test: { path: "/businesses/search", query: { location: "New York", limit: 1 }, message: "API key is valid" },
    examples: "Examples: GET /businesses/search?term=restaurants&location=NYC&limit=10&locale=en_US, GET /businesses/{id_or_alias}, "
      + "GET /businesses/{id_or_alias}/reviews?limit=3&sort_by=newest, GET /autocomplete?text=piz&latitude=40.71&longitude=-74.01, "
      + "GET /categories?locale=en_US.",
  },
  {
    id: "yousearch", name: "You.com", category: "ai", description: "Web search for AI, cited answers and research",
    website: "https://you.com", docs: "https://you.com/docs", logo: { favicon: "https://you.com" },
    // Search and contents live on ydc-index.io; answers, research, images and balance, on api.you.com.
    baseUrl: "https://ydc-index.io", allowedOrigins: ["https://api.you.com"],
    auth: { type: "header", name: "X-API-Key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://you.com/platform",
    help: "1) Go to you.com/platform and sign in (or create an account: it includes trial credits). 2) In the API keys section "
      + "create a key and copy it. 3) Searches, answers and research use credits from your account; check the balance with "
      + "GET https://api.you.com/v1/billing/account_balance.",
    timeout: 240_000,
    test: { path: "https://api.you.com/v1/billing/account_balance", acceptStatus: [403],
              message: (d) => (typeof d?.data?.attributes?.balance === "number"
                ? `API key is valid · balance ${(d.data.attributes.balance / 100).toFixed(2)} USD`
                : "API key is valid (no permission to check the balance)") },
    examples: "On this base URL (ydc-index.io): POST /v1/search {\"query\": \"…\", \"count\": 5}, POST /v1/contents {\"urls\": [\"https://…\"], "
      + "\"formats\": [\"markdown\"]}. On api.you.com (full URL): POST https://api.you.com/v1/answer {\"query\": \"…\"}, "
      + "POST https://api.you.com/v1/research {\"input\": \"…\", \"research_effort\": \"standard\"}, "
      + "GET https://api.you.com/v1/research/{task_id}, GET https://api.you.com/v1/images?q=….",
  },
  {
    id: "zenserp", name: "Zenserp", category: "marketing", description: "Google results as JSON: web, images, news and maps",
    website: "https://zenserp.com", docs: "https://app.zenserp.com/documentation", logo: { favicon: "https://zenserp.com" },
    baseUrl: "https://app.zenserp.com/api/v2",
    auth: { type: "header", name: "apikey" },
    fields: [{ id: "token", label: "API key (apikey)", secret: true }],
    keyUrl: "https://app.zenserp.com",
    help: "1) Create a free account at zenserp.com and sign in at app.zenserp.com. 2) Your dashboard shows the “API key”: copy it. "
      + "3) Each search uses one request from your monthly quota; GET /status shows how many you have left.",
    test: { path: "/status",
              message: (d) => (d?.remaining_requests != null ? `API key is valid · requests remaining: ${d.remaining_requests}`
                : "API key is valid") },
    examples: "Examples: GET /search?q=pizza+new+york&hl=en&gl=us&num=10, GET /search?q=cats&tbm=isch (images), "
      + "GET /search?q=coffee+shops&tbm=lcl&location=New+York,United+States (maps), GET /search?q=…&search_engine=google.com&start=10 (next page), "
      + "GET /status (remaining requests).",
  },
  {
    id: "zigpoll", name: "Zigpoll", category: "productivity", description: "Polls, responses, participants and analytics",
    website: "https://www.zigpoll.com", docs: "https://apidocs.zigpoll.com", logo: { favicon: "https://www.zigpoll.com" },
    baseUrl: "https://v1.zigpoll.com",
    auth: { type: "header", name: "Authorization" },
    fields: [{ id: "token", label: "Private key", secret: true }],
    keyUrl: "https://app.zigpoll.com",
    help: "1) Sign in at app.zigpoll.com (the API requires a Premium plan or higher). 2) Open “Integrations”, scroll down to “Private "
      + "Keys”, click “Add Key” and give it a label. 3) Copy the key. A read-only key can read but not modify; to "
      + "manage webhooks you need an owner, admin or billing key.",
    test: { path: "/me", account: (d) => d?.email || d?.name },
    examples: "Examples: GET /me, GET /accounts, GET /polls?accountId=…, GET /slides?pollId=…, GET /responses?pollId=…&limit=100 "
      + "(pagination with startCursor), GET /participants?pollId=…, GET /insights?pollId=….",
  },
  {
    id: "zyteapi", name: "Zyte API", category: "data", description: "Web extraction with anti-blocking, browser and structured data",
    website: "https://www.zyte.com/zyte-api/", docs: "https://docs.zyte.com/zyte-api/get-started.html", logo: { simpleIcons: "zyte" },
    baseUrl: "https://api.zyte.com/v1",
    auth: { type: "basic", usernameField: "token", fixedPassword: "" },
    fields: [{ id: "token", label: "Zyte API key", secret: true }],
    keyUrl: "https://app.zyte.com/o/zyte-api/api-access",
    help: "1) Go to app.zyte.com (if you have no account, create one: the trial includes free credit). 2) In the “Zyte API” menu open "
      + "“API Access” and copy the API key (it is not the Scrapy Cloud key or the one in the profile settings). 3) Each extraction request is "
      + "billed by its complexity (HTTP, browser, AI…); prices are at zyte.com/pricing.",
    timeout: 120_000,
    // A request without a url is not billed: with a valid key it responds 400 and with an invalid one, 401.
    test: { method: "POST", path: "/extract", body: {}, acceptStatus: [400, 422], message: "API key is valid" },
    examples: "Everything is POST /extract with JSON: {\"url\": \"https://example.com\", \"httpResponseBody\": true} (HTML in base64, the "
      + "cheapest option), {\"url\": \"…\", \"browserHtml\": true} (renders JavaScript), {\"url\": \"…\", \"product\": true} (automatic "
      + "product extraction; also article, productList or jobPosting), {\"url\": \"…\", \"screenshot\": true}.",
  },
  {
    id: "onepassword", name: "1Password", category: "developer", description: "1Password vaults and items through a Connect server",
    website: "https://1password.com", docs: "https://www.1password.dev/connect/api-reference", logo: { simpleIcons: "1password" },
    baseUrl: "{url}",
    auth: { type: "bearer" },
    fields: [{ id: "url", label: "URL of your 1Password Connect server", format: "url",
               help: "e.g. https://connect.example.com or http://localhost:8080 (without /v1)." },
             { id: "token", label: "Connect access token", secret: true }],
    keyUrl: "https://start.1password.com/developer-tools/infrastructure-secrets/connect",
    help: "1) This connection uses “1Password Connect”: you need a deployed Connect server (Docker or Kubernetes) that Conector can "
      + "reach. 2) Open the Connect wizard on 1Password.com (“Developer” → “Directory” → “Other”, under “Infrastructure Secrets "
      + "Management”), create the server, choose the shared vaults it can access (it cannot see the Personal, Private or "
      + "Employee vaults) and create the access token. 3) Copy the token, which is shown only once, and the URL of your Connect server.",
    test: { path: "/v1/vaults", message: (d) => (Array.isArray(d) ? `Vaults accessible with this token: ${d.length}` : "Token is valid") },
    examples: "Examples: GET /v1/vaults, GET /v1/vaults/{vaultId}/items?filter=title eq \"Server\", GET /v1/vaults/{vaultId}/items/{itemId}, "
      + "POST /v1/vaults/{vaultId}/items {\"title\": \"…\", \"category\": \"LOGIN\", \"fields\": […]}, GET /v1/activity.",
  },
  {
    id: "ably", name: "Ably", category: "developer", description: "Real-time messaging: publish, history, presence and push",
    website: "https://ably.com", docs: "https://ably.com/docs/api/rest-api", logo: { favicon: "https://ably.com" },
    baseUrl: "https://main.realtime.ably.net",
    auth: { type: "custom", apply: ablyAuthorization },
    fields: [{ id: "token", label: "Full API key (app.key:secret)", secret: true }],
    keyUrl: "https://ably.com/dashboard",
    help: "1) Go to ably.com/dashboard, open your app and its “API Keys” tab. 2) Copy a full key (it has the form "
      + "app.key:secret) or create one with only the capabilities you need (publish, history, presence, statistics…). "
      + "3) Paste it whole, including the colon.",
    test: { path: "/stats", query: { limit: 1 }, acceptStatus: [401], message: "API key is valid",
              // 40160: the key exists but has no statistics permission; any other 401 is a rejected key.
              validate: (d, r) => {
                if (r.status === 401 && d?.error?.code !== 40160) throw new Error(`Ably responded 401: ${d?.error?.message || "invalid key"}`);
              } },
    examples: "Examples: POST /channels/{channel}/messages {\"name\": \"event\", \"data\": \"hello\"}, GET /channels/{channel}/messages?limit=20 "
      + "(history), GET /channels/{channel}/presence, GET /channels?limit=20 (active channels), GET /stats?unit=hour&limit=24.",
  },
  {
    id: "alchemy", name: "Alchemy", category: "developer", description: "Blockchain nodes, NFTs and on-chain data on Ethereum and L2s",
    website: "https://www.alchemy.com", docs: "https://www.alchemy.com/docs", logo: { simpleIcons: "alchemy" },
    // The key goes in the header (Bearer), so it works for any network: just change the subdomain of the URL.
    baseUrl: "https://eth-mainnet.g.alchemy.com", allowedOrigins: ["^https://[a-z0-9-]+\\.g\\.alchemy\\.com$"],
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "App API key", secret: true }],
    keyUrl: "https://dashboard.alchemy.com",
    help: "1) Go to dashboard.alchemy.com (create a free account if you do not have one). 2) In “Apps” open an app or click “Create "
      + "new app” and enable the networks you will use. 3) Click “API Key” and copy the API key: it works for all the networks enabled in that "
      + "app.",
    test: { method: "POST", path: "/v2", body: { jsonrpc: "2.0", id: 1, method: "eth_blockNumber", params: [] }, acceptStatus: [403],
              message: (d) => (Number.isFinite(parseInt(d?.result, 16)) ? `Connected to Ethereum (block ${parseInt(d.result, 16)})`
                : "API key is valid (this app does not have the Ethereum network enabled)") },
    examples: "Examples: POST /v2 {\"jsonrpc\": \"2.0\", \"id\": 1, \"method\": \"eth_getBalance\", \"params\": [\"0x…\", \"latest\"]}, "
      + "POST /v2 with \"method\": \"alchemy_getAssetTransfers\", GET /nft/v3/getNFTsForOwner?owner=0x…, "
      + "GET /nft/v3/getNFTMetadata?contractAddress=0x…&tokenId=1. Other networks: full URL, e.g. "
      + "POST https://base-mainnet.g.alchemy.com/v2, https://polygon-mainnet.g.alchemy.com/v2 or https://arb-mainnet.g.alchemy.com/v2 "
      + "(the network must be enabled in the app).",
  },
  {
    id: "anakin", name: "Anakin", category: "data", description: "Scraping, crawling, AI search and web monitoring",
    website: "https://anakin.io", docs: "https://anakin.io/docs/api-reference", logo: { favicon: "https://anakin.io" },
    baseUrl: "https://api.anakin.io/v1",
    auth: { type: "header", name: "X-API-Key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://anakin.io/account#developer",
    help: "1) Sign up or sign in at anakin.io (300 free credits, no card needed). 2) Open your account (“Account”), “Developer” "
      + "section, and copy the API key. 3) New keys can take a few seconds to activate. Each scrape, search or "
      + "crawl uses credits.",
    timeout: 120_000,
    test: { path: "/monitors", message: "API key is valid" },
    examples: "Examples: POST /url-scraper/scrape {\"url\": \"https://example.com\"} (synchronous, returns markdown), "
      + "POST /search {\"prompt\": \"latest AI news\", \"limit\": 5}, POST /crawl {\"url\": \"https://example.com\", \"maxPages\": 20} "
      + "and then GET /crawl/{id}, POST /map {\"url\": \"https://example.com\", \"limit\": 100}, GET /monitors.",
  },
  {
    id: "anchorbrowser", name: "Anchor Browser", category: "automation",
    description: "Cloud browsers for agents: sessions, tasks and profiles",
    website: "https://anchorbrowser.io", docs: "https://docs.anchorbrowser.io", logo: { favicon: "https://anchorbrowser.io" },
    baseUrl: "https://api.anchorbrowser.io",
    auth: { type: "header", name: "anchor-api-key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://app.anchorbrowser.io/api-key",
    help: "1) Sign in (or sign up) at app.anchorbrowser.io. 2) Open the “API Key” page and copy your key. 3) Browser sessions, "
      + "AI tasks and proxies use credits from your plan; GET /v1/billing shows the balance.",
    timeout: 240_000,
    test: { path: "/v1/billing",
              message: (d) => (d?.data?.tier ? `Plan ${d.data.tier} · credits: ${d.data.credits}` : "API key is valid") },
    examples: "Examples: GET /v1/billing (credits and plan), POST /v1/sessions {} (creates a session and returns its id and the CDP URL), "
      + "GET /v1/sessions/all/status, POST /v1/tools/perform-web-task {\"url\": \"https://…\", \"prompt\": \"…\"} (an agent does the task), "
      + "GET /v1/profiles.",
  },
  {
    id: "apiflash", name: "ApiFlash", category: "developer", description: "Website screenshots through an API",
    website: "https://apiflash.com", docs: "https://apiflash.com/documentation", logo: { favicon: "https://apiflash.com" },
    baseUrl: "https://api.apiflash.com/v1",
    auth: { type: "query", name: "access_key" },
    fields: [{ id: "token", label: "Access key", secret: true }],
    keyUrl: "https://apiflash.com/dashboard/access_keys",
    help: "1) Create an account at apiflash.com (there is a free plan with a limited monthly quota) and sign in. 2) In the dashboard open "
      + "“Access Keys” and copy your access key. 3) Each screenshot counts toward your monthly quota; GET /urltoimage/quota shows it.",
    test: { path: "/urltoimage/quota",
              message: (d) => (d?.remaining != null ? `${d.remaining} of ${d.limit} screenshots left in this period` : "Access key is valid") },
    examples: "Examples: GET /urltoimage?url=https://example.com&response_type=json&format=png&width=1280 (with response_type=json it returns "
      + "the image URL instead of the image), GET /urltoimage?url=…&full_page=true&fresh=true, GET /urltoimage/quota.",
  },
  {
    id: "apiverve", name: "APIVerve", category: "developer", description: "300+ utility APIs with a single key",
    website: "https://apiverve.com", docs: "https://docs.apiverve.com", logo: { favicon: "https://apiverve.com" },
    baseUrl: "https://api.apiverve.com/v1",
    auth: { type: "header", name: "x-api-key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://dashboard.apiverve.com/apikey",
    help: "1) Create a free account at apiverve.com and sign in at dashboard.apiverve.com. 2) Open “API Keys”: a new account "
      + "already has a key; copy it. 3) Each API call uses credits from your plan; GET /analytics shows the balance and is never billed.",
    test: { path: "/analytics",
              message: (d) => (d?.data?.summary ? `Plan ${d.data.summary.plan} · credits remaining: ${d.data.summary.tokensRemaining}`
                : "API key is valid") },
    examples: "Examples: GET /analytics (plan and credits), GET /emailvalidator?email=…, GET /dnslookup?domain=…, GET /iplookup?ip=…, "
      + "GET /currencyconverter?value=1&from=USD&to=EUR, GET /whoislookup?domain=….",
  },
  {
    id: "appcircle", name: "Appcircle", category: "developer", description: "Mobile CI/CD: builds, distribution and app publishing",
    website: "https://appcircle.io", docs: "https://docs.appcircle.io/appcircle-api/api-authentication", logo: { favicon: "https://appcircle.io" },
    baseUrl: "https://api.appcircle.io",
    auth: { type: "custom", apply: async (c) => ({ headers: { Authorization: `Bearer ${await appcircleAccessToken(c)}` } }) },
    fields: [{ id: "token", label: "Personal Access Key", secret: true }],
    keyUrl: "https://my.appcircle.io",
    help: "1) Go to my.appcircle.io. 2) Open “Organization” → “Security” and, under “Personal access key”, click “Generate key”. "
      + "3) Copy the key: it is shown only once and is valid only for that organization. Conector exchanges it for a "
      + "temporary access token (valid for about 4 hours) and renews it automatically.",
    test: { path: "/distribution/v2/profiles", message: "Personal Access Key is valid" },
    examples: "Examples: GET /build/v2/profiles, GET /build/v2/profiles/{profileId}/workflows, GET /distribution/v2/profiles, "
      + "GET /distribution/v2/testing-groups. Full module reference: https://api.appcircle.io/openapi/index.html.",
  },
  {
    id: "appveyor", name: "AppVeyor", category: "developer", description: "Continuous integration: projects, builds, logs and environments",
    website: "https://www.appveyor.com", docs: "https://www.appveyor.com/docs/api/", logo: { simpleIcons: "appveyor" },
    baseUrl: appveyorBaseUrl,
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API token", secret: true },
             { id: "account", label: "Account name (only with v2 user keys)", optional: true,
               help: "Leave it empty if you use your account token; with a user key (v2) enter the account you will work with." }],
    keyUrl: "https://ci.appveyor.com/api-token",
    help: "1) Sign in at ci.appveyor.com with your account. 2) Open “My Profile” → “API token” (ci.appveyor.com/api-token) and copy the token of "
      + "your account. 3) If you prefer a user key (v2) from ci.appveyor.com/api-keys, which works for several accounts, also fill in "
      + "the name of the account you will work with.",
    test: { path: "/roles", message: "API token is valid" },
    examples: "Examples: GET /projects, GET /projects/{account}/{project}/history?recordsNumber=10, "
      + "GET /projects/{account}/{project}/build/{version}, POST /builds {\"accountName\": \"…\", \"projectSlug\": \"…\", \"branch\": \"main\"} "
      + "(starts a build), GET /buildjobs/{jobId}/log.",
  },
  {
    id: "authyo", name: "Authyo", category: "developer", description: "OTP codes by SMS, email or WhatsApp and passwordless sessions",
    website: "https://authyo.io", docs: "https://authyo.apidog.io", logo: { favicon: "https://authyo.io" },
    baseUrl: "https://app.authyo.io/api/v1",
    auth: [{ type: "header", name: "clientId", field: "client_id" }, { type: "header", name: "clientSecret", field: "client_secret" }],
    fields: [{ id: "client_id", label: "Application Client ID" },
             { id: "client_secret", label: "Application Client Secret", secret: true }],
    keyUrl: "https://app.authyo.io",
    help: "1) Go to app.authyo.io and open (or create) your application under “Application”. 2) In the application settings (“App Settings”) "
      + "find the API credentials and copy the “Client ID” and the “Client Secret”. 3) Sending an OTP or a notification is charged to "
      + "your Authyo balance; verifying a token sends nothing.",
    // There are no read-only calls: a made-up token is verified, which sends and bills nothing and only gets a proper answer if the credentials are valid.
    test: { method: "POST", path: "/auth/verifytoken", body: { token: "connection.check.token" }, message: "Authyo credentials are valid",
              validate: (d) => {
                if (/client ?id|client ?secret/i.test(d?.message || "")) throw new Error(`Authyo: ${d.message}`);
              } },
    examples: "Examples: POST /auth/sendotp {\"to\": \"15555550100\", \"authway\": \"SMS\"} (sends the code and is billed; authway: SMS, Email, "
      + "WhatsApp or VoiceCall), GET /auth/verifyotp?maskId=…&otp=123456, POST /auth/verifytoken {\"token\": \"<JWT>\"}, "
      + "POST /auth/revokesession {\"token\": \"<JWT>\"}.",
  },
  {
    id: "backendless", name: "Backendless", category: "developer", description: "Data tables, users and files of your backend",
    website: "https://backendless.com", docs: "https://backendless.com/docs/rest/doc.html", logo: { simpleIcons: "backendless" },
    // The Application ID and the REST key go in the path (https://api.backendless.com/<app-id>/<rest-key>/…), not in a header.
    baseUrl: "https://{server}/{appid}/{apikey}",
    auth: { type: "none" },
    fields: [{ id: "appid", label: "Application ID", format: "segment", example: "12345678-1234-1234-1234-123456789012" },
             { id: "apikey", label: "REST API Key", secret: true, format: "segment", example: "87654321-4321-4321-4321-210987654321" },
             { id: "server", label: "App region", optional: true, default: "api.backendless.com",
               options: [["api.backendless.com", "United States (api.backendless.com)"],
                          ["eu-api.backendless.com", "Europe (eu-api.backendless.com)"]],
               help: "Choose Europe if you open the console at eu-develop.backendless.com." }],
    keyUrl: "https://develop.backendless.com",
    help: "1) Open the Backendless console (develop.backendless.com, or eu-develop.backendless.com if your app is in Europe) "
      + "and open your app. 2) Go to “Manage” → “App Settings” → “API Keys” and copy the “Application ID” and the “REST” key. "
      + "3) Choose the right region. What you can do with each table depends on the role permissions (Security → Data Permissions).",
    // A permissions error on the table (1011-1015, 1134) means the app and the key are correct; 2002, 9000 and 3008 mean they are not.
    test: { path: "/data/Users", query: { pageSize: 1 }, acceptStatus: [400, 401, 403], message: "Application ID and REST key are valid",
              validate: (d) => {
                if ([2002, 9000, 3008].includes(d?.code)) throw new Error(`Backendless: ${d.message}`);
              } },
    examples: "Examples: GET /data/{table}?pageSize=20&sortBy=created desc, GET /data/{table}?where=age>30, GET /data/{table}/{objectId}, "
      + "POST /data/{table} {\"field\": \"value\"}, PUT /data/{table}/{objectId} {…}, DELETE /data/{table}/{objectId}. To act as an "
      + "authenticated user add the user-token header.",
  },
  {
    id: "baserow", name: "Baserow", category: "productivity", description: "Rows of your Baserow tables (cloud or self-hosted)",
    website: "https://baserow.io", docs: "https://baserow.io/api-docs", logo: { simpleIcons: "baserow" },
    baseUrl: "{url}",
    auth: { type: "header", name: "Authorization", prefix: "Token " },
    fields: [{ id: "url", label: "Baserow API URL", format: "url", default: "https://api.baserow.io", optional: true,
               help: "For Baserow Cloud (baserow.io) leave it as is. If you self-host, enter your URL (e.g. https://baserow.example.com)." },
             { id: "token", label: "Database token", secret: true }],
    help: "1) In Baserow click your workspace (top left) → “Settings” → “Database tokens” tab → “Create token”. "
      + "2) Give it a name, choose the workspace and tick the permissions (create, read, update, delete) for all or some tables. "
      + "3) Copy the token right after creating it: it is not shown again. It gives access only to the rows of that workspace, with those "
      + "permissions (not to the table structure); the ID of a table comes from its URL (…/database/ID/table/ID).",
    test: { path: "/api/database/tokens/check/", message: "Database token is valid" },
    examples: "Examples: GET /api/database/rows/table/{tableId}/?user_field_names=true&size=25&page=1, "
      + "GET /api/database/rows/table/{tableId}/{rowId}/?user_field_names=true, "
      + "POST /api/database/rows/table/{tableId}/?user_field_names=true {\"Name\": \"Example\"}, "
      + "PATCH /api/database/rows/table/{tableId}/{rowId}/?user_field_names=true {…}, DELETE /api/database/rows/table/{tableId}/{rowId}/.",
  },
  {
    id: "blazemeter", name: "BlazeMeter", category: "developer", description: "Load and performance testing: tests, runs and results",
    website: "https://www.blazemeter.com", docs: "https://help.blazemeter.com/apidocs/", logo: { simpleIcons: "blazemeter" },
    baseUrl: "https://a.blazemeter.com/api/v4",
    auth: { type: "basic", usernameField: "api_key_id", passwordField: "api_key_secret" },
    fields: [{ id: "api_key_id", label: "API Key ID" },
             { id: "api_key_secret", label: "API Key Secret", secret: true }],
    keyUrl: "https://a.blazemeter.com",
    help: "1) Go to a.blazemeter.com. 2) Click the gear icon (Settings) at the top right → “Personal” → “API Keys” → “+”. "
      + "3) Give it a name and an expiry date and click “Generate”. 4) Copy the ID and the Secret right away: the secret is shown only once.",
    test: { path: "/user", account: (d) => d?.result?.email || d?.result?.displayName },
    examples: "Examples: GET /user, GET /accounts, GET /workspaces?accountId=…, GET /projects?workspaceId=…, GET /tests?projectId=…, "
      + "POST /tests/{testId}/start (starts a test), GET /masters/{masterId}/reports/aggregatereport/data.",
  },
  {
    id: "boltiot", name: "Bolt IoT", category: "developer", description: "Bolt IoT devices: GPIO, UART, status and device list",
    website: "https://boltiot.com", docs: "https://docs.boltiot.com/api/api-introduction", logo: { favicon: "https://boltiot.com" },
    // The API key goes in the path (https://cloud.boltiot.com/remote/<API key>/command?deviceName=…), not in a header.
    baseUrl: "https://cloud.boltiot.com/remote/{token}",
    auth: { type: "none" },
    fields: [{ id: "token", label: "Bolt Cloud API key", secret: true, format: "segment" }],
    keyUrl: "https://cloud.boltiot.com",
    help: "1) Sign in at cloud.boltiot.com with your Bolt Cloud account. 2) Open the “API” menu and copy your API key (a UUID-like code). "
      + "3) The ID of each device (BOLT1234567) appears in getDevices or in the Bolt Cloud device list and is passed in "
      + "each call as deviceName. The free plan allows about 20 calls per minute; if you go over, Bolt blocks the API for a while.",
    test: { path: "/accountEmail", account: (d) => d?.value,
              // Bolt IoT also responds 200 to an invalid key: {"success": 0, "value": "Invalid API key"}.
              validate: (d) => {
                if (String(d?.success) !== "1") throw new Error(`Bolt IoT: ${d?.value || "invalid response"}`);
              } },
    examples: "Examples: GET /getDevices, GET /isAlive?deviceName=BOLT1234567, GET /digitalWrite?pin=0&state=HIGH&deviceName=BOLT1234567, "
      + "GET /digitalRead?pin=0&deviceName=BOLT1234567, GET /analogRead?pin=A0&deviceName=BOLT1234567, GET /restart?deviceName=BOLT1234567.",
  },
  {
    id: "bonsai", name: "Bonsai", category: "developer", description: "Managed Elasticsearch and OpenSearch clusters",
    website: "https://bonsai.io", docs: "https://bonsai.io/docs/api/overview/", logo: { favicon: "https://bonsai.io" },
    baseUrl: "https://api.bonsai.io",
    auth: { type: "custom", apply: bonsaiAuthorization },
    fields: [{ id: "token", label: "API token (bonsai_…)", secret: true }],
    keyUrl: "https://app.bonsai.io",
    help: "1) Go to app.bonsai.io, open your account settings and the “API Tokens” tab. 2) Click “New Token”, choose the permissions "
      + "(account:read and clusters:read are enough to read; clusters:write only if you want to create or delete clusters) and an expiry date. "
      + "3) Copy the token (bonsai_…) right after creating it: it is not shown again. If your token is an old one (key and secret separately), "
      + "enter it as key:secret.",
    test: { path: "/clusters",
              message: (d) => (typeof d?.pagination?.total_records === "number" ? `Token is valid · clusters: ${d.pagination.total_records}`
                : "Token is valid") },
    examples: "Examples: GET /clusters, GET /clusters/{slug}, GET /spaces, GET /spaces/{path}, GET /plans. With the clusters:write permission: "
      + "POST /clusters, PUT /clusters/{slug}, DELETE /clusters/{slug} {\"name\": \"…\"}.",
  },
  {
    id: "browseruse", name: "Browser Use", category: "automation", description: "Cloud browser agents, sessions and profiles",
    website: "https://browser-use.com", docs: "https://docs.browser-use.com/cloud/api-v4-overview", logo: { favicon: "https://browser-use.com" },
    baseUrl: "https://{server}/api/v4",
    auth: { type: "header", name: "X-Browser-Use-API-Key" },
    fields: [{ id: "token", label: "API key (bu_…)", secret: true },
             { id: "server", label: "Key region", optional: true, default: "api.browser-use.com",
               options: [["api.browser-use.com", "United States (api.browser-use.com)"],
                          ["api.eu.browser-use.com", "Europe, Frankfurt (api.eu.browser-use.com)"]],
               help: "Keys for the Europe region are created at cloud.eu.browser-use.com and only work there." }],
    keyUrl: "https://cloud.browser-use.com/settings?tab=api-keys&new=1",
    help: "1) Go to cloud.browser-use.com (or cloud.eu.browser-use.com for the Europe region) and open “Settings” → “API Keys”. "
      + "2) Create a new key (it starts with bu_) and copy it. 3) Choose the region the key belongs to: the resources of each region "
      + "are independent. Agent runs and browsers use credits.",
    test: { path: "/sessions", message: "API key is valid" },
    examples: "Examples: POST /runs {\"task\": \"Search for … and summarize the result\"} (starts the agent), GET /runs/{id}/status, GET /runs/{id}, "
      + "GET /sessions, POST /sessions/{id}/queue {\"text\": \"…\"} (follow-up), GET /browsers. Balance and limits (United States only): "
      + "GET https://api.browser-use.com/api/v2/billing/account.",
  },
  {
    id: "browserbase", name: "Browserbase", category: "automation",
    description: "Cloud browsers: sessions, fetch, search and projects",
    website: "https://www.browserbase.com", docs: "https://docs.browserbase.com/reference/api/overview", logo: { favicon: "https://www.browserbase.com" },
    baseUrl: "https://api.browserbase.com/v1",
    auth: { type: "header", name: "X-BB-API-Key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://www.browserbase.com/settings",
    help: "1) Sign in (or sign up) at browserbase.com. 2) Open “Settings” (or the project overview) and copy the “API Key”; "
      + "the “Project ID” also appears in GET /projects. 3) Browser sessions and fetch and search calls use hours and "
      + "credits from your plan.",
    test: { path: "/projects", account: (d) => (Array.isArray(d) ? d[0]?.name : null) },
    examples: "Examples: GET /projects, GET /projects/{projectId}/usage, POST /sessions {\"projectId\": \"…\"} (returns connectUrl for "
      + "Playwright or Puppeteer), GET /sessions?status=RUNNING, POST /fetch {\"url\": \"https://…\"}, POST /search {\"query\": \"…\"}.",
  },
];
