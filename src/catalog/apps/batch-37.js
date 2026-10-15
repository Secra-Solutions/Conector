// Batch 37 of the catalog (from the Composio catalog): marketing and content (tweet screenshots, transactional and bulk email,
// social media publishing, web push, popups, video, subtitles, images and GIFs, podcasts, news, tourist activities and games).

const count = (d, one, many) => (Array.isArray(d) ? `${d.length} ${d.length === 1 ? one : many}` : null);

export default [
  {
    id: "twittershots", name: "TwitterShots", category: "marketing", description: "Screenshots of X (Twitter) posts as PNG, SVG or HTML",
    website: "https://twittershots.com", docs: "https://twittershots.com/docs/api", logo: { favicon: "https://twittershots.com" },
    baseUrl: "https://api.twittershots.com/api/v1",
    auth: { type: "header", name: "X-API-KEY" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) In TwitterShots open “Settings” → “API” and copy the key. 2) Each screenshot uses one credit; the test only checks usage.",
    test: { path: "/usage", message: "API key is valid" },
    examples: "Examples: GET /screenshot/{tweetId}?format=png&theme=light (returns the image; also svg or html and theme=dark), "
      + "GET /usage (credits and usage).",
  },
  {
    id: "unione", name: "UniOne", category: "marketing", description: "Transactional and marketing email: sends, templates and webhooks",
    website: "https://unione.io", docs: "https://docs.unione.io/en/web-api-ref", logo: { favicon: "https://unione.io" },
    baseUrl: "https://{server}/en/transactional/api/v1",
    auth: { type: "header", name: "X-API-KEY" },
    fields: [{ id: "token", label: "API key", secret: true },
             { id: "server", label: "Data center", default: "eu1.unione.io",
               options: [["eu1.unione.io", "Europe"], ["us1.unione.io", "United States"]] }],
    help: "1) In UniOne open “Account” → “Security” → “API key” and copy the key (or create one per project). 2) Choose your account's "
      + "data center.",
    test: { method: "POST", path: "/system/info.json", body: {}, account: (d) => d?.email || d?.user_id },
    examples: "All methods are POST with JSON. Examples: /email/send.json {\"message\": {\"recipients\": [{\"email\": \"…\"}], "
      + "\"subject\": \"…\", \"from_email\": \"…\", \"body\": {\"html\": \"…\"}}} (really sends), /template/list.json {}, "
      + "/domain/list.json {}, /suppression/list.json {\"cause\": \"unsubscribed\"}, /webhook/list.json {}, /system/info.json {}.",
  },
  {
    id: "unisender", name: "Unisender", category: "marketing", description: "Email and SMS marketing: lists, contacts and campaigns",
    website: "https://www.unisender.com", docs: "https://www.unisender.com/en/support/api/", logo: { favicon: "https://www.unisender.com" },
    baseUrl: "https://api.unisender.com/en/api",
    auth: { type: "query", name: "api_key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) In Unisender open “Settings” → “Integrations and API” and copy the key. 2) Paste it here.",
    test: { path: "/getLists", message: (d) => count(d?.result, "list", "lists") || "API key is valid" },
    examples: "Methods go in the path. Examples: GET /getLists, GET /getContact?email=…, POST /subscribe with form list_ids=…&"
      + "fields[email]=…&double_optin=3, GET /getCampaigns, GET /getCampaignStatus?campaign_id=…, POST /createEmailMessage {…}.",
  },
  {
    id: "uploadpost", name: "Upload-Post", category: "marketing", description: "Publish videos, photos and text to several networks in one call",
    website: "https://www.upload-post.com", docs: "https://docs.upload-post.com", logo: { favicon: "https://www.upload-post.com" },
    baseUrl: "https://api.upload-post.com/api",
    auth: { type: "header", name: "Authorization", prefix: "Apikey " },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) In Upload-Post open “API Keys” and generate a key. 2) Connect your networks in an Upload-Post user profile: that profile "
      + "name is the “user” field of each post.",
    test: { path: "/uploadposts/me", message: "API key is valid" },
    examples: "Posts use form data. Examples: GET /uploadposts/me, GET /uploadposts/users (profiles), POST /upload_text with "
      + "form user=…&platform[]=x&platform[]=linkedin&title=…, POST /upload_photos (photos[] by URL), POST /upload (video), "
      + "GET /uploadposts/status?request_id=….",
  },
  {
    id: "webpushr", name: "Webpushr", category: "marketing", description: "Web push notifications: sends, segments and subscribers",
    website: "https://www.webpushr.com", docs: "https://docs.webpushr.com/introduction-to-rest-api", logo: { favicon: "https://www.webpushr.com" },
    baseUrl: "https://api.webpushr.com/v1",
    headers: { "Content-Type": "application/json" },
    auth: [{ type: "header", name: "webpushrKey" }, { type: "header", name: "webpushrAuthToken", field: "authorization" }],
    fields: [{ id: "token", label: "REST API Key", secret: true },
             { id: "authorization", label: "Authentication Token", secret: true }],
    help: "1) In Webpushr open “Integration” → “REST API Keys”. 2) Copy the “REST API Key” and the “Authentication Token”.",
    test: { path: "/site/subscriber_count", message: (d) => (d?.total_life_time_subscribers != null
      ? `${d.total_life_time_subscribers} subscribers` : "Credentials are valid") },
    examples: "Examples: POST /notification/send/all {\"title\": \"…\", \"message\": \"…\", \"target_url\": \"https://…\"} (sends to everyone), "
      + "POST /notification/send/sid {\"sid\": 123, …}, POST /notification/send/segment {\"segment\": [1], …}, "
      + "GET /notification/status/id/{id}, GET /site/subscriber_count.",
  },
  {
    id: "wisepops", name: "Wisepops", category: "marketing", description: "Website popups and bars: captured contacts and webhooks",
    website: "https://wisepops.com", docs: "https://support.wisepops.com/article/mzf1e7y5bb-api", logo: { favicon: "https://wisepops.com" },
    baseUrl: "https://app.wisepops.com/api2",
    // Header with its own format: Authorization: WISEPOPS-API key="…".
    auth: { type: "signature", sign: ({ headers: headers, cred }) => {
      headers.Authorization = `WISEPOPS-API key="${cred.token}"`;
    } },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) In Wisepops open “Settings” → “Integrations” → “API” and copy the key. 2) Paste it here.",
    test: { path: "/contacts", query: { page_size: 1 }, message: "API key is valid" },
    examples: "Examples: GET /contacts?collected_after=2026-10-01T00:00:00Z&page_size=100 (emails and fields captured by the popups), "
      + "GET /contacts?wisepop_id=…, POST /hooks {\"event\": \"email\", \"target_url\": \"https://…\"}, DELETE /hooks?hook_id=….",
  },
  {
    id: "wistia", name: "Wistia", category: "marketing", description: "Business video: media, projects and statistics",
    website: "https://wistia.com", docs: "https://docs.wistia.com/reference", logo: { favicon: "https://wistia.com" },
    baseUrl: "https://api.wistia.com/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API token", secret: true }],
    help: "1) In Wistia open “Account” → “Settings” → “API Access” and create a token with the permissions you need. 2) Copy it.",
    test: { path: "/account.json", account: (d) => d?.name },
    examples: "Examples: GET /medias.json?project_id=…&per_page=50, GET /medias/{hashedId}.json, PUT /medias/{hashedId}.json {\"name\": \"…\"}, "
      + "GET /projects.json, POST /projects.json {\"name\": \"…\"}, GET /stats/account.json, GET /stats/medias/{hashedId}.json.",
  },
  {
    id: "woopsocial", name: "WoopSocial", category: "marketing", description: "Scheduled social media posting: projects, accounts and media",
    website: "https://woopsocial.com", docs: "https://docs.woopsocial.com", logo: { favicon: "https://woopsocial.com" },
    baseUrl: "https://api.woopsocial.com/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://app.woopsocial.com/api-access",
    help: "1) In WoopSocial open “API Access” and generate a key. 2) Copy it.",
    test: { path: "/projects", message: "API key is valid" },
    examples: "Examples: GET /projects, GET /social-accounts?projectId=…, POST /posts/validate {…} (checks without publishing), POST /posts "
      + "{…}, GET /posts/{postId}, GET /social-account-posts?…, POST /media/upload-sessions {…}, GET /webhooks.",
  },
  {
    id: "amara", name: "Amara", category: "marketing", description: "Video subtitles and translation: videos, languages and teams",
    website: "https://amara.org", docs: "https://apidocs.amara.org", logo: { favicon: "https://amara.org" },
    baseUrl: "https://amara.org/api",
    auth: { type: "header", name: "X-api-key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://amara.org/profiles/account/",
    help: "1) In Amara open your account (“Account”) and, under “API Access”, generate the key. 2) Copy it.",
    test: { path: "/users/me/", account: (d) => d?.username },
    examples: "Paths end in /. Examples: GET /videos/?team=…, POST /videos/ {\"video_url\": \"https://…\", \"primary_audio_language_code\": "
      + "\"en\"}, GET /videos/{videoId}/languages/, GET /videos/{videoId}/languages/{lang}/subtitles/?sub_format=srt, "
      + "POST /videos/{videoId}/languages/{lang}/subtitles/ {…}, GET /teams/.",
  },
  {
    id: "thecatapi", name: "The Cat API", category: "media", description: "Cat photos, breeds, favorites and votes",
    website: "https://thecatapi.com", docs: "https://developers.thecatapi.com", logo: { favicon: "https://thecatapi.com" },
    baseUrl: "https://api.thecatapi.com/v1",
    auth: { type: "header", name: "x-api-key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) Request a free key at thecatapi.com (it arrives by email). 2) Paste it here.",
    test: { path: "/favourites", message: "API key is valid" },
    examples: "Examples: GET /images/search?limit=10&has_breeds=1, GET /breeds, GET /breeds/search?q=siam, POST /favourites {\"image_id\": "
      + "\"…\"}, POST /votes {\"image_id\": \"…\", \"value\": 1}.",
  },
  {
    id: "cincopa", name: "Cincopa", category: "marketing", description: "Business video and images: galleries, assets and uploads",
    website: "https://www.cincopa.com", docs: "https://www.cincopa.com/media-platform/api-documentation-v2", logo: { favicon: "https://www.cincopa.com" },
    baseUrl: "https://api.cincopa.com/v2",
    auth: { type: "query", name: "api_token" },
    fields: [{ id: "token", label: "API token", secret: true }],
    help: "1) In Cincopa open “Settings” → “API Tokens” and create a token with the permissions you need. 2) Copy it.",
    test: { path: "/ping.json", message: "Token is valid" },
    examples: "Methods go in the path. Examples: GET /gallery.list.json, GET /gallery.get_items.json?fid=…, GET /asset.list.json, "
      + "GET /asset.upload_from_url.json?url=https://…, GET /gallery.create.json?name=…, GET /ping.json.",
  },
  {
    id: "dungeonfighter", name: "Dungeon Fighter Online (Neople)", category: "media", description: "DNF game data: characters, items and auction",
    website: "https://developers.neople.co.kr", docs: "https://developers.neople.co.kr/contents/apiDocs/df", logo: { favicon: "https://df.nexon.com" },
    baseUrl: "https://api.neople.co.kr/df",
    auth: { type: "query", name: "apikey" },
    fields: [{ id: "token", label: "Neople API key", secret: true }],
    help: "1) Create an application at developers.neople.co.kr (in Korean) and copy the API key. 2) Paste it here.",
    test: { path: "/servers", message: (d) => count(d?.rows, "server", "servers") || "API key is valid" },
    examples: "Examples: GET /servers, GET /servers/{serverId}/characters?characterName=…, GET /servers/{serverId}/characters/{characterId}, "
      + "GET /servers/{serverId}/characters/{characterId}/equip/equipment, GET /items?itemName=…, GET /auction?itemName=….",
  },
  {
    id: "giphy", name: "GIPHY", category: "media", description: "GIF and sticker search, trending and random",
    website: "https://giphy.com", docs: "https://developers.giphy.com/docs/api", logo: { simpleIcons: "giphy" },
    baseUrl: "https://api.giphy.com/v1",
    auth: { type: "query", name: "api_key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://developers.giphy.com/dashboard/",
    help: "1) At developers.giphy.com open the “Dashboard” → “Create an App” → “API”. 2) Copy the app's key.",
    test: { path: "/gifs/trending", query: { limit: 1 }, message: "API key is valid" },
    examples: "Examples: GET /gifs/search?q=…&limit=10&lang=en&rating=g, GET /gifs/trending, GET /gifs/{id}, GET /stickers/search?q=…, "
      + "GET /gifs/random?tag=…, GET /trending/searches.",
  },
  {
    id: "headout", name: "Headout", category: "ecommerce", description: "Tickets and activities: cities, products, availability and bookings",
    website: "https://www.headout.com", docs: "https://partner.headout.com/docs", logo: { favicon: "https://www.headout.com" },
    baseUrl: "https://{server}/api/public/v2",
    auth: { type: "header", name: "Headout-Auth" },
    fields: [{ id: "token", label: "API key (pk_… or tk_…)", secret: true },
             { id: "server", label: "Environment", default: "www.headout.com",
               options: [["www.headout.com", "Production"], ["www.sandbox-headout.com", "Testing (sandbox)"]] }],
    help: "1) Request access to Headout's partner program: they give you a production key (pk_…) and a test key (tk_…). "
      + "2) Choose the environment that matches the key. Production bookings are real and are charged to your Headout wallet.",
    test: { path: "/cities/", message: "API key is valid" },
    examples: "Paths end in /. Examples: GET /cities/, GET /products/?cityCode=LONDON, GET /products/{id}/, GET /categories/?cityCode=…, "
      + "GET /availabilities/?productId=…&startDate=…, POST /bookings/ {…}, PUT /bookings/{id}/ {\"status\": \"PENDING\"} (capture), "
      + "POST /bookings/{id}/cancel/ {\"reason\": \"…\"}.",
  },
  {
    id: "imagekit", name: "ImageKit", category: "ecommerce", description: "Optimized images and video: library, transformations and CDN",
    website: "https://imagekit.io", docs: "https://imagekit.io/docs/api-reference", logo: { simpleIcons: "imagekit" },
    baseUrl: "https://api.imagekit.io/v1",
    auth: { type: "basic", usernameField: "token", fixedPassword: "" },
    fields: [{ id: "token", label: "Private key (private_…)", secret: true }],
    keyUrl: "https://imagekit.io/dashboard/developer/api-keys",
    help: "1) In ImageKit open “Developer options” → “API keys” and copy the “Private key”. 2) Conector sends it as the Basic auth "
      + "username with an empty password.",
    test: { path: "/files", query: { limit: 1 }, message: "Private key is valid" },
    examples: "Examples: GET /files?searchQuery=name:\"logo\"&limit=50, GET /files/{fileId}/details, PATCH /files/{fileId}/details {\"tags\": "
      + "[\"…\"]}, DELETE /files/{fileId}, POST /files/purge {\"url\": \"https://ik.imagekit.io/…\"}, GET /folder? …, "
      + "GET /accounts/usage?startDate=2026-10-01&endDate=2026-10-15.",
  },
  {
    id: "listennotes", name: "Listen Notes", category: "media", description: "Podcast search engine: shows, episodes and rankings",
    website: "https://www.listennotes.com", docs: "https://www.listennotes.com/api/docs/", logo: { favicon: "https://www.listennotes.com" },
    baseUrl: "https://listen-api.listennotes.com/api/v2",
    auth: { type: "header", name: "X-ListenAPI-Key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://www.listennotes.com/api/dashboard/",
    help: "1) At listennotes.com/api open the “Dashboard” and copy the key (the free plan has a monthly quota). 2) Paste it here.",
    test: { path: "/genres", message: (d) => count(d?.genres, "genre", "genres") || "API key is valid" },
    examples: "Examples: GET /search?q=…&type=episode&language=English, GET /podcasts/{id}, GET /episodes/{id}, "
      + "GET /best_podcasts?genre_id=93&region=us, GET /typeahead?q=…, GET /curated_podcasts.",
  },
  {
    id: "newsapi", name: "NewsAPI", category: "media", description: "News from thousands of outlets: headlines, search and sources",
    website: "https://newsapi.org", docs: "https://newsapi.org/docs", logo: { favicon: "https://newsapi.org" },
    baseUrl: "https://newsapi.org/v2",
    auth: { type: "header", name: "X-Api-Key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://newsapi.org/account",
    help: "1) Sign up at newsapi.org and copy the key from your account. 2) The free plan is for development only (articles are "
      + "delayed by 24 hours); commercial use requires a paid plan.",
    test: { path: "/top-headlines/sources", query: { language: "en" }, message: (d) => count(d?.sources, "source", "sources") || "API key is valid" },
    examples: "Examples: GET /top-headlines?country=us&category=business, GET /everything?q=…&language=en&sortBy=publishedAt&pageSize=20, "
      + "GET /top-headlines/sources?language=en.",
  },
];
