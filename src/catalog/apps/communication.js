// Communication: team chat, messaging and video calls (Gmail is in google.js).
import { z } from "zod";
import { ensureOk } from "../define.js";

// Slack answers 200 even on failure: the error arrives as { ok: false, error }.
function slack(d) {
  if (!d?.ok) throw new Error(`Slack: ${d?.error || "unexpected response"}${d?.needed ? ` (missing permission ${d.needed})` : ""}`);
  return d;
}

// Zoom only uses PKCE with the public client; with a secret (Basic header) the authorization challenge and the token
// verifier are omitted.
const PKCE = ["code_challenge", "code_challenge_method", "code_verifier"];
const dropPkce = (p) => Object.fromEntries(Object.entries(p).filter(([k]) => !PKCE.includes(k)));

export default [
  {
    id: "slack", name: "Slack", category: "communication", description: "Channels, messages, threads and users of the workspace",
    website: "https://slack.com", docs: "https://docs.slack.dev/reference/methods", logo: { favicon: "https://slack.com" },
    baseUrl: "https://slack.com/api",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "Bot User OAuth Token (xoxb-…)", secret: true }],
    // One-click connect: the Conector app is installed in the workspace with the same bot permissions. Slack only accepts
    // HTTPS redirect URIs (needs an https:// public URL, CONECTOR_PUBLIC_URL).
    oauth: { scopes: ["chat:write", "channels:read", "groups:read", "channels:history", "groups:history", "users:read", "users:read.email",
                        "reactions:write", "files:write"],
      provider: { name: "Slack", key: "slack", redirect: "https", scopeSeparator: ",",
        authorizeUrl: "https://slack.com/oauth/v2/authorize", tokenUrl: "https://slack.com/api/oauth.v2.access",
        help: "1) At api.slack.com/apps click “Create New App” → “From scratch”, name it “Conector” and choose the workspace. "
          + "2) Under “OAuth & Permissions” add the redirect URI shown below to “Redirect URLs” and, under “Bot Token Scopes”, the "
          + "permissions (scopes) listed below. 3) Under “Basic Information” copy the “Client ID” and the “Client Secret”." },
      help: "After connecting, invite the bot to each channel it must read or write: /invite @Conector." },
    keyUrl: "https://api.slack.com/apps",
    help: "1) At api.slack.com/apps click “Create New App” → “From scratch”, name it and choose the workspace. "
      + "2) Under “OAuth & Permissions” → “Bot Token Scopes” add chat:write, channels:read, groups:read, channels:history, "
      + "groups:history and users:read (and users:read.email, reactions:write or files:write if you need them). "
      + "3) Click “Install to Workspace” and authorize. 4) Copy the “Bot User OAuth Token” (xoxb-…). "
      + "5) Invite the bot to each channel it must read or write: /invite @app-name.",
    test: { path: "/auth.test", validate: slack, account: (d) => [d.user, d.team].filter(Boolean).join(" · ") },
    examples: "Examples: GET /conversations.list?types=public_channel,private_channel&limit=200, "
      + "GET /conversations.history?channel=C…&limit=20, GET /conversations.replies?channel=C…&ts=…, "
      + "POST /chat.postMessage {\"channel\": \"C…\", \"text\": \"…\", \"thread_ts\": \"…\"}, GET /users.list, "
      + "GET /users.lookupByEmail?email=…. Note: Slack also answers 200 on errors; check the ok field "
      + "(ok:false carries an error, e.g. not_in_channel, channel_not_found or missing_scope).",
    tools: [
      { name: "slack_send_message", title: "Slack: send a message", annotations: { destructiveHint: true, openWorldHint: true },
        description: "Post a message as the bot in a channel (it must be invited), in a thread or as a direct message to a user.",
        schema: { channel: z.string().describe("Channel ID (C…), user ID (U…, direct message) or public channel name"),
                   text: z.string().describe("Message text (Slack mrkdwn format)"),
                   thread: z.string().optional().describe("ts of the original message, to reply in its thread") },
        async run({ channel, text, thread }, p) {
          const d = slack(ensureOk(await p({ method: "POST", path: "/chat.postMessage",
            body: { channel: channel, text: text, thread_ts: thread } }), "Slack"));
          return { sent: true, channel: d.channel, ts: d.ts };
        } },
      { name: "slack_channels", title: "Slack: channels", annotations: { readOnlyHint: true },
        description: "List the non-archived channels (id, name, whether it is private, whether the bot is a member, member count and topic).",
        schema: { include_private: z.boolean().default(true).describe("Include the private channels the bot is in"),
                   max: z.number().int().min(1).max(999).default(200),
                   cursor: z.string().optional().describe("The “next” value from the previous call") },
        async run({ include_private, max, cursor }, p) {
          const channelTypes = include_private ? "public_channel,private_channel" : "public_channel";
          const d = slack(ensureOk(await p({ path: "/conversations.list",
            query: { types: channelTypes, exclude_archived: true, limit: max, cursor } }), "Slack"));
          return { channels: d.channels.map((c) => ({ id: c.id, name: c.name, private: c.is_private, member: c.is_member,
                                                     members: c.num_members, topic: c.topic?.value || undefined })),
                   next: d.response_metadata?.next_cursor || null };
        } },
    ],
  },
  {
    id: "discord", name: "Discord", category: "communication", description: "Servers, channels and messages with a bot",
    website: "https://discord.com", docs: "https://docs.discord.com/developers/reference", logo: { simpleIcons: "discord" },
    // Discord requires a User-Agent in the format “DiscordBot (url, version)”.
    baseUrl: "https://discord.com/api/v10", headers: { "User-Agent": "DiscordBot (https://github.com/Secra-Solutions/Conector, 1.0)" },
    auth: { type: "header", name: "Authorization", prefix: "Bot " },
    fields: [{ id: "token", label: "Bot token", secret: true }],
    // No OAuth: a user's OAuth token cannot read or write messages in channels (only a bot can), and the OAuth “bot” scope
    // only adds the bot to the server; the API is still used with the bot token.
    keyUrl: "https://discord.com/developers/applications",
    help: "1) At discord.com/developers/applications click “New Application”. 2) Under “Bot” click “Reset Token” and copy the token; "
      + "turn on “Message Content Intent” if the bot has to read the text of messages. 3) Under “OAuth2” → “OAuth2 URL Generator” "
      + "check the “bot” scope and the permissions (View Channels, Send Messages, Read Message History…), open the generated URL and add "
      + "the bot to your server.",
    test: { path: "/users/@me", account: (d) => d.username },
    examples: "Examples: GET /users/@me/guilds, GET /guilds/{id}/channels, GET /channels/{id}/messages?limit=50, "
      + "POST /channels/{id}/messages {\"content\": \"…\"} (max. 2000 characters), PATCH /channels/{id}/messages/{messageId}, "
      + "DELETE /channels/{id}/messages/{messageId}, GET /guilds/{id}/roles.",
    tools: [
      { name: "discord_channels", title: "Discord: servers and channels", annotations: { readOnlyHint: true },
        description: "List the servers the bot is in, with their text and announcement channels (ids included).", schema: {},
        async run(_, p) {
          const servers = ensureOk(await p({ path: "/users/@me/guilds" }), "Discord");
          const output = [];
          for (const s of servers) {
            const channels = ensureOk(await p({ path: `/guilds/${s.id}/channels` }), "Discord");
            output.push({ server: s.name, id: s.id, channels: channels.filter((c) => c.type === 0 || c.type === 5)
              .map((c) => ({ id: c.id, name: c.name, ...(c.type === 5 ? { announcements: true } : {}) })) });
          }
          return output;
        } },
      { name: "discord_send_message", title: "Discord: send a message", annotations: { destructiveHint: true, openWorldHint: true },
        description: "Send a message as the bot to a text channel, or reply to a message. It does not notify @everyone or roles.",
        schema: { channel: z.string().describe("Channel ID (list them with discord_channels)"),
                   text: z.string().max(2000).describe("Content (Discord Markdown, max. 2000 characters)"),
                   reply_to: z.string().optional().describe("ID of the message to reply to") },
        async run({ channel, text, reply_to }, p) {
          const messageBody = { content: text, allowed_mentions: { parse: ["users"] },
                                ...(reply_to ? { message_reference: { message_id: reply_to } } : {}) };
          const d = ensureOk(await p({ method: "POST", path: `/channels/${encodeURIComponent(channel)}/messages`, body: messageBody }), "Discord");
          return { sent: true, id: d.id, channel: d.channel_id };
        } },
    ],
  },
  {
    id: "telegram", name: "Telegram", category: "communication", description: "Telegram bot: send messages and read received ones",
    website: "https://telegram.org", docs: "https://core.telegram.org/bots/api", logo: { simpleIcons: "telegram" },
    // The token goes in the path (https://api.telegram.org/bot<token>/method), not in a header.
    baseUrl: "https://api.telegram.org/bot{token}",
    auth: { type: "none" },
    fields: [{ id: "token", label: "Bot token", secret: true, format: "segment",
               example: "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11", help: "It looks like 123456789:AA… and @BotFather gives it to you." }],
    // No OAuth: Telegram bots only use the token issued by @BotFather.
    keyUrl: "https://t.me/BotFather",
    help: "1) In Telegram open @BotFather, send /newbot and choose the name and username of the bot (it must end in “bot”). "
      + "2) Copy the token it returns. 3) For the bot to message someone, that person must have talked to it first; "
      + "in groups, add it (by default it only sees commands, mentions and replies: change this with /setprivacy) and in channels, "
      + "make it an administrator.",
    test: { path: "/getMe", account: (d) => d.result?.username && `@${d.result.username}` },
    examples: "Examples: GET /getUpdates (received messages and their chat.id; it does not work if a webhook is active), "
      + "POST /sendMessage {\"chat_id\": 123, \"text\": \"…\", \"parse_mode\": \"HTML\"}, "
      + "POST /sendPhoto {\"chat_id\": 123, \"photo\": \"https://…\"}, GET /getChat?chat_id=@channel. "
      + "Responses carry {ok, result}; errors carry {ok: false, description}.",
    tools: [
      { name: "telegram_send_message", title: "Telegram: send a message",
        annotations: { destructiveHint: true, openWorldHint: true },
        description: "Send a text message as the bot to a private chat, group or channel.",
        schema: { chat: z.union([z.string(), z.number()]).describe("Numeric chat_id (shown in getUpdates) or @username of the channel"),
                   text: z.string().max(4096),
                   format: z.enum(["HTML", "MarkdownV2"]).optional().describe("parse_mode (without it, plain text)"),
                   silent: z.boolean().default(false).describe("Send without a notification sound") },
        async run({ chat, text, format, silent }, p) {
          const d = ensureOk(await p({ method: "POST", path: "/sendMessage", body: { chat_id: chat, text: text, parse_mode: format,
            disable_notification: silent || undefined } }), "Telegram");
          return { sent: true, id: d.result?.message_id, chat: d.result?.chat?.id };
        } },
    ],
  },
  {
    id: "twilio", name: "Twilio", category: "communication", description: "SMS, calls, phone numbers and WhatsApp via Twilio",
    website: "https://www.twilio.com", docs: "https://www.twilio.com/docs/usage/api", logo: { favicon: "https://www.twilio.com" },
    baseUrl: "https://api.twilio.com/2010-04-01/Accounts/{account_sid}",
    allowedOrigins: ["https://messaging.twilio.com", "https://verify.twilio.com", "https://lookups.twilio.com"],
    auth: { type: "basic", usernameField: "account_sid", passwordField: "auth_token" },
    fields: [{ id: "account_sid", label: "Account SID (AC…)" },
             { id: "auth_token", label: "Auth Token", secret: true }],
    // No OAuth: Twilio Connect is only for platforms that manage third-party accounts (ISVs).
    keyUrl: "https://console.twilio.com",
    help: "At console.twilio.com, in the “Account Info” box on the main page, copy the “Account SID” (AC…) and the "
      + "“Auth Token” (click “Show” to reveal it). Note: the Auth Token gives full access to the account, including sending messages and "
      + "making calls charged to the balance.",
    test: { path: "https://api.twilio.com/2010-04-01/Accounts/{account_sid}.json", account: (d) => d.friendly_name },
    examples: "The base already includes the account and POST requests are sent as form data (not JSON). Examples: GET /Messages.json?PageSize=20, "
      + "POST /Messages.json with form data {To: \"+1…\", From: \"+…\", Body: \"…\"}, GET /Messages/{sid}.json, "
      + "GET /IncomingPhoneNumbers.json, GET /Calls.json?PageSize=20, GET /Usage/Records/ThisMonth.json. "
      + "To paginate use the full URL https://api.twilio.com + next_page_uri. Other APIs with a full URL: "
      + "https://lookups.twilio.com/v2/PhoneNumbers/+1…, https://verify.twilio.com/v2/Services, https://messaging.twilio.com/v1/Services.",
    tools: [
      { name: "twilio_send_sms", title: "Twilio: send an SMS", annotations: { destructiveHint: true, openWorldHint: true },
        description: "Send an SMS (or a WhatsApp message, with the whatsapp: prefix) from a Twilio number or a messaging service. "
          + "It has a cost.",
        schema: { to: z.string().describe("Destination in E.164 format, e.g. +12025550123 (whatsapp:+1… for WhatsApp)"),
                   from: z.string().describe("Sending Twilio number (+…, or whatsapp:+…) or messaging service SID (MG…)"),
                   text: z.string().max(1600) },
        async run({ to, from, text }, p) {
          const sender = /^MG[0-9a-f]{32}$/i.test(from) ? { MessagingServiceSid: from } : { From: from };
          const d = ensureOk(await p({ method: "POST", path: "/Messages.json",
            form: { To: to, Body: text, ...sender } }), "Twilio");
          return { sid: d.sid, status: d.status, to: d.to, from: d.from, segments: d.num_segments };
        } },
    ],
  },
  {
    id: "whatsapp", name: "WhatsApp Business", category: "communication",
    description: "WhatsApp Business messages and templates (Meta Cloud API)",
    website: "https://business.whatsapp.com", logo: { simpleIcons: "whatsapp" },
    docs: "https://developers.facebook.com/documentation/business-messaging/whatsapp/reference/whatsapp-business-phone-number/message-api",
    // The base includes the phone number so the tools do not need to know its ID.
    baseUrl: "https://graph.facebook.com/{version}/{phone_number_id}",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "System user access token", secret: true },
             { id: "phone_number_id", label: "Phone number ID",
               help: "App dashboard at developers.facebook.com → WhatsApp → “API Setup” (it is not the phone number itself)." },
             { id: "version", label: "Graph API version", default: "v26.0", optional: true }],
    // No OAuth: for the WhatsApp account of your own business, Meta asks for a system user token (it does not expire). Facebook
    // Login gives user tokens that expire in hours or weeks and have no refresh token, and accounts of other
    // businesses require being a “Tech Provider”: app review (advanced access), business verification and embedded signup.
    keyUrl: "https://business.facebook.com/settings/system-users",
    help: "1) At business.facebook.com → “Business settings” → “System users” → “Add” (admin role). "
      + "2) On that user, “Assign assets”: the Meta app (full control) and the WhatsApp Business account. 3) Generate a token: "
      + "choose the app, the expiration (“Never” avoids renewing it) and the permissions whatsapp_business_messaging, whatsapp_business_management "
      + "and business_management. 4) Copy the token and the phone number ID (app dashboard → WhatsApp → “API Setup”).",
    test: { path: "https://graph.facebook.com/{version}/{phone_number_id}",
              query: { fields: "display_phone_number,verified_name,quality_rating" },
              account: (d) => [d.verified_name, d.display_phone_number].filter(Boolean).join(" · ") },
    examples: "The base already includes the number ID. Examples: POST /messages {\"messaging_product\": \"whatsapp\", "
      + "\"to\": \"34600111222\", \"type\": \"text\", \"text\": {\"body\": \"…\"}} (free text only within 24 h after the customer's last "
      + "message; outside that window, \"type\": \"template\" with {\"name\": \"…\", \"language\": {\"code\": \"es\"}, "
      + "\"components\": […]}), GET /whatsapp_business_profile?fields=about,description,email,websites. "
      + "For the WhatsApp Business account use the full URL: "
      + "GET https://graph.facebook.com/v26.0/{waba_id}/message_templates?fields=name,status,language, "
      + "GET https://graph.facebook.com/v26.0/{waba_id}/phone_numbers.",
    tools: [
      { name: "whatsapp_send_message", title: "WhatsApp: send a message",
        annotations: { destructiveHint: true, openWorldHint: true },
        description: "Send a text (only within 24 h after the customer's last message) or an approved template "
          + "(required to start the conversation; marketing and utility templates have a cost).",
        schema: { to: z.string().describe("Recipient number with country code, e.g. 34600111222"),
                   text: z.string().max(4096).optional().describe("Free text (instead of a template)"),
                   template: z.string().optional().describe("Name of the approved template"),
                   language: z.string().default("en_US").describe("Template language code, e.g. en_US, es or pt_BR"),
                   parameters: z.union([z.array(z.string()), z.record(z.string(), z.string())]).optional()
                     .describe("Template body variables: ordered list ({{1}}, {{2}}…) or an object if they are named") },
        async run({ to, text, template, language, parameters }, p) {
          if (!text === !template) throw new Error("Provide the text or the template (one of the two)");
          const variables = Array.isArray(parameters) ? parameters.map((text) => ({ type: "text", text }))
            : Object.entries(parameters || {}).map(([parameter_name, text]) => ({ type: "text", parameter_name, text }));
          const content = template
            ? { type: "template", template: { name: template, language: { code: language },
                ...(variables.length ? { components: [{ type: "body", parameters: variables }] } : {}) } }
            : { type: "text", text: { body: text, preview_url: true } };
          const d = ensureOk(await p({ method: "POST", path: "/messages", body: { messaging_product: "whatsapp",
            recipient_type: "individual", to: to.replace(/\D/g, ""), ...content } }), "WhatsApp");
          return { sent: true, id: d.messages?.[0]?.id, to: d.contacts?.[0]?.wa_id };
        } },
    ],
  },
  {
    id: "zoom", name: "Zoom", category: "communication", description: "Meetings, recordings and users of the account",
    website: "https://www.zoom.com", docs: "https://developers.zoom.us/docs/api/", logo: { favicon: "https://www.zoom.com" },
    baseUrl: "https://api.zoom.us/v2",
    auth: { type: "client_credentials", url: "https://zoom.us/oauth/token",
            params: { grant_type: "account_credentials", account_id: "{account_id}" } },
    fields: [{ id: "account_id", label: "Account ID" },
             { id: "client_id", label: "Client ID" },
             { id: "client_secret", label: "Client secret", secret: true }],
    // One-click connect: user-managed Zoom “General” app (the Server-to-Server one in this entry remains the key-based alternative).
    // Zoom sets the permissions in the app itself (the authorization URL carries no scope) and requires an HTTPS redirect
    // URI except with the public client.
    oauth: { scopes: [],
      provider: { name: "Zoom", key: "zoom", redirect: "https", clientAuth: "basic",
        authorizeUrl: "https://zoom.us/oauth/authorize", tokenUrl: "https://zoom.us/oauth/token", params: dropPkce, tokenBody: dropPkce,
        help: "1) Log in at marketplace.zoom.us with your Zoom account, open “Develop” → “Build App” and create a “General App” of "
          + "type “User-managed” named “Conector”. 2) Paste the redirect URI shown below into “OAuth Redirect URL” "
          + "and “OAuth Allow List” (Zoom requires HTTPS). 3) Under “Scopes” click “Add Scopes” and add the user and meeting ones, "
          + "e.g. user:read:user, meeting:read:list_meetings, meeting:read:meeting, meeting:write:meeting, "
          + "meeting:update:meeting and meeting:delete:meeting (and the recording or report ones you need). 4) Under “App "
          + "Credentials” copy the “Client ID” and the “Client Secret”. While the app is unpublished, only users of "
          + "your Zoom account can authorize it (“Local Test”)." },
      help: "Conector acts with the permissions of the person who authorizes and only with the scopes you added to the app." },
    keyUrl: "https://marketplace.zoom.us/develop/create",
    help: "1) At marketplace.zoom.us: “Developers” (bottom left) → “+” → “Build an app” → “Server-to-Server OAuth app” → "
      + "“Create”. 2) Copy the Account ID, the Client ID and the Client secret. 3) Fill in “Information” (company and contact). "
      + "4) Under “Scopes” → “Add Scopes” add at least user:read:user:admin, meeting:read:list_meetings:admin and "
      + "meeting:write:meeting:admin (and the recording or report ones if you need them). 5) Under “Activation” activate the app. "
      + "You need a role with permission for Server-to-Server apps and for those scopes.",
    test: { path: "/users/me", account: (d) => d.email },
    examples: "Examples: GET /users/me, GET /users?status=active&page_size=100, GET /users/{email}/meetings?type=upcoming, "
      + "POST /users/{email}/meetings {\"topic\": \"…\", \"type\": 2, \"start_time\": \"2026-10-20T10:00:00\", "
      + "\"timezone\": \"America/New_York\", \"duration\": 30}, GET /meetings/{id}, PATCH /meetings/{id}, DELETE /meetings/{id}, "
      + "GET /users/{email}/recordings?from=2026-10-01&to=2026-10-15, GET /past_meetings/{uuid}/participants.",
    tools: [
      { name: "zoom_meetings", title: "Zoom: scheduled meetings", annotations: { readOnlyHint: true },
        description: "List a user's meetings (id, topic, start, duration, time zone and join link).",
        schema: { user: z.string().default("me").describe("Host email or ID (“me”: the app owner)"),
                   type: z.enum(["upcoming", "scheduled", "previous_meetings"]).default("upcoming"),
                   max: z.number().int().min(1).max(300).default(30) },
        async run({ user, type, max }, p) {
          const d = ensureOk(await p({ path: `/users/${encodeURIComponent(user)}/meetings`,
            query: { type: type, page_size: max } }), "Zoom");
          return (d.meetings || []).map((m) => ({ id: m.id, topic: m.topic, start: m.start_time, duration: m.duration,
                                                 timezone: m.timezone, link: m.join_url }));
        } },
      { name: "zoom_create_meeting", title: "Zoom: create a meeting", annotations: { destructiveHint: true, openWorldHint: true },
        description: "Schedule a meeting and return its id, join link and password.",
        schema: { topic: z.string(), start: z.string().describe("Local date and time, e.g. 2026-10-20T10:00:00"),
                   duration: z.number().int().min(1).max(1440).default(30).describe("Minutes"),
                   timezone: z.string().default("UTC"), agenda: z.string().optional(),
                   user: z.string().default("me").describe("Host email or ID") },
        async run({ topic, start, duration, timezone, agenda, user }, p) {
          const d = ensureOk(await p({ method: "POST", path: `/users/${encodeURIComponent(user)}/meetings`,
            body: { topic: topic, type: 2, start_time: start, duration: duration, timezone: timezone, agenda } }), "Zoom");
          return { id: d.id, topic: d.topic, start: d.start_time, link: d.join_url, password: d.password };
        } },
    ],
  },
  {
    id: "mattermost", name: "Mattermost", category: "communication", description: "Channels, messages and teams of a Mattermost server",
    website: "https://mattermost.com", docs: "https://docs.mattermost.com/api", logo: { simpleIcons: "mattermost" },
    baseUrl: "{url}/api/v4",
    auth: { type: "bearer" },
    fields: [{ id: "url", label: "Server URL", format: "url",
               help: "The address you log in with, e.g. https://chat.example.com." },
             { id: "token", label: "Personal or bot access token", secret: true }],
    // One-click connect: the server itself acts as an OAuth 2.0 provider (no scopes; it gives the refresh token to confidential clients).
    // The authorization and token URLs hang off the server address.
    oauth: { scopes: [], fields: ["url"],
      provider: { name: "Mattermost", key: "mattermost", redirect: "localhost",
        authorizeUrl: "{url}/oauth/authorize", tokenUrl: "{url}/oauth/access_token",
        help: "1) An administrator turns on “Enable OAuth 2.0 Service Provider” in “System Console” → “Integrations” → "
          + "“Integration Management”. 2) In the product menu → “Integrations” → “OAuth 2.0 Applications” click “Add OAuth "
          + "2.0 Application” (leave “Is Public Client” unchecked), name it “Conector”, set “Homepage” to "
          + "https://www.example.com and, under “Callback URLs”, the redirect URI shown below. 3) Copy the “Client ID” and the "
          + "“Client Secret”. An administrator can mark it as “Is Trusted” so that it does not ask for consent." },
      help: "Mattermost does not split permissions into scopes: Conector acts with the same permissions as your user." },
    help: "1) An administrator enables tokens in “System Console” → “Integrations” → “Integration Management” → "
      + "“Enable Personal Access Tokens” (to allow a non-admin user, use “User Management” → “Users” → “Manage Roles”). "
      + "2) In your profile → “Security” → “Personal Access Tokens” → “Create Token”, add a description and copy the token (it is "
      + "shown only once). The token of a bot account (“Integrations” → “Bot Accounts”) also works.",
    test: { path: "/users/me", account: (d) => d.username && `@${d.username}` },
    examples: "Examples: GET /users/me/teams, GET /users/me/teams/{team_id}/channels, GET /teams/name/{team}/channels/name/{channel}, "
      + "GET /channels/{id}/posts?per_page=30, POST /posts {\"channel_id\": \"…\", \"message\": \"…\", \"root_id\": \"(optional, thread)\"}, "
      + "POST /teams/{team_id}/posts/search {\"terms\": \"…\"}, GET /users/username/{username}, "
      + "POST /channels/direct [\"userId1\", \"userId2\"].",
    tools: [
      { name: "mattermost_channels", title: "Mattermost: teams and channels", annotations: { readOnlyHint: true },
        description: "List, by team, the public and private channels you are a member of (ids included).", schema: {},
        async run(_, p) {
          const teams = ensureOk(await p({ path: "/users/me/teams" }), "Mattermost");
          const output = [];
          for (const e of teams) {
            const channels = ensureOk(await p({ path: `/users/me/teams/${encodeURIComponent(e.id)}/channels` }), "Mattermost");
            output.push({ team: e.display_name, id: e.id, channels: channels.filter((c) => c.type === "O" || c.type === "P")
              .map((c) => ({ id: c.id, name: c.display_name, url_name: c.name, private: c.type === "P" })) });
          }
          return output;
        } },
      { name: "mattermost_send_message", title: "Mattermost: send a message",
        annotations: { destructiveHint: true, openWorldHint: true },
        description: "Post a message in a channel or reply in a thread.",
        schema: { channel: z.string().describe("Channel ID (list them with mattermost_channels)"),
                   text: z.string().describe("Message (supports Markdown)"),
                   thread: z.string().optional().describe("ID of the root message, to reply in its thread") },
        async run({ channel, text, thread }, p) {
          const d = ensureOk(await p({ method: "POST", path: "/posts",
            body: { channel_id: channel, message: text, root_id: thread } }), "Mattermost");
          return { sent: true, id: d.id, channel: d.channel_id };
        } },
    ],
  },
];
