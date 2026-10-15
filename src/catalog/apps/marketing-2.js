// More marketing apps (Meta, Klaviyo, ActiveCampaign, Postmark, PostHog, Matomo, SerpApi, DataForSEO) and more AI and web search apps
// (xAI, DeepSeek, Azure OpenAI, AssemblyAI, Deepgram, Brave Search, Tavily, Firecrawl).
import { z } from "zod";
import { USER_AGENT, httpRequest } from "../../http.js";
import { ensureOk } from "../define.js";

const LONG_TIMEOUT = 300_000; // ms: model responses, transcriptions and crawls that can take minutes
const META_VERSION = "v26.0";
const KLAVIYO_REVISION = "2026-07-15";
const models = (list) => ((list || []).length === 1 ? "1 model available" : `${(list || []).length} models available`);
const formatNumber = (n) => Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 2 });
// Drop empty fields so the tool responses stay compact.
const compact = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v != null && v !== "" && !(Array.isArray(v) && !v.length)));

// Meta: posting, viewing insights or moderating on a page requires that page's token. With the header x-conector-page: <id>
// Conector requests it using the system user's token and uses it for that call without it reaching the agent.
async function metaPageToken({ headers: requestHeaders, cred }) {
  const k = Object.keys(requestHeaders).find((x) => x.toLowerCase() === "x-conector-page");
  if (!k) return;
  const page = String(requestHeaders[k]).trim();
  delete requestHeaders[k];
  if (!/^\d{1,30}$/.test(page)) throw new Error("Meta: x-conector-page must be the numeric ID of the page");
  const version = /^v\d+\.\d+$/.test(cred.version || "") ? cred.version : META_VERSION;
  const url = new URL(`https://graph.facebook.com/${version}/${page}`);
  url.searchParams.set("fields", "access_token");
  const d = ensureOk(await httpRequest(url, { headers: { Accept: "application/json", "User-Agent": USER_AGENT,
    Authorization: `Bearer ${cred.token}` } }), "Meta");
  if (!d?.access_token) throw new Error("Meta: the system user does not have that page assigned");
  requestHeaders.Authorization = `Bearer ${d.access_token}`;
}

export default [
  {
    id: "meta", name: "Meta", category: "marketing", description: "Facebook Pages, Instagram and ads (Meta Graph API)",
    website: "https://www.facebook.com/business", docs: "https://developers.facebook.com/docs/graph-api/", logo: { simpleIcons: "meta" },
    baseUrl: "https://graph.facebook.com/{version}",
    auth: [{ type: "bearer" }, { type: "signature", sign: metaPageToken }],
    fields: [{ id: "token", label: "System user token", secret: true },
             { id: "version", label: "Graph API version", default: META_VERSION, optional: true }],
    keyUrl: "https://business.facebook.com/settings/system-users",
    help: "1) At developers.facebook.com create an app of type “Business” linked to your business portfolio and add the use cases "
      + "you will need (pages, Instagram, ads). 2) At business.facebook.com → “Business settings” → “System users” "
      + "→ “Add” (admin role). 3) On that user, “Assign assets”: the app, the pages, the Instagram accounts and the "
      + "ad accounts. 4) “Generate token”: choose the app, expiration “Never” and the permissions (e.g. pages_show_list, "
      + "pages_read_engagement, pages_manage_posts, read_insights, instagram_basic, instagram_manage_insights, "
      + "instagram_content_publish, ads_read, ads_management, business_management). 5) Copy the token. For assets of your own "
      + "portfolio standard access is enough; for client assets, Meta may require app review (advanced access).",
    test: { path: "/me", query: { fields: "id,name" }, account: (d) => d.name },
    examples: "Facebook and Instagram Graph API and Marketing API (ads). Examples: "
      + "GET /me/accounts?fields=id,name,instagram_business_account (pages and their Instagram), "
      + "GET /{page_id}/posts?fields=id,message,created_time,permalink_url&limit=10, "
      + "GET /{ig_user_id}/media?fields=id,caption,media_type,permalink,timestamp,like_count,comments_count, "
      + "GET /{ig_user_id}/insights?metric=reach,views,accounts_engaged&period=day&metric_type=total_value, "
      + "POST /{ig_user_id}/media {\"image_url\": \"…\", \"caption\": \"…\"} and POST /{ig_user_id}/media_publish {\"creation_id\": \"…\"}, "
      + "GET /me/adaccounts?fields=id,name,account_status,currency, "
      + "GET /act_{id}/insights?level=campaign&date_preset=last_30d&fields=campaign_name,spend,impressions,clicks,ctr,actions, "
      + "GET /act_{id}/campaigns?fields=name,status,objective,daily_budget. What requires a page token (posting with "
      + "POST /{page_id}/feed {\"message\": \"…\", \"link\": \"…\"}, GET /{page_id}/insights, comments) is done by adding the "
      + "header x-conector-page: {page_id}; Conector uses the page token without exposing it. Pagination with paging.next.",
  },
  {
    id: "klaviyo", name: "Klaviyo", category: "marketing", description: "Profiles, lists, campaigns, flows and email and SMS metrics",
    website: "https://www.klaviyo.com", docs: "https://developers.klaviyo.com/en/reference/api_overview",
    logo: { favicon: "https://www.klaviyo.com" },
    baseUrl: "https://a.klaviyo.com/api",
    headers: (c) => ({ Accept: "application/vnd.api+json", revision: c.revision || KLAVIYO_REVISION }),
    auth: [{ type: "header", name: "Authorization", prefix: "Klaviyo-API-Key " },
           // The API follows JSON:API: JSON bodies are sent as application/vnd.api+json.
           { type: "signature", sign: ({ headers: requestHeaders }) => {
             if (requestHeaders["Content-Type"] === "application/json") requestHeaders["Content-Type"] = "application/vnd.api+json";
           } }],
    fields: [{ id: "token", label: "Private API key (pk_…)", secret: true, example: "pk_0123456789abcdef0123456789abcdef01" },
             { id: "revision", label: "API revision", default: KLAVIYO_REVISION, optional: true,
               help: "Klaviyo publishes a revision every quarter (YYYY-MM-15) and supports each one for about two years." }],
    // OAuth app created at klaviyo.com/manage-apps: PKCE required, secret via the Basic header and renewable 1-hour access tokens.
    oauth: { scopes: ["accounts:read", "profiles:read", "profiles:write", "lists:read", "lists:write", "segments:read",
                        "campaigns:read", "campaigns:write", "flows:read", "metrics:read", "events:read", "events:write",
                        "tags:read", "templates:read", "subscriptions:read", "subscriptions:write"],
      // As with the key, JSON bodies are sent as application/vnd.api+json (JSON:API).
      apply: (headers, token) => {
        headers.Authorization = `Bearer ${token}`;
        if (headers["Content-Type"] === "application/json") headers["Content-Type"] = "application/vnd.api+json";
      },
      provider: { name: "Klaviyo", key: "klaviyo", redirect: "localhost", clientAuth: "basic",
        authorizeUrl: "https://www.klaviyo.com/oauth/authorize", tokenUrl: "https://a.klaviyo.com/oauth/token",
        help: "1) In Klaviyo, as an owner, admin or manager user, open klaviyo.com/manage-apps and click “Create "
          + "app”. 2) Name it “Conector”, click “Continue” and, in the OAuth settings, paste the redirect URI shown below into “Redirect URLs” "
          + "and the permissions (scopes) listed below into “Scopes” (accounts:read is required). "
          + "3) Save and copy the “Client ID” and the “Client secret” (the secret is shown only once). Access renews itself "
          + "as long as the app stays installed; if Conector goes 90 days without being used, you must authorize again." } },
    keyUrl: "https://www.klaviyo.com/settings/account/api-keys",
    help: "1) In Klaviyo, account menu (bottom left) → “Settings” → “Account” → “API keys” → “Create Private API "
      + "Key”. 2) Name it and choose the access: “Read-only” to query, “Full Access” for everything or “Custom” with read access to "
      + "“Accounts” (used by the connection test) and write access to whatever you will modify (Lists, Profiles, Campaigns…). "
      + "3) Copy the key (pk_…): it is shown only once.",
    test: { path: "/accounts", account: (d) => d.data?.[0]?.attributes?.contact_information?.organization_name },
    examples: "JSON:API; pagination with links.next. Examples: GET /lists?fields[list]=name, GET /lists/{id}/profiles?page[size]=100, "
      + "GET /profiles?filter=equals(email,\"you@example.com\"), POST /profile-import {\"data\": {\"type\": \"profile\", \"attributes\": "
      + "{\"email\": \"…\", \"first_name\": \"…\"}}} (creates or updates), POST /lists/{id}/relationships/profiles {\"data\": "
      + "[{\"type\": \"profile\", \"id\": \"…\"}]}, GET /campaigns?filter=equals(messages.channel,'email') (the channel filter is "
      + "required), GET /flows, GET /metrics, POST /campaign-values-reports {\"data\": {\"type\": \"campaign-values-report\", "
      + "\"attributes\": {\"statistics\": [\"opens\", \"clicks\", \"conversion_value\"], \"timeframe\": {\"key\": \"last_30_days\"}, "
      + "\"conversion_metric_id\": \"…\"}}} (the ID of “Placed Order” comes from GET /metrics), POST /events.",
  },
  {
    id: "activecampaign", name: "ActiveCampaign", category: "marketing",
    description: "Contacts, lists, tags, campaigns, automations and deals",
    website: "https://www.activecampaign.com", docs: "https://developers.activecampaign.com/reference/overview",
    logo: { favicon: "https://www.activecampaign.com" },
    baseUrl: "{url}/api/3", derived: { url: (c) => String(c.url || "").trim().replace(/\/api\/3\/?$/i, "") },
    auth: { type: "header", name: "Api-Token" },
    fields: [{ id: "url", label: "API URL", format: "url", example: "https://example.api-us1.com",
               help: "The one in “Settings” → “Developer”, e.g. https://example.api-us1.com (without /api/3)." },
             { id: "token", label: "API key", secret: true }],
    help: "1) In ActiveCampaign: “Settings” (bottom left) → “Developer”. 2) Copy the “URL” and the “Key” under “API Access”. "
      + "Each user has their own key, with that user's permissions: if the user is deleted, the key stops working.",
    test: { path: "/users/me", account: (d) => d.user?.email || d.user?.username },
    examples: "Examples: GET /contacts?email=…, GET /contacts?search=…&limit=20, POST /contact/sync {\"contact\": {\"email\": \"…\", "
      + "\"firstName\": \"…\"}} (creates or updates), POST /contactLists {\"contactList\": {\"list\": 1, \"contact\": 123, \"status\": 1}} "
      + "(subscribe to a list), POST /contactTags {\"contactTag\": {\"contact\": 123, \"tag\": 4}}, GET /lists, GET /tags?search=…, "
      + "GET /campaigns?orders[sdate]=DESC&limit=10, GET /automations, GET /deals?filters[stage]=…. "
      + "Pagination with limit (max. 100) and offset.",
  },
  {
    id: "postmark", name: "Postmark", category: "marketing", description: "Transactional email: sends, templates, bounces and statistics",
    website: "https://postmarkapp.com", docs: "https://postmarkapp.com/developer", logo: { favicon: "https://postmarkapp.com" },
    baseUrl: "https://api.postmarkapp.com",
    auth: [{ type: "header", name: "X-Postmark-Server-Token" },
           { type: "header", name: "X-Postmark-Account-Token", field: "account_token" }],
    fields: [{ id: "token", label: "Server token (Server API token)", secret: true },
             { id: "account_token", label: "Account token (Account API token)", secret: true, optional: true,
               help: "Only to manage servers, domains and senders." }],
    keyUrl: "https://account.postmarkapp.com/servers",
    help: "1) At account.postmarkapp.com → “Servers” → choose the server → “API Tokens” tab and copy a “Server API token”. "
      + "2) Optional: to manage servers, domains and senders, also copy the “Account API token” (“API Tokens” tab of "
      + "the account; owners and administrators only). Mail can only be sent from verified senders or domains and, until Postmark "
      + "approves the account, only to addresses on your own domain.",
    test: { path: "/server", account: (d) => d.Name },
    examples: "Examples: POST /email {\"From\": \"Your Company <you@example.com>\", \"To\": \"…\", \"Subject\": \"…\", \"HtmlBody\": \"…\", "
      + "\"MessageStream\": \"outbound\"}, POST /email/batch [{…}], POST /email/withTemplate {\"TemplateAlias\": \"…\", "
      + "\"TemplateModel\": {…}, \"From\": \"…\", \"To\": \"…\"}, GET /messages/outbound?count=50&offset=0, "
      + "GET /messages/outbound/{id}/details, GET /bounces?count=50&offset=0, GET /stats/outbound?fromdate=2026-10-01, "
      + "GET /templates?count=50&offset=0, GET /message-streams. With the account token: GET /servers?count=50&offset=0, "
      + "GET /domains?count=50&offset=0, GET /senders?count=50&offset=0.",
    tools: [
      { name: "postmark_send_email", title: "Postmark: send an email", annotations: { destructiveHint: true, openWorldHint: true },
        description: "Send a transactional email from a sender or domain verified in Postmark. Returns the message ID.",
        schema: { from: z.string().describe("Verified sender, e.g. Your Company <you@example.com>"),
                   to: z.string().describe("Recipients separated by commas (max. 50)"),
                   subject: z.string().min(1), html: z.string().optional().describe("HTML body"),
                   text: z.string().optional().describe("Plain-text body (set html, text or both)"),
                   cc: z.string().optional(), bcc: z.string().optional(),
                   reply_to: z.string().optional().describe("Reply-To address"),
                   tag: z.string().optional().describe("Tag to group statistics"),
                   stream: z.string().default("outbound").describe("Transactional message stream (outbound by default)") },
        async run({ from, to, subject, html, text, cc, bcc, reply_to, tag, stream }, p) {
          if (!html && !text) throw new Error("Provide the email body as html or text");
          const d = ensureOk(await p({ method: "POST", path: "/email", body: { From: from, To: to, Cc: cc, Bcc: bcc, Subject: subject,
            HtmlBody: html, TextBody: text, ReplyTo: reply_to, Tag: tag, MessageStream: stream } }), "Postmark");
          return { sent: true, id: d.MessageID, to: d.To, date: d.SubmittedAt };
        } },
    ],
  },
  {
    id: "posthog", name: "PostHog", category: "marketing", description: "Product analytics: events, queries, insights and flags",
    website: "https://posthog.com", docs: "https://posthog.com/docs/api", logo: { simpleIcons: "posthog" },
    baseUrl: "https://{server}",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "Personal API key (phx_…)", secret: true },
             { id: "server", label: "Region", default: "us.posthog.com",
               options: [["us.posthog.com", "US (us.posthog.com)"], ["eu.posthog.com", "EU (eu.posthog.com)"]] }],
    help: "1) In PostHog: your account menu → “Settings” → “User” → “Personal API keys” → “Create personal API key”. 2) Give it a "
      + "name, choose the scope (the whole organization or some projects) and the permissions: read access to “User” (used by the "
      + "connection test) and “Query” (HogQL queries), plus whatever you will use (Insight, Dashboard, Feature flag, Person…), or “All "
      + "access”. 3) Copy the key (phx_…): it is shown only once. The “Project API key” (phc_…) does not work: it can only send events.",
    test: { path: "/api/users/@me/", account: (d) => d.email },
    examples: "{project_id} is the numeric project ID (or @current, the user's active one); paths end in /. Examples: "
      + "GET /api/users/@me/ (organization and active project in team.id), POST /api/projects/{project_id}/query/ {\"query\": "
      + "{\"kind\": \"HogQLQuery\", \"query\": \"SELECT event, count() FROM events WHERE timestamp > now() - INTERVAL 7 DAY GROUP BY "
      + "event ORDER BY count() DESC LIMIT 20\"}}, GET /api/projects/{project_id}/insights/?limit=20, "
      + "GET /api/projects/{project_id}/dashboards/, GET /api/projects/{project_id}/feature_flags/, "
      + "GET /api/projects/{project_id}/persons/?search=…, GET /api/projects/{project_id}/session_recordings/?limit=10.",
  },
  {
    id: "matomo", name: "Matomo", category: "marketing", description: "Web analytics: visits, pages, sources, goals and campaigns",
    website: "https://matomo.org", docs: "https://developer.matomo.org/api-reference/reporting-api", logo: { simpleIcons: "matomo" },
    baseUrl: "{url}", derived: { url: (c) => String(c.url || "").trim().replace(/\/index\.php$/i, "") },
    // Matomo 5 creates “secure requests only” tokens by default, which are only valid in the body of a POST: if the request has
    // a form body, token_auth goes in it; otherwise in the URL (works with tokens without that restriction).
    auth: { type: "signature", sign: ({ url, body: requestBody, cred }) => {
      if (requestBody instanceof URLSearchParams) requestBody.set("token_auth", cred.token);
      else url.searchParams.set("token_auth", cred.token);
    } },
    fields: [{ id: "url", label: "Matomo URL", format: "url", example: "https://example.matomo.cloud",
               help: "The one of your installation (e.g. https://analytics.example.com) or of Matomo Cloud, without /index.php." },
             { id: "token", label: "Authentication token (token_auth)", secret: true }],
    help: "1) In Matomo: gear icon (“Administration”) → “Personal” → “Security” → “Create new token” (at the bottom of the page), "
      + "confirm your password and add a description. 2) Copy the token: it is shown only once. The user needs read "
      + "access to the sites you will query. “Secure requests only” tokens also work: Conector sends the token "
      + "in the body of POST requests.",
    test: { method: "POST", path: "/index.php", form: { module: "API", method: "API.getMatomoVersion", format: "json" },
              validate: (d) => {
                if (d?.result === "error") throw new Error(`Matomo: ${d.message}`);
                if (!d?.value) throw new Error("The response is not from Matomo: check the URL (without /index.php)");
              },
              message: (d) => `Matomo ${d.value}` },
    examples: "Use POST /index.php with form data (Conector adds the token): {\"module\": \"API\", \"format\": \"json\", "
      + "\"method\": \"…\", …}. Methods: SitesManager.getSitesWithAtLeastViewAccess, VisitsSummary.get (idSite, period=day|week|"
      + "month|year|range, date=today|yesterday|last30|2026-10-01,2026-10-15), Actions.getPageUrls (flat=1, filter_limit=20), "
      + "Referrers.getWebsites, Referrers.getSearchEngines, Referrers.getCampaigns, Goals.get, UserCountry.getCountry, "
      + "DevicesDetection.getType, Live.getLastVisitsDetails (filter_limit=10). Errors arrive with status 200 as "
      + "{\"result\": \"error\", \"message\": \"…\"}.",
  },
  {
    id: "serpapi", name: "SerpApi", category: "marketing", description: "Results from Google, Maps, Trends, News and other search engines",
    website: "https://serpapi.com", docs: "https://serpapi.com/search-api", logo: { favicon: "https://serpapi.com" },
    baseUrl: "https://serpapi.com",
    auth: { type: "query", name: "api_key" },
    fields: [{ id: "token", label: "Private API key", secret: true }],
    keyUrl: "https://serpapi.com/manage-api-key",
    help: "1) Create an account at serpapi.com (the free plan includes a small monthly search quota). 2) At "
      + "serpapi.com/manage-api-key copy the “Private API Key”. Each search uses one from the plan; checking the balance or the "
      + "locations is free.",
    test: { path: "/account.json",
              message: (d) => `Plan ${d?.plan_name || "?"}: ${formatNumber(d?.total_searches_left)} searches left` },
    examples: "All searches are GET /search.json with engine and its parameters; each one uses 1 search (repeating it within "
      + "1 h is free). Examples: GET /search.json?engine=google&q=…&gl=es&hl=es&google_domain=google.es, "
      + "engine=google_maps&type=search&q=…&ll=@40.4168,-3.7038,14z (local listings), engine=google_trends&q=…&geo=ES&date=today "
      + "12-m, engine=google_news&q=…&gl=es&hl=es, engine=google_ads_transparency_center&text=example.com, "
      + "engine=youtube&search_query=…, engine=bing&q=…. Free: GET /account.json (remaining searches), "
      + "GET /locations.json?q=Austin&limit=5 (location values). For Google organic results, serpapi_search.",
    tools: [
      { name: "serpapi_search", title: "SerpApi: Google results", annotations: { readOnlyHint: true, openWorldHint: true },
        description: "Results of a Google search (google.es in Spanish by default): organic results with position, title, URL and "
          + "snippet, plus the featured answer, the local pack, the ads and the related questions when present. Uses 1 "
          + "search from the plan (repeating it within 1 h is free).",
        schema: { query: z.string().min(1).describe("What to search for, exactly as in Google (supports site:, intitle:…)"),
                   country: z.string().default("us").describe("Google country (gl): us, gb, de, es…"),
                   language: z.string().default("en").describe("Interface language (hl): en, es, de…"),
                   domain: z.string().default("google.es").describe("Google domain: google.es, google.com.mx…"),
                   location: z.string().optional().describe("Exact location, e.g. “Austin, Texas, United States”"),
                   device: z.enum(["desktop", "mobile", "tablet"]).default("desktop"),
                   offset: z.number().int().min(0).default(0).describe("Offset for pagination: 10 = second page") },
        async run({ query, country, language, domain, location, device, offset }, p) {
          const d = ensureOk(await p({ path: "/search.json", query: { engine: "google", q: query, gl: country, hl: language,
            google_domain: domain, location: location, device: device, start: offset || undefined } }), "SerpApi");
          const box = d.answer_box;
          return compact({
            total: d.search_information?.total_results, warning: d.error,
            featured: box && compact({ title: box.title, answer: box.answer || box.snippet, url: box.link }),
            ads: (d.ads || []).map((a) => compact({ position: a.position, title: a.title, url: a.link })),
            local: (d.local_results?.places || []).map((l) => compact({ position: l.position, name: l.title, rating: l.rating,
              reviews: l.reviews, address: l.address })),
            results: (d.organic_results || []).map((r) => compact({ position: r.position, title: r.title, url: r.link,
              snippet: r.snippet })),
            questions: (d.related_questions || []).map((q) => q.question),
          });
        } },
    ],
  },
  {
    id: "dataforseo", name: "DataForSEO", category: "marketing", description: "SERP, search volumes, keywords and backlinks",
    website: "https://dataforseo.com", docs: "https://docs.dataforseo.com/v3/", logo: { favicon: "https://dataforseo.com" },
    baseUrl: "https://api.dataforseo.com/v3",
    auth: { type: "basic", usernameField: "login", passwordField: "password" },
    fields: [{ id: "login", label: "API login (your email)" },
             { id: "password", label: "API password", secret: true, help: "It is not the account password." }],
    keyUrl: "https://app.dataforseo.com/api-access",
    help: "1) Sign up at app.dataforseo.com (new accounts come with a small trial balance). 2) Under “API Access” "
      + "(app.dataforseo.com/api-access) copy the “API login” and the “API password”, which is not the account password. It is "
      + "prepaid: each task is charged depending on the endpoint (“live” ones cost more) and the backlinks API requires a separate monthly subscription.",
    test: { path: "/appendix/user_data",
              validate: (d) => {
                if (d?.status_code !== 20000) throw new Error(`DataForSEO: ${d?.status_message || "unexpected response"}`);
              },
              account: (d) => d.tasks?.[0]?.result?.[0]?.login },
    examples: "POST requests carry an array of tasks and the results come in tasks[].result[] (Spain: location_code 2724, "
      + "language_code es). Examples: POST /serp/google/organic/live/advanced [{\"keyword\": \"…\", \"location_code\": 2724, "
      + "\"language_code\": \"es\", \"depth\": 10}], POST /keywords_data/google_ads/search_volume/live [{\"keywords\": [\"…\"], "
      + "\"location_code\": 2724, \"language_code\": \"es\"}], POST /dataforseo_labs/google/ranked_keywords/live [{\"target\": "
      + "\"example.com\", \"location_code\": 2724, \"language_code\": \"es\", \"limit\": 50}], POST /dataforseo_labs/google/keyword_ideas/live, "
      + "POST /dataforseo_labs/google/competitors_domain/live, POST /backlinks/summary/live [{\"target\": \"example.com\"}], "
      + "POST /on_page/instant_pages [{\"url\": \"…\"}], GET /appendix/user_data (balance). Each task has a cost: limit the results.",
  },
  {
    id: "xai", name: "xAI (Grok)", category: "ai", description: "Grok models: text, web and X search, and images",
    website: "https://x.ai", docs: "https://docs.x.ai/developers/rest-api-reference", logo: { favicon: "https://x.ai" },
    baseUrl: "https://api.x.ai/v1", timeout: LONG_TIMEOUT,
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key (xai-…)", secret: true }],
    keyUrl: "https://console.x.ai/team/default/api-keys",
    help: "1) At console.x.ai → “API Keys” → “Create API Key”: name it and, optionally, restrict the endpoints and models. 2) Copy "
      + "the key (xai-…): it is shown only once. It is prepaid: buy credits under “Billing”.",
    test: { path: "/api-key",
              validate: (d) => {
                if (d?.api_key_blocked || d?.api_key_disabled) throw new Error("xAI: the key is blocked or disabled");
                if (d?.team_blocked) throw new Error("xAI: the team is blocked (check credits and billing)");
              },
              message: (d) => `Key “${d?.name || "?"}” is valid` },
    examples: "Examples: POST /responses {\"model\": \"…\", \"input\": \"…\"} (with \"tools\": [{\"type\": \"web_search\"}, "
      + "{\"type\": \"x_search\"}] it searches the web and X), POST /chat/completions {\"model\": \"…\", \"messages\": […]}, "
      + "POST /images/generations {\"model\": \"…\", \"prompt\": \"…\"} (returns URLs), GET /models (names), "
      + "GET /language-models (prices and context), GET /api-key (key details).",
  },
  {
    id: "deepseek", name: "DeepSeek", category: "ai", description: "DeepSeek chat and reasoning models (OpenAI format)",
    website: "https://www.deepseek.com", docs: "https://api-docs.deepseek.com", logo: { simpleIcons: "deepseek" },
    baseUrl: "https://api.deepseek.com", timeout: LONG_TIMEOUT,
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key (sk-…)", secret: true }],
    keyUrl: "https://platform.deepseek.com/api_keys",
    help: "1) At platform.deepseek.com → “API keys” → “Create new API key”. 2) Copy the key (sk-…): it is shown only once. It is "
      + "prepaid: add balance under “Top up”. Its servers are in China: consider data protection rules (e.g. GDPR) before sending it personal data.",
    test: { path: "/user/balance", message: (d) => {
      const b = d?.balance_infos?.[0];
      return b ? `Balance: ${b.total_balance} ${b.currency}${d.is_available ? "" : " (insufficient to use the API)"}` : "Key is valid";
    } },
    examples: "OpenAI-compatible format. Examples: POST /chat/completions {\"model\": \"deepseek-chat\", \"messages\": […]} "
      + "(deepseek-reasoner for reasoning; names in GET /models), GET /models, GET /user/balance (balance).",
  },
  {
    id: "azureopenai", name: "Azure OpenAI", category: "ai", description: "OpenAI and other models deployed on Microsoft Foundry",
    website: "https://ai.azure.com", docs: "https://learn.microsoft.com/azure/foundry/openai/api-version-lifecycle",
    logo: { favicon: "https://ai.azure.com" },
    baseUrl: "https://{resource}.openai.azure.com/openai/v1", timeout: LONG_TIMEOUT,
    allowedOrigins: ["https://{resource}.services.ai.azure.com", "https://{resource}.cognitiveservices.azure.com"],
    auth: { type: "header", name: "api-key" },
    fields: [{ id: "resource", label: "Resource name", format: "subdomain",
               help: "The part before .openai.azure.com in the resource endpoint." },
             { id: "token", label: "Resource key (KEY 1 or KEY 2)", secret: true }],
    help: "1) At portal.azure.com create a Microsoft Foundry or Azure OpenAI resource (or use an existing one), in an EU region "
      + "(e.g. Sweden Central) if the data must stay in Europe. 2) At ai.azure.com deploy the models you will use and "
      + "note the name of each deployment. 3) In the Azure portal → resource → “Keys and Endpoint” copy “KEY 1” "
      + "and the resource name. It does not work if key authentication is disabled on the resource. Billing goes to the subscription.",
    test: { path: "/models", message: (d) => models(d?.data) },
    examples: "API v1 (no api-version). “model” takes the name of your deployment, not of the model. Examples: POST /responses "
      + "{\"model\": \"my-gpt\", \"input\": \"…\"}, POST /chat/completions {\"model\": \"my-gpt\", \"messages\": […]}, "
      + "POST /embeddings {\"model\": \"my-embeddings\", \"input\": [\"…\"]}, GET /models (models available in the resource), "
      + "GET /files, GET /batches. Models from other providers deployed on Foundry (DeepSeek, Grok…) go through /chat/completions.",
  },
  {
    id: "assemblyai", name: "AssemblyAI", category: "ai", description: "Audio and video transcription with speakers and subtitles",
    website: "https://www.assemblyai.com", docs: "https://www.assemblyai.com/docs",
    logo: { favicon: "https://www.assemblyai.com" },
    baseUrl: "https://{server}", timeout: LONG_TIMEOUT,
    auth: { type: "header", name: "Authorization" },
    fields: [{ id: "token", label: "API key", secret: true },
             { id: "server", label: "Region", default: "api.assemblyai.com",
               options: [["api.assemblyai.com", "US"], ["api.eu.assemblyai.com", "EU (Dublin)"]],
               help: "In the EU region, audio and transcripts are processed and stored in Europe." }],
    keyUrl: "https://www.assemblyai.com/dashboard/api-keys",
    help: "1) At assemblyai.com/dashboard → “API Keys” copy the key (or create another). 2) Choose the region: the EU one keeps the "
      + "data in Europe. New accounts come with free credit; after that you pay per hour of audio.",
    test: { path: "/v2/transcript", query: { limit: 1 }, message: "API key is valid" },
    examples: "Examples: POST /v2/transcript {\"audio_url\": \"https://…\", \"language_code\": \"es\", \"speaker_labels\": true} (or "
      + "\"language_detection\": true), GET /v2/transcript/{id} (status queued, processing, completed or error; the text in text and "
      + "the turns in utterances), GET /v2/transcript/{id}/sentences, GET /v2/transcript/{id}/srt (subtitles), "
      + "GET /v2/transcript?limit=10, DELETE /v2/transcript/{id}. Local files: POST /v2/upload with the audio as body_base64 "
      + "(returns upload_url, which is used as audio_url).",
  },
  {
    id: "deepgram", name: "Deepgram", category: "ai", description: "Fast speech-to-text transcription with speakers and formatting",
    website: "https://deepgram.com", docs: "https://developers.deepgram.com/reference/deepgram-api-overview",
    logo: { simpleIcons: "deepgram" },
    baseUrl: "https://api.deepgram.com/v1", allowedOrigins: ["https://api.eu.deepgram.com"], timeout: LONG_TIMEOUT,
    auth: { type: "header", name: "Authorization", prefix: "Token " },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) At console.deepgram.com choose the project → “API Keys” → “Create a New API Key”: name, role (“Member” is enough) and "
      + "expiration. 2) Copy the key: it is shown only once. New accounts come with free credit; after that it is pay-as-you-go.",
    test: { path: "/projects", message: (d) => `${(d?.projects || []).length} projects: `
      + `${(d?.projects || []).map((x) => x.name).join(", ")}` },
    examples: "Examples: POST /listen?model=nova-3&language=es&smart_format=true&diarize=true&utterances=true {\"url\": \"https://…\"} "
      + "(language=multi for several languages), POST /listen?… with the audio as body_base64 and content_type audio/mpeg, "
      + "GET /projects, GET /projects/{project_id}/balances, GET /projects/{project_id}/usage?start=2026-10-01&end=2026-10-15, "
      + "GET /projects/{project_id}/requests?limit=10, GET /models. To process in the EU use the full URL "
      + "https://api.eu.deepgram.com/v1/listen?….",
  },
  {
    id: "brave", name: "Brave Search", category: "ai", description: "Web, news, image and video search with its own index",
    website: "https://brave.com/search/api/", docs: "https://api-dashboard.search.brave.com/app/documentation/web-search/get-started",
    logo: { simpleIcons: "brave" },
    baseUrl: "https://api.search.brave.com/res/v1",
    auth: { type: "header", name: "X-Subscription-Token" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://api-dashboard.search.brave.com/app/keys",
    help: "1) At api-dashboard.search.brave.com create an account and subscribe to a search plan (a card is required). 2) “API Keys” → "
      + "“Add API key” and copy it. Brave has no free account query: the connection test runs a search for 1 "
      + "result, which counts as one query of the plan.",
    test: { path: "/web/search", query: { q: "conector", count: 1 }, message: "Key is valid (the test uses 1 query)" },
    examples: "Examples: GET /web/search?q=…&country=ES&search_lang=es&count=10 (freshness=pd|pw|pm|py for recent results), "
      + "GET /news/search?q=…&country=ES&search_lang=es, GET /images/search?q=…, GET /videos/search?q=…. Depending on the plan, also "
      + "GET /suggest/search?q=… and GET /spellcheck/search?q=…. Each call counts as one query.",
    tools: [
      { name: "brave_search", title: "Brave Search: search the web", annotations: { readOnlyHint: true, openWorldHint: true },
        description: "Search the web with Brave's own index and return summarized results (title, URL, description and "
          + "age) and, if there are any, news. Each call counts as one query of the plan.",
        schema: { query: z.string().min(1).max(400), count: z.number().int().min(1).max(20).default(10),
                   country: z.string().default("ES").describe("Country of the results (ES, MX, US…) or ALL"),
                   language: z.string().default("en").describe("Language of the results: en, es, de…"),
                   recent: z.enum(["pd", "pw", "pm", "py"]).optional()
                     .describe("Only from the last 24 h (pd), week (pw), month (pm) or year (py)"),
                   page: z.number().int().min(0).max(9).default(0).describe("Results page (0 = first)") },
        async run({ query, count, country, language, recent, page }, p) {
          const d = ensureOk(await p({ path: "/web/search", query: { q: query, count: count, country: country, search_lang: language,
            freshness: recent, offset: page || undefined, text_decorations: false } }), "Brave Search");
          const summarize = (r) => compact({ title: r.title, url: r.url, description: r.description, age: r.age });
          return compact({ results: (d.web?.results || []).map(summarize), news: (d.news?.results || []).map(summarize) });
        } },
    ],
  },
  {
    id: "tavily", name: "Tavily", category: "ai", description: "Web search for AI agents, page extraction and crawling",
    website: "https://www.tavily.com", docs: "https://docs.tavily.com/documentation/api-reference/introduction",
    logo: { favicon: "https://www.tavily.com" },
    baseUrl: "https://api.tavily.com", timeout: LONG_TIMEOUT,
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key (tvly-…)", secret: true }],
    keyUrl: "https://app.tavily.com/home",
    help: "1) Create an account at app.tavily.com: the free plan includes 1000 credits per month, no card required. 2) Under “API Keys” copy "
      + "the key (tvly-…) or create another. A basic search uses 1 credit and an advanced one, 2.",
    test: { path: "/usage", message: (d) => (d?.account ? `Plan ${d.account.current_plan || "?"}: ${formatNumber(d.account.plan_usage)} `
      + `of ${formatNumber(d.account.plan_limit)} credits used` : "API key is valid") },
    examples: "Examples: POST /search {\"query\": \"…\", \"search_depth\": \"basic\", \"max_results\": 5, \"include_answer\": true} "
      + "(or tavily_search), POST /extract {\"urls\": [\"https://…\"], \"format\": \"markdown\"} (page content), "
      + "POST /map {\"url\": \"https://…\"} (URLs of a site), POST /crawl {\"url\": \"https://…\", \"limit\": 20, \"instructions\": "
      + "\"…\"}, GET /usage (credits used).",
    tools: [
      { name: "tavily_search", title: "Tavily: search the web", annotations: { readOnlyHint: true, openWorldHint: true },
        description: "Search the web and return a summarized answer and the most relevant results (title, URL, excerpt and "
          + "score). Uses 1 credit (2 at advanced depth).",
        schema: { query: z.string().min(1).max(400),
                   depth: z.enum(["basic", "advanced"]).default("basic").describe("advanced: more precise results, 2 credits"),
                   max: z.number().int().min(1).max(20).default(5), topic: z.enum(["general", "news", "finance"]).default("general"),
                   period: z.enum(["day", "week", "month", "year"]).optional().describe("Only results from this period"),
                   answer: z.boolean().default(true).describe("Include a summarized answer generated by Tavily"),
                   domains: z.array(z.string()).optional().describe("Search only these domains"),
                   exclude: z.array(z.string()).optional().describe("Domains to exclude"),
                   country: z.string().optional().describe("Prioritize a country, in English and lowercase (spain, mexico…); general topic only") },
        async run({ query, depth, max, topic, period, answer, domains, exclude, country }, p) {
          const d = ensureOk(await p({ method: "POST", path: "/search", body: { query: query, search_depth: depth,
            max_results: max, topic: topic, time_range: period, include_answer: answer, include_domains: domains,
            exclude_domains: exclude, country: country } }), "Tavily");
          return compact({ answer: d.answer, results: (d.results || []).map((r) => compact({ title: r.title, url: r.url,
            excerpt: r.content, date: r.published_date, score: r.score })) });
        } },
    ],
  },
  {
    id: "firecrawl", name: "Firecrawl", category: "ai", description: "Websites to Markdown: extraction, crawling, mapping and search",
    website: "https://www.firecrawl.dev", docs: "https://docs.firecrawl.dev/api-reference/v2-introduction",
    logo: { favicon: "https://www.firecrawl.dev" },
    baseUrl: "https://api.firecrawl.dev/v2", timeout: LONG_TIMEOUT,
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key (fc-…)", secret: true }],
    keyUrl: "https://www.firecrawl.dev/app/api-keys",
    help: "1) Create an account at firecrawl.dev (the free plan comes with credits to try it). 2) At firecrawl.dev/app/api-keys copy "
      + "the key (fc-…). Each extracted page uses 1 credit (more with options such as the advanced proxy or AI extraction).",
    test: { path: "/team/credit-usage", message: (d) => {
      const c = d?.data?.remainingCredits ?? d?.data?.remaining_credits;
      return c == null ? "API key is valid" : `${formatNumber(c)} credits available`;
    } },
    examples: "Examples: POST /scrape {\"url\": \"…\", \"formats\": [\"markdown\"]} (or firecrawl_scrape), POST /search {\"query\": "
      + "\"…\", \"limit\": 5} (web search; with \"scrapeOptions\": {\"formats\": [\"markdown\"]} it also returns the content), "
      + "POST /map {\"url\": \"…\"} (URLs of a site), POST /crawl {\"url\": \"…\", \"limit\": 20} and GET /crawl/{id} (result), "
      + "POST /batch/scrape {\"urls\": […]}, POST /extract {\"urls\": [\"…\"], \"prompt\": \"…\"} and GET /extract/{id}, "
      + "GET /team/credit-usage. Each page uses credits: limit the crawl with limit.",
    tools: [
      { name: "firecrawl_scrape", title: "Firecrawl: scrape a page as Markdown", annotations: { readOnlyHint: true, openWorldHint: true },
        description: "Download a web page (including ones that load with JavaScript) and return its content as Markdown, with the "
          + "title and the HTTP status code. Uses 1 credit.",
        schema: { url: z.string().url().describe("Page address"),
                   only_main_content: z.boolean().default(true).describe("Remove header, menus and footer"),
                   wait_ms: z.number().int().min(0).max(30000).optional()
                     .describe("Wait before scraping, for pages that load content late"),
                   mobile: z.boolean().default(false).describe("Scrape the mobile version"),
                   max_characters: z.number().int().min(1000).max(40000).default(30000) },
        async run({ url, only_main_content, wait_ms, mobile, max_characters }, p) {
          const d = ensureOk(await p({ method: "POST", path: "/scrape", body: { url, formats: ["markdown"],
            onlyMainContent: only_main_content, waitFor: wait_ms, mobile: mobile } }), "Firecrawl");
          const m = d?.data?.metadata || {};
          const text = d?.data?.markdown || "";
          return compact({ url: m.url || m.sourceURL || url, title: m.title, status: m.statusCode,
            markdown: text.slice(0, max_characters),
            truncated: text.length > max_characters ? `Showing ${max_characters} of ${text.length} characters` : null });
        } },
    ],
  },
];
