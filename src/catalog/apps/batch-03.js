// Batch 03 of the catalog, from the Composio catalog: messaging, telephony, video conferencing and communities, plus Wufoo and Workiom.
import { z } from "zod";
import { ensureOk } from "../define.js";

export default [
  {
    id: "agentmail", name: "AgentMail", category: "communication", description: "Dedicated email inboxes for AI agents",
    website: "https://www.agentmail.to", docs: "https://docs.agentmail.to/api-reference", logo: { favicon: "https://www.agentmail.to" },
    baseUrl: "https://api.agentmail.to/v0",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key (am_…)", secret: true }],
    keyUrl: "https://console.agentmail.to",
    help: "1) Create an account at console.agentmail.to: the free plan includes 3 inboxes and 3,000 emails per month, no card required. "
      + "2) In the dashboard, generate an API key and copy it: it is shown only once. "
      + "3) The key gives access to all inboxes in the organization.",
    test: { path: "/inboxes", query: { limit: 1 }, message: "API key is valid" },
    examples: "Examples: GET /inboxes, POST /inboxes {\"username\": \"agent\", \"display_name\": \"Agent\"}, "
      + "GET /inboxes/{inbox_id}/messages?limit=20, "
      + "POST /inboxes/{inbox_id}/messages/send {\"to\": [\"a@x.com\"], \"subject\": \"…\", \"text\": \"…\"}, "
      + "GET /inboxes/{inbox_id}/threads.",
  },
  {
    id: "aircall", name: "Aircall", category: "communication", description: "Aircall calls, numbers, users and contacts",
    website: "https://aircall.io", docs: "https://developer.aircall.io/api-references/", logo: { simpleIcons: "aircall" },
    baseUrl: "https://api.aircall.io/v1",
    auth: { type: "basic", usernameField: "api_id", passwordField: "api_token" },
    fields: [{ id: "api_id", label: "API ID" },
             { id: "api_token", label: "API token", secret: true }],
    keyUrl: "https://dashboard.aircall.io/company",
    help: "1) In the Aircall dashboard, as an admin user, open “Company settings” and scroll down to the “API Keys” section. "
      + "2) Click “Add a new API key” and copy the “API ID” and the “API token”: the token is not shown again. "
      + "3) The key can see all company data. If the “API Keys” section does not appear, your plan may not include the public API.",
    test: { path: "/company", account: (d) => d.company?.name },
    examples: "Examples: GET /calls?order=desc&per_page=20, GET /calls/{id}, GET /users, GET /numbers, "
      + "POST /calls/{id}/comments {\"content\": \"…\"}. Pagination: per_page (max. 50) and page, or the meta.next_page_link link. "
      + "Dates (from, to) are UNIX timestamps in seconds.",
    tools: [
      { name: "aircall_calls", title: "Aircall: recent calls", annotations: { readOnlyHint: true },
        description: "Lists the most recent calls: direction, status, duration, line, agent and the other party's number.",
        schema: { since: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("Only calls since this date (YYYY-MM-DD)"),
                   max: z.number().int().min(1).max(50).default(20) },
        run: async ({ since, max }, p) => (ensureOk(await p({ path: "/calls", query: { order: "desc", per_page: max,
          from: since ? Math.floor(Date.parse(`${since}T00:00:00Z`) / 1000) : undefined } }), "Aircall").calls || []).map((c) => ({
          id: c.id, direction: c.direction, status: c.status, start: c.started_at ? new Date(c.started_at * 1000).toISOString() : undefined,
          seconds: c.duration, line: c.number?.name, agent: c.user?.name, counterpart: c.raw_digits,
          missed: c.missed_call_reason || undefined })) },
    ],
  },
  {
    id: "androidtexter", name: "Android Texter", category: "communication", description: "SMS and MMS from your own Android phones",
    website: "https://androidtexter.com", docs: "https://androidtexter.com/dashboard/docs", logo: { favicon: "https://androidtexter.com" },
    baseUrl: "https://androidtexter.com/api",
    auth: { type: "header", name: "X-API-Key" },
    fields: [{ id: "token", label: "API key (at_…)", secret: true }],
    keyUrl: "https://androidtexter.com/dashboard/settings/api-keys",
    help: "1) Sign up at androidtexter.com: the free plan includes 1 device and 100 messages per day, "
      + "and Pro costs $10 per month per phone. "
      + "2) In the dashboard side menu, open “API Keys”, create a key with the permissions you need and copy it. "
      + "3) Install the app on the Android phone that will send the SMS and link it to your account.",
    test: { path: "/me", account: (d) => d.email || d.user?.email || d.data?.email },
    examples: "Examples: GET /me, GET /devices, POST /messages/send {\"phone\": \"+12025550123\", \"message\": \"…\"}, "
      + "GET /messages/received, GET /v1/messages/history/{phone}. Limit: 60 requests per minute per key.",
  },
  {
    id: "blooio", name: "Blooio", category: "communication", description: "iMessage and SMS: chats, contacts, groups and messages",
    website: "https://blooio.com", docs: "https://docs.blooio.com/reference/v2/account", logo: { favicon: "https://blooio.com" },
    baseUrl: "https://api.blooio.com/v2/api",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key (bl_live_…)", secret: true }],
    help: "1) Go to app.blooio.com (the Blooio dashboard) and open “Developers” → “API keys”. "
      + "2) Create an API key and copy it: it starts with bl_live_. "
      + "3) The key gives access to your organization's numbers, chats and contacts, and you need at least one assigned number to send. "
      + "Plans and sending limits are listed at blooio.com.",
    test: { path: "/me", message: "API key is valid" },
    examples: "Examples: GET /me, GET /me/numbers, GET /chats, GET /chats/{chatId}/messages, "
      + "POST /chats/{chatId}/messages {\"text\": \"…\"}. The chatId is the phone number in E.164 format, URL-encoded, "
      + "e.g. %2B34600111222.",
  },
  {
    id: "callback24", name: "Callback24", category: "communication", description: "Callbacks, users, services and groups",
    website: "https://callback24.io", docs: "https://callback24.io/api/", logo: { favicon: "https://callback24.io" },
    baseUrl: "https://panel.callback24.io/api/v1",
    auth: { type: "header", name: "X-API-TOKEN" },
    fields: [{ id: "token", label: "API token", secret: true }],
    help: "1) Go to panel.callback24.io and click your profile icon at the top right. "
      + "2) Choose “My profile” and open the “API” tab. 3) Copy the token: it acts with your user's permissions. "
      + "The documentation does not state a minimum plan.",
    test: { path: "/services/all", message: (d) => (Array.isArray(d) ? `${d.length} service(s) in Callback24` : "Token is valid") },
    examples: "Examples: GET /services/all, GET /users/all, "
      + "GET /phoneCalls/history?date_from=2026-10-01T00:00:00Z&call_type=CALLBACK&limit=50, GET /phoneCalls/getCallInfo?call_id=…, "
      + "POST /phoneCalls/addPhoneCall {\"service_name\": \"…\", \"phone_number\": \"+1…\"}. Full specification: "
      + "https://api.swaggerhub.com/apis/callback24/callback24/1.26. GET /users/getUserData returns a 500 error if the token is not valid.",
  },
  {
    id: "cardclan", name: "CardClan", category: "communication", description: "Digital team cards: workspaces, cards and deliveries",
    website: "https://cardclan.io", docs: "https://docs.cardclan.io/introduction", logo: { favicon: "https://cardclan.io" },
    baseUrl: "https://app.cardclan.io/api",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "Integration key (UUID)", secret: true }],
    help: "1) Go to app.cardclan.io and open any card you want to use in the integration. "
      + "2) Click “Generate Integration Key” (if it does not have one yet) and copy the key right away: it cannot be viewed again. "
      + "3) It is a 36-character identifier; the key sees the workspaces your user has access to. "
      + "The documentation does not state a minimum plan.",
    test: { path: "/integration/auth/validate", message: "Integration key is valid" },
    examples: "Examples: GET /integration/workspaces, POST /integration/cards?workspace={id} (no body), "
      + "GET /integration/card-details/{cardId}, GET /integration/email-accounts, "
      + "POST /integration/send-card {\"card\": \"…\", \"integrationId\": \"…\", \"emailAccount\": \"CardClan\", \"mergeTags\": [{…}]}. "
      + "With an invalid key it responds 404 (“Invalid bearer token”), not 401.",
  },
  {
    id: "chatwork", name: "Chatwork", category: "communication", description: "Chatwork rooms, messages, tasks and contacts",
    website: "https://go.chatwork.com/en/", docs: "https://developer.chatwork.com/docs/getting-started", logo: { favicon: "https://go.chatwork.com" },
    baseUrl: "https://api.chatwork.com/v2",
    auth: { type: "header", name: "X-ChatWorkToken" },
    fields: [{ id: "token", label: "API token", secret: true }],
    // One click: Chatwork “confidential” OAuth client (the secret goes in the Basic header and the redirect must be https://).
    // Access lasts 30 minutes and renews itself; “offline_access” keeps the refresh token from expiring.
    oauth: { scopes: ["users.all:read", "rooms.all:read_write", "contacts.all:read_write", "offline_access"],
      provider: { name: "Chatwork", key: "chatwork", redirect: "https", clientAuth: "basic",
        authorizeUrl: "https://www.chatwork.com/packages/oauth2/login.php", tokenUrl: "https://oauth.chatwork.com/token",
        help: "1) Sign in to Chatwork and open the OAuth client creation page "
          + "(www.chatwork.com/service/packages/chatwork/subpackages/oauth/client_create.php). 2) Name it “Conector”, "
          + "choose the “Confidential client” type, register the redirect URI shown below as the redirect "
          + "(confidential clients only accept https://) and select the permissions (scopes) shown below. 3) Save and "
          + "copy the “Client ID” and the “Client Secret” from the client management page." },
      help: "Chatwork may require an organization administrator to approve API usage first (not needed on the personal plan). "
        + "Conector acts with the permissions of the person who authorizes." },
    keyUrl: "https://www.chatwork.com/service/packages/chatwork/subpackages/api/token.php",
    help: "1) In Chatwork, click your name (top right) → “Service Integration” → “API Token”. "
      + "2) Copy the token. 3) If your account belongs to an organization, an administrator must first approve API usage "
      + "(“API usage application” request); this is not needed on the personal plan. Limit: 300 requests every 5 minutes.",
    test: { path: "/me", account: (d) => d.name || d.mail },
    examples: "Examples: GET /me, GET /rooms, GET /rooms/{room_id}/messages?force=1, "
      + "POST /rooms/{room_id}/messages with a form {body: \"…\"} (POST and PUT are sent as a form), GET /my/tasks?status=open. "
      + "A 204 means “no new data”.",
    tools: [
      { name: "chatwork_send_message", title: "Chatwork: send a message", annotations: { destructiveHint: true, openWorldHint: true },
        description: "Posts a message to a Chatwork room (group, direct chat or “My Chat”).",
        schema: { room: z.string().describe("Room ID (look it up with GET /rooms)"),
                   text: z.string().min(1).describe("Message (Chatwork notation)") },
        async run({ room, text }, p) {
          const route = `/rooms/${encodeURIComponent(room)}/messages`;
          const d = ensureOk(await p({ method: "POST", path: route, form: { body: text } }), "Chatwork");
          return { sent: true, id: d?.message_id };
        } },
    ],
  },
  {
    id: "clickmeeting", name: "ClickMeeting", category: "communication",
    description: "Webinars and online meetings: rooms, sessions and registrations",
    website: "https://clickmeeting.com", docs: "https://dev.clickmeeting.com/api-guide/", logo: { favicon: "https://clickmeeting.com" },
    baseUrl: "https://api.clickmeeting.com/v1",
    auth: { type: "header", name: "X-Api-Key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://account-panel.clickmeeting.com/account/details#api",
    help: "1) Sign in to your ClickMeeting account and open the account “Settings” tab. "
      + "2) Generate the API key and copy it; if you generate another one, the previous one stops working. "
      + "3) The account must be active and its plan must include the API, which ClickMeeting does not specify in its documentation.",
    test: { path: "/ping", message: "API key is valid" },
    examples: "Examples: GET /conferences/active, GET /conferences/{room_id}, GET /conferences/{room_id}/sessions, "
      + "GET /conferences/{room_id}/registrations/all, "
      + "POST /conferences/{room_id}/registration with a form {\"registration[1]\": \"First name\", \"registration[2]\": \"Last name\", "
      + "\"registration[3]\": \"a@x.com\"}. POST and PUT are sent as a form, not JSON.",
  },
  {
    id: "daily", name: "Daily", category: "communication", description: "Daily video calls: rooms, tokens and recordings",
    website: "https://www.daily.co", docs: "https://docs.daily.co/reference/rest-api", logo: { favicon: "https://www.daily.co" },
    baseUrl: "https://api.daily.co/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://dashboard.daily.co/developers",
    help: "1) Sign up at dashboard.daily.co (there is a free tier with included minutes). "
      + "2) Open “Developers” → “API keys” and copy the existing key or click “Create API key”. "
      + "3) The key controls your whole Daily domain: rooms, meeting tokens and recordings.",
    test: { path: "/", account: (d) => d.domain_name },
    examples: "Examples: GET / (domain settings), GET /rooms?limit=20, "
      + "POST /rooms {\"name\": \"meeting\", \"privacy\": \"private\", \"properties\": {\"exp\": 1790000000}}, "
      + "POST /meeting-tokens {\"properties\": {\"room_name\": \"meeting\"}}, GET /recordings?limit=20. "
      + "Creating rooms and recording can use minutes from your plan.",
  },
  {
    id: "dailybot", name: "Dailybot", category: "communication", description: "Dailybot check-ins, forms, teams and messages",
    website: "https://www.dailybot.com", docs: "https://www.dailybot.com/developers/api", logo: { favicon: "https://www.dailybot.com" },
    baseUrl: "https://api.dailybot.com/v1",
    auth: { type: "header", name: "X-API-KEY" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://app.dailybot.com/settings/integrations/api-keys",
    help: "1) Go to app.dailybot.com and open “Organization Settings” → “Integrations”. "
      + "2) Click “Generate API Key” and copy it: it is shown only once. "
      + "3) A paid Dailybot plan is required: for an organization on the free plan the API returns 403. "
      + "The key acts with its owner's role.",
    test: { path: "/organization/", account: (d) => d.name || d.organization?.name },
    examples: "Paths end with “/”. Examples: GET /me/, GET /users/, GET /checkins/, GET /forms/, "
      + "POST /send-message/ {\"message\": \"…\", \"target_channels\": [\"C0123456789\"]}. Limit: 60 requests per minute.",
  },
  {
    id: "dialmycalls", name: "DialMyCalls", category: "communication",
    description: "Mass call and SMS alerts: contacts, groups and broadcasts",
    website: "https://www.dialmycalls.com", docs: "https://www.dialmycalls.com/api-documentation", logo: { favicon: "https://www.dialmycalls.com" },
    baseUrl: "https://api.dialmycalls.com/2.0",
    auth: { type: "header", name: "X-Auth-ApiKey" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://www.dialmycalls.com/members/v2/management.php",
    help: "1) Sign in at dialmycalls.com and open your account management page (“My Account”): the “API Info” section "
      + "shows your API key. 2) Copy it. 3) Sending calls and SMS uses credits from your account, "
      + "and the documentation does not state a minimum plan for using the API.",
    test: { path: "/account", message: (d) => {
      const credits = d?.results?.credits_available ?? d?.credits_available;
      return credits != null ? `${credits} credits available` : "API key is valid";
    } },
    examples: "Examples: GET /account, GET /contacts, GET /groups, GET /service/texts, "
      + "POST /service/text {\"keyword_id\": \"…\", \"send_immediately\": true, \"messages\": [\"…\"], "
      + "\"contacts\": [{\"phone\": \"6025551234\"}]}. "
      + "Sending (service/text and service/call) uses credits.",
  },
  {
    id: "dialpad", name: "Dialpad", category: "communication", description: "Cloud telephony: users, calls, SMS and contacts",
    website: "https://www.dialpad.com", docs: "https://developers.dialpad.com/reference", logo: { favicon: "https://www.dialpad.com" },
    baseUrl: "https://dialpad.com/api/v2",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) You must be a company administrator in Dialpad, on a Pro or Enterprise plan. "
      + "2) In the app, open “Admin Settings” → “My Company” → “Authentication” → “API Keys” and click “Add key”: give it a name, "
      + "an expiration and, if needed, additional scopes. "
      + "3) Copy the key: it is not shown again and it can act on all users in the company.",
    test: { path: "/company", account: (d) => d.name },
    examples: "Examples: GET /company, GET /users?cursor=…, GET /call?started_after=… (calls, UTC date in milliseconds), "
      + "POST /sms {\"to_numbers\": [\"+1…\"], \"text\": \"…\", \"user_id\": …}, "
      + "POST /users/{id}/initiate_call {\"phone_number\": \"+1…\"}. Pagination: cursor.",
  },
  {
    id: "echtpost", name: "EchtPost", category: "communication", description: "Physical postcards via API: cards, contacts and motifs",
    website: "https://echtpost.de", docs: "https://api.echtpost.de/v2/docs", logo: { favicon: "https://echtpost.de" },
    baseUrl: "https://api.echtpost.de/v2",
    auth: { type: "header", name: "X-Api-Key" },
    fields: [{ id: "token", label: "API key (ep_live_… or ep_test_…)", secret: true }],
    help: "1) Create an account at echtpost.de: there is no monthly fee or minimum, you pay for each postcard sent. "
      + "2) In the web app, open “Account” → “API keys” and create a key. "
      + "3) The one starting with ep_live_ prints, bills and sends real postcards; the ep_test_ one is for testing (it does not print or charge) "
      + "and only sees test data. Use the test key while you set up your workflows.",
    test: { path: "/me", account: (d) => d.account?.name || d.user?.email },
    examples: "Examples: GET /me, GET /credits (balance and prices), GET /cards?status=scheduled, "
      + "POST /cards/preview_fit (checks whether the text fits, at no cost), "
      + "POST /cards {\"motive_id\": 42, \"content\": \"…\", \"deliver_at\": \"tomorrow\", \"recipients\": [{\"contact_id\": 123}]} "
      + "(sends and charges with an ep_live_ key; cancel it with DELETE /cards/{id} before printing). Limit: 100 requests per minute.",
  },
  {
    id: "gong", name: "Gong", category: "communication", description: "Recorded calls, transcripts, users and statistics",
    website: "https://www.gong.io", docs: "https://help.gong.io/docs/receive-access-to-the-api", logo: { favicon: "https://www.gong.io" },
    baseUrl: "https://{server}/v2",
    auth: { type: "basic", usernameField: "access_key", passwordField: "access_key_secret" },
    fields: [{ id: "access_key", label: "Access Key" },
             { id: "access_key_secret", label: "Access Key Secret", secret: true },
             { id: "server", label: "Your company's API domain", format: "domain", default: "api.gong.io",
               help: "Gong shows it next to the key (e.g. us-12345.api.gong.io). If you see none, leave api.gong.io." },
             { id: "api_base_url_for_customer", label: "Company API URL", format: "url", hidden: true,
               example: "https://api.gong.io" }],
    // One click: OAuth integration that a technical administrator creates in their own company (without publishing it on Gong
    // Collective). The access token lasts one day and is renewed with the refresh token; along with the token, Gong returns the
    // company's own API address (api_base_url_for_customer), which requests must be sent to. The secret goes in the Basic header.
    oauth: { scopes: ["api:calls:read:basic", "api:calls:read:extensive", "api:calls:read:transcript", "api:calls:read:media-url",
                        "api:users:read", "api:workspaces:read", "api:library:read", "api:stats:interaction", "api:stats:user-actions",
                        "api:stats:user-actions:detailed", "api:stats:scorecards", "api:settings:trackers:read",
                        "api:settings:scorecards:read"],
      baseUrl: "{api_base_url_for_customer}/v2",
      provider: { name: "Gong", key: "gong", redirect: "https", clientAuth: "basic", keep: ["api_base_url_for_customer"],
        authorizeUrl: "https://app.gong.io/oauth2/authorize", tokenUrl: "https://app.gong.io/oauth2/generate-customer-token",
        after: async (token, c) => {
          if (!/^https:\/\/([a-z0-9-]+\.)+gong\.io\/?$/i.test(String(c.api_base_url_for_customer || ""))) {
            throw new Error("Gong did not return a valid API address");
          }
          return {};
        },
        help: "1) As a Technical Administrator, open “Admin center” → “Settings” → “Ecosystem” → “API” in Gong, "
          + "go to the “Integrations” tab and click “Create integration”. 2) Choose “Shared access” (it cannot be "
          + "changed later), name it “Conector”, fill in the description and the links Gong asks for (privacy, terms and "
          + "contact) with your company's, select the permissions (scopes) shown below and paste the redirect URI "
          + "shown below into “Redirect URI”. 3) Save and copy the “Client ID”; click “Show secret” and copy the “Client secret”. The "
          + "integration is private to your company: it does not need to be published." },
      help: "Only a Gong technical administrator can authorize. Gong has no per-user OAuth: the connection is global and "
        + "Conector acts with the permissions you selected in the integration." },
    help: "1) As a Technical Administrator, open “Admin center” → “Settings” → “Ecosystem” → “API” in Gong "
      + "(in older versions, “Company settings”). "
      + "2) Click “Get API Key”, give it a name and, optionally, an expiration and a list of allowed IPs. "
      + "3) Copy the Access Key and the Access Key Secret: the secret is not shown again. "
      + "It works on any plan; the key's permissions (scopes) limit what can be read.",
    test: { path: "/users", message: (d) => (d?.records?.totalRecords != null
      ? `${d.records.totalRecords} users visible in Gong` : "Credentials are valid") },
    examples: "Paths are relative to /v2. Examples: GET /users, GET /calls?fromDateTime=2026-10-01T00:00:00Z&toDateTime=2026-10-15T00:00:00Z, "
      + "POST /calls/extensive {\"filter\": {\"fromDateTime\": \"…\", \"toDateTime\": \"…\"}, \"contentSelector\": "
      + "{\"exposedFields\": {\"parties\": true}}}, POST /calls/transcript {\"filter\": {\"callIds\": [\"…\"]}}, GET /workspaces. "
      + "Pagination: cursor from “records”. Limit: 3 requests per second.",
  },
  {
    id: "heartbeat", name: "Heartbeat", category: "communication", description: "Online communities: users, channels, events and messages",
    website: "https://www.heartbeat.chat", docs: "https://heartbeat.readme.io/reference/authorization",
    logo: { favicon: "https://www.heartbeat.chat" },
    baseUrl: "https://api.heartbeat.chat/v0",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) In your Heartbeat community dashboard, open “Settings” → “API Keys”. 2) Click “Create API Key” and copy the key. "
      + "3) The key manages the whole community (users, channels, events and messages), and the documentation does not state a minimum plan.",
    test: { path: "/roles", message: (d) => (Array.isArray(d) ? `${d.length} roles in the community` : "API key is valid") },
    examples: "Examples: GET /roles, GET /users, GET /find/users?email=…, GET /channels, GET /channels/{channelID}/threads. "
      + "There are also /groups, /events, /invitations, /courses and /documents. To create items and send messages, see the reference: "
      + "https://heartbeat.readme.io/reference.",
  },
  {
    id: "labsmobile", name: "LabsMobile", category: "communication", description: "Send SMS and check your credit balance",
    website: "https://www.labsmobile.com", docs: "https://www.labsmobile.com/en/sms-api/api-versions/http-rest-post-json",
    logo: { favicon: "https://www.labsmobile.com" },
    baseUrl: "https://api.labsmobile.com/json",
    auth: { type: "basic", usernameField: "username", passwordField: "token" },
    fields: [{ id: "username", label: "Username (the email you registered with LabsMobile)" },
             { id: "token", label: "API token", secret: true }],
    keyUrl: "https://websms.labsmobile.com/SY0204/api",
    help: "1) Sign in to your LabsMobile account and open the “API Settings” section. "
      + "2) Create an API token and copy it: it is used as the password. "
      + "3) The username is the email you registered with, not the token. Sending SMS uses credits and the documentation "
      + "does not state a minimum plan.",
    test: { path: "/balance", message: (d) => (d?.credits != null ? `${d.credits} SMS credits available` : "Credentials are valid") },
    examples: "Examples: GET /balance (credits), "
      + "POST /prices {\"message\": \"…\", \"recipient\": [{\"msisdn\": \"34600111222\"}]} (calculates the cost), "
      + "POST /send {\"message\": \"…\", \"tpoa\": \"Conector\", \"recipient\": [{\"msisdn\": \"34600111222\"}]} (sends and uses credits; "
      + "msisdn with the country prefix and no +; tpoa is the sender, up to 11 characters).",
  },
  {
    id: "line", name: "LINE", category: "communication", description: "LINE official account: messages, broadcasts and profiles",
    website: "https://line.me", docs: "https://developers.line.biz/en/reference/messaging-api/", logo: { simpleIcons: "line" },
    baseUrl: "https://api.line.me/v2/bot", allowedOrigins: ["https://api-data.line.me"],
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "Channel access token", secret: true }],
    keyUrl: "https://developers.line.biz/console/",
    help: "1) At developers.line.biz/console, create (or choose) a provider and a channel of type “Messaging API”. "
      + "2) On the channel's “Messaging API” tab, scroll down to “Channel access token (long-lived)” and click “Issue”. "
      + "3) Copy the token. Push messages and broadcasts count toward the monthly quota of your official account, "
      + "which is limited on the free plan.",
    test: { path: "/info", account: (d) => d.displayName },
    examples: "Examples: GET /info, GET /message/quota, GET /profile/{userId}, "
      + "POST /message/push {\"to\": \"U…\", \"messages\": [{\"type\": \"text\", \"text\": \"…\"}]}, "
      + "POST /message/reply {\"replyToken\": \"…\", \"messages\": […]}. To download content: "
      + "GET https://api-data.line.me/v2/bot/message/{messageId}/content.",
    tools: [
      { name: "line_send_message", title: "LINE: send a message", annotations: { destructiveHint: true, openWorldHint: true },
        description: "Sends a text (push) message to a user, group or room that follows the official account. Counts toward the monthly quota.",
        schema: { to: z.string().describe("User ID (U…), group ID (C…) or room ID (R…)"), text: z.string().min(1).max(5000) },
        async run({ to, text }, p) {
          const body = { to: to, messages: [{ type: "text", text: text }] };
          const d = ensureOk(await p({ method: "POST", path: "/message/push", body: body }), "LINE");
          return { sent: true, ids: (d?.sentMessages || []).map((m) => m.id) };
        } },
    ],
  },
  {
    id: "linq", name: "Linq", category: "communication", description: "iMessage, RCS and SMS: chats, messages and numbers",
    website: "https://linqapp.com", docs: "https://docs.linqapp.com/", logo: { favicon: "https://linqapp.com" },
    baseUrl: "https://api.linqapp.com/api/partner/v3",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API v3 token", secret: true }],
    keyUrl: "https://dashboard.linqapp.com/api-tooling",
    help: "1) Go to dashboard.linqapp.com/api-tooling and open “API” → “Overview”. 2) Click “Generate new token” and copy the token. "
      + "3) You need a Linq account with assigned numbers; there is a free sandbox for testing, and production access is handled by your "
      + "Linq representative. Renew the token from time to time.",
    test: { path: "/phone_numbers", message: "Token is valid" },
    examples: "Examples: GET /phone_numbers, GET /chats, GET /chats/{chatId}/messages, GET /messages/{messageId}, "
      + "POST /chats (creates the chat and sends the first message; see the API reference at docs.linqapp.com). "
      + "Messages go out via iMessage first, then RCS and finally SMS.",
  },
  {
    id: "loomio", name: "Loomio", category: "communication", description: "Loomio discussions, polls and group decisions",
    website: "https://www.loomio.com", docs: "https://www.loomio.com/docs/en/user_manual/integrations/api/user-api",
    logo: { favicon: "https://www.loomio.com" },
    baseUrl: "https://{server}/api/b2",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "User API key", secret: true },
             { id: "server", label: "Loomio server", format: "domain", default: "www.loomio.com",
               help: "Change it only if you use your own Loomio installation (e.g. loomio.example.com)." }],
    keyUrl: "https://www.loomio.com/profile/api_access",
    help: "1) Sign in to Loomio with the account that will act through the API; it is best to create a dedicated bot account "
      + "so it does not receive invitations. "
      + "2) Open loomio.com/profile/api_access (on your own server, the same path) and copy the API key; "
      + "that page also shows the IDs of your groups. "
      + "3) Every action is performed as that user, with their group permissions, and the documentation does not state a minimum plan.",
    test: { path: "/groups", query: { limit: 1 },
              message: (d) => (d?.meta?.total != null ? `${d.meta.total} group(s) accessible in Loomio` : "API key is valid") },
    examples: "Examples: GET /groups, GET /discussions?group_id=…&status=open&limit=20, GET /search?query=…, "
      + "POST /discussions {\"group_id\": …, \"title\": \"…\", \"description\": \"…\"}, "
      + "POST /comments {\"discussion_id\": …, \"body\": \"…\"}. Pagination: limit and offset (max. 500 for groups).",
  },
  {
    id: "mailersend", name: "MailerSend", category: "marketing",
    description: "Transactional email: sends, domains, activity and templates",
    website: "https://www.mailersend.com", docs: "https://developers.mailersend.com", logo: { favicon: "https://www.mailersend.com" },
    baseUrl: "https://api.mailersend.com/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API token", secret: true }],
    help: "1) In MailerSend, open “Developer Tools” → “API tokens” and click “Create new token” (you can also generate it from "
      + "“Emails” → “Domains” → “Manage” for the domain, with “Generate new token”). "
      + "2) Give it a name, choose the domain and an optional expiration, and select the permissions: “Full access” or “Custom access” "
      + "(read access to domains, activity and analytics if you only need to query). 3) Copy the token: it is shown only once. "
      + "Each token belongs to a sending domain, and the API is also available on the free plan.",
    test: { path: "/api-quota",
              message: (d) => (d?.remaining != null ? `API quota left: ${d.remaining} of ${d.quota} requests` : "API token is valid") },
    examples: "Examples: GET /domains, GET /activity/{domain_id}?date_from=1790000000&date_to=1790600000 (UNIX dates), "
      + "POST /email {\"from\": {\"email\": \"hello@example.com\"}, \"to\": [{\"email\": \"a@x.com\"}], \"subject\": \"…\", \"html\": \"…\"}, "
      + "GET /analytics/date?date_from=…&date_to=…&group_by=days&event[]=sent, GET /api-quota (does not use quota).",
  },
  {
    id: "missive", name: "Missive", category: "communication", description: "Team inbox: conversations, drafts and contacts",
    website: "https://missiveapp.com", docs: "https://missiveapp.com/docs/developers/rest-api", logo: { favicon: "https://missiveapp.com" },
    baseUrl: "https://public.missiveapp.com/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API token (missive_pat-…)", secret: true }],
    help: "1) In Missive, open your preferences → “API” tab and click “Create a new token”. "
      + "2) Copy the token (it starts with missive_pat-): it is personal and sees everything you see, including shared accounts. "
      + "3) The organization must be on the Productive plan or higher; without it, tokens cannot be generated.",
    test: { path: "/users", account: (d) => (d.users || []).find((u) => u.me)?.email || (d.users || [])[0]?.email },
    examples: "Examples: GET /conversations?inbox=true&limit=25 "
      + "(you must specify a mailbox: inbox, all, assigned, closed, shared_label or team_inbox), "
      + "GET /conversations/{id}/messages, GET /contacts?contact_book=…&search=…, GET /users, "
      + "POST /drafts {\"drafts\": {…}} (with send: true it is sent). Pagination: until = last_activity_at of the last conversation.",
  },
  {
    id: "twochat", name: "2Chat", category: "communication", description: "WhatsApp, SMS and calls with the 2Chat API",
    website: "https://2chat.co", docs: "https://developers.2chat.co/docs/intro", logo: { favicon: "https://2chat.co" },
    baseUrl: "https://api.p.2chat.io/open",
    auth: { type: "header", name: "X-User-API-Key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://app.2chat.io/developers?tab=api-access",
    help: "1) Sign up at 2chat.co and go to app.2chat.io/developers, “API access” tab. "
      + "2) Generate a new API key and copy it. 3) To message on WhatsApp, you must first connect a number to 2Chat. "
      + "Trial accounts are limited to 10 requests per minute.",
    test: { path: "/info", message: "API key is valid" },
    examples: "Examples: GET /info, GET /whatsapp/get-numbers?status=connected, GET /whatsapp/channel/{uuid}, "
      + "POST /whatsapp/send-message {\"from_number\": \"+1…\", \"to_number\": \"+1…\", \"text\": \"…\"} (for groups, to_group_uuid), "
      + "GET /whatsapp/check-number/{from_number}/{number} (does it have WhatsApp?). Create the contact before messaging a new number "
      + "to avoid WhatsApp blocks.",
  },
  {
    id: "workiom", name: "Workiom", category: "automation", description: "Workiom apps, lists and records",
    website: "https://workiom.com", docs: "https://help.workiom.com/article/workiom-api-guide", logo: { favicon: "https://workiom.com" },
    baseUrl: "https://api.workiom.com/api/services/app",
    auth: { type: "header", name: "X-Api-Key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) Sign in to Workiom and open “Account Settings”. 2) Find the “API key” section and copy the key. "
      + "3) The key gives access to your account data, so treat it like a password. The documentation does not state a minimum plan.",
    test: { path: "/Apps/GetAll", message: "API key is valid" },
    examples: "Paths are relative to /api/services/app and responses come inside “result”. "
      + "Examples: GET /Apps/GetAll, GET /Lists/GetAll?appId=…, GET /Lists/Get?id=…&expand=Fields, "
      + "POST /Data/All {\"listId\": \"…\", \"maxResultCount\": 50, \"skipCount\": 0}, "
      + "POST /Data/Create?listId=… {\"<fieldId>\": value}. To edit: PUT /Data/UpdatePartial?listId=…&id=…. "
      + "Swagger spec: https://api.workiom.com/swagger/.",
  },
  {
    id: "wufoo", name: "Wufoo", category: "productivity", description: "Wufoo forms, entries and reports",
    website: "https://www.wufoo.com", docs: "https://wufoo.github.io/docs/", logo: { favicon: "https://www.wufoo.com" },
    baseUrl: "https://{subdomain}.wufoo.com/api/v3",
    auth: { type: "basic", usernameField: "token", fixedPassword: "footastic" },
    fields: [{ id: "subdomain", label: "Your account subdomain (the part before .wufoo.com)", format: "subdomain" },
             { id: "token", label: "Wufoo API key", secret: true }],
    help: "1) Sign in to your Wufoo account and open the “Form Manager”. "
      + "2) On any form, expand “More” → “API Information” and copy the 16-character code shown as “API Key”. "
      + "3) It is one key per account, not per form. The subdomain is the part that appears in your URL, e.g. company in company.wufoo.com. "
      + "The documentation does not state a minimum plan.",
    test: { path: "/users.json", account: (d) => d.Users?.[0]?.Email || d.Users?.[0]?.User },
    examples: "All paths end in .json. Examples: GET /forms.json, GET /forms/{hash}/fields.json, "
      + "GET /forms/{hash}/entries.json?pageSize=20&sort=EntryId&sortDirection=DESC, "
      + "POST /forms/{hash}/entries.json with a form {Field1: \"…\", Field2: \"…\"}, GET /reports.json. "
      + "POST and PUT are sent as a form.",
  },
];
