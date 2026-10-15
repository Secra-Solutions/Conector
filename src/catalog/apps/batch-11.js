// Batch 11 of the Composio catalog: data and analytics (Chameleon to Dromo). ClickHouse and Databricks use each customer's
// own URL: they cannot be tested without real credentials and were checked against the documentation. CoinMarketCal uses its
// v2 API (api.coinmarketcal.com/v2, per its official repository): the v1 at developers.coinmarketcal.com, which older
// integrations cite, no longer exists.
import crypto from "node:crypto";
import { z } from "zod";
import { USER_AGENT, httpRequest } from "../../http.js";
import { ensureOk, normalizeUrl } from "../define.js";

const LONG_TIMEOUT = 180_000; // ms: page extraction, AI assistant responses and analytical queries can take a while
const count = (n, singular, plural) => `${n} ${n === 1 ? singular : plural}`;

// CodeREADr disables GET requests by default and expects the key as the “api_key” variable in the form of a POST.
function keyInForm({ body: form, cred }) {
  if (!(form instanceof URLSearchParams)) throw new Error("CodeREADr: send a POST with the “form” parameter (section, action…)");
  form.set("api_key", cred.token);
}

// It also answers errors with 200: the XML contains <status>1</status> on success and <status>0</status> with <error> on failure.
const checkCodereadrXml = (d) => {
  const xml = String(d);
  if (!/<status>1<\/status>/.test(xml)) throw new Error(`CodeREADr: ${/<error[^>]*>([^<]*)<\/error>/.exec(xml)?.[1] || "invalid response"}`);
};

// Data247 also answers errors with 200: what matters is response.status (OK, or a D247_… code).
const checkData247 = (d) => {
  const r = d?.response;
  if (r?.status !== "OK") throw new Error(`Data247: ${r?.message || r?.status || "invalid response"}`);
};

// Databricks accepts a personal token (dapi…) or machine-to-machine OAuth with a service principal: in that case the 1-hour
// token is requested with “client credentials” and kept in memory until shortly before it expires.
let databricksToken = null;
async function databricksAccess(c) {
  if (c.token) return c.token;
  if (!c.client_id || !c.client_secret) {
    throw new Error("Databricks: missing the personal token, or the Client ID and Client secret of the service principal");
  }
  const origin = new URL(normalizeUrl(c.url)).origin;
  const fingerprint = crypto.createHash("sha256").update(JSON.stringify([origin, c.client_id, c.client_secret])).digest("hex");
  if (databricksToken?.fingerprint === fingerprint && databricksToken.expires > Date.now() + 60_000) return databricksToken.token;
  const credential = Buffer.from(`${c.client_id}:${c.client_secret}`).toString("base64");
  const d = ensureOk(await httpRequest(`${origin}/oidc/v1/token`, { method: "POST",
    headers: { Accept: "application/json", "User-Agent": USER_AGENT, Authorization: `Basic ${credential}` },
    body: new URLSearchParams({ grant_type: "client_credentials", scope: "all-apis" }) }), "Databricks");
  if (!d?.access_token) throw new Error("Databricks: the authentication response does not include a token");
  databricksToken = { fingerprint, token: d.access_token, expires: Date.now() + (Number(d.expires_in) || 3600) * 1000 };
  return d.access_token;
}

export default [
  {
    id: "chameleon", name: "Chameleon", category: "data",
    description: "Product adoption: tours, surveys, profiles and companies",
    website: "https://www.chameleon.io", docs: "https://developers.chameleon.io", logo: { favicon: "https://www.chameleon.io" },
    baseUrl: "https://api.chameleon.io",
    auth: { type: "header", name: "X-Account-Secret" },
    fields: [{ id: "token", label: "Account Secret", secret: true }],
    keyUrl: "https://app.chameleon.io/settings/tokens",
    help: "1) Sign in at app.chameleon.io and open “Settings” → “Tokens” (app.chameleon.io/settings/tokens). 2) Generate the "
      + "account token (Account Secret) and copy it: it can be downloaded only once. 3) The token belongs to the Chameleon "
      + "account and gives access to its Experiences, user profiles and companies; the documentation does not state a minimum plan.",
    test: { path: "/", message: (d) => (d?.account?.id ? `Chameleon account ${d.account.id}` : "Account Secret is valid") },
    examples: "The version (v3) and the environment (edit, analyze, observe) are part of the path. Examples: GET /v3/edit/tours, "
      + "GET /v3/edit/surveys, GET /v3/edit/segments, GET /v3/edit/tags, GET /v3/edit/event_names, "
      + "GET /v3/analyze/profile?uid=… (profile of an end user), GET /v3/analyze/companies.",
  },
  {
    id: "chartly", name: "Chartly", category: "data",
    description: "Chart.js charts as PNG or SVG images with a permanent URL",
    website: "https://chartly.dev", docs: "https://api.chartly.dev", logo: { favicon: "https://chartly.dev" },
    baseUrl: "https://api.chartly.dev",
    auth: { type: "header", name: "X-Api-Key" },
    fields: [{ id: "token", label: "API key (ck_live_…)", secret: true }],
    help: "1) Create an account at chartly.dev (includes 500 free charts, no card required) and sign in to the dashboard. 2) Create "
      + "an API key (it starts with ck_live_) and copy it. 3) Each new chart uses one render from your quota; repeated ones are "
      + "served from the cache and do not count. Signed permanent URLs (/v1/chart/create) require a paid plan.",
    test: { method: "POST", path: "/v1/chart", body: {}, acceptStatus: [400, 422], message: "API key is valid (the test does not render anything)" },
    examples: "The PNG arrives as base64 and is truncated if it is large: ask for \"format\": \"svg\" (it arrives as text) or use /v1/chart/create. "
      + "Examples: POST /v1/chart {\"chart\": {\"type\": \"bar\", \"data\": {\"labels\": [\"Mon\", \"Tue\"], "
      + "\"datasets\": [{\"data\": [3, 5]}]}}, \"width\": 600, \"height\": 400, \"format\": \"svg\"}, "
      + "POST /v1/chart/create (same body; returns a permanent short URL that cannot be deleted), "
      + "GET /v1/chart/{id} (image at that URL), GET /v1/status.",
  },
  {
    id: "chartmogul", name: "ChartMogul", category: "data",
    description: "Subscription analytics: MRR, customers, plans and invoices",
    website: "https://chartmogul.com", docs: "https://dev.chartmogul.com/reference/", logo: { simpleIcons: "chartmogul" },
    baseUrl: "https://api.chartmogul.com/v1",
    auth: { type: "basic", usernameField: "token", fixedPassword: "" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) Sign in to ChartMogul and open your profile (“Profile”) → “API keys”. 2) Click “New API key”, give it a name and choose "
      + "the “Read-only” level (use read and write only if you will import data); then copy it. 3) It is sent as the Basic auth "
      + "username with an empty password; the documentation does not state a minimum plan.",
    test: { path: "/account", account: (d) => d?.name },
    examples: "Examples: GET /account, GET /customers?page=1&per_page=50, GET /customers/search?email=…, "
      + "GET /metrics/mrr?start-date=2026-01-01&end-date=2026-09-30&interval=month, "
      + "GET /metrics/all?start-date=2026-01-01&end-date=2026-09-30&interval=month, GET /plans, GET /data_sources.",
  },
  {
    id: "clickhouse", name: "ClickHouse", category: "data",
    description: "Analytics database: SQL queries, databases and tables",
    website: "https://clickhouse.com", docs: "https://clickhouse.com/docs/interfaces/http", logo: { simpleIcons: "clickhouse" },
    baseUrl: "{url}", timeout: LONG_TIMEOUT,
    auth: { type: "basic", usernameField: "username", passwordField: "key" },
    fields: [{ id: "url", label: "HTTP interface URL (https://…:8443)", format: "url",
               help: "In ClickHouse Cloud, the one under “Connect” → “HTTPS”. On a self-hosted server, https://your-server:8443 (without "
                 + "TLS, port 8123, only allowed on this same server)." },
             { id: "username", label: "Username", default: "default" },
             { id: "key", label: "Password", secret: true, optional: true,
               help: "Leave it empty if the user has no password (self-hosted installations with the “default” user)." }],
    help: "1) In ClickHouse Cloud, open your service → “Connect” and choose “HTTPS”: the address (ending in :8443) and the user are "
      + "listed there. On a self-hosted server, use its https address with port 8443. 2) Create a read-only user for this "
      + "connection (recommended) and enter its password. 3) If the service restricts access by IP, add this server's IP to the "
      + "allow list. The connection uses the database's HTTP interface, not the ClickHouse Cloud administration API.",
    test: { path: "/", query: { query: "SELECT currentUser() AS username, version() AS version", default_format: "JSON" },
              account: (d) => (d?.data?.[0]?.username ? `${d.data[0].username} (ClickHouse ${d.data[0].version})` : null) },
    examples: "The SQL goes in the query parameter and GET requests are read-only (the server rejects the ones that modify data). "
      + "Examples: GET /?query=SHOW DATABASES&default_format=JSON, GET /?query=SELECT * FROM system.tables LIMIT 20&default_format=JSON, "
      + "GET /?database=my_db&query=DESCRIBE TABLE my_table&default_format=JSON. For INSERT or DDL: POST / with the SQL as a text body "
      + "(body_base64 and content_type text/plain). GET /ping does not require authentication.",
    tools: [
      { name: "clickhouse_query", title: "ClickHouse: read-only SQL query", annotations: { readOnlyHint: true },
        description: "Runs a read-only SQL query (SELECT, SHOW, DESCRIBE, EXPLAIN…) and returns columns and rows. "
          + "The server rejects queries that modify data.",
        schema: { sql: z.string().min(1).describe("SQL query, without a FORMAT clause"),
                   max_rows: z.number().int().min(1).max(10000).default(100).describe("Maximum number of rows returned") },
        async run({ sql, max_rows }, p) {
          const params = { query: sql.trim().replace(/;+\s*$/, ""), default_format: "JSON" };
          // Truncates the result on the server; if the user's profile is readonly=1 it cannot change settings, so it is requested without truncating.
          let r = await p({ path: "/", query: { ...params, max_result_rows: max_rows, result_overflow_mode: "break" } });
          if (!r.ok && /readonly/i.test(JSON.stringify(r.data))) r = await p({ path: "/", query: params });
          const d = ensureOk(r, "ClickHouse");
          const rows = (d?.data || []).slice(0, max_rows);
          return { columns: (d?.meta || []).map((c) => `${c.name} (${c.type})`), rows, rows_returned: rows.length,
                   seconds: d?.statistics?.elapsed };
        } },
    ],
  },
  {
    id: "cloro", name: "Cloro", category: "data",
    description: "Structured data from Google and AI assistants (ChatGPT…)",
    website: "https://cloro.dev", docs: "https://cloro.dev/docs", logo: { favicon: "https://cloro.dev" },
    baseUrl: "https://api.cloro.dev/v1", timeout: LONG_TIMEOUT,
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://dashboard.cloro.dev/api-keys",
    help: "1) Sign up at dashboard.cloro.dev: the free plan gives 500 credits per month, no card required. 2) Open "
      + "dashboard.cloro.dev/api-keys, create a key and copy it: it works for all endpoints. 3) Each extraction uses credits "
      + "(Google Search from 5 and Google AI Mode from 6); checking the balance is free.",
    test: { path: "/credits", message: (d) => `${d?.remaining ?? "?"} credits available` },
    examples: "Examples: GET /credits (free), POST /monitor/google {\"query\": \"best crm for small business\", \"country\": \"US\"}, "
      + "POST /monitor/chatgpt {\"prompt\": \"…\", \"country\": \"US\"}, POST /monitor/perplexity {\"prompt\": \"…\", \"country\": \"US\"}, "
      + "POST /async/task {\"taskType\": …, \"payload\": {…}} (async queue; check GET /async/task/{taskId}), "
      + "GET /countries?model=chatgpt. Each query uses credits.",
  },
  {
    id: "codereadr", name: "CodeREADr", category: "data",
    description: "Barcode scanning: services, users and scans",
    website: "https://www.codereadr.com", docs: "https://developer.codereadr.com/1.0/api/overview/",
    logo: { favicon: "https://www.codereadr.com" },
    baseUrl: "https://api.codereadr.com/api",
    auth: { type: "signature", sign: keyInForm },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://secure.codereadr.com/account/api/key",
    help: "1) You need a CodeREADr account on a paid plan: the API is not available on free accounts. 2) Sign in at "
      + "secure.codereadr.com, open “Account Settings” → “API Keys” and generate or copy your key: Conector adds it "
      + "automatically as the api_key variable in every POST. 3) CodeREADr disables GET requests by default, so all calls "
      + "are sent as POST with a form, and it always responds in XML.",
    test: { method: "POST", path: "/", form: { section: "users", action: "retrieve" }, validate: checkCodereadrXml,
              message: (d) => count((String(d).match(/<user id=/g) || []).length, "user in the account", "users in the account") },
    examples: "Always POST to “/” with the form parameter (not JSON); the response is XML with <status>1</status> if everything went well. "
      + "Examples: form {section: \"users\", action: \"retrieve\"}, {section: \"services\", action: \"retrieve\"}, "
      + "{section: \"devices\", action: \"retrieve\"}, {section: \"databases\", action: \"retrieve\"}, "
      + "{section: \"scans\", action: \"retrieve\", start_date: \"2026-10-01\", status: \"1\"} (valid scans since that date).",
  },
  {
    id: "coingecko", name: "CoinGecko", category: "data",
    description: "Cryptocurrencies: prices, markets, exchanges, NFTs and onchain",
    website: "https://www.coingecko.com", docs: "https://docs.coingecko.com/reference/introduction", logo: { favicon: "https://www.coingecko.com" },
    baseUrl: "https://{server}/api/v3",
    auth: { type: "custom",
            apply: (c) => ({ headers: { [c.server === "pro-api.coingecko.com" ? "x-cg-pro-api-key" : "x-cg-demo-api-key"]: c.token } }) },
    fields: [{ id: "token", label: "API key", secret: true },
             { id: "server", label: "Plan", default: "api.coingecko.com",
               options: [["api.coingecko.com", "Demo (free)"], ["pro-api.coingecko.com", "Pro (paid)"]],
               help: "Each key type only works on its own server: a Demo key on the Pro server (or the other way around) returns an error." }],
    keyUrl: "https://www.coingecko.com/en/developers/dashboard",
    help: "1) Create an account at coingecko.com and open the developer dashboard (coingecko.com/en/developers/dashboard). "
      + "2) Click “Add New Key”, give it a name and copy it (Demo plan keys start with CG-). 3) Choose the key's plan below: "
      + "Demo is free, with about 30 calls per minute and 10,000 per month; paid plans have higher limits and more endpoints.",
    test: { path: "/ping", message: "API key is valid" },
    examples: "Examples: GET /simple/price?ids=bitcoin,ethereum&vs_currencies=eur&include_24hr_change=true, "
      + "GET /coins/markets?vs_currency=eur&order=market_cap_desc&per_page=20, GET /coins/{id}/market_chart?vs_currency=eur&days=30, "
      + "GET /search/trending, GET /coins/list, GET /exchanges?per_page=20.",
  },
  {
    id: "coinmarketcal", name: "CoinMarketCal", category: "data",
    description: "Crypto calendar: events, announcements, coins and categories",
    website: "https://coinmarketcal.com", docs: "https://coinmarketcal.com/developer/docs", logo: { favicon: "https://coinmarketcal.com" },
    baseUrl: "https://api.coinmarketcal.com/v2",
    auth: { type: "header", name: "x-api-key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://coinmarketcal.com/developer",
    help: "1) Create an account at coinmarketcal.com and open coinmarketcal.com/developer (there is a free plan). 2) Generate your "
      + "API key and copy it: it is sent in the x-api-key header. 3) The free plan only sees future events and cannot filter by "
      + "category (it returns 403); history since 2017 comes with the Elite and Enterprise plans.",
    test: { path: "/events", query: { limit: 1 }, message: "API key is valid" },
    examples: "Responses contain “data” and “meta”; for the next page, pass meta.cursor as the cursor parameter. Examples: "
      + "GET /events?coins=ethereum,solana&limit=10 (coins by slug, not by symbol; maximum 100), "
      + "GET /events?from=2026-10-20&to=2026-12-31&keyword=upgrade&impactMin=7, GET /events/{id}, GET /coins/ethereum, "
      + "GET /categories, GET /usage (your quota consumption).",
  },
  {
    id: "coinmarketcap", name: "CoinMarketCap", category: "data",
    description: "Cryptocurrencies: quotes, listings, exchanges and metrics",
    website: "https://coinmarketcap.com", docs: "https://coinmarketcap.com/api/documentation/v1/", logo: { simpleIcons: "coinmarketcap" },
    baseUrl: "https://pro-api.coinmarketcap.com",
    auth: { type: "header", name: "X-CMC_PRO_API_KEY" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://pro.coinmarketcap.com/account",
    help: "1) Sign up at pro.coinmarketcap.com: the Basic plan is free (10,000 credits per month and 30 requests per minute). "
      + "2) In the dashboard, copy your API key. 3) Each call uses credits depending on the data you request; historical data and "
      + "several endpoints are only available on paid plans.",
    test: { path: "/v1/key/info",
              message: (d) => (d?.data?.usage?.current_month
                ? `This month: ${d.data.usage.current_month.credits_used} credits used, ${d.data.usage.current_month.credits_left} left`
                : "API key is valid") },
    examples: "Responses contain “data” and “status” (with credit_count). Examples: GET /v1/key/info (plan and credits used), "
      + "GET /v1/cryptocurrency/listings/latest?limit=10&convert=EUR, GET /v2/cryptocurrency/quotes/latest?symbol=BTC,ETH&convert=EUR, "
      + "GET /v1/global-metrics/quotes/latest, GET /v1/cryptocurrency/map?limit=100.",
  },
  {
    id: "collegefootballdata", name: "College Football Data", category: "data",
    description: "College football (NCAA): games, teams and data",
    website: "https://collegefootballdata.com", docs: "https://apinext.collegefootballdata.com",
    logo: { favicon: "https://collegefootballdata.com" },
    baseUrl: "https://api.collegefootballdata.com",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://collegefootballdata.com/key",
    help: "1) Request your key at collegefootballdata.com/key: it arrives by email. 2) Copy it; it is sent as a Bearer token. "
      + "3) The free account has a monthly call quota and Patreon supporters get more. GET /info shows how many you have "
      + "left.",
    test: { path: "/info",
              message: (d) => (d?.remainingCalls != null ? `${d.remainingCalls} calls left this month` : "API key is valid") },
    examples: "Examples: GET /info (remaining calls), GET /teams?conference=SEC, GET /games?year=2025&seasonType=regular&week=1, "
      + "GET /rankings?year=2025&week=1, GET /conferences, GET /calendar?year=2025.",
  },
  {
    id: "companyenrich", name: "CompanyEnrich", category: "data",
    description: "Company data: enrich by domain, search and find similar",
    website: "https://companyenrich.com", docs: "https://docs.companyenrich.com", logo: { favicon: "https://companyenrich.com" },
    baseUrl: "https://api.companyenrich.com",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API token", secret: true }],
    help: "1) Sign up at companyenrich.com (there is a free trial with 500 credits) and sign in to the dashboard. 2) Generate an "
      + "API token and copy it; it is sent as a Bearer token. 3) Each call uses credits depending on the endpoint; GET /me, which "
      + "shows the balance, is free.",
    test: { path: "/me",
              message: (d) => (d?.credits ? `${d.credits.total - d.credits.used} of ${d.credits.total} credits available` : "Token is valid") },
    examples: "Examples: GET /me (credits used and total, free), GET /companies/enrich?domain=example.com, "
      + "POST /companies/search (search with filters), POST /companies/similar (companies similar to a given one); "
      + "the filters are in the API reference.",
  },
  {
    id: "companyurlfinder", name: "Company URL Finder", category: "data",
    description: "Domain, name and LinkedIn page of a company",
    website: "https://www.companyurlfinder.com", docs: "https://apidocs.companyurlfinder.com/apis",
    logo: { favicon: "https://www.companyurlfinder.com" },
    baseUrl: "https://api.companyurlfinder.com/v2",
    auth: { type: "header", name: "x-api-key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) Create an account at companyurlfinder.com (the free plan includes 15 lookups per month) and sign in to the dashboard. "
      + "2) Generate an API key and copy it. 3) Each record found uses 1 credit; nothing is charged if there is no match. "
      + "Limit: 100 requests per minute per key.",
    test: { method: "POST", path: "/services/name_to_domain", form: {}, acceptStatus: [400, 422],
              message: "API key is valid (the test does not use credits)" },
    examples: "All calls are POST with a form (not JSON). Examples: POST /services/name_to_domain "
      + "{company_name: \"Microsoft\", country_code: \"US\"}, POST /services/domain_to_name {domain: \"ibm.com\"}, "
      + "POST /services/name_to_linkedin {query: \"cufinder.io\"} (accepts a name or a domain). "
      + "The response includes data.remaining_credits.",
  },
  {
    id: "contextdev", name: "Context.dev", category: "data",
    description: "Web to data: scraping, crawling, brands and web search",
    website: "https://www.context.dev", docs: "https://docs.context.dev", logo: { favicon: "https://www.context.dev" },
    baseUrl: "https://api.context.dev/v1", timeout: LONG_TIMEOUT,
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://context.dev/dashboard/api-keys",
    help: "1) Sign up at context.dev (the free plan gives 1,000 credits per month, no card required) and sign in to the dashboard. "
      + "2) Create an API key and copy it; it is sent as a Bearer token and can be restricted to certain permissions. 3) Each "
      + "scrape uses 1 credit (JSON extraction adds 4 more) and the free plan allows 10 requests per minute.",
    test: { path: "/org/logs", query: { limit: 1 }, message: "API key is valid" },
    examples: "Examples: POST /web/scrape {\"url\": \"https://…\", \"formats\": {\"markdown\": true}} (1 credit), "
      + "GET /web/urls?domain=example.com (URL map of a site), POST /web/search {\"query\": \"…\", \"numResults\": 5}, "
      + "POST /brand/retrieve {\"type\": \"by_domain\", \"domain\": \"stripe.com\"} (logos, colors and company data), "
      + "GET /brand/search?query=…, GET /org/logs (usage log).",
  },
  {
    id: "controld", name: "Control D", category: "security",
    description: "DNS filtering: profiles, devices, rules and analytics",
    website: "https://controld.com", docs: "https://docs.controld.com/reference", logo: { favicon: "https://controld.com" },
    baseUrl: "https://api.controld.com",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API token", secret: true }],
    keyUrl: "https://controld.com/dashboard/api",
    help: "1) Go to controld.com/dashboard/api (“API Tokens” section) and click “+”. 2) Give the token a name and choose the level: "
      + "“Read” (read-only, recommended if you will only query data) or “Write” (read and write); optionally restrict the IPs "
      + "it can be used from. 3) Click “Add” and copy it. The documentation does not state a minimum plan.",
    test: { path: "/profiles",
              message: (d) => (Array.isArray(d?.body?.profiles) ? count(d.body.profiles.length, "profile", "profiles") : "Token is valid") },
    examples: "Responses are wrapped in “body”. The API is not versioned and may change without notice. Examples: GET /users "
      + "(account data), GET /profiles, GET /profiles/{profile_id}/rules, GET /profiles/{profile_id}/filters, GET /devices, "
      + "GET /analytics/endpoints, GET /billing/products.",
  },
  {
    id: "corrently", name: "Corrently", category: "data",
    description: "Green electricity in Germany: CO2, prices and forecast",
    website: "https://corrently.io", docs: "https://corrently.io/books/corrently-energy-apis", logo: { favicon: "https://corrently.io" },
    baseUrl: "https://api.corrently.io",
    auth: { type: "query", name: "token" },
    fields: [{ id: "token", label: "API token (JWT)", secret: true }],
    keyUrl: "https://console.corrently.io/token.html",
    help: "1) Open console.corrently.io/token.html and generate a free trial token. 2) Copy it: it expires after a week, so you "
      + "will need to renew it. 3) The data is for Germany and is requested by postal code (zip). Without a valid token the API "
      + "keeps responding with a low request limit and warns that it will stop allowing it.",
    test: { path: "/v2.0/gsi/prediction", query: { zip: "10115" },
              message: (d) => `Forecast received (${Array.isArray(d?.forecast) ? d.forecast.length : "?"} hours). Corrently does not reject `
                + "expired tokens: renew it every week" },
    examples: "Everything is requested by German postal code (zip). Examples: GET /v2.0/gsi/prediction?zip=10115 (Grünstrom Index, CO2 and "
      + "price per hour), GET /v2.0/marketdata?zip=10115 (electricity prices), GET /v2.0/gsi/dispatch?zip=10115 (renewable mix), "
      + "GET /v2.0/gsi/advisor?zip=10115 (when it is best to consume), GET /v2.0/mol/analysis.",
  },
  {
    id: "crawlbase", name: "Crawlbase", category: "data",
    description: "Web crawling: page downloads, crawler queues and storage",
    website: "https://crawlbase.com", docs: "https://crawlbase.com/docs", logo: { favicon: "https://crawlbase.com" },
    baseUrl: "https://api.crawlbase.com", timeout: LONG_TIMEOUT,
    auth: { type: "query", name: "token" },
    fields: [{ id: "token", label: "Token (normal or JavaScript)", secret: true }],
    keyUrl: "https://crawlbase.com/console",
    help: "1) Sign up at crawlbase.com (up to 5,000 free requests, no card required) and open the console (crawlbase.com/console). "
      + "2) Copy the normal token (static pages) or the JavaScript token (pages rendered with JS): connect the one you "
      + "need. 3) Only successful downloads are charged. The crawler management endpoints that carry the token in the path "
      + "(/crawler/{token}/…) cannot be used from here.",
    test: { path: "/storage/total_count", message: "Token is valid" },
    examples: "The page is returned as is (HTML). Examples: GET /?url=https%3A%2F%2Fexample.com (downloads a page), "
      + "GET /?url=…&format=json (with status and headers), GET /?url=…&store=true (saves it in Storage), GET /storage?rid=…, "
      + "GET /storage/rids, GET /?crawler=NAME&callback=true&url=… (adds the URL to a crawler's queue), "
      + "GET /account?product=crawling-api (usage; allows very few requests).",
  },
  {
    id: "currentsapi", name: "Currents API", category: "data",
    description: "Real-time global news by language, country and topic",
    website: "https://currentsapi.services", docs: "https://currentsapi.services/en/docs", logo: { favicon: "https://currentsapi.services" },
    baseUrl: "https://api.currentsapi.services/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://currentsapi.services/en/profile",
    help: "1) Create a free account at currentsapi.services (250 requests per day, no card required) and sign in. 2) Copy the "
      + "API key shown in your account. 3) Paid plans (from $69 per month) raise the request limit, the history and the "
      + "size of the results.",
    test: { path: "/latest-news", query: { page_size: 1 }, message: "API key is valid" },
    examples: "Examples: GET /latest-news?language=en&page_size=20, GET /search?keywords=cybersecurity&language=en&start_date=2026-10-01, "
      + "GET /available/languages, GET /available/regions, GET /available/categories (these three do not require a key).",
  },
  {
    id: "dadata", name: "DaData", category: "data",
    description: "Addresses, companies and personal data in Russia",
    website: "https://dadata.ru", docs: "https://dadata.ru/api/", logo: { favicon: "https://dadata.ru" },
    baseUrl: "https://suggestions.dadata.ru/suggestions/api/4_1/rs", allowedOrigins: ["https://cleaner.dadata.ru", "https://dadata.ru"],
    auth: [{ type: "header", name: "Authorization", prefix: "Token " },
           { type: "header", name: "X-Secret", field: "secret" }],
    fields: [{ id: "token", label: "API key", secret: true },
             { id: "secret", label: "Secret key (data cleaning and profile)", secret: true, optional: true,
               help: "Only the cleaning API (cleaner) and the profile API require it; suggestions work with the API key alone." }],
    keyUrl: "https://dadata.ru/profile/",
    help: "1) Sign up at dadata.ru. 2) In your profile (dadata.ru/profile), copy the API key (API-ключ) and, if you will use "
      + "data cleaning or check the balance, also the secret key (Секретный ключ). 3) The free plan allows up to "
      + "10,000 suggestions per day; data cleaning is charged per record.",
    test: { method: "POST", path: "/suggest/address", body: { query: "Москва", count: 1 }, message: "API key is valid" },
    examples: "The data is for Russia (in Russian). Examples: POST /suggest/address {\"query\": \"москва хабар\", \"count\": 5}, "
      + "POST /suggest/party {\"query\": \"сбербанк\"}, POST /findById/party {\"query\": \"7707083893\"} (company by INN), "
      + "POST /geolocate/address {\"lat\": 55.878, \"lon\": 37.653}, "
      + "POST https://cleaner.dadata.ru/api/v1/clean/address [\"москва сухонская 11\"] (cleaning: paid and requires the secret key), "
      + "GET https://dadata.ru/api/v2/profile/balance (balance, requires the secret key).",
  },
  {
    id: "data247", name: "Data247", category: "data",
    description: "Phone, email, IP and address lookups: validate and enrich",
    website: "https://data247.com", docs: "https://www.data247.com/api_user_manual", logo: { favicon: "https://data247.com" },
    baseUrl: "https://api.data247.com",
    auth: { type: "query", name: "key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) Sign in to your Data247 account and open the “Account” → “API Key / Password” menu. 2) If there is no key in the list, "
      + "enter a description and click “Generate API Key”; then copy it. 3) Each service is charged per query against the account "
      + "balance. If you enable IP authentication, add this server's IP to the allowed ones.",
    test: { path: "/v3.0", query: { api: "B" }, validate: checkData247,
              message: (d) => `Account balance: ${d?.response?.results?.[0]?.balance ?? "?"}` },
    examples: "The service is chosen with “api”. It always responds with 200: check response.status (OK, or a D247_… error). "
      + "Examples: GET /v3.0?api=B (balance), GET /v3.0?api=QR (rates for each service), GET /v3.0?api=QU&period=month (usage), "
      + "GET /v3.0?api=VE&email=… (is the email valid?), GET /v3.0?api=VP&phone=… (is the phone active?), GET /v3.0?api=GI&ip=… (geolocates an IP). "
      + "Data queries use balance.",
  },
  {
    id: "databox", name: "Databox", category: "data",
    description: "KPI dashboard: data sources, datasets, metrics and Databoards",
    website: "https://databox.com", docs: "https://developers.databox.com", logo: { favicon: "https://databox.com" },
    baseUrl: "https://api.databox.com/v2",
    auth: { type: "header", name: "x-api-key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://account.databox.com/profile",
    help: "1) Sign in to Databox as an administrator and open account.databox.com/profile (“Account Management” → “Profile”). 2) Under "
      + "“Password & Security”, in the “API key” section, click “Create” and copy the key; you can restrict it to certain IPs with "
      + "“Manage allowed IPs”. 3) The key inherits the permissions of whoever creates it. The API is part of the paid plans "
      + "(Analyst, Team and Agency), not the free one.",
    test: { path: "/auth/validate-key", message: "API key is valid" },
    examples: "To act on a specific account of the organization, add the x-account-id header. Examples: "
      + "GET /auth/validate-key, GET /organization, GET /accounts, GET /data-sources, GET /datasets, GET /datasets/{id}/schema, "
      + "GET /datasets/{id}/data, POST /datasets/{id}/data (ingests rows), GET /metrics, GET /databoards.",
  },
  {
    id: "databricks", name: "Databricks", category: "data",
    description: "Lakehouse: clusters, jobs, SQL, Unity Catalog and files",
    website: "https://www.databricks.com", docs: "https://docs.databricks.com/api/workspace/introduction", logo: { simpleIcons: "databricks" },
    baseUrl: "{url}/api",
    auth: { type: "custom", apply: async (c) => ({ headers: { Authorization: `Bearer ${await databricksAccess(c)}` } }) },
    fields: [{ id: "url", label: "Workspace URL (https://…)", format: "url",
               help: "The one you see in the browser when you sign in to Databricks, with nothing after it "
                 + "(e.g. https://dbc-a1b2c3d4-e5f6.cloud.databricks.com)." },
             { id: "token", label: "Personal access token (dapi…)", secret: true, optional: true,
               help: "If you fill it in, it is used instead of the Client ID and secret." },
             { id: "client_id", label: "Service principal Client ID", optional: true },
             { id: "client_secret", label: "Service principal Client secret", secret: true, optional: true }],
    // One click: user OAuth (code + PKCE) against the workspace itself, with a custom OAuth application that an administrator
    // registers once in the account console. offline_access provides the refresh token; the access token lasts 1 hour.
    oauth: { scopes: ["all-apis", "offline_access"], fields: ["url"],
      provider: { name: "Databricks", key: "databricks", redirect: "localhost",
        authorizeUrl: "{url}/oidc/v1/authorize", tokenUrl: "{url}/oidc/v1/token",
        help: "1) As a Databricks account administrator, sign in to the account console (accounts.cloud.databricks.com; on "
          + "Azure, accounts.azuredatabricks.net; on Google Cloud, accounts.gcp.databricks.com), click the “Settings” icon and open "
          + "“App connections” → “Add connection”. 2) Name it “Conector”, paste the redirect URI shown below into “Redirect URLs”, "
          + "under “Access scopes” select “All APIs” (the scopes shown below; offline_access is already allowed) and turn on "
          + "“Generate a client secret”. Increase the “Refresh token TTL” (7 days by default) so you do not have to authorize "
          + "again every week. 3) Copy the “Client ID” and the “Client secret” (the secret is shown only once). "
          + "The same application works for all workspaces in that Databricks account." },
      help: "You act in Databricks with your user's permissions. The connection renews itself as long as the application's refresh token "
        + "has not expired (7 days by default; the administrator can extend it in “App connections”): if it expires, "
        + "connect again." },
    help: "1) Copy your workspace address (https://dbc-….cloud.databricks.com, https://adb-….azuredatabricks.net or "
      + "https://….gcp.databricks.com). 2) Personal token: in the workspace, open your user → “Settings” → “Developer” → “Access "
      + "tokens” → “Manage” → “Generate new token”, set an expiration and copy it. 3) Alternative for automation: a service "
      + "principal with an OAuth secret (“Settings” → “Identity and access” → “Service principals”); fill in its Client ID and secret "
      + "instead of the token. Access has the permissions of that user or service principal.",
    test: { path: "/2.0/preview/scim/v2/Me", account: (d) => d?.userName || d?.displayName },
    examples: "The version is part of the path. Examples: GET /2.0/preview/scim/v2/Me, GET /2.1/jobs/list, GET /2.0/clusters/list, "
      + "GET /2.0/sql/warehouses, POST /2.0/sql/statements {\"warehouse_id\": \"…\", \"statement\": \"SELECT 1\", \"wait_timeout\": \"30s\"}, "
      + "GET /2.1/unity-catalog/catalogs, GET /2.0/workspace/list?path=/.",
  },
  {
    id: "datagma", name: "Datagma", category: "data",
    description: "Contact and company enrichment, emails and phone numbers",
    website: "https://datagma.com", docs: "https://datagmaapi.readme.io", logo: { favicon: "https://datagma.com" },
    baseUrl: "https://gateway.datagma.net/api/ingress",
    auth: { type: "query", name: "apiId" },
    fields: [{ id: "token", label: "API ID", secret: true }],
    keyUrl: "https://app.datagma.com/user-api",
    help: "1) Sign up at app.datagma.com (the free plan includes 3 phone numbers or 100 emails per month, no card required, and all "
      + "plans include the API). 2) Open the “API” section (app.datagma.com/user-api) and copy your API ID: it is sent as the apiId "
      + "parameter. 3) Each search with a result uses credits from your plan (a mobile phone number costs 30); check the balance with GET /v1/mine.",
    test: { path: "/v1/mine", account: (d) => (d?.email ? `${d.email} (${d.currentCredit ?? "?"} credits)` : null),
              message: "API ID is valid" },
    examples: "Examples: GET /v1/mine (credits and plan, free), GET /v2/full?data=… (enriches a person or company from an "
      + "email, a LinkedIn URL or a domain), GET /v8/findEmail?fullName=…&company=… (verified professional email), "
      + "GET /v1/search?email=… (mobile phone numbers; also a LinkedIn username), GET /v1/reverse_phone_lookup?code=ES&number=…, "
      + "GET /v4/update (job change of a contact). Searches with a result use credits.",
  },
  {
    id: "diffbot", name: "Diffbot", category: "data",
    description: "AI-powered web data extraction and Knowledge Graph",
    website: "https://www.diffbot.com", docs: "https://docs.diffbot.com", logo: { favicon: "https://www.diffbot.com" },
    baseUrl: "https://api.diffbot.com", allowedOrigins: ["https://kg.diffbot.com", "https://nl.diffbot.com"], timeout: LONG_TIMEOUT,
    auth: { type: "query", name: "token" },
    fields: [{ id: "token", label: "API token", secret: true }],
    keyUrl: "https://app.diffbot.com/get-started",
    help: "1) Sign up at app.diffbot.com: the free plan gives 10,000 credits per month and 5 requests per minute, no card required. "
      + "2) Copy the token from your dashboard (app.diffbot.com/get-started). 3) Each extracted page uses 1 credit and each "
      + "Knowledge Graph entity queried, 25.",
    test: { path: "/v4/account", message: "Token is valid" },
    examples: "Conector adds the token. Examples: GET /v4/account (plan and credits), "
      + "GET /v3/article?url=https%3A%2F%2Fexample.com%2Fnews, GET /v3/analyze?url=… (detects the page type and extracts it), "
      + "GET /v3/product?url=…, GET https://kg.diffbot.com/kg/v3/dql?type=query&size=5&query=type:Organization name:\"Microsoft\" "
      + "(Knowledge Graph).",
  },
  {
    id: "dovetail", name: "Dovetail", category: "data",
    description: "User research: notes, highlights, insights and contacts",
    website: "https://dovetail.com", docs: "https://developers.dovetail.com", logo: { simpleIcons: "dovetail" },
    baseUrl: "https://dovetail.com/api",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API token (api.…)", secret: true }],
    keyUrl: "https://dovetail.com/settings/user/account",
    help: "1) In Dovetail, open dovetail.com/settings/user/account (your account settings). 2) Enter a name for the key and "
      + "create it; copy it right away, because it is shown only once. 3) The token (it starts with api.) expires after 30 days: "
      + "you will need to generate another and update it here. It acts with your user's permissions.",
    test: { path: "/v1/token/info", message: (d) => (d?.data?.subdomain ? `Workspace: ${d.data.subdomain}` : "Token is valid") },
    examples: "Responses are wrapped in “data”. Examples: GET /v1/token/info (the token's workspace), GET /v1/projects, "
      + "GET /v1/notes, GET /v1/highlights, GET /v1/insights, GET /v1/contacts, GET /v1/tags.",
  },
  {
    id: "dromo", name: "Dromo", category: "data",
    description: "Spreadsheet importer: saved schemas and uploads",
    website: "https://dromo.io", docs: "https://developer.dromo.io", logo: { favicon: "https://dromo.io" },
    baseUrl: "https://app.dromo.io/api/v1",
    auth: { type: "header", name: "X-Dromo-License-Key" },
    fields: [{ id: "token", label: "Backend API key", secret: true }],
    keyUrl: "https://dashboard.dromo.io",
    help: "1) Sign in at dashboard.dromo.io and open the API keys section. 2) Copy the backend key (not the frontend key, "
      + "which is public) and do not use it in client-side code. 3) The REST API comes with the Professional plan; “headless” import "
      + "(of files, without an interface) is an add-on of the Enterprise plan.",
    test: { path: "/schemas/",
              message: (d) => {
                const n = Array.isArray(d) ? d.length : (d?.count ?? d?.results?.length);
                return n != null ? count(n, "saved schema", "saved schemas") : "API key is valid";
              } },
    examples: "Paths end in “/”. Examples: GET /schemas/, GET /schemas/{id}/, POST /schemas/ {\"name\": \"…\", \"fields\": […], "
      + "\"settings\": {…}}, GET /uploads/, GET /upload/{id}/metadata/, GET /headless/imports/, "
      + "POST /headless/imports/ {\"schema_id\": \"…\", \"original_filename\": \"data.csv\"} (returns an upload URL valid for 30 minutes).",
  },
];
