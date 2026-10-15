// Customer support: tickets, conversations and knowledge bases.
import { z } from "zod";
import { ensureOk } from "../define.js";

const FRESHDESK_STATUSES = { 2: "open", 3: "pending", 4: "resolved", 5: "closed" };

export default [
  {
    id: "zendesk", name: "Zendesk", category: "support", description: "Tickets, users, organizations and help center",
    website: "https://www.zendesk.com", docs: "https://developer.zendesk.com/api-reference/", logo: { simpleIcons: "zendesk" },
    baseUrl: "https://{subdomain}.zendesk.com/api/v2",
    // Zendesk is retiring API tokens (they cannot be created from Oct 27, 2026 and stop working on Apr 30, 2027): client OAuth.
    auth: { type: "client_credentials", url: "https://{subdomain}.zendesk.com/oauth/tokens", credentialsIn: "body",
            params: { grant_type: "client_credentials", expires_in: "7200" } },
    fields: [{ id: "subdomain", label: "Zendesk subdomain", format: "subdomain",
               help: "If you sign in at https://mycompany.zendesk.com, enter “mycompany”." },
             { id: "client_id", label: "OAuth client identifier" },
             { id: "client_secret", label: "OAuth client secret", secret: true }],
    // One click: user authorization (one OAuth client per Zendesk account). Tokens expire and renew themselves.
    oauth: { scopes: ["read", "write"], fields: ["subdomain"],
      provider: { name: "Zendesk", key: "zendesk", redirect: "localhost", json: true,
        authorizeUrl: "https://{subdomain}.zendesk.com/oauth/authorizations/new", tokenUrl: "https://{subdomain}.zendesk.com/oauth/tokens",
        help: "1) As an administrator, in the Zendesk Admin Center: “Apps and integrations” → “APIs” → “OAuth "
          + "Clients” → “Add OAuth client”. 2) Name it “Conector”, choose the “Confidential” kind, paste the redirect URI shown below into "
          + "“Redirect URLs” and leave the allowed scopes empty (if you limit them, include "
          + "the permissions shown below). 3) Save and copy the “Unique identifier” and the “Secret” (shown only once). 4) When "
          + "connecting, sign in to Zendesk with the user on whose behalf Conector will act. Each OAuth client belongs to a "
          + "single Zendesk account." } },
    help: "1) As an administrator, in the Admin Center: “Apps and integrations” → “APIs” → “OAuth Clients” → "
      + "“Add OAuth client”. 2) Give it a name, choose the “Confidential” kind and leave the allowed scopes empty (or include read "
      + "and write). 3) Save and copy the “Unique identifier” and the “Secret” (the secret is shown only once). Actions are performed on behalf "
      + "of the user who creates the client, so a service account is best. OAuth is used because Zendesk is retiring API tokens.",
    test: { path: "/users/me", account: (d) => d.user?.email || d.user?.name,
              validate: (d) => { if (!d?.user?.id) throw new Error("Zendesk: the request was not authenticated"); } },
    examples: "Examples: GET /search?query=type:ticket status<solved assignee:me, GET /tickets/{id}, GET /tickets/{id}/comments, "
      + "PUT /tickets/{id} {\"ticket\": {\"status\": \"pending\", \"comment\": {\"body\": \"…\", \"public\": false}}}, "
      + "POST /tickets {\"ticket\": {\"subject\": \"…\", \"comment\": {\"body\": \"…\"}}}, GET /users/search?query=…, "
      + "GET /organizations/{id}/tickets, GET /help_center/articles/search?query=….",
    tools: [
      { name: "zendesk_search", title: "Zendesk: search tickets", annotations: { readOnlyHint: true },
        description: "Search tickets with Zendesk syntax (status<solved, priority:high, assignee:me, requester:email, tags:…, "
          + "created>2026-10-01, free text…), newest to oldest. Returns id, subject, status, priority, requester, "
          + "assignee, tags and dates.",
        schema: { search: z.string().describe("e.g. status<solved priority:high, or \"invoice\" requester:customer@example.com"),
                   max: z.number().int().min(1).max(100).default(25) },
        async run({ search, max }, p) {
          const query = { query: `type:ticket ${search}`, per_page: max, sort_by: "updated_at", sort_order: "desc" };
          const d = ensureOk(await p({ path: "/search", query }), "Zendesk");
          return { total: d.count, tickets: (d.results || []).map((t) => ({ id: t.id, subject: t.subject, status: t.status, priority: t.priority,
            requester: t.requester_id, assignee: t.assignee_id, tags: t.tags, created: t.created_at, updated: t.updated_at })) };
        } },
    ],
  },
  {
    id: "freshdesk", name: "Freshdesk", category: "support", description: "Tickets, contacts, companies and knowledge base",
    website: "https://www.freshworks.com/freshdesk/", docs: "https://developers.freshdesk.com/api/",
    logo: { favicon: "https://www.freshworks.com/freshdesk/" },
    baseUrl: "https://{subdomain}.freshdesk.com/api/v2",
    auth: { type: "basic", usernameField: "token", fixedPassword: "X" },
    fields: [{ id: "subdomain", label: "Freshdesk subdomain", format: "subdomain",
               help: "If your portal is https://mycompany.freshdesk.com, enter “mycompany”." },
             { id: "token", label: "API key", secret: true }],
    help: "1) In Freshdesk click your profile picture (top right) → “Profile settings”. 2) Click “View API Key” (on the right, below the "
      + "password change; it may ask for a captcha) and copy the key. It has the same permissions as your agent.",
    test: { path: "/agents/me", account: (d) => d.contact?.email || d.contact?.name },
    examples: "Examples: GET /tickets?filter=new_and_my_open&include=requester, GET /tickets/{id}?include=conversations, "
      + "GET /search/tickets?query=\"status:2 AND priority:4\", POST /tickets/{id}/reply {\"body\": \"…\"}, "
      + "POST /tickets/{id}/notes {\"body\": \"…\", \"private\": true}, PUT /tickets/{id} {\"status\": 4}, GET /contacts?email=…, "
      + "GET /companies, GET /solutions/categories.",
    tools: [
      { name: "freshdesk_search", title: "Freshdesk: filter tickets", annotations: { readOnlyHint: true },
        description: "Filter tickets with Freshdesk syntax: status (2 open, 3 pending, 4 resolved, 5 closed), priority (1 low to "
          + "4 urgent), agent_id, group_id, tag:'…', created_at:>'2026-10-01', combinable with AND/OR. 30 per page, up to 10 pages.",
        schema: { search: z.string().describe("e.g. status:2 AND priority:4, or tag:'invoice' AND created_at:>'2026-10-01'"),
                   page: z.number().int().min(1).max(10).default(1) },
        async run({ search, page }, p) {
          const query = `"${search.replace(/"/g, "'")}"`; // Freshdesk requires the query in double quotes
          const d = ensureOk(await p({ path: "/search/tickets", query: { query, page: page } }), "Freshdesk");
          return { total: d.total, tickets: (d.results || []).map((t) => ({ id: t.id, subject: t.subject,
            status: FRESHDESK_STATUSES[t.status] || t.status, priority: t.priority, requester: t.requester_id, agent: t.responder_id,
            tags: t.tags, created: t.created_at, updated: t.updated_at })) };
        } },
    ],
  },
  {
    id: "intercom", name: "Intercom", category: "support", description: "Conversations, contacts, companies, tickets and articles",
    website: "https://www.intercom.com", docs: "https://developers.intercom.com/docs/references/rest-api/api.intercom.io",
    logo: { simpleIcons: "intercom" },
    baseUrl: "https://{region}.intercom.io", headers: { "Intercom-Version": "2.17" },
    // The authorization page changes with the region (app, app.eu or app.au); the token is always requested at api.intercom.io.
    derived: { app: (c) => ({ "api.eu": "app.eu", "api.au": "app.au" })[c.region] || "app" },
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "Access token", secret: true },
             { id: "region", label: "Workspace region", default: "api",
               options: [["api", "United States"], ["api.eu", "European Union"], ["api.au", "Australia"]],
               help: "If you sign in to Intercom at app.eu.intercom.com, it is the EU; at app.au.intercom.com, Australia." }],
    // One click: app in the Developer Hub. Intercom only accepts https redirects and scopes are chosen in the app.
    oauth: { scopes: [], fields: ["region"],
      provider: { name: "Intercom", key: "intercom", redirect: "https",
        authorizeUrl: "https://{app}.intercom.com/oauth", tokenUrl: "https://api.intercom.io/auth/eagle/token",
        help: "1) In Intercom open the Developer Hub (“Settings” → “Integrations” → “Developer Hub”) and create an app named "
          + "“Conector” (or open an existing one). 2) Under “Authentication” turn on “Use OAuth”, click “Add redirect URL” and paste the "
          + "redirect URI shown below. Intercom only accepts https, so Conector needs an https:// public URL (CONECTOR_PUBLIC_URL). "
          + "3) On that same page select the permissions you need (conversations, contacts, companies, articles…): they are chosen in the "
          + "app, not when connecting. 4) Under “Basic information” copy the “Client ID” and the “Client secret”. 5) Choose your "
          + "workspace region here and click “Continue with Intercom”." } },
    keyUrl: "https://app.intercom.com/a/apps/_/developer-hub",
    help: "1) In Intercom open the Developer Hub (“Settings” → “Integrations” → “Developer Hub”) and click “New app”: give it a name and choose your "
      + "workspace. 2) In the app go to “Configure” → “Authentication” and copy the “Access token”. 3) Check the permissions there "
      + "(“Edit scopes”): read and write for conversations, contacts, etc. Choose your workspace region here.",
    test: { path: "/me", account: (d) => [d.email, d.app?.name].filter(Boolean).join(" · ") },
    examples: "Examples: GET /conversations?per_page=20, POST /conversations/search {\"query\": {\"field\": \"state\", \"operator\": \"=\", "
      + "\"value\": \"open\"}}, GET /conversations/{id}, POST /conversations/{id}/reply {\"message_type\": \"comment\" (or \"note\"), "
      + "\"type\": \"admin\", \"admin_id\": \"…\", \"body\": \"…\"}, POST /contacts/search, GET /contacts/{id}, GET /admins, GET /tickets/{id}, "
      + "GET /articles.",
  },
  {
    id: "helpscout", name: "Help Scout", category: "support", description: "Mailboxes, conversations, customers and notes",
    website: "https://www.helpscout.com", docs: "https://developer.helpscout.com/mailbox-api/", logo: { simpleIcons: "helpscout" },
    baseUrl: "https://api.helpscout.net/v2",
    auth: { type: "client_credentials", url: "https://api.helpscout.net/v2/oauth2/token", credentialsIn: "body" },
    fields: [{ id: "client_id", label: "App ID" }, { id: "client_secret", label: "App Secret", secret: true }],
    // One click: Help Scout does not use scopes in the URL; the app acts with the permissions of the user who authorizes it.
    oauth: { scopes: [], provider: { name: "Help Scout", key: "helpscout", redirect: "https",
      authorizeUrl: "https://secure.helpscout.net/authentication/authorizeClientApplication",
      tokenUrl: "https://api.helpscout.net/v2/oauth2/token",
      help: "1) In Help Scout, as an owner or administrator: your profile → “My apps” → “Create My App” (do not use “Manage” → "
        + "“Apps”, which is for sidebar apps). 2) Name it “Conector” and paste the redirect URI shown below into “Redirection URL”. "
        + "3) Save and copy the “App ID” and the “App Secret”. 4) When connecting, Help Scout asks you to accept that "
        + "Conector acts with your user's permissions; access renews itself." } },
    help: "1) In Help Scout: your profile → “My Apps” → “Create My App”. 2) Give it a name and, as the redirection URL, any https address "
      + "(it is not used). 3) Save and copy the “App ID” and the “App Secret”. The app acts with your user's permissions.",
    test: { path: "/users/me", account: (d) => d.email || [d.firstName, d.lastName].filter(Boolean).join(" ") },
    examples: "Examples: GET /mailboxes, GET /conversations?status=active&mailbox={id}&query=(subject:\"…\"), "
      + "GET /conversations/{id}?embed=threads, POST /conversations/{id}/reply {\"customer\": {\"id\": …}, \"text\": \"…\"}, "
      + "POST /conversations/{id}/notes {\"text\": \"…\"}, PATCH /conversations/{id} {\"op\": \"replace\", \"path\": \"/status\", "
      + "\"value\": \"closed\"}, GET /customers?query=(email:\"…\").",
  },
];
