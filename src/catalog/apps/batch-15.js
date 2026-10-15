// Batch 15 of the catalog: web scraping, data enrichment and lookup APIs, in-app surveys and data platforms (Parsera, Peaka,
// People Data Labs, Perigon, Phantombuster, Piloterr, Placekey, Plate Recognizer, PostGrid Verify, Radar, Ragic, RealPhoneValidation,
// Refiner, Retently, Scrape.do, ScrapeGraphAI, Scrapfly, ScrapingAnt, SearchApi, SeekTable, Segment and Seqera).
// None of them offers OAuth with open registration: all connect with a key or token.

export default [
  {
    id: "parsera", name: "Parsera", category: "data", description: "AI data extraction from websites and reusable scrapers",
    website: "https://parsera.org", docs: "https://api.parsera.org/docs", logo: { favicon: "https://parsera.org" },
    baseUrl: "https://api.parsera.org",
    auth: { type: "header", name: "X-API-KEY" },
    fields: [{ id: "token", label: "Parsera API key", secret: true }],
    keyUrl: "https://parsera.org/app/api",
    help: "1) Sign in at parsera.org/app with your account (or sign up if you do not have one). 2) Open the “API” tab and copy your API key. "
      + "3) Each extraction uses plan credits.",
    timeout: 180_000,
    test: { path: "/v1/scrapers", message: "API key is valid" },
    examples: "Examples: POST /v1/extract {\"url\": \"https://example.com\", \"attributes\": [{\"name\": \"title\", "
      + "\"description\": \"Page title\"}]}, POST /v1/extract_markdown {\"url\": \"https://example.com\"}, GET /v1/scrapers "
      + "(saved scrapers), POST /v1/scrapers/run {\"template_id\": \"…\", \"url\": \"…\"}, GET /v1/proxy-countries.",
  },
  {
    id: "peaka", name: "Peaka", category: "data", description: "Data integration: projects, catalogs, connections and SQL",
    website: "https://www.peaka.com", docs: "https://docs.peaka.com/api-reference/introduction", logo: { favicon: "https://www.peaka.com" },
    baseUrl: "https://{server}/api/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "Partner API Key", secret: true },
             { id: "server", label: "Your account region", default: "partner.peaka.studio",
               options: [["partner.peaka.studio", "United States (peaka.studio)"],
                          ["partner.eu.peaka.studio", "European Union (eu.peaka.studio)"]],
               help: "The one in your Peaka Studio address: peaka.studio is the US and eu.peaka.studio is the EU. "
                 + "A key only works in its own region." }],
    keyUrl: "https://peaka.studio/home/advanced-settings",
    help: "1) Sign in to Peaka Studio (peaka.studio, or eu.peaka.studio if your account is in the EU). 2) In the sidebar open “Developer” "
      + "and click “Partner API Key”. 3) Enter a name, click “Create” and copy the key: it gives full access to your account. "
      + "4) Choose your account's region below.",
    test: { path: "/organizations", account: (d) => (Array.isArray(d) ? d.map((o) => o.name).filter(Boolean).join(", ") : d?.name) },
    examples: "Examples: GET /organizations, GET /organizations/{orgId}/workspaces, "
      + "GET /organizations/{orgId}/workspaces/{workspaceId}/projects, GET /data/projects/{projectId}/catalogs, "
      + "POST /data/projects/{projectId}/queries/execute?format=SIMPLE {\"statement\": \"SELECT 1\"}.",
  },
  {
    id: "peopledatalabs", name: "People Data Labs", category: "crm",
    description: "Enrichment and search of B2B people and companies",
    website: "https://www.peopledatalabs.com", docs: "https://docs.peopledatalabs.com", logo: { favicon: "https://www.peopledatalabs.com" },
    baseUrl: "https://api.peopledatalabs.com/v5",
    auth: { type: "header", name: "X-Api-Key" },
    fields: [{ id: "token", label: "People Data Labs API key", secret: true }],
    keyUrl: "https://dashboard.peopledatalabs.com",
    help: "1) Sign in to the People Data Labs dashboard (dashboard.peopledatalabs.com); if you do not have an account, the free plan is created at "
      + "peopledatalabs.com/signup. 2) Open “API Keys” and copy the “Active Key”. 3) Each person or company record returned uses "
      + "plan credits; the connection test uses Autocomplete, which is free.",
    test: { path: "/autocomplete", query: { field: "title", text: "engineer", size: 1 }, message: "API key is valid" },
    examples: "Examples: GET /person/enrich?email=…&min_likelihood=6, GET /company/enrich?website=stripe.com, POST /person/search "
      + "{\"sql\": \"SELECT * FROM person WHERE job_company_website = 'stripe.com' AND job_title_role = 'engineering'\", \"size\": 3}, "
      + "GET /autocomplete?field=company&text=strip&size=5 (free). Enrich and search use credits.",
  },
  {
    id: "perigon", name: "Perigon", category: "data",
    description: "Real-time news: articles, stories, sources and people",
    website: "https://perigon.io", docs: "https://perigon.io/docs/api/intro", logo: { favicon: "https://perigon.io" },
    baseUrl: "https://api.perigon.io/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "Perigon API key", secret: true }],
    keyUrl: "https://perigon.io/dev/keys",
    help: "1) Sign up or sign in at perigon.io. 2) Open perigon.io/dev/keys (“Developers” → “API Keys” section) and create or "
      + "copy a key. 3) The free plan includes 150 requests per month with all endpoints and 3 months of history.",
    test: { path: "/limits", account: (d) => d.data?.organizationName, message: "API key is valid" },
    examples: "Examples: GET /articles/all?q=artificial intelligence&language=en&size=5&sortBy=date, GET /stories/all?q=…, "
      + "GET /sources/all?name=…, GET /journalists/all?name=…, GET /limits (account usage, does not use quota).",
  },
  {
    id: "phantombuster", name: "Phantombuster", category: "automation",
    description: "Cloud scraping and prospecting agents (Phantoms)",
    website: "https://phantombuster.com", docs: "https://hub.phantombuster.com/reference", logo: { favicon: "https://phantombuster.com" },
    baseUrl: "https://api.phantombuster.com/api/v2",
    auth: { type: "header", name: "X-Phantombuster-Key" },
    fields: [{ id: "token", label: "Phantombuster API key", secret: true }],
    keyUrl: "https://phantombuster.com/workspace-settings",
    help: "1) Sign in to Phantombuster and open “Workspace settings” (top bar menu). 2) Generate an API key and copy it: "
      + "it is shown only once, so save it before leaving the page. 3) The key belongs to the active workspace; if "
      + "you have several, use the one you want to manage.",
    test: { path: "/orgs/fetch", account: (d) => d.name },
    examples: "Examples: GET /agents/fetch-all, GET /agents/fetch?id=…, "
      + "POST /agents/launch {\"id\": \"…\", \"argument\": {…}} (launches the Phantom and uses execution time), "
      + "GET /containers/fetch-all?agentId=…, GET /containers/fetch-result-object?id=….",
  },
  {
    id: "piloterr", name: "Piloterr", category: "data",
    description: "50+ scraping APIs: websites, LinkedIn, stores and emails",
    website: "https://www.piloterr.com", docs: "https://docs.piloterr.com", logo: { favicon: "https://www.piloterr.com" },
    baseUrl: "https://api.piloterr.com/v2",
    auth: { type: "header", name: "x-api-key" },
    fields: [{ id: "token", label: "Piloterr API key", secret: true }],
    keyUrl: "https://app.piloterr.com",
    help: "1) Sign in at app.piloterr.com (the free account is enough). 2) Open “API Keys” (or “Settings”) and create a key with “New”: "
      + "give it an alias and, optionally, a usage limit or an expiry. 3) Copy the secret: it is shown only once. "
      + "Each call uses credits depending on the endpoint.",
    timeout: 120_000,
    test: { path: "/usage",
              message: (d) => (d?.remaining != null ? `API key is valid (${d.remaining} credits available)` : "API key is valid") },
    examples: "Examples: GET /usage (free), GET /website/crawler?query=https://example.com, "
      + "GET /linkedin/company/info?domain=stripe.com, GET /email/finder?first_name=Jane&last_name=Doe&domain=example.com. "
      + "Each endpoint has its own cost in credits.",
  },
  {
    id: "placekey", name: "Placekey", category: "data",
    description: "Unique identifiers (Placekey) for addresses and places",
    website: "https://www.placekey.io", docs: "https://docs.placekey.io", logo: { favicon: "https://www.placekey.io" },
    baseUrl: "https://api.placekey.io/v1",
    auth: { type: "header", name: "apikey" },
    fields: [{ id: "token", label: "Placekey API key", secret: true }],
    keyUrl: "https://dev.placekey.io",
    help: "1) Create a free account or sign in to the developer portal (dev.placekey.io). 2) In the dashboard open the "
      + "API keys section (“Credentials”) and copy your key. 3) Limits depend on the plan: queries are counted, "
      + "up to 100 per request.",
    test: { method: "POST", path: "/placekey", message: "API key is valid",
              body: { query: { street_address: "1543 Mission Street, Floor 3", city: "San Francisco", region: "CA",
                                 postal_code: "94105", iso_country_code: "US" } } },
    examples: "Examples: POST /placekey {\"query\": {\"street_address\": \"1543 Mission Street\", \"city\": \"San Francisco\", "
      + "\"region\": \"CA\", \"postal_code\": \"94105\", \"iso_country_code\": \"US\"}}, "
      + "POST /placekeys {\"queries\": [{…}, {…}]} (up to 100 per request, all from the same country). "
      + "It also accepts latitude/longitude and location_name.",
  },
  {
    id: "platerecognizer", name: "Plate Recognizer", category: "ai", description: "License plate reading (ALPR) in images with AI",
    website: "https://platerecognizer.com", docs: "https://guides.platerecognizer.com/docs/snapshot/api-reference",
    logo: { favicon: "https://platerecognizer.com" },
    baseUrl: "https://api.platerecognizer.com/v1",
    auth: { type: "header", name: "Authorization", prefix: "Token " },
    fields: [{ id: "token", label: "Snapshot Cloud API token", secret: true }],
    keyUrl: "https://app.platerecognizer.com/service/snapshot-cloud/",
    help: "1) Create an account or sign in at app.platerecognizer.com. 2) Open “Snapshot Cloud” and copy the “API Token” shown "
      + "on the page. 3) The free account includes a limited number of reads per month.",
    test: { path: "/statistics/",
              message: (d) => (d?.usage ? `Token is valid (${d.usage.calls} reads this month)` : "API token is valid") },
    examples: "Examples: POST /plate-reader/ {\"upload_url\": \"https://example.com/car.jpg\", \"regions\": [\"us\"]} "
      + "(or “upload” with the image in base64), GET /statistics/ (reads this month). Each read uses one call from the plan.",
  },
  {
    id: "postgridverify", name: "PostGrid Verify", category: "data",
    description: "Autocomplete and verification of postal addresses",
    website: "https://www.postgrid.com/address-verification/", docs: "https://avdocs.postgrid.com",
    logo: { favicon: "https://www.postgrid.com" },
    baseUrl: "https://api.postgrid.com/v1",
    auth: { type: "header", name: "x-api-key" },
    fields: [{ id: "token", label: "PostGrid API key", secret: true }],
    keyUrl: "https://app.postgrid.com/addver/developers",
    help: "1) Sign in at app.postgrid.com (you can create a free account) and open “Address Verification” → “Developers”. "
      + "2) Click “Create new access key” and choose a secret key (batch verification requires it). 3) Copy the key. "
      + "The free plan has a query limit; the connection test shows how many you have used.",
    test: { path: "/addver",
              message: (d) => (d?.data ? `API key is valid (${d.data.used} of ${d.data.freeLimit} free queries used)`
                : "API key is valid") },
    examples: "Examples: POST /addver/verifications {\"address\": \"1339 goldhill rd E Mount Pleasant NC 28124\"}, "
      + "POST /addver/completions {\"partialStreet\": \"20 Bay\", \"stateFilter\": \"ON\"}, POST /addver/parses {\"address\": \"…\"}, "
      + "POST /addver/city_states {\"postalOrZip\": \"m9v4v1\"}, GET /addver (queries used and free limit).",
  },
  {
    id: "radar", name: "Radar", category: "data", description: "Geocoding, routes, geofences and location tracking",
    website: "https://radar.com", docs: "https://docs.radar.com/api", logo: { simpleIcons: "radar" },
    baseUrl: "https://api.radar.io/v1",
    auth: { type: "header", name: "Authorization" },
    fields: [{ id: "token", label: "Radar secret key (prj_live_sk_… or prj_test_sk_…)", secret: true }],
    keyUrl: "https://dashboard.radar.com/settings",
    help: "1) Sign in to the Radar dashboard (radar.com/dashboard) and open “Settings”. 2) Copy the project's secret key (“Secret key”): "
      + "the live one (prj_live_sk_…) or the test one (prj_test_sk_…). 3) The publishable key (pk) does not work: it only "
      + "allows calls from apps and does not let you manage users or geofences.",
    test: { path: "/geofences", query: { limit: 1 }, message: "Secret key is valid" },
    examples: "Examples: GET /geocode/forward?query=20 Jay St, Brooklyn, GET /geocode/reverse?coordinates=40.7128,-74.0060, "
      + "GET /search/autocomplete?query=times square&near=40.7128,-74.0060, "
      + "GET /route/distance?origin=40.7128,-74.0060&destination=42.3601,-71.0589&modes=car&units=metric, GET /geofences.",
  },
  {
    id: "ragic", name: "Ragic", category: "productivity", description: "Spreadsheet-style web database: sheets and records",
    website: "https://www.ragic.com", docs: "https://www.ragic.com/intl/en/doc-http-api", logo: { favicon: "https://www.ragic.com" },
    baseUrl: "https://{server}.ragic.com/{account}",
    // Every call needs ?api; v=3 pins the API version. The key shown by Ragic goes as is after “Basic ”.
    query: { api: "", v: "3" },
    auth: { type: "header", name: "Authorization", prefix: "Basic " },
    fields: [{ id: "server", label: "Your Ragic account server", format: "subdomain", default: "www",
               help: "The first part of your database address: www, na3, ap5, eu2…" },
             { id: "account", label: "Your Ragic account name", format: "segment", example: "my-example-company",
               help: "What comes after the server in the address, e.g. https://www.ragic.com/mycompany/sales/1 → mycompany." },
             { id: "token", label: "Ragic API key", secret: true }],
    help: "1) Sign in to Ragic and open “Personal Settings” (your user menu). 2) Copy your API key (“API Key”), a long text. "
      + "Consider creating a user just for the API: the key acts with that user's permissions. 3) Look at the address of your "
      + "database in the browser (https://<server>.ragic.com/<account>/…) and enter the server and the account name below.",
    test: {
      path: "/",
      // Without a valid session Ragic responds with the sign-in page or an error JSON (always with HTTP 200).
      validate: (d) => {
        if (!d || typeof d !== "object") throw new Error("Ragic returned no API data: check the server, the account and the key");
        if (d.status === "ERROR") throw new Error(`Ragic: ${d.msg || "authentication error"}`);
        const root = Object.values(d)[0];
        if (!root?.children || !Object.keys(root.children).length) {
          throw new Error("Ragic shows no sheet with this key: check the account name, the server and the key");
        }
      },
      account: (d, cred) => d?.[cred.account]?.name,
    },
    examples: "Paths are /<tab>/<sheet> (numeric index of the sheet) and Conector adds ?api&v=3 automatically. "
      + "Examples: GET / (tabs and sheets of the account), GET /sales/1?limit=50&offset=0 (records), "
      + "GET /sales/1/12345 (one record), GET /sales/1?where=2000123,eq,Alphabet Inc. (filter by field id), "
      + "POST /sales/1 and POST /sales/1/12345 with the “form” parameter {\"2000123\": \"value\"} (create and update records).",
  },
  {
    id: "realphonevalidation", name: "RealPhoneValidation", category: "data",
    description: "US phone validation: line type, carrier and fraud",
    website: "https://realphonevalidation.com", docs: "https://realphonevalidation.com/api-documentation/",
    logo: { favicon: "https://realphonevalidation.com" },
    baseUrl: "https://api.realvalidation.com/rpvWebService",
    auth: { type: "query", name: "token" },
    fields: [{ id: "token", label: "RealPhoneValidation API token", secret: true,
               example: "00000000-0000-0000-0000-000000000000",
               help: "A code in the format 00000000-0000-0000-0000-000000000000: with any other format the service "
                 + "rejects the request (403)." }],
    help: "1) Create an account or sign in at my.realvalidation.com (the RealPhoneValidation portal; it is a B2B service and with a "
      + "free email address you do not get the 100 trial credits). 2) On the validation page of your account copy the API token (it "
      + "can be regenerated from the same page). 3) Each validation uses credits and only works with 10-digit US numbers. "
      + "The connection test uses a non-existent number (0000000000) to avoid using credits.",
    test: {
      // The service checks the phone format first and then the token, so a 10-digit number is needed to reach the check.
      // With a wrong token it answers 200 with status “unauthorized”; if the token is not in UUID format, a 403 with no
      // body.
      path: "/TurboV3.php", query: { output: "json", phone: "0000000000" },
      validate: (d) => {
        const text = (typeof d === "string" ? d : JSON.stringify(d ?? "")).toLowerCase();
        if (/unauthorized|missing token|token is not valid/.test(text)) {
          throw new Error("RealPhoneValidation: the token is not valid or the account does not have access to Turbo V3");
        }
      },
    },
    examples: "Always with output=json and the phone number without a prefix (10 digits). Examples: "
      + "GET /TurboV3.php?output=json&phone=7275555555 (connected or not, line type, carrier and name), "
      + "GET /RealPhoneValidationScrub.php?output=json&phone=…, GET /DNCLookup.php?output=json&phone=… (Do Not Call lists), "
      + "GET /RealPhoneValidationFraudChk.php?output=json&phone=… (fraud risk), GET /EmailVerify.php?output=json&email=…. "
      + "All of them use credits.",
  },
  {
    id: "refiner", name: "Refiner", category: "support", description: "In-app surveys (NPS, CSAT): responses and contacts",
    website: "https://refiner.io", docs: "https://refiner.io/docs/api/", logo: { favicon: "https://refiner.io" },
    baseUrl: "https://api.refiner.io/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "Refiner environment API key", secret: true }],
    help: "1) Sign in to your Refiner dashboard (app.refiner.io). 2) Open “Environment Settings” → “API Keys” and copy the key. "
      + "Each environment (e.g. Production) has its own and the API only sees the data of that environment.",
    test: { path: "/", account: (d) => d.project_name },
    examples: "Examples: GET /forms (surveys), GET /responses?form_uuid=…&date_range_start=2025-01-01&page_length=50, "
      + "GET /contacts?page_length=50, GET /reporting?type=nps&form_uuids[]=…&date_range_start=2025-01-01, "
      + "POST /identify-user {\"id\": \"user-1\", \"email\": \"jane@example.com\", \"plan\": \"pro\"}, "
      + "POST /track-event {\"id\": \"user-1\", \"event\": \"…\"}.",
  },
  {
    id: "retently", name: "Retently", category: "support", description: "NPS/CSAT surveys: customers, responses and campaigns",
    website: "https://www.retently.com", docs: "https://www.retently.com/docs/api/", logo: { favicon: "https://www.retently.com" },
    baseUrl: "https://app.retently.com/api/v2",
    auth: { type: "header", name: "X-Api-Key" },
    fields: [{ id: "token", label: "Retently API key", secret: true }],
    help: "1) Sign in to Retently (app.retently.com) as an admin. 2) Open “Settings” → “API keys” and click “Generate new API "
      + "token”. 3) Choose read permission (enough for queries) or write permission (needed to create customers or send "
      + "surveys) and copy the key. Limit: 150 requests per minute.",
    test: { path: "/ping", message: "API key is valid" },
    examples: "Examples: GET /ping (account status), GET /customers?limit=20, GET /feedback?limit=20, GET /nps/score, "
      + "POST /customers {\"subscribers\": [{\"email\": \"jane@example.com\"}]} (requires a key with write permission).",
  },
  {
    id: "scrapedo", name: "Scrape.do", category: "data", description: "Scraping API with rotating proxies and a headless browser",
    website: "https://scrape.do", docs: "https://scrape.do/documentation/", logo: { favicon: "https://scrape.do" },
    baseUrl: "https://api.scrape.do",
    auth: { type: "query", name: "token" },
    fields: [{ id: "token", label: "Scrape.do token", secret: true }],
    keyUrl: "https://dashboard.scrape.do",
    help: "1) Sign up (there is a free plan) or sign in at dashboard.scrape.do. 2) Copy your token: it is generated when you sign up and "
      + "appears in your dashboard. 3) Each request uses plan credits; render and super (residential proxies) use more.",
    timeout: 120_000,
    test: {
      path: "/info",
      // With a wrong token Scrape.do answers 200 and IsActive false.
      validate: (d) => {
        if (d?.IsActive !== true) throw new Error("Scrape.do: the token is not valid or the subscription is inactive");
      },
      message: (d) => (d?.RemainingMonthlyRequest != null
        ? `Token is valid (${d.RemainingMonthlyRequest} requests left this month)` : "Token is valid"),
    },
    examples: "The page is requested at the root with the url parameter. Examples: GET /?url=https://example.com, "
      + "GET /?url=https://example.com&render=true (runs JavaScript), "
      + "GET /?url=https://example.com&output=markdown (returns Markdown), "
      + "GET /?url=https://example.com&super=true&geoCode=us (residential proxy in the US), "
      + "GET /info (remaining requests and concurrency; maximum 10 per minute).",
  },
  {
    id: "scrapegraphai", name: "ScrapeGraphAI", category: "ai",
    description: "AI scraping: extract data from websites using natural language",
    website: "https://scrapegraphai.com", docs: "https://docs.scrapegraphai.com/api-reference/introduction",
    logo: { favicon: "https://scrapegraphai.com" },
    baseUrl: "https://v2-api.scrapegraphai.com/api",
    auth: { type: "header", name: "SGAI-APIKEY" },
    fields: [{ id: "token", label: "ScrapeGraphAI API key (sgai-…)", secret: true }],
    keyUrl: "https://scrapegraphai.com/dashboard",
    help: "1) Sign in at scrapegraphai.com/dashboard (or sign up). 2) Open “Settings” and copy your key in the "
      + "“API Key” section (it starts with sgai-). 3) Each request uses plan credits (scrape, extract, search and crawl).",
    timeout: 180_000,
    test: { path: "/credits",
              message: (d) => (d?.remaining != null ? `API key is valid (${d.remaining} credits available)` : "API key is valid") },
    examples: "Examples: POST /extract {\"url\": \"https://example.com\", \"prompt\": \"Extract the title and the price\"}, "
      + "POST /scrape {\"url\": \"https://example.com\", \"formats\": [{\"type\": \"markdown\"}]}, "
      + "POST /search {\"query\": \"…\", \"numResults\": 3}, POST /crawl {\"url\": \"…\"} and GET /crawl/{id}, GET /credits (free).",
  },
  {
    id: "scrapfly", name: "Scrapfly", category: "data", description: "Scraping API with JS rendering, proxies and anti-blocking",
    website: "https://scrapfly.io", docs: "https://scrapfly.io/docs/scrape-api/getting-started", logo: { favicon: "https://scrapfly.io" },
    baseUrl: "https://api.scrapfly.io",
    auth: { type: "query", name: "key" },
    fields: [{ id: "token", label: "Scrapfly API key", secret: true }],
    keyUrl: "https://scrapfly.io/dashboard",
    help: "1) Sign in at scrapfly.io/dashboard (the free account is enough). 2) The API key is at the top of the dashboard; "
      + "each project has a production key (LIVE) and a test key (TEST). 3) Copy the key of the project you want to use. "
      + "Each request uses credits; render_js and asp (anti-blocking) cost more.",
    timeout: 150_000,
    test: { path: "/account", account: (d) => [d.project?.name, d.subscription?.plan_name].filter(Boolean).join(" · ") },
    examples: "Examples: GET /scrape?url=https://example.com, "
      + "GET /scrape?url=https://example.com&render_js=true&asp=true&country=us, GET /screenshot?url=https://example.com, "
      + "GET /account (plan and project usage).",
  },
  {
    id: "scrapingant", name: "ScrapingAnt", category: "data",
    description: "Scraping API with headless Chrome and proxy rotation",
    website: "https://scrapingant.com", docs: "https://docs.scrapingant.com", logo: { favicon: "https://scrapingant.com" },
    baseUrl: "https://api.scrapingant.com/v2",
    auth: { type: "header", name: "x-api-key" },
    fields: [{ id: "token", label: "ScrapingAnt API key", secret: true }],
    keyUrl: "https://app.scrapingant.com/dashboard",
    help: "1) Sign up (there is a free plan) or sign in at app.scrapingant.com. 2) Copy your API key: it appears in the dashboard "
      + "(“Dashboard”) and in your profile. 3) Each request uses credits; the browser and residential proxies use more.",
    timeout: 120_000,
    test: { path: "/usage",
              message: (d) => (d?.remained_credits != null ? `API key is valid (${d.remained_credits} credits remaining)`
                : "API key is valid") },
    examples: "Examples: GET /general?url=https://example.com, "
      + "GET /general?url=https://example.com&browser=false (no browser, cheaper), GET /markdown?url=https://example.com, "
      + "GET /extract?url=https://example.com&extract_properties=title,price, GET /usage (credits).",
  },
  {
    id: "searchapi", name: "SearchApi", category: "marketing",
    description: "Search engine results as JSON: Google, Maps, Bing, YouTube…",
    website: "https://www.searchapi.io", docs: "https://www.searchapi.io/docs/google", logo: { favicon: "https://www.searchapi.io" },
    baseUrl: "https://www.searchapi.io/api/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "SearchApi API key", secret: true }],
    keyUrl: "https://www.searchapi.io/api_tokens",
    help: "1) Sign up (there is a free plan with trial searches) or sign in at searchapi.io. 2) Open the API keys page "
      + "(searchapi.io/api_tokens) and copy your key. 3) Each search uses one plan credit.",
    test: {
      path: "/me",
      message: (d) => (d?.account?.remaining_credits != null
        ? `API key is valid (${d.account.remaining_credits} searches remaining)` : "API key is valid"),
    },
    examples: "The search engine is chosen with engine. Examples: GET /search?engine=google&q=coffee shops New York&gl=us&hl=en, "
      + "GET /search?engine=google_maps&q=plumber&ll=@40.7128,-74.0060,12z, GET /search?engine=google_news&q=…, "
      + "GET /search?engine=youtube&q=…, GET /me (remaining credits).",
  },
  {
    id: "seektable", name: "SeekTable", category: "data", description: "BI: reports, cubes, pivot tables and dashboards",
    website: "https://www.seektable.com", docs: "https://www.seektable.com/help/web-api-integration",
    logo: { favicon: "https://www.seektable.com" },
    baseUrl: "https://www.seektable.com/api",
    auth: { type: "header", name: "Authorization" },
    fields: [{ id: "token", label: "SeekTable API key", secret: true }],
    help: "1) Sign in at www.seektable.com. 2) Open your account (user menu → “Manage Account”) and click “Get API Key”. "
      + "3) Copy the key (a long text). The free account allows up to 50 calls per day and the API is suspended if you do not sign in "
      + "for 90 days. This connector is for SeekTable in the cloud, not for self-hosted installations.",
    test: { path: "/report",
              message: (d) => (Array.isArray(d) ? `API key is valid (${d.length} saved reports)` : "API key is valid") },
    examples: "Examples: GET /report (saved reports), GET /report/{id} (metadata), "
      + "GET /report/{id}/export?format=pdf (also html, csv, excel, json, png), GET /cube (data cubes), GET /cube/{id}.",
  },
  {
    id: "segment", name: "Segment", category: "data", description: "Customer data platform: sources, destinations and plans",
    website: "https://segment.com", docs: "https://docs.segmentapis.com", logo: { image: "https://github.com/segmentio.png" },
    baseUrl: "https://{server}",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "Segment Public API token", secret: true },
             { id: "server", label: "Your workspace region", default: "api.segmentapis.com",
               options: [["api.segmentapis.com", "United States"], ["eu1.api.segmentapis.com", "European Union"]],
               help: "The region where your workspace stores its data. A token from an EU workspace does not work "
                 + "in the US region." }],
    help: "1) Sign in to app.segment.com and choose the workspace. 2) Open “Settings” → “Access Management” tab → “Tokens” → "
      + "“+ Create Token”. 3) Choose the “Public API” type (not “Config API”), give it a description and the access level (for "
      + "example, read-only) and copy the token: it is shown only once. 4) Each workspace needs its own token; choose "
      + "its region below.",
    test: { path: "/", account: (d) => d.data?.workspace?.displayName || d.data?.workspace?.slug },
    examples: "Examples: GET / (the token's workspace), GET /sources?pagination.count=20, GET /destinations, GET /tracking-plans, "
      + "GET /warehouses. Lists are paginated with pagination.count and pagination.cursor.",
  },
  {
    id: "seqera", name: "Seqera", category: "developer", description: "Nextflow pipeline orchestration: runs and environments",
    website: "https://seqera.io", docs: "https://docs.seqera.io/platform-api", logo: { favicon: "https://seqera.io" },
    baseUrl: "https://api.cloud.seqera.io",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "Seqera Platform personal access token", secret: true }],
    keyUrl: "https://cloud.seqera.io/tokens",
    help: "1) Sign in at cloud.seqera.io with your account. 2) Open cloud.seqera.io/tokens (in your avatar menu) and click “Add token”. "
      + "3) Give it a name and copy the token: it is shown only once. This connector uses Seqera Platform Cloud (api.cloud.seqera.io), "
      + "not self-hosted Enterprise installations.",
    test: { path: "/user-info", account: (d) => d.user?.email || d.user?.userName },
    examples: "Almost everything is scoped with ?workspaceId=… (without it, your personal workspace is used). Examples: GET /user-info, "
      + "GET /user/{userId}/workspaces (organizations and workspaces), GET /pipelines?workspaceId=…, "
      + "GET /workflow?workspaceId=… (runs), POST /workflow/launch?workspaceId=… (launches a pipeline).",
  },
];
