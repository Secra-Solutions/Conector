// More marketing (X, Kit, MailerLite, Mailjet, SparkPost, Plausible, Mixpanel, Similarweb) and more AI, web search and extraction
// (Together AI, Fireworks, Runway, Ideogram, Black Forest Labs, Exa, Apify, Jina AI).
// Generated images and videos arrive as temporary URLs: their tools download them and save them in downloads/.
import { z } from "zod";
import { USER_AGENT, saveDownload, httpRequest } from "../../http.js";
import { ensureOk } from "../define.js";

const LONG_TIMEOUT = 300_000; // ms: responses from models, generations and runs that can take minutes
const RUNWAY_VERSION = "2024-11-06";
const models = (list) => ((list || []).length === 1 ? "1 model available" : `${(list || []).length} models available`);
const formatNumber = (n) => Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 2 });
// Drops empty fields so tool responses stay compact.
const compact = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v != null && v !== "" && !(Array.isArray(v) && !v.length)));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const EXTENSIONS = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif", "video/mp4": "mp4",
  "video/webm": "webm", "video/quicktime": "mov", "audio/mpeg": "mp3", "audio/wav": "wav", "application/zip": "zip" };

// Generated result (image, video…): temporary, signed URL from the service itself, downloaded WITHOUT the key and saved in
// downloads/. https only, and never local addresses or bare IPs.
async function saveResult(url, name, service) {
  let u;
  try {
    u = new URL(url);
  } catch {
    throw new Error(`${service}: the result URL is not valid`);
  }
  if (u.protocol !== "https:" || u.username || u.password || /^(localhost|[\d.]+|\[.*\])$/i.test(u.hostname)) {
    throw new Error(`${service}: result URL not allowed (${u.hostname})`);
  }
  const r = await httpRequest(u, { headers: { "User-Agent": USER_AGENT, Accept: "*/*" }, timeout: 180_000 });
  if (!r.ok || !r.data?.base64) throw new Error(`${service}: could not download the result (HTTP ${r.status})`);
  const type = String(r.data.contentType || "").split(";")[0].trim().toLowerCase();
  const ext = EXTENSIONS[type] || /\.([a-z0-9]{2,4})$/i.exec(u.pathname)?.[1]?.toLowerCase() || "bin";
  return saveDownload(`${name}.${ext}`, Buffer.from(r.data.base64, "base64"));
}

// https URLs inside a result (e.g. FLUX's result.sample), without duplicates.
function urlsIn(value, collected = new Set()) {
  if (typeof value === "string" && /^https:\/\//.test(value)) collected.add(value);
  else if (value && typeof value === "object") for (const v of Object.values(value)) urlsIn(v, collected);
  return [...collected];
}

// FLUX: the task is polled at the polling_url returned by the submission (it can be another *.bfl.ai cluster) until it finishes.
const BFL_IN_PROGRESS = ["Pending", "Reasoning", "Generating"];
async function waitForBfl(p, { id, polling_url: url }, seconds) {
  const end = Date.now() + seconds * 1000;
  for (;;) {
    const d = ensureOk(await p({ path: url || "/get_result", query: url ? undefined : { id } }), "Black Forest Labs");
    if (!BFL_IN_PROGRESS.includes(d?.status) || Date.now() >= end) return d;
    await sleep(1500);
  }
}
const bflReason = (d) => (/Moderated/.test(d?.status || "") ? "blocked by content moderation"
  : `${d?.status || "unknown status"}${d?.details ? ` (${JSON.stringify(d.details).slice(0, 200)})` : ""}`);

export default [
  {
    id: "twitter", name: "X (Twitter)", category: "marketing", description: "Publish posts and read profiles, mentions and searches on X",
    website: "https://x.com", docs: "https://docs.x.com/x-api/introduction", logo: { simpleIcons: "x" },
    baseUrl: "https://api.x.com/2",
    auth: { type: "oauth", scopes: ["tweet.read", "tweet.write", "users.read", "media.write", "offline.access"], provider: {
      name: "X", authorizeUrl: "https://x.com/i/oauth2/authorize", tokenUrl: "https://api.x.com/2/oauth2/token", clientAuth: "basic",
      help: "1) At console.x.com create an app (or open yours) and, under “User authentication settings”, set up OAuth 2.0: permissions "
        + "“Read and write”, type “Web App, Automated App or Bot”, the redirect URI shown below as “Callback URI” (X requires "
        + "127.0.0.1, not localhost) and your company's website as “Website URL”. 2) Under “Keys and tokens” copy the “OAuth 2.0 Client ID” and "
        + "the “Client Secret”. 3) Click “Continue with X” and sign in with the X account that will publish. The X API is pay-as-you-go: "
        + "buy credits in the console (about 0.005 USD per post read, 0.01 USD per profile and 0.015 USD per post published, rising "
        + "to 0.20 USD if the post contains a link). The connection test reads your own profile: a user read that X charges at "
        + "most once a day.",
    } },
    test: { path: "/users/me", account: (d) => (d.data?.username ? `@${d.data.username}` : null) },
    examples: "Examples: GET /users/me (your id and @username), GET /users/by/username/{username}?user.fields=description,public_metrics, "
      + "GET /users/{id}/tweets?max_results=10&tweet.fields=created_at,public_metrics (your own posts and mentions are charged as "
      + "owned reads, which are cheaper), GET /users/{id}/mentions?max_results=10&tweet.fields=created_at,author_id, "
      + "GET /tweets/search/recent?query=coffee -is:retweet lang:en&max_results=10&tweet.fields=created_at,author_id,public_metrics "
      + "(last 7 days), GET /tweets/{id}?tweet.fields=created_at,public_metrics, POST /tweets {\"text\": \"…\"} (or twitter_publish; "
      + "replies with \"reply\": {\"in_reply_to_tweet_id\": \"…\"}), DELETE /tweets/{id}, POST /media/upload {\"media\": \"<base64>\", "
      + "\"media_category\": \"tweet_image\"} (returns data.id, which is used in \"media\": {\"media_ids\": [\"…\"]}). Pagination with "
      + "pagination_token=meta.next_token. Each post or profile read and each post published uses credits.",
    tools: [
      { name: "twitter_publish", title: "X: publish a post", annotations: { destructiveHint: true, openWorldHint: true },
        description: "Publish a post on X with the connected account; also replies and quotes. Returns its id and link. Each "
          + "post is charged: 0.015 USD, or 0.20 USD if the text contains a link.",
        schema: { text: z.string().min(1).describe("Post text (up to 280 characters, except Premium accounts)"),
                   reply_to: z.string().regex(/^\d+$/).optional().describe("ID of the post being replied to"),
                   quote: z.string().regex(/^\d+$/).optional().describe("ID of the post being quoted"),
                   media: z.array(z.string().regex(/^\d+$/)).max(4).optional()
                     .describe("IDs of images uploaded beforehand with POST /media/upload (twitter_request)") },
        async run({ text, reply_to, quote, media }, p) {
          const d = ensureOk(await p({ method: "POST", path: "/tweets", body: { text: text,
            ...(reply_to ? { reply: { in_reply_to_tweet_id: reply_to } } : {}), ...(quote ? { quote_tweet_id: quote } : {}),
            ...(media?.length ? { media: { media_ids: media } } : {}) } }), "X");
          const id = d?.data?.id;
          return compact({ published: Boolean(id), id, url: id ? `https://x.com/i/web/status/${id}` : null, text: d?.data?.text });
        } },
    ],
  },
  {
    id: "kit", name: "Kit", category: "marketing", description: "Newsletters (formerly ConvertKit): subscribers, tags and sends",
    website: "https://kit.com", docs: "https://developers.kit.com/api-reference/overview",
    logo: { image: "https://developers.kit.com/mintlify-assets/_mintlify/favicons/kit-314e57c1/Pkdyit4Q00bMDtMW/_generated/favicon/apple-touch-icon.png" },
    baseUrl: "https://api.kit.com/v4",
    auth: { type: "header", name: "X-Kit-Api-Key" },
    fields: [{ id: "token", label: "API key (v4)", secret: true }],
    // OAuth 2.0 of Kit's v4 API: the default scope is “public” (there are no fine-grained scopes yet) and refresh tokens are single-use.
    oauth: { scopes: [], provider: { name: "Kit", key: "kit", redirect: "localhost",
      authorizeUrl: "https://app.kit.com/oauth/authorize", tokenUrl: "https://api.kit.com/v4/oauth/token",
      help: "1) In Kit open your profile → “Settings” → “Developer”, click “Start building app”, go to “Build” and “Add new app”; name "
        + "it “Conector”. 2) In the app settings (“Authentication” and “Distribution” tabs) set “Authorization "
        + "URL” to https://app.kit.com/oauth/authorize, add the redirect URI shown below under “Redirect URIs” and leave "
        + "“Secure application” checked. 3) Save and copy the “Client ID” and the “Client Secret” (the secret may be shown only once). "
        + "Access tokens expire and renew themselves." } },
    keyUrl: "https://app.kit.com/account_settings/developer_settings",
    help: "1) In Kit: “Settings” → “Developer” (app.kit.com/account_settings/developer_settings) → “Add a new key”. 2) Give it an internal "
      + "name, create it and copy the key: it is shown only once. It gives access to the whole account with a limit of 120 requests per "
      + "minute; bulk operations and purchase operations are only available with OAuth.",
    test: { path: "/account", account: (d) => d.account?.name || d.account?.primary_email_address || d.user?.email },
    examples: "Cursor pagination: per_page (max. 1000) and after=pagination.end_cursor. Examples: GET /subscribers?email_address=…, "
      + "GET /subscribers?status=active&per_page=100, POST /subscribers {\"email_address\": \"…\", \"first_name\": \"…\", \"fields\": "
      + "{…}} (creates or updates), GET /tags, POST /tags/{tag_id}/subscribers {\"email_address\": \"…\"} (tag; the subscriber must "
      + "exist), GET /forms, POST /forms/{form_id}/subscribers {\"email_address\": \"…\"}, GET /sequences, "
      + "POST /sequences/{id}/subscribers {\"email_address\": \"…\"}, GET /broadcasts, GET /broadcasts/{id}/stats, "
      + "POST /broadcasts {\"subject\": \"…\", \"content\": \"<p>…</p>\", \"send_at\": null} (draft), GET /account/email_stats "
      + "(last 90 days), GET /account/growth_stats?starting=2026-09-01&ending=2026-09-30, GET /custom_fields.",
  },
  {
    id: "mailerlite", name: "MailerLite", category: "marketing", description: "Email marketing: subscribers, groups, campaigns and automations",
    website: "https://www.mailerlite.com", docs: "https://developers.mailerlite.com/docs/", logo: { favicon: "https://www.mailerlite.com" },
    baseUrl: "https://connect.mailerlite.com/api",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API token", secret: true }],
    keyUrl: "https://dashboard.mailerlite.com/integrations/api",
    help: "1) In MailerLite: “Integrations” (left menu) → “MailerLite API” → “Use” → “Generate new token”. 2) Give it a "
      + "name, create it and copy the token: it is shown only once. It is the API of the current MailerLite (it does not work for "
      + "MailerLite Classic accounts) and allows 120 requests per minute.",
    test: { path: "/subscribers", query: { limit: 0 }, message: (d) => (d?.total != null ? `${formatNumber(d.total)} subscribers` : "Token is valid") },
    examples: "Subscribers are paginated by cursor (limit and cursor=meta.next_cursor); everything else by pages (limit and page). Examples: "
      + "GET /subscribers?filter[status]=active&limit=25, GET /subscribers/{id or email}, POST /subscribers {\"email\": \"…\", \"fields\": "
      + "{\"name\": \"…\", \"last_name\": \"…\"}, \"groups\": [\"…\"]} (creates or updates), POST /subscribers/{id}/groups/{group_id}, "
      + "DELETE /subscribers/{id}/groups/{group_id}, GET /groups?filter[name]=…, GET /groups/{id}/subscribers, "
      + "GET /campaigns?filter[status]=sent&limit=10 (without a filter it only returns scheduled ones), GET /campaigns/{id} (stats in "
      + "emails[].stats), POST /campaigns {\"name\": \"…\", \"type\": \"regular\", \"emails\": [{\"subject\": \"…\", \"from_name\": \"…\", "
      + "\"from\": \"…\", \"content\": \"<html>…\"}], \"groups\": [\"…\"]} (custom HTML requires the Advanced plan), "
      + "POST /campaigns/{id}/schedule {\"delivery\": \"instant\"}, GET /automations, GET /segments, GET /fields, GET /forms/embedded.",
  },
  {
    id: "mailjet", name: "Mailjet", category: "marketing", description: "Transactional and marketing email: sends, contacts and statistics",
    website: "https://www.mailjet.com", docs: "https://dev.mailjet.com/email/reference/overview/", logo: { favicon: "https://www.mailjet.com" },
    baseUrl: "https://api.mailjet.com",
    auth: { type: "basic", usernameField: "api_key", passwordField: "secret_key" },
    fields: [{ id: "api_key", label: "API key" }, { id: "secret_key", label: "Secret key", secret: true }],
    keyUrl: "https://app.mailjet.com/account/apikeys",
    help: "1) At app.mailjet.com: account menu → “Account settings” → “REST API” → “API Key Management”. 2) Copy the “API Key” and "
      + "the “Secret Key” of the master key, or create a sub-account one. If you do not have the Secret Key, regenerate it: it is only shown when "
      + "it is created. Mail can only be sent from validated senders or domains and the free plan allows 6,000 emails per month (200 per day).",
    test: { path: "/v3/REST/user", account: (d) => d.Data?.[0]?.Email || d.Data?.[0]?.Username },
    examples: "Versioned paths: /v3.1/send to send and /v3/REST/… for the rest (responses with Count, Data and Total; pagination with "
      + "Limit and Offset). Examples: POST /v3.1/send {\"Messages\": [{\"From\": {\"Email\": \"you@example.com\", \"Name\": \"Example\"}, \"To\": "
      + "[{\"Email\": \"…\"}], \"Subject\": \"…\", \"TextPart\": \"…\", \"HTMLPart\": \"…\"}]} (with a template: \"TemplateID\": 123, "
      + "\"TemplateLanguage\": true, \"Variables\": {…}), GET /v3/REST/sender (senders), GET /v3/REST/contactslist, "
      + "GET /v3/REST/contact?ContactsList={id}&Limit=100, POST /v3/REST/contactslist/{id}/managecontact {\"Email\": \"…\", \"Name\": "
      + "\"…\", \"Action\": \"addnoforce\"}, GET /v3/REST/message?Limit=20&ShowSubject=true, GET /v3/REST/messagehistory/{message_id}, "
      + "GET /v3/REST/campaign?Limit=20, GET /v3/REST/statcounters?CounterSource=APIKey&CounterTiming=Message&CounterResolution=Lifetime, "
      + "GET /v3/REST/template?OwnerType=user, GET /v3/REST/campaigndraft, POST /v3/REST/campaigndraft/{id}/send.",
  },
  {
    id: "sparkpost", name: "SparkPost", category: "marketing", description: "Transactional email: sends, templates, metrics and suppressions",
    website: "https://www.sparkpost.com", docs: "https://developers.sparkpost.com/api/", logo: { simpleIcons: "sparkpost" },
    baseUrl: "https://{server}/api/v1",
    auth: { type: "header", name: "Authorization" },
    fields: [{ id: "token", label: "API key", secret: true },
             { id: "server", label: "Account region", default: "api.sparkpost.com",
               options: [["api.sparkpost.com", "US (app.sparkpost.com)"], ["api.eu.sparkpost.com", "EU (app.eu.sparkpost.com)"]] }],
    help: "1) Sign in at app.sparkpost.com (or app.eu.sparkpost.com if the account is in the EU) → “Configuration” → “API Keys” → “Create "
      + "API Key”. 2) Give it a name and select the permissions: “Account: Read-only” (used by the connection test) and whatever you will use "
      + "(Transmissions, Templates, Metrics, Suppression Lists, Sending Domains…). 3) Copy the key: it is shown only once. Choose "
      + "the same region as the account here.",
    test: { path: "/account", account: (d) => d.results?.company_name },
    examples: "Responses come in results. Examples: POST /transmissions {\"recipients\": [{\"address\": {\"email\": \"…\"}}], "
      + "\"content\": {\"from\": {\"email\": \"you@example.com\", \"name\": \"Example\"}, \"subject\": \"…\", \"html\": \"…\", \"text\": \"…\"}} "
      + "(or \"content\": {\"template_id\": \"…\"} with \"substitution_data\": {…}), GET /templates, GET /sending-domains, "
      + "GET /metrics/deliverability?from=2026-10-01T00:00&metrics=count_sent,count_delivered,count_bounce,"
      + "count_unique_confirmed_opened,count_unique_clicked,count_spam_complaint (breakdown with /metrics/deliverability/domain or "
      + "/campaign), GET /events/message?events=bounce,delivery,open,click&per_page=100, GET /suppression-list?per_page=100, "
      + "PUT /suppression-list {\"recipients\": [{\"recipient\": \"…\", \"type\": \"non_transactional\"}]}, GET /recipient-lists, "
      + "GET /webhooks.",
  },
  {
    id: "plausible", name: "Plausible Analytics", category: "marketing",
    description: "Cookie-free web analytics: visitors, pages, sources and goals",
    website: "https://plausible.io", docs: "https://plausible.io/docs/stats-api", logo: { simpleIcons: "plausibleanalytics" },
    baseUrl: "{url}",
    derived: { url: (c) => String(c.url || "https://plausible.io").trim().replace(/\/+$/, "").replace(/\/api(\/v\d+)?(\/query)?$/i, "") },
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "Stats API key", secret: true },
             { id: "site", label: "Site for the connection test", format: "domain", example: "example.com",
               help: "A domain as it appears in Plausible, e.g. example.com; queries can ask for any other site on the team." },
             { id: "url", label: "Plausible URL", format: "url", default: "https://plausible.io", optional: true,
               help: "Leave it as is for Plausible Cloud; with Plausible Community Edition, the URL of your installation." }],
    keyUrl: "https://plausible.io/settings/api-keys",
    help: "1) In Plausible choose, at the top right, the team whose sites you want to query. 2) Account menu → “Settings” → “API "
      + "Keys” → “New API Key”, choose “Stats API” and click “Create API Key”: the key is shown only once. 3) Paste the key here and "
      + "one of the team's sites. The Stats API is a feature of the Business plan (included in Community Edition) and allows 600 "
      + "requests per hour.",
    // Plausible requires site_id before validating the key; the API also accepts it in the URL (combined with the JSON body).
    test: { method: "POST", path: "/api/v2/query?site_id={site}", body: { metrics: ["visitors"], date_range: "day" },
              message: (d) => `API key is valid: ${formatNumber(d?.results?.[0]?.metrics?.[0])} visitors today on the test site` },
    examples: "Queries use POST /api/v2/query; site_id is the domain as registered in Plausible. Examples: {\"site_id\": "
      + "\"example.com\", \"metrics\": [\"visitors\", \"visits\", \"pageviews\", \"bounce_rate\", \"visit_duration\"], \"date_range\": "
      + "\"30d\"}; top pages: {\"site_id\": \"…\", \"metrics\": [\"visitors\", \"pageviews\"], \"date_range\": \"7d\", "
      + "\"dimensions\": [\"event:page\"], \"order_by\": [[\"visitors\", \"desc\"]], \"pagination\": {\"limit\": 10}}; daily trend "
      + "with \"dimensions\": [\"time:day\"]; sources and campaigns with \"visit:source\", \"visit:channel\" or \"visit:utm_campaign\"; countries "
      + "and devices with \"visit:country_name\" and \"visit:device\"; goals: \"metrics\": [\"visitors\", \"events\", "
      + "\"conversion_rate\"] with \"dimensions\": [\"event:goal\"]; filters: \"filters\": [[\"is\", \"visit:country_name\", [\"United States\"]], "
      + "[\"contains\", \"event:page\", [\"/blog\"]]]. date_range: \"day\", \"24h\", \"7d\", \"28d\", \"30d\", \"91d\", \"month\", "
      + "\"6mo\", \"12mo\", \"year\", \"all\" or [\"2026-10-01\", \"2026-10-15\"].",
  },
  {
    id: "mixpanel", name: "Mixpanel", category: "marketing", description: "Product analytics: events, funnels, retention and profiles",
    website: "https://mixpanel.com", docs: "https://docs.mixpanel.com/reference/overview", logo: { simpleIcons: "mixpanel" },
    baseUrl: "https://{server}",
    allowedOrigins: ["https://data.mixpanel.com", "https://data-eu.mixpanel.com", "https://data-in.mixpanel.com", "https://api.mixpanel.com",
               "https://api-eu.mixpanel.com", "https://api-in.mixpanel.com"],
    auth: { type: "basic", usernameField: "username", passwordField: "secret" },
    fields: [{ id: "username", label: "Service account username" },
             { id: "secret", label: "Service account secret", secret: true },
             { id: "server", label: "Data residency", default: "mixpanel.com",
               options: [["mixpanel.com", "US (mixpanel.com)"], ["eu.mixpanel.com", "EU (eu.mixpanel.com)"],
                          ["in.mixpanel.com", "India (in.mixpanel.com)"]] }],
    help: "1) In Mixpanel: gear icon → “Organization Settings” → “Service Accounts” → “Add Service Account”. 2) Give it a name, a role "
      + "(“Consumer” is enough for querying; importing data or managing projects requires a higher one), the projects it will have "
      + "access to and an expiry. 3) Copy the username and the secret: the secret is shown only once. Choose the data residency of "
      + "your projects (EU if they are used at eu.mixpanel.com). The query API allows 60 queries per hour and 5 at a time.",
    test: { path: "/api/app/me", account: (d) => d.results?.name || d.results?.email,
              message: (d) => `${Object.keys(d?.results?.projects || {}).length} accessible project(s)` },
    examples: "Provide project_id in every query (accessible projects appear in GET /api/app/me). Examples: GET /api/query/events/top"
      + "?project_id=…&type=general (most frequent events today), GET /api/query/events/names?project_id=…&type=general&limit=100, "
      + "GET /api/query/segmentation?project_id=…&event=Sign Up&from_date=2026-10-01&to_date=2026-10-15&unit=day (with "
      + "on=properties[\"$browser\"] it is broken down), GET /api/query/funnels/list?project_id=…, GET /api/query/funnels?project_id=…"
      + "&funnel_id=…&from_date=…&to_date=…, GET /api/query/retention?project_id=…&from_date=…&to_date=…&born_event=…, "
      + "GET /api/query/insights?project_id=…&bookmark_id=… (saved report), POST /api/query/engage?project_id=… (profiles; "
      + "form with where), GET https://data-eu.mixpanel.com/api/2.0/export?project_id=…&from_date=…&to_date=…&limit=1000 (raw "
      + "events, one JSON per line; in the US, data.mixpanel.com), POST https://api-eu.mixpanel.com/import?strict=1&project_id=… "
      + "[events] (in the US, api.mixpanel.com).",
  },
  {
    id: "similarweb", name: "Similarweb", category: "marketing", description: "Estimated website traffic, sources, countries and competitors",
    website: "https://www.similarweb.com", docs: "https://developers.similarweb.com/docs/similarweb-web-traffic-api",
    logo: { simpleIcons: "similarweb" },
    baseUrl: "https://api.similarweb.com",
    // The REST API documents the key as api_key; the Batch API, in the api-key header: both are sent.
    auth: [{ type: "query", name: "api_key" }, { type: "header", name: "api-key" }],
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) You need a Similarweb plan with API access, which is purchased separately. 2) An administrator signs in at "
      + "pro.similarweb.com → “Settings” → “Account” → “API” → “Standard API” → “Generate a new API key”, chooses the user and creates it. "
      + "3) Under “Generated Keys” check that the key is activated (“Activation” column) and copy it. Each data query uses "
      + "data credits; checking the balance and permissions (the connection test) is free.",
    test: { path: "/capabilities",
              message: (d) => (d?.remaining_hits != null ? `${formatNumber(d.remaining_hits)} data credits available` : "API key is valid") },
    examples: "Whole months in YYYY-MM format, country as the lowercase 2-letter ISO code (or world) and format=json. Examples: "
      + "GET /v1/website/{domain}/total-traffic-and-engagement/visits?start_date=2026-07&end_date=2026-09&country=us&granularity="
      + "monthly&main_domain_only=false&format=json (also average-visit-duration, pages-per-visit and bounce-rate), "
      + "GET /v1/website/{domain}/traffic-sources/overview-share?start_date=…&end_date=…&country=world&granularity=monthly"
      + "&main_domain_only=false&format=json, GET /v4/website/{domain}/geo/total-traffic-by-country?start_date=…&end_date=…"
      + "&main_domain_only=false&format=json, GET /v4/website/{domain}/similar-sites/similarsites?format=json, "
      + "GET /v4/website/{domain}/search-competitors/organicsearchcompetitors?start_date=…&end_date=…&country=us&main_domain_only=false"
      + "&format=json, GET /v1/website/{domain}/global-rank/global-rank?start_date=…&end_date=…&main_domain_only=false&format=json, "
      + "GET /capabilities (remaining credits, available countries and dates; free). Each data call uses credits.",
  },
  {
    id: "together", name: "Together AI", category: "ai", description: "Open models: chat, embeddings, images, rerank and batches",
    website: "https://www.together.ai", docs: "https://docs.together.ai/reference/chat-completions", logo: { favicon: "https://www.together.ai" },
    baseUrl: "https://api.together.xyz/v1", timeout: LONG_TIMEOUT,
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://api.together.ai/settings/projects/~current/api-keys",
    help: "1) At api.together.ai → “Settings” → “API Keys” create a key (or use the default one). 2) Copy it. The API works with "
      + "prepaid balance: buy credits under “Settings” → “Billing”; with no balance it rejects requests.",
    test: { path: "/models", message: (d) => models(Array.isArray(d) ? d : d?.data) },
    examples: "OpenAI-compatible format (model names in GET /models). Examples: POST /chat/completions {\"model\": \"…\", "
      + "\"messages\": […]}, POST /embeddings {\"model\": \"…\", \"input\": [\"…\"]}, POST /rerank {\"model\": \"…\", \"query\": \"…\", "
      + "\"documents\": [\"…\"]}, POST /images/generations {\"model\": \"…\", \"prompt\": \"…\"} (returns temporary URLs), "
      + "POST /audio/speech {\"model\": \"…\", \"input\": \"…\", \"voice\": \"…\"}, GET /models (catalog with type, context and prices), "
      + "GET /files, POST /batches, GET /batches/{id}, GET /fine-tunes.",
  },
  {
    id: "fireworks", name: "Fireworks AI", category: "ai", description: "Fast inference of open models: chat, embeddings and batches",
    website: "https://fireworks.ai", docs: "https://docs.fireworks.ai/api-reference/introduction", logo: { favicon: "https://fireworks.ai" },
    baseUrl: "https://api.fireworks.ai", timeout: LONG_TIMEOUT,
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://app.fireworks.ai/settings/users/api-keys",
    help: "1) At app.fireworks.ai/settings/users/api-keys click “Create API key” and give it a name. 2) Copy the key: it is "
      + "shown only once. It is pay-as-you-go (per token for serverless models; per GPU time for your own deployments): add a "
      + "payment method under “Billing”.",
    test: { path: "/inference/v1/models", message: (d) => models(d?.data) },
    examples: "Inference at /inference/v1 (OpenAI format) and account management at /v1/accounts/{account_id}. Examples: "
      + "POST /inference/v1/chat/completions {\"model\": \"accounts/fireworks/models/…\", \"messages\": […]}, POST /inference/v1/completions, "
      + "POST /inference/v1/embeddings {\"model\": \"…\", \"input\": [\"…\"]}, GET /inference/v1/models, "
      + "GET /v1/accounts/fireworks/models?pageSize=50 (public catalog), GET /v1/accounts/{account_id}/deployments, "
      + "GET /v1/accounts/{account_id}/batchInferenceJobs.",
  },
  {
    id: "runway", name: "Runway", category: "ai", description: "AI video, image and audio generation (Gen-4.5, Aleph…)",
    website: "https://runway.com", docs: "https://docs.dev.runwayml.com/api/", logo: { favicon: "https://runway.com" },
    baseUrl: "https://api.dev.runwayml.com/v1", headers: { "X-Runway-Version": RUNWAY_VERSION }, timeout: LONG_TIMEOUT,
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key (key_…)", secret: true }],
    keyUrl: "https://dev.runwayml.com",
    help: "1) At dev.runway.com create a project (or open yours) → “API Keys” tab → create a key with a descriptive name. "
      + "2) Copy the key: it is shown only once. 3) Under “Billing” buy credits (minimum 10 USD; 1 credit = 0.01 USD). Without balance "
      + "you cannot generate, and API credits are separate from those of the Runway web app.",
    test: { path: "/organization",
              message: (d) => (d?.creditBalance != null ? `${formatNumber(d.creditBalance)} credits available` : "API key is valid") },
    examples: "Generations are asynchronous: they return {\"id\"} and the result is fetched with GET /tasks/{id} (or runway_result, "
      + "which also downloads the files). Examples: POST /image_to_video {\"model\": \"gen4.5\", \"promptImage\": \"https://…\", "
      + "\"promptText\": \"…\", \"ratio\": \"1280:720\", \"duration\": 5} (without promptImage it generates from the text only), "
      + "POST /text_to_image {\"model\": \"gen4_image\", \"promptText\": \"…\", \"ratio\": \"1920:1080\"}, POST /video_to_video "
      + "{\"model\": \"aleph2\", \"videoUri\": \"https://…\", \"promptText\": \"…\"}, POST /text_to_video, POST /video_upscale, "
      + "GET /tasks/{id} (status PENDING, THROTTLED, RUNNING, SUCCEEDED or FAILED; output with URLs that expire), DELETE /tasks/{id} "
      + "(cancels or deletes), GET /organization (credits and limits), POST /organization/usage. Models and their valid ratios and "
      + "durations change often: docs.dev.runwayml.com/guides/models. Each generation uses credits.",
    tools: [
      { name: "runway_result", title: "Runway: result of a generation", annotations: { readOnlyHint: true, openWorldHint: true },
        description: "Check a Runway task (the one returned by POST /image_to_video, /text_to_image…) and, if it has finished, download "
          + "its videos or images to this server (Conector's downloads folder) and return the paths. Can wait for it to finish.",
        schema: { task: z.string().regex(/^[\w-]{8,64}$/).describe("Task ID (the id field of the response)"),
                   wait_s: z.number().int().min(0).max(240).default(120)
                     .describe("Maximum seconds to wait if it has not finished yet (0 = just check)") },
        async run({ task, wait_s }, p) {
          const end = Date.now() + wait_s * 1000;
          for (;;) {
            const d = ensureOk(await p({ path: `/tasks/${encodeURIComponent(task)}` }), "Runway");
            if (d.status === "SUCCEEDED") {
              const files = [];
              for (const [n, url] of (d.output || []).entries()) files.push(await saveResult(url, `runway_${n + 1}`, "Runway"));
              return { status: d.status, files };
            }
            if (["FAILED", "CANCELLED"].includes(d.status)) return compact({ status: d.status, error: d.failure, code: d.failureCode });
            if (Date.now() >= end) {
              return compact({ status: d.status, progress: d.progress, notice: "It has not finished yet: check again in a while" });
            }
            await sleep(5000); // Runway asks not to poll more than once every 5 s
          }
        } },
    ],
  },
  {
    id: "ideogram", name: "Ideogram", category: "ai", description: "AI images with legible text: posters, logos and ads",
    website: "https://ideogram.ai", docs: "https://developer.ideogram.ai/v2/ideogram-api/api-overview",
    logo: { image: "https://ideogram.ai/favicon.ico" },
    baseUrl: "https://api.ideogram.ai", timeout: LONG_TIMEOUT,
    auth: { type: "header", name: "Api-Key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://ideogram.ai/platform",
    help: "1) Sign in at ideogram.ai (a free account is enough) and open the API panel with the “API” button (ideogram.ai/platform). "
      + "2) Under “Billing” add a payment method and balance: the API is prepaid and, with no balance, responds with a 402 error. 3) Under “API "
      + "Keys” click “Create key” and copy the key: it is shown in full only once. All the account's keys share the balance.",
    test: { path: "/models", message: "API key is valid" },
    examples: "API v2; images are returned with URLs that expire (download them, or use ideogram_generate_image). Examples: "
      + "POST /v2/image/generate/ideogram-4-5 {\"prompt\": \"…\", \"size\": \"1024x1024\", \"quality\": \"high\", \"num_images\": 1}, "
      + "POST /v2/image/generate/auto {\"prompt\": \"…\"} (picks the model), POST /v2/image/generate/ideogram-3 {\"prompt\": \"…\", "
      + "\"aspect_ratio\": \"16x9\", \"rendering_speed\": \"turbo\"}, GET /v2/generations/{generation_id} (result of requests "
      + "with \"async\": true and of videos), GET /v2/account/usage?start_time=2026-10-01T00:00:00Z (spend; administrators only). "
      + "Editing, expanding, removing the background or describing images (/v2/image/…) requires uploading them with multipart/form-data.",
    tools: [
      { name: "ideogram_generate_image", title: "Ideogram: generate images", annotations: { openWorldHint: true },
        description: "Generate images with Ideogram 4.5 (it excels at text inside the image: posters, logos, ads) and save them "
          + "on this server (Conector's downloads folder). Returns the path of each file. Each image has a cost depending on "
          + "quality and size.",
        schema: { prompt: z.string().min(1).describe("What the image should show, with the exact texts in quotes"),
                   size: z.string().regex(/^(auto|\d{3,4}x\d{3,4})$/).default("1024x1024")
                     .describe("auto or a supported size: 1024x1024, 1280x720 (16:9), 720x1280 (9:16), 1152x864 (4:3), 896x1120 "
                       + "(4:5)… (1K rate); 2048x2048, 2560x1440, 1440x2560… or auto (2K rate, more expensive)"),
                   quality: z.enum(["low", "medium", "high"]).default("high").describe("Higher quality takes longer and costs more"),
                   background: z.enum(["auto", "transparent", "opaque"]).default("auto").describe("transparent: PNG with a transparent background"),
                   count: z.number().int().min(1).max(4).default(1),
                   rewrite: z.enum(["auto", "on", "off"]).default("auto")
                     .describe("Magic prompt: expands the description (off keeps it as is)"),
                   seed: z.number().int().optional().describe("To repeat a result") },
        async run({ prompt, size, quality, background, count, rewrite, seed }, p) {
          const d = ensureOk(await p({ method: "POST", path: "/v2/image/generate/ideogram-4-5", body: { prompt: prompt, size: size,
            quality: quality, background: background, num_images: count, magic_prompt: rewrite, seed: seed } }), "Ideogram");
          const results = [];
          for (const [n, i] of (d?.data || []).entries()) {
            if (!i.url) {
              results.push({ notice: "Image blocked by Ideogram's safety filter" });
              continue;
            }
            results.push(compact({ ...(await saveResult(i.url, `ideogram_${n + 1}`, "Ideogram")), resolution: i.resolution,
              seed: i.seed }));
          }
          if (!results.length) throw new Error("Ideogram returned no images");
          return results;
        } },
    ],
  },
  {
    id: "blackforestlabs", name: "Black Forest Labs (FLUX)", category: "ai",
    description: "Image and video generation and editing with FLUX models",
    website: "https://bfl.ai", docs: "https://docs.bfl.ai/quick_start/introduction", logo: { favicon: "https://bfl.ai" },
    baseUrl: "https://{server}/v1", allowedOrigins: ["^https://([a-z0-9-]+\\.)+bfl\\.ai$"],
    auth: { type: "header", name: "x-key" },
    fields: [{ id: "token", label: "API key", secret: true },
             { id: "server", label: "Processing region", default: "api.bfl.ai",
               options: [["api.bfl.ai", "Global (the fastest available cluster)"], ["api.eu.bfl.ai", "EU (GDPR)"],
                          ["api.us.bfl.ai", "US"]] }],
    keyUrl: "https://dashboard.bfl.ai",
    help: "1) Create an account at dashboard.bfl.ai: a default organization and project are created. 2) Under “Billing” add "
      + "credits (prepaid; 1 credit = 0.01 USD). 3) In the project, open “API Keys”, create a key and copy it. Choose the EU region "
      + "here if images must be processed in Europe.",
    test: { path: "/credits", message: (d) => (d?.credits != null ? `${formatNumber(d.credits)} credits available` : "API key is valid") },
    examples: "Generations are asynchronous: the submission returns id and polling_url, which is polled with GET {polling_url} until "
      + "status is Ready (the image or video is in result.sample, a URL that expires after 10 minutes). Examples: "
      + "POST /flux-2-pro {\"prompt\": \"…\", \"width\": 1440, \"height\": 816} (or blackforestlabs_generate_image), POST /flux-2-max, "
      + "POST /flux-2-flex (text and fine details), POST /flux-2-klein-9b (fast), editing with \"input_image\": \"https://…\" (up to "
      + "input_image_8), POST /flux-3-image {\"prompt\": \"…\", \"aspect_ratio\": \"16:9\", \"resolution\": \"1k\"}, POST /flux-3-video "
      + "(video with audio), GET /credits (balance). To download what these requests generate, use blackforestlabs_result.",
    tools: [
      { name: "blackforestlabs_generate_image", title: "FLUX: generate or edit an image", annotations: { openWorldHint: true },
        description: "Generate an image with a Black Forest Labs FLUX.2 model (or edit reference images according to the description), "
          + "wait for the result and save it on this server (Conector's downloads folder). Returns the file path and the cost in "
          + "credits (1 credit = 0.01 USD).",
        schema: { prompt: z.string().min(1).describe("What the image should show or, with references, what to change in them"),
                   model: z.enum(["flux-2-pro", "flux-2-max", "flux-2-flex", "flux-2-klein-9b", "flux-2-klein-4b"]).default("flux-2-pro")
                     .describe("pro: the recommended one; max: maximum quality; flex: text and fine details; klein: fast and cheap"),
                   width: z.number().int().min(64).max(4096).optional()
                     .describe("Pixels, multiple of 16 (default 1024, or the size of the first reference)"),
                   height: z.number().int().min(64).max(4096).optional().describe("Pixels, multiple of 16; up to 4 megapixels in total"),
                   references: z.array(z.string().url()).max(4).optional().describe("URLs of reference images or images to edit"),
                   format: z.enum(["jpeg", "png", "webp"]).default("png"),
                   seed: z.number().int().optional().describe("To repeat a result") },
        async run({ prompt, model, width, height, references, format, seed }, p) {
          const body = { prompt: prompt, output_format: format, seed: seed };
          (references || []).forEach((url, n) => { body[n ? `input_image_${n + 1}` : "input_image"] = url; });
          if (width || height || !references?.length) Object.assign(body, { width: width || 1024, height: height || 1024 });
          const task = ensureOk(await p({ method: "POST", path: `/${model}`, body: body }), "Black Forest Labs");
          const d = await waitForBfl(p, task, 240);
          if (BFL_IN_PROGRESS.includes(d?.status)) {
            return { status: d.status, polling_url: task.polling_url, id: task.id,
                     notice: "It has not finished yet: check it in a while with blackforestlabs_result" };
          }
          if (d?.status !== "Ready" || !d.result?.sample) throw new Error(`Black Forest Labs: the image was not generated: ${bflReason(d)}`);
          return compact({ ...(await saveResult(d.result.sample, `flux_${model}`, "Black Forest Labs")),
            cost_credits: task.cost, seed: d.result.seed });
        } },
      { name: "blackforestlabs_result", title: "FLUX: result of a task", annotations: { readOnlyHint: true, openWorldHint: true },
        description: "Check a Black Forest Labs task submitted with blackforestlabs_request (e.g. POST /flux-3-image or "
          + "/flux-3-video) and, when it is ready, download its images or videos to this server (Conector's downloads folder). "
          + "Can wait for it to finish.",
        schema: { polling_url: z.string().url().optional().describe("polling_url from the submission response (recommended)"),
                   id: z.string().regex(/^[\w-]{6,80}$/).optional().describe("Task id, if you do not have the polling_url"),
                   wait_s: z.number().int().min(0).max(270).default(120)
                     .describe("Maximum seconds to wait if it has not finished yet (0 = just check)") },
        async run({ polling_url, id, wait_s }, p) {
          if (!polling_url && !id) throw new Error("Provide the polling_url or the task id");
          const d = await waitForBfl(p, { id, polling_url }, wait_s);
          if (BFL_IN_PROGRESS.includes(d?.status)) {
            return compact({ status: d.status, progress: d.progress, notice: "It has not finished yet: check again in a while" });
          }
          if (d?.status !== "Ready") return { status: d?.status, error: bflReason(d) };
          const urls = urlsIn(d.result).slice(0, 10);
          const files = [];
          for (const [n, url] of urls.entries()) files.push(await saveResult(url, `flux_${n + 1}`, "Black Forest Labs"));
          return compact({ status: d.status, files, cost_credits: d.cost });
        } },
    ],
  },
  {
    id: "exa", name: "Exa", category: "ai", description: "Semantic web search for AI, page contents and answers",
    website: "https://exa.ai", docs: "https://exa.ai/docs/reference/search", logo: { favicon: "https://exa.ai" },
    baseUrl: "https://api.exa.ai", timeout: LONG_TIMEOUT,
    auth: { type: "header", name: "x-api-key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://dashboard.exa.ai/api-keys",
    help: "1) Create an account at dashboard.exa.ai (new accounts come with credit to try it out). 2) At dashboard.exa.ai/api-keys create "
      + "a key and copy it. It is pay-as-you-go: each search and the contents of each page are charged separately (deep searches, "
      + "more); add balance or enable billing under “Billing”.",
    test: { path: "/websets/v0/teams/me", account: (d) => d.name },
    examples: "Examples: POST /search {\"query\": \"…\", \"numResults\": 10, \"type\": \"auto\", \"contents\": {\"highlights\": true}} (or "
      + "exa_search; \"category\": \"company\" | \"people\" | \"news\"…, \"includeDomains\": […], \"startPublishedDate\": "
      + "\"2026-01-01\"), POST /contents {\"urls\": [\"https://…\"], \"text\": {\"maxCharacters\": 10000}} (page text), "
      + "POST /answer {\"query\": \"…\", \"text\": true} (answer with citations), POST /findSimilar {\"url\": \"https://…\"}, "
      + "POST /agent/runs and GET /agent/runs/{id} (research and long lists), GET /monitors, GET /websets/v0/websets. "
      + "Each response states its cost in costDollars.",
    tools: [
      { name: "exa_search", title: "Exa: search the web", annotations: { readOnlyHint: true, openWorldHint: true },
        description: "Semantic web search with Exa: returns the most relevant results (title, URL, date and author) with the most "
          + "pertinent snippets or the text of each page, and the cost. Each search has a cost.",
        schema: { query: z.string().min(1).max(2000).describe("What to search for, in natural language or as keywords"),
                   count: z.number().int().min(1).max(25).default(10),
                   type: z.enum(["auto", "fast", "instant", "deep-lite", "deep"]).default("auto")
                     .describe("auto: balanced; fast and instant: faster; deep-lite and deep: multi-step research, slower and more expensive"),
                   category: z.enum(["company", "people", "news", "publication", "personal site", "financial report"]).optional()
                     .describe("Limit to one type of result"),
                   content: z.enum(["snippets", "text", "none"]).default("snippets")
                     .describe("snippets: relevant excerpts; text: text of each page (up to max_characters)"),
                   max_characters: z.number().int().min(200).max(10000).default(2000).describe("With content=text, characters per result"),
                   domains: z.array(z.string()).optional().describe("Search only these domains"),
                   exclude: z.array(z.string()).optional().describe("Domains to exclude"),
                   since: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("Only published since this date (YYYY-MM-DD)"),
                   country: z.string().regex(/^[A-Za-z]{2}$/).optional().describe("User's country to localize results (US, GB…)") },
        async run({ query, count, type, category, content, max_characters, domains, exclude, since, country }, p) {
          const contents = content === "text" ? { text: { maxCharacters: max_characters } }
            : content === "snippets" ? { highlights: true } : undefined;
          const d = ensureOk(await p({ method: "POST", path: "/search", body: { query: query, numResults: count, type: type,
            category: category, includeDomains: domains, excludeDomains: exclude, startPublishedDate: since,
            userLocation: country?.toUpperCase(), contents } }), "Exa");
          return compact({
            results: (d.results || []).map((r) => compact({ title: r.title, url: r.url, date: r.publishedDate?.slice(0, 10),
              author: r.author, snippets: r.highlights, text: r.text, summary: r.summary })),
            synthesis: typeof d.output?.content === "string" ? d.output.content : undefined,
            cost_usd: d.costDollars?.total,
          });
        } },
    ],
  },
  {
    id: "apify", name: "Apify", category: "ai", description: "Web scrapers and automations (actors): run and collect data",
    website: "https://apify.com", docs: "https://docs.apify.com/api/v2", logo: { favicon: "https://apify.com" },
    baseUrl: "https://api.apify.com/v2", timeout: 320_000, // the synchronous run waits up to 300 s
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "Personal API token (apify_api_…)", secret: true }],
    keyUrl: "https://console.apify.com/settings/integrations",
    help: "1) Create an account at apify.com: the free plan includes 5 USD of usage per month. 2) At console.apify.com → “Settings” → "
      + "“API & Integrations” copy the “Personal API token” or create another one, which you can limit to certain actors and data. Each run "
      + "uses credits according to compute time and, for some actors, the number of results.",
    test: { path: "/users/me", account: (d) => d.data?.username || d.data?.email },
    examples: "Actors are given as user~name (e.g. apify~website-content-crawler) or by their ID. Examples: "
      + "GET /store?search=google maps&limit=10 (search public actors), GET /acts?my=true, GET /acts/{actor}, "
      + "POST /acts/{actor}/runs {input} (asynchronous: returns data.id and data.defaultDatasetId), GET /actor-runs/{run_id} (status "
      + "READY, RUNNING, SUCCEEDED, FAILED…), GET /actor-runs/{run_id}/dataset/items?clean=true&limit=100, "
      + "GET /datasets/{dataset_id}/items?clean=true&format=json&limit=100, GET /actor-tasks, "
      + "POST /actor-tasks/{task}/run-sync-get-dataset-items, GET /key-value-stores/{store_id}/records/OUTPUT, GET /users/me/limits "
      + "(usage for the cycle and limits), GET /users/me/usage/monthly. To run and collect the data in a single call, use "
      + "apify_run_actor.",
    tools: [
      { name: "apify_run_actor", title: "Apify: run an actor and get its data", annotations: { openWorldHint: true },
        description: "Run an Apify actor (scraper or automation: Google Maps, social networks, websites…) with the given input, "
          + "wait for it to finish (up to 5 minutes) and return the items of its dataset. Uses Apify credits depending on the actor; "
          + "for long runs use POST /acts/{actor}/runs with apify_request.",
        schema: { actor: z.string().regex(/^[\w.-]+([/~][\w.-]+)?$/)
                     .describe("Actor: user/name (e.g. apify/website-content-crawler or compass/crawler-google-places) or its ID"),
                   input: z.record(z.string(), z.any()).default({}).describe("JSON input for the actor (see its “Input” tab at apify.com/store)"),
                   max_items: z.number().int().min(1).max(1000).default(50)
                     .describe("Maximum number of items returned (and charged for pay-per-result actors)"),
                   fields: z.array(z.string()).optional().describe("Return only these fields of each item"),
                   max_time: z.number().int().min(10).max(290).default(240).describe("Maximum seconds the actor may run"),
                   memory_mb: z.number().int().min(128).max(32768).optional().describe("Actor memory in MB (power of 2)"),
                   max_usd: z.number().positive().optional().describe("Maximum spend in USD (pay-per-event actors)") },
        async run({ actor, input, max_items, fields, max_time, memory_mb, max_usd }, p) {
          const d = ensureOk(await p({ method: "POST", path: `/acts/${encodeURIComponent(actor.replace("/", "~"))}/run-sync-get-dataset-items`,
            query: { timeout: max_time, memory: memory_mb, maxItems: max_items, maxTotalChargeUsd: max_usd, limit: max_items,
                     clean: true, format: "json", fields: fields?.length ? fields.join(",") : undefined }, body: input }), "Apify");
          const items = Array.isArray(d) ? d : [];
          return { total: items.length, items };
        } },
    ],
  },
  {
    id: "jina", name: "Jina AI", category: "ai", description: "Read web pages as Markdown, web search, embeddings and rerank",
    website: "https://jina.ai", docs: "https://docs.jina.ai", logo: { favicon: "https://jina.ai" },
    baseUrl: "https://api.jina.ai", timeout: LONG_TIMEOUT,
    allowedOrigins: ["https://r.jina.ai", "https://s.jina.ai", "https://eu.r.jina.ai", "https://eu.s.jina.ai"],
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key (jina_…)", secret: true }],
    keyUrl: "https://jina.ai/api-dashboard/key-manager",
    help: "1) At jina.ai/api-dashboard sign in and, under “API Key & Billing”, create a key or copy yours: new keys come with free "
      + "tokens to try. 2) Copy the key (jina_…). Each read, search or embedding deducts tokens from the key's balance; when they "
      + "run out, top up in the same panel.",
    test: { path: "/v1/batches", query: { limit: 1 }, message: "API key is valid" },
    examples: "Reader and search with a full URL (EU-only versions: eu.r.jina.ai and eu.s.jina.ai). Examples: POST https://r.jina.ai/ "
      + "{\"url\": \"https://…\"} (or jina_read; content in data.content; options with headers X-Target-Selector, X-Remove-Selector, "
      + "X-Wait-For-Selector, X-No-Cache: true, X-Return-Format: markdown|html|text|screenshot), POST https://s.jina.ai/ {\"q\": \"…\", "
      + "\"gl\": \"US\", \"hl\": \"en\", \"num\": 5} (web search with the content of each result; with the header X-Respond-With: "
      + "no-content only title, URL and description), POST /v1/embeddings {\"model\": \"jina-embeddings-v5-text-small\", \"input\": "
      + "[\"…\"]}, POST /v1/rerank {\"model\": \"jina-reranker-v3\", \"query\": \"…\", \"documents\": [\"…\"], \"top_n\": 5}, "
      + "GET /v1/models.",
    tools: [
      { name: "jina_read", title: "Jina Reader: read a page as Markdown", annotations: { readOnlyHint: true, openWorldHint: true },
        description: "Download a web page (including those that load with JavaScript) or a PDF and return its content as clean Markdown, "
          + "with the title and URL. Uses tokens from the key depending on the text length.",
        schema: { url: z.string().url().describe("Address of the page or PDF"),
                   selector: z.string().optional().describe("Only the content of these CSS selectors, e.g. article or #main"),
                   remove: z.string().optional().describe("CSS selectors to remove, e.g. header, footer, .cookies"),
                   wait_for: z.string().optional().describe("CSS selector to wait for before reading (pages that load late)"),
                   no_cache: z.boolean().default(false).describe("Download again even if a recent copy exists"),
                   links: z.boolean().default(false).describe("Add the list of the page's links"),
                   max_characters: z.number().int().min(1000).max(40000).default(30000) },
        async run({ url, selector, remove, wait_for, no_cache, links, max_characters }, p) {
          const headers = compact({ "X-Target-Selector": selector, "X-Remove-Selector": remove, "X-Wait-For-Selector": wait_for,
            "X-No-Cache": no_cache ? "true" : null, "X-With-Links-Summary": links ? "true" : null });
          const d = ensureOk(await p({ method: "POST", path: "https://r.jina.ai/", body: { url }, headers: headers }), "Jina AI")?.data || {};
          const text = String(d.content || "");
          const list = Array.isArray(d.links) ? d.links : Object.entries(d.links || {}).map(([title, target]) => ({ title, url: target }));
          return compact({ url: d.url || url, title: d.title, description: d.description, published: d.publishedTime,
            markdown: text.slice(0, max_characters),
            truncated: text.length > max_characters ? `Showing ${max_characters} of ${text.length} characters` : null,
            links: links ? list.slice(0, 200) : null, tokens: d.usage?.tokens });
        } },
    ],
  },
];
