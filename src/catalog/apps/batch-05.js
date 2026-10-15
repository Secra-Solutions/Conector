// Batch 05 of the catalog: CRM, B2B prospecting, sales proposals and chatbots (AccuLynx to Clearout).
import crypto from "node:crypto";
import { USER_AGENT, httpRequest } from "../../http.js";
import { ensureOk } from "../define.js";

// AgencyZoom has no API keys: you sign in with a user's email and password and get a JWT. It is kept in memory until shortly
// before it expires (with version=2 the login returns expiresIn, in seconds).
let agencyZoomSession = null;
async function agencyZoomJwt(c) {
  const fingerprint = crypto.createHash("sha256").update(JSON.stringify([c.username, c.key])).digest("hex");
  if (agencyZoomSession?.fingerprint === fingerprint && agencyZoomSession.expires > Date.now() + 60_000) return agencyZoomSession.jwt;
  const d = ensureOk(await httpRequest("https://api.agencyzoom.com/v1/api/auth/login", { method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json", "User-Agent": USER_AGENT },
    body: JSON.stringify({ username: c.username, password: c.key, version: 2 }) }), "AgencyZoom");
  if (!d?.jwt) throw new Error("AgencyZoom: the login response does not include a token");
  agencyZoomSession = { fingerprint, jwt: d.jwt, expires: Date.now() + Math.min(Number(d.expiresIn) || 600, 3000) * 1000 };
  return d.jwt;
}

export default [
  {
    id: "acculynx", name: "AccuLynx", category: "crm", description: "Jobs, contacts, estimates and calendars in AccuLynx",
    website: "https://acculynx.com", docs: "https://apidocs.acculynx.com", logo: { favicon: "https://acculynx.com" },
    baseUrl: "https://api.acculynx.com/api/v2",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "AccuLynx API key", secret: true }],
    help: "1) In AccuLynx, as a company or location administrator: gear icon next to your name → “Account Settings” → "
      + "“Add-On Features and Integrations” → “API Keys” → “Create Key”. 2) Name it and copy it: it is not shown again. "
      + "3) Each key works for one location only (create one per office). Depending on your plan, you may need to enable the "
      + "AppConnections add-on in the AccuLynx Market.",
    test: { path: "/company-settings", account: (d) => d.name },
    examples: "Examples: GET /jobs?pageSize=25 (supports startDate and endDate), GET /jobs/{jobId}, GET /contacts?pageSize=25, "
      + "POST /contacts/search, GET /estimates, GET /users?pageSize=25. Paginate with pageSize and pageStartIndex.",
  },
  {
    id: "aeroleads", name: "Aeroleads", category: "crm", description: "Find B2B emails and phone numbers from LinkedIn or by company",
    website: "https://aeroleads.com", docs: "https://aeroleads.com/api_docs", logo: { favicon: "https://aeroleads.com" },
    baseUrl: "https://aeroleads.com",
    auth: { type: "query", name: "api_key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) Sign in at aeroleads.com and open the “Settings” page of your account: your API key is shown there. 2) Copy it. "
      + "Lookups use credits from your plan and, when they run out, the API responds 402. 3) Aeroleads has no endpoint to query the "
      + "account: the connection test looks up a nonexistent domain, so it should not use credits.",
    test: { path: "/apis/details", query: { first_name: "Test", last_name: "Check", company_url: "nonexistent-domain.invalid" },
              acceptStatus: [400, 402, 404, 422], message: "API key accepted" },
    examples: "The key is added automatically as the api_key parameter. Examples: "
      + "GET /apis/details?first_name=…&last_name=…&company_url=example.com (finds the work email), "
      + "GET /api/get_linkedin_details?linkedin_url=https://www.linkedin.com/in/username (name, title, company, emails and phone numbers). "
      + "Each lookup that returns a result uses credits. Errors from /api/… come with HTTP 200 and a status field in the body.",
  },
  {
    id: "affinity", name: "Affinity", category: "crm", description: "Relationship CRM: companies, people, lists and opportunities",
    website: "https://www.affinity.co", docs: "https://developer.affinity.co", logo: { favicon: "https://www.affinity.co" },
    baseUrl: "https://api.affinity.co",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    // One click: Affinity "second-party" OAuth app (an administrator creates it in their own organization and only its users
    // authorize it). It is early access and requires the Scale, Advanced or Enterprise plan. Both the confidential type (secret
    // in the form) and the public type (PKCE only, which Conector always sends) work. Access lasts 1 day and the refresh token
    // 90; "offline_access" keeps the token alive when the user signs out of Affinity.
    oauth: { scopes: ["api", "offline_access"],
      provider: { name: "Affinity", key: "affinity", redirect: "localhost",
        authorizeUrl: "https://login.affinity.co/auth/oauth2/authorize", tokenUrl: "https://login.affinity.co/auth/oauth2/token",
        help: "1) An administrator opens “Settings” → “Manage Apps” in Affinity and clicks “New App” → “OAuth App” (if you do not see "
          + "it, early access is not enabled: ask your Affinity contact to enable it; the Scale, Advanced or Enterprise plan is "
          + "required). 2) Name it “Conector” and add a description, choose the type “Confidential”, enter the redirect URI shown "
          + "below in “Redirect URI” and select the permissions (scopes) shown below. 3) Click “Create” and copy the “Client "
          + "ID” and the “Client secret”: the secret is shown only once (if you lose it, delete the app and create another)." },
      help: "Only users in your Affinity organization can authorize the app, and Conector acts with their permissions." },
    help: "1) In Affinity: “Settings” → “Manage Apps” (under Developer Tools) → create an app and copy the key shown when you create "
      + "it: it is not shown again. 2) You need the “Generate an API key” permission, which an Affinity administrator grants (or ask "
      + "one to create the key for you). 3) The API is only available on certain Affinity license types: check with your "
      + "administrator.",
    test: { path: "/v2/auth/whoami",
              account: (d) => [d.user?.email, d.tenant?.name || d.organization?.name].filter(Boolean).join(" · ") },
    examples: "API v2 lives under /v2 and v1 at the root; the same key works for both. v2: GET /v2/companies?limit=20, "
      + "GET /v2/persons?limit=20, GET /v2/lists/{listId}/list-entries, GET /v2/opportunities, POST /v2/notes (to paginate, use "
      + "pagination.nextUrl from the response). v1: GET /organizations?term=company, GET /persons?term=name.",
  },
  {
    id: "agencyzoom", name: "AgencyZoom", category: "crm", description: "Leads, customers, policies and tasks for insurance agencies",
    website: "https://agencyzoom.com", docs: "https://app.agencyzoom.com/openapi/", logo: { favicon: "https://agencyzoom.com" },
    baseUrl: "https://api.agencyzoom.com",
    auth: { type: "custom", apply: async (c) => ({ headers: { Authorization: `Bearer ${await agencyZoomJwt(c)}` } }) },
    fields: [{ id: "username", label: "Email you use to sign in to AgencyZoom" },
             { id: "key", label: "Password", secret: true }],
    help: "1) AgencyZoom has no API keys: Conector signs in with a user's email and password and renews the token on its own. "
      + "2) The API has the same permissions as that user: use the agency owner to access everything, or a user with fewer "
      + "permissions to limit access. 3) The documentation does not require a specific plan. Limit: 120 calls "
      + "per minute.",
    test: { path: "/v1/api/employees", account: (_, c) => c.username },
    examples: "Examples: GET /v1/api/employees, GET /v1/api/pipelines-and-stages, "
      + "POST /v1/api/leads/list {\"page\": 0, \"pageSize\": 20}, POST /v1/api/customers {\"page\": 0, \"pageSize\": 20}, "
      + "POST /v1/api/tasks/list {\"page\": 0, \"pageSize\": 20}, POST /v1/api/leads/create. Searches are POST requests with "
      + "pagination in the body (page starts at 0).",
  },
  {
    id: "agilecrm", name: "Agile CRM", category: "crm", description: "Contacts, deals, tasks and campaigns in Agile CRM",
    website: "https://www.agilecrm.com", docs: "https://github.com/agilecrm/rest-api", logo: { favicon: "https://www.agilecrm.com" },
    baseUrl: "https://{domain}.agilecrm.com/dev",
    auth: { type: "basic", usernameField: "username", passwordField: "token" },
    fields: [{ id: "domain", label: "Your account domain (the part before .agilecrm.com)", format: "subdomain" },
             { id: "username", label: "Email you use to sign in to Agile CRM" },
             { id: "token", label: "REST API key", secret: true }],
    help: "1) In Agile CRM: “Admin Settings” → “API & Analytics” → “API Key” and copy the first key, the “REST API” one. 2) Also "
      + "enter your account domain (the part before .agilecrm.com) and the email you sign in with. 3) The documentation does not "
      + "require a specific plan: if you do not see “API & Analytics”, ask an administrator to give you access.",
    test: { path: "/api/contacts", query: { page_size: 1 }, account: (_, c) => c.username },
    examples: "Examples: GET /api/contacts?page_size=20 (paginate with the cursor of the last contact), "
      + "GET /api/contacts/search/email/{email}, POST /api/contacts {\"properties\": [{\"type\": \"SYSTEM\", \"name\": \"email\", "
      + "\"value\": \"…\"}]}, GET /api/opportunity?page_size=20, GET /api/tasks/pending/7, GET /api/contacts/{id}/notes.",
  },
  {
    id: "autobound", name: "Autobound", category: "crm", description: "Sales signals and personalized sales content with AI",
    website: "https://www.autobound.ai", docs: "https://autobound-api.readme.io/reference", logo: { favicon: "https://www.autobound.ai" },
    baseUrl: "https://signals.autobound.ai/v1", allowedOrigins: ["https://api.autobound.ai"],
    auth: { type: "header", name: "X-API-KEY" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) Create the key in the Autobound console (signalapi.autobound.ai, keys section) or request it from support@autobound.ai. "
      + "2) To generate content, Autobound also offers keys at app2.autobound.ai/settings/api-keys; if your key is only of that "
      + "type, the connection test (which uses the Signal API) may return 401 even though the key works. 3) The API uses credits "
      + "from your account; checking the account and the cost table is free.",
    test: { path: "/account",
              account: (d) => [d.customer_name, d.credits?.balance != null && `${d.credits.balance} credits`].filter(Boolean).join(" · ") },
    examples: "Signal API (https://signals.autobound.ai/v1): GET /account (free), GET /credits/costs (price of each endpoint, free), "
      + "GET /credits, POST /buyer-intent/contacts. Generate personalized content (uses credits): "
      + "POST https://api.autobound.ai/api/external/generate-content/v3.6 {\"contentType\": \"email\", \"contactEmail\": \"…\", "
      + "\"userEmail\": \"…\"}.",
  },
  {
    id: "betterproposals", name: "Better Proposals", category: "crm",
    description: "Sales proposals: status, templates and companies",
    website: "https://betterproposals.io", docs: "https://betterproposals.io/resources/api/", logo: { favicon: "https://betterproposals.io" },
    baseUrl: "https://api.betterproposals.io",
    auth: { type: "header", name: "Bptoken" },
    fields: [{ id: "token", label: "API token", secret: true }],
    keyUrl: "https://betterproposals.io/2/integrations/api/",
    help: "1) Sign in to Better Proposals and open betterproposals.io/2/integrations/api/ (“Integrations” menu → “API”). 2) Click "
      + "“Generate API Key” and copy the token; if you regenerate it, the previous one stops working. 3) The documentation does "
      + "not require a specific plan: if you do not see the API section, check that your plan includes integrations.",
    test: { path: "/settings", message: "API token is valid",
              validate: (d) => { if (d?.status === "error") throw new Error(d.message || "Better Proposals rejects the token"); } },
    examples: "Responses look like {\"status\": \"success\", \"data\": …}. Examples: GET /proposal (all), GET /proposal/sent, "
      + "GET /proposal/signed, GET /proposal/{id}, GET /template, GET /company, POST /proposal/create.",
  },
  {
    id: "bettercontact", name: "BetterContact", category: "crm",
    description: "Enrich lead emails and phone numbers with waterfall search",
    website: "https://bettercontact.rocks", docs: "https://doc.bettercontact.rocks", logo: { favicon: "https://bettercontact.rocks" },
    baseUrl: "https://app.bettercontact.rocks/api/v2",
    auth: { type: "header", name: "X-API-Key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://app.bettercontact.rocks/api_requests",
    help: "1) Sign in at app.bettercontact.rocks and open the API page (app.bettercontact.rocks/api_requests): your key is there. "
      + "2) Copy it. The credit balance belongs to the whole organization, not to each key. 3) Enrichments and searches use "
      + "credits; checking the balance is free and does not count toward the request limit (100 per minute on small plans and "
      + "200 on Pro).",
    test: { path: "/account", account: (d) => d.email && `${d.email} · ${d.credits_left} credits` },
    examples: "Examples: GET /account (balance, free), POST /async {\"data\": [{\"first_name\": \"…\", \"last_name\": \"…\", "
      + "\"company_domain\": \"…\"}]} (up to 100 leads; uses credits), GET /async/{request_id} (results), "
      + "POST /lead_finder/async and GET /lead_finder/async/{request_id}, POST /enrich_profile/lead.",
  },
  {
    id: "bidsketch", name: "Bidsketch", category: "crm", description: "Proposals, clients, sections and fees in Bidsketch",
    website: "https://www.bidsketch.com", docs: "https://github.com/Bidsketch/bidsketch-api", logo: { favicon: "https://www.bidsketch.com" },
    baseUrl: "https://bidsketch.com/api/v1",
    auth: { type: "custom", apply: (c) => ({ headers: { Authorization: `Token token="${c.token}"` } }) },
    fields: [{ id: "token", label: "API token", secret: true }],
    help: "1) In Bidsketch, as the account administrator: “Account Settings” → “API & Integration” tab (or go straight to "
      + "your-account.bidsketch.com/account/api_tokens) → button to create an API token. 2) Copy it and paste it here; you can "
      + "disable it from the same screen. 3) The documentation does not require a specific plan. Limit: 100 requests every 20 seconds.",
    test: { path: "/clients.json", query: { per_page: 1 }, message: "API token is valid" },
    examples: "All paths end in .json and are paginated with page and per_page (maximum 100). Examples: GET /clients.json, "
      + "GET /proposals.json?per_page=20, GET /proposals/{id}.json, GET /proposals/{id}/stats.json, GET /sections.json, "
      + "GET /templates.json.",
  },
  {
    id: "blitzapi", name: "Blitz API", category: "crm", description: "Search people and companies and enrich B2B contacts",
    website: "https://www.blitz-api.ai", docs: "https://docs.blitz-api.ai", logo: { favicon: "https://www.blitz-api.ai" },
    baseUrl: "https://api.blitz-api.ai",
    auth: { type: "header", name: "x-api-key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) Sign in to the BlitzAPI dashboard (app.blitz-api.ai) and open the API keys section: copy yours or create another. "
      + "2) The API is included in all paid plans (from Start). 3) Searches and enrichments use records from the "
      + "plan; checking the key is free.",
    test: { path: "/v2/account/key-info",
              validate: (d) => { if (d?.valid === false) throw new Error("BlitzAPI says the key is not valid"); },
              message: (d) => (d?.active_plans?.[0]?.name
                ? `Key is valid: plan ${d.active_plans[0].name}, ${d.records_remaining} records available` : "API key is valid") },
    examples: "Almost everything is POST with a JSON body. Examples: GET /v2/account/key-info (free), "
      + "POST /v2/enrichment/email {\"person_linkedin_url\": \"https://www.linkedin.com/in/…\"}, "
      + "POST /v2/enrichment/person {\"person_linkedin_url\": \"…\"}, POST /v2/enrichment/company {\"company_linkedin_url\": \"…\"}, "
      + "POST /v2/enrichment/domain-to-linkedin {\"domain\": \"example.com\"}, "
      + "POST /v2/search/employee-finder {\"company_linkedin_url\": \"…\", \"max_results\": 10}.",
  },
  {
    id: "bolna", name: "Bolna", category: "ai", description: "AI voice agents: calls, executions and phone numbers",
    website: "https://www.bolna.ai", docs: "https://www.bolna.ai/docs/api-reference/introduction", logo: { favicon: "https://www.bolna.ai" },
    baseUrl: "https://api.bolna.ai",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "Bolna API key", secret: true }],
    keyUrl: "https://platform.bolna.ai/developers",
    help: "1) Sign in at platform.bolna.ai, expand “Developers” in the side menu and open “API Keys” (platform.bolna.ai/developers). "
      + "2) Generate a key and copy it: it is shown only once (if you lose it, delete it and create another). 3) Agents and calls "
      + "use balance from your Bolna wallet; checking the account is free.",
    test: { path: "/user/me", account: (d) => d.email || d.name },
    examples: "Examples: GET /user/me (balance and concurrency), GET /v2/agent/all, GET /executions/{execution_id} (status, transcript "
      + "and cost of a call), GET /phone-numbers/all, POST /call {\"agent_id\": \"…\", \"recipient_phone_number\": \"+14155550100\"} "
      + "(makes a real call and uses balance).",
  },
  {
    id: "botdog", name: "Botdog", category: "crm", description: "LinkedIn campaigns: leads, statistics and analytics",
    website: "https://www.botdog.co", docs: "https://docs.botdog.co", logo: { favicon: "https://www.botdog.co" },
    baseUrl: "https://api.botdog.co",
    auth: { type: "header", name: "x-api-key" },
    fields: [{ id: "token", label: "API key (bd_live_…)", secret: true }],
    keyUrl: "https://app.botdog.co/settings/integrations/api",
    help: "1) In the Botdog dashboard (app.botdog.co) open “API keys” and click to create a key. 2) Copy it: it starts with bd_live_ and "
      + "gives access to the campaigns and leads in your workspace. 3) API access usually requires the Botdog Professional plan. "
      + "Usage limits apply per key.",
    test: { path: "/v1/teams/me", account: (d) => d.name },
    examples: "The full reference is at https://api.botdog.co/docs. Examples: GET /v1/campaigns, GET /v1/campaigns/{id}/statistics, "
      + "GET /v1/campaigns/{id}/leads, GET /v1/analytics, POST /v1/leads/add_to_campaign (adds 1 to 100 leads to a campaign), "
      + "POST /v1/campaigns/{id}/pause.",
  },
  {
    id: "botpenguin", name: "BotPenguin", category: "support", description: "Chatbots: inbox contacts, segments and WhatsApp",
    website: "https://botpenguin.com", docs: "https://help.botpenguin.com/api-documentation", logo: { favicon: "https://botpenguin.com" },
    baseUrl: "https://api.v7.botpenguin.com", headers: { authtype: "Key" },
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API access token", secret: true }],
    help: "1) In BotPenguin: side menu “More” → “Developer” → second tab, “API Access Token”. 2) Copy the token shown: "
      + "there is only one per user and it works for all your bots (“Revoke API Token” generates a new one and invalidates the "
      + "previous one). 3) The documentation does not require a specific plan; if you do not see the tab, write to support@botpenguin.com.",
    test: { path: "/inbox/segments", message: "Access token is valid" },
    examples: "Conector already sends the authtype: Key header. Examples: GET /inbox/segments (contact groups), "
      + "POST /inbox/users {\"searchText\": \"\", \"tags\": [], \"status\": [], \"page\": 1, \"isContact\": true, "
      + "\"userInteracted\": true, \"applicableFilters\": [\"userInteracted\"], …} (inbox contacts: send all the "
      + "filter fields, empty if unused), POST /inbox/users/import, PUT /inbox/users/{id}, "
      + "POST /whatsapp-automation/wa/send-message.",
  },
  {
    id: "botsonic", name: "Botsonic", category: "support", description: "AI chatbots: bots, conversations, FAQs and answers",
    website: "https://botsonic.com", docs: "https://docs.botsonic.com/docs/rest-api", logo: { favicon: "https://botsonic.com" },
    baseUrl: "https://api.botsonic.ai",
    auth: [{ type: "header", name: "USER-API-KEY" },
           { type: "header", name: "X-BOT-KEY", field: "bot" },
           { type: "header", name: "token", field: "bot" }],
    fields: [{ id: "token", label: "User API key (USER-API-KEY)", secret: true },
             { id: "bot", label: "Bot API token (optional)", secret: true, optional: true,
               help: "Only needed to read that bot's conversations and FAQs or to generate answers with it." }],
    help: "1) User key: in Botsonic open the user menu → “API Dashboard” → “Tokens” (on some accounts, “API” in the side "
      + "menu → “Create new Secret key”) and create the key. Copy it: it is not shown again. 2) Bot token (optional): open the bot → "
      + "“Share” → “API Token”; it works for its conversations, its FAQs and answer generation. 3) Both keys require "
      + "Business access (Business plan). Botsonic responds 404 when a key is not valid.",
    test: { path: "/v1/business/bot/all", query: { size: 1 }, message: "API key is valid" },
    examples: "With the user key: GET /v1/business/bot/all, GET /v1/business/bot/{bot_id}. With the bot token (optional field): "
      + "GET /v1/business/bot-data/conversations/all?size=20, GET /v1/business/bot-data/conversations/{chat_id}, "
      + "GET /v1/business/bot-faq/all, POST /v1/botsonic/generate (generates a bot answer).",
  },
  {
    id: "botstar", name: "BotStar", category: "support", description: "BotStar chatbots: bots, users, CMS entities and messages",
    website: "https://botstar.com", docs: "https://apis.botstar.com/docs/", logo: { favicon: "https://botstar.com" },
    baseUrl: "https://apis.botstar.com/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API token", secret: true }],
    keyUrl: "https://app.botstar.com/account/profile",
    help: "1) Open app.botstar.com/account/profile (your BotStar profile) and copy the token from the “API Token” section. 2) It is a "
      + "personal token that gives access to your bots; if you regenerate it, the previous one stops working. 3) The documentation does "
      + "not require a specific plan.",
    test: { path: "/bots", message: "API token is valid" },
    examples: "Examples: GET /bots, GET /bots/{botId}/attributes, GET /bots/{botId}/users/{userId}, GET /bots/{botId}/cms_entities, "
      + "GET /bots/{botId}/cms_entities/{entityId}/items?limit=100, POST /messages (sends a message to a bot user).",
  },
  {
    id: "brilliantdirectories", name: "Brilliant Directories", category: "crm",
    description: "Members, leads, posts and reviews of your directory",
    website: "https://www.brilliantdirectories.com", docs: "https://support.brilliantdirectories.com/support/solutions/articles/12000108046",
    logo: { favicon: "https://www.brilliantdirectories.com" },
    baseUrl: "{url}/api/v2",
    auth: { type: "header", name: "X-Api-Key" },
    fields: [{ id: "url", label: "Your directory URL (https://…)", format: "url",
               help: "Your directory's website, as you open it in the browser (with or without www)." },
             { id: "token", label: "API key", secret: true }],
    help: "1) In your directory's admin panel: “Developer Hub” → “Generate API Key”. 2) Copy it: it is shown only once. "
      + "3) Enter your directory's URL here. The documentation does not require a specific plan; if you do not see the “Developer Hub”, "
      + "ask Brilliant Directories for access. Default limit: 100 requests per minute for the whole site.",
    test: { path: "/token/verify", message: "API key is valid" },
    examples: "Responses include a status field (success or error); POST and PUT requests are sent as a form (the “form” field). "
      + "Examples: GET /token/verify, GET /user/get?limit=25 (members), GET /user/get/{user_id}, POST /user/search, "
      + "GET /leads/get/{lead_id}, POST /users_reviews/search.",
  },
  {
    id: "callerapi", name: "CallerAPI", category: "security", description: "Number reputation, spam, HLR and portability lookups",
    website: "https://callerapi.com", docs: "https://docs.callerapi.com", logo: { favicon: "https://callerapi.com" },
    baseUrl: "https://api.callerapi.com/api", allowedOrigins: ["https://callerapi.com"],
    auth: { type: "header", name: "x-auth" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://callerapi.com/dashboard",
    help: "1) Sign in at callerapi.com/dashboard and copy your API key. 2) It is a pay-per-use service: each lookup uses credits from "
      + "your account (checking the balance does not). 3) Conector sends it in the x-auth header; the documentation does not require a specific plan.",
    test: { path: "/me", account: (d) => d.email && `${d.email} · ${d.credits_left} credits` },
    examples: "The phone number uses international format without the + sign. Examples: GET /me (balance and credits), "
      + "GET /lookup/14155550100?hlr=false (spam score, owner and carrier), GET /ported/14155550100 (porting date, "
      + "€0.008 per lookup), GET /online-presence/14155550100 (presence on platforms, €0.15 per lookup).",
  },
  {
    id: "callingly", name: "Callingly", category: "crm", description: "Instant lead calling: leads, calls, SMS and teams",
    website: "https://www.callingly.com", docs: "https://help.callingly.com/article/38-callingly-api-documentation",
    logo: { favicon: "https://www.callingly.com" },
    baseUrl: "https://api.callingly.com/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key (Bearer token)", secret: true }],
    keyUrl: "https://callingly.com/dashboard/settings/api_keys",
    help: "1) In Callingly: “Settings” → “API Keys” → blue “Add API Key” button (top right). 2) Name it and copy it: "
      + "it cannot be viewed again. 3) Some endpoints (integrations, sequences) require an owner, administrator or "
      + "manager key. The documentation does not require a specific plan.",
    test: { path: "/teams", message: "API key is valid" },
    examples: "Examples: GET /leads, GET /leads/{id}, GET /calls?start=2026-10-01&end=2026-10-15&limit=50, GET /conversations, "
      + "GET /teams, GET /agents?account_id=…, POST /calls (starts a real call), POST /sms (sends a real SMS). "
      + "Agency accounts can add account_id to act on behalf of a client.",
  },
  {
    id: "callpage", name: "CallPage", category: "crm", description: "Callback widgets, users, calls and SMS",
    website: "https://www.callpage.io", docs: "https://callpage.github.io/documentation-rest/", logo: { favicon: "https://www.callpage.io" },
    baseUrl: "https://core.callpage.io/api/v1/external",
    auth: { type: "header", name: "Authorization" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://core.callpage.io/settings/api",
    help: "1) In CallPage: “Settings” in the left menu → “API settings” → “Create new API key”; select “Global API key” (access to "
      + "everything) or choose only the permissions you need (e.g. widgets.view, calls.view, sms.view) and add a description. "
      + "2) Copy the key with the copy button. 3) Conector sends it as is in the Authorization header, without “Bearer”. "
      + "The documentation does not require a specific plan.",
    test: { path: "/widgets/all", query: { limit: 1 }, message: "API key is valid",
              validate: (d) => { if (d?.hasError) throw new Error(d.message || "CallPage rejects the API key"); } },
    examples: "Responses include hasError, message and data. Examples: GET /widgets/all?limit=50&offset=0, GET /widgets/get?id=1, "
      + "GET /users/all?limit=50, GET /sms/all?widget_id=1, "
      + "GET https://core.callpage.io/api/v3/external/calls/history?limit=50 (call history), "
      + "POST /widgets/call-or-schedule (starts or schedules a real call). Phone numbers use E.164 format (+48123123123).",
  },
  {
    id: "capsulecrm", name: "Capsule CRM", category: "crm", description: "Contacts, opportunities, projects and tasks in Capsule",
    website: "https://capsulecrm.com", docs: "https://developer.capsulecrm.com", logo: { favicon: "https://capsulecrm.com" },
    baseUrl: "https://api.capsulecrm.com/api/v2",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "Personal access token", secret: true }],
    // One click: Capsule OAuth web app, registered in its developer portal. The permissions (read, write) are requested when
    // connecting, not in the app; access lasts about 7 days and is renewed with the refresh token.
    oauth: { scopes: ["read", "write"],
      provider: { name: "Capsule CRM", key: "capsulecrm", redirect: "localhost",
        authorizeUrl: "https://api.capsulecrm.com/oauth/authorise", tokenUrl: "https://api.capsulecrm.com/oauth/token",
        help: "1) Open developer.capsulecrm.com/clients (Capsule's developer portal; you sign in with a GitHub account) and click "
          + "“New Application”. 2) Name it “Conector”, add a description and your contact email, choose the type “Web Application” "
          + "and paste the redirect URI shown below into “Redirect URL”. 3) Save and copy the “Client "
          + "ID” and the “Client Secret” (“Reset Secret” generates a new one). The permissions (scopes) are not set in the app: "
          + "Conector requests them when connecting and they are shown below." },
      help: "When connecting, Capsule asks you to accept the read and write permissions. Conector acts with your user's permissions." },
    help: "1) In Capsule: your user menu → “My Preferences” → “API Authentication Tokens” → “Generate new API token”. 2) Add a "
      + "description, select the permissions (read access is enough to query) and copy it: it is shown only once. 3) The token acts with "
      + "your user's permissions. The documentation does not require a specific plan.",
    test: { path: "/users/current", account: (d) => d.user?.name || d.user?.username },
    examples: "Examples: GET /parties?perPage=50 (people and organizations), GET /parties/search?q=text, "
      + "POST /parties {\"party\": {\"type\": \"person\", \"firstName\": \"…\", \"lastName\": \"…\"}}, GET /opportunities, "
      + "GET /tasks?status=OPEN, POST /entries {\"entry\": {\"type\": \"note\", \"party\": {\"id\": 1}, \"content\": \"…\"}}.",
  },
  {
    id: "centralstationcrm", name: "CentralStationCRM", category: "crm",
    description: "People, companies, deals and tasks in CentralStationCRM",
    website: "https://centralstationcrm.com", docs: "https://centralstationcrm.com/api-basics",
    logo: { favicon: "https://centralstationcrm.com" },
    baseUrl: "https://{account}.centralstationcrm.net/api",
    auth: { type: "header", name: "X-apikey" },
    fields: [{ id: "account", label: "Your account name (the part before .centralstationcrm.net)", format: "subdomain" },
             { id: "token", label: "API key", secret: true }],
    help: "1) In CentralStationCRM, any user can create their own key in “My settings”: find the API key section "
      + "and create or copy the key. 2) Also enter your account name, which is the part before .centralstationcrm.net in "
      + "the address you sign in with. 3) The key has your user's permissions; the documentation does not require a specific plan.",
    test: { path: "/people/count.json", message: "API key is valid" },
    examples: "All paths end in .json. Examples: GET /people.json?perpage=25&page=1, GET /people/count.json, "
      + "GET /people/{id}.json, GET /companies.json, GET /deals.json, GET /tasks.json. The full reference (Swagger) is "
      + "linked from the documentation.",
  },
  {
    id: "charla", name: "Charla", category: "support",
    description: "AI live chat: contacts, conversations and knowledge base",
    website: "https://charla.com", docs: "https://charla.com/public-api.html", logo: { favicon: "https://charla.com" },
    baseUrl: "https://api.charla.com/v1",
    auth: { type: "header", name: "X-Api-Key" },
    fields: [{ id: "token", label: "Property API key", secret: true }],
    help: "1) In Charla (app.charla.com): open your property's settings (the website) → “Integration” tab → “API” section and "
      + "copy the “API Key”. 2) Each property has its own key: if you manage several websites, connect the one you want to read "
      + "data from. 3) The documentation does not require a specific plan.",
    test: { path: "/kb/categories", message: "API key is valid" },
    examples: "Lists are paginated with a cursor (the cursor parameter, which the previous page returns). Examples: GET /contacts "
      + "(sorted by last modification), GET /contacts/{id}, POST /contacts (creates or updates), GET /conversations (history per "
      + "visitor), GET /kb/articles, POST /kb/articles (the article can be used to train the chatbot), GET /kb/categories.",
  },
  {
    id: "chatforma", name: "Chatforma", category: "support",
    description: "Chatforma bots: users, segments, broadcasts and dialogs",
    website: "https://chatforma.com", docs: "https://docs.chatforma.com", logo: { favicon: "https://chatforma.com" },
    baseUrl: "https://api.pro.chatforma.com/public/v1",
    auth: { type: "header", name: "api_key" },
    fields: [{ id: "token", label: "API token", secret: true }],
    help: "1) In Chatforma: your profile → “My Profile” → “Profile” → “Integration” tab → “Create a token”. 2) Name it, create it "
      + "and copy it. 3) Conector sends it in the api_key header. The documentation does not require a specific plan.",
    test: { path: "/auth-test", message: "Token is valid" },
    examples: "Examples: GET /bots, GET /bots/{botId}/users, GET /bots/{botId}/segments, GET /bots/{botId}/dialogs/users, "
      + "GET /bots/{botId}/dialogs/{userId}/messages, POST /bots/{botId}/dialogs/{userId}/message (sends a message), "
      + "POST /bots/{botId}/segments/{segmentId}/dispatch (broadcast to a segment).",
  },
  {
    id: "clay", name: "Clay", category: "crm", description: "Clay people and company search, routines and tables",
    website: "https://www.clay.com", docs: "https://developers.clay.com/public-api/quickstart", logo: { favicon: "https://www.clay.com" },
    baseUrl: "https://api.clay.com/public/v0",
    auth: { type: "header", name: "clay-api-key" },
    fields: [{ id: "token", label: "Clay API key", secret: true }],
    keyUrl: "https://app.clay.com/workspaces/~/api-and-cli?tab=api-keys",
    help: "1) In Clay: “API and CLI” → “API keys” tab (app.clay.com/workspaces/~/api-and-cli) → create a key and copy it. 2) The key "
      + "is tied to your user and its workspaces. 3) The Free plan allows up to 100 search results every 30 days; "
      + "tables are only available on the Enterprise plan.",
    test: { path: "/me", account: (d) => d.email || d.user?.email || d.name },
    examples: "Examples: GET /me, GET /search/query-mode/reference (search language guide), POST /search/query-mode (creates a "
      + "people or company search), POST /search/query-mode/{search_id}/run, POST /routines/{routine_id}/run "
      + "{\"items\": [{\"id\": \"1\", \"inputs\": {\"domain\": \"example.com\"}}]}, GET /routines/run/{routine_run_id}/results "
      + "(202 while processing), POST /tables/query (Enterprise).",
  },
  {
    id: "clearout", name: "Clearout", category: "crm", description: "Verify and find emails; credit balance",
    website: "https://clearout.io", docs: "https://docs.clearout.io/developers/api/overview", logo: { favicon: "https://clearout.io" },
    baseUrl: "https://api.clearout.io/v2",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API token", secret: true }],
    keyUrl: "https://app.clearout.io/developer/api/list",
    help: "1) In Clearout: menu → “Developer” → “API” → “Create API Token”. 2) Name it, create it and copy it. 3) The per-minute "
      + "request limit depends on your plan; verifying or finding emails uses credits (checking the balance does not).",
    test: { path: "/account/credits",
              message: (d) => (d?.data?.total_remaining_credits != null
                ? `Token is valid: ${d.data.total_remaining_credits} credits available` : "Token is valid") },
    examples: "Examples: GET /account/credits, GET /account/limits, POST /email_verify/instant {\"email\": \"name@example.com\"} "
      + "(uses credits), POST /email_finder/instant {\"name\": \"…\", \"domain\": \"example.com\"}, "
      + "GET /reverse_lookup/email?email_address=…, POST /domain/resolve/mx.",
  },
];
