// Batch 12 of the Composio catalog: data and analytics (search, company enrichment, geocoding and web analytics).
// Customer-specific URLs (Elasticsearch, single-tenant Hex, self-hosted Formbricks) cannot be tested with fake credentials:
// they were checked by hand against each service's documentation. Not included: FaceUp (its API has no public documentation)
// and Hystruct (its API is suspended by the owner: api.hystruct.com responds 503 “Service Suspended”).
import { z } from "zod";
import { ensureOk } from "../define.js";

const count = (n, singular, plural) => `${n} ${n === 1 ? singular : plural}`;
// “N items” if the response is a list; otherwise the fallback text.
const list = (d, one, many, fallback = "Credentials are valid") => (Array.isArray(d) ? count(d.length, one, many) : fallback);

// Elasticsearch accepts an API key (“ApiKey” header) or, if there is none, a username and password (basic authentication).
function elasticsearchAccess(c) {
  if (c.token) return { headers: { Authorization: `ApiKey ${c.token}` } };
  if (c.username && c.key) return { headers: { Authorization: `Basic ${Buffer.from(`${c.username}:${c.key}`).toString("base64")}` } };
  throw new Error("Elasticsearch: enter an API key or a username and password");
}

export default [
  {
    id: "elasticsearch", name: "Elasticsearch", category: "data",
    description: "Search and analytics: indices, documents, queries and cluster",
    website: "https://www.elastic.co/elasticsearch", docs: "https://www.elastic.co/docs/api/doc/elasticsearch/",
    logo: { simpleIcons: "elasticsearch" },
    baseUrl: "{url}",
    auth: { type: "custom", apply: elasticsearchAccess },
    fields: [{ id: "url", label: "Cluster URL (https://…)", format: "url",
               help: "Include the port if it is not 443, e.g. https://my-deployment.es.eu-west-1.aws.cloud.es.io "
                 + "or https://es.example.com:9200." },
             { id: "token", label: "Encoded API key", secret: true, optional: true,
               help: "If you fill it in, it is used instead of the username and password." },
             { id: "username", label: "Username (if you do not use an API key)", optional: true },
             { id: "key", label: "Password (if you do not use an API key)", secret: true, optional: true }],
    help: "1) Copy your cluster address: in Elastic Cloud, open the deployment and copy the “Elasticsearch endpoint”; on a self-managed cluster, "
      + "its https URL. 2) Create an API key: in Kibana, “Stack Management” → “API keys” → “Create API key”; limit its permissions to what is "
      + "needed and copy the value in “Encoded” format. 3) Alternative: a username and password (preferably a read-only user created "
      + "for this connection). Some administration endpoints (_cluster, _cat) do not exist in Elasticsearch Serverless.",
    test: { path: "/", account: (d) => (d?.cluster_name ? `${d.cluster_name} (v${d.version?.number ?? "?"})` : null) },
    examples: "Examples: GET / (cluster information), GET /_cluster/health, GET /_cat/indices?format=json, "
      + "POST /my-index/_search {\"query\": {\"match\": {\"field\": \"text\"}}, \"size\": 10}, GET /my-index/_mapping, "
      + "POST /my-index/_doc {\"field\": \"value\"} (creates a document).",
  },
  {
    id: "enigma", name: "Enigma", category: "data",
    description: "US company data: brands, locations and KYB verification",
    website: "https://www.enigma.com", docs: "https://documentation.enigma.com/guides/graphql/api", logo: { favicon: "https://www.enigma.com" },
    baseUrl: "https://api.enigma.com",
    auth: { type: "header", name: "x-api-key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) Sign in to the Enigma console (console.enigma.com) with your organization; the keys page only appears once the "
      + "organization has chosen a plan. 2) Open “Settings” → “Account” → “API keys” and copy your key with the copy icon. "
      + "3) Searches, enrichments and KYB verifications use credits from the plan, and each attribute has its own cost: "
      + "check the balance and billing under “Settings” → “Billing”. With workspaces (Enterprise) there is one key per workspace.",
    test: { method: "POST", path: "/graphql", body: { query: "{ account { customerEmail pricingPlan creditsAvailable } }" },
              account: (d) => d?.data?.account?.customerEmail },
    graphql: { path: "/graphql" },
    examples: "The main API is GraphQL (use enigma_graphql), e.g. { account { pricingPlan creditsAvailable } } or "
      + "{ search(searchInput: {entityType: BRAND, name: \"Starbucks\"}) { ... on Brand { id "
      + "names(first: 1) { edges { node { name } } } } } }. KYB verification via REST: "
      + "POST /v2/kyb/ {\"name\": \"Acme Inc\", \"address\": {\"state\": \"NY\"}} and "
      + "GET /v2/kyb/{task_id} (adverse media results). They use credits.",
  },
  {
    id: "enrichlayer", name: "Enrich Layer", category: "data",
    description: "B2B enrichment: people and company profiles, and contacts",
    website: "https://enrichlayer.com", docs: "https://enrichlayer.com/docs/api/v2", logo: { favicon: "https://enrichlayer.com" },
    baseUrl: "https://enrichlayer.com/api/v2", allowedOrigins: ["https://api.enrichlayer.com"],
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://enrichlayer.com/dashboard",
    help: "1) Create an account at enrichlayer.com (new accounts get 500 free credits) and open the dashboard "
      + "(enrichlayer.com/dashboard). 2) Copy your API key. 3) Each query uses credits: a profile or a company, 1; a person's "
      + "work email, 3; searches, 3 per result. Checking the balance is free. Without credits, the API "
      + "responds 403.",
    test: { path: "/credit-balance", message: (d) => `${d?.credit_balance ?? "?"} credits available` },
    examples: "All calls are GET. Examples: GET /credit-balance (free), "
      + "GET /profile?profile_url=https://www.linkedin.com/in/… (1 credit), "
      + "GET /company?url=https://www.linkedin.com/company/… (1), GET /company/resolve?company_domain=stripe.com (2), "
      + "GET /profile/email?profile_url=… (3), GET /search/person?country=ES&current_role_title=CTO (3 per result), "
      + "GET /disposable-email?email=… (free).",
  },
  {
    id: "explorium", name: "Explorium", category: "data",
    description: "Find and enrich B2B companies and contacts (AgentSource)",
    website: "https://www.explorium.ai", docs: "https://developers.explorium.ai/v2/overview", logo: { favicon: "https://www.explorium.ai" },
    baseUrl: "https://api.explorium.ai",
    auth: { type: "header", name: "api_key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) Sign in to the Explorium admin portal (admin.explorium.ai) with a user from your company. 2) Open “Access & "
      + "Authentication” → “Getting Your API Key”, click “Show Key” and copy the key: it is unique for the whole company and is "
      + "assigned when you purchase a package. 3) Each company or contact returned and each enrichment uses credits from the package "
      + "(limit of 200 queries per minute); checking the balance is free.",
    test: { path: "/v2/credits",
              message: (d) => `${d?.remaining_credits ?? "?"} of ${d?.allocated_credits ?? "?"} credits available` },
    examples: "Examples: GET /v2/credits, GET /v2/autocomplete?field=country&query=spa, "
      + "POST /v2/businesses/match {\"businesses_to_match\": [{\"name\": \"Apple\", \"domain\": \"apple.com\"}]} (returns business_id), "
      + "POST /v2/businesses {\"mode\": \"full\", \"page_size\": 10, \"page\": 1, "
      + "\"filters\": {\"country_code\": {\"values\": [\"es\"]}}}, POST /v2/prospects/match, POST /v2/prospects. "
      + "They use credits except the balance check.",
  },
  {
    id: "felt", name: "Felt", category: "data",
    description: "Collaborative maps: maps, layers, elements and projects",
    website: "https://felt.com", docs: "https://developers.felt.com/rest-api/getting-started", logo: { favicon: "https://felt.com" },
    baseUrl: "https://felt.com/api/v2",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API token (felt_pat_…)", secret: true }],
    keyUrl: "https://felt.com/maps/latest/developers",
    help: "1) The Felt API requires a Business or Enterprise plan (it is also included in the free trial). 2) In Felt, open "
      + "“Workspace Settings” → “Developers” tab (felt.com/maps/latest/developers) and create an API token; copy its value, which "
      + "is shown only once. 3) Each token belongs to a workspace and acts with your permissions in it; it does not expire until "
      + "you revoke it.",
    test: { path: "/user", account: (d) => d?.email || d?.name },
    examples: "Examples: GET /user, GET /projects, POST /maps {\"title\": \"My map\"}, GET /maps/{map_id}, GET /maps/{map_id}/layers, "
      + "POST /maps/{map_id}/move {\"project_id\": \"…\"}, DELETE /maps/{map_id}.",
  },
  {
    id: "finviz", name: "Finviz", category: "data",
    description: "Stock market: stock screener, history, news and groups",
    website: "https://finviz.com", docs: "https://finviz.com/blog/our-upgraded-api-higher-limits-clearer-data-and-more-ways-to-connect/",
    logo: { favicon: "https://finviz.com" },
    baseUrl: "https://elite.finviz.com",
    auth: { type: "query", name: "auth" },
    fields: [{ id: "token", label: "API token (Finviz Elite)", secret: true }],
    keyUrl: "https://elite.finviz.com/api-and-exports",
    help: "1) You need a Finviz Elite subscription. 2) Sign in at finviz.com, click your profile (top right) → “API and Exports” "
      + "and copy your API token. 3) Exports return CSV, not JSON. The limit is 10 requests every 5 seconds, "
      + "shared across all endpoints of the same account; when exceeded it responds 429 with “Retry-After”.",
    test: { path: "/export", query: { v: 111, t: "AAPL" }, message: "API token is valid" },
    examples: "Responses are CSV. Examples: GET /export?v=111&f=cap_largeover,sec_technology&o=-marketcap (stock screener; "
      + "t=AAPL,MSFT for specific tickers), GET /quote_export?t=AAPL&p=d (daily history), GET /news_export?v=1 (news), "
      + "GET /grp_export?g=sector&v=152 (groups). The other exports (portfolio, insiders, calendars, managers and funds, "
      + "filings, options) are listed on the “API and Exports” page of your account.",
  },
  {
    id: "fireflies", name: "Fireflies", category: "communication",
    description: "Meeting transcription: transcripts, summaries and users",
    website: "https://fireflies.ai", docs: "https://docs.fireflies.ai/", logo: { favicon: "https://fireflies.ai" },
    baseUrl: "https://api.fireflies.ai",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://app.fireflies.ai/integrations/custom/fireflies",
    help: "1) Sign in at app.fireflies.ai. 2) Open “Integrations” → “Fireflies API” and copy your API key. 3) Limits per "
      + "plan: Free, 30 requests per minute and 500 per day; Pro, 60 and 5,000; Business and Enterprise share 60 per paid seat per "
      + "minute. The first request from a Free user starts a 14-day trial with Pro limits.",
    test: { method: "POST", path: "/graphql", body: { query: "{ user { name email } }" },
              account: (d) => d?.data?.user?.email || d?.data?.user?.name },
    graphql: { path: "/graphql" },
    examples: "The API is GraphQL (use fireflies_graphql). Examples: { user { name email } }, "
      + "{ transcripts(limit: 10) { id title date duration organizer_email } }, "
      + "{ transcripts(keyword: \"budget\", scope: all, limit: 5) { id title } }, "
      + "{ transcript(id: \"…\") { title sentences { speaker_name text } summary { overview action_items } } }. "
      + "Maximum 50 transcripts per query. An invalid key returns a 500 error with the code auth_failed.",
  },
  {
    id: "flatfile", name: "Flatfile", category: "data",
    description: "Data import: environments, spaces, workbooks and records",
    website: "https://flatfile.com", docs: "https://reference.flatfile.com", logo: { favicon: "https://flatfile.com" },
    baseUrl: "https://{server}/api/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "Secret key (sk_…) or personal token", secret: true },
             { id: "server", label: "Region", default: "platform.flatfile.com",
               options: [["platform.flatfile.com", "US"], ["platform.eu.flatfile.com", "European Union"],
                          ["platform.uk.flatfile.com", "United Kingdom"], ["platform.ca.flatfile.com", "Canada"],
                          ["platform.au.flatfile.com", "Australia"]],
               help: "The region of your Flatfile account: a key from one region is not valid in the others." }],
    keyUrl: "https://platform.flatfile.com/dashboard/keys-and-secrets",
    help: "1) Sign in at platform.flatfile.com and open “API Keys and Secrets” (platform.flatfile.com/dashboard/keys-and-secrets) in the "
      + "environment you want to use (development or production). 2) Copy the secret key (sk_…), never the publishable one (pk_…): each "
      + "key only sees its own environment. 3) Alternative: a personal access token (your profile → “Personal Access Tokens”), which acts with "
      + "your permissions and works for all environments. The development environment does not use paid credits.",
    test: { path: "/environments", message: (d) => list(d?.data, "environment", "environments", "Key is valid") },
    examples: "Responses are wrapped in “data”. Examples: GET /environments, GET /spaces?pageSize=20, GET /spaces/{spaceId}, "
      + "GET /workbooks?spaceId=…, GET /sheets?workbookId=…, GET /sheets/{sheetId}/records, GET /files?spaceId=….",
  },
  {
    id: "fluxguard", name: "Fluxguard", category: "data",
    description: "Website change monitoring: pages, categories and webhooks",
    website: "https://fluxguard.com", docs: "https://fluxguard.com/?p=1532", logo: { favicon: "https://fluxguard.com" },
    baseUrl: "https://api.fluxguard.com",
    auth: { type: "header", name: "x-api-key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://app.fluxguard.com/settings?tab=org",
    help: "1) Sign in at app.fluxguard.com with a user from your organization. 2) Open “Settings” → the organization tab "
      + "(app.fluxguard.com/settings?tab=org) and create an API key; you can revoke it at any time. 3) The API is still in beta and the "
      + "documentation does not state a minimum plan. There is no endpoint to list sites: they are created with POST /add-page.",
    test: { path: "/account", message: "API key is valid" },
    examples: "Examples: GET /account, GET /account/category, GET /account/webhook, POST /add-page {\"url\": \"https://…\"} "
      + "(creates a site and starts monitoring it; returns siteId, sessionId and pageId), GET /site/{siteId}/session/{sessionId}/page/{pageId}, "
      + "PUT /account/webhook {\"url\": \"https://…\"}.",
  },
  {
    id: "formbricks", name: "Formbricks", category: "productivity",
    description: "Surveys and feedback: surveys, responses, contacts and webhooks",
    website: "https://formbricks.com", docs: "https://formbricks.com/docs/api-reference/rest-api", logo: { simpleIcons: "formbricks" },
    baseUrl: "{url}/api/v1",
    auth: { type: "header", name: "x-api-key" },
    fields: [{ id: "token", label: "API key", secret: true },
             { id: "url", label: "Formbricks URL", format: "url", default: "https://app.formbricks.com",
               help: "https://app.formbricks.com for Formbricks Cloud; for a self-hosted installation, its address (without /api)." }],
    help: "1) In Formbricks, open your organization menu (top left) → “API Keys” → “Add API Key”. 2) Give it a name, "
      + "add the workspaces it will have access to with read, write or manage permission, plus organization permissions "
      + "if you need them; copy the key, which is shown only once. 3) With Formbricks Cloud keep the default address; "
      + "for a self-hosted installation, enter yours.",
    test: { path: "/management/me", account: (d) => d?.project?.name || d?.organizationId },
    examples: "Almost everything lives under /management; webhooks do not. Examples: GET /management/me, GET /management/surveys, "
      + "GET /management/surveys/{surveyId}, GET /management/responses?surveyId=…&limit=50&skip=0, GET /management/contacts, "
      + "GET /management/action-classes, GET /webhooks.",
  },
  {
    id: "foursquare", name: "Foursquare", category: "data",
    description: "Places worldwide: search, details and autocomplete",
    website: "https://foursquare.com", docs: "https://docs.foursquare.com/fsq-developers-places/reference/places-api-overview",
    logo: { simpleIcons: "foursquare" },
    baseUrl: "https://places-api.foursquare.com", headers: { "X-Places-Api-Version": "2025-06-17" },
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "Service API Key", secret: true }],
    keyUrl: "https://foursquare.com/developers/home",
    help: "1) Create an account and a project in the Foursquare developer console (foursquare.com/developers/signup). 2) In the "
      + "project's “API Settings”, create a “Service API Key” and copy it. 3) It includes 500 free Places Pro calls per month: "
      + "Premium endpoints and fields (hours, ratings, photos, reviews…) and calls beyond the quota use paid credits, "
      + "so request only the fields you need with “fields”.",
    test: { path: "/places/search", query: { query: "cafe", near: "London", limit: 1, fields: "fsq_place_id,name" },
              message: "Service API Key is valid" },
    examples: "The API version goes in the X-Places-Api-Version header (already included). Examples: "
      + "GET /places/search?query=cafe&near=London&limit=10&fields=fsq_place_id,name,location,latitude,longitude, "
      + "GET /places/search?query=pizza&ll=40.4168,-3.7038&radius=1000, GET /places/{fsq_place_id}, "
      + "GET /autocomplete?query=ret&ll=40.4168,-3.7038.",
    tools: [
      { name: "foursquare_search_places", title: "Foursquare: search places", annotations: { readOnlyHint: true },
        description: "Searches for places by name, category or type (e.g. “cafe”) near a city or some coordinates. "
          + "It only requests Pro fields, which use up the free Places Pro call quota.",
        schema: { query: z.string().min(2).describe("What to search for: name, category or type of place"),
                   near: z.string().optional().describe("City as text, e.g. “London, GB”"),
                   ll: z.string().regex(/^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/).optional()
                     .describe("Coordinates “lat,lon” (instead of “near”)"),
                   max: z.number().int().min(1).max(50).default(10) },
        run: async ({ query, near, ll, max }, p) => (ensureOk(await p({ path: "/places/search", query: { query: query,
          near: ll ? undefined : near, ll, limit: max, fields: "fsq_place_id,name,categories,location,latitude,longitude,distance" } }),
          "Foursquare").results || []).map((l) => ({ id: l.fsq_place_id, name: l.name,
          categories: (l.categories || []).map((c) => c.name), lat: l.latitude, lon: l.longitude, distance_m: l.distance,
          address: l.location?.formatted_address || [l.location?.address, l.location?.locality, l.location?.region,
            l.location?.postcode].filter(Boolean).join(", ") })) },
    ],
  },
  {
    id: "fullstory", name: "FullStory", category: "data",
    description: "Digital experience analytics: sessions, users and events",
    website: "https://www.fullstory.com", docs: "https://developer.fullstory.com/server/getting-started/",
    logo: { favicon: "https://www.fullstory.com" },
    baseUrl: "https://api.fullstory.com",
    auth: { type: "header", name: "Authorization", prefix: "Basic " },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) In FullStory, open “Settings” → “Integrations” → “API Keys” and click “Create key”. 2) Give it a name and choose the level: "
      + "“Standard” (send data and list sessions), “Architect” (view, export and delete user data; Enterprise plans only) or "
      + "“Admin”. Copy the key: it is shown only once. 3) All requests use api.fullstory.com, which routes to the data center "
      + "automatically (na1 or eu1); server-sent events have a quota per cycle (429 when exceeded).",
    test: { path: "/me", account: (d) => d?.email || d?.name,
              message: (d) => (d?.role ? `Key is valid (level ${d.role})` : "API key is valid") },
    examples: "Examples: GET /me, GET /v2/organization/quotas (session and event quota), GET /sessions/v2?email=a@x.com (replay "
      + "links), GET /segments/v1, GET /operations/v1, GET /v2/users?uid=… (Architect), POST /v2/events {…} (sends an event).",
  },
  {
    id: "genderapi", name: "Gender API", category: "data",
    description: "Gender and country of origin from names and emails",
    website: "https://gender-api.com", docs: "https://gender-api.com/en/api-docs/v2", logo: { favicon: "https://gender-api.com" },
    baseUrl: "https://gender-api.com/v2",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API token", secret: true }],
    keyUrl: "https://gender-api.com/en/account/auth-tokens",
    help: "1) Create an account at gender-api.com (the free plan includes 100 queries per month) and confirm the activation email. "
      + "2) Open gender-api.com/en/account/auth-tokens and copy your API token. 3) Each name or email queried uses one "
      + "credit; checking the statistics and balance is free. Without credits, the API responds 401 (“limit-exceeded”).",
    test: { path: "/statistic", message: (d) => `${d?.remaining_credits ?? "?"} credits available` },
    examples: "Examples: GET /statistic (balance and usage), POST /gender {\"first_name\": \"Sandra\", \"country\": \"ES\"}, "
      + "POST /gender {\"full_name\": \"Sandra Perez\"}, POST /gender {\"email\": \"sandra.perez@example.com\"}, "
      + "POST /country-of-origin {\"first_name\": \"Sandra\"}. For several names, the body is a list of objects "
      + "(uses 1 credit per name).",
  },
  {
    id: "genderapiio", name: "GenderAPI.io", category: "data",
    description: "Gender from names, emails and usernames, with optional AI",
    website: "https://www.genderapi.io", docs: "https://www.genderapi.io/api-documentation", logo: { favicon: "https://www.genderapi.io" },
    baseUrl: "https://api.genderapi.io/api/v2",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key (24 characters)", secret: true }],
    keyUrl: "https://app.genderapi.io",
    help: "1) Create an account at genderapi.io and sign in to the dashboard. 2) Copy your API key (24 characters). 3) Without a key or with "
      + "a wrong one, the API does not fail: it treats the request as a free trial limited by IP (10 credits every 24 hours), so "
      + "the connection test also checks that the key is recognized. Each query uses credits; /usage is free.",
    test: { path: "/usage", message: (d) => `${d?.data?.remaining_credits ?? "?"} credits available`,
              validate: (d) => {
                if (d?.meta?.access?.mode !== "api_key") {
                  throw new Error("GenderAPI.io: the API key is not recognized (the API treats it as a free trial by IP)");
                }
              } },
    examples: "Examples: GET /usage (balance, free), GET /gender?type=name&value=Sophia&country=US, "
      + "POST /gender {\"type\": \"email\", \"value\": \"sophia.lopez@example.com\"} (type: name, email or username), "
      + "POST /gender/batch {\"items\": [{\"type\": \"name\", \"value\": \"Sophia\"}, …]} (up to 50), "
      + "POST /phone/validate {\"number\": \"+12025550123\", \"country\": \"US\"}. GET /openapi.json and GET /errors are free.",
  },
  {
    id: "geoapify", name: "Geoapify", category: "data",
    description: "Geocoding, places, routing, isochrones and route matrices",
    website: "https://www.geoapify.com", docs: "https://apidocs.geoapify.com", logo: { favicon: "https://www.geoapify.com" },
    baseUrl: "https://api.geoapify.com",
    auth: { type: "query", name: "apiKey" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://myprojects.geoapify.com",
    help: "1) Create a free account at geoapify.com (no card required) and open “My Projects” (myprojects.geoapify.com). 2) Create a "
      + "project and copy its API key (you can have several per project and restrict them by domain or IP). 3) The free plan gives "
      + "3,000 credits per day and 5 requests per second, also in production if you give attribution to Geoapify; each API uses credits "
      + "according to its cost (geocoding, 1).",
    test: { path: "/v1/geocode/search", query: { text: "London", limit: 1 }, message: "API key is valid" },
    examples: "Paths include the version. Examples: GET /v1/geocode/search?text=Trafalgar Square, London&limit=3, "
      + "GET /v1/geocode/reverse?lat=40.4168&lon=-3.7038, "
      + "GET /v2/places?categories=catering.restaurant&filter=circle:-3.7038,40.4168,1000&limit=20, "
      + "GET /v1/routing?waypoints=40.4168,-3.7038|41.3874,2.1686&mode=drive, "
      + "GET /v1/isoline?lat=40.4168&lon=-3.7038&type=time&mode=drive&range=900, POST /v1/routematrix.",
    tools: [
      { name: "geoapify_geocode", title: "Geoapify: address to coordinates", annotations: { readOnlyHint: true },
        description: "Converts an address or a place into coordinates: returns the normalized address, latitude, longitude "
          + "and confidence.",
        schema: { text: z.string().min(2).describe("Address or place, e.g. “Trafalgar Square, London”"),
                   country: z.string().length(2).optional().describe("2-letter ISO country code to narrow the search (es, fr…)"),
                   max: z.number().int().min(1).max(10).default(3) },
        run: async ({ text, country, max }, p) => (ensureOk(await p({ path: "/v1/geocode/search", query: { text: text, limit: max,
          lang: "en", filter: country ? `countrycode:${country.toLowerCase()}` : undefined } }), "Geoapify").features || []).map((f) => ({
          address: f.properties?.formatted, lat: f.properties?.lat, lon: f.properties?.lon, type: f.properties?.result_type,
          confidence: f.properties?.rank?.confidence })) },
    ],
  },
  {
    id: "geocodio", name: "Geocodio", category: "data",
    description: "Address geocoding for the US, Canada, Mexico and the UK",
    website: "https://www.geocod.io", docs: "https://www.geocod.io/docs/", logo: { favicon: "https://www.geocod.io" },
    baseUrl: "https://api.geocod.io/v2",
    auth: { type: "query", name: "api_key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://dash.geocod.io/apikey",
    help: "1) Create an account at geocod.io (no card is required until you exceed the free usage: the first 2,500 credits each day are "
      + "free) and open dash.geocod.io/apikey. 2) Create an API key and copy it. By default it only accesses single and batch "
      + "geocoding (/geocode, /reverse): for lists or distances, enable those permissions on the key (otherwise it responds 403). "
      + "3) Each address or coordinate queried uses 1 credit, plus 1 for each additional data field (“fields”).",
    test: { path: "/geocode", query: { q: "1109 N Highland St, Arlington, VA" }, message: "API key is valid" },
    examples: "Examples: GET /geocode?q=1109 N Highland St, Arlington VA&fields=timezone (1 credit + 1 per field), "
      + "GET /reverse?q=38.886665,-77.094733, POST /geocode [\"address 1\", \"address 2\"] (batch, up to 10,000 lookups), "
      + "POST /reverse [\"38.88,-77.09\", \"…\"], GET /lists (spreadsheets; requires the lists permission).",
    tools: [
      { name: "geocodio_geocode", title: "Geocodio: address to coordinates", annotations: { readOnlyHint: true },
        description: "Converts an address (US, Canada, Mexico or UK) into coordinates, with the normalized address and "
          + "the accuracy. Uses 1 credit per lookup.",
        schema: { address: z.string().min(3).describe("Full or partial address"),
                   max: z.number().int().min(1).max(5).default(1) },
        run: async ({ address, max }, p) => (ensureOk(await p({ path: "/geocode", query: { q: address, limit: max } }),
          "Geocodio").results || []).map((r) => ({ address: r.formatted_address, lat: r.location?.lat, lon: r.location?.lng,
          accuracy: r.accuracy, accuracy_type: r.accuracy_type })) },
    ],
  },
  {
    id: "geokeo", name: "Geokeo", category: "data",
    description: "Forward and reverse geocoding with worldwide coverage",
    website: "https://geokeo.com", docs: "https://geokeo.com/documentation.php", logo: { favicon: "https://geokeo.com" },
    baseUrl: "https://geokeo.com/geocode/v1",
    auth: { type: "query", name: "api" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://geokeo.com/dashboard.php",
    help: "1) Sign up at geokeo.com (no card required; the free plan gives 2,500 requests per day, which reset at midnight UTC) and "
      + "sign in. 2) In the dashboard, open the “API” tab and copy your key. 3) You can restrict it by IP or domain in the dashboard; "
      + "if you do, requests from another origin return ACCESS_DENIED. All responses arrive with HTTP 200: the result "
      + "is in the “status” field (ok, ZERO_RESULTS, INVALID_REQUEST, ACCESS_DENIED or OVER_QUERY_LIMIT).",
    test: { path: "/search.php", query: { q: "London" }, message: "API key is valid",
              validate: (d) => {
                if (d?.status === "ACCESS_DENIED") {
                  throw new Error("Geokeo: access denied (invalid key or restricted by IP or domain)");
                }
                if (d?.status === "OVER_QUERY_LIMIT") throw new Error("Geokeo: the daily request limit has been exceeded");
                if (d?.status === "INVALID_REQUEST") throw new Error("Geokeo: invalid request");
              } },
    examples: "Examples: GET /search.php?q=empire state building&country=us&format=json (q accepts up to 50 characters), "
      + "GET /reverse.php?lat=40.74842&lng=-73.9856. Always check “status” in the response: ZERO_RESULTS does not use quota.",
    tools: [
      { name: "geokeo_geocode", title: "Geokeo: address to coordinates", annotations: { readOnlyHint: true },
        description: "Converts an address or a place into coordinates: returns the formatted address, latitude and longitude.",
        schema: { text: z.string().min(2).max(50).describe("Address or place (up to 50 characters)"),
                   country: z.string().length(2).optional().describe("2-letter ISO country code to narrow the search (es, us…)") },
        async run({ text, country }, p) {
          const d = ensureOk(await p({ path: "/search.php", query: { q: text, country: country ? country.toLowerCase() : undefined } }), "Geokeo");
          if (d?.status && !["ok", "ZERO_RESULTS"].includes(d.status)) throw new Error(`Geokeo responded ${d.status}`);
          return (d?.results || []).map((r) => ({ address: r.formatted_address, lat: Number(r.geometry?.location?.lat),
            lon: Number(r.geometry?.location?.lng), category: r.class, type: r.type }));
        } },
    ],
  },
  {
    id: "gigasheet", name: "Gigasheet", category: "data",
    description: "Big-data spreadsheets: files, filters, columns and export",
    website: "https://www.gigasheet.com", docs: "https://support.gigasheet.com/support/solutions/articles/69000836344-gigasheet-api",
    logo: { favicon: "https://www.gigasheet.com" },
    baseUrl: "https://api.gigasheet.com",
    auth: { type: "header", name: "X-GIGASHEET-TOKEN" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) API access must be enabled on your Gigasheet account. 2) With access enabled, open your Library → "
      + "“Automation” in the left menu and follow the steps to generate the key: it is shown only once and generating another "
      + "one invalidates the previous one. 3) The Free and Premium plans allow very few requests per day (for testing); for real use "
      + "you need the Business plan.",
    test: { path: "/user/whoami", account: (d) => d?.email || d?.username || d?.name, message: "API key is valid" },
    examples: "Examples: GET /user/whoami, GET /user/details (storage quota and roles), GET /user/enrichment-credits, "
      + "GET /library/home (recent files), GET /dataset/{handle} (sheet), GET /dataset/{handle}/columns. The remaining operations "
      + "(filters, columns, export, enrichment) are in the Gigasheet API reference.",
  },
  {
    id: "gosquared", name: "GoSquared", category: "data",
    description: "Real-time web analytics: visitors, trends and people",
    website: "https://www.gosquared.com", docs: "https://www.gosquared.com/docs/api/", logo: { image: "https://github.com/gosquared.png" },
    baseUrl: "https://api.gosquared.com",
    auth: [{ type: "query", name: "api_key" }, { type: "query", name: "site_token", field: "site_token" }],
    fields: [{ id: "token", label: "API key", secret: true },
             { id: "site_token", label: "Site token (GSN-…)", optional: true,
               help: "Required for per-site calls (now, trends, people…); not needed for account calls." }],
    keyUrl: "https://www.gosquared.com/settings/api",
    help: "1) Sign in to GoSquared. 2) API key: in the account settings, open “API Access” and create a key with the "
      + "permissions you need. 3) Site token (GSN-…): under “Settings” → “Current Project” → “General”. The API allows 750 units "
      + "per minute per user, and each function has its own cost.",
    test: { path: "/auth/v1/tokeninfo", message: (d) => `Key is valid (permissions: ${(d?.scopes || []).join(", ") || "no data"})` },
    examples: "Each API has its own version. Examples: GET /auth/v1/tokeninfo, GET /account/v1/sites (projects in the account), "
      + "GET /now/v3/overview, GET /now/v3/concurrents, GET /trends/v2/aggregate, GET /people/v1/people. "
      + "Per-site calls add the configured site token automatically.",
  },
  {
    id: "here", name: "HERE", category: "data",
    description: "Geocoding, place search, routing, traffic and weather",
    website: "https://www.here.com", docs: "https://www.here.com/docs", logo: { simpleIcons: "here" },
    baseUrl: "https://geocode.search.hereapi.com/v1", allowedOrigins: ["^https://[a-z0-9.-]+\\.hereapi\\.com$"],
    auth: { type: "query", name: "apiKey" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://platform.here.com/access/apps",
    help: "1) Sign in at platform.here.com with your HERE account (the Base plan is free) and open “Access Manager” → “Apps”. 2) Create an "
      + "app or open the one you already have, go to its “Credentials” → “API Keys” tab and click “Create API key” (maximum two per app). 3) Copy "
      + "the key. Each service lives on its own domain *.hereapi.com: use the full URL as the path (the key is added automatically). "
      + "Some services are not included in the Base plan and must be activated with HERE.",
    test: { path: "/geocode", query: { q: "London", limit: 1 }, message: "API key is valid" },
    examples: "Each service has its own domain: use the full URL as the path. Examples: GET /geocode?q=Trafalgar Square, London&limit=3 "
      + "(with the base domain), GET https://revgeocode.search.hereapi.com/v1/revgeocode?at=40.4168,-3.7038, "
      + "GET https://discover.search.hereapi.com/v1/discover?at=40.4168,-3.7038&q=cafe, "
      + "GET https://router.hereapi.com/v8/routes?transportMode=car&origin=40.4168,-3.7038&destination=41.3874,2.1686&return=summary, "
      + "GET https://weather.hereapi.com/v3/report?q=London&products=observation.",
    tools: [
      { name: "here_geocode", title: "HERE: address to coordinates", annotations: { readOnlyHint: true },
        description: "Converts an address or a place into coordinates: returns the normalized address, latitude, longitude "
          + "and result type.",
        schema: { text: z.string().min(2).describe("Address or place, e.g. “Trafalgar Square, London”"),
                   country: z.string().length(3).optional().describe("3-letter ISO country code to narrow the search (ESP, FRA…)"),
                   max: z.number().int().min(1).max(20).default(3) },
        run: async ({ text, country, max }, p) => (ensureOk(await p({ path: "/geocode", query: { q: text, limit: max, lang: "en",
          in: country ? `countryCode:${country.toUpperCase()}` : undefined } }), "HERE").items || []).map((i) => ({ title: i.title,
          address: i.address?.label, lat: i.position?.lat, lon: i.position?.lng, type: i.resultType,
          score: i.scoring?.queryScore })) },
    ],
  },
  {
    id: "hex", name: "Hex", category: "data",
    description: "Data notebooks: projects, runs, users and collections",
    website: "https://hex.tech", docs: "https://learn.hex.tech/docs/api-integrations/api/overview", logo: { favicon: "https://hex.tech" },
    baseUrl: "{url}/api/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API token (hxtp_… or hxtw_…)", secret: true },
             { id: "url", label: "Hex URL", format: "url", default: "https://app.hex.tech",
               help: "https://app.hex.tech on the US cloud; https://eu.hex.tech on the EU cloud; for single-tenant or HIPAA, your own." }],
    help: "1) In Hex, open your user settings → “API keys” (Account section) and click “New token”. 2) Choose the type: personal (hxtp_…, "
      + "with your permissions; requires the Editor role or higher) or workspace (hxtw_…, administrators only, with read or "
      + "run scopes). Choose its expiration (mandatory for personal tokens) and copy the token: it is shown only once. 3) The "
      + "administration API is available on the Team and Enterprise plans (some endpoints, Enterprise only). Limit: 60 requests per minute.",
    test: { path: "/projects", query: { limit: 1 }, message: "API token is valid" },
    examples: "Examples: GET /projects?limit=25, GET /projects/{projectId}, GET /projects/{projectId}/runs, "
      + "POST /projects/{projectId}/runs {\"inputParams\": {…}} (runs a published project and uses compute), "
      + "GET /projects/{projectId}/runs/{runId}, GET /users, GET /groups, GET /collections.",
  },
  {
    id: "highergov", name: "HigherGov", category: "data",
    description: "US public contracts and grants: opportunities and awards",
    website: "https://www.highergov.com", docs: "https://docs.highergov.com/import-and-export/highergov-api",
    logo: { favicon: "https://www.highergov.com" },
    baseUrl: "https://www.highergov.com/api-external",
    auth: { type: "query", name: "api_key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://www.highergov.com/api-management/",
    help: "1) Only the HigherGov account administrator can create keys: sign in as that user. 2) Click the gear icon (top "
      + "right) → “API” (highergov.com/api-management/) and “Generate Key”; copy the key, because it is shown only once. "
      + "3) All subscriptions include the API with 10,000 records per month; additional volume is purchased separately from HigherGov.",
    test: { path: "/naics/", query: { page_size: 1 }, message: "API key is valid" },
    examples: "Paths end in “/” and are paginated with page_number and page_size (max. 100). Examples: "
      + "GET /opportunity/?source_type=sam&captured_date=2026-10-01&page_size=10, GET /contract/?page_size=10, GET /grant/?page_size=10, "
      + "GET /awardee/?page_size=10, GET /naics/?naics_code=541330, GET /agency/. Each record returned counts against the monthly quota.",
  },
  {
    id: "ibmxforceexchange", name: "IBM X-Force Exchange", category: "security",
    description: "Threat intelligence: IP and URL reputation, malware and CVEs",
    website: "https://exchange.xforce.ibmcloud.com", docs: "https://api.xforce.ibmcloud.com/doc/",
    logo: { favicon: "https://exchange.xforce.ibmcloud.com" },
    baseUrl: "https://api.xforce.ibmcloud.com",
    auth: { type: "basic", usernameField: "api_key", passwordField: "password" },
    fields: [{ id: "api_key", label: "API key (username)", secret: true },
             { id: "password", label: "API password", secret: true }],
    keyUrl: "https://exchange.xforce.ibmcloud.com/settings/api",
    help: "1) The API requires a paid X-Force Threat Intelligence subscription (Essentials, Standard or Premium): see ibm.com/"
      + "products/xforce-exchange/editions. 2) Sign in at exchange.xforce.ibmcloud.com, click your user → “Settings” → “API Access” "
      + "(exchange.xforce.ibmcloud.com/settings/api) and “Generate”: you get a key and a password; the password is shown "
      + "only once and neither of them expires. 3) They are sent as username and password (basic authentication). Exceeding the "
      + "monthly quota returns 402.",
    test: { path: "/user/profile", account: (d) => d?.connectionsProfile?.email || d?.connectionsProfile?.fn },
    examples: "Examples: GET /user/profile, GET /ipr/8.8.8.8 (IP reputation), GET /ipr/malware/8.8.8.8, GET /url/example.com "
      + "(URL reputation), GET /malware/{hash}, GET /vulnerabilities/search/CVE-2014-0160, GET /resolve/example.com. "
      + "Each record returned uses quota.",
  },
];
