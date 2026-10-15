// Productivity and documents (the Google ones are in google.js).
import { z } from "zod";
import { ensureOk } from "../define.js";

const notionTitle = (r) => (r.title || Object.values(r.properties || {}).find((p) => p.type === "title")?.title || [])
  .map((t) => t.plain_text).join("");

export default [
  {
    id: "notion", name: "Notion", category: "productivity", description: "Pages, databases, blocks and comments",
    website: "https://www.notion.so", docs: "https://developers.notion.com/reference/intro", logo: { simpleIcons: "notion" },
    baseUrl: "https://api.notion.com/v1", headers: { "Notion-Version": "2022-06-28" },
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "Integration token (ntn_…)", secret: true }],
    // One click: public integration; when authorizing, the user chooses which pages to share.
    oauth: { scopes: [], provider: { name: "Notion", key: "notion", redirect: "localhost", extraParams: { owner: "user" },
      clientAuth: "basic", json: true,
      authorizeUrl: "https://api.notion.com/v1/oauth/authorize", tokenUrl: "https://api.notion.com/v1/oauth/token",
      help: "1) At notion.so/profile/integrations click “New integration”, choose the “Public” type and name it “Conector”. "
        + "2) Fill in the company details (website https://www.example.com, support email and links to the privacy policy and "
        + "the terms of use) and paste the redirect URI shown below into “Redirect URIs”. 3) Save and, in the "
        + "“Configuration” tab, copy the “OAuth client ID” and the “OAuth client secret”. There is no need to publish it." },
      help: "When authorizing, Notion will ask which pages to share with Conector: it will only see those (and their subpages)." },
    keyUrl: "https://www.notion.so/profile/integrations",
    help: "1) At notion.so/profile/integrations click “New integration”, type “Internal”, and choose the workspace. "
      + "2) Copy the “Internal integration secret”. 3) In Notion, share with the integration the pages or databases you "
      + "want to use (“…” → “Connections” → add): it will only see what you share.",
    test: { path: "/users/me", account: (d) => d.bot?.workspace_name || d.name },
    examples: "Examples: POST /search, GET /pages/{id}, POST /databases/{id}/query, GET /blocks/{id}/children, PATCH /blocks/{id}/children, POST /pages.",
    tools: [
      { name: "notion_search", title: "Notion: search pages and databases", annotations: { readOnlyHint: true },
        description: "Searches by title among what is shared with the integration. Returns id, type, title, URL and last edit.",
        schema: { query: z.string().default("").describe("Text to search for in titles (empty: everything)"),
                   type: z.enum(["page", "database"]).optional(), max: z.number().int().min(1).max(100).default(25) },
        run: async ({ query, type, max }, p) => ensureOk(await p({ method: "POST", path: "/search", body: {
          query: query, page_size: max, ...(type ? { filter: { property: "object", value: type } } : {}) } }), "Notion").results
          .map((r) => ({ id: r.id, type: r.object, title: notionTitle(r), url: r.url, edited: r.last_edited_time })) },
    ],
  },
  {
    id: "airtable", name: "Airtable", category: "productivity", description: "Bases, tables and records",
    website: "https://www.airtable.com", docs: "https://airtable.com/developers/web/api/introduction", logo: { simpleIcons: "airtable" },
    baseUrl: "https://api.airtable.com/v0",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "Personal access token (pat…)", secret: true }],
    oauth: { scopes: ["data.records:read", "data.records:write", "schema.bases:read", "schema.bases:write", "user.email:read"],
      provider: { name: "Airtable", key: "airtable", redirect: "localhost", clientAuth: "basic",
        authorizeUrl: "https://airtable.com/oauth2/v1/authorize", tokenUrl: "https://airtable.com/oauth2/v1/token",
        help: "1) At airtable.com/create/oauth click “Register new OAuth integration” and name it “Conector”. 2) In “OAuth redirect "
          + "URL” paste the redirect URI shown below and click “Register integration”. 3) In “Scopes” select the permissions "
          + "listed below, click “Generate client secret” and copy the “Client ID” and the secret." },
      help: "When authorizing, Airtable will ask which bases (or workspaces) Conector can use." },
    keyUrl: "https://airtable.com/create/tokens",
    help: "At airtable.com/create/tokens click “Create token”, add the scopes data.records:read, data.records:write, "
      + "schema.bases:read and user.email:read, and in “Access” choose the bases (or the whole workspace).",
    test: { path: "/meta/whoami", account: (d) => d.email || d.id },
    examples: "Examples: GET /meta/bases, GET /meta/bases/{baseId}/tables, GET /{baseId}/{table}?maxRecords=10, POST /{baseId}/{table}, PATCH /{baseId}/{table}.",
    tools: [
      { name: "airtable_bases", title: "Airtable: accessible bases", annotations: { readOnlyHint: true },
        description: "Lists the bases the token has access to (id, name and permission level).", schema: {},
        run: async (_, p) => ensureOk(await p({ path: "/meta/bases" }), "Airtable").bases },
    ],
  },
  {
    id: "calendly", name: "Calendly", category: "productivity", description: "Appointments, event types and invitees",
    website: "https://calendly.com", docs: "https://developer.calendly.com/api-docs", logo: { simpleIcons: "calendly" },
    baseUrl: "https://api.calendly.com",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "Personal access token", secret: true }],
    // One click: OAuth app in the “Production” environment, which requires an HTTPS redirect URI. New apps have no access to
    // anything not requested in scope. Calendly rotates the refresh token on every renewal.
    oauth: { scopes: ["users:read", "organizations:read", "event_types:read", "scheduled_events:read", "scheduled_events:write",
                        "availability:read", "scheduling_links:write"],
      provider: { name: "Calendly", key: "calendly", redirect: "https", clientAuth: "basic",
        authorizeUrl: "https://auth.calendly.com/oauth/authorize", tokenUrl: "https://auth.calendly.com/oauth/token",
        help: "1) Sign in at developer.calendly.com with GitHub or Google (it is a developer account, separate from your user in "
          + "Calendly) and create an OAuth application named “Conector” of type “Web” and environment “Production”. 2) In “Redirect "
          + "URI” paste the redirect URI shown below (in production it must be HTTPS) and select the permissions (scopes) listed "
          + "below. 3) Copy the “Client ID” and the “Client Secret”: they are shown only when the app is created." } },
    keyUrl: "https://calendly.com/integrations/api_webhooks",
    help: "In Calendly: “Integrations & apps” → “API & webhooks” → “Get a token” (Personal Access Token). When "
      + "creating it, select the permissions (scopes) you need, e.g. users:read, event_types:read and scheduled_events:read, and copy it.",
    test: { path: "/users/me", account: (d) => d.resource?.email },
    examples: "Examples: GET /users/me, GET /event_types?user={uri}, GET /scheduled_events?user={uri}&status=active, GET /scheduled_events/{uuid}/invitees.",
  },
  {
    id: "typeform", name: "Typeform", category: "productivity", description: "Forms and responses",
    website: "https://www.typeform.com", docs: "https://www.typeform.com/developers/get-started/", logo: { favicon: "https://www.typeform.com" },
    baseUrl: "https://{server}.typeform.com",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "Personal access token", secret: true },
             { id: "server", label: "Data center", default: "api", options: [["api", "Standard"], ["api.eu", "European Union"]],
               help: "If your account is hosted in the EU, choose “European Union”." }],
    // One click: app registered in Typeform. Authorization and the token are the same with the standard and the EU data center
    // (api.typeform.com); “server” only decides which API is called (responses are requested from the account's data center).
    // “offline” gives the refresh token; without it, access would expire after a week.
    oauth: { scopes: ["accounts:read", "forms:read", "forms:write", "responses:read", "workspaces:read", "webhooks:read",
                        "webhooks:write", "offline"], fields: ["server"],
      provider: { name: "Typeform", key: "typeform", redirect: "localhost",
        authorizeUrl: "https://api.typeform.com/oauth/authorize", tokenUrl: "https://api.typeform.com/oauth/token",
        help: "1) In Typeform open the dropdown next to your organization name (top left), go to “Developer "
          + "Apps” and click “Register a new app”. 2) Name it “Conector”, set the website to https://www.example.com and enter the redirect URI shown below in “Redirect "
          + "URI(s)”. 3) Copy the “Client ID” and the “Client Secret”: the secret is shown only "
          + "once." } },
    keyUrl: "https://admin.typeform.com/account#/section/tokens",
    help: "In Typeform: your profile → “Settings” → “Personal access tokens” → “Generate a new token” with read permissions for "
      + "forms and responses (and write if you want to create forms).",
    test: { path: "/me", account: (d) => d.email || d.alias },
    examples: "Examples: GET /forms, GET /forms/{id}, GET /forms/{id}/responses?page_size=50, GET /workspaces.",
  },
  {
    id: "miro", name: "Miro", category: "productivity", description: "Boards, cards and sticky notes",
    website: "https://miro.com", docs: "https://developers.miro.com/reference/api-reference", logo: { simpleIcons: "miro" },
    baseUrl: "https://api.miro.com",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "Access token", secret: true }],
    // One click: OAuth app. The permissions are set in the app itself (the authorization URL carries no scope).
    // The token lasts one hour and is renewed with the refresh token; the token endpoint also accepts the parameters as a form.
    oauth: { scopes: [],
      provider: { name: "Miro", key: "miro", redirect: "localhost",
        authorizeUrl: "https://miro.com/oauth/authorize", tokenUrl: "https://api.miro.com/v1/oauth/token",
        help: "1) At miro.com/app/settings/user-profile/apps click “Create new app” (Miro will ask you to create a developer team, "
          + "which is free) and name it “Conector”. 2) Select the permissions boards:read and boards:write (and any others you need) and, in "
          + "“Redirect URI for OAuth2.0”, paste the redirect URI shown below. 3) Copy the “Client ID” and the “Client "
          + "secret”. There is no need to publish it: it is installed in your team when you authorize." },
      help: "When authorizing, Miro asks for the team to install the app in: Conector will use that team's boards." },
    keyUrl: "https://miro.com/app/settings/user-profile/apps",
    help: "In Miro: your profile → “Settings” → “Your apps” → “Create new app”. Select the permissions boards:read and "
      + "boards:write, click “Install app and get OAuth token”, choose the team and copy the token.",
    test: { path: "/v1/oauth-token", account: (d) => [d.user?.name, d.team?.name].filter(Boolean).join(" · ") },
    examples: "Examples: GET /v2/boards, GET /v2/boards/{id}/items, POST /v2/boards/{id}/sticky_notes, POST /v2/boards/{id}/cards.",
  },
  {
    id: "figma", name: "Figma", category: "productivity", description: "Design files, comments and components",
    website: "https://www.figma.com", docs: "https://www.figma.com/developers/api", logo: { simpleIcons: "figma" },
    baseUrl: "https://api.figma.com",
    auth: { type: "header", name: "X-Figma-Token" },
    fields: [{ id: "token", label: "Personal access token (figd_…)", secret: true }],
    // One click: OAuth app. Figma asks for the secret in a Basic header and the permissions (scopes) in the
    // authorization URL. Access lasts 90 days and is renewed at /v1/oauth/refresh.
    oauth: { scopes: ["current_user:read", "file_content:read", "file_metadata:read", "file_comments:read", "file_comments:write",
                        "file_versions:read", "library_content:read", "team_library_content:read", "library_assets:read", "folders:read"],
      provider: { name: "Figma", key: "figma", redirect: "localhost", clientAuth: "basic",
        authorizeUrl: "https://www.figma.com/oauth", tokenUrl: "https://api.figma.com/v1/oauth/token", refreshUrl: "https://api.figma.com/v1/oauth/refresh",
        help: "1) At figma.com/developers/apps click “Create a new app”, name it “Conector” and choose your team or organization. "
          + "2) Copy the “Client ID” and the “Client Secret” (the secret is only shown now). 3) In “OAuth credentials” click "
          + "“Add a redirect URL” and paste the redirect URI shown below; in “OAuth scopes” select the permissions (scopes) listed "
          + "below. 4) While in draft it can only be used by its creator and the plan's admins; for everyone else, in "
          + "“Publish” leave “Private” and click “Publish” (it does not need Figma review)." } },
    keyUrl: "https://www.figma.com/settings",
    help: "In Figma: your account menu → “Settings” → “Security” → “Personal access tokens” → “Generate new token”. "
      + "Choose the permissions (file reading, comments…) and copy it: it is shown only once.",
    test: { path: "/v1/me", account: (d) => d.email || d.handle },
    examples: "Examples: GET /v1/files/{key}, GET /v1/files/{key}/comments, POST /v1/files/{key}/comments, GET /v1/images/{key}?ids=…&format=png.",
  },
  {
    id: "clockify", name: "Clockify", category: "productivity", description: "Time tracking, projects and reports",
    website: "https://clockify.me", docs: "https://docs.clockify.me", logo: { simpleIcons: "clockify" },
    baseUrl: "https://api.clockify.me/api/v1",
    auth: { type: "header", name: "X-Api-Key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    // No OAuth: Clockify only supports an API key (and the add-on tokens from its Marketplace).
    keyUrl: "https://app.clockify.me/user/preferences#advanced",
    help: "In Clockify: your profile → “Preferences” → “Advanced” tab → “Manage API keys” → “Generate new”.",
    test: { path: "/user", account: (d) => d.email },
    examples: "Examples: GET /workspaces, GET /workspaces/{id}/projects, GET /workspaces/{id}/user/{userId}/time-entries, POST /workspaces/{id}/time-entries.",
  },
  {
    id: "coda", name: "Coda", category: "productivity", description: "Docs, tables and formulas",
    website: "https://coda.io", docs: "https://coda.io/developers/apis/v1", logo: { simpleIcons: "coda" },
    baseUrl: "https://coda.io/apis/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API token", secret: true }],
    // No OAuth: Coda's REST API only supports personal API tokens.
    keyUrl: "https://coda.io/account",
    help: "At coda.io/account, in the “API settings” section, click “Generate API token”, give it a name and copy it.",
    test: { path: "/whoami", account: (d) => d.loginId || d.name },
    examples: "Examples: GET /docs, GET /docs/{docId}/tables, GET /docs/{docId}/tables/{tableId}/rows, POST /docs/{docId}/tables/{tableId}/rows.",
  },
  {
    id: "dropbox", name: "Dropbox", category: "productivity", description: "Files and folders in the cloud",
    website: "https://www.dropbox.com", docs: "https://www.dropbox.com/developers/documentation/http/documentation", logo: { simpleIcons: "dropbox" },
    baseUrl: "https://api.dropboxapi.com/2", allowedOrigins: ["https://content.dropboxapi.com"],
    auth: { type: "oauth", provider: "dropbox", scopes: ["account_info.read", "files.metadata.read", "files.metadata.write",
      "files.content.read", "files.content.write", "sharing.read", "sharing.write"] },
    test: { method: "POST", path: "/users/get_current_account", body: null, account: (d) => d.email },
    examples: "All calls are POST with a JSON body: /files/list_folder {\"path\": \"\"}, /files/search_v2 {\"query\": \"…\"}, "
      + "/files/get_metadata. To download or upload use https://content.dropboxapi.com/2/files/download or /files/upload with the Dropbox-API-Arg header.",
  },
];
