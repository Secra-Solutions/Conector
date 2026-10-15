// Marketing, SEO and email sending (Search Console, Analytics, YouTube and Google Ads are in google.js).
import { ensureOk } from "../define.js";

const SEMRUSH_UNITS = "https://www.semrush.com/users/countapiunits.html";

// Mailchimp: the data center is at the end of the API key (…-us21) and is part of the API domain. With OAuth there is no
// key: Mailchimp reports it on authorization and it is stored in the hidden field “dc”.
function mailchimpDataCenter(c) {
  const oauth = c.method === "oauth";
  const dc = oauth ? c.dc : /-([a-z]+\d+)$/i.exec(String(c.token || "").trim())?.[1];
  if (!dc) {
    throw new Error(oauth ? "The Mailchimp data center is missing: connect Mailchimp again in the panel"
      : "The Mailchimp API key must end with its data center (e.g. -us21)");
  }
  return dc.toLowerCase();
}

// Mailchimp does not include the data center in the token: ask its metadata endpoint (scheme “OAuth”, not “Bearer”).
// With an invalid token it answers 200 with an error JSON, so check that the data center is present.
const dataCenterOf = (d) => String(d?.dc || /^https:\/\/([a-z]+\d+)\.api\.mailchimp\.com/i.exec(String(d?.api_endpoint || ""))?.[1] || "")
  .toLowerCase();

async function dataCenterAfterAuth(token, cred, httpRequest) {
  let r;
  for (const scheme of ["OAuth", "Bearer"]) {
    r = await httpRequest("https://login.mailchimp.com/oauth2/metadata",
      { headers: { Authorization: `${scheme} ${token}`, Accept: "application/json" } });
    if (r.ok && /^[a-z]+\d+$/.test(dataCenterOf(r.data))) return { dc: dataCenterOf(r.data) };
  }
  ensureOk(r, "Mailchimp");
  const reason = r.data?.error_description ? ` (${r.data.error_description})` : "";
  throw new Error(`Mailchimp did not return the account's data center${reason}`);
}

export default [
  {
    id: "semrush", name: "Semrush", category: "marketing", description: "SEO: keywords, domains, competitors and backlinks",
    website: "https://www.semrush.com", docs: "https://developer.semrush.com/api/", logo: { simpleIcons: "semrush" },
    baseUrl: "https://api.semrush.com", allowedOrigins: ["https://www.semrush.com"],
    auth: { type: "query", name: "key" },
    fields: [{ id: "token", label: "API key (v3)", secret: true }],
    keyUrl: "https://www.semrush.com/accounts/subscription-info/api-units/",
    help: "You need the Business plan and an API units package, which is bought separately (account icon → “Subscription info” → "
      + "“API units”). Copy the v3 key from your profile → “API keys” (v4 keys do not work here). Each line of a report uses "
      + "units (e.g. 10 per organic keyword), so limit the results.",
    test: { path: SEMRUSH_UNITS, message: (d) => `${String(d).trim()} API units available` },
    examples: "Responses are CSV separated by “;”. Examples: "
      + "GET /?type=domain_rank&domain=example.com&database=us&export_columns=Dn,Rk,Or,Ot,Oc, "
      + "GET /?type=domain_organic&domain=example.com&database=us&display_limit=20&export_columns=Ph,Po,Nq,Cp,Ur, "
      + "GET /?type=domain_organic_organic&domain=example.com&database=us&display_limit=10 (competitors), "
      + "GET /?type=phrase_this&phrase=running+shoes&database=us&export_columns=Ph,Nq,Cp,Co,Nr,Td, "
      + "GET /analytics/v1/?type=backlinks_overview&target=example.com&target_type=root_domain. "
      + "Each line uses units: always set display_limit and check the balance first with semrush_units.",
    tools: [
      { name: "semrush_units", title: "Semrush: available API units", annotations: { readOnlyHint: true },
        description: "Balance of standard API units (checking it is free). Use it before requesting large reports.", schema: {},
        async run(_, p) {
          const text = String(ensureOk(await p({ path: SEMRUSH_UNITS }), "Semrush")).trim();
          if (!/^[\d.,\s]+$/.test(text)) throw new Error(`Semrush: ${text.slice(0, 200)}`);
          return { units: Number(text.replace(/\D/g, "")) };
        } },
    ],
  },
  {
    id: "mailchimp", name: "Mailchimp", category: "marketing",
    description: "Audiences, contacts, campaigns and email marketing reports",
    website: "https://mailchimp.com", docs: "https://mailchimp.com/developer/marketing/api/", logo: { simpleIcons: "mailchimp" },
    baseUrl: "https://{dc}.api.mailchimp.com/3.0", derived: { dc: mailchimpDataCenter },
    auth: { type: "basic", fixedUsername: "conector", passwordField: "token" },
    fields: [{ id: "token", label: "API key (ends in -usXX)", secret: true, example: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx-us21" },
             { id: "dc", label: "Data center", format: "subdomain", hidden: true, example: "us21" }],
    // Mailchimp tokens do not expire and are not refreshed; with OAuth the data center arrives through “after” (field “dc”).
    oauth: { scopes: [], provider: { name: "Mailchimp", key: "mailchimp", redirect: "127.0.0.1",
      authorizeUrl: "https://login.mailchimp.com/oauth2/authorize", tokenUrl: "https://login.mailchimp.com/oauth2/token",
      after: dataCenterAfterAuth,
      help: "1) In Mailchimp open your profile icon → “Account” → “Extras” menu → “Registered apps” "
        + "(admin.mailchimp.com/account/oauth2/) and click “Register An App”. 2) Name it “Conector”, fill in the description, "
        + "company and website (e.g. https://www.example.com) and paste the redirect URI shown below into “Redirect URI” (Mailchimp "
        + "only accepts http://127.0.0.1 or an HTTPS address, not localhost). 3) Click “Create” and copy the “Client ID” and the “Client "
        + "Secret” (the secret is shown only once). Mailchimp reports the account's data center on authorization: you do not "
        + "need to type it." } },
    keyUrl: "https://admin.mailchimp.com/account/api/",
    help: "In Mailchimp: your profile icon → “Account” → “Extras” menu → “API keys” → “Create A Key”. Name it, click "
      + "“Generate Key” and copy it: it is not shown again. The end of the key (e.g. -us21) indicates your data center.",
    test: { path: "/", query: { fields: "account_name,email,login_id" }, account: (d) => d.account_name || d.email },
    examples: "Examples: GET /lists?fields=lists.id,lists.name,lists.stats.member_count, "
      + "GET /lists/{list_id}/members?count=50&status=subscribed, "
      + "PUT /lists/{list_id}/members/{md5 of the lowercase email} {\"email_address\": \"…\", \"status_if_new\": \"subscribed\"}, "
      + "GET /campaigns?count=20&sort_field=send_time&sort_dir=DESC, GET /reports/{campaign_id}, "
      + "POST /campaigns/{campaign_id}/actions/send.",
  },
  {
    id: "brevo", name: "Brevo", category: "marketing", description: "Contacts, lists, campaigns and transactional emails",
    website: "https://www.brevo.com", docs: "https://developers.brevo.com/reference", logo: { simpleIcons: "brevo" },
    baseUrl: "https://api.brevo.com/v3",
    auth: { type: "header", name: "api-key" },
    fields: [{ id: "token", label: "API key (xkeysib-…)", secret: true }],
    oauth: { scopes: ["account:read", "contacts:read", "contacts:write", "campaigns.email:read", "campaigns.email:write",
                        "transactional.email:read", "transactional.email:write"],
      provider: { name: "Brevo", key: "brevo", redirect: "localhost",
        authorizeUrl: "https://oauth.brevo.com/realms/partner/oauth/authorize", tokenUrl: "https://oauth.brevo.com/realms/partner/oauth/token",
        help: "Brevo has no web form to register OAuth apps: you do it once with its command-line tool. 1) In a terminal install "
          + "the Brevo CLI (npm install -g @getbrevo/cli, or brew install getbrevo/tap/brevo) and sign in with brevo login. "
          + "2) Run brevo app init: name it “Conector”, choose the oauth type and, as “OAuth callback "
          + "URL”, paste the redirect URI shown below. 3) In the app-config.json file it creates, leave the scopes shown below "
          + "in auth.scopes and run brevo app upload. 4) Get the client ID and the secret with brevo app "
          + "credentials --app-id <app ID> --reveal-secret and paste them here. The app is private: only users "
          + "of your own Brevo organization can authorize it." } },
    keyUrl: "https://app.brevo.com/settings/keys/api",
    help: "In Brevo: your account menu (top right) → “SMTP & API” → “API Keys” tab → “Generate a new API key”. "
      + "Copy it when you create it (it is not shown again; it is not the SMTP key). If Brevo blocks unknown IPs, authorize the IP "
      + "of this server in “Settings” → “Security” → “Authorized IPs”.",
    test: { path: "/account", account: (d) => d.email || d.companyName },
    examples: "Examples: GET /contacts?limit=50, GET /contacts/{email}, POST /contacts {\"email\": \"…\", \"listIds\": [2]}, "
      + "GET /contacts/lists, POST /smtp/email {\"sender\": {\"email\": \"…\"}, \"to\": [{\"email\": \"…\"}], \"subject\": \"…\", "
      + "\"htmlContent\": \"…\"}, GET /emailCampaigns?status=sent&limit=10, GET /smtp/statistics/aggregatedReport?days=30.",
  },
  {
    id: "sendgrid", name: "SendGrid", category: "marketing", description: "Email sending, templates, contacts and statistics",
    website: "https://sendgrid.com", docs: "https://www.twilio.com/docs/sendgrid/api-reference", logo: { favicon: "https://sendgrid.com" },
    baseUrl: "https://{server}/v3",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key (SG.…)", secret: true },
             { id: "server", label: "Region", default: "api.sendgrid.com",
               options: [["api.sendgrid.com", "Global"], ["api.eu.sendgrid.com", "European Union (EU regional subusers)"]] }],
    keyUrl: "https://app.sendgrid.com/settings/api_keys",
    help: "In SendGrid: “Settings” → “API Keys” → “Create API Key”. Choose “Full Access” or “Restricted Access” with the permissions "
      + "you need (e.g. Mail Send, Stats, Marketing) and copy the key: it is shown only once.",
    test: { path: "/scopes", message: (d) => `API key is valid (${(d.scopes || []).length} permissions)` },
    examples: "Examples: POST /mail/send {\"personalizations\": [{\"to\": [{\"email\": \"…\"}]}], \"from\": {\"email\": \"…\"}, "
      + "\"subject\": \"…\", \"content\": [{\"type\": \"text/html\", \"value\": \"…\"}]}, GET /stats?start_date=2026-10-01, "
      + "GET /templates?generations=dynamic&page_size=20, PUT /marketing/contacts {\"contacts\": [{\"email\": \"…\"}]}, "
      + "GET /suppression/bounces.",
  },
  {
    id: "bingwebmaster", name: "Bing Webmaster Tools", category: "marketing",
    description: "Bing performance, crawling, indexing and sitemaps",
    website: "https://www.bing.com/webmasters", docs: "https://learn.microsoft.com/en-us/bingwebmaster/",
    logo: { favicon: "https://www.bing.com/webmasters" },
    baseUrl: "https://ssl.bing.com/webmaster/api.svc/json",
    auth: { type: "query", name: "apikey" },
    fields: [{ id: "token", label: "API key", secret: true }],
    // With OAuth, access lasts 1 hour and is renewed with the refresh token (the API accepts the token as “Bearer” on the same domain).
    oauth: { scopes: ["webmaster.manage"], provider: { name: "Bing Webmaster Tools", key: "bingwebmaster", redirect: "localhost",
      authorizeUrl: "https://www.bing.com/webmasters/oauth/authorize", tokenUrl: "https://www.bing.com/webmasters/oauth/token",
      help: "1) In Bing Webmaster Tools (bing.com/webmasters) click “Settings” (top right) → “API Access”, accept "
        + "the terms if it is the first time and click “OAuth Client”. 2) Enter “Conector” as the name and the redirect URI shown "
        + "below as “Redirect URI”, and register the client. 3) Select the client you created and copy its “Client ID” and its "
        + "“Client Secret”. The permission requested is the one shown below (read and write access to your verified sites)." } },
    help: "In Bing Webmaster Tools: “Settings” icon (top right) → “API Access” → accept the terms → "
      + "“API Key” → “Generate API Key”. There is a single key per user and it works for all their verified sites.",
    test: { path: "/GetUserSites", message: (d) => `${(d.d || []).length} sites in Bing Webmaster Tools` },
    examples: "Responses come inside “d”. Examples: GET /GetUserSites, GET /GetQueryStats?siteUrl=https://www.example.com/, "
      + "GET /GetPageStats?siteUrl=…, GET /GetRankAndTrafficStats?siteUrl=…, GET /GetCrawlIssues?siteUrl=…, "
      + "GET /GetUrlSubmissionQuota?siteUrl=…, POST /SubmitUrl {\"siteUrl\": \"…\", \"url\": \"…\"}, "
      + "POST /SubmitUrlBatch {\"siteUrl\": \"…\", \"urlList\": […]}, GET /GetFeeds?siteUrl=….",
  },
  {
    id: "mailgun", name: "Mailgun", category: "marketing", description: "Email sending, domains, delivery logs and bounces",
    website: "https://www.mailgun.com", docs: "https://documentation.mailgun.com/docs/mailgun/api-reference/api-overview",
    logo: { simpleIcons: "mailgun" },
    baseUrl: "https://{server}",
    auth: { type: "basic", fixedUsername: "api", passwordField: "token" },
    fields: [{ id: "token", label: "Account API key", secret: true },
             { id: "server", label: "Region", default: "api.mailgun.net",
               options: [["api.mailgun.net", "US"], ["api.eu.mailgun.net", "EU"]],
               help: "The region where you created your sending domains." }],
    keyUrl: "https://app.mailgun.com/settings/api_security",
    help: "In Mailgun: your profile menu (top right) → “API Security” → “Add new key”. Enter a description, choose a role "
      + "with access to what you plan to use and copy the key: it is shown only once. Domain Sending Keys do not work "
      + "because they can only send.",
    test: { path: "/v4/domains", query: { limit: 1 }, message: (d) => `${d.total_count ?? (d.items || []).length} domains in Mailgun` },
    examples: "Examples: GET /v4/domains, POST /v3/{domain}/messages with form {\"from\": \"Example <hello@mg.example.com>\", "
      + "\"to\": \"a@x.com\", \"subject\": \"…\", \"html\": \"…\"}, "
      + "POST /v1/analytics/logs {\"duration\": \"7d\", \"events\": [\"failed\"]} (event log), "
      + "GET /v3/{domain}/bounces, GET /v3/{domain}/unsubscribes, GET /v3/{domain}/complaints.",
  },
  {
    id: "resend", name: "Resend", category: "marketing", description: "Transactional email: sending, domains, contacts and broadcasts",
    website: "https://resend.com", docs: "https://resend.com/docs/api-reference/introduction", logo: { simpleIcons: "resend" },
    baseUrl: "https://api.resend.com",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key (re_…)", secret: true }],
    // Public client registered through the API (OAuth 2.1 with PKCE, no secret); access tokens last 15 minutes and are renewed.
    oauth: { scopes: ["full_access"], provider: { name: "Resend", key: "resend", redirect: "127.0.0.1",
      authorizeUrl: "https://api.resend.com/oauth/authorize", tokenUrl: "https://api.resend.com/oauth/token",
      help: "Resend has no web form to register OAuth apps: you do it with a call to its API, without authentication. "
        + "1) Open a terminal and run: curl -X POST https://api.resend.com/oauth/register -H 'Content-Type: application/json' -d "
        + "'{\"client_name\": \"Conector\", \"redirect_uris\": [\"URI\"], \"grant_types\": [\"authorization_code\", "
        + "\"refresh_token\"], \"response_types\": [\"code\"], \"token_endpoint_auth_method\": \"none\", \"scope\": \"full_access\"}', "
        + "replacing URI with the redirect URI shown below. 2) Copy the client_id from the response and paste it here. It is a "
        + "public client (protected with PKCE): leave the secret empty." } },
    keyUrl: "https://resend.com/api-keys",
    help: "On resend.com: “API Keys” → “Create API Key”, with the “Full access” permission (the “Sending access” ones only send and "
      + "fail the connection test). Copy it: it is shown only once.",
    test: { path: "/domains", message: (d) => `${(d.data || []).length} domains in Resend` },
    examples: "Examples: POST /emails {\"from\": \"Example <hello@example.com>\", \"to\": [\"…\"], \"subject\": \"…\", \"html\": \"…\"}, "
      + "POST /emails/batch, GET /emails, GET /emails/{id}, GET /domains, GET /contacts, POST /contacts {\"email\": \"…\"}, "
      + "GET /segments, GET /broadcasts.",
  },
];
