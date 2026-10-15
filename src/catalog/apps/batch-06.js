// Batch 06 (from the Composio catalog): CRM, B2B prospecting, customer support and feedback (Close, Copper, Folk, ForceManager, Gorgias…).
import crypto from "node:crypto";
import { z } from "zod";
import { USER_AGENT, httpRequest } from "../../http.js";
import { ensureOk } from "../define.js";

// ForceManager (now Sage Sales Management) exchanges the public and private keys for a session token (X-Session-Key header).
// The token is kept in memory for a few minutes and renews itself.
const FORCEMANAGER_SERVERS = ["api.forcemanager.com", "sandbox-api.forcemanager.com"];
let forceManagerSession = null;
async function forceManagerToken(c) {
  const server = c.server || FORCEMANAGER_SERVERS[0];
  if (!FORCEMANAGER_SERVERS.includes(server)) throw new Error("ForceManager: the environment is not valid");
  const fingerprint = crypto.createHash("sha256").update(JSON.stringify([server, c.public_key, c.private_key])).digest("hex");
  if (forceManagerSession?.fingerprint === fingerprint && forceManagerSession.expires > Date.now()) return forceManagerSession.token;
  const d = ensureOk(await httpRequest(`https://${server}/api/v4/login`, { method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json", "User-Agent": USER_AGENT },
    body: JSON.stringify({ username: c.public_key, password: c.private_key }) }), "ForceManager");
  if (!d?.token) throw new Error("ForceManager: the login response does not include a token");
  forceManagerSession = { fingerprint, token: d.token, expires: Date.now() + 15 * 60_000 };
  return d.token;
}

export default [
  {
    id: "close", name: "Close", category: "crm", description: "CRM leads, contacts, opportunities, tasks and activities",
    website: "https://close.com", docs: "https://developer.close.com/", logo: { favicon: "https://close.com" },
    baseUrl: "https://api.close.com/api/v1",
    auth: { type: "basic", usernameField: "token", fixedPassword: "" },
    fields: [{ id: "token", label: "API key (api_…)", secret: true }],
    // One click: private Close OAuth app (only users in your organization can authorize it). Close requires an https:// redirect
    // URI and gives every app all.full_access (like API keys); without “offline_access” it returns no refresh token and access
    // would expire after an hour. Close rotates the refresh token on every refresh.
    oauth: { scopes: ["all.full_access", "offline_access"],
      provider: { name: "Close", key: "close", redirect: "https",
        authorizeUrl: "https://app.close.com/oauth2/authorize/", tokenUrl: "https://api.close.com/oauth2/token/",
        help: "1) In Close open “Settings” → “Developer” → “OAuth Apps” (app.close.com/settings/developer/oauth-apps) and click “Create "
          + "App”. 2) Name it “Conector” and add a short description, then paste the redirect URI shown below into “Redirect URL” "
          + "(Close only accepts https://). The terms and privacy links are optional for internal apps. 3) Click “Create” and copy the "
          + "“Client ID” and the “Client Secret”. The app is private: you do not need to publish it, but only users in your Close "
          + "organization can authorize it." },
      help: "Conector acts with all the permissions of the user who authorizes it (all.full_access), just like with an API key." },
    keyUrl: "https://app.close.com/settings/developer/api-keys/",
    help: "1) In Close open “Settings” → “Developer” → “API Keys” and create a new key. 2) Give it a name (e.g. Conector). "
      + "3) Copy the key (it starts with api_): it is shown only once. The key belongs to a specific user and organization and "
      + "acts with their permissions, so create it with a service account. The documentation does not mention plan restrictions.",
    test: { path: "/me/", account: (d) => d.email || [d.first_name, d.last_name].filter(Boolean).join(" ") },
    examples: "IDs have a prefix (lead_…, cont_…, oppo_…) and paths end in “/”. Examples: "
      + "GET /lead/?query=status:\"Potential\"&_limit=25, "
      + "POST /lead/ {\"name\": \"Acme Inc\", \"contacts\": [{\"name\": \"…\", \"emails\": [{\"email\": \"…\"}]}]}, "
      + "POST /activity/note/ {\"lead_id\": \"lead_…\", \"note\": \"…\"}, GET /opportunity/?_limit=50, GET /task/?is_complete=false.",
    tools: [
      { name: "close_search", title: "Close: search leads", annotations: { readOnlyHint: true },
        description: "Search leads by text (company, contact, email, phone…) or with Close's search syntax "
          + "(e.g. status:\"Potential\" or email_address:jane@example.com). Returns id, name, status, dates and contacts.",
        schema: { query: z.string().describe("Text or Close query, e.g. “acme” or status:\"Potential\""),
                   max: z.number().int().min(1).max(100).default(25),
                   skip: z.number().int().min(0).default(0).describe("Results to skip (pagination)") },
        async run({ query, max, skip }, p) {
          const d = ensureOk(await p({ path: "/lead/", query: { query: query, _limit: max, _skip: skip,
            _fields: "id,display_name,status_label,date_created,date_updated,url,contacts" } }), "Close");
          return { has_more: Boolean(d.has_more),
                   leads: (d.data || []).map((l) => ({ id: l.id, name: l.display_name, status: l.status_label, created: l.date_created,
                     updated: l.date_updated, url: l.url,
                     contacts: (l.contacts || []).map((c) => ({ name: c.name, title: c.title, emails: (c.emails || []).map((e) => e.email),
                       phones: (c.phones || []).map((t) => t.phone) })) })) };
        } },
    ],
  },
  {
    // In the Composio catalog this integration is called “Convolo ai”, but its tools (characters, voices, knowledge bank) use the
    // Convai API: Convolo.ai (now BrightCall) does not publish any API.
    id: "convai", name: "Convai", category: "ai", description: "Conversational AI characters: creation, voices and replies",
    website: "https://convai.com", docs: "https://docs.convai.com/api-docs/", logo: { favicon: "https://convai.com" },
    baseUrl: "https://api.convai.com",
    auth: { type: "header", name: "CONVAI-API-KEY" },
    fields: [{ id: "token", label: "Convai API key", secret: true }],
    help: "1) Sign in at convai.com and click the key icon (top right) to see your API key. 2) Copy it and paste it here. "
      + "3) The characters and voices API requires the Professional plan or higher (uploading files to the knowledge bank requires "
      + "Enterprise). In the Composio catalog this integration appears as “Convolo ai”, but it uses the Convai API.",
    test: { path: "/tts/get_available_voices", message: "API key is valid" },
    examples: "Examples: GET /tts/get_available_voices (available voices), POST /character/get {\"charID\": \"…\"}, "
      + "POST /character/create {\"charName\": \"…\", \"voiceType\": \"…\", \"backstory\": \"…\"}, "
      + "POST /character/update {\"charID\": \"…\", \"backstory\": \"…\"}.",
  },
  {
    id: "copper", name: "Copper", category: "crm", description: "CRM people, companies, opportunities, tasks and activities",
    website: "https://www.copper.com", docs: "https://developer.copper.com/", logo: { favicon: "https://www.copper.com" },
    baseUrl: "https://api.copper.com/developer_api/v1",
    headers: (c) => ({ "X-PW-Application": "developer_api", "X-PW-UserEmail": c.email, "Content-Type": "application/json" }),
    auth: { type: "header", name: "X-PW-AccessToken" },
    fields: [{ id: "email", label: "Copper user email", help: "The email of the user who generated the API key." },
             { id: "token", label: "API key", secret: true }],
    help: "1) In Copper open “Settings” → “Integrations” → “API Keys” and click “Generate API Key”. 2) Give it a name and copy it. "
      + "3) Also enter here the email of the Copper user who generated it: the API requires both values on every call and acts with "
      + "that user's permissions. Limit: 180 requests per minute. The documentation does not say which plans include the API.",
    test: { path: "/account", account: (d) => d.name },
    examples: "Searches are POST. Examples: GET /account, POST /people/search {\"page_size\": 25, \"sort_by\": \"date_modified\"}, "
      + "POST /people/fetch_by_email {\"email\": \"…\"}, POST /opportunities/search {\"page_size\": 25}, "
      + "POST /people {\"name\": \"…\", \"emails\": [{\"email\": \"…\", \"category\": \"work\"}]}.",
  },
  {
    id: "docsbot", name: "DocsBot AI", category: "ai", description: "AI chatbots trained on your documentation",
    website: "https://docsbot.ai", docs: "https://docsbot.ai/documentation/developer", logo: { favicon: "https://docsbot.ai" },
    baseUrl: "https://docsbot.ai/api", allowedOrigins: ["https://api.docsbot.ai"],
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://docsbot.ai/app/api",
    help: "1) In DocsBot open the “API Keys” section of the panel (docsbot.ai/app/api). 2) Copy your API key: it is shown only once, "
      + "and if you click “Change” the previous one stops working. 3) The key belongs to your user and works for all your teams. "
      + "The documentation does not say which plans include the API: if you do not see the section, your plan does not have it.",
    test: { path: "/teams", message: (d) => (Array.isArray(d) ? `${d.length} teams in DocsBot` : "API key is valid") },
    examples: "No trailing “/” in paths. Examples: GET /teams, GET /teams/{teamId}/bots, GET /teams/{teamId}/bots/{botId}, "
      + "GET /teams/{teamId}/bots/{botId}/sources?page=0&limit=100, PUT /teams/{teamId}/bots/{botId} (update a bot). "
      + "The chat APIs are at https://api.docsbot.ai/teams/….",
  },
  {
    id: "dropcontact", name: "Dropcontact", category: "crm",
    description: "Verify and enrich B2B contacts (emails and company data)",
    website: "https://www.dropcontact.com", docs: "https://developer.dropcontact.com/", logo: { favicon: "https://www.dropcontact.com" },
    baseUrl: "https://api.dropcontact.com/v1",
    auth: { type: "header", name: "X-Access-Token" },
    fields: [{ id: "token", label: "Access token (API key)", secret: true }],
    keyUrl: "https://app.dropcontact.com/api",
    help: "1) Sign in at app.dropcontact.com. 2) Open “Integration & API” in the side menu (app.dropcontact.com/api) and "
      + "copy your personal API key (the access token). 3) The API uses credits when enriching contacts and its documentation does not "
      + "say which plans include it: if you do not see the section, ask Dropcontact to enable it on your account.",
    // Dropcontact has no balance query: its documentation says a request with an empty contact returns credits_left without using
    // credits, and with an invalid token it responds 401.
    test: { method: "POST", path: "/enrich/all", body: { data: [{}] },
              message: (d) => (d?.credits_left === undefined ? "Token is valid" : `Token is valid · ${d.credits_left} credits`) },
    examples: "Enrichment is asynchronous and uses credits. Examples: POST /enrich/all {\"data\": [{\"first_name\": \"…\", "
      + "\"last_name\": \"…\", \"website\": \"example.com\"}], \"language\": \"en\"} (returns a request_id; max. 250 contacts), "
      + "GET /enrich/all/{request_id} (result; with ?forceResults=true it returns whatever is available), GET /enrich/webhook. "
      + "Balance without using credits: POST /enrich/all {\"data\": [{}]}.",
  },
  {
    id: "emelia", name: "Emelia", category: "crm", description: "B2B prospecting: cold email campaigns, lists and LinkedIn",
    website: "https://emelia.io", docs: "https://docs.emelia.io/", logo: { favicon: "https://emelia.io" },
    baseUrl: "https://api.emelia.io",
    auth: { type: "header", name: "Authorization" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://v3.emelia.io/settings/api",
    help: "1) In Emelia open “Settings” → “API” (v3.emelia.io/settings/api). 2) Generate or copy your API key (48 letters and digits). "
      + "3) Paste it here without the “Bearer” prefix. The documentation does not say which plans include the API: if you do not see "
      + "the section, your plan does not have it.",
    test: { path: "/advanced/campaigns",
              message: (d) => (Array.isArray(d?.campaigns) ? `API key is valid · ${d.campaigns.length} campaigns` : "API key is valid") },
    examples: "Examples: GET /advanced/campaigns (non-archived campaigns, no pagination), "
      + "GET /lists/list (contact lists), POST /lists/list/{listId}/contacts (add or update a contact), "
      + "POST /tools/verify/email {\"email\": \"…\"} (verify an email; 0.25 credits), GET /credits/usage.",
  },
  {
    id: "enrich", name: "Enrich (enrich.so)", category: "crm", description: "Professional emails, profiles and B2B leads, paid with credits",
    website: "https://enrich.so", docs: "https://doc.enrich.so/", logo: { favicon: "https://enrich.so" },
    baseUrl: "https://dev.enrich.so/api/v3",
    auth: { type: "header", name: "x-api-key" },
    fields: [{ id: "token", label: "API key (sk_live_…)", secret: true }],
    keyUrl: "https://dash.enrich.so/dashboard/api-keys",
    help: "1) Sign in at dash.enrich.so and open “API Keys” (dash.enrich.so/dashboard/api-keys). 2) Create a key and copy it (it starts "
      + "with sk_live_, 64 characters). 3) Queries use the organization's credits (finding an email, 10; validating it, 1), except "
      + "those that return no result. The documentation does not say which plans include the API.",
    test: { path: "/wallets/balance", message: (d) => `API key is valid · ${d?.data?.balance ?? "?"} credits` },
    examples: "They use credits (except when there is no result). Examples: GET /wallets/balance, GET /wallets/transactions?limit=20, "
      + "POST /email-finder {\"firstName\": \"…\", \"lastName\": \"…\", \"domain\": \"example.com\"} (10 credits), "
      + "POST /email-validation {\"email\": \"…\"} (1 credit), POST /lead-finder/count {…} (counts leads without returning them).",
  },
  {
    id: "espocrm", name: "EspoCRM", category: "crm", description: "Contacts, accounts, opportunities and cases in your EspoCRM",
    website: "https://www.espocrm.com", docs: "https://docs.espocrm.com/development/api/", logo: { favicon: "https://www.espocrm.com" },
    baseUrl: "{url}/api/v1",
    auth: { type: "header", name: "X-Api-Key" },
    fields: [{ id: "url", label: "Your EspoCRM address (https://…)", format: "url",
               help: "The address of your installation, without /api/v1 (e.g. https://crm.example.com)." },
             { id: "token", label: "API key of the API user", secret: true }],
    help: "1) In EspoCRM, as an administrator, open “Administration” → “API Users” and create a new API user. 2) Give it a name, "
      + "choose the “API Key” authentication method and assign it a role with the permissions you need (the API only sees what that "
      + "role allows). 3) Save and copy the API key shown on the user's record. "
      + "The HMAC method is not supported.",
    test: { path: "/App/user", account: (d) => d.user?.userName || d.user?.name },
    examples: "Examples: GET /Contact?maxSize=20&orderBy=createdAt&order=desc, "
      + "GET /Account?where[0][type]=contains&where[0][attribute]=name&where[0][value]=…, "
      + "POST /Lead {\"firstName\": \"…\", \"lastName\": \"…\", \"emailAddress\": \"…\"}, PUT /Opportunity/{id} {\"stage\": \"Closed Won\"}, "
      + "GET /Case?maxSize=20.",
  },
  {
    id: "extrovert", name: "Extrovert", category: "crm", description: "LinkedIn campaigns: prospects, comments and direct messages (DMs)",
    website: "https://www.goextrovert.com", docs: "https://api-docs.goextrovert.com/", logo: { favicon: "https://www.goextrovert.com" },
    baseUrl: "https://api.goextrovert.com/client/v2",
    auth: { type: "header", name: "x-api-key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://app.goextrovert.com/dashboard/settings/integrations",
    help: "1) In Extrovert open “Settings” → “Integrations” → “API keys” and click “Add API key”. 2) Copy the key: it is shown only "
      + "once (if you lose it, create another and delete the old one). 3) The API is included in the current Extrovert plan and in the "
      + "free trial; the old Light plan rejects it with a 403.",
    test: { path: "/workspace/get-current-plan-features", message: (d) => `API key is valid · plan ${d?.data?.planName ?? "?"}` },
    examples: "Many queries require ownerId (the user ID shown in /user/team-members). Examples: GET /user/team-members, "
      + "GET /campaign, GET /main-feed?ownerId=…&view=Need approval&limit=10 (comments pending approval), "
      + "GET /dm-conversations?ownerId=…&view=unread, GET /prospects/find-by-linkedin-url?url=https://www.linkedin.com/in/….",
  },
  {
    id: "findymail", name: "Findymail", category: "crm", description: "Find and verify professional emails, plus contact lists",
    website: "https://www.findymail.com", docs: "https://app.findymail.com/docs/", logo: { favicon: "https://www.findymail.com" },
    baseUrl: "https://app.findymail.com/api",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API token", secret: true }],
    keyUrl: "https://app.findymail.com/user/api-tokens",
    help: "1) In Findymail open the API tokens page (app.findymail.com/user/api-tokens). 2) Create a token, give it a name and "
      + "copy it. 3) Each search with a result uses one search credit and each verification uses one verification credit. The "
      + "documentation does not say which plans include the API.",
    test: { path: "/credits",
              message: (d) => `Token is valid · ${d?.credits ?? "?"} search credits, ${d?.verifier_credits ?? "?"} verification credits` },
    examples: "Examples: GET /credits, POST /search/name {\"name\": \"Jane Doe\", \"domain\": \"example.com\"} (1 credit if it finds a "
      + "verified email), POST /verify {\"email\": \"…\"} (1 verification credit), GET /lists.",
  },
  {
    id: "fireberry", name: "Fireberry", category: "crm", description: "CRM accounts, contacts, opportunities and queries",
    website: "https://www.fireberry.com", docs: "https://developers.fireberry.com/", logo: { favicon: "https://www.fireberry.com" },
    baseUrl: "https://api.fireberry.com/api",
    auth: { type: "header", name: "tokenid" },
    fields: [{ id: "token", label: "API access token", secret: true }],
    help: "1) In Fireberry click your profile picture (top right) → “Profile”. 2) Open the “Account Security” tab → “API Access "
      + "Token” and copy the token. 3) The token acts with your user's permissions (you only see the records you have access to), "
      + "so use a service user.",
    test: { path: "/record/account", query: { pagesize: 1 }, message: "Token is valid" },
    examples: "Max. 50 records per page and 10 pages; IDs are GUIDs. Examples: GET /record/account?pagesize=50&pagenumber=1, "
      + "GET /record/account/{id}, POST /query {\"objecttype\": 1, \"fields\": \"accountname,telephone1\", "
      + "\"query\": \"(accountname start-with 'Acme') AND (statuscode = 6)\", \"page_size\": 50} (1 = accounts), "
      + "POST /record/account {\"accountname\": \"…\", \"emailaddress1\": \"…\"}, PUT /record/account/{id} {\"telephone1\": \"…\"}.",
  },
  {
    id: "firmao", name: "Firmao", category: "crm", description: "CRM/ERP: customers, projects, tasks, transactions and products",
    website: "https://firmao.io", docs: "https://firmao.pl/wp-content/uploads/2026/05/API-Documentation_EN.pdf",
    logo: { favicon: "https://firmao.io" },
    baseUrl: "https://{server}/{organization}/svc/v1",
    auth: { type: "basic", usernameField: "username", passwordField: "token" },
    fields: [{ id: "server", label: "Firmao domain", default: "system.firmao.net",
               options: [["system.firmao.net", "system.firmao.net (international)"], ["system.firmao.pl", "system.firmao.pl (Poland)"]],
               help: "The domain you use to sign in to Firmao." },
             { id: "organization", label: "Organization ID", example: "12345",
               help: "The number shown in the URL after you sign in: https://system.firmao.net/12345/… → 12345." },
             { id: "username", label: "Firmao API user" },
             { id: "token", label: "Firmao API password", secret: true }],
    help: "1) In Firmao, as an administrator, open “Company” → “Settings” → “API settings” and enable the API. "
      + "2) Download or copy the API user and generate the API password (they differ from your account credentials). 3) The "
      + "organization ID is the number you see in the URL after signing in. Limit: 60 requests per minute, 5 at a time; plans also "
      + "have a daily usage limit.",
    test: { path: "/customers", query: { start: 0, limit: 1 }, message: "API credentials are valid" },
    examples: "Pagination with start and limit; filters such as field(contains)=text, field(eq)=value, field(ge)=value. Examples: "
      + "GET /customers?start=0&limit=50&name(contains)=acme, GET /customers/{id}, POST /customers {\"name\": \"…\", \"email\": \"…\"}, "
      + "GET /tasks?start=0&limit=50, GET /transactions?start=0&limit=20&sort=id&dir=DESC.",
  },
  {
    id: "folk", name: "folk", category: "crm", description: "People, companies and groups in the relationship CRM",
    website: "https://www.folk.app", docs: "https://developer.folk.app/", logo: { favicon: "https://www.folk.app" },
    baseUrl: "https://api.folk.app/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://app.folk.app/apps/contacts/network/settings/api-keys",
    help: "1) In folk open the workspace settings → “API” (app.folk.app/apps/contacts/network/settings/api-keys). "
      + "2) Click to create a key, give it a name and copy it. 3) The key acts with your user's permissions in that workspace. "
      + "The documentation does not say which plans include the API: if you do not see the section, your plan does not have it.",
    test: { path: "/users/me", account: (d) => d.data?.email || d.data?.fullName },
    examples: "Examples: GET /people?limit=20, GET /people/{personId}, POST /people {\"firstName\": \"…\", \"lastName\": \"…\", "
      + "\"emails\": [\"…\"]}, GET /companies?limit=20, GET /groups.",
  },
  {
    id: "followupboss", name: "Follow Up Boss", category: "crm",
    description: "Real estate CRM: people, events, tasks and deals",
    website: "https://www.followupboss.com", docs: "https://docs.followupboss.com/", logo: { favicon: "https://www.followupboss.com" },
    baseUrl: "https://api.followupboss.com/v1",
    // X-System and X-System-Key are only needed if the integration is registered with Follow Up Boss.
    headers: (c) => ({ ...(c.system && { "X-System": c.system }), ...(c.system_key && { "X-System-Key": c.system_key }) }),
    auth: { type: "basic", usernameField: "token", fixedPassword: "" },
    fields: [{ id: "token", label: "API key", secret: true },
             { id: "system", label: "X-System", optional: true,
               help: "Only if you have registered your integration with Follow Up Boss (api@followupboss.com): the system name." },
             { id: "system_key", label: "X-System-Key", secret: true, optional: true,
               help: "Only if you have registered your integration: the system key you were given." }],
    keyUrl: "https://app.followupboss.com/2/api",
    help: "1) In Follow Up Boss open “Admin” → “API” and click “Create API Key”. 2) Name it after the integration (e.g. Conector) and "
      + "copy it: it is not shown in full again. 3) The key gives access to all the account's data and has the permissions of the role "
      + "of the user who creates it; some accounts restrict who can create keys, in which case ask an administrator for one.",
    test: { path: "/me", account: (d) => d.email || d.name },
    examples: "Examples: GET /people?limit=25&offset=0, GET /people?email=…, "
      + "POST /events {\"source\": \"Web\", \"type\": \"General Inquiry\", "
      + "\"person\": {\"firstName\": \"…\", \"emails\": [{\"value\": \"…\"}]}} (the recommended way to create leads), "
      + "POST /notes {\"personId\": 1, \"body\": \"…\"}, GET /deals.",
  },
  {
    id: "forcemanager", name: "ForceManager (Sage Sales Management)", category: "crm",
    description: "Mobile CRM accounts, contacts, opportunities and activities",
    website: "https://www.sage.com/es-es/productos/sage-sales-management/", docs: "https://developer.forcemanager.com/",
    logo: { simpleIcons: "sage" },
    baseUrl: "https://{server}/api/v4",
    auth: { type: "custom", apply: async (c) => ({ headers: { "X-Session-Key": await forceManagerToken(c) } }) },
    fields: [{ id: "public_key", label: "Public API key", secret: true },
             { id: "private_key", label: "Private API key", secret: true },
             { id: "server", label: "Environment", default: "api.forcemanager.com",
               options: [["api.forcemanager.com", "Production"], ["sandbox-api.forcemanager.com", "Sandbox (testing)"]] }],
    help: "1) As an administrator, sign in to the ForceManager (Sage Sales Management) web app and open “Settings” → “Integrations” → "
      + "“API key” (it is also in ForceAdmin, “Password” section). 2) Copy the public and the private key. 3) Conector exchanges them "
      + "for a session token and renews it automatically. The Sandbox environment (created from ForceAdmin → “Sandbox”) has its own keys.",
    test: { path: "/currencies", headers: { "X-FM-Entity-Count": "1" }, message: "API keys are valid" },
    examples: "Paginate with “page” (starts at 0) and set the page size with the X-FM-Entity-Count header (50 by default); SQL filters with “where”. "
      + "Examples: GET /accounts?page=0, GET /accounts/{id}, POST /accounts {\"name\": \"…\"}, GET /opportunities?page=0, "
      + "GET /activities?page=0.",
  },
  {
    id: "formilla", name: "Formilla", category: "support", description: "Live chat: create and update contacts via API",
    website: "https://www.formilla.com", docs: "https://blog.formilla.com/integrate-customer-data-with-the-formilla-rest-api/",
    logo: { favicon: "https://www.formilla.com" },
    baseUrl: "https://api.formilla.com/api",
    auth: { type: "header", name: "formilla_auth_token" },
    fields: [{ id: "token", label: "REST API token", secret: true }],
    help: "1) In the Formilla panel open the “Security” page. 2) Enable the REST API (it is disabled by default) and copy the token "
      + "that Formilla generates for your account. 3) It does not work if you use Formilla on a Wix site. If a 403 appears when saving, "
      + "the token is not valid or the API is not enabled.",
    // Formilla's public API only documents POST /contacts, with no read query. The test sends an empty contact: with a valid token
    // Formilla rejects it with a 400 (missing UserId or Email) without creating anything; with a fake token it responds 403.
    test: { method: "POST", path: "/contacts", body: {}, acceptStatus: [400], message: "Token is valid" },
    examples: "Only one endpoint is documented (max. 40 requests every 5 seconds): POST /contacts {\"UserId\": \"100\", "
      + "\"Email\": \"customer@example.com\", \"FirstName\": \"Jane\", \"LastName\": \"Doe\", \"Phone\": \"+15555550100\", "
      + "\"CustomAttributes\": {\"Plan\": \"Premium\"}} creates the contact or, if it already exists (matched first by UserId, then by Email), "
      + "overwrites its data. UserId or Email is required.",
  },
  {
    id: "fullenrich", name: "FullEnrich", category: "crm",
    description: "Verified emails and phones for B2B contacts (enrichment)",
    website: "https://fullenrich.com", docs: "https://docs.fullenrich.com/", logo: { favicon: "https://fullenrich.com" },
    baseUrl: "https://app.fullenrich.com/api/v2",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://app.fullenrich.com/app/api",
    help: "1) In FullEnrich open the API page (app.fullenrich.com/app/api). 2) Create an API key and copy it (you can set a credit "
      + "usage limit on it). 3) The key uses your workspace's credits when enriching or searching. The documentation "
      + "does not say which plans include the API.",
    test: { path: "/account/credits", message: (d) => `API key is valid · ${d?.balance ?? "?"} credits` },
    examples: "They use credits. Examples: GET /account/credits, GET /account/keys/verify, "
      + "POST /contact/enrich/bulk {\"name\": \"Batch\", \"data\": [{\"first_name\": \"…\", \"last_name\": \"…\", \"domain\": \"example.com\", "
      + "\"enrich_fields\": [\"contact.work_emails\"]}]} (asynchronous: returns an id), GET /contact/enrich/bulk/{enrichment_id} (result), "
      + "POST /people/search. v1 is still available with the full URL https://app.fullenrich.com/api/v1/….",
  },
  {
    id: "fuseai", name: "FuseAI", category: "crm", description: "AI prospecting: lists, campaigns, agents and analytics",
    website: "https://fuseai.com", docs: "https://docs.fuseai.com/", logo: { favicon: "https://fuseai.com" },
    baseUrl: "https://api.tryfuse.ai/api/v1",
    auth: { type: "basic", usernameField: "token", fixedPassword: "" },
    fields: [{ id: "token", label: "API key (af_…)", secret: true }],
    help: "1) In the Fuse app open “Settings” → “API Cockpit” and click “Create New Key”. 2) Copy the key (it starts with af_): the full "
      + "version is shown only once. 3) Keys created there have all permissions; actions that use credits are charged "
      + "as on the web. The documentation does not say which plans include the API.",
    test: { path: "/business/me", account: (d) => d.user?.email || d.user?.name },
    examples: "Examples: GET /business/me, GET /business/credits, GET /business/lists, GET /business/campaigns, "
      + "POST /business/prospects/search (long jobs return 202 with an id you can query at GET /business/jobs/{jobId}).",
  },
  {
    id: "fusedesk", name: "FuseDesk", category: "support", description: "Cases, emails, contacts, departments and representatives",
    website: "https://www.fusedesk.com", docs: "https://www.fusedesk.com/api/", logo: { favicon: "https://www.fusedesk.com" },
    baseUrl: "https://{subdomain}.fusedesk.com/api/v1",
    auth: { type: "header", name: "X-FuseDesk-API-Key" },
    fields: [{ id: "subdomain", label: "Your FuseDesk app name", format: "subdomain",
               help: "If you sign in at https://mycompany.fusedesk.com, enter “mycompany”." },
             { id: "token", label: "API key", secret: true }],
    help: "1) In FuseDesk, as an administrator, open the “API Keys” page of your app. 2) Create a key (FuseDesk recommends one per "
      + "external application) and copy it. 3) Enter in “Your FuseDesk app name” whatever comes before .fusedesk.com in your address. "
      + "The FuseDesk API responds 200 even when there is an error: Conector detects it.",
    // FuseDesk always answers 200 and reports errors in the JSON ({"error": "...", "errorcode": "..."}).
    test: { path: "/departments/", message: "API key is valid",
              validate: (d) => { if (d?.error) throw new Error(`FuseDesk: ${d.error}`); } },
    examples: "Paths end in “/”. Examples: GET /departments/, GET /reps/, GET /cases/ (case search), GET /cases/{id}/, "
      + "POST /cases/ (create a case).",
  },
  {
    id: "gatherup", name: "GatherUp", category: "crm", description: "Customer reviews: businesses, surveys and feedback",
    website: "https://gatherup.com", docs: "https://apidocs.gatherup.com/view/metadata/TzmCiYzP", logo: { favicon: "https://gatherup.com" },
    baseUrl: "https://app.gatherup.com/api/v2",
    auth: [{ type: "bearer" }, { type: "query", name: "clientId", field: "client_id" }],
    fields: [{ id: "token", label: "API Bearer token", secret: true },
             { id: "client_id", label: "API Client ID", secret: true }],
    help: "1) In GatherUp, with the account owner user, open “Account Owner Details” and copy the Bearer token and the Client ID "
      + "(the “GatherUp API Client ID, Private Key and Bearer Token” article in its help center explains it). 2) Agency accounts "
      + "have account-wide credentials and separate ones per client: with the agency credentials, add the agent parameter with the "
      + "client ID. 3) Limit: 5 requests per second.",
    test: { path: "/businesses/get", message: "API credentials are valid" },
    examples: "The clientId is added to the URL automatically; for POST/PUT/DELETE calls GatherUp expects it in the body. Examples: "
      + "GET /businesses/get, GET /businesses/get?agent=25271 (with agency credentials), GET /feedbacks/get?businessId=…, "
      + "POST /customer/create (create a customer to ask for feedback).",
  },
  {
    id: "getprospect", name: "GetProspect", category: "crm", description: "Find and verify professional emails; contacts and lists",
    website: "https://getprospect.com", docs: "https://getprospect.readme.io/", logo: { favicon: "https://getprospect.com" },
    baseUrl: "https://api.getprospect.com",
    auth: { type: "header", name: "apiKey" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://app.getprospect.com/settings/api",
    help: "1) In GetProspect open your account settings → “API” section. 2) Click “New Key”, give it a name and copy it. 3) Finding or "
      + "verifying an email uses credits, as on the web. The documentation does not say which plans include the API: if you do not "
      + "see the section, your plan does not have it.",
    test: { path: "/api/v1/properties", message: "API key is valid" },
    examples: "Examples: GET /public/v1/email/find?name=Jane Doe&company=example.com (finds the email; uses credits), "
      + "GET /public/v1/email/verify?email=… (verify), GET /api/v1/contacts/lists?pageNumber=1&pageSize=50, "
      + "POST /api/v1/contacts/contact/search {…}, GET /api/v1/properties.",
  },
  {
    id: "gleap", name: "Gleap", category: "support", description: "Feedback and support: pipelines, companies, contacts and events",
    website: "https://www.gleap.ai", docs: "https://docs.gleap.ai/documentation/server/rest-api", logo: { favicon: "https://www.gleap.ai" },
    baseUrl: "https://{server}",
    auth: { type: "header", name: "Api-Token" },
    fields: [{ id: "token", label: "Project API secret token", secret: true },
             { id: "server", label: "Project region", default: "api.gleap.io",
               options: [["api.gleap.io", "EU (default)"], ["api.us.gleap.ai", "US"]],
               help: "Tokens only work in the region where the project is." }],
    help: "1) In Gleap open the project settings → “API token” and copy the secret token (there is one per project). 2) Choose the "
      + "project region: EU or US. 3) The free plan does not include API access.",
    test: { path: "/admin/pipelines", message: "API token is valid" },
    examples: "Documented: GET /admin/pipelines, GET /admin/companies/{companyId}, GET /admin/pipelines/{pipelineId}/contacts/{userId}, "
      + "POST /admin/identify (create or update a contact), POST /admin/track (record an event).",
  },
  {
    id: "godial", name: "GoDial", category: "crm", description: "Mobile CRM and auto-dialer: teams, lists and contacts",
    website: "https://godial.cc", docs: "https://godial.stoplight.io/", logo: { favicon: "https://godial.cc" },
    baseUrl: "https://enterprise.godial.cc/meta/api",
    auth: { type: "query", name: "access_token" },
    fields: [{ id: "token", label: "External API token", secret: true }],
    help: "1) In GoDial (app.godial.cc) open “Dashboard” → “Integration” → “External API”. 2) Copy the token shown. 3) The token "
      + "identifies your company and gives access to its teams, lists and contacts. When the token is not valid, GoDial responds with a "
      + "500 “Unauthenticated” error instead of a 401.",
    test: { path: "/externals/team/list", message: "Token is valid" },
    examples: "Examples: GET /externals/team/list (teams), GET /externals/lists/list (contact lists), "
      + "GET /externals/contact/list/{listId} (contacts in a list), POST /externals/contact/add (add a contact to a list), "
      + "POST /externals/lists/add (create a list for a team).",
  },
  {
    id: "gorgias", name: "Gorgias", category: "support", description: "E-commerce helpdesk: tickets, customers, messages, macros and rules",
    website: "https://www.gorgias.com", docs: "https://developers.gorgias.com/", logo: { favicon: "https://www.gorgias.com" },
    baseUrl: "https://{subdomain}.gorgias.com/api",
    auth: { type: "basic", usernameField: "email", passwordField: "token" },
    fields: [{ id: "subdomain", label: "Gorgias subdomain", format: "subdomain",
               help: "If you sign in at https://mystore.gorgias.com, enter “mystore”." },
             { id: "email", label: "Your Gorgias user email" },
             { id: "token", label: "API key", secret: true }],
    help: "1) In Gorgias, as an administrator, open “Settings” (gear icon at the bottom left) → “Account” → “REST API” (in some "
      + "accounts, “Advanced” → “REST API”): the base URL, the username (your email) and the API key (the password) appear there. 2) Copy "
      + "the key; “Reset” generates a new one and the previous one stops working. 3) Enter here that user's email and the subdomain (whatever "
      + "comes before .gorgias.com). Approximate limit: 40 requests every 20 seconds.",
    test: { path: "/account", account: (d) => d.domain },
    examples: "Examples: GET /tickets?limit=30&order_by=created_datetime:desc, GET /tickets/{id}, POST /tickets {…}, "
      + "GET /customers?email=…, GET /users.",
  },
];
