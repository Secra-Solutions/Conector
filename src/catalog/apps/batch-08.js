// Batch 08 of the catalog, from the Composio catalog: CRM and sales (sales intelligence, outbound prospecting, CRM and customer
// inboxes) and customer support. The per-customer URLs (Re:amaze, RepairShopr, Request Tracker, Salesmate, Simla.com) cannot be
// tested without real credentials: they were checked by hand against each service's documentation.
// Parma can also connect with one click (OAuth), but its app credentials are requested from Parma by email; the rest use a key.

const count = (n, singular, plural) => `${n} ${n === 1 ? singular : plural}`;
// “N things” if the response is a list; otherwise the fallback text.
const list = (d, one, many, fallback = "Credentials are valid") => (Array.isArray(d) ? count(d.length, one, many) : fallback);

export default [
  {
    id: "oceanio", name: "Ocean.io", category: "crm",
    description: "Search, enrich and reveal B2B companies and contacts",
    website: "https://www.ocean.io", docs: "https://app.ocean.io/docs/", logo: { favicon: "https://www.ocean.io" },
    baseUrl: "https://api.ocean.io",
    auth: { type: "header", name: "X-Api-Token" },
    fields: [{ id: "token", label: "API token", secret: true }],
    keyUrl: "https://app.ocean.io/settings/api-tokens",
    help: "1) Sign in at app.ocean.io with your account. 2) Open “Account Settings” → “API Tokens”, click “Generate new token” and copy it: "
      + "it is not shown again. 3) The token inherits the permissions of your plan: searches, enrichments and reveals of "
      + "emails or phone numbers use credits (checking the balance does not) and some endpoints, such as previews, return 402 if your plan does not include them.",
    test: { path: "/v2/credits/balance",
              message: (d) => (d?.credits ? `${(d.credits.oneTime || 0) + (d.credits.recurrent || 0)} standard credits available`
                : "API token is valid") },
    examples: "Almost everything is a POST with a JSON body. Examples: GET /v2/credits/balance, "
      + "POST /v3/search/companies {\"companiesFilters\": {\"primaryLocations\": {\"includeCountries\": [\"es\"]}, "
      + "\"companySizes\": [\"51-200\"]}, \"size\": 10}, POST /v2/enrich/company {\"company\": {\"domain\": \"ocean.io\"}}, "
      + "POST /v2/lookup/companies {\"domains\": [\"stripe.com\"], \"fields\": [\"name\", \"companySize\"]}, "
      + "POST /v2/reveal/emails, POST /v2/autocomplete/job-titles, GET /v2/data-fields.",
  },
  {
    id: "openfunnel", name: "OpenFunnel", category: "crm",
    description: "Find companies, search lookalikes and enrich them for B2B sales",
    website: "https://openfunnel.ai", docs: "https://docs.openfunnel.dev/api-reference/", logo: { favicon: "https://openfunnel.ai" },
    baseUrl: "https://api.openfunnel.dev",
    auth: { type: "header", name: "X-API-Key" },
    fields: [{ id: "token", label: "API key (of_…)", secret: true }],
    help: "1) OpenFunnel has no dashboard for keys: they are requested through the API. Send POST https://api.openfunnel.dev/api/v1/agent/sign-up "
      + "with {\"email\": \"you@example.com\"} and you will receive a 6-digit code by email. 2) Confirm it with POST /api/v1/agent/verify "
      + "{\"email\": \"…\", \"otp_code\": \"123456\"}: the response contains “api_key” (of_…), which is shown only once (if you lose it, "
      + "repeat step 1). 3) Paste it here. Enrichments and lookalike searches use credits.",
    test: { path: "/api/v1/credits/balance",
              message: (d) => (d?.credits_left !== undefined ? `${d.credits_left} of ${d.total_credits} credits available`
                : "API key is valid") },
    examples: "Examples: GET /api/v1/credits/balance, POST /api/v1/account/lookup-companies {\"companies\": [{\"domain\": \"stripe.com\"}]} "
      + "(no cost), GET /api/v1/account/search-by-name-or-domain?query=stripe&limit=5, "
      + "GET /api/v1/account/search-lookalikes?seed_domains=stripe.com&limit=10, POST /api/v1/enrich/account {\"domain\": \"stripe.com\"}, "
      + "POST /api/v1/account/search-lookalikes-bulk (asynchronous: check the result at GET …/search-lookalikes-bulk/{job_id}).",
  },
  {
    id: "parma", name: "Parma", category: "crm",
    description: "Relationship CRM: people, companies, deals, notes and groups",
    website: "https://parma.ai", docs: "https://developers.parma.ai", logo: { favicon: "https://parma.ai" },
    baseUrl: "https://app.parma.ai/api/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API token", secret: true }],
    // One click: Conector's app in Parma (its credentials are requested from Parma by email). A single scope, “full”.
    keyUrl: "https://app.parma.ai/api",
    help: "1) Sign in at app.parma.ai with your account. 2) Open app.parma.ai/api, where Parma shows the API tokens of your "
      + "workspace, and copy one. 3) The token gives access to the whole workspace. The documentation does not state a minimum plan.",
    test: { path: "/users/me", account: (d) => d?.data?.user?.email || d?.data?.account?.name },
    examples: "Responses come inside “data”. Examples: GET /users/me, GET /relationships?name=Acme&page=1, "
      + "GET /relationships/{id}, POST /relationships {\"name\": \"Acme\", \"type\": \"company\", \"group_ids\": [1]}, "
      + "GET /deals, GET /pipelines, GET /stages, GET /notes, POST /notes, GET /groups.",
  },
  {
    id: "persistiq", name: "PersistIQ", category: "crm",
    description: "Outbound sales: PersistIQ leads, campaigns and users",
    website: "https://www.persistiq.com", docs: "https://apidocs.persistiq.com", logo: { favicon: "https://www.persistiq.com" },
    baseUrl: "https://api.persistiq.com/v1",
    auth: { type: "header", name: "x-api-key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) Sign in at app.persistiq.com. 2) Click your profile picture (bottom left) → “Integrations” and open the "
      + "“PersistIQ API” section. 3) Copy the key: it can see your account's leads and campaigns. The documentation does not state a minimum plan.",
    test: { path: "/users", message: (d) => list(d?.users, "user in the account", "users in the account", "API key is valid") },
    examples: "Examples: GET /users, GET /leads?page=1, GET /leads/{id}, GET /campaigns, GET /lead_statuses, "
      + "POST /leads {\"leads\": [{\"email\": \"jane@acme.com\", \"first_name\": \"Jane\"}], \"dup\": \"skip\", \"creator_id\": \"u_…\"} "
      + "(creates up to 10 leads per call; creator_id is the user id shown in GET /users).",
  },
  {
    id: "persona", name: "Persona", category: "security",
    description: "Identity verification and fraud prevention (KYC)",
    website: "https://withpersona.com", docs: "https://docs.withpersona.com/api-introduction", logo: { favicon: "https://withpersona.com" },
    baseUrl: "https://api.withpersona.com/api/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key (persona_sandbox_… or persona_production_…)", secret: true }],
    keyUrl: "https://app.withpersona.com/dashboard/api-keys",
    help: "1) Go to the Persona dashboard (app.withpersona.com) and choose the environment: Sandbox for testing, or Production (requires a "
      + "verified organization and a purchased plan). 2) Open “API” → “API Keys”, click “Create API key” and copy the key: each environment has "
      + "its own and, until you restrict them, they have all permissions. 3) According to its documentation, using the API as the only way of "
      + "integrating is limited to Enterprise plans.",
    test: { path: "/inquiries", query: { "page[size]": 1 }, message: "API key is valid" },
    examples: "Responses use the JSON:API format (data, attributes, included). Examples: GET /inquiries?page[size]=10, GET /inquiries/{id}, "
      + "POST /inquiries {\"data\": {\"attributes\": {\"inquiry-template-id\": \"itmpl_…\"}}} (creates a verification), "
      + "GET /accounts?page[size]=10, GET /verifications/{id}, GET /reports, GET /api-keys. The Persona-Version header "
      + "(e.g. 2023-01-05) pins the API version; without it, your organization's version is used.",
  },
  {
    id: "pipelinecrm", name: "Pipeline CRM", category: "crm",
    description: "Sales CRM: deals, people, companies, notes and tasks",
    website: "https://pipelinecrm.com", docs: "https://app.pipelinecrm.com/api/docs", logo: { favicon: "https://pipelinecrm.com" },
    baseUrl: "https://api.pipelinecrm.com/api/v3",
    auth: [{ type: "bearer" }, { type: "header", name: "app-key", field: "app_key" }],
    fields: [{ id: "token", label: "API token (pcrm_live_…) or legacy api_key", secret: true },
             { id: "app_key", label: "App key (only with the legacy api_key)", secret: true, optional: true,
               help: "Leave it empty if you use an API token. The legacy key uses an app key registered in Admin → API Integrations." }],
    keyUrl: "https://app.pipelinecrm.com/user/api_tokens",
    help: "1) An administrator must give you permission to manage API tokens (Admin → Users). 2) In your profile, open “API tokens” "
      + "(app.pipelinecrm.com/user/api_tokens), create a token (read-only if you will not write) and copy it: it is shown only once. "
      + "3) If your account does not have that page yet, use the legacy “api_key” (Admin → API Keys) and, in the other field, an app key from "
      + "Admin → API Integrations. Limit: 10 requests per second.",
    test: { path: "/users", query: { per_page: 1 }, message: "Credentials are valid" },
    examples: "Lists return “entries” and “pagination” (per_page up to 200). Examples: GET /deals?per_page=25, GET /people, "
      + "GET /companies, GET /notes, GET /calendar_entries, GET /admin/deal_stages, GET /users, "
      + "POST /deals {\"deal\": {\"name\": \"Acme renewal\", \"value\": 5000}} (the body is wrapped in the record name). "
      + "Avoid GET /profile: it also returns the user's legacy api_key.",
  },
  {
    id: "plain", name: "Plain", category: "support",
    description: "B2B support (GraphQL): threads, customers, labels and notes",
    website: "https://www.plain.com", docs: "https://www.plain.com/docs/graphql/introduction", logo: { favicon: "https://www.plain.com" },
    baseUrl: "https://core-api.uk.plain.com", graphql: { path: "/graphql/v1" },
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key (plainApiKey_…)", secret: true }],
    help: "1) In Plain, open “Settings” → “Machine Users” and click “+ Add Machine User” (internal name and public name). 2) Inside, "
      + "click “Add API key”, select only the permissions you need (customer:read, thread:read…) and copy the key: it is not "
      + "shown again. 3) The key can only do what you allow; if a permission is missing, Plain's error says which one.",
    test: { method: "POST", path: "/graphql/v1", body: { query: "{ myWorkspace { id name publicName } }" },
              account: (d) => d?.data?.myWorkspace?.publicName || d?.data?.myWorkspace?.name, message: "API key is valid" },
    examples: "This is a GraphQL API: use plain_graphql (or POST /graphql/v1 with {\"query\": \"…\", \"variables\": {…}}). Queries: "
      + "{ myWorkspace { id name } }, { customerByEmail(email: \"jane@acme.com\") { id fullName } }, "
      + "{ threads(first: 10) { edges { node { id title status } } } }, { customers(first: 20) { edges { node { id fullName } } } }. "
      + "Mutations: upsertCustomer, createThread, replyToThread, markThreadAsDone, createNote, addLabels; each takes an “input”.",
  },
  {
    id: "predictleads", name: "PredictLeads", category: "crm",
    description: "Company signals: jobs, technologies, financing and news",
    website: "https://predictleads.com", docs: "https://docs.predictleads.com", logo: { favicon: "https://predictleads.com" },
    baseUrl: "https://predictleads.com/api/v3",
    auth: [{ type: "header", name: "X-Api-Key", field: "api_key" }, { type: "header", name: "X-Api-Token", field: "token" }],
    fields: [{ id: "api_key", label: "API key", secret: true },
             { id: "token", label: "API token", secret: true }],
    help: "1) Sign in to your PredictLeads account (predictleads.com) and find your “API key” and your “API token” in the dashboard (if you do not see them, "
      + "ask PredictLeads support). 2) Copy both: they are needed on every request. 3) Each data query uses credits from "
      + "your monthly quota; checking the subscription is free. Accounts have request limits.",
    test: { path: "/api_subscription",
              message: (d) => {
                const a = d?.data?.[0]?.attributes;
                return a ? `${a.monthly_credits_used ?? "?"} of ${a.monthly_credits_quota ?? "?"} credits used this month` : "Credentials are valid";
              } },
    examples: "Responses use the JSON:API format. Examples: GET /api_subscription (free), GET /companies/stripe.com, "
      + "GET /companies/stripe.com/job_openings, GET /companies/stripe.com/technology_detections, "
      + "GET /companies/stripe.com/financing_events, GET /companies/stripe.com/news_events, GET /discover/job_openings, "
      + "GET /discover/companies, GET /followings, POST /companies/{domain}/follow (free).",
  },
  {
    id: "productlane", name: "Productlane", category: "support",
    description: "Support and feedback on Linear: threads, contacts and changelogs",
    website: "https://productlane.com", docs: "https://productlane.com/docs/integrations/api", logo: { favicon: "https://productlane.com" },
    baseUrl: "https://productlane.com/api/v2",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API v2 key (pl_v2_…)", secret: true }],
    help: "1) In Productlane, open “Settings” → “API” and, in the keys block, click “New API key”. 2) Give it a label, choose "
      + "“Full access” or only the permissions (scopes) you need, and copy the secret: it is shown only once. 3) It must be a v2 key "
      + "(it starts with pl_v2_): old ones return error 410 and the v1 API stops working on November 20, 2026.",
    test: { path: "/me",
              message: (d) => (d?.workspace_id ? `Key is valid (workspace ${d.workspace_id}, ${count((d.scopes || []).length, "permission", "permissions")})`
                : "API key is valid") },
    examples: "Lists are paginated with limit and cursor. Examples: GET /me (workspace and permissions of the key), GET /threads?status=open&limit=20, "
      + "GET /threads/{id}?expand=messages,comments, POST /threads {\"title\": \"…\", \"text\": \"<p>…</p>\"}, "
      + "POST /threads/{id}/messages, GET /contacts, GET /companies, GET /changelogs, GET /issues, GET /projects, GET /docs/articles.",
  },
  {
    id: "prospeo", name: "Prospeo", category: "crm",
    description: "Search and enrich B2B people and companies with verified emails",
    website: "https://prospeo.io", docs: "https://prospeo.io/api-docs", logo: { favicon: "https://prospeo.io" },
    baseUrl: "https://api.prospeo.io",
    auth: { type: "header", name: "X-KEY" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://app.prospeo.io/api",
    help: "1) Sign in at app.prospeo.io with your account. 2) Open app.prospeo.io/api and create an API key (you can have several). "
      + "3) Paste it here. Enrichments and searches use credits from your plan (1 per email found and 10 per mobile number); "
      + "checking the account does not.",
    test: { path: "/account-information",
              message: (d) => {
                const r = d?.response || d;
                return r?.remaining_credits !== undefined ? `Plan ${r.current_plan ?? "?"}: ${r.remaining_credits} credits remaining`
                  : "API key is valid";
              } },
    examples: "Everything is a POST with a JSON body except the account. Examples: GET /account-information (free), "
      + "POST /enrich-person {\"only_verified_email\": true, \"data\": {\"full_name\": \"Jane Doe\", \"company_website\": \"intercom.com\"}}, "
      + "POST /enrich-company, POST /search-person, POST /search-company, POST /bulk-enrich-person, POST /search-suggestions. "
      + "Enriching the same record again within 90 days is free.",
  },
  {
    id: "quo", name: "Quo", category: "communication",
    description: "Business phone (formerly OpenPhone): calls, SMS and contacts",
    website: "https://www.quo.com", docs: "https://www.quo.com/docs/2026-03-30/introduction", logo: { favicon: "https://www.quo.com" },
    baseUrl: "https://api.quo.com", headers: { "Quo-Api-Version": "2026-03-30" },
    auth: { type: "header", name: "Authorization" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) You need an active Quo subscription and must be an owner or admin of the workspace. 2) Open “Workspace "
      + "Settings” → “API”, click “Generate API key” and give it a label without spaces. 3) Copy the key: it gives full access to the API "
      + "of the workspace and is sent as is, without “Bearer”. To send SMS to the US, you must first complete the carrier "
      + "registration (A2P).",
    test: { path: "/organization", account: (d) => d?.data?.name },
    examples: "The current version goes in the Quo-Api-Version header (already included) and returns “data” and “nextCursor” (limit 1–50, after). "
      + "Examples: GET /organization, GET /users, GET /phone-numbers, GET /contacts, GET /conversations, GET /calls, GET /messages, "
      + "GET /tasks. Sending an SMS still uses the previous API: POST /v1/messages {\"content\": \"…\", \"from\": \"PN…\", "
      + "\"to\": [\"+12025550123\"]}. Limit: 10 requests per second.",
  },
  {
    id: "reamaze", name: "Re:amaze", category: "support",
    description: "Multichannel support: conversations, contacts, channels, articles",
    website: "https://www.reamaze.com", docs: "https://www.reamaze.com/api", logo: { favicon: "https://www.reamaze.com" },
    baseUrl: "https://{brand}.reamaze.io/api/v1",
    auth: { type: "basic", usernameField: "email", passwordField: "token" },
    fields: [{ id: "email", label: "Email you use to sign in to Re:amaze" },
             { id: "token", label: "API token", secret: true },
             { id: "brand", label: "Brand (subdomain)", format: "subdomain", example: "example",
               help: "The part before .reamaze.io in your account address; it also appears in “Brand Settings”." }],
    help: "1) In Re:amaze, open “Settings” and, in the “Developer” section, click “API Token”. 2) Click “Generate New Token” and copy it: "
      + "it is personal to each user and acts with their permissions. 3) Enter the email you sign in with and your account's "
      + "brand here. There is a limit on requests per minute and token (error 429 if you exceed it).",
    test: { path: "/channels", message: (d) => list(d?.channels, "channel", "channels", "Credentials are valid") },
    examples: "Examples: GET /channels, GET /conversations?filter=open&page=1, GET /conversations/{slug}, "
      + "GET /conversations/{slug}/messages, POST /conversations {\"conversation\": {\"subject\": \"…\", \"category\": \"channel-slug\", "
      + "\"message\": {\"body\": \"…\"}, \"user\": {\"name\": \"Jane\", \"email\": \"jane@acme.com\"}}}, GET /contacts, GET /staff, "
      + "GET /articles.",
  },
  {
    id: "repairshopr", name: "RepairShopr", category: "crm",
    description: "Repair shops and IT support: customers, tickets, invoices, products",
    website: "https://www.repairshopr.com", docs: "https://api-docs.repairshopr.com", logo: { favicon: "https://www.repairshopr.com" },
    baseUrl: "https://{subdomain}.repairshopr.com/api/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API token", secret: true },
             { id: "subdomain", label: "Your account subdomain", format: "subdomain", example: "example",
               help: "The part before .repairshopr.com in your account address." }],
    help: "1) Sign in to your RepairShopr account (https://yoursubdomain.repairshopr.com). 2) In your user profile (or in “Admin” → "
      + "“API Tokens”, depending on your version) create a token and copy it: it belongs to your user and has their permissions. 3) Enter the "
      + "account subdomain here. Limit: 180 requests per minute per IP address.",
    test: { path: "/me", account: (d) => d?.user_email || d?.user_name },
    examples: "Lists are paginated with page. Examples: GET /me, GET /customers?query=acme, GET /tickets?status=New, "
      + "GET /tickets?status=Not%20Closed, POST /tickets {\"customer_id\": 123, \"subject\": \"…\", \"problem_type\": \"Other\"}, "
      + "GET /invoices, GET /estimates, GET /products, GET /customer_assets, GET /appointments, GET /search?query=acme.",
  },
  {
    id: "replyio", name: "Reply.io", category: "crm",
    description: "Outbound sales: sequences, contacts, inbox and reports",
    website: "https://reply.io", docs: "https://docs.reply.io", logo: { favicon: "https://reply.io" },
    baseUrl: "https://api.reply.io",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) Sign in at app.reply.io with your account. 2) Open “Settings” → “API Key” and copy the key (you can also regenerate it there). "
      + "3) This app uses API v3 (paths /v3/…); versions 1 and 2 are deprecated. The key acts with your user's permissions.",
    test: { path: "/v3/whoami", account: (d) => d?.username },
    examples: "Examples: GET /v3/whoami, GET /v3/sequences, GET /v3/contacts?top=25&skip=0, GET /v3/contacts?email=jane@acme.com, "
      + "POST /v3/contacts {\"email\": \"jane@acme.com\", \"firstName\": \"Jane\", \"lastName\": \"Doe\"}, GET /v3/contact-lists, "
      + "GET /v3/email-accounts, GET /v3/inbox/threads, GET /v3/tasks, GET /v3/reporting/emails.",
  },
  {
    id: "requesttracker", name: "Request Tracker (RT)", category: "support",
    description: "Tickets, queues, users, assets and articles in your RT",
    website: "https://bestpractical.com/request-tracker", docs: "https://docs.bestpractical.com/rt/5.0.5/RT/REST2.html",
    logo: { favicon: "https://bestpractical.com" },
    baseUrl: "{url}/REST/2.0",
    auth: { type: "header", name: "Authorization", prefix: "token " },
    fields: [{ id: "url", label: "Your RT address (https://…)", format: "url",
               help: "The address of your installation, without /REST/2.0 (e.g. https://rt.example.com); it must be https." },
             { id: "token", label: "Authentication token", secret: true }],
    help: "1) In RT, click “Logged in as …” → “Settings” → “Auth Tokens” (RT 5, or RT 4.4 with the REST2 and Authen::Token extensions). "
      + "2) Create a token with any description and copy it: it is shown only once and acts with your user's permissions. "
      + "3) Enter the address of your RT: the REST2 API lives at /REST/2.0 and must be reachable over https.",
    test: { path: "/queues/all", query: { per_page: 1 }, message: (d) => `${d?.total ?? "?"} queues visible` },
    examples: "Lists return total, page, per_page and items (with _url). Examples: GET /queues/all, "
      + "GET /tickets with query = \"Queue = 'General' AND Status = 'open'\" and per_page=20 (TicketSQL), GET /ticket/{id}, "
      + "POST /ticket {\"Queue\": \"General\", \"Subject\": \"…\", \"Content\": \"…\"}, POST /ticket/{id}/correspond {\"Content\": \"…\"}, "
      + "POST /ticket/{id}/comment, GET /ticket/{id}/history, GET /user/{user}, GET /assets, GET /articles.",
  },
  {
    id: "respondio", name: "respond.io", category: "communication",
    description: "Customer conversations: contacts, messages, channels and team",
    website: "https://respond.io", docs: "https://developers.respond.io", logo: { favicon: "https://respond.io" },
    baseUrl: "https://api.respond.io/v2",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "Developer API access token", secret: true }],
    help: "1) You need a respond.io Growth plan or higher. 2) In “Settings” → “Integrations” → “Developer API”, click “Edit” and "
      + "then “Add Access Token”. 3) Copy the token (each workspace supports up to 10). Request limits apply "
      + "per organization: if you exceed them, the API responds 429.",
    test: { path: "/space/user", message: (d) => list(d?.items, "user in the workspace", "users in the workspace", "Token is valid") },
    examples: "Examples: GET /space/user, GET /space/channel, GET /space/custom_field, POST /contact/list (contact search), "
      + "GET /contact/id:123 (also email:jane@acme.com or phone:+12025550123), POST /contact/create, "
      + "POST /contact/{identifier}/message {\"channelId\": 1234, \"message\": {\"type\": \"text\", \"text\": \"Hello\"}}, "
      + "GET /contact/{identifier}/message/list, POST /contact/{identifier}/tag, POST /contact/{identifier}/comment.",
  },
  {
    id: "rocketreach", name: "RocketReach", category: "crm",
    description: "Find and verify emails, phone numbers and professional profiles",
    website: "https://rocketreach.co", docs: "https://docs.rocketreach.co", logo: { favicon: "https://rocketreach.co" },
    baseUrl: "https://api.rocketreach.co/api/v2",
    auth: { type: "header", name: "Api-Key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://rocketreach.co/account?section=nav_gen_api",
    help: "1) Sign in at rocketreach.co and open “Account Settings” → “API” (rocketreach.co/account?section=nav_gen_api). 2) Under “My API Key”, "
      + "click “Generate New API Key” and copy the key. 3) The API requires a plan with API access (if you do not have one, write to "
      + "api@rocketreach.co); people lookups use credits and there are limits per minute, hour and day.",
    test: { path: "/account/", account: (d) => d?.email },
    examples: "Examples: GET /account/ (credits and limits), GET /person/lookup?name=Jane%20Doe&current_employer=Acme (uses a credit), "
      + "GET /person/checkStatus?ids=123, POST /person/search {\"query\": {\"current_employer\": [\"Acme\"], \"current_title\": [\"CEO\"]}}, "
      + "GET /company/lookup/?domain=acme.com, POST /company/search, POST /bulkLookup.",
  },
  {
    id: "salesflare", name: "Salesflare", category: "crm",
    description: "B2B CRM: accounts, contacts, opportunities, tasks and workflows",
    website: "https://salesflare.com", docs: "https://api.salesflare.com/docs", logo: { favicon: "https://salesflare.com" },
    baseUrl: "https://api.salesflare.com",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://app.salesflare.com/#/settings/apikeys",
    help: "1) Sign in at app.salesflare.com. 2) Open “Settings” → “API keys” (app.salesflare.com/#/settings/apikeys). 3) Click the "
      + "orange “+” button (bottom right), create the key and copy it: it acts with your user's permissions. The documentation does not state "
      + "a minimum plan.",
    test: { path: "/me", account: (d) => d?.email || d?.name },
    examples: "Examples: GET /me, GET /accounts?search=acme&limit=20, GET /contacts?limit=20, GET /opportunities, GET /tasks, GET /users, "
      + "GET /pipelines, GET /tags, GET /workflows, POST /accounts {\"name\": \"Acme\", \"website\": \"acme.com\"}, "
      + "POST /tasks {\"description\": \"Call Jane\", \"account\": 123}. Lists support limit, offset and order_by.",
  },
  {
    id: "salesmate", name: "Salesmate", category: "crm",
    description: "Sales CRM: contacts, companies, deals and activities",
    website: "https://www.salesmate.io", docs: "https://apidocs.salesmate.io", logo: { favicon: "https://www.salesmate.io" },
    baseUrl: "https://{subdomain}.salesmate.io/apis",
    headers: (c) => ({ "x-linkname": `${c.subdomain}.salesmate.io` }),
    auth: { type: "header", name: "accessToken" },
    fields: [{ id: "token", label: "Session key (under “My Account” → “Access Key”)", secret: true },
             { id: "subdomain", label: "Your account name (link name)", format: "subdomain", example: "example",
               help: "The part before .salesmate.io in your account address (if you sign in at demo.salesmate.io, it is “demo”)." }],
    help: "1) Sign in to your Salesmate account (yourcompany.salesmate.io). 2) Click your profile picture → “My Account” → “Access Key” and "
      + "copy the “Session Key”: it acts with your user's permissions. 3) Enter your account name, which is the part before "
      + ".salesmate.io in the browser address (Conector sends the x-linkname header for you).",
    test: { path: "/core/v4/users", query: { status: "active" }, message: "Credentials are valid" },
    examples: "Use the v4 paths (v1 and v3 are deprecated). Examples: GET /core/v4/users?status=active, "
      + "POST /contact/v4/search?rows=25&from=0 {\"displayingFields\": [\"contact.name\", \"contact.email\"], \"filterQuery\": {…}}, "
      + "GET /contact/v4/{id}, POST /contact/v4 {\"firstName\": \"Jane\", \"lastName\": \"Doe\", \"email\": \"jane@acme.com\"}, "
      + "POST /company/v4/search, POST /deal/v4/search, POST /activity/v4/search, GET /module/v4/modules/{internal_name}.",
  },
  {
    id: "salesrobot", name: "SalesRobot", category: "crm",
    description: "LinkedIn prospecting: campaigns, prospects and inbox",
    website: "https://www.salesrobot.co", docs: "https://docs.salesrobot.co", logo: { favicon: "https://www.salesrobot.co" },
    baseUrl: "https://app.boomtechinc.com",
    auth: { type: "header", name: "x-api-key" },
    fields: [{ id: "token", label: "Access token", secret: true }],
    help: "1) Sign in to the SalesRobot platform with your account. 2) Find the “Access Tokens” management page (its documentation does not state "
      + "the exact menu), create a token and copy it: it is your API key. 3) It has broad privileges: do not share it. Almost everything is done "
      + "per LinkedIn account (linkedinAccountUuid), which you get with GET /api/linkedinAccounts.",
    test: { path: "/api/linkedinAccounts", message: "Token is valid" },
    examples: "The API lives at app.boomtechinc.com. Lists support page (from 0), size and sort. Examples: GET /api/linkedinAccounts, "
      + "GET /api/campaigns?linkedinAccountUuid=…, GET /api/campaign/prospects?linkedinAccountUuid=…&campaignUuid=…, "
      + "POST /api/add-single-prospect?linkedinAccountUuid=…&campaignUuid=…, "
      + "POST /api/start?linkedinAccountUuid=…&campaignUuid=…&hasInviteMessage=true (starts the campaign), "
      + "POST /api/campaign/stats?linkedinAccountUuid=…, POST /api/syncedMessages?linkedinAccountUuid=…&pg=0 (inbox), "
      + "POST /api/sendAMessage.",
  },
  {
    id: "satismeter", name: "SatisMeter", category: "support",
    description: "NPS and CSAT surveys: campaigns and customer responses",
    website: "https://www.satismeter.com", logo: { favicon: "https://www.satismeter.com" },
    docs: "https://support.satismeter.com/hc/en-us/articles/48846544018323-REST-API-for-SatisMeter",
    baseUrl: "https://app.satismeter.com/api/v3/projects/{project}",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key (read key)", secret: true },
             { id: "project", label: "Project ID", example: "5bb480aaebf3ed0004c6f3dd",
               help: "It appears on the same page as the API key; each key belongs to a single project." }],
    help: "1) Sign in at app.satismeter.com and choose the project. 2) Open “Settings” → “Integrations” → “API Keys”: the (read) API "
      + "key and the project ID are there. 3) Paste them here. Each key works for a single project, so connect one for "
      + "each project you want to query.",
    test: { path: "/campaigns", message: (d) => list(d?.data, "survey", "surveys", "Credentials are valid") },
    examples: "Everything is scoped to the project (already included in the base URL). Examples: GET /campaigns (the project's surveys), GET /responses "
      + "(responses, with pagination and date filters), GET /campaigns/{campaignId}/responses.",
  },
  {
    id: "simlacom", name: "Simla.com", category: "crm",
    description: "CRM and ecommerce (formerly RetailCRM): orders, customers, catalog",
    website: "https://www.simla.com", docs: "https://docs.simla.com/Developers/API/APIVersions/APIv5", logo: { favicon: "https://www.simla.com" },
    baseUrl: "https://{domain}/api",
    auth: { type: "header", name: "X-API-KEY" },
    fields: [{ id: "domain", label: "Your account address (e.g. yourcompany.simla.com)", format: "domain",
               help: "The domain you use to sign in to Simla.com, without https:// or slashes (older accounts may be *.retailcrm.pro)." },
             { id: "token", label: "API key", secret: true }],
    help: "1) Sign in to your Simla.com account as an administrator. 2) Open “Administration” → “Integration” → “API keys” and "
      + "create a key with the permissions (scopes) you need: orders, customers, catalog… 3) Copy it and enter your account domain "
      + "here. The key can only do what you allow and, if a permission is missing, the API says so.",
    test: { path: "/credentials",
              message: (d) => (Array.isArray(d?.scopes) ? `${count(d.scopes.length, "permission granted", "permissions granted")} to the key`
                : "API key is valid") },
    examples: "The version goes in the path. Examples: GET /credentials (permissions and stores of the key), GET /v5/orders?limit=20&page=1, "
      + "GET /v5/customers?limit=20, GET /v5/store/products, GET /v5/reference/sites, GET /v5/orders/{id}?by=id&site=store. "
      + "Writes are sent as a form (application/x-www-form-urlencoded) with site and the object as JSON, "
      + "e.g. POST /v5/orders/create with a form {site: \"store\", order: \"{…}\"}.",
  },
];
