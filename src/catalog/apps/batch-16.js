// Batch 16 of the Composio catalog: data and analytics (from Serphouse to World News API). None of these apps has open OAuth
// (Composio lists it for Tally, but its public documentation only offers API keys; Snowflake registers it per account).
// Not included: similarweb_digitalrank_api (same host and same key as “similarweb”; its documentation page no longer exists),
// token_metrics (api.tokenmetrics.com no longer resolves in DNS), tripadvisor_content_api (the API was retired on 2026-08-31; its
// replacement, Terra, is a different product with another host and another authentication) and weathermap (it is OpenWeatherMap:
// “openweatherapi” already exists).
import crypto from "node:crypto";
import { USER_AGENT, httpRequest } from "../../http.js";
import { ensureOk, normalizeUrl } from "../define.js";

// Tableau: the personal access token (PAT) is exchanged for a session token with POST /auth/signin and that token goes in X-Tableau-Auth.
// Each PAT allows only one session at a time: the session is kept in memory and simultaneous calls share the same sign-in,
// so they do not close each other. Here it expires after 30 minutes (Tableau Cloud: 2 hours; Tableau Server: 4).
let tableauSession = null;
function getTableauSession(c) {
  const url = normalizeUrl(c.server);
  const version = String(c.version || "3.19").trim();
  if (!/^\d{1,2}\.\d{1,2}$/.test(version)) throw new Error("Tableau: the REST API version must look like 3.19");
  const site = String(c.site || "").trim();
  const fingerprint = crypto.createHash("sha256").update(JSON.stringify([url, version, c.token_name, c.token_secret, site])).digest("hex");
  if (tableauSession?.fingerprint === fingerprint && tableauSession.expires > Date.now()) return tableauSession.promise;
  const promise = (async () => {
    const r = await httpRequest(`${url}/api/${version}/auth/signin`, { method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json", "User-Agent": USER_AGENT },
      body: JSON.stringify({ credentials: { personalAccessTokenName: c.token_name, personalAccessTokenSecret: c.token_secret,
                                            site: { contentUrl: site } } }) });
    if (!r.ok) {
      const e = r.data?.error;
      const reason = e?.detail || e?.summary || "check the URL, the site and the token";
      throw new Error(`Tableau: could not sign in (${r.status}): ${reason}`);
    }
    const cr = r.data?.credentials;
    if (!cr?.token) throw new Error("Tableau: the sign-in response does not include a token");
    return { token: cr.token, siteId: cr.site?.id, site: cr.site?.contentUrl ?? site, userId: cr.user?.id, version };
  })();
  tableauSession = { fingerprint, promise, expires: Date.now() + 30 * 60_000 };
  promise.catch(() => {
    if (tableauSession?.promise === promise) tableauSession = null;
  });
  return promise;
}

export default [
  {
    id: "serphouse", name: "SERPhouse", category: "marketing",
    description: "Google, Bing and Yahoo search results, live or scheduled",
    website: "https://www.serphouse.com", docs: "https://www.serphouse.com/docs", logo: { favicon: "https://www.serphouse.com" },
    baseUrl: "https://api.serphouse.com",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key (token)", secret: true }],
    keyUrl: "https://www.serphouse.com/home",
    help: "1) Create an account at serphouse.com and confirm your email (a new account includes trial credits). 2) Sign in: "
      + "the API key appears in your dashboard (“Dashboard”). 3) Copy it and paste it here. Credits are only used on requests that "
      + "return 200 (errors and blocks are free); the connection test only fetches the account data.",
    test: { path: "/account/info", account: (d) => d.results?.email || d.results?.user?.email || d.results?.name,
              message: "API key is valid" },
    examples: "Each search engine has its own path and is queried with POST and a JSON body with q, domain, lang, device and loc. Examples: "
      + "POST /google-web {\"q\": \"cybersecurity\", \"domain\": \"google.com\", \"lang\": \"en\", \"device\": \"desktop\", "
      + "\"loc\": \"Chicago,Illinois,United States\"} (also /google-news, /google-image, /bing-web, /bing-news, /bing-image and "
      + "/yahoo-web), GET /location/search?q=chicago&type=google (valid locations for loc), GET /language/list/google, "
      + "GET /domain/list, GET /account/info (plan and credits), POST /serp/schedule (scheduled queries) and, for those, "
      + "GET /serp/check?id=… and GET /serp/get?id=… (status and results).",
  },
  {
    id: "serply", name: "Serply", category: "marketing",
    description: "Google (web, news, images, jobs) and Bing results",
    website: "https://serply.io", docs: "https://serply.io/docs", logo: { favicon: "https://serply.io" },
    baseUrl: "https://api.serply.io/v1",
    auth: { type: "header", name: "X-Api-Key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://app.serply.io",
    help: "1) Sign up at app.serply.io and sign in. 2) Your API key appears in the dashboard (“Dashboard”). 3) Copy it here. "
      + "Serply has no free account query: “Test connection” runs a minimal search that uses 1 credit.",
    test: { path: "/search/", query: { q: "test", num: 1 }, message: "API key is valid" },
    examples: "Examples: GET /search/?q=cybersecurity&num=10&gl=us (Google; start=10 for page 2), GET /news/?q=…&ceid=US:en, "
      + "GET /image/?q=…, GET /video/?q=…, GET /job/search/?q=data+engineer, GET /scholar/?q=…, GET /maps/search/?q=…, "
      + "GET /b/search/?q=… (Bing), GET /product/search/?q=… (Amazon), GET /ebay/search/?q=…, POST /request {\"url\": \"https://…\"} "
      + "(downloads a page). The query is also accepted in the path (/search/q=…&num=10). Optional headers: "
      + "X-Proxy-Location (EU, US, GB, FR, DE, IE…) and X-User-Agent (desktop or mobile).",
  },
  {
    id: "simpleanalytics", name: "Simple Analytics", category: "data",
    description: "Cookie-free web analytics: visits, pages, sources and export",
    website: "https://www.simpleanalytics.com", docs: "https://docs.simpleanalytics.com/api/stats", logo: { simpleIcons: "simpleanalytics" },
    baseUrl: "https://simpleanalytics.com",
    auth: [{ type: "header", name: "Api-Key" }, { type: "header", name: "User-Id", field: "username" }],
    fields: [{ id: "token", label: "API key (sa_api_key_…)", secret: true },
             { id: "username", label: "User ID (sa_user_id_…)", example: "sa_user_id_00000000-0000-4000-8000-000000000000" }],
    keyUrl: "https://simpleanalytics.com/account",
    help: "1) Sign in at simpleanalytics.com and open your account settings (button below). 2) Create an API key (it starts "
      + "with sa_api_key_) and copy it. 3) On the same page copy your user ID (“User ID”, it starts with sa_user_id_). The key is used "
      + "for the statistics; the user ID is required by the admin and export APIs.",
    test: { path: "/api/websites",
              message: (d) => {
                const list = Array.isArray(d) ? d : (d?.websites ?? d?.data);
                return Array.isArray(list) ? `${list.length} website(s) in the account` : "Credentials are valid";
              } },
    examples: "Examples: GET /{domain}.json?version=6&fields=pageviews,visitors&start=2026-09-01&end=2026-09-30 (site "
      + "statistics; fields also accepts histogram, pages, countries and referrers), GET /{domain}/{path}.json?version=6&fields=pageviews "
      + "(a specific page), GET /api/websites (sites in the account), GET /api/export/datapoints?version=6&format=csv&hostname="
      + "{domain}&start=2026-09-01&end=2026-09-30&type=pageviews&fields=added_iso,path&timezone=America%2FNew_York (CSV export), "
      + "POST /api/websites/add {\"hostname\": \"example.com\", \"public\": false, \"timezone\": \"America/New_York\"} "
      + "(Business plan or higher).",
  },
  {
    id: "sncf", name: "SNCF", category: "data",
    description: "French trains: stations, departures, journeys and disruptions",
    website: "https://numerique.sncf.com/startup/api/", docs: "https://doc.navitia.io/", logo: { simpleIcons: "sncf" },
    baseUrl: "https://api.sncf.com/v1",
    // Navitia: the token goes in as the HTTP Basic username and the password is left empty.
    auth: { type: "basic", usernameField: "token", fixedPassword: "" },
    fields: [{ id: "token", label: "SNCF API token", secret: true }],
    keyUrl: "https://numerique.sncf.com/startup/api/token-developpeur/",
    help: "1) Open the SNCF developer token page (button below) and request the free token with your email. 2) Copy it "
      + "here as is. Free access allows 5,000 requests per day and 150,000 per month. The API is Navitia's and everything is under the "
      + "sncf “coverage” (/coverage/sncf/…).",
    test: { path: "/coverage/sncf", message: "Token is valid" },
    examples: "Dates use the format YYYYMMDDTHHMMSS. Examples: GET /coverage/sncf/places?q=Paris+Gare+de+Lyon (searches stations and places and "
      + "returns their ids), GET /coverage/sncf/journeys?from={origin_id}&to={destination_id}&datetime=20261020T080000&count=3 (journeys), "
      + "GET /coverage/sncf/stop_areas/{station_id}/departures?from_datetime=20261020T080000&count=10 (departures; also /arrivals), "
      + "GET /coverage/sncf/disruptions?count=10 (disruptions), GET /coverage/sncf/lines?count=10 (lines). "
      + "Pagination: count and start_page.",
  },
  {
    // Covers both Composio products (snowflake and snowflake_basic): the SQL API only supports OAuth, a key pair or a programmatic access
    // token (PAT), not username and password. Snowflake OAuth is per account (its own security integration): it does not fit here.
    id: "snowflake", name: "Snowflake", category: "data",
    description: "Cloud data warehouse: SQL queries through the SQL API",
    website: "https://www.snowflake.com", docs: "https://docs.snowflake.com/en/developer-guide/sql-api/index",
    logo: { simpleIcons: "snowflake" },
    baseUrl: "{url}",
    headers: { "X-Snowflake-Authorization-Token-Type": "PROGRAMMATIC_ACCESS_TOKEN" },
    auth: { type: "bearer" },
    fields: [{ id: "url", label: "Your Snowflake account URL", format: "url",
               help: "The account URL, in the form https://orgname-accountname.snowflakecomputing.com (not the app.snowflake.com one)." },
             { id: "token", label: "Programmatic access token (PAT)", secret: true }],
    help: "Connects with a programmatic access token (PAT), without a username or password. 1) Find the account URL: in "
      + "Snowsight, your user menu (bottom left) → your account → “View account details” or “Copy account URL” (it looks like "
      + "https://myorg-myaccount.snowflakecomputing.com). 2) Generate the token: “Governance & security” → “Users & roles” → your user "
      + "(or a service user) → “Programmatic access tokens” → “Generate new token”. Choose the role it is restricted to (the token will only "
      + "have its permissions) and copy the secret: it is shown only once. 3) Snowflake requires the user to be subject to a "
      + "network policy that allows the public IP of this server; otherwise authentication fails. The token expires "
      + "(after 15 days by default).",
    test: { method: "POST", path: "/api/v2/statements",
              body: { statement: "SELECT CURRENT_USER(), CURRENT_ROLE(), CURRENT_ACCOUNT()", timeout: 60 },
              account: (d) => [d.data?.[0]?.[0], d.data?.[0]?.[1]].filter(Boolean).join(" · ") },
    examples: "Examples: POST /api/v2/statements {\"statement\": \"SELECT * FROM my_table LIMIT 10\", \"warehouse\": \"MY_WAREHOUSE\", "
      + "\"database\": \"MY_DB\", \"schema\": \"PUBLIC\", \"role\": \"MY_ROLE\", \"timeout\": 60} (the result is in data; if it is large, "
      + "it arrives in parts: GET /api/v2/statements/{statementHandle}?partition=1), POST /api/v2/statements?async=true (returns the "
      + "statementHandle without waiting), GET /api/v2/statements/{statementHandle} (status and result), "
      + "POST /api/v2/statements/{statementHandle}/cancel, GET /api/v2/databases (databases visible to the role).",
  },
  {
    id: "solcast", name: "Solcast", category: "data",
    description: "Solar radiation, weather and photovoltaic power forecasts",
    website: "https://solcast.com", docs: "https://docs.solcast.com.au", logo: { favicon: "https://solcast.com" },
    baseUrl: "https://api.solcast.com.au",
    query: { format: "json" },
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://toolkit.solcast.com.au/account/api-key",
    help: "1) Create an account at toolkit.solcast.com.au and sign in (there is a free “Hobbyist” account, for non-commercial use and with "
      + "a daily call limit; access to data for any coordinates depends on the plan or free trial you have). "
      + "2) Open your API key page (button below) and copy it. The connection test uses one of Solcast's test locations "
      + "(Sydney Opera House), which do not use calls.",
    test: { path: "/data/forecast/radiation_and_weather",
              query: { latitude: -33.8567, longitude: 151.2152, hours: 1, output_parameters: "ghi" },
              acceptStatus: [403, 429], message: "API key is valid" },
    examples: "Coordinates go in latitude and longitude (decimal degrees) and format=json is added automatically. Examples: "
      + "GET /data/live/radiation_and_weather?latitude=40.42&longitude=-3.70&hours=24&output_parameters=ghi,dni,dhi,air_temp "
      + "(recent estimates), GET /data/forecast/radiation_and_weather?latitude=…&longitude=…&hours=48&output_parameters="
      + "ghi,dni,air_temp,cloud_opacity (forecast), GET /data/historic/radiation_and_weather?latitude=…&longitude=…&start="
      + "2026-09-01T00:00:00Z&duration=P7D&output_parameters=ghi (historical), GET /data/live/rooftop_pv_power?latitude=…&longitude=…"
      + "&capacity=5&tilt=30&azimuth=…&install_date=2020-01-01 (power of an installation; also /data/forecast/ and /data/historic/). "
      + "Solcast's test locations (e.g. latitude=-33.8567, longitude=151.2152) do not use calls.",
  },
  {
    id: "stormglass", name: "Storm Glass", category: "data",
    description: "Marine and weather forecasts: waves, wind, tides and astronomy",
    website: "https://stormglass.io", docs: "https://docs.stormglass.io", logo: { favicon: "https://stormglass.io" },
    baseUrl: "https://api.stormglass.io/v2",
    auth: { type: "header", name: "Authorization" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://dashboard.stormglass.io",
    help: "1) Sign up at dashboard.stormglass.io (the free plan allows 10 requests per day) and sign in. 2) Copy your API key "
      + "from the dashboard. “Test connection” makes a forecast request, which counts toward the daily limit.",
    test: { path: "/weather/point", query: { lat: 40.42, lng: -3.7, params: "airTemperature" }, message: "API key is valid" },
    examples: "Examples: GET /weather/point?lat=40.42&lng=-3.70&params=airTemperature,windSpeed,waveHeight,swellHeight,waterTemperature"
      + "&start=2026-10-16T00:00:00Z&end=2026-10-17T00:00:00Z (hourly forecast; start and end in UTC), "
      + "GET /tide/extremes/point?lat=…&lng=… (high and low tides), GET /tide/sea-level/point?lat=…&lng=…, "
      + "GET /astronomy/point?lat=…&lng=… (sun and moon), GET /solar/point?lat=…&lng=…&params=uvIndex, GET /elevation/point?lat=…&lng=…. "
      + "Each request uses up one of the plan's daily requests.",
  },
  {
    id: "supadata", name: "Supadata", category: "data",
    description: "Video transcripts, YouTube data and web extraction",
    website: "https://supadata.ai", docs: "https://docs.supadata.ai", logo: { favicon: "https://supadata.ai" },
    baseUrl: "https://api.supadata.ai/v1",
    auth: { type: "header", name: "x-api-key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://dash.supadata.ai",
    help: "1) Create an account at dash.supadata.ai (there is a free plan with credits). 2) The API key is generated when you sign up and "
      + "appears in the dashboard. 3) Copy it here. The connection test only fetches your organization and credit usage.",
    test: { path: "/me",
              message: (d) => (d?.maxCredits != null ? `Plan ${d.plan || "—"}: ${d.usedCredits ?? 0} of ${d.maxCredits} credits used`
                : "API key is valid") },
    examples: "Examples: GET /transcript?url=https://www.youtube.com/watch?v=…&text=true&lang=en (YouTube, TikTok, Instagram, X or a "
      + "file; if it is long it returns a jobId and is queried with GET /transcript/{jobId}), GET /youtube/video?id=…, "
      + "GET /youtube/channel?id=…, GET /youtube/playlist?id=…, GET /youtube/search?query=…, "
      + "GET /metadata?url=… (metadata of a post), "
      + "GET /web/scrape?url=https://… (content as Markdown), GET /web/map?url=https://… (all the links of the site), "
      + "POST /web/crawl {\"url\": \"https://…\", \"limit\": 20} and GET /web/crawl/{jobId} (result). They use plan credits.",
  },
  {
    id: "tableau", name: "Tableau", category: "data",
    description: "Reports and dashboards: workbooks, views, data and users",
    website: "https://www.tableau.com", docs: "https://help.tableau.com/current/api/rest_api/en-us/REST/rest_api.htm",
    logo: { favicon: "https://www.tableau.com" },
    baseUrl: "{server}/api/{version}",
    auth: { type: "custom", apply: async (c) => ({ headers: { "X-Tableau-Auth": (await getTableauSession(c)).token } }) },
    fields: [{ id: "server", label: "Your Tableau URL (Cloud or Server)", format: "url",
               help: "Only the beginning of the address, e.g. https://10ax.online.tableau.com (Tableau Cloud) or "
                 + "https://tableau.example.com (Server), without anything after it." },
             { id: "site", label: "Site (contentUrl)", optional: true,
               help: "The site name in the address (what comes after /site/, e.g. mycompany). On Tableau Server leave it empty to "
                 + "use the default site." },
             { id: "token_name", label: "Personal access token name" },
             { id: "token_secret", label: "Token secret", secret: true },
             { id: "version", label: "REST API version", default: "3.19", optional: true,
               help: "3.19 works on Tableau Cloud and on Tableau Server 2023.1 or later; if your server is older, enter a "
                 + "lower version." }],
    help: "1) In Tableau open your avatar menu → “My Account Settings” → “Personal Access Tokens”. 2) Enter a name (e.g. "
      + "“Conector”) and click “Create token”. Copy the secret: it is shown only once. 3) Fill in your Tableau URL, the site, "
      + "the token name and its secret. Each token allows only one session at a time (do not use it in another tool at the same time) and expires "
      + "after 15 days without use. On Tableau Cloud, an administrator may have disabled personal tokens.",
    test: { path: "/serverinfo",
              message: (d) => (d?.serverInfo?.productVersion?.value ? `Signed in · Tableau ${d.serverInfo.productVersion.value}`
                : "Signed in") },
    examples: "Almost all paths start with /sites/{siteId}: get that id with the tableau_session tool. Examples: "
      + "GET /sites/{siteId}/workbooks?pageSize=100 (workbooks), GET /sites/{siteId}/views?pageSize=100 (views), "
      + "GET /sites/{siteId}/datasources, GET /sites/{siteId}/projects, GET /sites/{siteId}/users, "
      + "GET /sites/{siteId}/workbooks/{workbookId}/views, "
      + "GET /sites/{siteId}/views/{viewId}/data (view data as CSV), GET /sites/{siteId}/views/{viewId}/image (PNG image), "
      + "GET /serverinfo (version). Pagination with pageSize and pageNumber; filters such as filter=name:eq:Sales.",
    tools: [
      { name: "tableau_session", title: "Tableau: session site and user", annotations: { readOnlyHint: true },
        description: "Signs in to Tableau (if needed) and returns the site and user ids (LUID), the site name and the "
          + "REST API version. Use it first: almost all API paths start with /sites/{siteId}.",
        schema: {},
        async run(_args, p) {
          ensureOk(await p({ path: "/serverinfo" }), "Tableau");
          const s = await tableauSession.promise;
          return { site_id: s.siteId, user_id: s.userId, site: s.site || "(default site)", api_version: s.version };
        } },
    ],
  },
  {
    id: "taggun", name: "Taggun", category: "finance",
    description: "Receipt and invoice OCR: merchant, date, total, taxes, line items",
    website: "https://www.taggun.io", docs: "https://developers.taggun.io", logo: { favicon: "https://www.taggun.io" },
    baseUrl: "https://api.taggun.io",
    auth: { type: "header", name: "apikey" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://www.taggun.io/account",
    help: "1) Sign up at taggun.io: the API key arrives by email when you create the account and also appears in your account (button "
      + "below). 2) Copy it here. The connection test queries the validation campaigns, which do not use scans; that query is for "
      + "advanced plans and with a valid key it may return 400, which is accepted as success.",
    test: { path: "/api/validation/v1/campaign/settings/list", acceptStatus: [400], message: "API key is valid" },
    examples: "Each scan uses one credit. Examples: POST /api/receipt/v1/simple/url {\"url\": \"https://…/receipt.jpg\", \"language\": "
      + "\"en\"} (merchant, date, total and taxes of a receipt reachable over https), POST /api/receipt/v1/verbose/url (adds line "
      + "items and per-field confidence), POST /api/receipt/v1/simple/encoded {\"image\": \"<base64>\", \"filename\": \"receipt.jpg\", "
      + "\"contentType\": \"image/jpeg\"} (also /verbose/encoded; accepts PDF). Multipart file upload (/file) is not "
      + "available here: use url or encoded.",
  },
  {
    id: "tally", name: "Tally", category: "productivity",
    description: "Forms: responses, workspaces and webhooks",
    website: "https://tally.so", docs: "https://developers.tally.so", logo: { favicon: "https://tally.so" },
    baseUrl: "https://api.tally.so",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key (tly-…)", secret: true }],
    keyUrl: "https://tally.so/settings/api-keys",
    help: "1) Sign in at tally.so and open “Settings” → “API keys” (button below). 2) Click “Create API key”, give it a name and "
      + "copy the key (it starts with tly-; it is not shown again). The API allows 100 requests per minute.",
    test: { path: "/users/me", account: (d) => d.email || d.fullName },
    examples: "Examples: GET /forms (forms), GET /forms/{formId}, GET /forms/{formId}/submissions?page=1&filter=all (responses; "
      + "filter: all, completed or partial), GET /forms/{formId}/submissions/{submissionId}, GET /workspaces, GET /webhooks, "
      + "POST /webhooks {\"formId\": \"…\", \"url\": \"https://…\", \"eventTypes\": [\"FORM_RESPONSE\"]}, "
      + "GET /organizations/{organizationId}/users.",
  },
  {
    id: "theoddsapi", name: "The Odds API", category: "data",
    description: "Sports odds, events and scores from bookmakers",
    website: "https://the-odds-api.com", docs: "https://the-odds-api.com/liveapi/guides/v4/", logo: { favicon: "https://the-odds-api.com" },
    baseUrl: "https://api.the-odds-api.com/v4",
    auth: { type: "query", name: "apiKey" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://the-odds-api.com/#get-access",
    help: "1) At the-odds-api.com request a key with the “Get API Key” button (button below): choose the free plan and enter your email. "
      + "2) The key arrives by email; copy it here. Odds queries use credits (depending on regions and markets); the list of "
      + "sports and the list of events are free.",
    test: { path: "/sports", message: (d) => (Array.isArray(d) ? `${d.length} sports available` : "API key is valid") },
    examples: "Sport keys come from GET /sports (e.g. soccer_spain_la_liga, basketball_nba, tennis_atp_wimbledon). Examples: "
      + "GET /sports (free), GET /sports/{sport}/events (free), GET /sports/{sport}/odds?regions=eu&markets=h2h&oddsFormat=decimal "
      + "(1 credit per region and market), GET /sports/{sport}/scores?daysFrom=1, "
      + "GET /sports/{sport}/events/{eventId}/odds?regions=eu&markets=h2h,totals.",
  },
  {
    id: "tomtom", name: "TomTom", category: "data",
    description: "Maps: geocoding, place search, routing and traffic",
    website: "https://developer.tomtom.com", docs: "https://docs.tomtom.com", logo: { simpleIcons: "tomtom" },
    baseUrl: "https://api.tomtom.com",
    auth: { type: "query", name: "key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://developer.tomtom.com/user/me/apps",
    help: "1) Create a free account at developer.tomtom.com and sign in. 2) Open your dashboard (“Dashboard” → “Keys”, button below): "
      + "a key is already created by default; you can also create another with “Add a new key” and select the APIs you need (Search, "
      + "Routing, Traffic…). 3) Copy it here. The free plan includes about 2,500 requests per day.",
    test: { path: "/search/2/geocode/London.json", query: { limit: 1 }, message: "API key is valid" },
    examples: "Examples: GET /search/2/geocode/{query}.json?limit=5&countrySet=US&language=en-US, "
      + "GET /search/2/reverseGeocode/{lat},{lon}.json, GET /search/2/poiSearch/{query}.json?lat=…&lon=…&radius=2000&limit=10, "
      + "GET /routing/1/calculateRoute/{lat1},{lon1}:{lat2},{lon2}/json?travelMode=car&traffic=true, "
      + "GET /traffic/services/4/flowSegmentData/absolute/10/json?point={lat},{lon} (traffic at a point).",
  },
  {
    id: "truelist", name: "TrueList", category: "crm",
    description: "Email validation: single, batch and history",
    website: "https://truelist.io", docs: "https://truelist.io/docs/api", logo: { favicon: "https://truelist.io" },
    baseUrl: "https://api.truelist.io/api/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://app.truelist.io/settings/api-keys",
    help: "1) Sign in at app.truelist.io (create the account if you do not have one) and open “Settings” → “API keys” (button below). 2) Create a "
      + "key and copy it here. Each validation uses plan credits; the connection test only fetches the account. The API allows 10 "
      + "requests per second.",
    test: { path: "/account", account: (d) => d.email || d.user?.email || d.account?.name || d.name, message: "API key is valid" },
    examples: "Examples: POST /verify_inline?email=you@example.com (validates an email instantly; returns state: ok, email_invalid, "
      + "accept_all or unknown, plus sub_state and a suggestion), GET /batches (validation batches), GET /batches/{id} (status and count), "
      + "GET /account (account).",
  },
  {
    id: "turso", name: "Turso", category: "developer",
    description: "Cloud SQLite databases: organizations, databases and tokens",
    website: "https://turso.tech", docs: "https://docs.turso.tech/api-reference/introduction", logo: { simpleIcons: "turso" },
    baseUrl: "https://api.turso.tech/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "Platform API token", secret: true }],
    keyUrl: "https://app.turso.tech",
    help: "1) Create a platform API token: in the Turso dashboard (button below) open your avatar menu → “Settings” and create "
      + "a token, or with the CLI: turso auth api-tokens mint conector --org <your-organization> (restricts the token to one organization). "
      + "2) Copy the token: it is shown only once. This API manages organizations, groups and databases; to run SQL you "
      + "use each database's URL with a database token, which is created from here.",
    test: { path: "/organizations", acceptStatus: [403], message: "API token is valid",
              account: (d) => (Array.isArray(d) ? d : d?.organizations)?.map((o) => o.slug).join(", ") },
    examples: "Almost all paths include the organization slug (GET /organizations gives it; if the token belongs to a single organization "
      + "and cannot list them, ask the user for it). Examples: GET /organizations/{org}/databases, "
      + "GET /organizations/{org}/databases/{database}, "
      + "POST /organizations/{org}/databases {\"name\": \"my-database\", \"group\": \"default\"}, "
      + "POST /organizations/{org}/databases/{database}/auth/tokens?expiration=7d&authorization=read-only (database token; it comes in "
      + "jwt), GET /organizations/{org}/groups, GET /locations (available regions).",
  },
  {
    id: "webcrawlerapi", name: "WebCrawlerAPI", category: "data",
    description: "Website crawling and extraction to Markdown, HTML or clean text",
    website: "https://webcrawlerapi.com", docs: "https://webcrawlerapi.com/docs", logo: { favicon: "https://webcrawlerapi.com" },
    baseUrl: "https://api.webcrawlerapi.com",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://dash.webcrawlerapi.com/access",
    help: "1) Sign up at dash.webcrawlerapi.com and sign in. 2) Open “Access” (button below), create an API key and copy it "
      + "here. Crawling and extracting use credits; the connection test only queries a nonexistent job (if it answers “not found”, "
      + "the key is valid).",
    test: { path: "/v1/job/00000000-0000-4000-8000-000000000000", acceptStatus: [400, 403, 404, 422], message: "API key is valid" },
    examples: "Examples: POST /v2/scrape {\"url\": \"https://example.com\", \"output_formats\": [\"markdown\"]} (one page, in the same "
      + "response), POST /v1/crawl {\"url\": \"https://example.com\", \"items_limit\": 10, \"max_depth\": 2, \"output_formats\": "
      + "[\"markdown\"]} (asynchronous crawl: returns an id), GET /v1/job/{id} (status and pages; status: new, in_progress, done or error). "
      + "output_formats accepts markdown, cleaned, html and links; also whitelist_regexp, blacklist_regexp and webhook_url.",
  },
  {
    id: "webscrapingai", name: "WebScraping.AI", category: "data",
    description: "Web scraping with JavaScript and proxies, plus AI extraction",
    website: "https://webscraping.ai", docs: "https://webscraping.ai/docs", logo: { favicon: "https://webscraping.ai" },
    baseUrl: "https://api.webscraping.ai",
    auth: { type: "query", name: "api_key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://webscraping.ai/dashboard",
    help: "1) Create an account at webscraping.ai (the free plan includes trial credits) and sign in. 2) The API key "
      + "appears in the dashboard (button below). 3) Copy it here. The connection test checks the account balance and uses no credits.",
    test: { path: "/account", account: (d) => d.email,
              message: (d) => (d?.remaining_total_credits != null ? `${d.remaining_total_credits} credits remaining`
                : "API key is valid") },
    examples: "Examples: GET /html?url=https://example.com&js=true (rendered HTML), GET /text?url=…&text_format=plain, "
      + "GET /selected?url=…&selector=h1, GET /selected-multiple?url=…&selectors=h1&selectors=.price, "
      + "GET /ai/question?url=…&question=How much does the basic plan cost?, GET /ai/fields?url=…&fields[title]=article title"
      + "&fields[price]=price with currency, GET /account (remaining credits; free). Options: proxy=residential, country=us, "
      + "device=mobile, wait_for=.selector, timeout (max 25000 ms) and js_timeout.",
  },
  {
    id: "whoisfreaks", name: "WhoisFreaks", category: "data",
    description: "WHOIS, DNS, SSL, domain availability and IP geolocation",
    website: "https://whoisfreaks.com", docs: "https://whoisfreaks.com/documentation", logo: { favicon: "https://whoisfreaks.com" },
    baseUrl: "https://api.whoisfreaks.com",
    auth: { type: "query", name: "apiKey" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://billing.whoisfreaks.com/",
    help: "1) Create an account at billing.whoisfreaks.com (the free plan includes trial credits) and sign in. 2) The production API "
      + "key appears in the dashboard (button below): it works for all the APIs and does not expire. 3) Copy it here. Each query "
      + "uses credits; the connection test only checks the key's usage.",
    test: { path: "/v1.0/whoisapi/usage", message: "API key is valid" },
    examples: "Examples: GET /v2.0/whois/live?whois=live&domainName=example.com (live WHOIS), "
      + "GET /v2.0/dns/live?domainName=example.com&type=all (DNS records; type also accepts A,MX,NS,TXT…), "
      + "GET /v1.0/ssl/live?domainName=example.com (SSL certificate; chain=true for the chain), "
      + "GET /v2.0/domain/availability?domain=example.com&sug=true&count=5 (availability and alternatives), "
      + "GET /v1.0/geolocation?ip=8.8.8.8 (IP geolocation), GET /v1.0/whoisapi/usage (key usage).",
  },
  {
    id: "windsorai", name: "Windsor.ai", category: "marketing",
    description: "Advertising, CRM and e-commerce data from many sources",
    website: "https://windsor.ai", docs: "https://windsor.ai/api-documentation/", logo: { favicon: "https://windsor.ai" },
    baseUrl: "https://connectors.windsor.ai",
    auth: { type: "query", name: "api_key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://onboard.windsor.ai/app/data-preview",
    help: "1) Sign in at onboard.windsor.ai (create the account if you do not have one) and connect at least one data source. 2) Open “Data "
      + "Preview” (button below): the API key is the api_key value in the API URL shown there. 3) Copy it here. "
      + "The API allows 600 requests per minute and 10,000 per day.",
    test: { path: "/airtable/fields", message: "API key is valid" },
    examples: "The connector goes in the path (lowercase, e.g. facebook, google_ads, googleanalytics4, linkedin) and /all queries several at "
      + "once. Examples: GET /list_connectors (available connectors), GET /facebook/fields (fields; with the key it includes the "
      + "custom ones), GET /facebook?fields=date,campaign,spend,clicks&date_preset=last_30d (data), "
      + "GET /google_ads?fields=date,campaign,cost&date_from=2026-09-01&date_to=2026-09-30&_max_rows=500, "
      + "filters with filter=[[\"spend\",\"gt\",100]] (JSON), select_accounts=id1,id2 and _renderer=csv.",
  },
  {
    id: "wolframalpha", name: "Wolfram|Alpha", category: "data",
    description: "Answers for computation, math, science and data (Wolfram|Alpha)",
    website: "https://www.wolframalpha.com", docs: "https://products.wolframalpha.com/api/documentation",
    logo: { favicon: "https://www.wolframalpha.com" },
    baseUrl: "https://api.wolframalpha.com", allowedOrigins: ["https://www.wolframalpha.com"],
    auth: { type: "query", name: "appid" },
    fields: [{ id: "token", label: "AppID", secret: true }],
    keyUrl: "https://developer.wolframalpha.com",
    help: "1) Sign in at developer.wolframalpha.com (button below) with your Wolfram ID; create one for free if you do not have one. 2) In “My Apps” "
      + "click “Get an AppID”, name it “Conector”, add a short description and choose the type of API you will use most. "
      + "3) Copy the AppID (it may take a few minutes to start working). The free account is for non-commercial use, with about 2,000 queries "
      + "per month. The connection test sends a query with no question (a 400 is expected) and should not use any queries.",
    test: { path: "/v1/result", acceptStatus: [400, 501], message: "AppID is valid" },
    examples: "Wolfram|Alpha understands questions in English best. Examples: GET /v1/result?i=population of London (short answer as "
      + "text), GET /v1/spoken?i=… (spoken sentence), GET /v1/simple?i=… (image), GET /v2/query?input=integrate x^2&output=json"
      + "&format=plaintext (full results by section), GET https://www.wolframalpha.com/api/v1/llm-api?input=… (text "
      + "designed for language models; maxchars limits the length). Options: units=metric, timeout.",
  },
  {
    id: "worldnewsapi", name: "World News API", category: "data",
    description: "News from thousands of sources in 50+ languages: search, extraction",
    website: "https://worldnewsapi.com", docs: "https://worldnewsapi.com/docs/", logo: { favicon: "https://worldnewsapi.com" },
    baseUrl: "https://api.worldnewsapi.com",
    auth: { type: "header", name: "x-api-key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://worldnewsapi.com/console/",
    help: "1) Sign up for free at worldnewsapi.com and sign in. 2) Open your console (“My Console”, button below) and copy the "
      + "API key. The free plan includes 50 points per day; each request uses points (the test request uses only a few).",
    test: { path: "/search-news", query: { text: "cybersecurity", language: "en", number: 1 }, message: "API key is valid" },
    examples: "Examples: GET /search-news?text=cybersecurity&language=en&source-country=us&number=10&sort=publish-time"
      + "&sort-direction=DESC, GET /top-news?source-country=us&language=en&date=2026-10-15 (front page of the day), "
      + "GET /retrieve-news?ids=123,456, "
      + "GET /extract-news?url=https://… (text of a news article), GET /extract-news-links?url=https://…, "
      + "GET /search-news-sources?name=new+york+times, GET /geo-coordinates?location=London, GET /retrieve-front-page?source-country=us.",
  },
];
