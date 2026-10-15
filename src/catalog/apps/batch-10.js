// Batch 10 of the catalog (from the Composio catalog): data and analytics. API data providers (air quality and weather, sports,
// companies, vehicles, blockchain, official statistics), web scraping and product analytics. Form builders (ByteForms, CabinPanda)
// are filed under “productivity”, like the rest of the catalog's forms.
import crypto from "node:crypto";
import { USER_AGENT, httpRequest } from "../../http.js";
import { ensureOk } from "../define.js";

const count = (n, singular, plural) => `${n} ${n === 1 ? singular : plural}`;
// “N things” if the response is a list; otherwise the fallback text.
const list = (d, one, many, fallback = "Credentials are valid") => (Array.isArray(d) ? count(d.length, one, many) : fallback);

// Bitquery accepts an access token (ory_at_…, which expires according to the application) or an application's Client ID and secret:
// with those, a new token is requested when needed and kept in memory until it expires.
let bitqueryTokenCache = null;
async function getBitqueryToken(c) {
  if (c.token) return c.token;
  if (!c.client_id || !c.client_secret) throw new Error("Bitquery: the access token or the Client ID and Client secret are missing");
  const fingerprint = crypto.createHash("sha256").update(JSON.stringify([c.client_id, c.client_secret])).digest("hex");
  if (bitqueryTokenCache?.fingerprint === fingerprint && bitqueryTokenCache.expires > Date.now() + 60_000) return bitqueryTokenCache.token;
  const d = ensureOk(await httpRequest("https://oauth2.bitquery.io/oauth2/token", { method: "POST",
    headers: { Accept: "application/json", "User-Agent": USER_AGENT },
    body: new URLSearchParams({ grant_type: "client_credentials", client_id: c.client_id, client_secret: c.client_secret,
                                scope: "api" }) }), "Bitquery");
  if (!d?.access_token) throw new Error("Bitquery: the authentication response does not include a token");
  bitqueryTokenCache = { fingerprint, token: d.access_token, expires: Date.now() + (Number(d.expires_in) || 3600) * 1000 };
  return d.access_token;
}

export default [
  {
    id: "agenty", name: "Agenty", category: "data",
    description: "Web scraping: agents, jobs and lists, plus a browser API",
    website: "https://agenty.com", docs: "https://agenty.com/docs/api/", logo: { favicon: "https://agenty.com" },
    baseUrl: "https://api.agenty.com/v2", allowedOrigins: ["https://api.agenty.ai"],
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://cloud.agenty.com/settings/api-keys",
    help: "1) Sign in at cloud.agenty.com. 2) Open “Settings” → “API Keys” (cloud.agenty.com/settings/api-keys), create a "
      + "key and copy it. 3) The same key works for the agents API (api.agenty.com) and for the browser API (api.agenty.ai). "
      + "Running agents and browser calls use pages or credits from your plan.",
    test: { path: "/agents", query: { limit: 1 }, message: "API key is valid" },
    examples: "Two APIs with the same key. Agents (relative paths): GET /agents?limit=20, GET /agents/{agent_id}, "
      + "POST /jobs/start {\"agent_id\": \"…\"} (runs the agent in the cloud), GET /jobs/{job_id}, GET /jobs/{job_id}/result?limit=100, "
      + "GET /lists. Browser API (another domain, full URL): POST https://api.agenty.ai/v1/scrape {\"url\": \"https://…\"}, "
      + "POST https://api.agenty.ai/v1/markdown {\"url\": \"https://…\"}, "
      + "POST https://api.agenty.ai/v1/screenshot {\"url\": \"https://…\", \"responseType\": \"url\"}.",
  },
  {
    id: "akta", name: "Akta", category: "data",
    description: "Company intelligence: profiles, news, lists and signals",
    website: "https://akta.pro", docs: "https://docs.akta.pro", logo: { favicon: "https://akta.pro" },
    baseUrl: "https://api.akta.pro/api/v1",
    auth: { type: "header", name: "x-api-key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://playground.akta.pro/dashboard/manage/api-keys",
    help: "1) Create an account at playground.akta.pro and open key management (playground.akta.pro/dashboard/manage/api-keys). "
      + "2) Create a key and copy it. 3) Billing is pay-as-you-go with prepaid credits (0.05 USD per credit): searching "
      + "companies and industries is free and the connection test uses that search; enrichment, news and lists "
      + "use credits.",
    test: { path: "/company/search/", query: { query: "canva.com" }, message: "API key is valid" },
    examples: "Paths end in “/” and responses carry “data” and “credits_consumed”. Examples: "
      + "GET /company/search/?query=canva.com (free), GET /company/enrichment/?company=canva.com&sections=firmographic,location "
      + "(credits per section), GET /news/?company=canva.com&limit=10, GET /company/headcount-trends/?company=canva.com, "
      + "GET /industry/search/?query=warehouse automation (free), POST /list/generate/companies/ {\"query\": \"…\", \"limit\": 20}.",
  },
  {
    id: "ambee", name: "Ambee", category: "data",
    description: "Hyperlocal environmental data: air, pollen, weather and fire",
    website: "https://www.getambee.com", docs: "https://docs.ambeedata.com", logo: { favicon: "https://www.getambee.com" },
    baseUrl: "https://api.ambeedata.com",
    auth: { type: "header", name: "x-api-key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://api-dashboard.getambee.com",
    help: "1) Sign up at api-dashboard.getambee.com with a Google or business account (the free plan includes a limited call "
      + "quota). 2) The API key appears in the panel as soon as you sign in: copy it; it can be regenerated every 30 days. "
      + "3) Each call uses quota from your plan; when it runs out, the API returns a partial response (206).",
    test: { path: "/v3/aq/latest", query: { lat: 40.4168, lng: -3.7038 }, message: "API key is valid" },
    examples: "Query by coordinates (lat, lng) or by place (place). Examples: GET /v3/aq/latest?lat=40.4168&lng=-3.7038 "
      + "(air quality), GET /v3/aq/forecast/48hrs?place=London, GET /v3/pollen/latest?lat=…&lng=…, "
      + "GET /v3/weather/latest?place=London, GET /v3/weather/history?lat=…&lng=…&from=2026-10-01 00:00:00&to=2026-10-02 00:00:00, "
      + "GET /fire/risk/by-lat-lng?lat=…&lng=… (North America only).",
  },
  {
    id: "ambientweather", name: "Ambient Weather", category: "data",
    description: "Personal weather stations: devices and readings",
    website: "https://ambientweather.com", docs: "https://ambientweather.docs.apiary.io/", logo: { favicon: "https://ambientweather.com" },
    baseUrl: "https://rt.ambientweather.net/v1",
    auth: [{ type: "query", name: "apiKey", field: "api_key" }, { type: "query", name: "applicationKey", field: "application_key" }],
    fields: [{ id: "api_key", label: "API Key (from your account)", secret: true },
             { id: "application_key", label: "Application Key (from the application)", secret: true }],
    keyUrl: "https://ambientweather.net/account",
    help: "1) Sign in at ambientweather.net/account with the account where your stations are. 2) In the keys section create an "
      + "“API Key” (gives access to your stations' data) and an “Application Key” (identifies the application) and copy them. "
      + "3) Paste both here. Limit: 1 request per second per API Key and 3 per second per Application Key; if you exceed it, it responds 429.",
    test: { path: "/devices", message: (d) => list(d, "linked station", "linked stations", "Keys are valid") },
    examples: "Examples: GET /devices (your stations with their latest reading), GET /devices/{macAddress}?limit=288 (history, with data "
      + "every 5 or 30 minutes), GET /devices/{macAddress}?endDate=1790000000000&limit=100 (readings before that date, given in "
      + "milliseconds).",
  },
  {
    id: "amplitude", name: "Amplitude", category: "data",
    description: "Product analytics: events, users, funnels and retention",
    website: "https://amplitude.com", docs: "https://amplitude.com/docs/apis/analytics/dashboard-rest",
    logo: { favicon: "https://amplitude.com" },
    baseUrl: "https://{server}",
    auth: { type: "basic", usernameField: "api_key", passwordField: "secret_key" },
    fields: [{ id: "api_key", label: "Project API Key" },
             { id: "secret_key", label: "Project Secret Key", secret: true },
             { id: "server", label: "Data region", default: "amplitude.com",
               options: [["amplitude.com", "US"], ["analytics.eu.amplitude.com", "European Union"]],
               help: "Your organization's region in Amplitude; with the other one, the API rejects the keys." }],
    help: "1) In Amplitude open “Organization settings” → “Projects” and choose the project (you must be an administrator or manager of "
      + "it). 2) Copy its “API Key” and its “Secret Key”: they are sent as username and password (basic authentication). 3) Each connection "
      + "sees a single project, in your organization's data region. The Secret Key gives read access to all of that project's data.",
    test: { path: "/api/2/events/list", message: (d) => list(d?.data, "defined event", "defined events") },
    examples: "Paths include the version: almost all are /api/2. Examples: GET /api/2/events/list, "
      + "GET /api/2/events/segmentation?e={\"event_type\":\"_active\"}&start=20261001&end=20261015&m=uniques&i=1, "
      + "GET /api/2/funnels?e={\"event_type\":\"signup\"}&e={\"event_type\":\"purchase\"}&start=20261001&end=20261015, "
      + "GET /api/2/usersearch?user=… (finds a user), GET /api/2/useractivity?user={amplitude_id}, GET /api/3/cohorts.",
  },
  {
    id: "apexverify", name: "ApexVerify", category: "data",
    description: "Email and phone verification, single and in batches",
    website: "https://apexverify.com", docs: "https://documentation.apexverify.com", logo: { favicon: "https://apexverify.com" },
    baseUrl: "https://api.apexverify.com",
    auth: { type: "header", name: "X-Api-Key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) Create an account at app.apexverify.com (signing up is free) and open “API Access” in the panel. 2) Click “ADD API "
      + "KEY”, give it a name (e.g. Conector) and copy it right away. 3) Each verification uses prepaid email or phone credits; "
      + "checking the balance costs nothing. Limit: 180 requests per minute.",
    test: { path: "/v1/account/credits",
              message: (d) => `${d?.email_credit ?? "?"} email credits and ${d?.phone_credit ?? "?"} phone credits` },
    examples: "Examples: GET /v1/account/credits, POST /v1/unit {\"type\": \"email\", \"target_country\": \"US\", \"unit\": "
      + "\"name@example.com\"} (uses credits and takes up to 5 s; type also accepts “phone”), GET /v1/batch?limit=20, "
      + "GET /v1/batch/{batch_uuid}, GET /v1/batch/{batch_uuid}/details, GET /v1/batch/{batch_uuid}/export?format=json. "
      + "Batches are uploaded as a TXT file (multipart) from the panel and started with POST /v1/batch/{batch_uuid}.",
  },
  {
    id: "apininjas", name: "API Ninjas", category: "data",
    description: "120+ data APIs: weather, finance, validation and more",
    website: "https://api-ninjas.com", docs: "https://api-ninjas.com/api", logo: { favicon: "https://api-ninjas.com" },
    baseUrl: "https://api.api-ninjas.com",
    auth: { type: "header", name: "X-Api-Key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://api-ninjas.com/profile",
    help: "1) Sign up for free at api-ninjas.com (no card) and copy your API key from your profile (api-ninjas.com/profile): "
      + "one key works for all the APIs. 2) The free plan has a monthly quota and does not allow commercial use; some parameters and "
      + "some APIs are paid only (“Premium only”). 3) Once the quota runs out, requests are rejected, with no extra charges.",
    test: { path: "/v2/randomword", message: "API key is valid" },
    examples: "The version is in the path: most are /v1 and the newer ones /v2 (check each API's documentation). Examples: "
      + "GET /v2/randomword, GET /v1/weather?city=London, GET /v1/exchangerate?pair=EUR_USD, GET /v1/dnslookup?domain=example.com, "
      + "GET /v1/validateemail?email=name@example.com, GET /v1/geocoding?city=London&country=GB, GET /v1/stockprice?ticker=AAPL.",
  },
  {
    id: "apisports", name: "API-Sports", category: "data",
    description: "Sports data: football (soccer), basketball, F1, NBA and more",
    website: "https://api-sports.io", docs: "https://api-sports.io/documentation/football/v3", logo: { favicon: "https://api-sports.io" },
    baseUrl: "https://v3.football.api-sports.io",
    allowedOrigins: ["https://v1.basketball.api-sports.io", "https://v2.nba.api-sports.io", "https://v1.baseball.api-sports.io",
               "https://v1.hockey.api-sports.io", "https://v1.rugby.api-sports.io", "https://v1.handball.api-sports.io",
               "https://v1.volleyball.api-sports.io", "https://v1.afl.api-sports.io", "https://v1.formula-1.api-sports.io",
               "https://v1.mma.api-sports.io"],
    auth: { type: "header", name: "x-apisports-key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://dashboard.api-football.com/profile?access=1",
    help: "1) Sign up for free at dashboard.api-football.com (no card). 2) In the panel open “My Access” and copy your API key: "
      + "it works for all API-Sports sports, each with its own subscription and daily quota (the free plan allows 100 requests "
      + "per day per API). 3) With the free plan some seasons and endpoints are not available.",
    test: { path: "/status", message: (d) => {
      const r = d?.response;
      return r?.requests ? `Plan ${r.subscription?.plan ?? "?"}: ${r.requests.current} of ${r.requests.limit_day} requests today`
        : "API key is valid";
    } },
    examples: "One host per sport with the same key. Football (base): GET /status (account, plan and usage), "
      + "GET /fixtures?league=140&season=2025&date=2026-02-01, GET /standings?league=140&season=2025, GET /teams?league=140&season=2025. "
      + "Other sports (full URL): GET https://v1.basketball.api-sports.io/games?date=2026-02-01, and the hosts v2.nba, v1.baseball, "
      + "v1.hockey, v1.rugby, v1.handball, v1.volleyball, v1.afl, v1.formula-1 and v1.mma (.api-sports.io). "
      + "Responses include “errors”, “results” and “response”.",
  },
  {
    id: "autom", name: "Autom", category: "data",
    description: "Google, Bing and Brave search results as JSON, via API",
    website: "https://www.autom.dev", docs: "https://docs.autom.dev", logo: { favicon: "https://www.autom.dev" },
    baseUrl: "https://api.autom.dev/v1",
    auth: { type: "header", name: "x-api-key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) Sign up at app.autom.dev and open the panel. 2) In “API Keys” click “New”, give it an alias (and, if you want, quotas and "
      + "an expiry) and copy it: it is shown only once. 3) Each search uses 1 credit (3 for Google's AI mode); checking usage "
      + "is free. A 402 means no credits are left.",
    test: { path: "/usage",
              message: (d) => (d?.remaining != null ? `${d.remaining} calls remaining` : "API key is valid") },
    examples: "Examples: GET /usage (remaining credits, free), GET /google/search?query=cybersecurity&gl=us&hl=en&page=1 (1 credit), "
      + "GET /google/news?query=…, GET /bing/search?query=…, GET /brave/search?query=…, GET /finder/google-countries (free). "
      + "With is_async=true the response is a job_id that you can query at GET /jobs/{job_id}.",
  },
  {
    id: "baremetrics", name: "Baremetrics", category: "data",
    description: "Subscription analytics: MRR, churn, customers and plans",
    website: "https://baremetrics.com", docs: "https://developers.baremetrics.com/reference", logo: { simpleIcons: "baremetrics" },
    baseUrl: "https://{server}/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true },
             { id: "server", label: "Environment", default: "api.baremetrics.com",
               options: [["api.baremetrics.com", "Production"], ["api-sandbox.baremetrics.com", "Sandbox (test data)"]],
               help: "Each environment has its own key: the production key does not work in the sandbox." }],
    keyUrl: "https://app.baremetrics.com/settings/api",
    help: "1) Sign in to Baremetrics as an administrator and open “Settings” → “API” (app.baremetrics.com/settings/api). "
      + "2) Copy the API key for the environment you will use. 3) Data belongs to a “source” (source_id): look it up with "
      + "GET /sources.",
    test: { path: "/account", message: (d) => (d?.account?.default_currency?.id
      ? `Account connected (currency: ${String(d.account.default_currency.id).toUpperCase()})` : "API key is valid") },
    examples: "Almost everything belongs to a source (source_id, from GET /sources). Examples: GET /account, GET /sources, "
      + "GET /{source_id}/customers?per_page=50, GET /{source_id}/subscriptions, GET /{source_id}/plans, "
      + "GET /{source_id}/charges?start=2026-10-01&end=2026-10-15, GET /{source_id}/events, GET /users. "
      + "The metrics (MRR, churn…) are under /{source_id}/metrics: see the reference.",
  },
  {
    id: "beachdayapi", name: "Beach Day API", category: "data",
    description: "Beaches: conditions, scores, tides, rules and amenities",
    website: "https://beachdayapi.com", docs: "https://beachdayapi.com/en/docs/", logo: { favicon: "https://beachdayapi.com" },
    baseUrl: "https://beachdayapi.com/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://beachdayapi.com/en/dashboard/",
    help: "1) Create a free account at beachdayapi.com (50 free credits, no card). 2) Open your “Dashboard” and copy "
      + "the API key. 3) Each call costs credits (1 to list beaches or countries, 3 for conditions, 5 for a beach's details, 10 for "
      + "the score ranking); the connection test uses 1.",
    test: { path: "/countries/", message: "API key is valid" },
    examples: "Paths end in “/”. Examples: GET /countries/, GET /beaches/?search=…&limit=20, "
      + "GET /beaches/{id}/ (details with the latest conditions, rules and amenities), GET /beaches/{id}/conditions/?limit=7, "
      + "GET /beaches/{id}/rules/, GET /beaches/{id}/amenities/, GET /beaches/scored/?limit=20 (ranking by score), "
      + "GET /tides/{beach_id}/ (7-day tides), GET /health/ (no key).",
  },
  {
    id: "beaconchain", name: "beaconcha.in", category: "data",
    description: "Ethereum explorer: validators, epochs, blocks and queues",
    website: "https://beaconcha.in", docs: "https://docs.beaconcha.in", logo: { favicon: "https://docs.beaconcha.in" },
    baseUrl: "https://beaconcha.in/api",
    auth: [{ type: "bearer" }, { type: "header", name: "apikey" }],
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://beaconcha.in/user/api-key-management",
    help: "1) Sign up at beaconcha.in and sign in. 2) Open beaconcha.in/user/api-key-management, create an API key and "
      + "copy it. 3) The free trial lasts 30 days (1,000 requests, 1 per second); after that you need a paid plan (from "
      + "€59/month billed annually). The “Pro” features (BeaconScore, entities) require the Scale plan or higher.",
    test: { method: "POST", path: "/v2/ethereum/state", body: { chain: "mainnet" },
              message: (d) => (d?.data?.current_epoch != null ? `Current mainnet epoch: ${d.data.current_epoch}`
                : "API key is valid") },
    examples: "The V2 API uses POST with a JSON body and “chain” (mainnet or hoodi). Examples: POST /v2/ethereum/state {\"chain\": \"mainnet\"}, "
      + "POST /v2/ethereum/epoch {\"chain\": \"mainnet\", \"epoch\": {\"view\": \"latest\"}}, "
      + "POST /v2/ethereum/queues {\"chain\": \"mainnet\"}, "
      + "POST /v2/ethereum/validators {\"chain\": \"mainnet\", \"validator\": {\"validator_identifiers\": [1, 2]}}. "
      + "V1 (GET, no new features): GET /v1/epoch/latest, GET /v1/validator/{index}.",
  },
  {
    id: "bigdatacloud", name: "BigDataCloud", category: "data",
    description: "IP geolocation, reverse geocoding and validation",
    website: "https://www.bigdatacloud.com", docs: "https://www.bigdatacloud.com/docs", logo: { favicon: "https://www.bigdatacloud.com" },
    baseUrl: "https://api-bdc.net",
    auth: { type: "header", name: "x-bdc-key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) Create a free account at bigdatacloud.com (no card; disposable emails are not accepted). 2) Copy the key from your "
      + "panel, under “Account” → “Credentials”: it can take up to 10 minutes to propagate. 3) The free plan comes with a monthly "
      + "query quota; when it runs out the API responds 402. All plans see the same endpoints.",
    test: { path: "/data/country-info", query: { code: "us", localityLanguage: "en" }, message: "API key is valid" },
    examples: "Examples: GET /data/ip-geolocation?ip=8.8.8.8&localityLanguage=en, GET /data/ip-geolocation-full?ip=8.8.8.8 (with ASN and "
      + "risk), GET /data/reverse-geocode?latitude=40.4168&longitude=-3.7038&localityLanguage=en, "
      + "GET /data/timezone-by-location?latitude=40.4168&longitude=-3.7038, GET /data/email-verify?emailAddress=name@example.com, "
      + "GET /data/phone-number-validate?number=2025550123&countryCode=us.",
  },
  {
    id: "bigpictureio", name: "BigPicture.io", category: "data",
    description: "Company data by domain or IP: profile and technologies",
    website: "https://bigpicture.io", docs: "https://docs.bigpicture.io/api/", logo: { favicon: "https://bigpicture.io" },
    baseUrl: "https://company.bigpicture.io", allowedOrigins: ["https://ip.bigpicture.io"],
    auth: { type: "header", name: "Authorization" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://app.bigpicture.io",
    help: "1) Create a free account at app.bigpicture.io/signup. 2) In the panel copy your secret API key: it is sent as is "
      + "in the Authorization header, without “Bearer”. 3) Each query uses credits from your plan (the connection test runs a "
      + "company lookup). Since SavvyIQ acquired its technology, the APIs continue to work as normal.",
    test: { path: "/v1/companies/find", query: { domain: "bigpicture.io" }, message: "API key is valid" },
    examples: "Limit: 600 requests per minute. If the company is not in its database it responds 202: repeat the request after a few minutes. "
      + "Examples: GET /v1/companies/find?domain=uber.com, GET /v1/companies/find/stream?domain=uber.com (live lookup, 5 per minute), "
      + "GET https://ip.bigpicture.io/v1/companies/find?ip=8.8.8.8 (company that owns an IP).",
  },
  {
    id: "bitquery", name: "Bitquery", category: "data",
    description: "On-chain data from 40+ blockchains via GraphQL",
    website: "https://bitquery.io", docs: "https://docs.bitquery.io", logo: { favicon: "https://bitquery.io" },
    baseUrl: "https://streaming.bitquery.io", graphql: { path: "/graphql" },
    auth: { type: "custom", apply: async (c) => ({ headers: { Authorization: `Bearer ${await getBitqueryToken(c)}` } }) },
    fields: [{ id: "token", label: "Access token (ory_at_…)", secret: true, optional: true,
               help: "If you fill it in, it is used instead of the Client ID and secret. It expires according to the application." },
             { id: "client_id", label: "Application Client ID", optional: true },
             { id: "client_secret", label: "Application Client secret", secret: true, optional: true }],
    keyUrl: "https://account.bitquery.io/user/api_v2/applications",
    help: "1) Sign in at account.bitquery.io and open “Authorization” → “Applications” → “+ New Application”; choose how long its "
      + "tokens last. 2) Copy its Client ID and its Client secret (recommended: Conector requests new tokens automatically when they expire) or, under "
      + "“Authorization” → “Tokens”, generate an access token (ory_at_…) and paste it. Without an application, the IDE token changes every "
      + "12 hours. 3) Queries use points from your plan (there is a free trial with points).",
    test: { method: "POST", path: "/graphql", body: { query: "{ __typename }" }, message: "Credentials are valid" },
    examples: "The API is GraphQL (POST /graphql): use bitquery_graphql. The query starts with the chain (EVM with network: eth, bsc…, "
      + "Solana, Tron, Bitcoin…). Examples: { EVM(network: eth) { Blocks(limit: {count: 1}, orderBy: {descending: Block_Number}) "
      + "{ Block { Number Time } } } }, { EVM(network: eth) { DEXTrades(limit: {count: 5}, orderBy: {descending: Block_Time}) "
      + "{ Block { Time } Trade { Buy { Amount Currency { Symbol } } Sell { Amount Currency { Symbol } } } } } }.",
  },
  {
    id: "brightdata", name: "Bright Data", category: "data",
    description: "Web scraping and unblocking: scrapers, SERP and Web Unlocker",
    website: "https://brightdata.com", docs: "https://docs.brightdata.com", logo: { favicon: "https://brightdata.com" },
    baseUrl: "https://api.brightdata.com",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://brightdata.com/cp/setting/users",
    help: "1) As an administrator, sign in to the Bright Data panel and open “Account settings” (brightdata.com/cp/setting/users). "
      + "2) Click “Add API key”, choose the user, the permissions and the expiry, and save it: it is shown only once. 3) New "
      + "accounts get 5,000 free credits per month; everything else is pay-as-you-go. Web Unlocker, SERP and Browser need a “zone” "
      + "created beforehand in the panel. To list zones the key needs admin or Ops permissions.",
    test: { path: "/zone/get_active_zones", acceptStatus: [403],
              message: (d) => list(d, "active zone", "active zones", "API key is valid (no permission to list zones)") },
    examples: "Examples: GET /zone/get_active_zones, GET /customer/balance (balance), "
      + "POST /request {\"zone\": \"my_zone\", \"url\": \"https://example.com\", \"format\": \"raw\"} (Web Unlocker or SERP, depending on the "
      + "zone type), POST /datasets/v3/scrape?dataset_id=gd_… {\"input\": [{\"url\": \"https://…\"}]} (synchronous scraper), "
      + "POST /datasets/v3/trigger?dataset_id=gd_… (asynchronous batch: returns a snapshot_id), GET /datasets/v3/progress/{snapshot_id}, "
      + "GET /datasets/v3/snapshot/{snapshot_id}?format=json.",
  },
  {
    id: "browseai", name: "Browse AI", category: "data",
    description: "No-code robots that extract and monitor website data",
    website: "https://www.browse.ai", docs: "https://docs.browse.ai/api/", logo: { favicon: "https://www.browse.ai" },
    baseUrl: "https://api.browse.ai/v2",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://dashboard.browse.ai/api",
    help: "1) Sign in at dashboard.browse.ai and open dashboard.browse.ai/api. 2) Click the button to create an API key, give it "
      + "a name and copy it. 3) Each task a robot runs uses credits from your plan; the documentation does not state a minimum plan "
      + "for using the API.",
    test: { path: "/status", message: "API key is valid" },
    examples: "Examples: GET /status, GET /robots, GET /robots/{robotId}, GET /robots/{robotId}/tasks, "
      + "POST /robots/{robotId}/tasks {\"inputParameters\": {\"originUrl\": \"https://…\"}} (runs a task and uses credits), "
      + "GET /robots/{robotId}/tasks/{taskId} (status and extracted data).",
  },
  {
    id: "builtwith", name: "BuiltWith", category: "data",
    description: "Technologies of any website: profiles, lists and relationships",
    website: "https://builtwith.com", docs: "https://api.builtwith.com", logo: { favicon: "https://builtwith.com" },
    baseUrl: "https://api.builtwith.com",
    auth: { type: "header", name: "Authorization", prefix: "API " },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://api.builtwith.com",
    help: "1) Sign up at builtwith.com and sign in at api.builtwith.com: your API key appears on the pages of the "
      + "documentation. 2) It is sent in the “Authorization: API <key>” header. 3) Queries use credits from your plan; WhoAmI, "
      + "Usage, Trends and the free API do not.",
    test: { path: "/whoamiv1/api.json", account: (d) => d?.account?.email,
              validate: (d) => { if (d?.Errors?.length) throw new Error(`BuiltWith: ${d.Errors[0]?.Message || "invalid key"}`); } },
    examples: "The version is in the path and failures arrive as 200 with “Errors”. Examples: GET /whoamiv1/api.json (account and limits, "
      + "free), GET /usagev2/api.json (credits), GET /v26/api.json?LOOKUP=example.com (technologies of a domain), "
      + "GET /lists13/api.json?TECH=Shopify&COUNTRY=US (sites that use it), GET /trends/v6/api.json?TECH=Shopify (free), "
      + "GET /free1/api.json?LOOKUP=example.com (free summary), GET /rv5/api.json?LOOKUP=example.com (relationships between sites).",
  },
  {
    id: "byteforms", name: "ByteForms", category: "productivity",
    description: "Online forms: forms and received responses",
    website: "https://forms.bytesuite.io", docs: "https://forms.bytesuite.io/docs/api", logo: { favicon: "https://forms.bytesuite.io" },
    baseUrl: "https://api.forms.bytesuite.io/api",
    auth: { type: "header", name: "Authorization" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://forms.bytesuite.io/profile?tab=account&action=new_api_key",
    help: "1) Sign in at forms.bytesuite.io. 2) Open your profile, “Account” tab (forms.bytesuite.io/profile?tab=account"
      + "&action=new_api_key), and create an API key with a name: you can have several. 3) Copy it: it is sent as is in the "
      + "Authorization header, without “Bearer”. The documentation does not state a minimum plan.",
    test: { path: "/form", message: (d) => list(d?.data, "form", "forms", "API key is valid") },
    examples: "Responses come as {data, status} and errors as {message, status}. Examples: GET /form (all your "
      + "forms), GET /form/{formId}, GET /form/responses/{formId}?limit=50&order=desc (responses; pagination with the cursors "
      + "after and before, and search with query).",
  },
  {
    id: "cabinpanda", name: "CabinPanda", category: "productivity",
    description: "Online forms: forms, submissions and integrations",
    website: "https://www.cabinpanda.com", docs: "https://api.cabinpanda.com/docs/", logo: { favicon: "https://www.cabinpanda.com" },
    baseUrl: "https://api.cabinpanda.com/api/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API token", secret: true }],
    help: "1) Sign in at console.cabinpanda.com. 2) Open your profile (“Profile”) → “API” tab, give the token a name "
      + "and create it. 3) Copy it right away: it is not shown again. It acts with your user's permissions and the documentation does not state "
      + "a minimum plan.",
    test: { path: "/forms", query: { per_page: 1 }, message: "Token is valid" },
    examples: "Each form is identified by its “key” (32 hexadecimal characters). Examples: GET /forms?page=1&per_page=20, "
      + "GET /forms/{key}, GET /forms/{key}/submissions?page=1&per_page=50&start=2026-10-01&finish=2026-10-15, GET /profile "
      + "(account, plan and usage), GET /integrations, GET /team-members.",
  },
  {
    id: "carsxe", name: "CarsXE", category: "data",
    description: "Vehicle data: VIN, license plates, recalls and value",
    website: "https://carsxe.com", docs: "https://docs.carsxe.com/docs", logo: { favicon: "https://carsxe.com" },
    baseUrl: "https://api.carsxe.com",
    auth: { type: "query", name: "key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://carsxe.com/dashboard/developer",
    help: "1) Create an account at carsxe.com (the Sandbox plan is free) and sign in. 2) Open the developer panel "
      + "(carsxe.com/dashboard/developer) and copy your API key. 3) Each query uses quota from your plan (the connection test "
      + "decodes a sample VIN: 1 query); some services, such as history or market value, are on paid plans.",
    test: { path: "/specs", query: { vin: "1HGCM82633A004352" }, message: "API key is valid" },
    examples: "Examples: GET /specs?vin=… (decodes a VIN), GET /v2/platedecoder?plate=7XER187&country=US&state=CA (license plate to "
      + "vehicle), GET /v1/international-vin-decoder?vin=…, GET /v1/recalls?vin=… (recalls), GET /history?vin=…, "
      + "GET /v2/marketvalue?vin=…, GET /obdcodesdecoder?code=P0115. From Europe, the international paths accept the /eu prefix.",
  },
  {
    id: "censusbureau", name: "Census Bureau (US)", category: "data",
    description: "Official US statistics: demographics and economy",
    website: "https://www.census.gov", docs: "https://www.census.gov/data/developers/data-sets.html",
    logo: { favicon: "https://www.census.gov" },
    baseUrl: "https://api.census.gov/data",
    auth: { type: "query", name: "key" },
    fields: [{ id: "token", label: "API key (40 characters)", secret: true }],
    keyUrl: "https://api.census.gov/data/key_signup.html",
    help: "1) Request the free key at api.census.gov/data/key_signup.html (organization and email): it arrives by email and you must "
      + "activate it with the link in the message. 2) Paste it here. 3) There are no paid plans. With an incorrect or inactive key, the API "
      + "returns an HTML “Invalid Key” page instead of JSON.",
    test: { path: "/2020/dec/pl", query: { get: "NAME", for: "state:01" }, message: "API key is valid",
              validate: (d) => {
                if (!Array.isArray(d)) throw new Error("The Census Bureau does not accept the key (did you activate it with the link in the email?)");
              } },
    examples: "Data comes as an array (the first row holds the column names). Examples: "
      + "GET /2022/acs/acs5?get=NAME,B01003_001E&for=state:* (population by state), "
      + "GET /2020/dec/pl?get=NAME,P1_001N&for=county:*&in=state:06 (2020 census by county), "
      + "GET /2022/acs/acs5/variables.json (available variables), GET /2022/acs/acs5/geography.json, "
      + "GET https://api.census.gov/data.json (catalog of all datasets).",
  },
];
