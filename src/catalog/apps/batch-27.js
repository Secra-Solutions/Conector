// Batch 27 of the catalog, from the Composio catalog: finance (aggregation, payments, subscriptions, SEC filings, accounting, shared
// expenses, taxes and market data) and AI (models, images, Anthropic administration, benchmarks, meetings and ML).

const count = (d, one, many) => (Array.isArray(d) ? `${d.length} ${d.length === 1 ? one : many}` : null);

export default [
  {
    id: "quiltt", name: "Quiltt", category: "finance", description: "Financial aggregation: profiles, accounts, transactions and balances",
    website: "https://www.quiltt.io", docs: "https://www.quiltt.dev", logo: { favicon: "https://www.quiltt.io" },
    baseUrl: "https://api.quiltt.io/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API secret key", secret: true }],
    keyUrl: "https://dashboard.quiltt.io",
    help: "1) In the Quiltt dashboard, open your environment → “API Keys”. 2) Copy the secret key (not the widget's public one).",
    test: { path: "/profiles", message: "Secret key is valid" },
    examples: "Examples: GET /profiles, POST /profiles {\"email\": \"…\"}, GET /profiles/{id}, POST /users/sessions {\"userId\": \"…\"} "
      + "(session token for the widget). Account and transaction data is queried through GraphQL at https://api.quiltt.io/v1/graphql.",
  },
  {
    id: "razorpay", name: "Razorpay", category: "finance", description: "Payments in India: payments, orders, refunds and subscriptions",
    website: "https://razorpay.com", docs: "https://razorpay.com/docs/api/", logo: { favicon: "https://razorpay.com" },
    baseUrl: "https://api.razorpay.com/v1",
    auth: { type: "basic", usernameField: "username", passwordField: "token" },
    fields: [{ id: "username", label: "Key ID (rzp_…)" }, { id: "token", label: "Key Secret", secret: true }],
    keyUrl: "https://dashboard.razorpay.com/app/website-app-settings/api-keys",
    help: "1) In the Razorpay dashboard, open “Account & Settings” → “API Keys”. 2) Generate the keys (test or live mode) and copy the “Key ID” and the "
      + "“Key Secret” (it is shown only once).",
    test: { path: "/payments", query: { count: 1 }, message: "Keys are valid" },
    examples: "Examples: GET /payments?count=20, GET /payments/{id}, POST /orders {\"amount\": 50000, \"currency\": \"INR\", \"receipt\": \"…\"}, "
      + "POST /payments/{id}/refund, GET /settlements, GET /subscriptions.",
  },
  {
    id: "recurly", name: "Recurly", category: "finance", description: "Subscriptions: accounts, plans, invoices and transactions",
    website: "https://recurly.com", docs: "https://recurly.com/developers/api/v2021-02-25/", logo: { favicon: "https://recurly.com" },
    baseUrl: "https://{server}", headers: { Accept: "application/vnd.recurly.v2021-02-25" },
    auth: { type: "basic", usernameField: "token", fixedPassword: "" },
    fields: [{ id: "token", label: "Private API key", secret: true },
             { id: "server", label: "Region", default: "v3.recurly.com",
               options: [["v3.recurly.com", "US"], ["v3.eu.recurly.com", "European Union"]] }],
    help: "1) In Recurly, open “Integrations” → “API Credentials”. 2) Copy the private API key (or create a new one with read-only "
      + "permissions). 3) Choose the region of your site here.",
    test: { path: "/sites", message: (d) => count(d?.data, "site", "sites") || "Private key is valid" },
    examples: "Examples: GET /sites, GET /accounts?limit=20, GET /accounts/code-{code}, GET /subscriptions?state=active, GET /invoices?limit=20, "
      + "GET /plans, POST /accounts {\"code\": \"…\", \"email\": \"…\"}.",
  },
  {
    id: "secedgar", name: "SEC EDGAR", category: "finance", description: "Filings and XBRL data of US listed companies (public)",
    website: "https://www.sec.gov/edgar", docs: "https://www.sec.gov/search-filings/edgar-application-programming-interfaces", logo: { favicon: "https://www.sec.gov" },
    baseUrl: "https://data.sec.gov", allowedOrigins: ["https://efts.sec.gov", "https://www.sec.gov"],
    auth: { type: "none" },
    // The SEC requires a User-Agent with a name and a contact email; otherwise it responds 403.
    headers: (c) => ({ "User-Agent": `Conector ${c.contact}` }),
    fields: [{ id: "contact", label: "Contact email for the SEC", example: "you@example.com",
               help: "The SEC asks to identify who makes the requests; it is not used for anything else." }],
    help: "1) It is a free, public API: it needs no key. 2) The SEC requires identifying yourself with a contact email on every request "
      + "(maximum 10 requests per second): enter it here and click “Connect”.",
    test: { path: "/submissions/CIK0000320193.json", message: (d) => (d?.name ? `Public API available (tested with ${d.name})` : "Public API available") },
    examples: "Examples: GET /submissions/CIK0000320193.json (10-digit CIK), GET /api/xbrl/companyfacts/CIK0000320193.json, "
      + "GET /api/xbrl/companyconcept/CIK0000320193/us-gaap/Revenues.json, GET /api/xbrl/frames/us-gaap/Revenues/USD/CY2025.json, "
      + "GET https://efts.sec.gov/LATEST/search-index?q=…&forms=10-K (full-text search).",
  },
  {
    id: "sevdesk", name: "sevDesk", category: "finance", description: "German accounting: contacts, invoices, vouchers and bank",
    website: "https://sevdesk.de", docs: "https://api.sevdesk.de", logo: { favicon: "https://sevdesk.de" },
    baseUrl: "https://my.sevdesk.de/api/v1",
    auth: { type: "header", name: "Authorization" },
    fields: [{ id: "token", label: "API token", secret: true }],
    keyUrl: "https://my.sevdesk.de/admin/userManagement",
    help: "1) In sevDesk, open “Einstellungen” → “Benutzer” (my.sevdesk.de/admin/userManagement) and open your user. 2) Copy the “API-Token” "
      + "shown on the user's page. 3) It has the permissions of that user.",
    test: { path: "/Contact", query: { limit: 1 }, message: "API token is valid" },
    examples: "Examples: GET /Contact?depth=1&limit=50, GET /Invoice?status=200&limit=20 (open ones), GET /Invoice/{id}/getPdf, "
      + "GET /Voucher?limit=20, POST /Invoice/Factory/saveInvoice {…}, GET /CheckAccount, GET /CheckAccountTransaction?limit=20.",
  },
  {
    id: "splitwise", name: "Splitwise", category: "finance", description: "Shared expenses: groups, friends, expenses and balances",
    website: "https://www.splitwise.com", docs: "https://dev.splitwise.com", logo: { favicon: "https://www.splitwise.com" },
    baseUrl: "https://secure.splitwise.com/api/v3.0",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    oauth: { scopes: [], provider: { name: "Splitwise", key: "splitwise", redirect: "localhost",
      authorizeUrl: "https://secure.splitwise.com/oauth/authorize", tokenUrl: "https://secure.splitwise.com/oauth/token",
      help: "1) At secure.splitwise.com/apps, click “Register your application” and name it “Conector” (website https://www.example.com). "
        + "2) In “Callback URL”, paste the redirect URI shown below and save. 3) Copy the “Consumer Key” (client ID) and the “Consumer "
        + "Secret”." } },
    keyUrl: "https://secure.splitwise.com/apps",
    help: "1) At secure.splitwise.com/apps, register an application (a name and a website are enough). 2) On its page, click “Generate API key” and "
      + "copy the key: it gives access to your own account.",
    test: { path: "/get_current_user", account: (d) => d?.user?.email },
    examples: "Examples: GET /get_current_user, GET /get_groups, GET /get_friends, GET /get_expenses?limit=20&group_id=…, "
      + "POST /create_expense {\"cost\": \"25.00\", \"description\": \"…\", \"group_id\": …, \"split_equally\": true}, GET /get_notifications.",
  },
  {
    id: "taxjar", name: "TaxJar", category: "finance", description: "US sales tax: rates, calculation and filings",
    website: "https://www.taxjar.com", docs: "https://developers.taxjar.com/api/reference/", logo: { favicon: "https://www.taxjar.com" },
    baseUrl: "https://{server}/v2",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API token", secret: true },
             { id: "server", label: "Environment", default: "api.taxjar.com",
               options: [["api.taxjar.com", "Production"], ["api.sandbox.taxjar.com", "Sandbox (testing)"]] }],
    keyUrl: "https://app.taxjar.com/account#api-access",
    help: "1) In TaxJar, open “Account” → “TaxJar API”. 2) Click “Generate API Token” (the sandbox one is separate) and copy it.",
    test: { path: "/categories", message: "API token is valid" },
    examples: "Examples: GET /rates/{zip_code}?country=US, POST /taxes {\"from_country\": \"US\", \"from_zip\": \"…\", \"to_country\": \"US\", "
      + "\"to_zip\": \"…\", \"amount\": 100, \"shipping\": 10}, GET /transactions/orders?from_transaction_date=…, POST /validation {…}, GET /nexus/regions.",
  },
  {
    id: "twelvedata", name: "Twelve Data", category: "finance", description: "Market data: quotes, time series, fundamentals and indicators",
    website: "https://twelvedata.com", docs: "https://twelvedata.com/docs", logo: { favicon: "https://twelvedata.com" },
    baseUrl: "https://api.twelvedata.com",
    auth: { type: "query", name: "apikey" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://twelvedata.com/account/api-keys",
    help: "1) Create an account at twelvedata.com (the free plan gives 800 requests per day). 2) Under “API Keys”, copy the key.",
    test: { path: "/api_usage", message: (d) => (d?.plan_limit ? `${d.current_usage ?? 0} of ${d.plan_limit} requests used this minute` : "API key is valid") },
    examples: "Examples: GET /quote?symbol=AAPL, GET /time_series?symbol=EUR/USD&interval=1day&outputsize=30, GET /price?symbol=BTC/USD, "
      + "GET /symbol_search?symbol=apple, GET /rsi?symbol=AAPL&interval=1day, GET /api_usage.",
  },
  {
    id: "aimlapi", name: "AI/ML API", category: "ai", description: "300+ AI models through an OpenAI-compatible API",
    website: "https://aimlapi.com", docs: "https://docs.aimlapi.com", logo: { favicon: "https://aimlapi.com" },
    baseUrl: "https://api.aimlapi.com/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://aimlapi.com/app/keys",
    help: "1) Create an account at aimlapi.com and open “Key Management”. 2) Create a key and copy it. 3) Each request to a model uses "
      + "credits; the connection test only checks the balance.",
    test: { path: "/billing/balance", message: "API key is valid" },
    examples: "OpenAI-compatible. Examples: POST /chat/completions {\"model\": \"gpt-4o\", \"messages\": [{\"role\": \"user\", \"content\": "
      + "\"…\"}]}, POST /images/generations {\"model\": \"flux/schnell\", \"prompt\": \"…\"}, GET /models, GET /billing/balance.",
  },
  {
    id: "allimages", name: "All-Images.ai", category: "ai", description: "AI image generation and stock image library",
    website: "https://all-images.ai", docs: "https://all-images.ai/es/api-docs", logo: { favicon: "https://all-images.ai", initials: true },
    baseUrl: "https://api.all-images.ai/v1",
    auth: { type: "header", name: "api-key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) In All-Images.ai, open your account → “API” and create a key. 2) Copy it. 3) Each generation uses credits.",
    test: { path: "/image-generations", message: "API key is valid" },
    examples: "Examples: POST /image-generations {\"prompt\": \"…\", \"mode\": \"simple\"}, GET /image-generations/{id}, GET /image-generations, "
      + "POST /search {\"query\": \"…\"} (stock image library).",
  },
  {
    id: "anthropicadmin", name: "Anthropic (administration)", category: "ai", description: "Organization administration: members, keys and usage",
    website: "https://www.anthropic.com", docs: "https://docs.anthropic.com/en/api/administration-api", logo: { favicon: "https://www.anthropic.com" },
    baseUrl: "https://api.anthropic.com/v1", headers: { "anthropic-version": "2023-06-01" },
    auth: { type: "header", name: "x-api-key" },
    fields: [{ id: "token", label: "Admin key (sk-ant-admin…)", secret: true }],
    keyUrl: "https://console.anthropic.com/settings/admin-keys",
    help: "1) As an organization administrator in the Anthropic console, open “Settings” → “Admin keys”. 2) Create an admin key "
      + "(it starts with sk-ant-admin) and copy it. It cannot be used to call the models: use the “Anthropic” connector for that.",
    test: { path: "/organizations/users", query: { limit: 1 }, message: "Admin key is valid" },
    examples: "Examples: GET /organizations/users?limit=20, GET /organizations/invites, POST /organizations/invites {\"email\": \"…\", \"role\": "
      + "\"user\"}, GET /organizations/workspaces, GET /organizations/api_keys?status=active, "
      + "GET /organizations/usage_report/messages?starting_at=…&bucket_width=1d, GET /organizations/cost_report?starting_at=….",
  },
  {
    id: "apiframe", name: "Apiframe", category: "ai", description: "AI images and videos (Midjourney, Flux, Ideogram…) via API",
    website: "https://apiframe.ai", docs: "https://docs.apiframe.ai", logo: { favicon: "https://apiframe.ai" },
    baseUrl: "https://api.apiframe.pro",
    auth: { type: "header", name: "Authorization" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) In the Apiframe dashboard, open “API Keys” and copy the key. 2) Each generation uses credits; the connection test does not.",
    test: { path: "/account", message: (d) => (d?.credits != null ? `${d.credits} credits` : "API key is valid") },
    examples: "Examples: POST /imagine {\"prompt\": \"…\", \"aspect_ratio\": \"16:9\"}, POST /fetch {\"task_id\": \"…\"} (status and result), "
      + "POST /upscale-1x {\"parent_task_id\": \"…\", \"index\": \"1\"}, POST /flux-imagine {…}, GET /account.",
  },
  {
    id: "artificialanalysis", name: "Artificial Analysis", category: "ai", description: "Independent AI model benchmarks: quality, price, speed",
    website: "https://artificialanalysis.ai", docs: "https://artificialanalysis.ai/documentation", logo: { favicon: "https://artificialanalysis.ai" },
    baseUrl: "https://artificialanalysis.ai/api/v2",
    auth: { type: "header", name: "x-api-key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://artificialanalysis.ai/insights",
    help: "1) Create an account at artificialanalysis.ai and open “Insights” → “API”. 2) Generate a key and copy it (the free API allows "
      + "about 1,000 requests per day).",
    test: { path: "/data/llms/models", message: (d) => count(d?.data, "model", "models") || "API key is valid" },
    examples: "Examples: GET /data/llms/models (quality indexes, price per million tokens, tokens per second), "
      + "GET /data/media/text-to-image, GET /data/media/text-to-speech, GET /data/media/text-to-video.",
  },
  {
    id: "avoma", name: "Avoma", category: "communication", description: "Meeting assistant: recordings, transcripts and notes",
    website: "https://www.avoma.com", docs: "https://dev694.avoma.com", logo: { favicon: "https://www.avoma.com" },
    baseUrl: "https://api.avoma.com/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) In Avoma, open “Settings” → “Integrations” → “API” (Business plan or higher) and generate a key. 2) Copy it.",
    // Without dates, a valid key may respond 400 (from_date and to_date are required).
    test: { path: "/meetings/", query: { page_size: 1 }, acceptStatus: [400], message: "API key is valid" },
    examples: "Examples: GET /meetings/?from_date=2026-10-01T00:00:00Z&to_date=2026-10-15T00:00:00Z&page_size=20, GET /meetings/{uuid}/, "
      + "GET /transcriptions/?meeting_uuid=…, GET /notes/?meeting_uuid=…, GET /users/.",
  },
  {
    id: "bigml", name: "BigML", category: "ai", description: "Machine learning: sources, datasets, models and predictions",
    website: "https://bigml.com", docs: "https://bigml.com/api", logo: { favicon: "https://bigml.com" },
    baseUrl: "https://bigml.io/andromeda",
    auth: [{ type: "query", name: "username", field: "username" }, { type: "query", name: "api_key" }],
    fields: [{ id: "username", label: "BigML username" }, { id: "token", label: "API key", secret: true }],
    keyUrl: "https://bigml.com/account/apikey",
    help: "1) In BigML, open your account → “API Key”. 2) Copy your username and the API key.",
    test: { path: "/source", query: { limit: 1 }, message: "Credentials are valid" },
    examples: "Examples: GET /source?limit=20, POST /source {\"remote\": \"https://…/data.csv\"}, POST /dataset {\"source\": \"source/…\"}, "
      + "POST /model {\"dataset\": \"dataset/…\"}, POST /prediction {\"model\": \"model/…\", \"input_data\": {…}}, GET /model/{id}.",
  },
];
