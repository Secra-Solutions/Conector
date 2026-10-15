// Batch 26 of the catalog: finance (news and market data, currencies, payments, donations, entity identifiers,
// accounting, subscriptions, bank aggregation, crypto payments and personal finance).

const count = (d, one, many) => (Array.isArray(d) ? `${d.length} ${d.length === 1 ? one : many}` : null);

export default [
  {
    id: "finlight", name: "Finlight", category: "finance", description: "Financial and company news with search and sentiment",
    website: "https://finlight.me", docs: "https://docs.finlight.me", logo: { favicon: "https://finlight.me" },
    baseUrl: "https://api.finlight.me",
    auth: { type: "header", name: "X-API-KEY" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://app.finlight.me",
    help: "1) Create an account at finlight.me (there is a free plan). 2) Copy your API key from the dashboard. 3) Each search counts toward your quota; "
      + "so does the connection test.",
    test: { method: "POST", path: "/v2/articles", body: { query: "Apple", pageSize: 1 }, message: "API key is valid" },
    examples: "Examples: POST /v2/articles {\"query\": \"ticker:AAPL\", \"language\": \"en\", \"pageSize\": 20, \"from\": \"2026-10-01\"}, "
      + "POST /v2/articles {\"query\": \"Tesla\", \"includeContent\": true}, GET /v2/sources.",
  },
  {
    id: "finmo", name: "Finmo", category: "finance", description: "Business payments: payins, payouts, wallets and currency exchange",
    website: "https://finmo.net", docs: "https://docs.finmo.net", logo: { favicon: "https://finmo.net" },
    baseUrl: "https://api.finmo.net/v1",
    auth: { type: "basic", usernameField: "username", passwordField: "token" },
    fields: [{ id: "username", label: "Access key" }, { id: "token", label: "Secret key", secret: true }],
    help: "1) In the Finmo dashboard open “Developers” → “API Keys” and create credentials. 2) Copy the “Access key” and the “Secret key”.",
    test: { path: "/wallets", message: "Credentials are valid" },
    examples: "Examples: GET /wallets, GET /wallets/{walletId}/balances, GET /payins?limit=20, GET /payouts?limit=20, "
      + "POST /fx/quote {\"from\": \"EUR\", \"to\": \"USD\", \"amount\": 1000}, GET /customers.",
  },
  {
    id: "finnhub", name: "Finnhub", category: "finance", description: "Market data: quotes, fundamentals, news and calendars",
    website: "https://finnhub.io", docs: "https://finnhub.io/docs/api", logo: { favicon: "https://finnhub.io" },
    baseUrl: "https://finnhub.io/api/v1",
    auth: { type: "header", name: "X-Finnhub-Token" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://finnhub.io/dashboard",
    help: "1) Create a free account at finnhub.io (60 calls per minute). 2) Copy the API key from your dashboard.",
    test: { path: "/quote", query: { symbol: "AAPL" }, message: "API key is valid" },
    examples: "Examples: GET /quote?symbol=AAPL, GET /stock/profile2?symbol=MSFT, GET /company-news?symbol=AAPL&from=…&to=…, "
      + "GET /stock/metric?symbol=AAPL&metric=all, GET /calendar/earnings?from=…&to=…, GET /search?q=apple.",
  },
  {
    id: "fixer", name: "Fixer", category: "finance", description: "Real-time and historical exchange rates for 170 currencies",
    website: "https://fixer.io", docs: "https://fixer.io/documentation", logo: { favicon: "https://fixer.io" },
    baseUrl: "https://data.fixer.io/api",
    auth: { type: "query", name: "access_key" },
    fields: [{ id: "token", label: "Access key", secret: true }],
    keyUrl: "https://fixer.io/dashboard",
    help: "1) Create an account at fixer.io and copy the “API Access Key” from your dashboard. 2) Conector only uses HTTPS: if the test warns about "
      + "“https_access_restricted”, your plan does not include it.",
    // Errors come back with 200 and success: false.
    test: { path: "/latest", query: { symbols: "USD" },
              validate: (d) => { if (d?.success === false) throw new Error(`Fixer: ${d.error?.info || d.error?.type || "invalid key"}`); },
              message: "Access key is valid" },
    examples: "Examples: GET /latest?base=EUR&symbols=USD,GBP (a base other than EUR only on paid plans), GET /2026-01-15?symbols=USD, "
      + "GET /convert?from=EUR&to=USD&amount=100, GET /timeseries?start_date=…&end_date=…, GET /symbols.",
  },
  {
    id: "flutterwave", name: "Flutterwave", category: "finance", description: "Payments in Africa and worldwide: charges, transfers, balances",
    website: "https://flutterwave.com", docs: "https://developer.flutterwave.com/reference", logo: { favicon: "https://flutterwave.com" },
    baseUrl: "https://api.flutterwave.com/v3",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "Secret key (FLWSECK-…)", secret: true }],
    keyUrl: "https://app.flutterwave.com/dashboard/settings/apis/live",
    help: "1) In the Flutterwave dashboard open “Settings” → “API Keys”. 2) Copy the “Secret Key” (the test one starts with FLWSECK_TEST).",
    test: { path: "/balances", message: (d) => count(d?.data, "balance", "balances") || "Secret key is valid" },
    examples: "Examples: GET /balances, GET /transactions?from=…&to=…, GET /transactions/{id}/verify, POST /payments {\"tx_ref\": \"…\", "
      + "\"amount\": \"100\", \"currency\": \"NGN\", \"redirect_url\": \"https://…\", \"customer\": {\"email\": \"…\"}}, GET /banks/NG.",
  },
  {
    id: "givebutter", name: "Givebutter", category: "finance", description: "Fundraising: campaigns, donations, contacts and teams",
    website: "https://givebutter.com", docs: "https://docs.givebutter.com", logo: { favicon: "https://givebutter.com" },
    baseUrl: "https://api.givebutter.com/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://dashboard.givebutter.com/accounts/settings/integrations/api",
    help: "1) In Givebutter open “Settings” → “Integrations” → “API”. 2) Create a key and copy it (the API is free).",
    test: { path: "/campaigns", message: (d) => count(d?.data, "campaign", "campaigns") || "API key is valid" },
    examples: "Examples: GET /campaigns, GET /campaigns/{id}, GET /transactions?page=1, GET /contacts?page=1, POST /contacts {…}, "
      + "GET /campaigns/{id}/members, GET /tickets.",
  },
  {
    id: "gleif", name: "GLEIF (LEI)", category: "finance", description: "Legal entity identifiers (LEI) and their relationships (public)",
    website: "https://www.gleif.org", docs: "https://www.gleif.org/en/lei-data/gleif-api", logo: { favicon: "https://www.gleif.org" },
    baseUrl: "https://api.gleif.org/api/v1",
    auth: { type: "none" },
    help: "This is a free public API: no key is needed. Click “Enable” to use it from agents.",
    test: { path: "/lei-records", query: { "page[size]": 1, "filter[entity.legalName]": "Deutsche Bank" }, message: "Public API is available" },
    examples: "JSON:API format. Examples: GET /lei-records?filter[entity.legalName]=Apple, GET /lei-records/{lei}, "
      + "GET /lei-records/{lei}/direct-parent, GET /lei-records/{lei}/ultimate-parent, GET /fuzzycompletions?field=entity.legalName&q=appl.",
  },
  {
    id: "hitpay", name: "HitPay", category: "finance", description: "Payments in Southeast Asia: charges, invoices and subscriptions",
    website: "https://www.hitpayapp.com", docs: "https://docs.hitpayapp.com", logo: { favicon: "https://www.hitpayapp.com" },
    baseUrl: "https://{server}/v1",
    auth: { type: "header", name: "X-BUSINESS-API-KEY" },
    fields: [{ id: "token", label: "Business API key", secret: true },
             { id: "server", label: "Environment", default: "api.hit-pay.com",
               options: [["api.hit-pay.com", "Production"], ["api.sandbox.hit-pay.com", "Sandbox (testing)"]] }],
    help: "1) In the HitPay dashboard open “Settings” → “Payment Gateway” → “API Keys”. 2) Copy the business API key (the sandbox one is "
      + "separate). With a wrong key, HitPay responds 404.",
    test: { path: "/payment-requests", message: "API key is valid" },
    examples: "Examples: GET /payment-requests, POST /payment-requests {\"amount\": \"10.00\", \"currency\": \"SGD\", \"email\": \"…\", "
      + "\"redirect_url\": \"https://…\"}, GET /payment-requests/{id}, GET /charges, POST /recurring-billing {…}.",
  },
  {
    id: "lexoffice", name: "Lexware Office", category: "finance", description: "German accounting (formerly lexoffice): contacts and invoices",
    website: "https://office.lexware.de", docs: "https://developers.lexware.io/docs/", logo: { favicon: "https://office.lexware.de" },
    // Lexware renamed lexoffice; the old API (api.lexoffice.io) still responds as a fallback.
    baseUrl: "https://api.lexware.io/v1", allowedOrigins: ["https://api.lexoffice.io"],
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "Public API key", secret: true }],
    keyUrl: "https://app.lexware.de/addons/public-api",
    help: "1) In Lexware Office open “Erweiterungen” → “Public API” (app.lexware.de/addons/public-api). 2) Generate the key and copy it: it has "
      + "access to the whole organization.",
    test: { path: "/profile", account: (d) => d?.companyName || d?.organizationId },
    examples: "Examples: GET /profile, GET /contacts?page=0&size=25, GET /voucherlist?voucherType=invoice&voucherStatus=open, "
      + "GET /invoices/{id}, POST /invoices?finalize=true {…}, GET /articles, GET /payments/{voucherId}.",
  },
  {
    id: "maxio", name: "Maxio (Advanced Billing)", category: "finance", description: "B2B subscription billing: customers, plans and charges",
    website: "https://www.maxio.com", docs: "https://docs.maxio.com/hc/en-us/articles/24294817744013", logo: { favicon: "https://www.maxio.com" },
    baseUrl: "https://{subdomain}.{domain}",
    auth: { type: "basic", usernameField: "token", fixedPassword: "x" },
    fields: [{ id: "subdomain", label: "Site subdomain", format: "subdomain" },
             { id: "domain", label: "Region", default: "chargify.com",
               options: [["chargify.com", "US (….chargify.com)"], ["ebilling.maxio.com", "European Union (….ebilling.maxio.com)"]] },
             { id: "token", label: "API key", secret: true }],
    help: "1) In Maxio Advanced Billing (formerly Chargify) open “Config” → “Integrations” → “API keys” and create a key. 2) Enter your "
      + "site's subdomain here (the part before .chargify.com) and the key.",
    test: { path: "/subscriptions.json", query: { per_page: 1 }, message: "API key is valid" },
    examples: "Examples: GET /subscriptions.json?state=active&per_page=50, GET /customers.json?q=…, GET /products.json, "
      + "GET /invoices.json?status=open, POST /subscriptions.json {\"subscription\": {…}}, GET /subscriptions/{id}/components.json.",
  },
  {
    id: "moneybird", name: "Moneybird", category: "finance", description: "Invoicing and accounting: contacts, invoices, expenses and bank",
    website: "https://www.moneybird.com", docs: "https://developer.moneybird.com", logo: { favicon: "https://www.moneybird.com" },
    baseUrl: "https://moneybird.com/api/v2",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "Personal API token", secret: true }],
    oauth: { scopes: ["sales_invoices", "documents", "estimates", "bank", "time_entries", "settings"],
      provider: { name: "Moneybird", key: "moneybird", redirect: "localhost",
        authorizeUrl: "https://moneybird.com/oauth/authorize", tokenUrl: "https://moneybird.com/oauth/token",
        help: "1) In Moneybird open moneybird.com/user/applications/new and register an application named “Conector” of type “Externe "
          + "applicatie”. 2) Paste the redirect URI shown below into “Callback URL”. 3) Copy the “Client ID” and the “Client Secret”." } },
    keyUrl: "https://moneybird.com/user/applications/new",
    help: "1) In Moneybird open “Instellingen” in your profile → “Ontwikkelaars” (moneybird.com/user/applications/new) and create a “persoonlijke "
      + "API-token” with the permissions you need. 2) Copy the token.",
    test: { path: "/administrations.json", message: (d) => count(d, "administration", "administrations") || "Token is valid" },
    examples: "Paths include the administration ID. Examples: GET /administrations.json, GET /{adminId}/contacts.json?query=…, "
      + "GET /{adminId}/sales_invoices.json?filter=state:open, POST /{adminId}/sales_invoices.json {…}, GET /{adminId}/documents/purchase_invoices.json.",
  },
  {
    id: "moonclerk", name: "MoonClerk", category: "finance", description: "Recurring and one-time payments: forms, customers and payments",
    website: "https://www.moonclerk.com", docs: "https://github.com/moonclerk/developer/wiki", logo: { favicon: "https://www.moonclerk.com" },
    baseUrl: "https://api.moonclerk.com", headers: { Accept: "application/vnd.moonclerk+json;version=1" },
    auth: { type: "header", name: "Authorization", prefix: "Token token=" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) In MoonClerk open “Settings” → “API Keys” and generate a key. 2) Copy it.",
    test: { path: "/forms", message: (d) => count(d?.forms, "form", "forms") || "API key is valid" },
    examples: "Examples: GET /forms, GET /customers?form_id=…&count=50, GET /customers/{id}, GET /payments?form_id=…&count=50, GET /payments/{id}.",
  },
  {
    id: "mxtechnologies", name: "MX", category: "finance", description: "Bank aggregation: users, accounts, transactions and connections",
    website: "https://www.mx.com", docs: "https://docs.mx.com/api", logo: { favicon: "https://www.mx.com" },
    baseUrl: "https://{server}", headers: { Accept: "application/vnd.mx.api.v1+json" },
    auth: { type: "basic", usernameField: "username", passwordField: "token" },
    fields: [{ id: "username", label: "Client ID" }, { id: "token", label: "API key", secret: true },
             { id: "server", label: "Environment", default: "int-api.mx.com",
               options: [["int-api.mx.com", "Development (int-api.mx.com)"], ["api.mx.com", "Production (api.mx.com)"]] }],
    help: "1) In the MX client portal (dashboard.mx.com) open “API Keys”. 2) Copy the “Client ID” and the “API Key” for the environment (the "
      + "development and production ones are different).",
    test: { path: "/users", query: { records_per_page: 1 }, message: "Credentials are valid" },
    examples: "Examples: GET /users?records_per_page=25, POST /users {\"user\": {\"id\": \"…\"}}, GET /users/{userGuid}/accounts, "
      + "GET /users/{userGuid}/transactions?from_date=…, POST /users/{userGuid}/widget_urls {\"widget_url\": {\"widget_type\": \"connect_widget\"}}.",
  },
  {
    id: "nasdaqdatalink", name: "Nasdaq Data Link", category: "finance", description: "Financial and economic data: tables and time series",
    website: "https://data.nasdaq.com", docs: "https://docs.data.nasdaq.com", logo: { favicon: "https://data.nasdaq.com" },
    baseUrl: "https://data.nasdaq.com/api/v3",
    auth: { type: "query", name: "api_key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://data.nasdaq.com/account/profile",
    help: "1) Create a free account at data.nasdaq.com. 2) Copy the API key from “Account Settings”. 3) Premium datasets need a "
      + "subscription; without one, some tables only return a sample.",
    // Tables return a sample even if the key is wrong: the test only confirms that the API responds.
    test: { path: "/datatables/ZACKS/FC.json", query: { "qopts.per_page": 1 },
              message: "Response received (Nasdaq Data Link returns a sample even if the key is not valid)" },
    examples: "Examples: GET /datatables/ZACKS/FC.json?ticker=AAPL, GET /datatables/SHARADAR/SF1.json?ticker=AAPL&dimension=MRY, "
      + "GET /datasets/{code}/data.json?start_date=…, GET /datatables/{code}/metadata.json.",
  },
  {
    id: "paystack", name: "Paystack", category: "finance", description: "Payments in Africa: transactions, customers, transfers and balance",
    website: "https://paystack.com", docs: "https://paystack.com/docs/api/", logo: { favicon: "https://paystack.com" },
    baseUrl: "https://api.paystack.co",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "Secret key (sk_…)", secret: true }],
    keyUrl: "https://dashboard.paystack.com/#/settings/developers",
    help: "1) In the Paystack dashboard open “Settings” → “API Keys & Webhooks”. 2) Copy the “Secret Key” (sk_test_ or sk_live_).",
    test: { path: "/balance", message: "Secret key is valid" },
    examples: "Examples: GET /balance, GET /transaction?perPage=20, GET /transaction/verify/{reference}, POST /transaction/initialize "
      + "{\"email\": \"…\", \"amount\": 50000}, GET /customer?perPage=20, POST /transfer {…}.",
  },
  {
    id: "plisio", name: "Plisio", category: "finance", description: "Cryptocurrency payments: invoices, balances and withdrawals",
    website: "https://plisio.net", docs: "https://plisio.net/documentation", logo: { favicon: "https://plisio.net" },
    baseUrl: "https://api.plisio.net/api/v1",
    auth: { type: "query", name: "api_key" },
    fields: [{ id: "token", label: "Secret key", secret: true }],
    keyUrl: "https://plisio.net/account/api",
    help: "1) In Plisio open “API” in your account. 2) Copy the “Secret key”.",
    test: { path: "/balances/BTC", message: "Secret key is valid" },
    examples: "Examples: GET /balances/BTC, GET /invoices/new?order_name=…&order_number=…&source_currency=EUR&source_amount=50&"
      + "currency=BTC, GET /operations?limit=20, GET /operations/{id}, GET /currencies/EUR.",
  },
  {
    id: "pocketsmith", name: "PocketSmith", category: "finance", description: "Personal finance: accounts, transactions, categories and budgets",
    website: "https://www.pocketsmith.com", docs: "https://developers.pocketsmith.com", logo: { favicon: "https://www.pocketsmith.com" },
    baseUrl: "https://api.pocketsmith.com/v2",
    auth: { type: "header", name: "X-Developer-Key" },
    fields: [{ id: "token", label: "Developer key", secret: true }],
    keyUrl: "https://my.pocketsmith.com/security/manage_keys",
    help: "1) In PocketSmith open “Account” → “Security & Integrations” → “Manage developer keys”. 2) Create a key and copy it.",
    test: { path: "/me", account: (d) => d?.email || d?.name },
    examples: "Paths include the user ID (GET /me). Examples: GET /users/{id}/accounts, GET /users/{id}/transactions?start_date=…, "
      + "GET /users/{id}/categories, GET /users/{id}/budget, PUT /transactions/{id} {\"category_id\": …}.",
  },
  {
    id: "polygon", name: "Massive (formerly Polygon.io)", category: "finance", description: "Market data: stocks, options, currencies and crypto",
    website: "https://massive.com", docs: "https://massive.com/docs", logo: { favicon: "https://massive.com" },
    // Polygon.io was renamed Massive; the keys and the old API (api.polygon.io) still work.
    baseUrl: "https://api.massive.com", allowedOrigins: ["https://api.polygon.io"],
    auth: { type: "query", name: "apiKey" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://massive.com/dashboard/keys",
    help: "1) Create an account at massive.com (formerly polygon.io; the free plan gives 5 calls per minute with data from the previous day). 2) Copy the "
      + "API key from “Keys”.",
    test: { path: "/v3/reference/tickers", query: { limit: 1 }, message: "API key is valid" },
    examples: "Examples: GET /v2/aggs/ticker/AAPL/range/1/day/2026-01-01/2026-02-01, GET /v2/aggs/ticker/AAPL/prev, "
      + "GET /v3/reference/tickers?search=tesla, GET /v3/reference/tickers/AAPL, GET /v2/aggs/ticker/X:BTCUSD/prev, GET /v1/marketstatus/now.",
  },
];
