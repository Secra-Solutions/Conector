// Batch 36 of the catalog: marketing (email marketing, personalized video, link shorteners, postal mail, affiliates,
// hashtags, social media and call compliance in the United Kingdom).

const count = (d, one, many) => (Array.isArray(d) ? `${d.length} ${d.length === 1 ? one : many}` : null);

export default [
  {
    id: "reteno", name: "Reteno", category: "marketing", description: "Omnichannel marketing: contacts, events, segments and messages",
    website: "https://reteno.com", docs: "https://docs.reteno.com/reference/api-keys", logo: { favicon: "https://reteno.com" },
    baseUrl: "https://api.reteno.com/api/v1",
    // Basic: any username and the API key as the password.
    auth: { type: "basic", fixedUsername: "conector", passwordField: "token" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) In Reteno open your profile → “Settings” → “API” → “New key”, add a description and choose the permissions (“Full access to "
      + "API” or the ones you need). 2) Copy the key.",
    test: { path: "/additionalfields", message: "API key is valid" },
    examples: "Examples: POST /contact {\"channels\": [{\"type\": \"email\", \"value\": \"…\"}], \"firstName\": \"…\", \"externalCustomerId\": "
      + "\"…\"} (creates or updates), POST /event {\"eventTypeKey\": \"…\", \"keyValue\": \"…\", \"params\": [{\"name\": \"…\", \"value\": "
      + "\"…\"}]}, GET /additionalfields, GET /contacts?email=…, DELETE /contact?externalCustomerId=….",
  },
  {
    id: "ritekit", name: "RiteKit", category: "marketing", description: "Hashtags, emojis and trends for social media posts",
    website: "https://ritekit.com", docs: "https://documenter.getpostman.com/view/2010712/SzS7Qku5", logo: { favicon: "https://ritekit.com" },
    baseUrl: "https://api.ritekit.com/v1",
    auth: { type: "query", name: "client_id" },
    fields: [{ id: "token", label: "Client ID", secret: true }],
    keyUrl: "https://ritekit.com/developer/dashboard/",
    help: "1) In RiteKit open “Developer” → “Dashboard” and create an API token. 2) Copy its “Client ID”. 3) Each call uses credits "
      + "from the plan; the connection test requests hashtag suggestions.",
    test: { path: "/stats/hashtag-suggestions", query: { text: "marketing" }, message: "Client ID is valid" },
    examples: "Examples: GET /stats/hashtag-suggestions?text=…, GET /stats/multiple-hashtags?tags=seo,marketing (popularity), "
      + "GET /search/trending?green=1, GET /stats/auto-hashtag?post=…&maxHashtags=3, GET /emoji/suggestions?text=…, "
      + "GET /images/logo?domain=example.com.",
  },
  {
    id: "scrapecreators", name: "ScrapeCreators", category: "marketing", description: "Public social media data: profiles, videos and posts",
    website: "https://scrapecreators.com", docs: "https://docs.scrapecreators.com", logo: { favicon: "https://scrapecreators.com" },
    baseUrl: "https://api.scrapecreators.com",
    auth: { type: "header", name: "x-api-key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) In ScrapeCreators open the dashboard and copy your API key. 2) Each query uses credits; the test only checks the balance.",
    test: { path: "/v1/credit-balance", message: (d) => (d?.creditCount != null ? `${d.creditCount} credits` : "API key is valid") },
    examples: "Examples: GET /v1/tiktok/profile?handle=…, GET /v3/tiktok/profile/videos?handle=…, GET /v1/instagram/profile?handle=…, "
      + "GET /v1/youtube/channel?handle=…, GET /v1/youtube/video?url=…, GET /v1/threads/profile?handle=…, GET /v1/credit-balance.",
  },
  {
    id: "sendpulse", name: "SendPulse", category: "marketing", description: "Email, SMS and chatbots: address books, campaigns and SMTP sends",
    website: "https://sendpulse.com", docs: "https://sendpulse.com/integrations/api", logo: { favicon: "https://sendpulse.com" },
    baseUrl: "https://api.sendpulse.com",
    auth: { type: "client_credentials", url: "https://api.sendpulse.com/oauth/access_token", credentialsIn: "body", format: "json" },
    fields: [{ id: "client_id", label: "ID" }, { id: "client_secret", label: "Secret", secret: true }],
    keyUrl: "https://login.sendpulse.com/settings/#api",
    help: "1) In SendPulse open “Account settings” → “API”, enable the REST API and copy the “ID” and the “Secret”. 2) Conector requests "
      + "and renews the access token on its own (it lasts one hour).",
    test: { path: "/addressbooks", query: { limit: 1 }, message: "Credentials are valid" },
    examples: "Examples: GET /addressbooks, GET /addressbooks/{id}/emails, POST /addressbooks/{id}/emails {\"emails\": [{\"email\": \"…\", "
      + "\"variables\": {\"name\": \"…\"}}]}, GET /campaigns, POST /campaigns {…}, POST /smtp/emails {\"email\": {…}} (transactional "
      + "send), GET /user/balance/detail.",
  },
  {
    id: "sendernet", name: "Sender", category: "marketing", description: "Email and SMS marketing: subscribers, groups and campaigns",
    website: "https://www.sender.net", docs: "https://api.sender.net", logo: { favicon: "https://www.sender.net" },
    baseUrl: "https://api.sender.net/v2",
    headers: { Accept: "application/json" },
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API token", secret: true }],
    keyUrl: "https://app.sender.net/settings/tokens",
    help: "1) In Sender open “Settings” → “API access tokens” → “Create API token”. 2) Copy the token.",
    test: { path: "/groups", message: (d) => count(d?.data, "group", "groups") || "Token is valid" },
    examples: "Examples: GET /subscribers, GET /subscribers/{email}, POST /subscribers {\"email\": \"…\", \"firstname\": \"…\", \"groups\": "
      + "[\"…\"]}, GET /groups, POST /groups {\"title\": \"…\"}, GET /campaigns, POST /campaigns {…}, GET /fields.",
  },
  {
    id: "sendfox", name: "SendFox", category: "marketing", description: "Newsletters for creators: contacts, lists and campaigns",
    website: "https://sendfox.com", docs: "https://help.sendfox.com/article/278-endpoints", logo: { favicon: "https://sendfox.com" },
    baseUrl: "https://api.sendfox.com",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "Personal access token", secret: true }],
    keyUrl: "https://sendfox.com/account/oauth",
    help: "1) In SendFox open “Account” → “API” and create a “Personal Access Token”. 2) Copy it: it is shown only once.",
    test: { path: "/me", account: (d) => d?.email },
    examples: "Examples: GET /lists, GET /contacts?email=…, POST /contacts {\"email\": \"…\", \"first_name\": \"…\", \"lists\": [123]}, "
      + "GET /campaigns, PATCH /unsubscribe {\"email\": \"…\"}.",
  },
  {
    id: "sendlane", name: "Sendlane", category: "marketing", description: "Email and SMS for ecommerce: lists, contacts and campaigns",
    website: "https://www.sendlane.com", docs: "https://api.sendlane.com/v2/docs", logo: { favicon: "https://www.sendlane.com" },
    baseUrl: "https://api.sendlane.com/v2",
    headers: { Accept: "application/json" },
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API token", secret: true }],
    help: "1) In Sendlane open “Account” → “API” and create an API token. 2) Copy it.",
    test: { path: "/lists", message: (d) => count(d?.data, "list", "lists") || "Token is valid" },
    examples: "Examples: GET /lists, POST /lists/{listId}/contacts {\"contacts\": [{\"email\": \"…\", \"first_name\": \"…\"}]}, "
      + "GET /contacts?email=…, GET /tags, POST /tags/{tagId}/contacts {…}, GET /campaigns, POST /custom-events {…}.",
  },
  {
    id: "sendloop", name: "Sendloop", category: "marketing", description: "Email marketing: lists, subscribers and campaigns",
    website: "https://sendloop.com", docs: "https://sendloop.com/help/api", logo: { favicon: "https://sendloop.com" },
    baseUrl: "https://app.sendloop.com/api/v3",
    auth: { type: "query", name: "APIKey" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) In Sendloop open “Settings” → “API” and copy the key. 2) Paste it here.",
    // Sendloop answers 200 to a bad key: {"Success": false, "ErrorCode": 104, "ErrorMessage": "Invalid API key"}.
    test: { path: "/Account.Info.Get/json", message: "API key is valid",
              validate: (d) => {
                if (!d?.Success) throw new Error(`Sendloop: ${d?.ErrorMessage || "invalid response"}`);
              } },
    examples: "Methods go in the path with /json at the end. Examples: GET /List.GetList/json, GET /Subscriber.Browse/json?ListID=…, "
      + "POST /Subscriber.Subscribe/json with a form ListID=…&EmailAddress=…, GET /Campaign.GetList/json, GET /Account.Info.Get/json.",
  },
  {
    id: "sendspark", name: "Sendspark", category: "marketing", description: "Personalized videos at scale for prospecting",
    website: "https://www.sendspark.com", docs: "https://help.sendspark.com/api-reference", logo: { favicon: "https://www.sendspark.com" },
    baseUrl: "https://api-gw.sendspark.com/v1",
    auth: [{ type: "header", name: "x-api-key" }, { type: "header", name: "x-api-secret", field: "secret" }],
    fields: [{ id: "token", label: "API Key (from the workspace)", secret: true },
             { id: "secret", label: "API Secret (from your user)", secret: true }],
    help: "1) In Sendspark open “Settings” → “API Credentials”. 2) Copy the workspace “API Key” and generate your “API Secret” "
      + "(each member has their own). 3) The API allows 30 requests per minute.",
    test: { path: "/workspaces", message: "Credentials are valid" },
    examples: "Examples: GET /workspaces, GET /workspaces/{workspaceId}/dynamics (dynamic video campaigns), POST "
      + "/workspaces/{workspaceId}/dynamics/{dynamicId}/prospect {\"contactName\": \"…\", \"contactEmail\": \"…\", \"company\": \"…\"}, "
      + "POST /workspaces/{workspaceId}/dynamics/{dynamicId}/prospects/bulk {…} (1 request per minute).",
  },
  {
    id: "sequenzy", name: "Sequenzy", category: "marketing", description: "Email marketing for SaaS: subscribers, lists and sequences",
    website: "https://sequenzy.com", docs: "https://docs.sequenzy.com", logo: { favicon: "https://sequenzy.com" },
    baseUrl: "https://api.sequenzy.com/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) In Sequenzy open “Settings” → “API Keys” and create a key. 2) Copy it.",
    test: { path: "/subscribers", query: { limit: 1 }, message: "API key is valid" },
    examples: "Examples: GET /subscribers, GET /subscribers/{email}, POST /subscribers {\"email\": \"…\", \"firstName\": \"…\", \"tags\": "
      + "[\"…\"]}, POST /subscribers/{email}/tags {…}, POST /events {\"email\": \"…\", \"event\": \"…\"}.",
  },
  {
    id: "shortio", name: "Short.io", category: "marketing", description: "Short links on your own domain: links and domains",
    website: "https://short.io", docs: "https://developers.short.io", logo: { favicon: "https://short.io" },
    baseUrl: "https://api.short.io",
    auth: { type: "header", name: "Authorization" },
    fields: [{ id: "token", label: "Secret API key", secret: true }],
    keyUrl: "https://app.short.io/settings/integrations/api-key",
    help: "1) In Short.io open “Integrations & API” → “API” and create a secret key (“Secret key”). 2) Copy it.",
    test: { path: "/api/domains", message: (d) => count(d, "domain", "domains") || "Key is valid" },
    examples: "Examples: GET /api/domains, POST /links {\"domain\": \"…\", \"originalURL\": \"https://…\", \"path\": \"…\"}, "
      + "GET /api/links?domain_id=…&limit=50, GET /links/expand?domain=…&path=…, POST /links/{linkId} {…} (edits), DELETE /links/{linkId}.",
  },
  {
    id: "shortenrest", name: "Shorten.REST", category: "marketing", description: "Link shortener with aliases, domains and clicks",
    website: "https://shorten.rest", docs: "https://docs.shorten.rest", logo: { favicon: "https://shorten.rest" },
    baseUrl: "https://api.shorten.rest",
    auth: { type: "header", name: "x-api-key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) In Shorten.REST open “Dashboard” → “API Keys” and create a key. 2) Copy it.",
    test: { path: "/domains", message: "API key is valid" },
    examples: "Examples: POST /aliases?domainName=short.fyi&aliasName=offer {\"destinations\": [{\"url\": \"https://…\"}]}, "
      + "GET /aliases?domainName=…&aliasName=…, GET /aliases/all?domainName=…, DELETE /aliases?domainName=…&aliasName=…, GET /domains, "
      + "GET /clicks?…",
  },
  {
    id: "sidetracker", name: "Sidetracker", category: "marketing", description: "Website visit tracking and lead lists",
    website: "https://sidetracker.io", docs: "https://sidetracker.io", logo: { image: "https://sidetracker.io/wp-content/uploads/2024/04/cropped-favi-192x192.png" },
    baseUrl: "https://app.sidetracker.io/api",
    auth: { type: "header", name: "Authorization" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) In Sidetracker open “Settings” → “API” and copy your organization's key. 2) Paste it here.",
    test: { path: "/lists", message: "API key is valid" },
    examples: "Examples: GET /lists, GET /lists/{id}, GET /tracking/sessions/{domainId} (visits recorded by a domain tracker), "
      + "GET /tracking/sessions/{domainId}/{sessionId}/visits.",
  },
  {
    id: "simplero", name: "Simplero", category: "marketing", description: "Courses, memberships and online sales: products, purchases, lists",
    website: "https://simplero.com", docs: "https://simplero.com/api/v2/docs", logo: { favicon: "https://simplero.com" },
    baseUrl: "https://simplero.com/api/v2",
    // Simplero requires the User-Agent to carry the application name and a contact email.
    headers: (c) => ({ "User-Agent": `Conector (${c.contact})` }),
    auth: { type: "header", name: "X-API-Key" },
    fields: [{ id: "token", label: "API key", secret: true },
             { id: "contact", label: "Contact email (for the User-Agent)", format: "email", example: "you@example.com",
               help: "Simplero requires every request to identify the application and a contact email." }],
    help: "1) In Simplero open “Settings” → “Integrations” and copy the API key. 2) Enter a contact email: Simplero requires it in "
      + "every request.",
    test: { path: "/lists", query: { per_page: 1 }, message: "API key is valid" },
    examples: "Pagination uses page and per_page (1–100). Examples: GET /products, GET /purchases?per_page=50, GET /subscriptions, "
      + "GET /lists, GET /courses, GET /tags, POST /lists/{id}/actions/… (actions on lists).",
  },
  {
    id: "spotlightr", name: "Spotlightr", category: "marketing", description: "Video hosting for marketing and courses",
    website: "https://spotlightr.com", docs: "https://spotlightr.com/api", logo: { favicon: "https://spotlightr.com" },
    baseUrl: "https://api.spotlightr.com/api",
    headers: { Accept: "application/json" },
    auth: { type: "query", name: "vooKey" },
    fields: [{ id: "token", label: "API key (vooKey)", secret: true }],
    help: "1) In Spotlightr open “Settings” → “API” and copy the key. 2) Paste it here.",
    test: { path: "/videos", message: "API key is valid" },
    examples: "Examples: GET /videos, GET /videos?videoID=…, GET /videos?videoGroup=… (videos in a project).",
  },
  {
    id: "stannp", name: "Stannp", category: "marketing", description: "Automated postal mail: letters, postcards and campaigns",
    website: "https://www.stannp.com", docs: "https://www.stannp.com/uk/direct-mail-api/guide", logo: { favicon: "https://www.stannp.com" },
    baseUrl: "https://{server}/v1",
    auth: { type: "basic", usernameField: "token", fixedPassword: "" },
    fields: [{ id: "token", label: "API key", secret: true },
             { id: "server", label: "Account region", default: "api-eu1.stannp.com",
               options: [["api-eu1.stannp.com", "Europe (United Kingdom)"], ["api-us1.stannp.com", "United States"]] }],
    help: "1) In Stannp open “Settings” → “API” and copy the key. 2) Choose your account's region. 3) Sending letters and postcards "
      + "costs real money (printing and postage); use test=true to try it out.",
    test: { path: "/users/me", account: (d) => d?.data?.email },
    examples: "Examples: GET /users/me (balance), POST /letters/create {\"test\": true, \"recipient\": {…}, \"template\": …}, "
      + "POST /postcards/create {\"test\": true, \"size\": \"A6\", …}, GET /campaigns/list, GET /recipients/list, POST /recipients/new {…}, "
      + "GET /groups/list.",
  },
  {
    id: "tapfiliate", name: "Tapfiliate", category: "marketing", description: "Affiliate programs: affiliates, conversions and commissions",
    website: "https://tapfiliate.com", docs: "https://tapfiliate.com/docs/rest/", logo: { favicon: "https://tapfiliate.com" },
    baseUrl: "https://api.tapfiliate.com/1.6",
    auth: { type: "header", name: "X-Api-Key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) In Tapfiliate open your profile → “Settings” → “API key” and copy the key. 2) Paste it here.",
    test: { path: "/programs/", message: (d) => count(d, "program", "programs") || "API key is valid" },
    examples: "Paths end in /. Examples: GET /affiliates/, GET /affiliates/{id}/, GET /conversions/?date_from=2026-10-01, POST "
      + "/conversions/ {\"referral_code\": \"…\", \"external_id\": \"…\", \"amount\": 100}, GET /commissions/?approved=false, GET /programs/, "
      + "GET /affiliates/{id}/balances/.",
  },
  {
    id: "thanksio", name: "thanks.io", category: "marketing", description: "Automated handwritten postcards and letters",
    website: "https://www.thanks.io", docs: "https://docs.thanks.io", logo: { favicon: "https://www.thanks.io" },
    baseUrl: "https://api.thanks.io/api/v2",
    headers: { Accept: "application/json" },
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "Personal access token", secret: true }],
    help: "1) In thanks.io open “Account” → “API” and create a personal access token. 2) Copy it. Sends cost real money.",
    test: { path: "/mailing-lists", message: "Token is valid" },
    examples: "Examples: GET /mailing-lists, GET /mailing-lists/{id}/recipients, POST /mailing-lists/{id}/recipients {…}, POST /send/postcard "
      + "{\"front_image_url\": \"…\", \"message\": \"…\", \"recipients\": [{…}]} (this really sends the postcard), POST /send/letter {…}, GET /orders/list.",
  },
  {
    id: "tikhub", name: "TikHub", category: "marketing", description: "TikTok, Douyin, Instagram, YouTube and X data via API",
    website: "https://tikhub.io", docs: "https://api.tikhub.io/docs", logo: { favicon: "https://tikhub.io" },
    baseUrl: "https://api.tikhub.io",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API token", secret: true }],
    help: "1) In the TikHub dashboard open “API Keys” and create a token with the permissions you need. 2) Copy it. 3) Data queries "
      + "are charged per request; the test only reads your account.",
    test: { path: "/api/v1/tikhub/user/get_user_info", message: "Token is valid" },
    examples: "Examples: GET /api/v1/tikhub/user/get_user_info (account and balance), GET /api/v1/tiktok/web/fetch_user_profile?uniqueId=…, "
      + "GET /api/v1/tiktok/app/v3/fetch_one_video?aweme_id=…, GET /api/v1/instagram/web_app/fetch_user_info_by_username?username=…, "
      + "GET /api/v1/youtube/web/get_video_info?video_id=… (full list at /docs).",
  },
  {
    id: "tinyurl", name: "TinyURL", category: "marketing", description: "Short links with aliases, custom domains and statistics",
    website: "https://tinyurl.com", docs: "https://tinyurl.com/app/dev", logo: { favicon: "https://tinyurl.com" },
    baseUrl: "https://api.tinyurl.com",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API token", secret: true }],
    keyUrl: "https://tinyurl.com/app/dev",
    help: "1) In TinyURL open “Settings” → “Developer” (tinyurl.com/app/dev) and create a token with the permissions you need. 2) Copy it.",
    test: { path: "/urls/available", message: "Token is valid" },
    examples: "Examples: POST /create {\"url\": \"https://…\", \"domain\": \"tinyurl.com\", \"alias\": \"…\"}, GET /alias/tinyurl.com/{alias}, "
      + "PATCH /change {\"domain\": \"tinyurl.com\", \"alias\": \"…\", \"url\": \"https://…\"}, GET /urls/available, GET /urls/archived, "
      + "GET /analytics/timeline?…",
  },
  {
    id: "tpscheck", name: "TPSCheck", category: "marketing", description: "UK: check phone numbers against the TPS and CTPS lists",
    website: "https://www.tpscheck.uk", docs: "https://www.tpscheck.uk", logo: { favicon: "https://www.tpscheck.uk" },
    baseUrl: "https://api.tpscheck.uk",
    auth: { type: "query", name: "key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) In TPSCheck.uk open your account → “API” and copy the key. 2) Each check uses one credit; the connection test "
      + "checks a dummy number.",
    test: { path: "/check/01234567890", message: "API key is valid" },
    examples: "Examples: GET /check/{phone} (tells you whether a UK number is on the Telephone Preference Service or the "
      + "Corporate TPS before calling).",
  },
  {
    id: "trackdesk", name: "Trackdesk", category: "marketing", description: "Affiliates and referrals: affiliates, offers and conversions",
    website: "https://trackdesk.com", docs: "https://developers.trackdesk.com", logo: { favicon: "https://trackdesk.com" },
    baseUrl: "https://{tenant}.trackdesk.com/api/node",
    auth: { type: "header", name: "X-Api-Key" },
    fields: [{ id: "tenant", label: "Tenant ID", format: "subdomain",
               help: "Your account name: the part before .trackdesk.com (shown on the main settings page)." },
             { id: "token", label: "Personal API token", secret: true }],
    help: "1) In Trackdesk open “Settings” → “API Access” and create a personal token. 2) Copy the token and your Tenant ID.",
    test: { path: "/clients/v1/metrics", message: "Token is valid" },
    examples: "Examples: POST /affiliates/v1 {} (lists affiliates), GET /affiliates/v1/{accountId}, POST /offers/v1/list {}, GET /offers/v1/{id}, "
      + "PUT /conversions/v1/{id}/status {\"status\": \"APPROVED\"}, POST /conversions/v1/update-status-by-external-id {…}, "
      + "GET /billing/v1/open-balances, POST /coupons/v1/list {}.",
  },
];
