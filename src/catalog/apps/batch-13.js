// Batch 13 of the Composio catalog: data and analytics (addresses, IP and WHOIS, data quality, maps, stock market and web extraction).
// Not included: Ipinfo io (the “ipinfo” app already exists).

// Kibana accepts an API key (“ApiKey” header) or, if there is none, a username and password (basic auth).
function kibanaAccess(c) {
  if (c.token) return { headers: { Authorization: `ApiKey ${c.token}` } };
  if (c.username && c.key) return { headers: { Authorization: `Basic ${Buffer.from(`${c.username}:${c.key}`).toString("base64")}` } };
  throw new Error("Kibana: enter an API key or a username and password");
}

// Mapflow: new tokens are JWTs (Bearer) and old ones are “email:token” in base64 (Basic).
function mapflowAccess(c) {
  const token = String(c.token).trim().replace(/^(?:Bearer|Basic)\s+/i, "");
  return { headers: { Authorization: /^[\w-]+\.[\w-]+\.[\w-]*$/.test(token) ? `Bearer ${token}` : `Basic ${token}` } };
}

// IP2Location (classic web service): “check” returns the remaining credits, or null / an error text if the key is not valid.
const ip2locationResponse = (d) => (d !== null && typeof d === "object" ? d.response : d);

export default [
  {
    id: "idealpostcodes", name: "Ideal Postcodes", category: "data",
    description: "UK addresses and postcodes: search and validation",
    website: "https://ideal-postcodes.co.uk", docs: "https://docs.ideal-postcodes.co.uk/docs/api/api-reference",
    logo: { favicon: "https://ideal-postcodes.co.uk" },
    baseUrl: "https://api.ideal-postcodes.co.uk",
    auth: { type: "query", name: "api_key" },
    fields: [{ id: "token", label: "API key (ak_…)", secret: true }],
    keyUrl: "https://account.ideal-postcodes.co.uk/tokens",
    help: "1) Create an account at ideal-postcodes.co.uk and sign in to its dashboard (new accounts come with a trial balance). "
      + "2) Open your organization's keys and copy the API key (it starts with “ak_”). 3) Paste it here. If the key restricts "
      + "the allowed URLs or IPs, remove those restrictions: requests are sent from Conector. Each search that returns "
      + "addresses deducts from your balance.",
    // A postcode that does not exist returns 404 without using balance: it works for checking the key (a bad key returns 401).
    test: { path: "/v1/postcodes/ID1KFA", acceptStatus: [400, 404], message: "API key is valid (the test search uses no balance)" },
    examples: "Examples: GET /v1/postcodes/SW1A2AA (addresses for a postcode; uses 1 search if there are results), "
      + "GET /v1/autocomplete/addresses?query=10 downing (suggestions while typing an address), "
      + "GET /v1/autocomplete/addresses/{id}/gbr (full address for a suggestion; uses 1 search), "
      + "GET /v1/keys/{key} (key availability, free).",
  },
  {
    id: "influxdbcloud", name: "InfluxDB Cloud", category: "data",
    description: "Managed time series: buckets, Flux queries and writes",
    website: "https://www.influxdata.com", docs: "https://docs.influxdata.com/influxdb/cloud/api/", logo: { simpleIcons: "influxdb" },
    baseUrl: "{url}",
    auth: { type: "header", name: "Authorization", prefix: "Token " },
    fields: [{ id: "url", label: "URL of your InfluxDB Cloud region (https://…)", format: "url",
               example: "https://us-east-1-1.aws.cloud2.influxdata.com",
               help: "Only the address, with nothing after .com, e.g. https://us-east-1-1.aws.cloud2.influxdata.com." },
             { id: "token", label: "API token", secret: true }],
    help: "1) Sign in to InfluxDB Cloud: the address you see in the browser (e.g. https://us-east-1-1.aws.cloud2.influxdata.com) is the "
      + "URL of your region; copy only up to “.com”. 2) Open “Load Data” (or “Data”) → “API Tokens” → “Generate API Token” and choose “All "
      + "Access API Token” (or a custom one with read or write access to the buckets you need and read access to “Buckets”). "
      + "3) Copy the token right away: it is shown only once.",
    test: { path: "/api/v2/buckets", query: { limit: 1 }, message: "Token is valid" },
    examples: "Examples: GET /api/v2/buckets (buckets), GET /api/v2/orgs (organizations), "
      + "POST /api/v2/query {\"query\": \"from(bucket: \\\"my-bucket\\\") |> range(start: -1h)\", \"type\": \"flux\"} with the header "
      + "Accept application/csv (Flux query; the organization is inferred from the token and the response is annotated CSV), "
      + "POST /api/v2/write?bucket=MY_BUCKET&precision=s with body_base64 and content_type text/plain (line protocol, "
      + "e.g. “temperature,room=1 value=21.5”).",
  },
  {
    id: "interzoid", name: "Interzoid", category: "data",
    description: "Data quality: matching, standardization and enrichment",
    website: "https://www.interzoid.com", docs: "https://www.interzoid.com/cloud-api-directory",
    logo: { image: "https://github.com/interzoid.png" },
    baseUrl: "https://api.interzoid.com",
    auth: { type: "header", name: "x-api-key" },
    fields: [{ id: "token", label: "API license key", secret: true }],
    keyUrl: "https://www.interzoid.com/manage-api-account",
    help: "1) Sign up for free at interzoid.com (the account includes trial credits). 2) Open “Manage Your Account” and copy your "
      + "API license key: it is a single key for the whole platform. 3) Paste it here. Each API call uses credits from that "
      + "balance; the connection test only checks how many credits you have left.",
    test: { path: "/getremainingcredits",
              message: (d) => {
                const n = Number(d?.Credits);
                return Number.isFinite(n) ? `API key is valid: ${n.toLocaleString("en-US")} credits remaining` : "API key is valid";
              } },
    examples: "Examples: GET /getremainingcredits (remaining credits), "
      + "GET /getbusinessinfo?lookup=Cisco (company data by name, domain or email), "
      + "GET /getcompanymatchadvanced?company=IBM&algorithm=model-v4-wide (company match key), "
      + "GET /emailtrustscore?lookup=you@example.com, GET /getipprofile?lookup=8.8.8.8.",
  },
  {
    id: "ip2location", name: "IP2Location (classic web service)", category: "data",
    description: "IP geolocation with the classic web service (legacy keys)",
    website: "https://www.ip2location.com", docs: "https://www.ip2location.com/web-service/ip2location",
    logo: { favicon: "https://www.ip2location.com" },
    baseUrl: "https://api.ip2location.com",
    auth: { type: "query", name: "key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) This connector is for the classic ip2location.com web service, which no longer accepts new sign-ups: it only works if you "
      + "already have a key for that service. If you do not have one, use the “IP2Location.io” connector. 2) In your ip2location.com "
      + "account (“Client Portal”) copy your API key. 3) Paste it here. Each query uses credits depending on the chosen package (WS1 to WS25).",
    test: { path: "/v2/", query: { check: 1 },
              validate: (d) => {
                const v = ip2locationResponse(d);
                if (v === null || v === undefined || /invalid|insufficient|disabled|expired|error/i.test(String(v))) {
                  throw new Error(`IP2Location: ${typeof v === "string" && v ? v : "the API key is not valid"}`);
                }
              },
              message: (d) => {
                const n = Number(ip2locationResponse(d));
                return Number.isFinite(n) ? `API key is valid: ${n.toLocaleString("en-US")} credits remaining` : "API key is valid";
              } },
    examples: "Examples: GET /v2/?ip=8.8.8.8&package=WS5 (country, region, city and coordinates), "
      + "GET /v2/?ip=8.8.8.8&package=WS25&addon=continent,country (more data and add-ons), GET /v2/?check=1 (remaining credits). "
      + "The package parameter (WS1 to WS25) determines the data returned and the credits used.",
  },
  {
    id: "ip2locationio", name: "IP2Location.io", category: "data",
    description: "IP geolocation: country, city, ASN, proxy and time zone",
    website: "https://www.ip2location.io", docs: "https://www.ip2location.io/ip2location-documentation",
    logo: { favicon: "https://www.ip2location.io" },
    baseUrl: "https://api.ip2location.io",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://www.ip2location.io/dashboard",
    help: "1) Create a free account at ip2location.io (includes 50,000 queries per month). 2) Open the dashboard (“Dashboard”) and copy "
      + "your API key. 3) Paste it here. Each IP query counts toward your plan's monthly limit; languages other "
      + "than English require a paid plan.",
    test: { path: "/", query: { ip: "8.8.8.8" }, message: "API key is valid" },
    examples: "Examples: GET /?ip=8.8.8.8 (country, region, city, coordinates, time zone and ASN), GET /?ip=2001:4860:4860::8888 (IPv6), "
      + "GET /?ip=8.8.8.8&lang=es (translated names, paid plans only), GET / (the IP Conector calls from).",
  },
  {
    id: "ip2whois", name: "IP2WHOIS", category: "data",
    description: "Domain WHOIS: registration, expiry, contacts and DNS servers",
    website: "https://www.ip2whois.com", docs: "https://www.ip2location.io/ip2whois-documentation",
    logo: { favicon: "https://www.ip2whois.com" },
    baseUrl: "https://api.ip2whois.com",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://www.ip2location.io/dashboard",
    help: "1) Create a free account at ip2location.io: IP2WHOIS is managed with that same account (the free plan "
      + "includes 500 queries per month). 2) Open the dashboard (“Dashboard”) and copy your API key. 3) Paste it here. Each WHOIS query "
      + "counts toward your plan's monthly limit, including the connection test.",
    test: { path: "/v2", query: { domain: "example.com" }, message: "API key is valid" },
    examples: "Examples: GET /v2?domain=example.com (creation and expiry dates, registrar, registrant and DNS servers), "
      + "GET /v2?domain=example.com&format=json.",
  },
  {
    id: "ipregistry", name: "Ipregistry", category: "data",
    description: "IP intelligence: location, network, carrier, threats, user agent",
    website: "https://ipregistry.co", docs: "https://ipregistry.co/docs", logo: { favicon: "https://ipregistry.co" },
    baseUrl: "https://api.ipregistry.co", allowedOrigins: ["https://eu.api.ipregistry.co"],
    auth: { type: "header", name: "Authorization", prefix: "ApiKey " },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://dashboard.ipregistry.co/keys",
    help: "1) Create an account at ipregistry.co (includes 20,000 free credits) and open the dashboard. 2) Open “API Keys” and copy your "
      + "API key. 3) Paste it here. Each query uses 1 credit (batch queries, one credit per IP plus one). If the key has "
      + "IP restrictions, remove them: requests are sent from Conector.",
    test: { path: "/8.8.8.8", message: "API key is valid" },
    examples: "Examples: GET /8.8.8.8 (location, network, carrier, threats), GET /8.8.8.8,1.1.1.1 (several IPs in one call), "
      + "GET / (the IP Conector calls from), GET /AS15169 (autonomous system), GET /user_agent (parses the user-agent of the "
      + "request). The EU base URL is https://eu.api.ipregistry.co.",
  },
  {
    id: "ipdataco", name: "ipdata", category: "data",
    description: "Geolocation, owner and threat data for any IP address",
    website: "https://ipdata.co", docs: "https://docs.ipdata.co", logo: { favicon: "https://ipdata.co" },
    baseUrl: "https://api.ipdata.co", allowedOrigins: ["https://eu-api.ipdata.co"],
    auth: { type: "query", name: "api-key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://dashboard.ipdata.co/api.html",
    help: "1) Create a free account at ipdata.co (1,500 daily queries, for non-commercial use only) and sign in. 2) Open the "
      + "“API Key” page of the dashboard and copy your key. 3) Paste it here. Each IP queried counts as one request of your daily quota; "
      + "batch queries are a paid feature.",
    test: { path: "/8.8.8.8", query: { fields: "ip,country_name" }, message: "API key is valid" },
    examples: "Examples: GET /8.8.8.8 (location, ASN, company, time zone and threats), "
      + "GET /8.8.8.8?fields=ip,city,region,country_name,asn (only those fields), GET /8.8.8.8/country_name (a single field), "
      + "GET / (the IP Conector calls from). The EU endpoint is https://eu-api.ipdata.co.",
  },
  {
    id: "ipgeolocation", name: "IPGeolocation.io", category: "data",
    description: "IP geolocation, ASN, time zone, threats and user agent",
    website: "https://ipgeolocation.io", docs: "https://ipgeolocation.io/documentation.html", logo: { favicon: "https://ipgeolocation.io" },
    baseUrl: "https://api.ipgeolocation.io",
    auth: { type: "query", name: "apiKey" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://app.ipgeolocation.io/dashboard",
    help: "1) Create a free account at ipgeolocation.io (Developer plan: 1,000 credits per day) and sign in. 2) In the dashboard "
      + "(“Dashboard”), “API Keys” section, copy your API key. 3) Paste it here. Each geolocation query uses 1 credit; "
      + "other languages and the security and abuse modules require a paid plan.",
    test: { path: "/v3/ipgeo", query: { ip: "8.8.8.8" }, message: "API key is valid" },
    examples: "Examples: GET /v3/ipgeo?ip=8.8.8.8 (location, ASN, company, currency and time zone), "
      + "GET /v3/ipgeo?ip=8.8.8.8&fields=location.country_name,asn.organization (only those fields), "
      + "GET /v3/ipgeo?ip=8.8.8.8&include=security (threats, paid plans), GET /v3/timezone?tz=America/New_York (local time), "
      + "GET /v3/getip (public IP of Conector, no key needed).",
  },
  {
    id: "iplocate", name: "IPLocate", category: "data",
    description: "IP geolocation, network, privacy, hosting and abuse contact",
    website: "https://www.iplocate.io", docs: "https://www.iplocate.io/docs", logo: { favicon: "https://www.iplocate.io" },
    baseUrl: "https://iplocate.io",
    auth: { type: "header", name: "X-API-Key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://www.iplocate.io/account",
    help: "1) Create a free account at iplocate.io (1,000 queries per day) and sign in. 2) Open your account and copy the API "
      + "key. 3) Paste it here. Each IP query counts toward your daily quota.",
    test: { path: "/api/lookup/8.8.8.8", message: "API key is valid" },
    examples: "Examples: GET /api/lookup/8.8.8.8 (country, city, coordinates, time zone, ASN, privacy, hosting and company), "
      + "GET /api/lookup/2001:4860:4860::8888 (IPv6), GET /api/lookup/ (the IP Conector calls from).",
  },
  {
    id: "iqairairvisual", name: "IQAir AirVisual", category: "data",
    description: "Air quality and weather for cities and stations worldwide",
    website: "https://www.iqair.com/air-pollution-data-api", docs: "https://api-docs.iqair.com",
    logo: { favicon: "https://dashboard.iqair.com" },
    baseUrl: "https://api.airvisual.com/v2",
    auth: { type: "query", name: "key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://www.iqair.com/dashboard/api",
    help: "1) Create an account at iqair.com and sign in. 2) Open “Dashboard” → “API”, choose the free “Community” plan and create a "
      + "key. 3) Copy the key and paste it here. The free plan only gives data for cities (not for specific stations) and has low "
      + "limits on calls per minute and per day.",
    test: { path: "/countries", message: "API key is valid" },
    examples: "Examples: GET /countries (countries with data), GET /states?country=USA, GET /cities?state=California&country=USA, "
      + "GET /city?city=Los Angeles&state=California&country=USA (current air quality and weather), "
      + "GET /nearest_city?lat=40.4168&lon=-3.7038 (nearest city to some coordinates), GET /nearest_city (the nearest city to the IP "
      + "Conector calls from).",
  },
  {
    id: "kadoa", name: "Kadoa", category: "data",
    description: "AI web data extraction: workflows, runs and results",
    website: "https://www.kadoa.com", docs: "https://docs.kadoa.com/api-reference/introduction", logo: { favicon: "https://www.kadoa.com" },
    baseUrl: "https://api.kadoa.com",
    auth: { type: "header", name: "x-api-key" },
    fields: [{ id: "token", label: "API key (tk-…)", secret: true }],
    keyUrl: "https://www.kadoa.com/settings",
    help: "1) Sign in at kadoa.com and open “Settings” → “General”. 2) Click “Generate API Key” and copy the key (it starts with “tk-”). "
      + "3) Paste it here. The key belongs to your workspace and gives access to all its workflows: store it somewhere safe.",
    test: { path: "/v4/workflows", query: { limit: 1 },
              message: (d) => {
                const n = d?.pagination?.totalCount;
                return n !== undefined ? `API key is valid: ${n} workflows` : "API key is valid";
              } },
    examples: "Examples: GET /v4/workflows?limit=25 (workflows), GET /v4/workflows/{workflowId} (details), "
      + "GET /v4/workflows/{workflowId}/data?limit=100 (extracted data), GET /v4/workflows/{workflowId}/history (runs), "
      + "PUT /v4/workflows/{workflowId}/run (run the workflow now).",
  },
  {
    id: "keenio", name: "Keen", category: "data",
    description: "Per-project event analytics: logging, queries and schemas",
    website: "https://keen.io", docs: "https://keen.io/docs/api/", logo: { favicon: "https://keen.io" },
    baseUrl: "https://api.keen.io/3.0/projects/{project}",
    auth: { type: "header", name: "Authorization" },
    fields: [{ id: "project", label: "Project ID", format: "segment", help: "The “Project ID” of your Keen project." },
             { id: "token", label: "API key (Read Key or Master Key)", secret: true }],
    help: "1) Sign in to Keen (keen.io) and open your project: its identifier (“Project ID”) appears in the project settings. 2) In the "
      + "project's access keys section copy the “Read Key” (queries and reads; recommended) or the “Master Key” (allows "
      + "everything, including writing and deleting events). 3) Paste the project identifier and the key. The “Write Key” only works for "
      + "sending events and fails the connection test.",
    test: { path: "/events", message: "API key is valid" },
    examples: "Examples: GET /events (event collections and their properties), "
      + "GET /queries/count?event_collection=purchases&timeframe=this_7_days, "
      + "POST /queries/count_unique {\"event_collection\": \"purchases\", \"target_property\": \"user.id\", "
      + "\"timeframe\": \"this_30_days\"}, "
      + "POST /events/purchases {\"amount\": 25} (records an event; needs a Write Key or the Master Key).",
  },
  {
    id: "kibana", name: "Kibana", category: "data",
    description: "Kibana dashboards, data views, alerts and saved objects",
    website: "https://www.elastic.co/kibana", docs: "https://www.elastic.co/docs/api/doc/kibana/", logo: { simpleIcons: "kibana" },
    baseUrl: "{url}", headers: { "kbn-xsrf": "true" },
    auth: { type: "custom", apply: kibanaAccess },
    fields: [{ id: "url", label: "Kibana address (https://…)", format: "url",
               help: "Include the port if it is not 443, e.g. https://my-deployment.kb.eu-west-1.aws.cloud.es.io or "
                 + "https://kibana.example.com:5601. For a specific space, add /s/space-name." },
             { id: "token", label: "Encoded API key", secret: true, optional: true,
               help: "If you fill it in, it is used instead of the username and password." },
             { id: "username", label: "Username (if you do not use an API key)", optional: true },
             { id: "key", label: "Password (if you do not use an API key)", secret: true, optional: true }],
    help: "1) Copy the address of your Kibana: in Elastic Cloud, open the deployment and copy the “Kibana endpoint”; for a self-managed "
      + "one, its https URL. 2) Create an API key: in Kibana, “Stack Management” → “API keys” → “Create API key”, with a role that has "
      + "Kibana privileges, and copy the “Encoded” value. 3) Alternative: a username and its password (preferably a read-only one created for this "
      + "connection). The permissions of the key or user determine what the agent can do in Kibana.",
    test: { path: "/api/status", account: (d) => (d?.name ? `${d.name} (v${d.version?.number ?? "?"})` : null) },
    examples: "Examples: GET /api/status (status and version), GET /api/saved_objects/_find?type=dashboard&per_page=20 (dashboards), "
      + "GET /api/data_views (data views), GET /api/spaces/space (spaces), "
      + "GET /api/alerting/rules/_find?per_page=20 (alerting rules).",
  },
  {
    id: "klazify", name: "Klazify", category: "data",
    description: "Website categorization and company data by domain",
    website: "https://www.klazify.com", docs: "https://www.klazify.com/api-docs", logo: { favicon: "https://www.klazify.com" },
    baseUrl: "https://www.klazify.com/api",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) Create an account at klazify.com (there is a free trial) and confirm your email. 2) Sign in, open the “API” section of your "
      + "account and generate or copy your API key. 3) Paste it here. Each request (categorizing a website, company data, technologies…) "
      + "counts toward your plan's quota, including the connection test.",
    test: { method: "POST", path: "/categorize", form: { url: "https://www.google.com" }, message: "API key is valid" },
    examples: "Examples: POST /categorize with form {\"url\": \"https://stripe.com\"} (categories and confidence), "
      + "POST /domain_company (company data for the domain), POST /domain_tech (technologies), POST /domain_logo (logo), "
      + "POST /domain_social_media (social media), POST /domain_expiration (domain expiry), "
      + "GET /list-category/v2 (list of categories, no key needed).",
  },
  {
    id: "klipfolio", name: "Klipfolio", category: "data",
    description: "Dashboards, Klips, data sources, clients and users",
    website: "https://www.klipfolio.com", docs: "https://apidocs.klipfolio.com", logo: { favicon: "https://www.klipfolio.com" },
    baseUrl: "https://app.klipfolio.com/api/1.0",
    auth: { type: "header", name: "kf-api-key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) Sign in to Klipfolio as an Admin or Editor user (these are the roles that can generate keys). 2) Open “My Profile” (from "
      + "your name, top right) and generate your API key; an administrator can also do it from “Users”. 3) Copy the "
      + "key and paste it here. Klipfolio allows up to 5 requests per second and a daily maximum that depends on your plan.",
    test: { path: "/profile", account: (d) => [d?.data?.email, d?.data?.company?.name].filter(Boolean).join(" · ") },
    examples: "Examples: GET /profile (your account), GET /klips?limit=25 (Klips), GET /klips/{id}, "
      + "GET /datasources?limit=25 (data sources), GET /tabs (dashboards), GET /clients, GET /users?limit=25. "
      + "Pagination with limit (maximum 100) and offset.",
  },
  {
    id: "kobotoolbox", name: "KoboToolbox", category: "data",
    description: "Forms, surveys and submissions for field data collection",
    website: "https://www.kobotoolbox.org", docs: "https://support.kobotoolbox.org/api.html", logo: { favicon: "https://www.kobotoolbox.org" },
    baseUrl: "{url}",
    auth: { type: "header", name: "Authorization", prefix: "Token " },
    fields: [{ id: "url", label: "KoboToolbox server (https://…)", format: "url", default: "https://kf.kobotoolbox.org",
               help: "Global server: https://kf.kobotoolbox.org. European Union server: https://eu.kobotoolbox.org. "
                 + "For a self-hosted installation, the address of its “kf” component." },
             { id: "token", label: "API key", secret: true }],
    help: "1) Have your server address ready: https://kf.kobotoolbox.org (global), https://eu.kobotoolbox.org (European Union) or "
      + "the address of your own installation. 2) Sign in, open your profile icon → “Account Settings” → “Security” tab and click "
      + "“Display” next to “API Key”. 3) Copy the key and paste it here. The key gives access to all the data in your account: if it leaks, "
      + "regenerate it on that same screen.",
    test: { path: "/me/", account: (d) => d?.username },
    examples: "Examples: GET /me/ (your account), GET /api/v2/assets/?limit=10 (projects and forms), GET /api/v2/assets/{uid_asset}/ "
      + "(details of a project), GET /api/v2/assets/{uid_asset}/data/?limit=100 (received submissions), "
      + "GET /api/v2/assets/{uid_asset}/exports/ (exports), GET /api/v2/service_usage/ (service usage).",
  },
  {
    id: "leadboxer", name: "LeadBoxer", category: "data",
    description: "Web visitors as leads: IP to company, domains and segments",
    website: "https://www.leadboxer.com", docs: "https://developers.leadboxer.com", logo: { favicon: "https://www.leadboxer.com" },
    baseUrl: "https://api.leadboxer.com",
    auth: { type: "header", name: "x-api-key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://app.leadboxer.com/integrations-connectors/data/api-key",
    help: "1) Sign in to your LeadBoxer account (app.leadboxer.com). 2) Open “Integrations” → “Data” and generate or copy your API key. "
      + "3) Paste it here. IP, domain and email lookups use credits from your account.",
    test: { path: "/v1/management/credits", message: "API key is valid" },
    examples: "Examples: GET /v1/management/credits (available credits), "
      + "GET /v1/ip-lookup?ip=8.8.8.8 (company behind an IP; uses credits), "
      + "GET /v1/domain-lookup?domain=leadboxer.com (company data; uses credits), "
      + "GET /v1/users/datasets?email=you@example.com (datasets of a user), GET /v1/leads (leads of a dataset: requires site, "
      + "timeField and criteriaTimeFilter; see the documentation).",
  },
  {
    id: "livesession", name: "LiveSession", category: "data",
    description: "Web session replays, sites, alerts and webhooks",
    website: "https://livesession.io", docs: "https://livesession.dev/docs/api/authentication", logo: { favicon: "https://livesession.io" },
    baseUrl: "https://api.livesession.io/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "Personal access token (PAT)", secret: true }],
    keyUrl: "https://app.livesession.io/app/settings/api?tab=api_tokens",
    help: "1) Sign in at app.livesession.io and open “Settings” → “API” → “API Tokens” tab. 2) Click the create button, give it a name "
      + "(e.g. “Conector”), choose the website and select the permissions (scopes): “users.sessions:read” (required for the test) and, "
      + "if you will use them, “websites:read”, “alerts:read” and “webhooks:read” (or their write versions). 3) Confirm and copy the token: "
      + "it is shown only once. Each token allows 2 requests per second.",
    test: { path: "/sessions", query: { size: 1 },
              message: (d) => (d?.total !== undefined ? `Token is valid: ${d.total} sessions in the period` : "Token is valid") },
    examples: "Examples: GET /sessions?size=25&date_from=TODAY-7DAYS (sessions from the last 7 days), "
      + "GET /sessions?email=you@example.com (sessions of an identified user), GET /websites, GET /alerts, GET /webhooks. "
      + "Pagination with page and size (maximum 100).",
  },
  {
    id: "lumify", name: "Lumify", category: "data",
    description: "Sports: schedules, scores, odds and statistics",
    website: "https://lumify.ai", docs: "https://lumify.ai/docs/reference", logo: { favicon: "https://lumify.ai" },
    baseUrl: "https://lumify.ai",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key (lmfy-…)", secret: true }],
    keyUrl: "https://lumify.ai/api-keys",
    help: "1) Create a free account at lumify.ai and sign in. 2) Open “API Keys”, create a key and copy its value (it starts with "
      + "“lmfy-”). 3) Paste it here. Queries use credits (the free plan has a cap of 20 requests per minute); the connection "
      + "test does not use credits.",
    test: { path: "/v1/estimate/tools", message: "API key is valid (the test uses no credits)" },
    examples: "Examples: GET /v1/sports (sports), GET /v1/events?sport=nba&date=2026-10-15 (games on a given day), "
      + "GET /v1/events/{event_id}/odds (odds), GET /v1/events/{event_id}/score (score), GET /v1/teams?q=lakers (teams), "
      + "GET /v1/estimate/tools and POST /v1/estimate (estimate the credit cost of a call; they are free).",
  },
  {
    id: "mapbox", name: "Mapbox", category: "data",
    description: "Maps, geocoding, directions, isochrones and styles",
    website: "https://www.mapbox.com", docs: "https://docs.mapbox.com/api/overview/", logo: { simpleIcons: "mapbox" },
    baseUrl: "https://api.mapbox.com",
    auth: { type: "query", name: "access_token" },
    fields: [{ id: "token", label: "Access token (pk.… or sk.…)", secret: true }],
    keyUrl: "https://console.mapbox.com/account/access-tokens/",
    help: "1) Create a free account at mapbox.com and open “Access tokens” in your account. 2) For geocoding, directions, isochrones "
      + "or matrices the default public token (“pk.…”) is enough. To manage styles, tilesets or datasets create a secret token "
      + "(“sk.…”) with the required permissions (scopes) and copy it right away: it is shown only once. 3) Paste it here. If the token has "
      + "URL restrictions, remove them: requests are sent from Conector, with no origin page.",
    // “tokens/v2” validates the token without using requests: it returns 200 with a code (TokenValid, TokenInvalid, TokenMalformed…).
    test: { path: "/tokens/v2",
              validate: (d) => {
                if (d?.code !== "TokenValid") throw new Error(`Mapbox: the token is not valid (${d?.code ?? "no response"})`);
              },
              account: (d) => d?.token?.user,
              message: (d) => ({ sk: "Secret token is valid", pk: "Public token is valid" })[d?.token?.usage] || "Token is valid" },
    examples: "Examples: GET /search/geocode/v6/forward?q=Times Square, New York&limit=1 (from address to coordinates), "
      + "GET /search/geocode/v6/reverse?longitude=-3.7038&latitude=40.4168, "
      + "GET /directions/v5/mapbox/driving/-3.7038,40.4168;-3.6919,40.4531?overview=false (driving route), "
      + "GET /isochrone/v1/mapbox/walking/-3.7038,40.4168?contours_minutes=10 (area within a 10-minute walk), "
      + "GET /styles/v1/{username} (styles; secret token with styles:list), GET /tokens/v2 (token details, including your username).",
  },
  {
    id: "mapflow", name: "Mapflow.ai", category: "data",
    description: "AI satellite imagery analysis: projects and processings",
    website: "https://mapflow.ai", docs: "https://docs.mapflow.ai/api/mapflow_api.html", logo: { favicon: "https://mapflow.ai", initials: true },
    baseUrl: "https://api.mapflow.ai/rest",
    auth: { type: "custom", apply: mapflowAccess },
    fields: [{ id: "token", label: "API token", secret: true }],
    keyUrl: "https://app.mapflow.ai/account/api",
    help: "1) Sign in at app.mapflow.ai (you can sign up or use your Google account). 2) Open “Account” → “API” and generate an "
      + "API token: save it, because it is not shown again. 3) Paste it here. Projects and processings created through the API are synced with "
      + "your account and use Mapflow credits.",
    test: { path: "/user/status",
              account: (d) => [d?.user?.email, d?.user?.credits !== undefined ? `${d.user.credits} credits` : null]
                .filter(Boolean).join(" · ") },
    examples: "Examples: GET /user/status (account, credits and available AI models), GET /processings/v2 (processings), "
      + "GET /processings/{processingId}/v2 (status of one), POST /processing/cost/v2 (estimates the cost before launching it), "
      + "GET /processings/{processingId}/result (result as GeoJSON), GET /rasters/memory (storage used).",
  },
  {
    id: "mapulus", name: "Mapulus", category: "data",
    description: "Interactive maps and locations, with Australian geographic data",
    website: "https://www.mapulus.com", docs: "https://developer.mapulus.com/v1/docs", logo: { favicon: "https://www.mapulus.com" },
    baseUrl: "https://api.mapulus.com/api/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) Sign in to Mapulus (app.mapulus.com). 2) Open your profile → “API Keys” and create a key: you can limit its resources and set "
      + "an expiry date. 3) Copy it and paste it here. API access depends on your Mapulus plan.",
    test: { path: "/maps", message: (d) => (d?.total_count !== undefined ? `API key is valid: ${d.total_count} maps` : "API key is valid") },
    examples: "Examples: GET /maps (maps in the account), GET /maps?expand[]=layer (with their layers), GET /maps/{id}, "
      + "GET /locations?map_id={id} (locations of a map), GET /locations?external_id=ABC123 (by external identifier), "
      + "POST /locations {\"layer_id\": \"…\", \"title\": \"Office\", \"address\": \"Brisbane, Australia\"}, "
      + "PUT or DELETE /locations/{id}.",
  },
  {
    id: "marketstack", name: "Marketstack", category: "data",
    description: "Stock quotes: daily closes, intraday and historical data",
    website: "https://marketstack.com", docs: "https://marketstack.com/documentation", logo: { favicon: "https://marketstack.com" },
    baseUrl: "https://api.marketstack.com/v1",
    auth: { type: "query", name: "access_key" },
    fields: [{ id: "token", label: "Access key (API Access Key)", secret: true }],
    keyUrl: "https://marketstack.com/dashboard",
    help: "1) Sign up for free at marketstack.com (the free plan includes 100 requests per month). 2) Open the dashboard (“Dashboard”) "
      + "and copy your “API Access Key”. 3) Paste it here. Each call counts as one request, including the connection test; "
      + "intraday data and other modules require a paid plan.",
    test: { path: "/exchanges", query: { limit: 1 }, message: "API key is valid" },
    examples: "Examples: GET /eod?symbols=AAPL&limit=5 (daily closes), GET /eod/latest?symbols=AAPL,MSFT (latest close), "
      + "GET /tickers?search=apple&limit=5 (search tickers), GET /exchanges (exchanges), GET /splits?symbols=AAPL, "
      + "GET /dividends?symbols=AAPL, GET /intraday?symbols=AAPL (paid plans).",
  },
];
