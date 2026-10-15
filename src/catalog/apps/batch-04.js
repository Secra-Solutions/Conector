// Batch 04 of the catalog: SMS, voice, messaging and push notifications.
import { z } from "zod";
import { ensureOk } from "../define.js";

const dropEmpty = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== ""));

// MSG91 answers with status 200 even when the authkey is wrong: the error arrives as { type: "error", code, message }.
function msg91(d) {
  if (d?.type === "error" && ["201", "401", "418"].includes(String(d.code))) {
    throw new Error(`MSG91: ${d.message || "invalid authkey"}`);
  }
}

// Seven also answers 200 on failure: the body is just a numeric code (900 = invalid key).
const SEVEN_ERRORS = {
  500: "insufficient balance",
  900: "the API key is not valid",
  902: "the API key does not have permission for this resource",
  903: "the IP the call comes from is not in the key's allowlist",
};
function seven(d) {
  const code = typeof d === "string" || typeof d === "number" ? String(d).trim() : "";
  if (/^\d{3}$/.test(code)) throw new Error(`Seven: ${SEVEN_ERRORS[code] || `error code ${code}`}`);
}

export default [
  {
    id: "mocean", name: "Mocean", category: "communication", description: "SMS, voice and SMS verification with the Mocean API",
    website: "https://moceanapi.com", docs: "https://moceanapi.com/docs/", logo: { favicon: "https://moceanapi.com" },
    // Mocean answers in XML unless JSON is requested: on GET the URL parameter is enough, but on POST it only reads it from the body.
    baseUrl: "https://rest.moceanapi.com/rest/2", query: { "mocean-resp-format": "json" },
    auth: [{ type: "bearer" }, { type: "signature", sign: ({ body: requestBody }) => {
      if (requestBody instanceof URLSearchParams && !requestBody.has("mocean-resp-format")) requestBody.set("mocean-resp-format", "json");
    } }],
    fields: [{ id: "token", label: "Mocean API token", secret: true }],
    help: "1) Log in at dashboard.moceanapi.com (create an account if you do not have one). 2) Go to “API Account” → “Generate Token”. "
      + "3) Copy the token right away: it is shown only once. Mocean works with a prepaid balance and sending SMS uses it.",
    test: { path: "/account/balance", message: (d) => (d?.value != null ? `Available balance: ${d.value}` : "Credentials are valid") },
    examples: "Examples: GET /account/balance, GET /account/pricing, "
      + "POST /sms with form data {\"mocean-from\": \"MyBrand\", \"mocean-to\": \"34600111222\", \"mocean-text\": \"…\"} (uses balance), "
      + "GET /report/message?mocean-msgid=… (status of an SMS), "
      + "POST /verify/req/sms with form data {\"mocean-to\": \"…\", \"mocean-brand\": \"MyBrand\"}.",
  },
  {
    id: "msg91", name: "MSG91", category: "communication", description: "SMS, OTP, WhatsApp, email and voice with MSG91",
    website: "https://msg91.com", docs: "https://docs.msg91.com", logo: { favicon: "https://msg91.com" },
    baseUrl: "https://control.msg91.com/api/v5",
    auth: { type: "header", name: "authkey" },
    fields: [{ id: "token", label: "MSG91 authkey", secret: true }],
    help: "1) At control.msg91.com open your user menu (top right) → “Authkey” and copy the key (or create a new one). "
      + "2) New authkeys have “IP Security” enabled: add the public IP of this server on that same page or disable it, "
      + "or MSG91 will reject the requests. 3) Sending uses balance; in India, the sender and the templates must also be "
      + "approved (DLT).",
    // Verifying a made-up OTP sends and changes nothing: it only checks that MSG91 accepts the authkey.
    test: { path: "/otp/verify", query: { mobile: "910000000000", otp: "000000" }, validate: msg91, message: () => "Authkey is valid" },
    examples: "Examples: POST /flow {\"template_id\": \"…\", \"recipients\": [{\"mobiles\": \"34600111222\", \"VAR1\": \"…\"}]} "
      + "(template SMS; uses balance), POST /otp?template_id=…&mobile=34600111222 (sends an OTP), GET /otp/verify?mobile=…&otp=…, "
      + "POST /email/send, GET /email/templates. Some routes respond 200 with {\"type\": \"error\"} when they fail.",
  },
  {
    id: "plivo", name: "Plivo", category: "communication", description: "SMS, calls, phone numbers and verification with Plivo",
    website: "https://www.plivo.com", docs: "https://www.plivo.com/docs/", logo: { favicon: "https://www.plivo.com" },
    baseUrl: "https://api.plivo.com/v1/Account/{auth_id}",
    auth: { type: "basic", usernameField: "auth_id", passwordField: "auth_token" },
    fields: [{ id: "auth_id", label: "Auth ID (MA… or SA…)" },
             { id: "auth_token", label: "Auth Token", secret: true }],
    keyUrl: "https://console.plivo.com/dashboard/",
    help: "1) At console.plivo.com, on the “Overview” page, copy the “Auth ID” and the “Auth Token” (click the eye icon to reveal it). "
      + "2) With a trial account you can only send to verified numbers; real use requires a paid balance. "
      + "Sub-accounts have their own Auth ID and token.",
    test: { path: "/", account: (d) => [d.name || d.auth_id, d.cash_credits != null && `balance ${Number(d.cash_credits).toFixed(2)} USD`]
      .filter(Boolean).join(" · ") },
    examples: "The base already includes the account and paths always end in “/”. Examples: GET /Message/?limit=20, "
      + "POST /Message/ {\"src\": \"+1…\", \"dst\": \"+1…\", \"text\": \"…\"} (uses balance), GET /Number/ (your numbers), "
      + "POST /Call/ {\"from\": \"…\", \"to\": \"…\", \"answer_url\": \"https://…\", \"answer_method\": \"GET\"}, "
      + "GET /Pricing/?country_iso=ES.",
  },
  {
    id: "pumble", name: "Pumble", category: "communication", description: "Channels, messages and users of your Pumble workspace",
    website: "https://pumble.com", docs: "https://pumble-api-keys.addons.marketplace.cake.com/api-docs/",
    logo: { favicon: "https://pumble.com" },
    baseUrl: "https://pumble-api-keys.addons.marketplace.cake.com",
    // The OpenAPI reference calls the header “ApiKey” and the product help calls it “Api-Key”: both are sent.
    auth: [{ type: "header", name: "ApiKey" }, { type: "header", name: "Api-Key" }],
    fields: [{ id: "token", label: "Pumble API key", secret: true }],
    help: "1) In Pumble click “+ Add apps” (sidebar) and, under “API”, “Install”; accept the permissions. 2) Open “API” in the "
      + "sidebar → “Add API key”, name it and click “Generate”. 3) Copy the key from the message that appears (only you can see it and it is not "
      + "shown again). Available on all plans; the key acts as your user.",
    test: { path: "/myInfo", account: (d) => [d.name, d.email].filter(Boolean).join(" · ") },
    examples: "Examples: GET /listChannels, GET /listUsers, GET /listMessages?channel=general&limit=50, "
      + "POST /sendMessage {\"channel\": \"general\", \"text\": \"…\", \"asBot\": true} (with \"asBot\": false it writes as you), "
      + "POST /dmUser {\"email\": \"…\", \"text\": \"…\"}. Limit: 1,000 requests per minute.",
  },
  {
    id: "pushbullet", name: "Pushbullet", category: "communication", description: "Notifications and links between your devices",
    website: "https://www.pushbullet.com", docs: "https://docs.pushbullet.com", logo: { simpleIcons: "pushbullet" },
    baseUrl: "https://api.pushbullet.com/v2",
    auth: { type: "header", name: "Access-Token" },
    fields: [{ id: "token", label: "Access Token", secret: true }],
    // One-click connect: Pushbullet OAuth client. There are no scopes, tokens have no fixed expiration or refresh token, the token
    // endpoint only accepts JSON bodies and the OAuth token is sent in the same Access-Token header as the personal one.
    oauth: { scopes: [], apply: (headers, token) => { headers["Access-Token"] = token; },
      provider: { name: "Pushbullet", key: "pushbullet", redirect: "localhost", json: true,
        authorizeUrl: "https://www.pushbullet.com/authorize", tokenUrl: "https://api.pushbullet.com/oauth2/token",
        help: "1) Log in with your Pushbullet account at pushbullet.com/create-client. 2) Name it “Conector” and, in "
          + "the Redirect URI field, paste the redirect URI shown below. 3) Create the client and copy the “Client ID” and the "
          + "“Client Secret”." },
      help: "Pushbullet does not split permissions into scopes: Conector acts with your whole account. If you delete the OAuth client, "
        + "all its tokens stop working." },
    keyUrl: "https://www.pushbullet.com/#settings/account",
    help: "1) Log in at pushbullet.com and open “Settings” → “Account” (pushbullet.com/#settings/account). "
      + "2) Click “Create Access Token” and copy the token. The free plan is enough; Pro has higher monthly sending limits.",
    test: { path: "/users/me", account: (d) => d.email || d.name },
    examples: "Examples: GET /devices, GET /pushes?active=true&limit=20, "
      + "POST /pushes {\"type\": \"note\", \"title\": \"…\", \"body\": \"…\"} (to all your devices; with device_iden, to just one), "
      + "POST /pushes {\"type\": \"link\", \"title\": \"…\", \"url\": \"https://…\"}, DELETE /pushes/{iden}.",
    tools: [
      { name: "pushbullet_send", title: "Pushbullet: send a notification",
        annotations: { destructiveHint: true, openWorldHint: true },
        description: "Send a note (or a link) to all your Pushbullet devices, or to just one.",
        schema: { title: z.string().max(200), text: z.string().max(4000).optional(),
                   link: z.string().url().optional().describe("If provided, it is sent as a link"),
                   device: z.string().optional().describe("Device iden (list them with GET /devices); empty: all") },
        async run({ title, text, link, device }, p) {
          const d = ensureOk(await p({ method: "POST", path: "/pushes", body: dropEmpty({ type: link ? "link" : "note",
            title: title, body: text, url: link, device_iden: device }) }), "Pushbullet");
          return { sent: true, id: d.iden };
        } },
    ],
  },
  {
    id: "pushinator", name: "Pushinator", category: "communication",
    description: "Push notifications to the subscribers of your channels",
    website: "https://pushinator.com", docs: "https://pushinator.com/api", logo: { favicon: "https://pushinator.com" },
    baseUrl: "https://api.pushinator.com/api/v2",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "Pushinator API token", secret: true }],
    keyUrl: "https://console.pushinator.com/tokens",
    help: "1) Log in at console.pushinator.com and create a channel: its “Channel ID” (a UUID) is the destination of the notifications. "
      + "2) At console.pushinator.com/tokens create an API token and copy it. 3) The free plan limits devices and notifications per "
      + "month. The API has no read endpoints: the test sends a notification to a nonexistent channel (it reaches nobody).",
    // No read endpoints: with a channel that does not exist, a valid token gets a channel error and an invalid one gets a 401.
    test: { method: "POST", path: "/notifications/send", acceptStatus: [400, 403, 404, 422], message: "API token is valid",
              body: { channel_id: "00000000-0000-0000-0000-000000000000", content: "Test" } },
    examples: "There are only two endpoints, both POST: POST /notifications/send {\"channel_id\": \"<channel UUID>\", \"content\": \"…\"} "
      + "(reaches all subscribers; \"acknowledgment_required\": true asks for confirmation, only on paid plans) and "
      + "POST /channels {\"name\": \"…\", \"description\": \"…\"} (creates a channel and returns its id).",
  },
  {
    id: "pushover", name: "Pushover", category: "communication", description: "Real-time push notifications to your devices",
    website: "https://pushover.net", docs: "https://pushover.net/api", logo: { favicon: "https://pushover.net" },
    baseUrl: "https://api.pushover.net/1",
    // Pushover does not use authentication headers: the application token and the recipient key travel as parameters.
    auth: [{ type: "query", name: "token" }, { type: "query", name: "user", field: "user" }],
    fields: [{ id: "token", label: "Application API token", secret: true },
             { id: "user", label: "User key or group key (recipient)", secret: true,
               help: "To notify several people, create a delivery group in Pushover and use its key." }],
    keyUrl: "https://pushover.net/apps/build",
    help: "1) At pushover.net/apps/build register an application (free) and copy its “API Token/Key”. 2) Your “User Key” appears on the "
      + "main page of pushover.net when you log in (the key of a delivery group also works). 3) You need the Pushover app on "
      + "your devices (free trial, then a one-time payment per platform); each account gets 10,000 messages per month.",
    // Checks the application token and the user key at once, without sending anything.
    test: { method: "POST", path: "/users/validate.json",
              message: (d) => (d?.devices?.length ? `Credentials are valid (devices: ${d.devices.join(", ")})`
                : "Credentials are valid") },
    examples: "Conector adds the token and the user key. Examples: POST /messages.json with form data {\"message\": \"…\", "
      + "\"title\": \"…\", \"priority\": 0, \"url\": \"https://…\"} (priority from -2 to 1; 2 requires retry and expire), GET /sounds.json, "
      + "GET /apps/limits.json (messages left this month), POST /users/validate.json.",
    tools: [
      { name: "pushover_send", title: "Pushover: send a notification",
        annotations: { destructiveHint: true, openWorldHint: true },
        description: "Send a notification to the configured user or group (its key is already stored in Conector).",
        schema: { message: z.string().max(1024), title: z.string().max(250).optional(),
                   priority: z.number().int().min(-2).max(1).default(0)
                     .describe("-2 no alert, -1 quiet, 0 normal, 1 high (bypasses quiet hours)"),
                   link: z.string().url().max(512).optional(), link_title: z.string().max(100).optional(),
                   sound: z.string().optional().describe("Sound name (GET /sounds.json)"),
                   device: z.string().optional().describe("Device name; empty: all") },
        async run({ message, title, priority, link, link_title, sound, device }, p) {
          const formData = dropEmpty({ message: message, title: title, priority: priority, url: link, url_title: link_title,
            sound: sound, device: device });
          const d = ensureOk(await p({ method: "POST", path: "/messages.json", form: formData }), "Pushover");
          return { sent: true, id: d.request };
        } },
    ],
  },
  {
    id: "recallai", name: "Recall.ai", category: "communication",
    description: "Bots that record and transcribe Zoom, Meet and Teams meetings",
    website: "https://www.recall.ai", docs: "https://docs.recall.ai/reference", logo: { favicon: "https://www.recall.ai" },
    baseUrl: "https://{region}.recall.ai/api/v1",
    // The “Token” prefix is optional in Recall.ai, but it is the one its documentation uses.
    auth: { type: "header", name: "Authorization", prefix: "Token " },
    fields: [{ id: "token", label: "Recall.ai API key", secret: true },
             { id: "region", label: "Account region", default: "us-east-1",
               options: [["us-east-1", "US (us-east-1)"], ["us-west-2", "US (us-west-2)"],
                          ["eu-central-1", "European Union (eu-central-1)"], ["ap-northeast-1", "Japan (ap-northeast-1)"]],
               help: "The one in the address of your dashboard (<region>.recall.ai). Regions are independent: a key only works in its own." }],
    help: "1) Open the Recall.ai dashboard of your region (https://<region>.recall.ai/dashboard) and go to “Developers” → “API Keys” → "
      + "“Generate API key”. 2) Copy the key and choose the same region below. 3) It is paid by usage (per hour of bot recording), "
      + "so creating a bot that joins a meeting has a cost.",
    test: { path: "/bot/", message: "API key is valid" },
    examples: "Paths end in “/”. Examples: GET /bot/ (created bots), GET /bot/{id}/ (status; the links to the recording and the "
      + "transcript arrive in recordings[].media_shortcuts), POST /bot/ {\"meeting_url\": \"https://meet.google.com/…\", "
      + "\"bot_name\": \"Meeting notes\", \"recording_config\": {…}} (the bot joins the meeting and is billed), "
      + "POST /bot/{id}/leave_call/.",
  },
  {
    id: "retellai", name: "Retell AI", category: "communication",
    description: "AI voice agents: calls, transcripts and numbers",
    website: "https://www.retellai.com", docs: "https://docs.retellai.com", logo: { favicon: "https://www.retellai.com" },
    baseUrl: "https://api.retellai.com",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "Retell API key", secret: true }],
    help: "1) Log in at dashboard.retellai.com and open the “API Keys” tab. 2) Click to create a new key, name it and "
      + "copy it. 3) Retell charges per call minute: creating phone or test calls uses the account balance.",
    test: { path: "/list-phone-numbers",
              message: (d) => (Array.isArray(d) ? `${d.length} phone number(s) in Retell` : "Credentials are valid") },
    examples: "Examples: GET /list-agents, GET /list-phone-numbers, POST /v2/list-calls {\"limit\": 20, \"sort_order\": \"descending\"}, "
      + "GET /v2/get-call/{call_id} (transcript and analysis), POST /v2/create-phone-call {\"from_number\": \"+1…\", "
      + "\"to_number\": \"+1…\", \"override_agent_id\": \"agent_…\"} (places a real call and uses balance).",
  },
  {
    id: "revolt", name: "Revolt (Stoat)", category: "communication",
    description: "Servers, channels and messages through a Revolt (Stoat) bot",
    website: "https://stoat.chat", docs: "https://developers.stoat.chat/api-reference/", logo: { simpleIcons: "revoltdotchat" },
    baseUrl: "{url}",
    // Bots authenticate with x-bot-token (user sessions use x-session-token).
    auth: { type: "header", name: "x-bot-token" },
    fields: [{ id: "token", label: "Bot token", secret: true },
             { id: "url", label: "API URL", format: "url", default: "https://api.stoat.chat", optional: true,
               help: "Revolt is now called Stoat. Leave it as is unless you use your own server (e.g. https://chat.example.com/api)." }],
    help: "1) In the Stoat app (formerly Revolt) open “Settings” → “My Bots” → “Create a Bot” and name it. 2) Open the bot and click "
      + "“Copy Token” (it can be regenerated). 3) Invite the bot to your server with its invite link and give it permissions in the channels "
      + "it must read or write. It is free.",
    test: { path: "/users/@me", account: (d) => d.display_name || d.username },
    examples: "IDs are ULIDs. Examples: GET /users/@me, GET /servers/{id}/members, GET /channels/{id}/messages?limit=50, "
      + "POST /channels/{id}/messages {\"content\": \"…\"}, GET /users/dms (direct messages).",
  },
  {
    id: "roam", name: "Roam", category: "communication", description: "Roam chats, groups, users, meetings and transcripts",
    website: "https://ro.am", docs: "https://developer.ro.am/docs/api/api", logo: { favicon: "https://ro.am" },
    baseUrl: "https://api.ro.am/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key (rmk-…)", secret: true }],
    // One-click connect: Roam OAuth client (created by an administrator, in the same place as the API keys). Access lasts 7 days and
    // is renewed with the refresh token (365 days). Permissions are requested on connect and must also be checked in the client.
    oauth: { scopes: ["group:read", "chat:read", "chat:history", "chat:send_message", "user:read", "user:read.email",
                        "meetings:read", "transcript:read"],
      provider: { name: "Roam", key: "roam", redirect: "localhost",
        authorizeUrl: "https://ro.am/oauth/authorize", tokenUrl: "https://ro.am/oauth/token",
        help: "1) An administrator opens “Roam Administration” → “Developer” (“Settings” gear, bottom right) and clicks "
          + "“Add ApiClient”. 2) Choose the authorization type “OAuth”, name it “Conector”, paste the redirect URI shown below into "
          + "“Redirect URIs” and check the permissions (scopes) listed below. 3) Save and copy the “Client ID” and the "
          + "“Client Secret”." },
      help: "The type of access depends on who authorizes: an administrator grants access to the whole organization (Conector acts as "
        + "an app with its own bot) and any other user, only to their own data. Always within the permissions checked in the client." },
    help: "1) An administrator opens “Roam Administration” → “Developer” (“Settings” gear, bottom right) and clicks "
      + "“Add ApiClient”. 2) Choose the type “API key”, name it and, under “Access Scopes”, check the permissions you need (e.g. "
      + "group:read, chat:send_message, chat:read, user:read). 3) Save and copy the rmk-… key that appears.",
    test: { path: "/token.info", account: (d) => d.roam?.name },
    examples: "Examples: GET /token.info (permissions of the key), GET /group.list (group ids), "
      + "POST /chat.post {\"groupId\": \"<group UUID>\", \"text\": \"…\"}, GET /user.list, GET /meeting.list. "
      + "Limit: bursts of 10 requests and 1 per second.",
  },
  {
    id: "saperly", name: "Saperly", category: "communication", description: "Phone numbers, SMS and calls for AI agents",
    website: "https://saperly.com", docs: "https://saperly.com/docs/", logo: { favicon: "https://saperly.com" },
    baseUrl: "https://api.saperly.com",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key (sap_sk_live_…)", secret: true }],
    help: "1) Create an account at saperly.com/sign-in and a workspace (there is a small welcome credit). 2) In the dashboard, "
      + "open “Keys” and create an API key (sap_sk_live_…): it is shown only once. You can limit its permissions and spending cap. "
      + "3) The balance is prepaid: buying numbers, sending SMS and making calls uses it.",
    test: { path: "/usage",
              message: (d) => (typeof d?.balanceCents === "number" ? `Balance: ${(d.balanceCents / 100).toFixed(2)} USD`
                : "Credentials are valid") },
    examples: "Amounts are in cents. Examples: GET /usage (balance and usage), GET /numbers, "
      + "POST /messages {\"fromNumberId\": \"num_…\", \"to\": \"+1…\", \"body\": \"…\"} (sends an SMS and uses balance), "
      + "POST /calls {\"fromNumberId\": \"num_…\", \"to\": \"+1…\"} (places a real call), GET /pricing/quote?country=US&numberType=local.",
  },
  {
    id: "sendbird", name: "Sendbird", category: "communication", description: "In-app chat: users, channels and messages",
    website: "https://sendbird.com", docs: "https://sendbird.com/docs/chat/platform-api/v3/prepare-to-use-api",
    logo: { favicon: "https://sendbird.com" },
    baseUrl: "{url}/v3",
    auth: { type: "header", name: "Api-Token" },
    fields: [{ id: "url", label: "API request URL of your application", format: "url",
               help: "It has the form https://api-<Application ID>.sendbird.com." },
             { id: "token", label: "API token (master or secondary)", secret: true }],
    help: "1) At dashboard.sendbird.com choose your application and open “Settings” → “Application” → “General”. 2) Copy the “API request "
      + "URL” (https://api-<Application ID>.sendbird.com) and an “API token”: the master one, or a secondary one that you can create and revoke with "
      + "it. 3) Each application has its own URL and its own tokens.",
    test: { path: "/users", query: { limit: 1 }, message: "API token is valid" },
    examples: "The base already includes /v3. Examples: GET /users?limit=20, POST /users {\"user_id\": \"…\", \"nickname\": \"…\", "
      + "\"profile_url\": \"\"}, POST /group_channels {\"user_ids\": [\"a\", \"b\"]}, "
      + "POST /group_channels/{channel_url}/messages {\"message_type\": \"MESG\", \"user_id\": \"…\", \"message\": \"…\"}, "
      + "GET /group_channels/{channel_url}/messages?message_ts=1760000000000&prev_limit=20.",
  },
  {
    id: "sevenio", name: "Seven.io", category: "communication", description: "SMS, voice, contacts and sending statistics with Seven",
    website: "https://www.seven.io", docs: "https://docs.seven.io/en/rest-api/authentication", logo: { favicon: "https://www.seven.io" },
    baseUrl: "https://gateway.seven.io/api",
    auth: { type: "header", name: "X-Api-Key" },
    fields: [{ id: "token", label: "Seven API key", secret: true }],
    // One-click connect: OAuth app created in the Seven dashboard itself (“Developer” → “OAuth apps”). The secret goes in the Basic
    // header; access lasts 1 hour and is renewed with the refresh token. An unreviewed app works instantly with the owner account
    // and its sub-accounts; other accounts see a warning and there can be only 25 of them.
    oauth: { scopes: ["sms", "voice", "balance", "pricing", "analytics", "status", "journal", "lookup", "contacts", "groups"],
      provider: { name: "Seven.io", key: "sevenio", redirect: "localhost", clientAuth: "basic",
        authorizeUrl: "https://oauth.seven.io/authorize", tokenUrl: "https://oauth.seven.io/token",
        help: "1) At dashboard.seven.io open “Developer” → “OAuth apps” and create an application. 2) Name it “Conector”, "
          + "paste the redirect URI shown below as the redirect URL and check the permissions (scopes) listed below. "
          + "3) Copy the “client_id” and the “client_secret”: the secret is shown only once (if you lose it, a new one is generated and the "
          + "previous one stops working). There is no need to request a Seven review while you use your own account and its sub-accounts." },
      help: "Conector can only use the permissions checked in the application. If you add any later, you must "
        + "connect again to authorize them." },
    keyUrl: "https://dashboard.seven.io/developer/api",
    help: "1) Log in at dashboard.seven.io and open “Developer” → “API” (dashboard.seven.io/developer/api). 2) Add an API key, "
      + "choose its permissions (and, optionally, the allowed IPs) and copy it. 3) Seven works with a prepaid balance: sending SMS or making "
      + "calls uses it; checking the balance does not.",
    test: { path: "/balance", validate: seven,
              message: (d) => (d?.amount != null ? `Balance: ${d.amount} ${d.currency || "EUR"}` : "Credentials are valid") },
    examples: "Examples: GET /balance, POST /sms {\"to\": \"+12025550123\", \"text\": \"…\", \"from\": \"MyBrand\", \"json\": 1} "
      + "(uses balance), GET /pricing?country=ES, GET /analytics?start=2026-10-01&end=2026-10-15&group_by=day, GET /contacts. "
      + "When something fails, many routes respond 200 with a bare numeric code (900 = invalid key, 500 = no balance).",
  },
  {
    id: "sideshow", name: "Sideshow", category: "communication", description: "Publish and comment on visual agent posts in Sideshow",
    website: "https://sideshow.sh", docs: "https://github.com/modem-dev/sideshow", logo: { favicon: "https://sideshow.sh" },
    baseUrl: "{url}",
    auth: { type: "bearer" },
    fields: [{ id: "url", label: "URL of your Sideshow", format: "url",
               help: "e.g. http://localhost:8228 (on this same server) or https://sideshow.<account>.workers.dev." },
             { id: "token", label: "Access token (SIDESHOW_TOKEN)", secret: true, optional: true,
               help: "Leave it empty if your instance does not require it (e.g. one running on this same server)." }],
    help: "1) Sideshow is open source and self-hosted: run npx sideshow serve (it listens on http://localhost:8228) or deploy it "
      + "on Cloudflare Workers following docs/deploying.md in the repository. 2) If you deploy it, set the SIDESHOW_TOKEN secret (any "
      + "long string): that is the token. 3) Enter here the URL of your instance (without a trailing slash) and the token if it has one.",
    test: { path: "/api/sessions", message: (d) => (Array.isArray(d) ? `Connected (${d.length} session(s))` : "Instance is reachable") },
    examples: "Examples: GET /api/sessions, GET /api/posts/recent, POST /api/posts (publish), PUT /api/posts/{id} (revise), "
      + "GET /api/comments?wait=0 (user comments; wait=60 waits up to 60 s for one to arrive). "
      + "The publishing format is described at GET /guide and GET /agent-howto (they do not require a token).",
  },
  {
    id: "smsalert", name: "SMS Alert", category: "communication", description: "SMS, OTP, templates and contacts with SMS Alert",
    website: "https://www.smsalert.co.in", docs: "https://kb.smsalert.co.in/developers-api/", logo: { favicon: "https://www.smsalert.co.in" },
    baseUrl: "https://www.smsalert.co.in/api",
    auth: { type: "query", name: "apikey" },
    fields: [{ id: "token", label: "SMS Alert API key", secret: true }],
    help: "1) Log in to your SMS Alert dashboard (www.smsalert.co.in), click the menu icon → “Developers” → “API keys”. 2) Copy an "
      + "existing key or create a new one with the button on the right. 3) It is an Indian provider: sends use the credits in the dashboard "
      + "and, in India, require an approved sender (Sender ID) and templates (DLT).",
    test: { path: "/creditstatus.json", message: "API key is valid" },
    examples: "All paths end in .json. Examples: GET /creditstatus.json (credits), "
      + "GET /push.json?sender=SENDER&mobileno=34600111222&text=… (sends an SMS and uses credits), GET /senderlist.json, "
      + "GET /templatelist.json, GET /pull.json?batchid=… (delivery report).",
  },
  {
    id: "superchat", name: "Superchat", category: "communication",
    description: "Customer messaging: WhatsApp, Instagram, email and more",
    website: "https://superchat.com", docs: "https://developers.superchat.com", logo: { favicon: "https://superchat.com" },
    baseUrl: "https://api.superchat.com/v1.0",
    auth: { type: "header", name: "X-API-KEY" },
    fields: [{ id: "token", label: "Superchat API key", secret: true }],
    keyUrl: "https://app.superchat.de/settings/integrations",
    help: "1) An administrator logs in to Superchat and opens “Settings” → “API” (app.superchat.de/settings/integrations). 2) Copy the API token "
      + "shown there. 3) Messages go out through your channels (WhatsApp, Instagram, email…) and follow their rules, such as "
      + "templates outside the 24-hour window.",
    test: { path: "/me", account: (d) => [d.user?.email, d.workspace?.name].filter(Boolean).join(" · ") },
    examples: "Examples: GET /me, GET /channels, GET /contacts, GET /conversations/{id}/messages, "
      + "POST /messages (send a message; the body is described in the API reference).",
  },
  {
    id: "telnyx", name: "Telnyx", category: "communication", description: "SMS, calls, numbers and verification with Telnyx",
    website: "https://telnyx.com", docs: "https://developers.telnyx.com", logo: { favicon: "https://telnyx.com" },
    baseUrl: "https://api.telnyx.com/v2",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API v2 key (KEY…)", secret: true }],
    keyUrl: "https://portal.telnyx.com/#/app/api-keys",
    help: "1) At portal.telnyx.com (Mission Control) open “API Keys” (portal.telnyx.com/#/app/api-keys) → “Create API Key”. "
      + "2) Copy the key right away: it is not shown again. 3) Telnyx charges by usage: sending SMS, making calls or buying numbers uses "
      + "balance, and to send messages you need a configured number and messaging profile.",
    test: { path: "/balance",
              message: (d) => (d?.data?.balance != null ? `Balance: ${d.data.balance} ${d.data.currency || "USD"}`
                : "Credentials are valid") },
    examples: "Examples: GET /balance, GET /phone_numbers?page[size]=20, POST /messages {\"from\": \"+1…\", \"to\": \"+1…\", "
      + "\"text\": \"…\"} (uses balance), GET /messages/{id}, GET /available_phone_numbers?filter[country_code]=ES&filter[limit]=5.",
  },
  {
    id: "textit", name: "TextIt", category: "communication",
    description: "Contacts, messages, broadcasts and chatbot flows in TextIt",
    website: "https://textit.com", docs: "https://textit.com/api/v2/", logo: { favicon: "https://textit.com" },
    baseUrl: "https://textit.com/api/v2",
    auth: { type: "header", name: "Authorization", prefix: "Token " },
    fields: [{ id: "token", label: "TextIt API token", secret: true }],
    keyUrl: "https://textit.com/api/v2/explorer/",
    help: "1) Log in at textit.com and open the API explorer (textit.com/api/v2/explorer/) from the menu of your "
      + "workspace. 2) Copy the “API token” shown at the top (you can regenerate it). 3) The messages you send use credits from the "
      + "workspace.",
    test: { path: "/workspace.json", account: (d) => d.name },
    examples: "All paths end in .json. Examples: GET /workspace.json, GET /contacts.json?group=…, "
      + "POST /broadcasts.json {\"urns\": [\"tel:+12025550123\"], \"text\": \"…\"} (uses credits), GET /flows.json, "
      + "POST /flow_starts.json {\"flow\": \"<uuid>\", \"contacts\": [\"<uuid>\"]}.",
  },
  {
    id: "timelinesai", name: "TimelinesAI", category: "communication",
    description: "Team WhatsApp chats and messages with TimelinesAI",
    website: "https://timelines.ai", docs: "https://timelines.ai/docs", logo: { favicon: "https://timelines.ai" },
    baseUrl: "https://app.timelines.ai/integrations/api",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "Public API token", secret: true }],
    keyUrl: "https://app.timelines.ai/integrations/api/",
    help: "1) Log in at app.timelines.ai and open “Integrations” → “Public API” (sidebar). 2) Click “Copy” to copy the token "
      + "(if you regenerate it, the previous one stops working). 3) You need at least one WhatsApp number connected in your "
      + "workspace; the limit is about 50 requests per minute.",
    test: { path: "/whatsapp_accounts",
              message: (d) => (Array.isArray(d?.data) ? `${d.data.length} WhatsApp number(s) in TimelinesAI` : "Credentials are valid") },
    examples: "Examples: GET /whatsapp_accounts, GET /chats, GET /chats/{id}/messages, POST /messages {\"phone\": \"+12025550123\", "
      + "\"text\": \"…\"} (sends a WhatsApp message; it is asynchronous: returns message_uid), POST /chats/{id}/messages {\"text\": \"…\"}.",
  },
  {
    id: "tldv", name: "tl;dv", category: "communication", description: "Meeting recordings: tl;dv transcripts and notes",
    website: "https://tldv.io", docs: "https://doc.tldv.io", logo: { favicon: "https://tldv.io" },
    baseUrl: "https://pasta.tldv.io/v1alpha1",
    auth: { type: "header", name: "x-api-key" },
    fields: [{ id: "token", label: "tl;dv API key", secret: true }],
    keyUrl: "https://tldv.io/app/settings/personal-settings/api-keys",
    help: "1) At tldv.io open “Settings” → “Personal settings” → “API keys” and generate a new key. 2) Copy it. 3) The API requires "
      + "the meeting organizer to have a Pro, Business or Enterprise plan (there is no access with the free one) and it is still in alpha.",
    test: { path: "/meetings", query: { limit: 1 },
              message: (d) => (d?.total != null ? `API key is valid (${d.total} meetings)` : "Credentials are valid") },
    examples: "Examples: GET /meetings?page=1&limit=50&query=… (max. 100 per page and 10,000 in total), GET /meetings/{id}, "
      + "GET /meetings/{id}/transcript, GET /meetings/{id}/notes, POST /meetings/import (imports a meeting from a public URL).",
  },
  {
    id: "vestaboard", name: "Vestaboard", category: "communication", description: "Show messages on your physical Vestaboard",
    website: "https://www.vestaboard.com", docs: "https://docs.vestaboard.com", logo: { favicon: "https://www.vestaboard.com" },
    baseUrl: "https://cloud.vestaboard.com",
    auth: { type: "header", name: "X-Vestaboard-Token" },
    fields: [{ id: "token", label: "Read/Write API token", secret: true }],
    help: "1) You need a Vestaboard. In its web app open the “Developer” section (in the mobile app, “Settings”) and create a token with "
      + "Read and Write permissions: each token works for only one board. 2) Copy it right away: it is shown only once. "
      + "3) Do not send more than one message every 15 seconds or the extra ones will be discarded.",
    test: { path: "/", message: "Token is valid: board is reachable" },
    examples: "Examples: GET / (message currently shown), POST / {\"text\": \"Hello team\"} (changes what the board shows), "
      + "POST / {\"characters\": [[0, 0, …], …]} (6 rows × 22 columns of character codes), GET /transition, "
      + "GET /vbml/format?message=Hello (lays out the text without sending it).",
  },
  {
    id: "waboxapp", name: "Waboxapp", category: "communication", description: "Send WhatsApp messages from your number via Waboxapp",
    website: "https://www.waboxapp.com", docs: "https://www.waboxapp.com/assets/doc/waboxapp-API-v3.pdf",
    logo: { favicon: "https://www.waboxapp.com" },
    baseUrl: "https://www.waboxapp.com/api",
    auth: { type: "query", name: "token" },
    fields: [{ id: "token", label: "Waboxapp API token", secret: true },
             { id: "uid", label: "Your WhatsApp number with country code, without + (34600111222)" }],
    help: "1) Create an account at waboxapp.com and log in to the dashboard. 2) Install the Waboxapp Chrome extension, configure it with "
      + "your “API Token” and link your WhatsApp with the QR code: the browser and the phone must stay connected. 3) Enter "
      + "the token and your number here. Paid service with a free trial.",
    test: { path: "/status/{uid}", account: (d) => d.alias || d.uid },
    examples: "Conector adds the token. POST requests accept form data. Examples: GET /status/34600111222 (account status), "
      + "POST /send/chat with form data {\"uid\": \"34600111222\", \"to\": \"34666777888\", \"custom_uid\": \"msg0001\", "
      + "\"text\": \"…\"} (custom_uid must be unique), POST /send/image, POST /send/link and POST /send/media with the same "
      + "fields plus url.",
  },
  {
    id: "zulip", name: "Zulip", category: "communication", description: "Channels, topics and messages of your Zulip organization",
    website: "https://zulip.com", docs: "https://zulip.com/api/", logo: { simpleIcons: "zulip" },
    baseUrl: "{url}/api/v1",
    auth: { type: "basic", usernameField: "email", passwordField: "token" },
    fields: [{ id: "url", label: "URL of your organization", format: "url",
               help: "e.g. https://example.zulipchat.com, or the one of your own server." },
             { id: "email", label: "Email of the user or bot" },
             { id: "token", label: "API key", secret: true }],
    help: "1) In Zulip open the gear icon → “Personal settings” → “Account & privacy” → “Manage your API key”, confirm your password "
      + "and copy the key. 2) Better still: create a bot under “Personal settings” → “Bots” → “Add a new bot” and use its email and API key. "
      + "It works on any plan, including the self-hosted edition.",
    test: { path: "/users/me", account: (d) => d.full_name || d.email },
    examples: "POST requests are sent as form data (not JSON). Examples: GET /users/me, GET /streams (the channels), GET /users, "
      + "GET /messages?anchor=newest&num_before=20&num_after=0&narrow=[{\"operator\":\"stream\",\"operand\":\"general\"}], "
      + "POST /messages with form data {\"type\": \"stream\", \"to\": \"general\", \"topic\": \"…\", \"content\": \"…\"}.",
    tools: [
      { name: "zulip_send_message", title: "Zulip: send a message", annotations: { destructiveHint: true, openWorldHint: true },
        description: "Post a message in a channel (stream) with its topic, or send a direct message to one or more people by email.",
        schema: { content: z.string().describe("Message text (Zulip Markdown)"),
                   channel: z.string().optional().describe("Channel (stream) name; the topic is also required"),
                   topic: z.string().optional().describe("Topic within the channel"),
                   recipients: z.array(z.string()).optional().describe("Emails of the people, for a direct message") },
        async run({ content, channel, topic, recipients }, p) {
          if (!channel === !recipients?.length) {
            throw new Error("Provide the channel with its topic, or the recipients of the direct message (one of the two)");
          }
          if (channel && !topic) throw new Error("The topic of the message in the channel is missing");
          const formData = channel ? { type: "stream", to: channel, topic: topic, content: content }
            : { type: "private", to: JSON.stringify(recipients), content: content };
          const d = ensureOk(await p({ method: "POST", path: "/messages", form: formData }), "Zulip");
          return { sent: true, id: d.id };
        } },
    ],
  },
];
