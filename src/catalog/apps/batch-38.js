// Batch 38 of the catalog, from the Composio catalog: entertainment and events, video, transcripts, addresses, document extraction,
// CMS, personal productivity, PDF, bookings, no-code databases, web archive, transport and travel.

const count = (d, one, many) => (Array.isArray(d) ? `${d.length} ${d.length === 1 ? one : many}` : null);

export default [
  {
    id: "rawg", name: "RAWG", category: "media", description: "Video game database: games, platforms and genres",
    website: "https://rawg.io", docs: "https://api.rawg.io/docs/", logo: { favicon: "https://rawg.io" },
    baseUrl: "https://api.rawg.io/api",
    auth: { type: "query", name: "key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://rawg.io/apidocs",
    help: "1) Go to rawg.io/apidocs with your RAWG account and click “Get API Key”. 2) Copy the key (free for non-commercial use "
      + "with attribution).",
    test: { path: "/genres", query: { page_size: 1 }, message: "API key is valid" },
    examples: "Examples: GET /games?search=…&page_size=20, GET /games?dates=2026-01-01,2026-12-31&ordering=-rating, GET /games/{id}, "
      + "GET /games/{id}/screenshots, GET /platforms, GET /genres, GET /developers?page_size=20.",
  },
  {
    id: "seatgeek", name: "SeatGeek", category: "media", description: "Live events: concerts, sports, performers and venues",
    website: "https://seatgeek.com", docs: "https://platform.seatgeek.com", logo: { simpleIcons: "seatgeek" },
    baseUrl: "https://api.seatgeek.com/2",
    auth: [{ type: "query", name: "client_id", field: "client" }, { type: "query", name: "client_secret" }],
    fields: [{ id: "client", label: "Client ID", secret: true },
             { id: "token", label: "Client Secret (optional)", secret: true, optional: true }],
    keyUrl: "https://seatgeek.com/account/develop",
    help: "1) In SeatGeek, open “Account” → “Developer” (seatgeek.com/account/develop) and create an application. 2) Copy the “Client ID” "
      + "and, if you have one, the “Client Secret”.",
    test: { path: "/events", query: { per_page: 1 }, message: "Credentials are valid" },
    examples: "Examples: GET /events?q=…&venue.city=London&per_page=20, GET /events/{id}, GET /performers?q=…, GET /venues?city=…, "
      + "GET /taxonomies, GET /recommendations?performers.id=…&postal_code=….",
  },
  {
    id: "shotstack", name: "Shotstack", category: "media", description: "Video editing via API: renders, templates and assets",
    website: "https://shotstack.io", docs: "https://shotstack.io/docs/api/", logo: { favicon: "https://shotstack.io" },
    baseUrl: "https://api.shotstack.io",
    auth: { type: "header", name: "x-api-key" },
    fields: [{ id: "token", label: "API key", secret: true },
             { id: "environment", label: "Key environment", default: "v1",
               options: [["v1", "Production"], ["stage", "Sandbox (watermarked, free)"]] }],
    help: "1) In the Shotstack dashboard, open “API Keys”. 2) Copy the production key or the sandbox one and choose its environment here: each "
      + "one only works in its own. Production renders use credits.",
    test: { path: "/edit/{environment}/templates", message: "API key is valid" },
    examples: "The environment goes in the path (v1 or stage). Examples: POST /edit/v1/render {\"timeline\": {\"tracks\": [{\"clips\": [{\"asset\": "
      + "{\"type\": \"video\", \"src\": \"https://…\"}, \"start\": 0, \"length\": 5}]}]}, \"output\": {\"format\": \"mp4\", \"resolution\": "
      + "\"hd\"}}, GET /edit/v1/render/{id}, GET /edit/v1/templates, POST /edit/v1/templates/render {\"id\": \"…\", \"merge\": [{…}]}, "
      + "GET /serve/v1/assets/{id}, POST /ingest/v1/sources {\"url\": \"https://…\"}.",
  },
  {
    id: "ticketmaster", name: "Ticketmaster", category: "media", description: "Ticketmaster events, artists and venues (Discovery API)",
    website: "https://www.ticketmaster.com", docs: "https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/",
    logo: { simpleIcons: "ticketmaster" },
    baseUrl: "https://app.ticketmaster.com/discovery/v2",
    auth: { type: "query", name: "apikey" },
    fields: [{ id: "token", label: "Consumer Key", secret: true }],
    keyUrl: "https://developer-acct.ticketmaster.com/user/login",
    help: "1) Sign up at developer.ticketmaster.com and open “My Apps”. 2) Copy the “Consumer Key” of your application (by default, 5,000 "
      + "calls per day).",
    test: { path: "/classifications.json", query: { size: 1 }, message: "Key is valid" },
    examples: "Examples: GET /events.json?keyword=…&countryCode=ES&size=20&sort=date,asc, GET /events/{id}.json, "
      + "GET /attractions.json?keyword=…, GET /venues.json?keyword=…&countryCode=ES, GET /suggest.json?keyword=…, GET /classifications.json.",
  },
  {
    id: "videodb", name: "VideoDB", category: "ai", description: "AI video database: upload, indexing and search",
    website: "https://videodb.io", docs: "https://docs.videodb.io", logo: { favicon: "https://videodb.io" },
    baseUrl: "https://api.videodb.io",
    auth: { type: "header", name: "x-access-token" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://console.videodb.io",
    help: "1) Go to console.videodb.io and copy your API key. 2) Paste it here. Indexing and search use credits.",
    test: { path: "/collection", message: "API key is valid" },
    examples: "Examples: GET /collection, GET /collection/{collectionId}, POST /collection/{collectionId}/upload {\"url\": \"https://…\"}, "
      + "GET /video/{videoId}, POST /video/{videoId}/index {\"index_type\": \"spoken_word\"}, POST /video/{videoId}/search {\"query\": "
      + "\"…\"}, GET /video/{videoId}/transcription.",
  },
  {
    id: "pica", name: "One (formerly Pica)", category: "automation", description: "Integrations for AI agents: connections and actions",
    website: "https://withone.ai", docs: "https://withone.ai/llms.txt", logo: { favicon: "https://withone.ai" },
    baseUrl: "https://api.withone.ai/v1",
    auth: { type: "header", name: "x-one-secret" },
    fields: [{ id: "token", label: "Secret key", secret: true }],
    help: "1) In the One dashboard (withone.ai, formerly Pica), open “API Keys” and copy the secret key. 2) Paste it here.",
    test: { path: "/connections", message: "Key is valid" },
    examples: "Examples: GET /connections (connected integrations), GET /connections/metrics, GET /connection-definitions (available "
      + "platforms), GET /connection-oauth-definitions/view/{platform}, pass-through calls to a connected integration at "
      + "/passthrough/{key} with the connection header.",
  },
  {
    id: "youtubetranscript", name: "YouTube Transcript", category: "media", description: "YouTube video transcripts (youtube-transcript.io)",
    website: "https://www.youtube-transcript.io", docs: "https://www.youtube-transcript.io/api", logo: { favicon: "https://www.youtube-transcript.io" },
    baseUrl: "https://www.youtube-transcript.io/api",
    auth: { type: "header", name: "Authorization", prefix: "Basic " },
    fields: [{ id: "token", label: "API token", secret: true }],
    keyUrl: "https://www.youtube-transcript.io/profile",
    help: "1) At youtube-transcript.io, open your profile and copy the API token. 2) Each video transcribed uses one credit; the connection "
      + "test transcribes a short video.",
    test: { method: "POST", path: "/transcripts", body: { ids: ["jNQXAC9IVRw"] }, message: "Token is valid" },
    examples: "Examples: POST /transcripts {\"ids\": [\"dQw4w9WgXcQ\", \"…\"]} (up to 50 videos per call; returns the text by "
      + "track and language).",
  },
  {
    id: "addressfinder", name: "Addressfinder", category: "data", description: "Australia and New Zealand: addresses, emails and phone numbers",
    website: "https://addressfinder.com.au", docs: "https://addressfinder.com.au/api/", logo: { favicon: "https://addressfinder.com.au" },
    baseUrl: "https://api.addressfinder.io/api",
    auth: [{ type: "query", name: "key", field: "username" }, { type: "query", name: "secret" }],
    fields: [{ id: "username", label: "Key" }, { id: "token", label: "Secret", secret: true }],
    help: "1) In the Addressfinder portal, open “Credentials” and copy the “key” and the “secret”. 2) Paste them here. "
      + "Add format=json to every request.",
    test: { path: "/nz/address/autocomplete", query: { q: "1 Queen Street", format: "json", max: 1 }, message: "Credentials are valid" },
    examples: "Examples: GET /au/address/autocomplete?q=…&format=json, GET /au/address/metadata?id=…&format=json, "
      + "GET /nz/address/autocomplete?q=…&format=json, GET /email/v1/verification?email=…&format=json, "
      + "GET /phone/v1/verification?phone_number=…&default_country_code=AU&format=json.",
  },
  {
    id: "affinda", name: "Affinda", category: "ai", description: "AI document extraction: resumes, invoices and more",
    website: "https://www.affinda.com", docs: "https://docs.affinda.com", logo: { favicon: "https://www.affinda.com" },
    baseUrl: "https://api.affinda.com/v3",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) In Affinda, open your profile → “Settings” → “API Keys” and create a key. 2) Copy it. Each document processed uses credits.",
    test: { path: "/workspaces", message: "API key is valid" },
    examples: "Examples: GET /workspaces?organization=…, GET /document_types, POST /documents {\"url\": \"https://…\", \"workspace\": "
      + "\"…\", \"wait\": true}, GET /documents?workspace=…, GET /documents/{identifier}, DELETE /documents/{identifier}.",
  },
  {
    id: "agiled", name: "Agiled", category: "crm", description: "Business management: clients, projects, invoices and contracts",
    website: "https://agiled.app", docs: "https://agiled.app/api-docs", logo: { favicon: "https://agiled.app" },
    baseUrl: "https://my.agiled.app/api/v1",
    headers: (c) => ({ Accept: "application/json", Brand: c.brand }),
    auth: { type: "query", name: "api_token" },
    fields: [{ id: "token", label: "API token", secret: true },
             { id: "brand", label: "Your brand domain", format: "domain", example: "example.agiled.app",
               help: "The address you use to sign in to Agiled, e.g. example.agiled.app." }],
    help: "1) In Agiled, open “Settings” → “API” and copy the token. 2) Enter your brand's domain (the one in the address bar).",
    test: { path: "/projects", message: "Token is valid" },
    examples: "Examples: GET /projects, GET /tasks, GET /contacts, POST /contacts {\"name\": \"…\", \"email\": \"…\"}, GET /invoices, "
      + "GET /estimates, GET /contracts, GET /deals.",
  },
  {
    id: "agilitycms", name: "Agility CMS", category: "ecommerce", description: "Headless CMS: content, lists, pages and sitemap",
    website: "https://agilitycms.com", docs: "https://agilitycms.com/docs/apis-sdks/content-fetch-api", logo: { favicon: "https://agilitycms.com" },
    baseUrl: "https://api.aglty.io/{instance}/{mode}",
    auth: { type: "header", name: "APIKey" },
    fields: [{ id: "instance", label: "Instance GUID", format: "segment", example: "a1b2c3d4-u" },
             { id: "token", label: "API Key (Fetch or Preview)", secret: true },
             { id: "mode", label: "Key type", default: "fetch", options: [["fetch", "Fetch (published)"], ["preview", "Preview (drafts)"]] },
             { id: "language", label: "Language for the test", default: "en-us", format: "segment" },
             { id: "channel", label: "Channel for the test", default: "website", format: "segment" }],
    help: "1) In Agility, open “Settings” → “API Keys”. 2) Copy the “Instance GUID” and the “Fetch” key (published content) or “Preview” "
      + "(drafts) and choose its type here. 3) Enter an existing language and channel for the connection test.",
    test: { path: "/{language}/sitemap/flat/{channel}", message: "Key is valid" },
    examples: "Examples: GET /en-us/sitemap/flat/website, GET /en-us/list/{referenceName}?take=20, GET /en-us/item/{contentId}, "
      + "GET /en-us/page/{pageId}, GET /en-us/sync/items?syncToken=0.",
  },
  {
    id: "airparser", name: "Airparser", category: "ai", description: "AI data extraction from emails and documents",
    website: "https://airparser.com", docs: "https://help.airparser.com/public-api", logo: { favicon: "https://airparser.com" },
    baseUrl: "https://api.airparser.com",
    auth: { type: "header", name: "X-API-Key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://app.airparser.com/account",
    help: "1) In Airparser, open “Account” and copy the API key. 2) Paste it here.",
    test: { path: "/inboxes", message: (d) => count(d, "inbox", "inboxes") || "API key is valid" },
    examples: "Examples: GET /inboxes, GET /inboxes/{inboxId}/docs?page=1, GET /docs/{docId}/extended (extracted data), "
      + "POST /inboxes/{inboxId}/upload (multipart file), POST /inboxes/{inboxId}/schema {…}.",
  },
  {
    id: "algodocs", name: "AlgoDocs", category: "ai", description: "Data extraction from PDFs and documents using templates",
    website: "https://www.algodocs.com", docs: "https://api.algodocs.com/swagger", logo: { favicon: "https://www.algodocs.com" },
    baseUrl: "https://api.algodocs.com/v1",
    auth: { type: "basic", usernameField: "username", passwordField: "token" },
    fields: [{ id: "username", label: "Your account email", format: "email" }, { id: "token", label: "API key", secret: true }],
    help: "1) In AlgoDocs, open “Settings” → “API” and copy the key. 2) Enter your account email and the key here.",
    test: { path: "/me", account: (d) => d?.email || d?.fullName },
    examples: "Examples: GET /me, GET /extractors, GET /folders, POST /document/upload_base64/{extractorId}/{folderId} {\"file_base64\": "
      + "\"…\", \"filename\": \"invoice.pdf\"}, GET /extracted_data/{documentId}, GET /extracted_data_by_extractor/{extractorId}?limit=20.",
  },
  {
    id: "amazingmarvin", name: "Amazing Marvin", category: "productivity", description: "Personal task manager: tasks, projects and habits",
    website: "https://amazingmarvin.com", docs: "https://github.com/amazingmarvin/MarvinAPI/wiki/Marvin-API", logo: { image: "https://app.amazingmarvin.com/favicon.ico" },
    baseUrl: "https://serv.amazingmarvin.com/api",
    auth: { type: "header", name: "X-API-Token" },
    fields: [{ id: "token", label: "API Token", secret: true }],
    keyUrl: "https://app.amazingmarvin.com/pre?api",
    help: "1) In Amazing Marvin, enable the API “strategy” and open its page (app.amazingmarvin.com/pre?api). 2) Copy the “API Token”.",
    test: { path: "/me", account: (d) => d?.email },
    examples: "Examples: GET /me, GET /todayItems, GET /dueItems, POST /addTask {\"title\": \"…\", \"day\": \"2026-10-16\"}, POST /markDone "
      + "{\"itemId\": \"…\"}, GET /categories, GET /labels, GET /habits.",
  },
  {
    id: "api2pdf", name: "API2PDF", category: "productivity", description: "PDF from HTML or URL, office file conversion and PDF merging",
    website: "https://www.api2pdf.com", docs: "https://app.swaggerhub.com/apis-docs/api2pdf/api2pdf/2.0.0", logo: { favicon: "https://www.api2pdf.com" },
    baseUrl: "https://v2.api2pdf.com",
    auth: { type: "header", name: "Authorization" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://portal.api2pdf.com",
    help: "1) Go to portal.api2pdf.com and copy your API key. 2) Each conversion is billed by usage; the test only checks the balance.",
    test: { path: "/balance", message: "API key is valid" },
    examples: "Examples: POST /chrome/pdf/url {\"url\": \"https://…\"}, POST /chrome/pdf/html {\"html\": \"<p>…</p>\"}, "
      + "POST /libreoffice/any-to-pdf {\"url\": \"https://…/document.docx\"}, POST /pdfsharp/merge {\"urls\": [\"…\", \"…\"]}, "
      + "POST /chrome/image/url {\"url\": \"https://…\"} (screenshot), GET /balance. Responses include FileUrl with the result.",
  },
  {
    id: "appointo", name: "Appointo", category: "ecommerce", description: "Bookings and appointments for Shopify stores",
    website: "https://www.appointo.me", docs: "https://www.appointo.me/api-docs", logo: { favicon: "https://www.appointo.me" },
    baseUrl: "https://app.appointo.me/api",
    auth: { type: "header", name: "APPOINTO-TOKEN" },
    fields: [{ id: "token", label: "API token", secret: true }],
    help: "1) In the Appointo app in your Shopify, open “Settings” → “Integrations” → “API” and copy the token. 2) Paste it here.",
    test: { path: "/appointments", message: "Token is valid" },
    examples: "Examples: GET /appointments (bookable services), GET /bookings?…, GET /appointments/{id}/available_slots?date=….",
  },
  {
    id: "apptivegrid", name: "ApptiveGrid", category: "productivity", description: "No-code database: spaces, tables and records",
    website: "https://www.apptivegrid.de", docs: "https://www.apptivegrid.de/api", logo: { favicon: "https://www.apptivegrid.de" },
    baseUrl: "https://app.apptivegrid.de/api",
    auth: { type: "basic", usernameField: "username", passwordField: "token" },
    fields: [{ id: "username", label: "API key" }, { id: "token", label: "Key secret", secret: true }],
    help: "1) In ApptiveGrid, open your profile → “API Keys” → “Neuer API Key”. 2) Copy the key and the secret (the secret is shown only once).",
    test: { path: "/users/me", account: (d) => d?.email },
    examples: "Examples: GET /users/me (includes your spaces), GET /users/{userId}/spaces/{spaceId}, "
      + "GET /users/{userId}/spaces/{spaceId}/grids/{gridId}/entities?layout=keyAndValue, "
      + "POST /users/{userId}/spaces/{spaceId}/grids/{gridId}/entities {\"field\": \"value\"}.",
  },
  {
    id: "archiveorg", name: "Internet Archive", category: "data", description: "archive.org search and metadata: books, video, audio and websites",
    website: "https://archive.org", docs: "https://archive.org/developers/", logo: { simpleIcons: "internetarchive" },
    baseUrl: "https://archive.org",
    // Header “Authorization: LOW <access>:<secret>” with the account's S3 keys.
    auth: { type: "signature", sign: ({ headers: reqHeaders, cred }) => {
      reqHeaders.Authorization = `LOW ${cred.username}:${cred.token}`;
    } },
    fields: [{ id: "username", label: "Access key (S3)" }, { id: "token", label: "Secret key (S3)", secret: true }],
    keyUrl: "https://archive.org/account/s3.php",
    help: "1) Sign in at archive.org and open archive.org/account/s3.php. 2) Copy the “access key” and the “secret key”.",
    test: { path: "/services/user.php", query: { op: "whoami" }, account: (d) => d?.value?.screenname || d?.value?.username },
    examples: "Examples: GET /advancedsearch.php?q=title:(hamlet) AND mediatype:texts&fl[]=identifier&fl[]=title&rows=50&output=json, "
      + "GET /metadata/{identifier}, GET /services/search/v1/scrape?q=…&fields=identifier,title, "
      + "GET /wayback/available?url=example.com (latest snapshot in the Wayback Machine).",
  },
  {
    id: "aryn", name: "Aryn", category: "ai", description: "AI document partitioning and queries over collections",
    website: "https://www.aryn.ai", docs: "https://docs.aryn.ai", logo: { favicon: "https://www.aryn.ai" },
    baseUrl: "https://api.aryn.cloud/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://app.aryn.ai/api-keys",
    help: "1) In the Aryn console, open “API Keys” and create a key. 2) Copy it. Document partitioning is billed per page.",
    test: { path: "/storage/docsets", message: "API key is valid" },
    examples: "Examples: GET /storage/docsets, POST /storage/docsets {\"name\": \"…\"}, GET /storage/docsets/{docsetId}/docs, "
      + "POST /document/partition (multipart file; tables, images and text), POST /query {\"docset_id\": \"…\", \"query\": \"…\"}.",
  },
  {
    id: "ascora", name: "Ascora", category: "crm", description: "Field service management: customers, jobs and invoices",
    website: "https://www.ascora.com.au", docs: "https://www.ascora.com.au/api", logo: { favicon: "https://www.ascora.com.au" },
    baseUrl: "https://api.ascora.com.au",
    auth: { type: "header", name: "Auth" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) In Ascora, open “Settings” → “Integrations” → “API” and generate a key. 2) Copy it.",
    test: { path: "/Customers", message: "API key is valid" },
    examples: "Examples: GET /Customers, GET /Enquiries, POST /Enquiry {\"companyName\": \"…\", \"firstName\": \"…\", \"email\": \"…\", "
      + "\"description\": \"…\"}, GET /Jobs, GET /Invoices, GET /Suppliers.",
  },
  {
    id: "bart", name: "BART (San Francisco)", category: "data", description: "San Francisco Bay Area subway: stations, schedules and alerts",
    website: "https://www.bart.gov", docs: "https://api.bart.gov/docs/overview/index.aspx", logo: { image: "https://www.bart.gov/themes/custom/bart/favicon.ico" },
    baseUrl: "https://api.bart.gov/api",
    auth: { type: "query", name: "key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://api.bart.gov/api/register.aspx",
    help: "1) Request a free key at api.bart.gov/api/register.aspx or use BART's public key (MW9S-E7SL-26DU-VV8V). 2) Add "
      + "json=y to every request to receive JSON.",
    test: { path: "/stn.aspx", query: { cmd: "stns", json: "y" }, message: "Key is valid",
              validate: (d) => {
                const e = d?.root?.message?.error;
                if (e) throw new Error(`BART: ${e.text || "invalid key"}`);
              } },
    examples: "Examples: GET /etd.aspx?cmd=etd&orig=EMBR&json=y (next departures), GET /stn.aspx?cmd=stns&json=y, "
      + "GET /sched.aspx?cmd=depart&orig=SFIA&dest=EMBR&json=y, GET /bsa.aspx?cmd=bsa&json=y (alerts), GET /route.aspx?cmd=routes&json=y.",
  },
  {
    id: "beeminder", name: "Beeminder", category: "productivity", description: "Goal tracking with commitment: goals and data",
    website: "https://www.beeminder.com", docs: "https://api.beeminder.com", logo: { favicon: "https://www.beeminder.com" },
    baseUrl: "https://www.beeminder.com/api/v1",
    auth: { type: "query", name: "auth_token" },
    fields: [{ id: "token", label: "Personal token", secret: true }],
    keyUrl: "https://www.beeminder.com/api/v1/auth_token.json",
    help: "1) While signed in to Beeminder, open www.beeminder.com/api/v1/auth_token.json. 2) Copy the value of “auth_token”.",
    test: { path: "/users/me.json", account: (d) => d?.username },
    examples: "Examples: GET /users/me.json, GET /users/me/goals.json, GET /users/me/goals/{slug}.json, "
      + "POST /users/me/goals/{slug}/datapoints.json with form value=1&comment=…, GET /users/me/goals/{slug}/datapoints.json?count=10.",
  },
  {
    id: "bluepillow", name: "Blue Pillow", category: "ecommerce", description: "Hotel and lodging comparison: prices from 16+ websites",
    website: "https://www.bluepillow.com", docs: "https://b2a.bluepillow.com/docs/index/", logo: { favicon: "https://www.bluepillow.com" },
    baseUrl: "https://api.b2a.bluepillow.com/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) Get a free, permanent key with no sign-up at b2a.bluepillow.com/docs/api/keys (POST /v1/keys). 2) Paste it here. "
      + "Limit: 120 requests per minute.",
    test: { method: "POST", path: "/destinations/resolve", body: { name: "London", language: "en" }, message: "API key is valid" },
    examples: "Examples: POST /destinations/resolve {\"name\": \"Manchester\", \"language\": \"en\"}, POST /search/stays {…}, POST /decide "
      + "{…} (best option for a travel intent), GET /properties/{id}, POST /recommendations/by-hotel {…}, POST /validate {…}, "
      + "POST /bookings/initiate {…} (booking link for the user).",
  },
];
