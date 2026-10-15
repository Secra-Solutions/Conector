// Batch 14 of the catalog (data, analytics and web scraping): Melo, Metabase, Microsoft Clarity, Minerstat, Modem, Mopinion,
// More Trees, MrScraper, NamSor, NASA, Neo4j, Neutrino, NextDNS, Ninox, OData, Olostep, OpenRegister, OpenAlex, OpenCage,
// OpenGraph.io, OpenWeather, OpenWeb Ninja, Parallel and ParseHub.
import crypto from "node:crypto";

// Mopinion signs every request: X-Auth-Token = base64("public_key:" + HMAC-SHA256(signature_token, "/path|body")), in hexadecimal.
// Query parameters are not signed; the body only counts for POST/PUT (the JSON text exactly as sent).
function signMopinion({ url, headers: requestHeaders, body: requestBody, cred }) {
  const message = `${url.pathname}|${typeof requestBody === "string" ? requestBody : ""}`;
  const signature = crypto.createHmac("sha256", cred.token).update(message).digest("hex");
  requestHeaders["X-Auth-Token"] = Buffer.from(`${cred.public_key}:${signature}`).toString("base64");
}

// ParseHub expects api_key in the query (GET/DELETE) and in the form body (POST): it is always sent in the query and also
// inside the form when the request has one.
function parseHubKey({ url, body: requestBody, cred }) {
  url.searchParams.set("api_key", cred.token);
  if (requestBody instanceof URLSearchParams) requestBody.set("api_key", cred.token);
}

export default [
  {
    id: "melo", name: "Melo", category: "data", description: "Real-time French property listings and market indicators",
    website: "https://www.melo.io", docs: "https://docs.stream.estate", logo: { favicon: "https://www.melo.io" },
    baseUrl: "https://api.stream.estate",
    auth: { type: "header", name: "X-API-KEY" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://stream.estate/console",
    help: "1) Sign in to the API console (stream.estate/console); if you do not have an account, sign up at stream.estate/signup. "
      + "2) Open the “API Keys” page and create a key. 3) Copy it. The documentation and the API console for Melo use the name "
      + "“Stream Estate”.",
    test: { path: "/searches", message: "API key is valid" },
    examples: "Examples: GET /documents/properties?transactionType=0&propertyTypes[]=1&includedZipcodes[]=75011&itemsPerPage=20 "
      + "(houses for sale; transactionType 0 = sale, 1 = rent), GET /documents/properties/{id}, "
      + "GET /indicators/price_per_meter?transactionType=0&includedZipcodes[]=75011&aggregationInterval=month, "
      + "GET /public/location-autocomplete?query=Lyon, GET /searches (saved searches).",
  },
  {
    id: "metabase", name: "Metabase", category: "data", description: "Metabase questions, dashboards, collections and SQL queries",
    website: "https://www.metabase.com", docs: "https://www.metabase.com/docs/latest/api-documentation", logo: { simpleIcons: "metabase" },
    baseUrl: "{url}/api",
    auth: { type: "header", name: "X-API-KEY" },
    fields: [{ id: "url", label: "Your Metabase URL", format: "url",
               help: "e.g. https://example.metabaseapp.com or https://metabase.example.com (without /api)." },
             { id: "token", label: "API key", secret: true }],
    help: "1) In Metabase, sign in as an administrator and open “Admin settings” → “Authentication” "
      + "→ “API keys”. 2) Click “Create API key”, name it and choose the permission group: the key will only see what that "
      + "group can see. 3) Copy the key: it is shown only once. The URL is the one for your installation "
      + "(Metabase Cloud: https://<name>.metabaseapp.com). Requires Metabase 0.47 or later.",
    test: { path: "/user/current", account: (d) => d.email || d.common_name },
    examples: "Examples: GET /database, GET /collection, GET /card, GET /dashboard/{id}, POST /card/{id}/query, "
      + "POST /dataset {\"database\": 1, \"type\": \"native\", \"native\": {\"query\": \"SELECT 1\"}}.",
  },
  {
    id: "microsoftclarity", name: "Microsoft Clarity", category: "data",
    description: "Web behavior data exported from Clarity",
    website: "https://clarity.microsoft.com", docs: "https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-data-export-api",
    logo: { favicon: "https://clarity.microsoft.com" },
    baseUrl: "https://www.clarity.ms/export-data/api/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "Data export API token", secret: true }],
    help: "1) Sign in at clarity.microsoft.com and open your project (you must be a project administrator). 2) Go to “Settings” → "
      + "“Data Export” and click “Generate new API token”. 3) Name it (4 to 32 characters, no spaces) and copy the token: "
      + "it belongs to a single project. Microsoft limit: 10 requests per day per project (the connection test uses one).",
    test: { path: "/project-live-insights", query: { numOfDays: 1 }, acceptStatus: [429], message: "Token is valid" },
    examples: "There is only one endpoint (max. 10 requests per day per project, data from the last 24–72 h, 1,000 rows): "
      + "GET /project-live-insights?numOfDays=3, GET /project-live-insights?numOfDays=1&dimension1=Device&dimension2=Browser "
      + "(up to 3 dimensions: Browser, Device, Country/Region, OS, Source, Medium, Campaign, Channel, URL).",
  },
  {
    id: "minerstat", name: "Minerstat", category: "data", description: "Crypto mining coins, hardware, algorithms and pools",
    website: "https://minerstat.com", docs: "https://minerstat.com/api-docs", logo: { favicon: "https://minerstat.com" },
    baseUrl: "https://api.minerstat.com",
    auth: { type: "header", name: "X-Api-Key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://minerstat.com/developers",
    help: "1) Open minerstat.com/developers (developer portal) and sign in or sign up with just your email. "
      + "2) Create a free API key. 3) Copy it. On the free plan, responses are limited to 20 rows and "
      + "/v3/profitability is only available on the Enterprise plan.",
    test: { path: "/v3/algorithms", query: { limit: 1 }, message: "API key is valid" },
    examples: "Examples: GET /v3/coins?limit=20, GET /v3/coins/{slug}, GET /v3/coins/{slug}/history, GET /v3/hardware?limit=20, "
      + "GET /v3/algorithms, GET /v3/pools. The /v2/* endpoints are the old version and will be retired on December 31, 2026.",
  },
  {
    id: "modem", name: "Modem", category: "data", description: "Customer feedback: topics, people and companies",
    website: "https://modem.ai", docs: "https://modem.ai/docs", logo: { favicon: "https://modem.ai" },
    baseUrl: "https://api.modem.dev/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key (modem_…)", secret: true }],
    keyUrl: "https://app.modem.dev/org/settings/api-keys",
    help: "1) Sign in to Modem (app.modem.dev) and open your organization settings → “API keys” "
      + "(app.modem.dev/org/settings/api-keys); you need permission to create keys (administrator or owner). 2) Create a "
      + "key, choose its expiration and copy it right then: it is shown only once and starts with modem_. 3) Each key belongs to "
      + "a single organization. Modem's “Public Keys” are different (they are used to send feedback with the Ingest API) and do not "
      + "work here.",
    test: { path: "/whoami", account: (d) => d.organization?.name },
    examples: "Examples: GET /topics?search=billing&sortBy=priority&sortOrder=desc&limit=20, GET /topics/{topicId}, "
      + "GET /topics/{topicId}/people, GET /people?search=…, GET /companies, GET /channels, "
      + "POST /companies {\"companies\": [{\"domain\": \"acme.example\", \"name\": \"Acme\"}]}. "
      + "Full specification: https://api.modem.dev/v1/openapi.json.",
  },
  {
    id: "mopinion", name: "Mopinion", category: "data", description: "Website and app user feedback: datasets and reports",
    website: "https://mopinion.com", docs: "https://developer.mopinion.com/api/", logo: { favicon: "https://mopinion.com" },
    baseUrl: "https://api.mopinion.com",
    auth: { type: "signature", sign: signMopinion },
    fields: [{ id: "public_key", label: "Public key" },
             { id: "token", label: "Signature token", secret: true }],
    help: "1) In Mopinion open “Integrations” → “Feedback API” (your plan must include API access). 2) Click “Create API "
      + "connection” (or “New API integration” if you already have one), name it and its credentials will be shown. 3) Copy the "
      + "“Public key” and the “Signature token” (the private key is not needed). Conector signs each request with HMAC-SHA256, "
      + "as Mopinion requires.",
    test: { path: "/account", account: (d) => d.name },
    examples: "Examples: GET /account, GET /deployments, GET /datasets, GET /datasets/{id}/fields, "
      + "GET /datasets/{id}/feedback?limit=20, GET /reports.",
  },
  {
    id: "moretrees", name: "More Trees", category: "data", description: "Tree planting and CO2 offsetting with credits",
    website: "https://moretrees.eco", docs: "https://moretrees.eco/learn/user-guides/api",
    logo: { favicon: "https://platform.moretrees.eco" },
    baseUrl: "https://user-management-service.platform.moretrees.eco",
    allowedOrigins: ["^https://(user|project|transaction)-management-service\\.platform\\.moretrees\\.eco$"],
    auth: { type: "header", name: "X-API-KEY" },
    fields: [{ id: "token", label: "API key", secret: true },
             { id: "code", label: "Account code", format: "segment",
               help: "Up to 6 characters; it appears next to the API key in “Settings” → “Account Settings”." }],
    keyUrl: "https://platform.moretrees.eco/settings/?tab=account-settings",
    help: "1) Sign in to the More Trees platform (platform.moretrees.eco). 2) Go to “Settings” → “Account "
      + "Settings” and copy the key from the “API Key” section and the account code (they are also shown there, along with the “forest "
      + "slug”). 3) Each tree planted uses account credits: use \"test\": true when testing.",
    test: { path: "/user-management-api/external/accounts/{code}",
              message: (d) => (d?.account_name ? `Account ${d.account_name} · ${d.credit_balance ?? 0} credits` : "API key is valid") },
    examples: "Examples (each service has its own server): "
      + "GET /user-management-api/external/accounts/{account_code} (name, credit balance and forest), "
      + "GET /user-management-api/external/forest/{slug_or_code}, "
      + "GET https://project-management-service.platform.moretrees.eco/project-management-api/external/projects, "
      + "POST https://transaction-management-service.platform.moretrees.eco/transaction-management-api/external/plant "
      + "{\"payment_account_code\": \"…\", \"plant_for_others\": false, \"quantity\": 1, \"test\": true} "
      + "(with test, nothing is planted).",
  },
  {
    id: "mrscraper", name: "MrScraper", category: "data", description: "AI web scraping: results, Markdown, JSON and screenshots",
    website: "https://mrscraper.com", docs: "https://docs.mrscraper.com", logo: { favicon: "https://mrscraper.com" },
    baseUrl: "https://api.app.mrscraper.com/api/v1", allowedOrigins: ["https://api.mrscraper.com"],
    auth: { type: "header", name: "x-api-token" },
    fields: [{ id: "token", label: "API token", secret: true }],
    keyUrl: "https://app.mrscraper.com/api-tokens",
    help: "1) Sign in at app.mrscraper.com (create an account if you do not have one). 2) Click your profile icon, top right, and "
      + "choose “API Tokens” (or go to app.mrscraper.com/api-tokens). 3) Click “New Token” and copy the token. Extractions "
      + "use tokens from your plan.",
    test: { path: "/subscription-accounts", account: (d) => d.data?.user?.email },
    examples: "Examples: GET /subscription-accounts (plan and usage), "
      + "GET /results?sortField=updatedAt&sortOrder=DESC&pageSize=10&page=1, "
      + "POST /scrapers-ai {\"url\": \"https://…\", \"prompt\": \"extract the title and price\", \"agent\": \"general\"}, "
      + "POST https://api.mrscraper.com/?markdown=true {\"url\": \"https://…\"} (direct Scraper API, a different server).",
  },
  {
    id: "namsor", name: "NamSor", category: "data", description: "Gender, origin and ethnicity from personal names",
    website: "https://namsor.app", docs: "https://namsor.app/api-documentation/", logo: { favicon: "https://namsor.app" },
    baseUrl: "https://v2.namsor.com/NamSorAPIv2",
    auth: { type: "header", name: "X-API-KEY" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://namsor.app/my-account/",
    help: "1) Create an account at namsor.app (the free plan includes 2,500 credits) and verify your email. 2) Open “My "
      + "account” (account information) and copy your API key. 3) Each name analyzed uses credits (the connection test "
      + "uses 1); the administration paths (apiUsage, apiStatus) are free.",
    test: { path: "/api2/json/gender/Jane/Doe", message: "API key is valid" },
    examples: "Examples: GET /api2/json/gender/{firstName}/{lastName}, "
      + "GET /api2/json/genderGeo/{firstName}/{lastName}/{countryIso2}, GET /api2/json/origin/{firstName}/{lastName}, "
      + "GET /api2/json/diaspora/{countryIso2}/{firstName}/{lastName}, GET /api2/json/apiUsage (credits used; free).",
  },
  {
    id: "nasa", name: "NASA", category: "data", description: "Picture of the day, asteroids, space weather and more NASA data",
    website: "https://api.nasa.gov", docs: "https://api.nasa.gov", logo: { simpleIcons: "nasa" },
    baseUrl: "https://api.nasa.gov",
    auth: { type: "query", name: "api_key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://api.nasa.gov",
    help: "1) Open api.nasa.gov and fill in the “Generate API Key” form (name and email). 2) The key is shown "
      + "immediately and is also sent by email. Do not use the demo key “DEMO_KEY”: it has very low limits. 3) Each "
      + "key allows 1,000 requests per hour.",
    test: { path: "/planetary/apod", message: "API key is valid" },
    examples: "Examples: GET /planetary/apod?date=2026-01-01 (astronomy picture of the day), "
      + "GET /neo/rest/v1/feed?start_date=2026-01-01&end_date=2026-01-07 (near-Earth asteroids), "
      + "GET /DONKI/FLR?startDate=2026-01-01 (solar flares), GET /EPIC/api/natural (images of Earth).",
  },
  {
    id: "neo4j", name: "Neo4j", category: "data", description: "Cypher queries on graph databases (Query API)",
    website: "https://neo4j.com", docs: "https://neo4j.com/docs/query-api/current/", logo: { simpleIcons: "neo4j" },
    baseUrl: "{url}/db/{database}",
    auth: { type: "basic", usernameField: "username", passwordField: "key" },
    fields: [{ id: "url", label: "Your Neo4j instance URL", format: "url",
               help: "e.g. https://abc12345.databases.neo4j.io (Aura) or https://myserver:7473 (self-hosted), without /db." },
             { id: "database", label: "Database", format: "segment", default: "neo4j",
               help: "Usually “neo4j”; on some Aura instances it matches the instance ID." },
             { id: "username", label: "Username", default: "neo4j" },
             { id: "key", label: "Password", secret: true }],
    help: "1) In Neo4j Aura (console.neo4j.io) open your instance and copy the “Connection URI”, changing neo4j+s:// to https:// "
      + "(e.g. https://abc12345.databases.neo4j.io); for a self-hosted install use https://server:7473 (or "
      + "http://localhost:7474 if Neo4j runs on the same server). 2) Username and password: on Aura, the user neo4j and the password "
      + "shown when the instance was created (if you lost it, reset it from the console); on a self-hosted install, a user with "
      + "permissions on the database. 3) The Query API is used; Aura has it enabled, and on self-hosted installs it is available from "
      + "Neo4j 5.19 (before 5.25 you must enable it with server.http_enabled_modules=QUERY_API_ENDPOINTS).",
    test: { method: "POST", path: "/query/v2", body: { statement: "RETURN 1 AS ok" }, message: "Connection successful" },
    examples: "Examples (Query API; the statement goes on a single line and queries with errors return 202 with “errors”): "
      + "POST /query/v2 {\"statement\": \"MATCH (n) RETURN n LIMIT 5\"}, "
      + "POST /query/v2 {\"statement\": \"MATCH (p:Person {name: $name}) RETURN p\", \"parameters\": {\"name\": \"…\"}}, "
      + "POST /query/v2 {\"statement\": \"CALL db.labels()\"}. The response includes data.fields and data.values.",
  },
  {
    id: "neutrino", name: "Neutrino API", category: "data", description: "Data validation, IP geolocation and security",
    website: "https://www.neutrinoapi.com", docs: "https://www.neutrinoapi.com/api/api-basics/",
    logo: { favicon: "https://www.neutrinoapi.com" },
    baseUrl: "https://neutrinoapi.net",
    auth: [{ type: "header", name: "user-id", field: "userid" }, { type: "header", name: "api-key" }],
    fields: [{ id: "userid", label: "User ID" }, { id: "token", label: "API key", secret: true }],
    keyUrl: "https://www.neutrinoapi.com/account/keys/",
    help: "1) Create an account at neutrinoapi.com (there is a free plan with limited calls) and sign in. 2) Open "
      + "“Account” → “API Keys” (neutrinoapi.com/account/keys). 3) Copy your “User ID” and your “API Key”; if you do not have a key, "
      + "create one.",
    test: { path: "/ip-info", acceptStatus: [400], message: "Credentials are valid" },
    examples: "Examples: GET /ip-info?ip=8.8.8.8, GET /email-validate?email=…&fix-typos=true, "
      + "GET /phone-validate?number=…&country-code=US, GET /geocode-address?address=1600 Pennsylvania Ave NW, Washington, "
      + "GET /host-reputation?host=example.com.",
  },
  {
    id: "nextdns", name: "NextDNS", category: "security", description: "DNS profiles, blocklists, analytics and logs",
    website: "https://nextdns.io", docs: "https://nextdns.github.io/api/", logo: { simpleIcons: "nextdns" },
    baseUrl: "https://api.nextdns.io",
    auth: { type: "header", name: "X-Api-Key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://my.nextdns.io/account",
    help: "1) Sign in at my.nextdns.io. 2) Open “Account” (my.nextdns.io/account) and scroll to the bottom of the page, to "
      + "the “API” section. 3) Copy the API key. It covers the whole account: it gives access to all profiles.",
    test: { path: "/profiles", message: (d) => `API key is valid · ${d?.data?.length ?? 0} profile(s)` },
    examples: "Examples: GET /profiles, GET /profiles/{id}, GET /profiles/{id}/analytics/status, "
      + "GET /profiles/{id}/analytics/domains?limit=10, GET /profiles/{id}/logs?limit=50, GET /profiles/{id}/denylist, "
      + "POST /profiles/{id}/denylist {\"id\": \"example.com\", \"active\": true}.",
  },
  {
    id: "ninox", name: "Ninox", category: "data", description: "Ninox Cloud teams, databases, tables and records",
    website: "https://ninox.com", docs: "https://forum.ninox.com/t/35yzp89/api-endpoints-for-public-cloud",
    logo: { favicon: "https://ninox.com" },
    baseUrl: "https://api.ninox.com/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) Sign in to Ninox Cloud as the team “Owner” and, inside the app itself, open “Settings” → "
      + "“Integrations” → “API”. 2) Create an API key and copy it. Do not use the old page "
      + "user.ninox.com/account/api: its keys return an empty list of teams. 3) This connector uses the classic public API of "
      + "Ninox Cloud (api.ninox.com/v1, Ninox 3); the workspace keys of Ninox 4 (go.ninox.com) are different and do not "
      + "work here.",
    test: { path: "/teams", account: (d) => (Array.isArray(d) ? d.map((t) => t.name).join(", ") : null) },
    examples: "Examples: GET /teams, GET /teams/{teamId}/databases, GET /teams/{teamId}/databases/{dbId}/tables, "
      + "GET /teams/{teamId}/databases/{dbId}/tables/{tableId}/records?perPage=50, "
      + "POST /teams/{teamId}/databases/{dbId}/tables/{tableId}/records [{\"fields\": {\"Name\": \"…\"}}].",
  },
  {
    id: "odata", name: "OData", category: "data", description: "Any OData V2 service: metadata and entity sets",
    website: "https://www.odata.org", docs: "https://www.odata.org/documentation/", logo: { image: "https://github.com/OData.png" },
    baseUrl: "{url}",
    auth: { type: "basic", usernameField: "username", passwordField: "key" },
    fields: [{ id: "url", label: "OData service root URL", format: "url",
               help: "e.g. https://server/sap/opu/odata/sap/ZSERVICE_SRV (without /$metadata or parameters)." },
             { id: "username", label: "Username" },
             { id: "key", label: "Password", secret: true }],
    help: "1) Ask whoever administers the service for the root URL of the OData V2 service (the one that ends in the service name, "
      + "e.g. .../Northwind.svc or .../ZSERVICE_SRV) and a user with read permission. 2) Paste it without /$metadata or "
      + "parameters, together with the username and password (basic authentication). 3) The service must be reachable over HTTPS "
      + "from this server.",
    test: { path: "/$metadata", headers: { Accept: "application/xml" }, message: "Service is reachable" },
    examples: "Examples: GET /$metadata (data model in XML), GET /?$format=json (list of entity sets), "
      + "GET /Products?$top=10&$format=json, GET /Products(1)?$format=json, "
      + "GET /Products?$filter=Price gt 10&$select=Name,Price&$orderby=Name&$format=json.",
  },
  {
    id: "olostep", name: "Olostep", category: "data", description: "Web scraping, crawling, search and structured extraction",
    website: "https://www.olostep.com", docs: "https://docs.olostep.com", logo: { favicon: "https://www.olostep.com" },
    baseUrl: "https://api.olostep.com",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://www.olostep.com/dashboard/",
    help: "1) Create a free account at olostep.com and sign in to the dashboard (olostep.com/dashboard). 2) Open the API keys "
      + "section and create one. 3) Copy it. Scraping, search and crawling use credits from your plan.",
    test: { path: "/user/credits/info",
              message: (d) => (d?.credits === undefined ? "API key is valid" : `Key is valid · ${d.credits} credits available`) },
    examples: "Examples: POST /v1/scrapes {\"url_to_scrape\": \"https://…\", \"formats\": [\"markdown\"]}, GET /v1/scrapes/{id}, "
      + "POST /v1/maps {\"url\": \"https://…\"}, POST /v1/crawls {\"start_url\": \"https://…\", \"max_pages\": 10}, "
      + "POST /v1/answers {\"task\": \"question or research request\"}, GET /user/credits/info.",
  },
  {
    id: "openregister", name: "OpenRegister", category: "data",
    description: "German commercial register: companies, owners and financials",
    website: "https://openregister.de", docs: "https://docs.openregister.de", logo: { favicon: "https://openregister.de" },
    baseUrl: "https://api.openregister.de",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://openregister.de/keys",
    help: "1) Create an account at openregister.de (the free plan includes 500 credits per month, no card required). 2) Go to “API "
      + "Keys” (openregister.de/keys) and generate a key. 3) Copy it. Each query uses credits: simple search 1; company "
      + "profile, owners or financials 10; ultimate beneficial owners (UBO) 25.",
    test: { path: "/v1/monitor", message: "API key is valid" },
    examples: "Examples: GET /v1/autocomplete/company?query=SAP (1 credit), "
      + "GET /v1/company/{company_id} (10; e.g. DE-HRB-F1103-267645), GET /v1/company/{company_id}/owners, "
      + "GET /v1/company/{company_id}/financials, GET /v1/company/{company_id}/ubo (25), GET /v1/monitor (free).",
  },
  {
    id: "openalex", name: "OpenAlex", category: "data", description: "Open catalog of publications, authors and institutions",
    website: "https://openalex.org", docs: "https://help.openalex.org", logo: { favicon: "https://openalex.org" },
    baseUrl: "https://api.openalex.org",
    auth: { type: "query", name: "api_key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://openalex.org/settings/api",
    help: "1) Create a free account at openalex.org. 2) Open “Settings” → “API key” (openalex.org/settings/api) and copy "
      + "your key. 3) The API also works without a key, but with one you get your own free budget ($1 per day, instead of "
      + "sharing $0.10 with everyone on your network), you can see your usage and paginate by cursor; heavy use is paid per "
      + "usage.",
    test: { path: "/rate-limit", message: "API key is valid" },
    examples: "Examples: GET /works?search=graph neural networks&per_page=25, GET /works/doi:10.7717/peerj.4375, "
      + "GET /authors?search=…, GET /institutions?filter=country_code:US, "
      + "GET /works?filter=publication_year:2025&group_by=type, GET /rate-limit.",
  },
  {
    id: "opencage", name: "OpenCage", category: "data", description: "Forward and reverse geocoding with open data",
    website: "https://opencagedata.com", docs: "https://opencagedata.com/api", logo: { simpleIcons: "opencage" },
    baseUrl: "https://api.opencagedata.com",
    auth: { type: "query", name: "key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://opencagedata.com/dashboard#api-keys",
    help: "1) Create a free account at opencagedata.com (2,500 free requests per day, 1 per second). 2) Open your dashboard "
      + "(“Dashboard”) and copy the key from the “API Keys” section. 3) Paste it here.",
    test: { path: "/geocode/v1/json", query: { q: "London", limit: 1, no_annotations: 1 }, message: "API key is valid" },
    examples: "Examples: GET /geocode/v1/json?q=Times Square, New York&language=en&limit=3 (address → coordinates), "
      + "GET /geocode/v1/json?q=40.7580,-73.9855&language=en (coordinates → address), "
      + "GET /geocode/v1/json?q=Springfield&countrycode=us&no_annotations=1.",
  },
  {
    id: "opengraphio", name: "OpenGraph.io", category: "data",
    description: "Open Graph metadata, screenshots and web page extraction",
    website: "https://www.opengraph.io", docs: "https://www.opengraph.io/docs", logo: { favicon: "https://www.opengraph.io" },
    baseUrl: "https://opengraph.io/api/1.1",
    auth: { type: "query", name: "app_id" },
    fields: [{ id: "token", label: "App ID (API key)", secret: true }],
    keyUrl: "https://dashboard.opengraph.io",
    help: "1) Create a free account at dashboard.opengraph.io (100 credits per month) and sign in. 2) Copy your "
      + "“App ID” from the dashboard. 3) Each call uses credits; the connection test uses one.",
    test: { path: "/site/https%3A%2F%2Fexample.com", message: "App ID is valid" },
    examples: "The page URL must be encoded (https%3A%2F%2Fexample.com). Examples: "
      + "GET /site/{url} (Open Graph metadata, Twitter Cards and meta tags), GET /scrape/{url} (HTML), "
      + "GET /extract/{url}?html_elements=h1,h2,p, GET /screenshot/{url}, GET /oembed/{url}.",
  },
  {
    id: "openweatherapi", name: "OpenWeather", category: "data",
    description: "Current weather, forecast, air quality and geocoding",
    website: "https://openweathermap.org", docs: "https://openweathermap.org/api", logo: { favicon: "https://openweathermap.org" },
    baseUrl: "https://api.openweathermap.org",
    auth: { type: "query", name: "appid" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://home.openweathermap.org/api_keys",
    help: "1) Create a free account at openweathermap.org and sign in. 2) Open “My API keys” "
      + "(home.openweathermap.org/api_keys): there is already a “Default” key; you can also create another with “Generate”. 3) Copy it: "
      + "a new key can take a couple of hours to activate (until then it returns a 401 error). The free plan includes "
      + "current weather, 5-day forecast, air quality and geocoding; “One Call 3.0” requires a separate subscription "
      + "(with a free tier).",
    test: { path: "/data/2.5/weather", query: { q: "London,GB", units: "metric", lang: "en" }, message: "API key is valid" },
    examples: "Examples: GET /data/2.5/weather?q=London,GB&units=metric&lang=en, "
      + "GET /data/2.5/forecast?lat=51.51&lon=-0.13&units=metric, GET /data/2.5/air_pollution?lat=51.51&lon=-0.13, "
      + "GET /geo/1.0/direct?q=London&limit=1, "
      + "GET /data/3.0/onecall?lat=51.51&lon=-0.13&exclude=minutely (requires the One Call subscription).",
  },
  {
    id: "openwebninja", name: "OpenWeb Ninja", category: "data",
    description: "Real-time web data: search, maps, jobs and commerce",
    website: "https://www.openwebninja.com", docs: "https://www.openwebninja.com/documentation",
    logo: { favicon: "https://www.openwebninja.com" },
    baseUrl: "https://api.openwebninja.com",
    auth: { type: "header", name: "x-api-key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://app.openwebninja.com",
    help: "1) Open the portal app.openwebninja.com and create an account if you do not have one. 2) Subscribe to the APIs you will "
      + "use (many have a free plan). 3) Go to “Account” → “Settings” and copy the key from the “API Key” card. The key "
      + "only works with the APIs you are subscribed to: if an API (or the connection test) responds 401, 403 or 429 and the key "
      + "is copied correctly, you need to subscribe to that API.",
    test: { path: "/usage", acceptStatus: [400, 403, 404, 422, 429], message: "API key is valid" },
    examples: "Each API has its own prefix in the path. Examples: GET /jsearch/search-v2?query=developer in New York&country=us, "
      + "GET /realtime-web-search/v2/search?q=electric vehicles&num=10&gl=us&hl=en, "
      + "GET /local-business-data/search?query=restaurants in New York&limit=10&language=en, "
      + "GET /realtime-news-data/search?query=technology&limit=10&country=US, "
      + "GET /usage?api_id=jsearch (quota and usage of an API).",
  },
  {
    id: "parallel", name: "Parallel", category: "ai", description: "AI web research: search, extraction and tasks",
    website: "https://parallel.ai", docs: "https://docs.parallel.ai", logo: { favicon: "https://parallel.ai" },
    baseUrl: "https://api.parallel.ai",
    auth: { type: "header", name: "x-api-key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://platform.parallel.ai",
    help: "1) Open platform.parallel.ai and create an account if you do not have one. 2) Open the API keys section and create one. "
      + "3) Copy it. Searches, extractions and tasks are billed by usage.",
    test: { path: "/v1/monitors", query: { limit: 1 }, message: "API key is valid" },
    examples: "Examples: POST /v1/search {\"objective\": \"…\", \"search_queries\": [\"…\"]}, "
      + "POST /v1/extract {\"urls\": [\"https://…\"], \"objective\": \"…\"}, "
      + "POST /v1/tasks/runs {\"input\": \"…\", \"processor\": \"base\"}, "
      + "GET /v1/tasks/runs/{run_id}/result?timeout=60 (waits up to 60 s for the result; if it is not ready yet, repeat), GET /v1/monitors.",
  },
  {
    id: "parsehub", name: "ParseHub", category: "data", description: "Visual scraping projects, runs and extracted data",
    website: "https://www.parsehub.com", docs: "https://www.parsehub.com/docs/ref/api/v2/", logo: { favicon: "https://www.parsehub.com" },
    baseUrl: "https://www.parsehub.com/api/v2",
    auth: { type: "signature", sign: parseHubKey },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://www.parsehub.com/account",
    help: "1) Sign in at parsehub.com. 2) Open “Account” (parsehub.com/account). 3) Copy your account's “API Key”; it is not "
      + "the “project token” of each project.",
    test: { path: "/projects", query: { limit: 1 }, message: "API key is valid" },
    examples: "Examples: GET /projects, GET /projects/{project_token}, "
      + "POST /projects/{project_token}/run with a form {\"start_url\": \"https://…\", \"send_email\": \"0\"} (for POST requests always send "
      + "a form, even if it only has send_email: ParseHub reads the key from the body), "
      + "GET /runs/{run_token} (at most one request every 3 minutes after the first 5), "
      + "GET /runs/{run_token}/data?format=json, GET /projects/{project_token}/last_ready_run/data?format=json.",
  },
];
