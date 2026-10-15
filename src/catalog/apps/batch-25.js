// Batch 25 of the Composio catalog: communities and courses, and finance (stocks and crypto, payments, invoicing, spending,
// collections, donations, identity, invoice OCR and financial data).
import crypto from "node:crypto";

const count = (d, one, many) => (Array.isArray(d) ? `${d.length} ${d.length === 1 ? one : many}` : null);

// Coinbase (Advanced Trade / CDP): every request carries a 2-minute JWT signed with the API's private key, Ed25519
// (base64 secret, the default format) or ECDSA (PEM “EC PRIVATE KEY”; the panel stores it on one line and it is rebuilt here).
function coinbasePrivateKey(text) {
  const t = String(text || "").replace(/\\n/g, "\n").trim();
  const pem = /-----BEGIN ([A-Z ]+)-----\s*([\s\S]+?)\s*-----END \1-----/.exec(t);
  if (pem) {
    const body = pem[2].replace(/\s+/g, "").match(/.{1,64}/g).join("\n");
    return { alg: "ES256", privateKey: crypto.createPrivateKey(`-----BEGIN ${pem[1]}-----\n${body}\n-----END ${pem[1]}-----\n`) };
  }
  const bytes = Buffer.from(t, "base64");
  if (bytes.length !== 64 && bytes.length !== 32) throw new Error("Coinbase: the private key is neither an Ed25519 secret nor an ECDSA PEM");
  // Ed25519 PKCS#8: fixed prefix + the 32 seed bytes.
  const der = Buffer.concat([Buffer.from("302e020100300506032b657004220420", "hex"), bytes.subarray(0, 32)]);
  return { alg: "EdDSA", privateKey: crypto.createPrivateKey({ key: der, format: "der", type: "pkcs8" }) };
}

function signCoinbase({ method: httpMethod, url, headers: requestHeaders, cred }) {
  const { alg, privateKey } = coinbasePrivateKey(cred.token);
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const data = `${b64({ alg, kid: cred.username, nonce: crypto.randomBytes(16).toString("hex"), typ: "JWT" })}.`
    + b64({ sub: cred.username, iss: "cdp", nbf: now, exp: now + 120, uri: `${httpMethod.toUpperCase()} ${url.host}${url.pathname}` });
  const signature = crypto.sign(alg === "EdDSA" ? null : "sha256", Buffer.from(data), alg === "EdDSA" ? privateKey : { key: privateKey, dsaEncoding: "ieee-p1363" });
  requestHeaders.Authorization = `Bearer ${data}.${signature.toString("base64url")}`;
}

export default [
  {
    id: "mightynetworks", name: "Mighty Networks", category: "education", description: "Communities, courses and memberships: members, spaces and plans",
    website: "https://www.mightynetworks.com", docs: "https://docs.mightynetworks.com", logo: { favicon: "https://www.mightynetworks.com" },
    baseUrl: "https://api.mn.co/admin/v1/networks/{network}",
    auth: { type: "bearer" },
    fields: [{ id: "network", label: "Network ID", format: "segment", example: "12345678" },
             { id: "token", label: "API key", secret: true }],
    help: "1) In your network on Mighty Networks open “Settings” → “API” (Business plan or higher) and create a key. 2) Copy the key and the network "
      + "ID, which appears on the same page.",
    test: { path: "/members", query: { per_page: 1 }, message: "API key is valid" },
    examples: "Examples: GET /members?per_page=50, GET /members/{id}, GET /spaces, GET /plans, GET /posts?per_page=20, "
      + "POST /members/{id}/plans {\"plan_id\": …} (grants access to a plan).",
  },
  {
    id: "wanikani", name: "WaniKani", category: "education", description: "Japanese learning: progress, reviews and statistics",
    website: "https://www.wanikani.com", docs: "https://docs.api.wanikani.com", logo: { favicon: "https://www.wanikani.com" },
    baseUrl: "https://api.wanikani.com/v2", headers: { "Wanikani-Revision": "20170710" },
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "Personal API token", secret: true }],
    keyUrl: "https://www.wanikani.com/settings/personal_access_tokens",
    help: "1) In WaniKani open “Settings” → “API Tokens” and click “Generate a new token”. 2) Choose the permissions (read-only by default) and "
      + "copy it.",
    test: { path: "/user", account: (d) => d?.data?.username },
    examples: "Examples: GET /user, GET /summary (available lessons and reviews), GET /assignments?immediately_available_for_review=true, "
      + "GET /review_statistics, GET /level_progressions, GET /subjects?levels=1,2.",
  },
  {
    id: "alpaca", name: "Alpaca", category: "finance", description: "Commission-free stocks and crypto: account, orders, positions, data",
    website: "https://alpaca.markets", docs: "https://docs.alpaca.markets/reference", logo: { favicon: "https://alpaca.markets" },
    baseUrl: "https://{server}/v2", allowedOrigins: ["https://data.alpaca.markets"],
    auth: [{ type: "header", name: "APCA-API-KEY-ID", field: "username" }, { type: "header", name: "APCA-API-SECRET-KEY" }],
    fields: [{ id: "username", label: "API Key ID" }, { id: "token", label: "Secret Key", secret: true },
             { id: "server", label: "Account", default: "paper-api.alpaca.markets",
               options: [["paper-api.alpaca.markets", "Paper (simulated)"], ["api.alpaca.markets", "Real (live)"]] }],
    // One click: OAuth app on Alpaca (live account; tokens do not expire).
    oauth: { scopes: ["account:write", "trading", "data"], baseUrl: "https://api.alpaca.markets/v2",
      provider: { name: "Alpaca", key: "alpaca", redirect: "localhost",
        authorizeUrl: "https://app.alpaca.markets/oauth/authorize", tokenUrl: "https://api.alpaca.markets/oauth/token",
        help: "1) In the Alpaca dashboard open “Apps” → “OAuth Apps” and click “Create OAuth App”; name it “Conector”. 2) Under “Redirect "
          + "URIs” paste the redirect URI shown below. 3) Copy the “Client ID” and the “Client Secret”." } },
    help: "1) In the Alpaca dashboard choose the account (Paper for testing or Live) and, under “API Keys”, click “Generate New Keys”. 2) Copy the "
      + "“API Key ID” and the “Secret Key” (shown only once). 3) Choose the same account here: paper keys do not work on a live account.",
    test: { path: "/account", account: (d) => (d?.account_number ? `account ${d.account_number}` : null) },
    examples: "Examples: GET /account, GET /positions, GET /orders?status=open, POST /orders {\"symbol\": \"AAPL\", \"qty\": 1, \"side\": \"buy\", "
      + "\"type\": \"market\", \"time_in_force\": \"day\"} (trades for real on the live account), GET /assets?status=active, "
      + "GET https://data.alpaca.markets/v2/stocks/AAPL/bars?timeframe=1Day&limit=30.",
  },
  {
    id: "alphavantage", name: "Alpha Vantage", category: "finance", description: "Quotes, history, forex, crypto and technical indicators",
    website: "https://www.alphavantage.co", docs: "https://www.alphavantage.co/documentation/", logo: { favicon: "https://www.alphavantage.co" },
    baseUrl: "https://www.alphavantage.co",
    auth: { type: "query", name: "apikey" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://www.alphavantage.co/support/#api-key",
    help: "1) Request a free key at alphavantage.co/support/#api-key (25 queries per day; premium plans give more). 2) Copy it.",
    // Alpha Vantage does not reject wrong keys in every function: it warns with “Information” or “Error Message”.
    test: { path: "/query", query: { function: "GLOBAL_QUOTE", symbol: "IBM" },
              validate: (d) => { const warning = d?.["Error Message"] || d?.Information; if (warning && /apikey|api key/i.test(warning)) throw new Error(`Alpha Vantage: ${warning}`); },
              message: "Response received (Alpha Vantage does not check the key in every function)" },
    examples: "Everything goes to /query with function. Examples: GET /query?function=GLOBAL_QUOTE&symbol=MSFT, GET /query?function=TIME_SERIES_DAILY&"
      + "symbol=IBM&outputsize=compact, GET /query?function=SYMBOL_SEARCH&keywords=microsoft, GET /query?function=CURRENCY_EXCHANGE_RATE&"
      + "from_currency=EUR&to_currency=USD, GET /query?function=OVERVIEW&symbol=AAPL.",
  },
  {
    id: "altoviz", name: "Altoviz", category: "finance", description: "Invoicing: customers, quotes, invoices and products",
    website: "https://www.altoviz.com", docs: "https://developer.altoviz.com", logo: { favicon: "https://www.altoviz.com" },
    baseUrl: "https://api.altoviz.com/v1",
    auth: { type: "header", name: "X-API-KEY" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) In Altoviz open “Paramètres” (settings) → “API” and generate a key. 2) Copy it.",
    test: { path: "/Customers", query: { pageSize: 1 }, message: "API key is valid" },
    examples: "Examples: GET /Customers?pageSize=50, GET /Customers/{id}, GET /SaleInvoices?pageSize=20, GET /SaleQuotes, GET /Products, "
      + "POST /Customers {\"companyName\": \"…\", \"email\": \"…\"}.",
  },
  {
    id: "benzinga", name: "Benzinga", category: "finance", description: "Financial news, calendars and analyst ratings",
    website: "https://www.benzinga.com", docs: "https://docs.benzinga.com", logo: { favicon: "https://www.benzinga.com" },
    baseUrl: "https://api.benzinga.com/api",
    auth: { type: "query", name: "token" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) Subscribe to the Benzinga API (benzinga.com/apis) or request a trial. 2) Copy the key you are given.",
    test: { path: "/v2/news", query: { pageSize: 1 }, message: "API key is valid" },
    examples: "Examples: GET /v2/news?tickers=AAPL&pageSize=20, GET /v2.1/calendar/earnings?parameters[date_from]=…, "
      + "GET /v2.1/calendar/ratings?parameters[tickers]=…, GET /v2.1/calendar/dividends, GET /v2/news-removed.",
  },
  {
    id: "billsby", name: "Billsby", category: "finance", description: "Subscriptions: customers, plans, invoices and recurring payments",
    website: "https://www.billsby.com", docs: "https://support.billsby.com/reference", logo: { favicon: "https://www.billsby.com" },
    baseUrl: "https://public.billsby.com/api/v1/rest/core/{company}",
    auth: { type: "header", name: "ApiKey" },
    fields: [{ id: "company", label: "Your company's domain on Billsby", format: "subdomain",
               help: "The part before .billsby.com (e.g. “example” if you sign in at example.billsby.com)." },
             { id: "token", label: "API key", secret: true }],
    help: "1) In Billsby open “Settings” → “Configuration” → “Brand settings”/“API keys” and copy the API key. 2) Enter your company's domain "
      + "on Billsby here.",
    test: { path: "/customers", query: { pageSize: 1 }, message: "API key is valid" },
    examples: "Examples: GET /customers?pageSize=50, GET /customers/{customerId}, GET /customers/{customerId}/subscriptions, GET /products, "
      + "GET /invoices?page=1, GET /plans/{productId}.",
  },
  {
    id: "brex", name: "Brex", category: "finance", description: "Corporate cards and spend: transactions, cards and users",
    website: "https://www.brex.com", docs: "https://developer.brex.com", logo: { favicon: "https://www.brex.com" },
    baseUrl: "https://platform.brexapis.com",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API token", secret: true }],
    keyUrl: "https://dashboard.brex.com/settings/developer",
    help: "1) As a Brex administrator open “Settings” → “Developer” and click “Create Token”. 2) Choose the permissions (e.g. read access to "
      + "transactions and cards) and copy the token: it is shown only once. 3) Tokens that are not used for 30 days expire.",
    test: { path: "/v2/users/me", account: (d) => d?.email },
    examples: "Examples: GET /v2/transactions/card/primary?limit=50, GET /v2/accounts/cash, GET /v2/cards, GET /v2/users, "
      + "GET /v1/expenses/card?limit=50, POST /v2/cards {…}.",
  },
  {
    id: "chaser", name: "Chaser", category: "finance", description: "Collections: customers, unpaid invoices and automatic reminders",
    website: "https://www.chaserhq.com", docs: "https://openapi.chaserhq.com/docs", logo: { favicon: "https://www.chaserhq.com" },
    baseUrl: "https://openapi.chaserhq.com/v1",
    auth: { type: "basic", usernameField: "username", passwordField: "token" },
    fields: [{ id: "username", label: "API key" }, { id: "token", label: "API secret", secret: true }],
    help: "1) In Chaser open “Settings” → “Integrations” → “Chaser API” and create credentials. 2) Copy the “API key” and the “API secret”.",
    test: { path: "/customers", query: { limit: 1 }, message: "Credentials are valid" },
    examples: "Examples: GET /customers?limit=50, GET /customers/{id}, POST /customers {…}, GET /invoices?status=AUTHORISED, POST /invoices {…}, "
      + "GET /credit_notes, GET /payments.",
  },
  {
    id: "coinbase", name: "Coinbase", category: "finance", description: "Crypto: accounts, orders, products and prices (Advanced Trade)",
    website: "https://www.coinbase.com", docs: "https://docs.cdp.coinbase.com/coinbase-app/advanced-trade-apis/rest-api", logo: { favicon: "https://www.coinbase.com" },
    baseUrl: "https://api.coinbase.com",
    auth: { type: "signature", sign: signCoinbase },
    fields: [{ id: "username", label: "Key name (organizations/…/apiKeys/…)" },
             { id: "token", label: "Private key (Ed25519 secret or ECDSA PEM)", secret: true,
               example: "t7WK1frJ+K56Rkpdru7m1yhxe9hhEAcdOURZpnjvO7nTnDNFVPQJ/j/Dt6MWXrajRFgtAKcQ8g0RpWL7pB6fgw==" }],
    keyUrl: "https://portal.cdp.coinbase.com/projects/api-keys",
    help: "1) In the Coinbase developer portal (portal.cdp.coinbase.com) open “API Keys” → “Create API key”. 2) Choose the "
      + "permissions (View to read; Trade to trade) and download the key. 3) Copy its name (“organizations/…/apiKeys/…” or the id) and "
      + "the private key here. Conector signs each request with it.",
    test: { path: "/api/v3/brokerage/accounts", query: { limit: 1 }, message: "API key is valid" },
    examples: "Examples: GET /api/v3/brokerage/accounts?limit=50, GET /api/v3/brokerage/products/BTC-EUR, GET /api/v3/brokerage/best_bid_ask?"
      + "product_ids=BTC-EUR, GET /api/v3/brokerage/orders/historical/batch?limit=20, POST /api/v3/brokerage/orders {…} (trades for real), "
      + "GET /api/v3/brokerage/portfolios.",
  },
  {
    id: "coinranking", name: "Coinranking", category: "finance", description: "Crypto market: coins, prices, history and exchanges",
    website: "https://coinranking.com", docs: "https://developers.coinranking.com/api/documentation", logo: { favicon: "https://coinranking.com" },
    baseUrl: "https://api.coinranking.com/v2",
    auth: { type: "header", name: "x-access-token" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://account.coinranking.com/dashboard/api",
    help: "1) Create an account at coinranking.com and open “API” in your dashboard. 2) Copy the key (there is a free plan with a monthly limit).",
    test: { path: "/stats", message: "API key is valid" },
    examples: "Examples: GET /coins?limit=20&referenceCurrencyUuid=5k-_VTxqtCEI (in euros), GET /coin/{uuid}, GET /coin/{uuid}/history?"
      + "timePeriod=30d, GET /search-suggestions?query=…, GET /stats.",
  },
  {
    id: "currencybeacon", name: "CurrencyBeacon", category: "finance", description: "Real-time and historical exchange rates (formerly CurrencyScoop)",
    website: "https://currencybeacon.com", docs: "https://currencybeacon.com/api-documentation", logo: { favicon: "https://currencybeacon.com" },
    baseUrl: "https://api.currencybeacon.com/v1",
    auth: { type: "query", name: "api_key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) Create an account at currencybeacon.com (CurrencyScoop was renamed; old keys still work). 2) Copy the API key "
      + "from your dashboard (there is a free plan).",
    test: { path: "/latest", query: { base: "EUR", symbols: "USD" }, message: "API key is valid" },
    examples: "Examples: GET /latest?base=EUR&symbols=USD,GBP, GET /historical?base=EUR&date=2026-01-15, GET /timeseries?base=EUR&"
      + "start_date=…&end_date=…&symbols=USD, GET /convert?from=EUR&to=USD&amount=100, GET /currencies.",
  },
  {
    id: "daffy", name: "Daffy", category: "finance", description: "Donations: charitable fund, organizations and contributions",
    website: "https://www.daffy.org", docs: "https://docs.daffy.org", logo: { favicon: "https://www.daffy.org" },
    baseUrl: "https://public.daffy.org/v1",
    auth: { type: "header", name: "X-Api-Key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) In Daffy open “Settings” → “Developer” and generate an API key. 2) Copy it.",
    test: { path: "/users/me", account: (d) => d?.name || d?.slug },
    examples: "Examples: GET /users/me, GET /users/me/balance, GET /users/me/donations, GET /non_profits/search?query=…, "
      + "POST /users/me/donations {\"ein\": \"…\", \"amount\": 25}.",
  },
  {
    id: "didit", name: "Didit", category: "security", description: "Identity verification (KYC): sessions, documents and biometrics",
    website: "https://didit.me", docs: "https://docs.didit.me", logo: { favicon: "https://didit.me" },
    baseUrl: "https://verification.didit.me/v2",
    auth: { type: "header", name: "x-api-key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://business.didit.me",
    help: "1) In the Didit Business dashboard open your application → “API & Webhooks”. 2) Copy the API key.",
    test: { path: "/session/", message: "API key is valid" },
    examples: "Examples: POST /session/ {\"workflow_id\": \"…\", \"vendor_data\": \"customer-123\", \"callback\": \"https://…\"} (verification "
      + "link), GET /session/{sessionId}/decision/, PATCH /session/{sessionId}/update-status/ {\"new_status\": \"Approved\"}.",
  },
  {
    id: "donately", name: "Donately", category: "finance", description: "Fundraising: campaigns, donations and donors",
    website: "https://www.donately.com", docs: "https://docs.donately.com", logo: { favicon: "https://www.donately.com" },
    baseUrl: "https://api.donately.com/v2",
    auth: { type: "basic", usernameField: "token", fixedPassword: "" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) In Donately open “Settings” → “API” and copy your user's API key. 2) Conector sends it as the Basic auth username with an "
      + "empty password, as Donately specifies.",
    test: { path: "/accounts", message: "API key is valid" },
    examples: "Examples: GET /accounts, GET /donations?account_id=…&limit=50, GET /people?account_id=…, GET /campaigns?account_id=…, "
      + "GET /subscriptions?account_id=….",
  },
  {
    id: "eagledoc", name: "Eagle Doc", category: "finance", description: "AI OCR for invoices and receipts: structured data instantly",
    website: "https://eagle-doc.com", docs: "https://eagle-doc.com/api-documentation", logo: { favicon: "https://eagle-doc.com" },
    baseUrl: "https://de.eagle-doc.com/api",
    auth: { type: "header", name: "api-key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) Create an account at eagle-doc.com and open “API Keys” in your dashboard. 2) Copy the key. 3) Each processed document uses one of your "
      + "plan's documents; the connection test does not process anything.",
    // Without a file, a valid key returns 400 without processing or using up any documents.
    test: { method: "POST", path: "/invoice/v1/processing", acceptStatus: [400], message: "API key is valid" },
    examples: "Examples: POST /invoice/v1/processing (multipart with file: invoice as PDF or image), POST /receipt/v3/processing (receipts), "
      + "POST /invoice/v1/processing?privacy=true (does not store the document).",
  },
  {
    id: "elorus", name: "Elorus", category: "finance", description: "Invoicing and time tracking: contacts, invoices, expenses, projects",
    website: "https://www.elorus.com", docs: "https://developer.elorus.com", logo: { favicon: "https://www.elorus.com" },
    baseUrl: "https://api.elorus.com/v1.1",
    auth: { type: "header", name: "Authorization", prefix: "Token " },
    headers: (c) => ({ "X-Elorus-Organization": c.organization }),
    fields: [{ id: "token", label: "API key", secret: true },
             { id: "organization", label: "Organization ID", format: "segment", example: "1234567890123456789" }],
    help: "1) In Elorus open your profile → “User profile” → “API key” and copy it. 2) The organization ID appears under “Settings” → "
      + "“Organization” (or in the API URL of your profile).",
    test: { path: "/contacts/", query: { page_size: 1 }, message: "API key is valid" },
    examples: "Examples: GET /contacts/?search=…, GET /invoices/?status=issued&page_size=20, GET /invoices/{id}/, POST /invoices/ {…}, "
      + "GET /expenses/, GET /projects/, GET /timeentries/.",
  },
  {
    id: "eodhd", name: "EODHD", category: "finance", description: "Financial data: historical, real-time, fundamentals and news",
    website: "https://eodhd.com", docs: "https://eodhd.com/financial-apis/", logo: { favicon: "https://eodhd.com" },
    baseUrl: "https://eodhd.com/api", query: { fmt: "json" },
    auth: { type: "query", name: "api_token" },
    fields: [{ id: "token", label: "API token", secret: true }],
    keyUrl: "https://eodhd.com/cp/settings",
    help: "1) Create an account at eodhd.com (the free plan gives 20 queries per day). 2) In “Settings” in the dashboard copy the “API token”.",
    test: { path: "/user", account: (d) => d?.email || d?.name },
    examples: "Examples: GET /eod/MSFT.US?from=2026-01-01&period=d, GET /real-time/TSLA.US, GET /fundamentals/AAPL.US, "
      + "GET /news?s=AAPL.US&limit=10, GET /exchange-symbol-list/US, GET /search/apple.",
  },
  {
    id: "fidel", name: "Fidel API", category: "finance", description: "Payment card linking: programs, cards and transactions",
    website: "https://fidelapi.com", docs: "https://reference.fidel.uk", logo: { favicon: "https://fidelapi.com" },
    baseUrl: "https://api.fidel.uk/v1",
    auth: { type: "header", name: "fidel-key" },
    fields: [{ id: "token", label: "Secret key (sk_test_… or sk_live_…)", secret: true }],
    keyUrl: "https://dashboard.fidel.uk/account/plan",
    help: "1) In the Fidel API dashboard open “Account” → “Plan & API keys”. 2) Copy the secret key of the environment (test or live).",
    test: { path: "/programs", message: (d) => count(d?.items, "program", "programs") || "Secret key is valid" },
    examples: "Examples: GET /programs, GET /programs/{programId}/cards, GET /programs/{programId}/transactions?limit=20, GET /brands, "
      + "GET /programs/{programId}/locations, POST /programs/{programId}/cards {…}.",
  },
  {
    id: "finage", name: "Finage", category: "finance", description: "Real-time and historical stock, forex and crypto quotes",
    website: "https://finage.co.uk", docs: "https://finage.co.uk/docs/api", logo: { favicon: "https://finage.co.uk" },
    baseUrl: "https://api.finage.co.uk",
    auth: { type: "query", name: "apikey" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) Create an account at finage.co.uk and open your dashboard. 2) Copy the API key (the free plan has a small call limit).",
    test: { path: "/last/stock/AAPL", message: "API key is valid" },
    examples: "Examples: GET /last/stock/AAPL, GET /agg/stock/AAPL/1/day/2026-01-01/2026-02-01, GET /last/forex/EURUSD, "
      + "GET /last/crypto/BTCUSD, GET /news/market/AAPL.",
  },
  {
    id: "financialdatasets", name: "Financial Datasets", category: "finance", description: "Fundamentals, financial statements, prices and news",
    website: "https://www.financialdatasets.ai", docs: "https://docs.financialdatasets.ai", logo: { favicon: "https://www.financialdatasets.ai" },
    baseUrl: "https://api.financialdatasets.ai",
    auth: { type: "header", name: "X-API-KEY" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) Create an account at financialdatasets.ai and open “API Keys”. 2) Create a key and copy it (queries are billed according to the plan).",
    test: { path: "/company/facts", query: { ticker: "AAPL" }, message: "API key is valid" },
    examples: "Examples: GET /company/facts?ticker=AAPL, GET /financials/income-statements?ticker=AAPL&period=annual&limit=4, "
      + "GET /prices?ticker=AAPL&interval=day&interval_multiplier=1&start_date=…&end_date=…, GET /news?ticker=AAPL, GET /insider-trades?ticker=AAPL.",
  },
];
