// Batch 07 of the catalog, taken from the Composio catalog: CRM, customer support, B2B prospecting and chatbots (HelloLeads to
// Nutshell). The per-customer URLs (HelpSpot, Mihu AI, noCRM.io) cannot be verified without real credentials: they were checked
// against the documentation. HighLevel (sub-account) also connects with one click (OAuth); the other apps use only an API key.

const count = (n, singular, plural) => `${n} ${n === 1 ? singular : plural}`;
// “N things” if the response is a list; otherwise the fallback text.
const list = (d, one, many, fallback = "Credentials are valid") => (Array.isArray(d) ? count(d.length, one, many) : fallback);

// LeadIQ delivers the key already Base64-encoded (“Secret Base64”): if someone pastes the plain key, it is encoded here (“key:”).
function basicLeadIq(token) {
  const t = String(token).trim();
  const encoded = /^[A-Za-z0-9+/]+={0,2}$/.test(t) && Buffer.from(t, "base64").toString("utf8").includes(":");
  return encoded ? t : Buffer.from(`${t}:`).toString("base64");
}

// HighLevel: OAuth of a sub-account (Location). Its token server does not support PKCE (it answers 422 if it receives code_verifier)
// and asks for the token type; the response includes the locationId of the sub-account chosen on authorization, which is the ID
// the routes use.
const HIGHLEVEL = {
  name: "HighLevel", key: "highlevel", redirect: "https",
  authorizeUrl: "https://marketplace.gohighlevel.com/v2/oauth/chooselocation", tokenUrl: "https://services.leadconnectorhq.com/oauth/token",
  extraParams: { loginWindowOpenMode: "self" }, // if not signed in, the login opens in the same tab
  params: ({ code_challenge: _challenge, code_challenge_method: _method, ...rest }) => rest,
  tokenBody: ({ code_verifier: _verifier, ...rest }) => ({ ...rest, user_type: "Location" }),
  parseResponse: (d) => ({ ...d, location_id: d.locationId }),
  keep: ["location_id"],
  async after(token, cred) {
    if (!cred.location_id) {
      throw new Error("HighLevel did not return a sub-account: when authorizing, choose a sub-account (not the agency)");
    }
    return {};
  },
  help: "1) Go to marketplace.gohighlevel.com with a developer account (it is free to create with “Sign up”) and open "
    + "“My Apps” → “Create App”. 2) Name it “Conector” and choose “App Type”: “Private” (internal use, not published), "
    + "“Target User”: “Sub-account” and “Who can install”: “Both Agency & Sub-account”. 3) In the app, “Advanced Settings” → "
    + "“Auth”: click “Select Scope” and select the scopes shown below; in “Redirect URL” paste the redirect URI "
    + "shown below (HighLevel requires https, so Conector needs an https:// public URL, set in CONECTOR_PUBLIC_URL) and click "
    + "“Add”; save. 4) In “Client Keys” (in the “Auth” section or in “Manage” → “Secrets”) click “Add”, give it a name and "
    + "copy the “Client ID” and the “Client Secret”: the secret is not shown again. 5) When you click “Continue with HighLevel”, sign in "
    + "to HighLevel and choose the sub-account you want to link: each connection works for a single sub-account and access "
    + "renews itself.",
};

export default [
  {
    id: "helloleads", name: "HelloLeads", category: "crm", description: "Sales lead capture and follow-up: lists and leads",
    website: "https://helloleads.io", docs: "https://helloleads.io/knowledge-base/", logo: { favicon: "https://helloleads.io" },
    baseUrl: "https://app.helloleads.io/index.php/private/api",
    auth: [{ type: "header", field: "token", name: "hls-key" }, { type: "header", field: "email", name: "Xemail" }],
    fields: [{ id: "token", label: "API key (hls-key)", secret: true },
             { id: "email", label: "Authorized user's email",
               help: "The email you sign in to HelloLeads with: the API requires it together with the key (Xemail header)." }],
    help: "1) Sign in to HelloLeads with the owner account (only that role can access “Integrations”) and find your account's API "
      + "key. 2) Copy it and also enter the authorized user's email: they are sent as the hls-key and Xemail headers. 3) The API "
      + "is included in paid plans (it appears as “Zapier & APIs”). HelloLeads does not publish an API reference.",
    test: { path: "/lists", message: "API key is valid" },
    examples: "The API has no public reference. Examples: GET /lists (lead lists), GET /leads (the account's leads), "
      + "POST /leads (creates a lead; the body carries the contact data and the list).",
  },
  {
    id: "helpspot", name: "HelpSpot", category: "support", description: "Help desk: requests, categories, staff and replies",
    website: "https://www.helpspot.com", docs: "https://support.helpspot.com/index.php?pg=kb.book&id=6",
    logo: { favicon: "https://www.helpspot.com" },
    baseUrl: "{url}",
    auth: { type: "bearer" },
    fields: [{ id: "url", label: "HelpSpot address (https://…)", format: "url",
               help: "The base URL of your installation, e.g. https://yourcompany.helpspot.com or your server's, without /api at the end." },
             { id: "token", label: "User API token", secret: true }],
    help: "1) An administrator enables the API in “Admin” → “Settings” → “Web Services API” (it is disabled by default). 2) Each staff "
      + "member generates their API token in their user preferences: the token acts with that person's permissions. 3) Enter "
      + "your HelpSpot address here (with https). Methods that need a session start with “private.”.",
    test: { path: "/api/index.php", query: { method: "private.version", output: "json" },
              validate: (d) => {
                const failure = d && typeof d === "object" ? d.errors || d.error : null;
                if (failure) throw new Error(`HelpSpot: ${JSON.stringify(failure).slice(0, 160)}`);
              },
              message: (d) => (d?.version ? `HelpSpot ${d.version}` : "API token is valid") },
    examples: "Everything goes to /api/index.php with the method in the query; always add output=json. Examples: "
      + "GET /api/index.php?method=private.version, ?method=private.request.getCategories, ?method=private.request.get&xRequest=123, "
      + "?method=private.util.getActiveStaff, ?method=private.filter.get&xFilter=…. To write, POST /api/index.php with form "
      + "{method: \"private.request.create\", tNote: \"…\", xCategory: 1, sEmail: \"…\", output: \"json\"}.",
  },
  {
    id: "helpdesk", name: "HelpDesk", category: "support", description: "HelpDesk.com tickets, agents, teams and replies",
    website: "https://www.helpdesk.com", docs: "https://api.helpdesk.com/docs", logo: { simpleIcons: "helpdesk" },
    baseUrl: "https://api.helpdesk.com",
    auth: { type: "basic", usernameField: "account_id", passwordField: "token" },
    fields: [{ id: "account_id", label: "Account ID (account_id)",
               help: "The LiveChat developer console shows it next to the personal token." },
             { id: "token", label: "Personal access token", secret: true }],
    keyUrl: "https://developers.livechat.com/console/",
    help: "1) Go to the LiveChat developer console (developers.livechat.com/console) with your HelpDesk credentials. "
      + "2) In “Tools” → “Personal Access Tokens” create a token with the accounts--my:ro scope and the ones you need for tickets, "
      + "agents or reports. 3) Copy the token and the “account_id” shown by the console: they are sent as username and password "
      + "(basic authentication).",
    test: { path: "/v1/agents", message: (d) => list(d, "agent", "agents", "Credentials are valid") },
    examples: "Lists are paginated with a cursor (pageSize, next, prev). Examples: GET /v1/agents, "
      + "GET /v1/tickets?pageSize=25&silo=tickets, GET /v1/tickets/{ticketID}, "
      + "POST /v1/tickets {\"subject\": \"…\", \"requester\": {\"email\": \"…\"}, \"message\": {\"text\": \"…\"}}, "
      + "PATCH /v1/tickets/{ticketID}, GET /v1/teams, GET /v1/tags, GET /v1/reports/newTickets.",
  },
  {
    id: "helpwise", name: "Helpwise", category: "support",
    description: "Shared inbox: conversations, contacts, tags and reports",
    website: "https://helpwise.io", docs: "https://helpwise.io/developers", logo: { favicon: "https://helpwise.io" },
    baseUrl: "https://apis.helpwise.io",
    auth: { type: "basic", usernameField: "api_key", passwordField: "api_secret" },
    fields: [{ id: "api_key", label: "API key" },
             { id: "api_secret", label: "API secret", secret: true }],
    keyUrl: "https://app.helpwise.io/settings/api",
    help: "1) Sign in to Helpwise and open app.helpwise.io/settings/api (settings, API key section). 2) Generate the credentials and "
      + "copy the API key and the API secret: they go together, as the username and password of basic authentication. 3) The API only "
      + "responds over HTTPS and returns JSON.",
    test: { path: "/tags", message: "Credentials are valid" },
    examples: "Examples: GET /tags, GET /conversations?inboxIds[]=…&limit=50 (next page with pageToken), "
      + "GET /inboxes/{inboxId}/conversations/{conversationId}, GET /contacts?limit=50&offset=0, GET /contacts/search?term=…, "
      + "POST /contacts {…}, GET /customFields, GET /reports?start=2026-10-01 00:00:00&end=2026-10-31 00:00:00.",
  },
  {
    id: "heyy", name: "Heyy", category: "communication", description: "WhatsApp, SMS, Messenger and Instagram: chats, contacts and campaigns",
    website: "https://www.heyy.io", docs: "https://docs.heyy.io/api-reference/v3/overview", logo: { favicon: "https://www.heyy.io" },
    baseUrl: "https://api.heyy.io/v3",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://app.heyy.io/settings/api-keys",
    help: "1) Go to your Heyy workspace and open app.heyy.io/settings/api-keys. 2) Click “Create API key”, give it a name and "
      + "copy it: it is shown only once. 3) The key sees the workspace it belongs to. The documentation does not state a minimum "
      + "plan.",
    test: { path: "/workspace", account: (d) => d?.data?.name },
    examples: "Searches are POST and the responses come inside “data”. Examples: GET /workspace, POST /channels/search {}, "
      + "POST /contacts/search {\"search\": \"…\", \"pagination\": {\"page\": 0, \"limit\": 20}}, POST /chats/search {}, "
      + "POST /messages/send {\"chat\": {\"channelId\": \"…\", \"phoneNumber\": \"+1…\"}, \"body\": \"…\"}, "
      + "POST /message_templates/search {}.",
  },
  {
    id: "highlevellocation", name: "HighLevel (sub-account)", category: "crm",
    description: "Sub-account CRM and automation: contacts, appointments and payments",
    website: "https://www.gohighlevel.com", docs: "https://marketplace.gohighlevel.com/docs/", logo: { favicon: "https://www.gohighlevel.com" },
    baseUrl: "https://services.leadconnectorhq.com",
    headers: { Version: "2021-07-28" },
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "Private integration token (pit-…)", secret: true,
               example: "pit-00000000-0000-0000-0000-000000000000" },
             { id: "location_id", label: "Sub-account ID (Location ID)",
               help: "It appears in the URL when you enter the sub-account (…/location/<ID>/…) and in “Settings” → “Business Profile”." }],
    // One click: private app in the HighLevel Marketplace; the connection is tied to the chosen sub-account.
    oauth: { provider: HIGHLEVEL,
      scopes: ["locations.readonly", "locations/customFields.readonly", "locations/customFields.write", "locations/customValues.readonly",
                 "locations/customValues.write", "locations/tags.readonly", "locations/tags.write", "contacts.readonly", "contacts.write",
                 "opportunities.readonly", "opportunities.write", "conversations.readonly", "conversations.write",
                 "conversations/message.readonly", "conversations/message.write", "calendars.readonly", "calendars.write",
                 "calendars/events.readonly", "calendars/events.write", "users.readonly", "workflows.readonly", "forms.readonly",
                 "surveys.readonly", "campaigns.readonly", "invoices.readonly", "invoices.write", "payments/orders.readonly",
                 "payments/transactions.readonly", "payments/subscriptions.readonly", "products.readonly", "products.write",
                 "products/prices.readonly", "products/prices.write"] },
    help: "1) In HighLevel enter the sub-account and open “Settings” → “Private Integrations” (if it does not appear, enable it first in “Labs”). "
      + "2) Click “Create new Integration”, give it a name, select the scopes you need, such as contacts, calendars, "
      + "opportunities or locations.readonly, and copy the token: it is not shown again. 3) Also enter the sub-account ID. "
      + "HighLevel recommends rotating the token every 90 days.",
    test: { path: "/locations/{location_id}", account: (d) => d?.location?.name },
    examples: "Almost all routes require locationId. Examples: GET /locations/{locationId}, GET /contacts/?locationId=…&limit=20, "
      + "POST /contacts/ {\"locationId\": \"…\", \"firstName\": \"…\", \"email\": \"…\"}, GET /opportunities/pipelines?locationId=…, "
      + "GET /calendars/?locationId=…. Conversations and calendars use another version: pass the header Version: 2021-04-15 "
      + "in “headers”.",
  },
  {
    id: "icypeas", name: "Icypeas", category: "crm", description: "Business email finding and verification",
    website: "https://www.icypeas.com", docs: "https://api-doc.icypeas.com/getting-started/", logo: { favicon: "https://www.icypeas.com" },
    baseUrl: "https://app.icypeas.com",
    auth: { type: "header", name: "Authorization" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://app.icypeas.com/bo/api",
    help: "1) Sign in to app.icypeas.com and open app.icypeas.com/bo/api. 2) If “Activate API access” is off, turn it on and copy the "
      + "API key. 3) It is sent as is in the Authorization header, without “Bearer”. Searches and verifications use "
      + "credits; the connection test does not.",
    test: { method: "POST", path: "/api/a/actions/subscription-information", body: {}, acceptStatus: [400, 422],
              message: "API key is valid" },
    examples: "All calls are POST with a JSON body. Examples: POST /api/email-search {\"firstname\": \"…\", \"lastname\": \"…\", "
      + "\"domainOrCompany\": \"example.com\"} (uses a credit and returns an “_id”), POST /api/bulk-single-searchs/read {\"id\": \"…\"} "
      + "(result of a search: NONE, SCHEDULED, IN_PROGRESS or DEBITED), POST /api/email-verification {\"email\": \"…\"}, "
      + "POST /api/domain-search {\"domainOrCompany\": \"example.com\"}, POST /api/a/actions/subscription-information {\"email\": \"…\"} "
      + "(plan and credits).",
  },
  {
    id: "insightoai", name: "Insighto.ai", category: "support",
    description: "AI chatbots and voice agents: assistants, contacts and calls",
    website: "https://insighto.ai", docs: "https://api.insighto.ai/docs", logo: { favicon: "https://insighto.ai" },
    baseUrl: "https://api.insighto.ai",
    auth: { type: "query", name: "api_key" },
    fields: [{ id: "token", label: "API key (in-…)", secret: true, example: "in-fake-key-123456" }],
    help: "1) Sign in to insighto.ai and open the “Settings” page of your account. 2) Generate the API key and copy it: it starts with "
      + "“in-”. 3) Conector sends it as the api_key URL parameter. Creating assistants or starting calls and messages uses credits "
      + "from your plan.",
    test: { path: "/api/v1/user", account: (d) => d?.email || d?.data?.email, message: "API key is valid" },
    examples: "Examples: GET /api/v1/user, GET /api/v1/assistant, GET /api/v1/widget, GET /api/v1/conversation, GET /api/v1/contact, "
      + "POST /api/v1/contact/upsert {…}, GET /api/v1/user_usage/user_monthly_usages, POST /api/v1/messaging/{widget_id} and "
      + "POST /api/v1/call/{widget_id} (use credits).",
  },
  {
    id: "iterate", name: "Iterate", category: "crm", description: "Customer feedback surveys: surveys, responses and users",
    website: "https://iteratehq.com", docs: "https://help.iteratehq.com/en/articles/2835026-finding-your-api-key",
    logo: { favicon: "https://iteratehq.com" },
    baseUrl: "https://iteratehq.com/api/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) Sign in to Iterate and open the account settings: the API key appears on the right side of the page (guide "
      + "“Finding Your API Key” in the help center). 2) Copy it: it is sent as “Bearer”. 3) The key sees the surveys and the data of "
      + "your company's users. Iterate does not publish a REST API reference: start with GET /surveys.",
    test: { path: "/surveys", message: "API key is valid" },
    examples: "No public reference. Examples: GET /surveys (surveys and their IDs), GET /surveys/{id} (configuration and questions), "
      + "GET /surveys/{id}/responses (responses, paginated). Operations on users (anonymizing or deleting data) are "
      + "irreversible: ask for confirmation first.",
  },
  {
    id: "jobnimbus", name: "JobNimbus", category: "crm", description: "CRM for contractors: contacts, jobs, tasks and invoices",
    website: "https://www.jobnimbus.com", docs: "https://documenter.getpostman.com/view/3919598/S11PpG4x",
    logo: { favicon: "https://www.jobnimbus.com" },
    baseUrl: "https://app.jobnimbus.com/api1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) In JobNimbus, an administrator opens “Settings” → “API” tab → “New API Key”. 2) Choose the key's access profile (“Access "
      + "Profile”) (JobNimbus recommends “Full” and “Settings”), give it a description, save it and copy the token. 3) With an "
      + "administrator profile you can add ?actor=user@example.com to act with another user's permissions. Depending on your plan, "
      + "the API may not be included.",
    test: { path: "/contacts", query: { size: 1 }, message: "API key is valid" },
    examples: "Responses {\"count\": n, \"results\": […]}. Parameters: size (max 1000), from, sort_field, sort_direction, fields and "
      + "filter (encoded ElasticSearch JSON). Examples: GET /contacts?size=20, GET /jobs?size=20, GET /tasks, GET /activities, "
      + "GET /account/settings, GET /account/users, GET /v2/invoices, POST /contacts {\"first_name\": \"…\", \"email\": \"…\"}, "
      + "PUT /contacts/{jnid}.",
  },
  {
    id: "kapso", name: "Kapso", category: "communication", description: "WhatsApp API: customers, numbers, messages and broadcasts",
    website: "https://kapso.ai", docs: "https://docs.kapso.ai/api/introduction", logo: { favicon: "https://kapso.ai" },
    baseUrl: "https://api.kapso.ai",
    auth: { type: "header", name: "X-API-Key" },
    fields: [{ id: "token", label: "Project API key", secret: true }],
    help: "1) Sign in to app.kapso.ai and open your project. 2) In the project settings (“API Keys”, also under “Integrations”) create "
      + "an API key and copy it. 3) A single key works for all three APIs (Platform, WhatsApp and Workflows) and only sees that "
      + "project. Sending messages uses your WhatsApp quota.",
    test: { path: "/platform/v1/customers", query: { per_page: 1 }, message: "API key is valid" },
    examples: "Three APIs on the same domain; the platform lists return “data” and “meta” (page and per_page). Examples: "
      + "GET /platform/v1/customers, GET /platform/v1/whatsapp/phone_numbers, GET /platform/v1/whatsapp/broadcasts, "
      + "GET /meta/whatsapp/v24.0/{business_account_id}/phone_numbers, POST /meta/whatsapp/v24.0/{phone_number_id}/messages "
      + "{\"messaging_product\": \"whatsapp\", \"to\": \"15551234567\", \"type\": \"text\", \"text\": {\"body\": \"…\"}}.",
  },
  {
    id: "kommunicate", name: "Kommunicate", category: "support",
    description: "Customer support with chatbots: conversations, messages and users",
    website: "https://www.kommunicate.io", docs: "https://docs.kommunicate.io/docs/api-authentication.html",
    logo: { favicon: "https://www.kommunicate.io" },
    baseUrl: "https://services.kommunicate.io",
    auth: { type: "header", name: "Api-Key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) Sign in to the Kommunicate dashboard and open the “Install” page (dashboard.kommunicate.io/install), where your "
      + "application's key appears. 2) Copy it; if you cannot see it, ask hello@kommunicate.io for it. 3) Some operations also require the "
      + "Of-User-Id header with the ID of the user or agent acting.",
    test: { method: "POST", path: "/rest/ws/user/v2/detail", body: ["conector-check"], acceptStatus: [400, 404],
              message: "API key is valid" },
    examples: "Examples: POST /rest/ws/user/v2/detail [\"userId\"] (user data; ?fetchLatestMessageTime=true), "
      + "POST /rest/ws/group/conversation (creates a conversation), POST /rest/ws/message/v2/send (sends a message to a conversation), "
      + "PATCH /rest/ws/group/status/change?groupId=…&status=… (open, close or spam), "
      + "PATCH /rest/ws/group/assignee/change?groupId=…&assignee=… (with the actor's Of-User-Id header).",
  },
  {
    id: "lagrowthmachine", name: "La Growth Machine", category: "crm",
    description: "Multichannel prospecting: campaigns, audiences, leads and inbox",
    website: "https://lagrowthmachine.com", docs: "https://developers.lagrowthmachine.com", logo: { favicon: "https://lagrowthmachine.com" },
    baseUrl: "https://apiv2.lagrowthmachine.com/flow",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://app.lagrowthmachine.com/settings/api",
    help: "1) Sign in to app.lagrowthmachine.com and open “Settings” → “Integrations & API” (app.lagrowthmachine.com/settings/api). 2) Copy "
      + "your API key: the API is available from the Pro plan. 3) With the standard key you act as the owner of the "
      + "workspace; enriching leads uses credits.",
    test: { path: "/me", account: (d) => d?.email },
    examples: "Examples: GET /me, GET /credits, GET /audiences, GET /campaigns, GET /leads/search?email=…, "
      + "POST /leads {\"proEmail\": \"…\", \"firstname\": \"…\", \"lastname\": \"…\"} (creates or updates a lead), GET /members, "
      + "GET /identities, GET /conversations/search. POST /leads/enrich uses credits.",
  },
  {
    id: "landbot", name: "Landbot", category: "support", description: "No-code chatbots: channels, customers, messages and fields",
    website: "https://landbot.io", docs: "https://dev.landbot.io/api-reference/introduction", logo: { favicon: "https://landbot.io" },
    baseUrl: "https://api.landbot.io/v1",
    auth: { type: "header", name: "Authorization", prefix: "Token " },
    fields: [{ id: "token", label: "Agent token (API token)", secret: true }],
    keyUrl: "https://app.landbot.io/gui/settings/account",
    help: "1) Sign in to Landbot and open the account settings (app.landbot.io/gui/settings/account). 2) Copy the agent token (API "
      + "token): it is sent as “Token …”. 3) It is the platform API token (api.landbot.io); the APIchat channel token "
      + "(chat.landbot.io) does not work here.",
    test: { path: "/channels/", message: (d) => list(d?.channels, "channel", "channels", "Token is valid") },
    examples: "All paths end in “/”. Examples: GET /channels/, GET /customers/, GET /customers/{id}/, "
      + "GET /customers/{id}/messages/, POST /customers/{id}/send_text/ {\"message\": \"…\"}, PUT /customers/{id}/assign/{agent_id}/, "
      + "GET /channels/whatsapp/templates/. The bots API (alpha) lives at https://api.landbot.io/v0-alpha/bots.",
  },
  {
    id: "leadfeeder", name: "Leadfeeder", category: "crm",
    description: "Companies visiting your website: visits, contacts, lists and tags",
    website: "https://www.leadfeeder.com", docs: "https://docs.leadfeeder.com/api/public", logo: { favicon: "https://www.leadfeeder.com" },
    baseUrl: "https://api.leadfeeder.com",
    auth: { type: "header", name: "X-Api-Key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) In Leadfeeder (Dealfront) open “Settings” (your user, top right), scroll down to “API keys” in your personal settings and "
      + "click “Create a new API key”. 2) Give it a name and copy the token: it is visible only once. 3) The key sees all the accounts its "
      + "owner can access. Keys from the old API (“Token token=…”) do not work: that API no longer issues new keys.",
    test: { path: "/v1/users/me", account: (d) => d?.data?.attributes?.email },
    examples: "Almost all routes require account_id (it comes from GET /v1/accounts). Examples: GET /v1/users/me, GET /v1/accounts, "
      + "POST /v1/web-visits?account_id=… (visit search with filters), GET /v1/web-visits/companies?account_id=…, "
      + "GET /v1/companies?account_id=…, GET /v1/contacts?account_id=…, GET /v1/lists?account_id=…, "
      + "GET /v1/usage?account_id=…&start_period=2026-09&end_period=2026-10. Enrichment jobs use credits.",
  },
  {
    id: "leadiq", name: "LeadIQ", category: "crm", description: "B2B prospecting: people, companies and lists (GraphQL)",
    website: "https://leadiq.com", docs: "https://developer.leadiq.com", logo: { favicon: "https://leadiq.com" },
    baseUrl: "https://api.leadiq.com",
    auth: { type: "custom", apply: (c) => ({ headers: { Authorization: `Basic ${basicLeadIq(c.token)}` } }) },
    fields: [{ id: "token", label: "API key (Secret Base64)", secret: true }],
    graphql: { path: "/graphql" },
    help: "1) In LeadIQ open “Settings” → “API Keys” and generate a key. 2) Copy the “Secret Base64” value (if you paste the plain key, "
      + "Conector encodes it for you). 3) API access for real use depends on your contract with LeadIQ, and each search "
      + "uses credits from your plan.",
    test: { method: "POST", path: "/graphql", body: { query: "{ account { plans { name status } } }" },
              message: (d) => (d?.data?.account?.plans?.[0]?.name ? `Plan ${d.data.account.plans[0].name}` : "API key is valid") },
    examples: "A single GraphQL endpoint: use leadiq_graphql (or POST /graphql {\"query\": \"…\"}). Authentication failures arrive "
      + "with status 200 and “errors”. Examples: { account { plans { name status } } }, { searchPeople(input: {firstName: \"…\", "
      + "lastName: \"…\", company: {name: \"…\"}}) { totalResults hasMore results { id name { fullName } currentPositions { title } } } } "
      + "(uses credits), { lists(limit: 20) { __typename } }. Explore the schema by introspection.",
  },
  {
    id: "leadmagic", name: "LeadMagic", category: "crm", description: "B2B enrichment: emails, mobile numbers, profiles and companies",
    website: "https://leadmagic.io", docs: "https://leadmagic.io/docs", logo: { favicon: "https://leadmagic.io" },
    baseUrl: "https://api.leadmagic.io/v1",
    auth: { type: "header", name: "X-API-Key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://app.leadmagic.io/settings/api",
    help: "1) Sign in to app.leadmagic.io and open “Settings” → “API Keys” (app.leadmagic.io/settings/api). 2) Check that the active "
      + "workspace is the right one: keys belong to each workspace. 3) Copy the key. Checking the balance is free; "
      + "finders and enrichments use credits, and the key stops working if the subscription ends.",
    test: { path: "/credits", message: (d) => `${d?.credits ?? "?"} credits available` },
    examples: "Examples: GET /credits (free), POST /people/email-validation {\"email\": \"…\"} (0.25 credits per check). "
      + "The X-Credits-Remaining headers of each response give the balance. Finders for emails, mobile numbers, profiles, companies and "
      + "ads: check their path at https://leadmagic.io/docs.",
  },
  {
    id: "lusha", name: "Lusha", category: "crm", description: "Verified B2B data: contacts, companies and prospecting",
    website: "https://www.lusha.com", docs: "https://docs.lusha.com", logo: { favicon: "https://www.lusha.com" },
    baseUrl: "https://api.lusha.com",
    auth: { type: "header", name: "api_key" },
    fields: [{ id: "token", label: "API key", secret: true, example: "00000000-0000-0000-0000-000000000000" }],
    keyUrl: "https://dashboard.lusha.com/api/manage-api-keys",
    help: "1) Sign in to dashboard.lusha.com and open API key management (dashboard.lusha.com/api/manage-api-keys). 2) Generate a "
      + "key and copy it. 3) Depending on your plan, the API uses credits when revealing emails and phone numbers; checking usage is free (maximum "
      + "5 requests per minute).",
    test: { path: "/v3/account/usage",
              message: (d) => (d?.credits ? `${d.credits.remaining} of ${d.credits.total} credits remaining` : "API key is valid") },
    examples: "Examples: GET /v3/account/usage (credits and limits, free), POST /v3/contacts/prospecting {\"pagination\": {\"page\": 0, "
      + "\"size\": 25}, \"filters\": {\"contacts\": {\"include\": {\"departments\": [\"Sales\"]}}}}, POST /v3/contacts/search {…}, "
      + "POST /v3/contacts/enrich {\"ids\": [\"…\"]} (reveals email and phone: uses credits per item).",
  },
  {
    id: "mailcheck", name: "Mailcheck", category: "crm", description: "Email verification: single and in bulk",
    website: "https://mailcheck.co", docs: "https://app.mailcheck.co/docs", logo: { favicon: "https://mailcheck.co" },
    baseUrl: "https://api.mailcheck.co/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) Sign in to app.mailcheck.co and click “API” in the top menu. 2) Enter a name for the integration, click “Create key” "
      + "and copy the key: it is a long token. 3) It can be created on any account; each verification uses credits from your account.",
    test: { path: "/emails/operations", message: "API key is valid" },
    examples: "Errors arrive as {\"code\": n, \"message\": \"…\"}. Examples: POST /singleEmail:check {\"email\": \"…\"} (uses a "
      + "credit), GET /emails/operations (verification batches), GET /emails/operations/{id} (status of a batch).",
  },
  {
    id: "mihuai", name: "Mihu AI", category: "communication",
    description: "AI voice and messaging agents: calls, chats and contacts",
    website: "https://www.mihu.ai", docs: "https://developers.mihu.ai/introduction", logo: { favicon: "https://www.mihu.ai" },
    baseUrl: "https://{workspace}.mihu.ai",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API token", secret: true },
             { id: "workspace", label: "Workspace subdomain", format: "subdomain",
               help: "The first part of your workspace address: in https://abc.mihu.ai it is “abc”." }],
    help: "1) Go to your Mihu workspace (https://<workspace>.mihu.ai): the subdomain is its identifier. 2) Click your profile "
      + "icon → “Developer” → “Create New API Token”, give it a name and permissions, and copy the token: it is not shown again. 3) Use a "
      + "workspace token (not a user token) if you are going to change settings. Starting calls or messages allows 5 requests per "
      + "second.",
    test: { path: "/api/v1/workspace", account: (d) => d?.data?.display_name || d?.data?.name },
    examples: "Responses include “success”, “message” and “data”. Examples: GET /api/v1/workspace, GET /api/v1/agents?per_page=20, "
      + "GET /api/v1/calls?per_page=20, GET /api/v1/contacts?search=…, GET /api/v1/conversations, GET /api/v1/wallet/transactions, "
      + "POST /api/v1/call and POST /api/v1/sms/send (they start real calls and messages). OpenAPI: https://app.mihu.ai/docs/api-docs.json.",
  },
  {
    id: "minelead", name: "Minelead.io", category: "crm", description: "Company emails by domain, verification and enrichment",
    website: "https://minelead.io", docs: "https://minelead.io/docs/", logo: { favicon: "https://minelead.io" },
    baseUrl: "https://api.minelead.io",
    auth: { type: "query", name: "key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) Create an account at minelead.io (it includes free credits every month) and sign in. 2) Open the API section of your dashboard "
      + "and copy the key. 3) Conector sends it as the “key” URL parameter. Each search with results, each search by "
      + "name and each verification uses 1 credit.",
    test: { path: "/v1/search/", query: { domain: "example.invalid" }, message: "API key is valid",
              validate: (d) => {
                if (d?.status === "error" && /unauthori/i.test(d.message || "")) throw new Error(`Minelead: ${d.message}`);
              } },
    examples: "Failures arrive with status 200 and {\"status\": \"error\"}. Paths end in “/”. Examples: "
      + "GET /v1/search/?domain=stripe.com (emails of the domain, 1 credit), GET /v1/search/?domain=…&enrich=true (adds position and "
      + "location), GET /v1/find/?firstname=…&lastname=…&domain=… (a person's email), GET /v1/validate/?email=… (1 credit).",
  },
  {
    id: "nethuntcrm", name: "NetHunt CRM", category: "crm",
    description: "CRM inside Gmail: folders, records, comments and calls",
    website: "https://nethunt.com", docs: "https://nethunt.com/integration-api", logo: { favicon: "https://nethunt.com" },
    baseUrl: "https://nethunt.com/api/v1/zapier",
    auth: { type: "basic", usernameField: "email", passwordField: "token" },
    fields: [{ id: "email", label: "NetHunt account email" },
             { id: "token", label: "API key", secret: true }],
    help: "1) In NetHunt CRM open “Settings” → “Apps and other integrations” and copy your API key. 2) Also enter your account "
      + "email: they are sent as username and password (basic authentication). 3) It is the integration API (the Zapier one): folders, "
      + "records, comments and calls.",
    test: { path: "/triggers/auth-test", account: (d) => d?.email || d?.name },
    examples: "Examples: GET /triggers/auth-test, GET /triggers/readable-folder, GET /triggers/folder-field/{folderId}, "
      + "GET /searches/find-record/{folderId}?query=Name:Doe&limit=10, GET /triggers/new-record/{folderId}, "
      + "POST /actions/create-record/{folderId}, POST /actions/create-comment/{recordId}, POST /actions/update-record/{recordId}.",
  },
  {
    id: "nocrmio", name: "noCRM.io", category: "crm", description: "Sales lead management: leads, pipelines, steps and users",
    website: "https://www.nocrm.io", docs: "https://www.nocrm.io/api", logo: { favicon: "https://www.nocrm.io" },
    baseUrl: "https://{subdomain}.nocrm.io/api/v2",
    auth: { type: "header", name: "X-API-KEY" },
    fields: [{ id: "token", label: "API key", secret: true },
             { id: "subdomain", label: "Account subdomain", format: "subdomain",
               help: "The first part of your account address: in https://yourcompany.nocrm.io it is “yourcompany”." }],
    help: "1) A noCRM.io administrator generates the API key from the administration section (“Admin”), in the "
      + "integrations area. 2) Copy it and enter your account subdomain. 3) Quota: 2,000 requests per day; if you exceed it, the API "
      + "responds 429.",
    test: { path: "/ping", message: "API key is valid" },
    examples: "Examples: GET /ping, GET /leads (optional filters such as status and limit), GET /leads/{id}, "
      + "POST /leads {\"title\": \"…\", \"description\": \"…\"}, GET /pipelines, GET /steps, GET /clients, GET /users.",
  },
  {
    id: "nutshell", name: "Nutshell", category: "crm", description: "CRM and email marketing: accounts, contacts, leads and activities",
    website: "https://www.nutshell.com", docs: "https://developers.nutshell.com", logo: { favicon: "https://www.nutshell.com" },
    baseUrl: "https://app.nutshell.com",
    auth: { type: "basic", usernameField: "email", passwordField: "token" },
    fields: [{ id: "email", label: "Your Nutshell user email" },
             { id: "token", label: "API key", secret: true }],
    keyUrl: "https://app.nutshell.com/setup/api-key",
    help: "1) In Nutshell open “Setup” → “API keys” (app.nutshell.com/setup/api-key) and create a key. 2) Enter the email you "
      + "sign in to Nutshell with and the key: all its APIs use basic authentication with those two values. 3) The key works for the "
      + "REST API (/rest/…) and for the old JSON-RPC one (POST /api/v1/json).",
    test: { path: "/rest/users", query: { "page[limit]": 1 }, message: "Credentials are valid" },
    examples: "REST: GET /rest/users, GET /rest/leads?page[limit]=20&page[page]=0 (the page starts at 0), GET /rest/contacts, "
      + "GET /rest/accounts/{id} (ids carry a suffix, e.g. 3-accounts). JSON-RPC: POST /api/v1/json "
      + "{\"jsonrpc\": \"2.0\", \"method\": \"findUsers\", \"params\": {\"limit\": 5}, \"id\": \"1\"}.",
  },
];
