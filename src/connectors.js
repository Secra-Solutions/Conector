// Built-in connectors (Microsoft 365 with device-code sign-in, Odoo over JSON-RPC and a few key-based apps) plus the
// declarative catalog in src/catalog. Credentials are only ever sent to each service's official origin.
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { annotateConnection, connectionFor, getCredentials, saveCredentials, SCOPE } from "./store.js";
import { CATALOG, CATALOG_ERRORS } from "./catalog/index.js";
import { CATEGORIES, defineConnector, redactSecrets } from "./catalog/define.js";
import { buildUrl, ensureOk, formatResult, httpRequest, jsonBody, requestTool, saveDownload } from "./http.js";

export { CATEGORIES, formatResult };

// ---------------------------------------------------------------- Microsoft 365 (Graph)

const GRAPH = "https://graph.microsoft.com/v1.0";
// Microsoft's public "Microsoft Graph Command Line Tools" client allows device-code sign-in without registering an
// app. It can be replaced by your own Entra ID app in the advanced options.
export const MICROSOFT_CLIENT = "14d82eec-204b-4c2f-b7e8-296a70dab67e";
const MICROSOFT_SCOPES = ["offline_access", "User.Read", "Mail.ReadWrite", "Mail.Send", "MailboxSettings.ReadWrite",
  "Files.ReadWrite.All", "Sites.ReadWrite.All", "Chat.ReadWrite", "ChatMessage.Send", "ChannelMessage.Send",
  "Team.ReadBasic.All", "Channel.ReadBasic.All"].join(" ");
const flows = new Map(); // `${scope}` → device-code flow in progress
const msRefreshes = new Map();

async function microsoftToken() {
  const cred = getCredentials("microsoft365");
  if (!cred) throw new Error("Microsoft 365 is not connected");
  if (cred.access_token && cred.expires > Date.now() + 60_000) return cred.access_token;
  const scope = cred[SCOPE];
  if (!msRefreshes.has(scope)) {
    msRefreshes.set(scope, (async () => {
      try {
        const r = await httpRequest(`https://login.microsoftonline.com/${cred.tenant}/oauth2/v2.0/token`, { method: "POST",
          body: new URLSearchParams({ client_id: cred.client_id, grant_type: "refresh_token", refresh_token: cred.refresh_token, scope: MICROSOFT_SCOPES }) });
        const d = ensureOk(r, "Microsoft");
        saveCredentials("microsoft365", { ...cred, access_token: d.access_token, refresh_token: d.refresh_token || cred.refresh_token,
                                          expires: Date.now() + d.expires_in * 1000 }, { scope });
        return d.access_token;
      } finally {
        msRefreshes.delete(scope);
      }
    })());
  }
  return msRefreshes.get(scope);
}

async function graph({ method = "GET", path: route, query, body, body_base64, content_type, headers = {} }) {
  const token = await microsoftToken();
  const payload = jsonBody(body, body_base64, content_type);
  return httpRequest(buildUrl(GRAPH, route, query), { method, ...payload,
    headers: { Authorization: `Bearer ${token}`, ...payload.headers, ...headers } });
}

/** Starts a device-code sign-in; the tokens are stored in `scope` when the user approves it. */
export async function startMicrosoftDeviceFlow({ tenant, client_id, scope, userId }) {
  const r = await httpRequest(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/devicecode`, { method: "POST",
    body: new URLSearchParams({ client_id, scope: MICROSOFT_SCOPES }) });
  const d = ensureOk(r, "Microsoft");
  const flow = { code: d.user_code, url: d.verification_uri, expires: Date.now() + d.expires_in * 1000, status: "waiting" };
  flows.set(scope, flow);
  pollDeviceFlow(d.device_code, d.interval || 5, { tenant, client_id, scope, userId }, flow);
  return flow;
}

export const microsoftFlow = (scope) => flows.get(scope) || null;

async function pollDeviceFlow(deviceCode, interval, { tenant, client_id, scope, userId }, flow) {
  while (flow.status === "waiting" && Date.now() < flow.expires) {
    await new Promise((ok) => setTimeout(ok, interval * 1000));
    const r = await httpRequest(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, { method: "POST",
      body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:device_code", client_id, device_code: deviceCode }) })
      .catch((e) => ({ ok: false, data: { error: "network", error_description: e.message } }));
    if (r.ok) {
      const d = r.data;
      const me = await httpRequest(`${GRAPH}/me?$select=userPrincipalName`, { headers: { Authorization: `Bearer ${d.access_token}` } });
      const account = me.data?.userPrincipalName || "Microsoft account";
      saveCredentials("microsoft365", { tenant, client_id, access_token: d.access_token, refresh_token: d.refresh_token,
                                        expires: Date.now() + d.expires_in * 1000 },
                      { scope, meta: { account, connectedBy: userId, test: { ok: true, message: `Connected as ${account}`, at: new Date().toISOString() } } });
      Object.assign(flow, { status: "connected", account });
      return;
    }
    const error = r.data?.error;
    if (error === "authorization_pending") continue;
    if (error === "slow_down") {
      interval += 5;
      continue;
    }
    Object.assign(flow, { status: "error", error: r.data?.error_description || error || "unknown error" });
    return;
  }
  if (flow.status === "waiting") flow.status = "expired";
}

// Cached per connection: users with personal Microsoft 365 connections may belong to different tenants.
const siteIds = new Map();
const sharePointHosts = new Map();
async function siteId(site) {
  // site = its name ("marketing"), its URL (https://contoso.sharepoint.com/sites/marketing) or "contoso.sharepoint.com:/sites/marketing"
  const connection = getCredentials("microsoft365")?.[SCOPE] || "";
  let text = site.trim().replace(/\/$/, "");
  if (/^[^./:]+$/.test(text)) {
    if (!sharePointHosts.has(connection)) {
      const root = ensureOk(await graph({ path: "/sites/root", query: { $select: "siteCollection" } }), "SharePoint");
      sharePointHosts.set(connection, root.siteCollection.hostname);
    }
    text = `${sharePointHosts.get(connection)}/sites/${text}`;
  }
  const m = /^(?:https:\/\/)?([^/:]+)(?::)?(\/.*)?$/.exec(text);
  if (!m) throw new Error("Invalid site: use its name (marketing) or its URL (https://contoso.sharepoint.com/sites/marketing)");
  const key = `${connection}|${m[1]}:${m[2] || ""}`;
  if (!siteIds.has(key)) {
    const d = ensureOk(await graph({ path: `/sites/${m[1]}${m[2] ? `:${m[2]}` : ""}`, query: { $select: "id" } }), "SharePoint");
    siteIds.set(key, d.id);
  }
  return siteIds.get(key);
}

const itemPath = (p) => encodeURI(p.replace(/^\/+|\/+$/g, ""));
const SITE = z.string().describe("SharePoint site: its name (e.g. marketing) or its URL (https://contoso.sharepoint.com/sites/marketing)");

const microsoft365 = {
  id: "microsoft365",
  name: "Microsoft 365",
  description: "Outlook mail, SharePoint, OneDrive and Teams",
  category: "productivity",
  website: "https://www.microsoft365.com",
  docs: "https://learn.microsoft.com/graph/api/overview",
  logo: { file: "microsoft365.svg" },
  type: "device",
  help: "Click “Connect with Microsoft”, open the link and enter the code. Sign in with your work account and accept the "
    + "permissions (mail, SharePoint/OneDrive and Teams chats). No app registration is needed.",
  fields: [
    { id: "tenant", label: "Tenant (advanced)", default: "organizations", optional: true,
      help: "Leave “organizations” or enter your tenant ID." },
    { id: "client_id", label: "Application ID (advanced)", default: MICROSOFT_CLIENT, optional: true,
      help: "Defaults to Microsoft's public client. If you register your own Entra ID app (with “Allow public client flows”), enter its ID here." },
  ],
  oauthFields: [],
  ready: (cred) => Boolean(cred?.refresh_token),
  async test() {
    const d = ensureOk(await graph({ path: "/me", query: { $select: "displayName,userPrincipalName" } }), "Microsoft");
    return { ok: true, message: `Connected as ${d.userPrincipalName}`, account: d.userPrincipalName };
  },
  request: graph,
  tools: [
    { ...requestTool("m365", "Microsoft Graph (Outlook, SharePoint, Teams)", GRAPH,
      "Examples: GET /me/messages, GET /me/mailFolders, POST /me/sendMail, GET /sites/{id}/drive/root/children, POST /chats/{id}/messages."),
      run: (a) => graph(a).then((r) => ensureOk(r, "Microsoft Graph")) },
    { name: "outlook_search_mail", title: "Outlook: search mail", annotations: { readOnlyHint: true },
      description: "Searches the mailbox (all folders or one). Returns id, subject, sender, date, whether it has attachments and a preview.",
      schema: {
        search: z.string().optional().describe("Text to search (KQL syntax, e.g. 'invoice from:aws')"),
        filter: z.string().optional().describe("OData filter, e.g. \"receivedDateTime ge 2026-10-01T00:00:00Z and hasAttachments eq true\""),
        folder: z.string().optional().describe("Folder: inbox, sentitems, deleteditems, archive or a folder id"),
        max: z.number().int().min(1).max(100).default(25),
      },
      async run({ search, filter, folder, max }) {
        const query = { $top: max, $select: "id,subject,from,toRecipients,receivedDateTime,hasAttachments,isRead,categories,bodyPreview" };
        if (search) query.$search = `"${search.replace(/"/g, "'")}"`;
        else query.$orderby = "receivedDateTime desc";
        if (filter) query.$filter = filter;
        const route = folder ? `/me/mailFolders/${encodeURIComponent(folder)}/messages` : "/me/messages";
        return ensureOk(await graph({ path: route, query }), "Outlook").value;
      } },
    { name: "outlook_read_mail", title: "Outlook: read a message", annotations: { readOnlyHint: true },
      description: "Returns the full message (body as text) and its list of attachments.",
      schema: { id: z.string().describe("Message id") },
      async run({ id }) {
        const m = ensureOk(await graph({ path: `/me/messages/${encodeURIComponent(id)}`, headers: { Prefer: 'outlook.body-content-type="text"' },
          query: { $select: "subject,from,toRecipients,ccRecipients,receivedDateTime,body,hasAttachments,categories,webLink" } }), "Outlook");
        if (m.hasAttachments) {
          m.attachments = ensureOk(await graph({ path: `/me/messages/${encodeURIComponent(id)}/attachments`,
            query: { $select: "id,name,contentType,size,isInline" } }), "Outlook").value;
        }
        return m;
      } },
    { name: "outlook_download_attachment", title: "Outlook: download an attachment", annotations: { readOnlyHint: true },
      description: "Saves an attachment on the Conector server (downloads folder) and returns the file path.",
      schema: { message_id: z.string(), attachment_id: z.string() },
      async run({ message_id, attachment_id }) {
        const a = ensureOk(await graph({ path: `/me/messages/${encodeURIComponent(message_id)}/attachments/${encodeURIComponent(attachment_id)}` }), "Outlook");
        if (!a.contentBytes) throw new Error("The attachment has no downloadable content (it may be an attached item, not a file)");
        return saveDownload(a.name, Buffer.from(a.contentBytes, "base64"));
      } },
    { name: "outlook_send_mail", title: "Outlook: send a message", annotations: { destructiveHint: false, openWorldHint: true },
      description: "Sends an e-mail from the connected account.",
      schema: {
        to: z.array(z.string()).min(1), subject: z.string(), body: z.string().describe("Body as HTML or text"),
        cc: z.array(z.string()).optional(), html: z.boolean().default(true),
      },
      async run({ to, subject, body, cc, html }) {
        const addresses = (l) => (l || []).map((x) => ({ emailAddress: { address: x } }));
        ensureOk(await graph({ method: "POST", path: "/me/sendMail", body: { message: { subject,
          body: { contentType: html ? "HTML" : "Text", content: body }, toRecipients: addresses(to), ccRecipients: addresses(cc) }, saveToSentItems: true } }), "Outlook");
        return `Message sent to ${to.join(", ")}`;
      } },
    { name: "sharepoint_list", title: "SharePoint: list a folder", annotations: { readOnlyHint: true },
      description: "Lists the files and folders of a site's document library.",
      schema: { site: SITE, folder: z.string().default("").describe("Path inside the library, e.g. Finance/Invoices/2026") },
      async run({ site, folder }) {
        const id = await siteId(site);
        const route = folder ? `/sites/${id}/drive/root:/${itemPath(folder)}:/children` : `/sites/${id}/drive/root/children`;
        return ensureOk(await graph({ path: route, query: { $select: "id,name,size,lastModifiedDateTime,folder,file,webUrl", $top: 999 } }), "SharePoint").value
          .map((i) => ({ name: i.name, type: i.folder ? "folder" : "file", size: i.size, modified: i.lastModifiedDateTime, url: i.webUrl }));
      } },
    { name: "sharepoint_download", title: "SharePoint: download a file", annotations: { readOnlyHint: true },
      description: "Downloads a SharePoint file to the Conector server and returns its local path.",
      schema: { site: SITE, path: z.string().describe("File path inside the library, e.g. Finance/Budget/plan.xlsx") },
      async run({ site, path: filePath }) {
        const id = await siteId(site);
        const token = await microsoftToken();
        const r = await fetch(buildUrl(GRAPH, `/sites/${id}/drive/root:/${itemPath(filePath)}:/content`), {
          headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(120_000) });
        if (!r.ok) throw new Error(`SharePoint responded ${r.status}`);
        return saveDownload(path.basename(filePath), Buffer.from(await r.arrayBuffer()));
      } },
    { name: "sharepoint_upload", title: "SharePoint: upload a file", annotations: { destructiveHint: true },
      description: "Uploads a file from the Conector server to a SharePoint folder. Doesn't overwrite unless told to.",
      schema: { site: SITE, folder: z.string(), local_file: z.string().describe("Absolute path of the file on the Conector server"),
                name: z.string().optional().describe("Name in SharePoint (defaults to the file's name)"), overwrite: z.boolean().default(false) },
      async run({ site, folder, local_file, name, overwrite }) {
        const data = fs.readFileSync(local_file);
        if (data.length > 4 * 1024 * 1024) throw new Error("Files over 4 MB: use m365_request with an upload session (createUploadSession)");
        const id = await siteId(site);
        const token = await microsoftToken();
        const target = `${itemPath(folder)}/${encodeURIComponent(name || path.basename(local_file))}`;
        const r = await httpRequest(buildUrl(GRAPH, `/sites/${id}/drive/root:/${target}:/content`,
          { "@microsoft.graph.conflictBehavior": overwrite ? "replace" : "fail" }), {
          method: "PUT", body: data, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/octet-stream" } });
        const d = ensureOk(r, "SharePoint");
        return { uploaded: d.name, size: d.size, url: d.webUrl };
      } },
    { name: "teams_list_chats", title: "Teams: list chats", annotations: { readOnlyHint: true },
      description: "Lists your Teams chats (id, topic, type).",
      schema: { max: z.number().int().min(1).max(50).default(50) },
      async run({ max }) {
        return ensureOk(await graph({ path: "/me/chats", query: { $top: max, $select: "id,topic,chatType,lastUpdatedDateTime" } }), "Teams").value;
      } },
    { name: "teams_send_message", title: "Teams: send a chat message", annotations: { openWorldHint: true },
      description: "Posts a message (HTML or text) to a Teams chat.",
      schema: { chat_id: z.string(), message: z.string(), html: z.boolean().default(true) },
      async run({ chat_id, message, html }) {
        const d = ensureOk(await graph({ method: "POST", path: `/chats/${encodeURIComponent(chat_id)}/messages`,
          body: { body: { contentType: html ? "html" : "text", content: message } } }), "Teams");
        return { sent: true, id: d.id };
      } },
  ],
};

// ---------------------------------------------------------------- key-based apps with extra tools

const trello = defineConnector({
  id: "trello", name: "Trello", description: "Boards, lists and cards", category: "projects",
  website: "https://trello.com", docs: "https://developer.atlassian.com/cloud/trello/rest/", logo: { simpleIcons: "trello" },
  baseUrl: "https://api.trello.com/1",
  auth: [{ type: "query", name: "key", field: "key" }, { type: "query", name: "token" }],
  fields: [{ id: "key", label: "API key" }, { id: "token", label: "Token", secret: true }],
  keyUrl: "https://trello.com/power-ups/admin",
  help: "1) Open trello.com/power-ups/admin and create a Power-Up (any name, in your workspace). 2) Under “API key” generate the key. "
    + "3) Next to the key, click “Token”, authorize it and copy the token.",
  test: { path: "/members/me", query: { fields: "fullName,username" }, account: (d) => d.username },
  examples: "Examples: GET /members/me/boards, GET /lists/{id}/cards, POST /cards, PUT /cards/{id} (closed=true archives it).",
  tools: [
    { name: "trello_boards", title: "Trello: boards and lists", annotations: { readOnlyHint: true },
      description: "Open boards with their lists (ids included).", schema: {},
      run: async (_, request) => ensureOk(await request({ path: "/members/me/boards",
        query: { filter: "open", fields: "name,url", lists: "open", list_fields: "name" } }), "Trello") },
    { name: "trello_cards", title: "Trello: cards of a list", annotations: { readOnlyHint: true },
      description: "Cards of a list.", schema: { list_id: z.string() },
      run: async ({ list_id }, request) => ensureOk(await request({ path: `/lists/${encodeURIComponent(list_id)}/cards`,
        query: { fields: "name,desc,due,labels,shortUrl,dateLastActivity" } }), "Trello") },
  ],
});

const holded = defineConnector({
  id: "holded", name: "Holded", description: "Invoices, purchases, payments and contacts (API v2)", category: "finance",
  website: "https://www.holded.com", docs: "https://developers.holded.com", logo: { favicon: "https://www.holded.com" },
  baseUrl: "https://api.holded.com/api/v2",
  auth: { type: "bearer" },
  fields: [{ id: "token", label: "API token (pat_…)", secret: true }],
  help: "In Holded open “Settings” → “API” → “+ New token” and give it read and write access to invoices, purchases, payments and contacts.",
  test: { path: "/invoices", query: { limit: 1 }, message: "Token is valid (invoices are accessible)" },
  examples: "Examples: GET /invoices, GET /purchases, GET /payments, GET /contacts/{id}, POST /purchases, POST /purchases/{id}/approve.",
  tools: [
    { name: "holded_invoices", title: "Holded: sales invoices", annotations: { readOnlyHint: true },
      description: "Lists sales invoices (number, customer, date, due date, total, status, amount due).",
      schema: { limit: z.number().int().min(1).max(100).default(50), cursor: z.string().optional() },
      run: async ({ limit, cursor }, request) => ensureOk(await request({ path: "/invoices", query: { limit, cursor } }), "Holded") },
    { name: "holded_purchases", title: "Holded: purchases and expenses", annotations: { readOnlyHint: true },
      description: "Lists purchase invoices (number, supplier, date, total, status, draft).",
      schema: { limit: z.number().int().min(1).max(100).default(50), cursor: z.string().optional() },
      run: async ({ limit, cursor }, request) => ensureOk(await request({ path: "/purchases", query: { limit, cursor } }), "Holded") },
  ],
});

// GitHub in one click (an OAuth app registered once by the admin; its tokens don't expire) or with a personal token.
const github = defineConnector({
  id: "github", name: "GitHub", description: "Repositories, issues and pull requests", category: "developer",
  website: "https://github.com", docs: "https://docs.github.com/rest", logo: { simpleIcons: "github" },
  baseUrl: "https://api.github.com",
  headers: { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
  auth: { type: "bearer" },
  fields: [{ id: "token", label: "Personal access token", secret: true }],
  keyUrl: "https://github.com/settings/personal-access-tokens/new",
  help: "1) In GitHub open “Settings” → “Developer settings” → “Fine-grained tokens” and click “Generate new token”. 2) Choose the "
    + "repositories and permissions you need (e.g. Contents, Issues and Pull requests, read and write). 3) Copy the token.",
  oauth: { scopes: ["repo", "read:org", "read:user", "user:email"], provider: { name: "GitHub", key: "github", redirect: "localhost",
    authorizeUrl: "https://github.com/login/oauth/authorize", tokenUrl: "https://github.com/login/oauth/access_token",
    help: "1) In GitHub open “Settings” → “Developer settings” → “OAuth Apps” → “New OAuth App” (or the same path in your "
      + "organization's settings). 2) Name it “Conector”, set “Homepage URL” to your Conector URL and “Authorization callback URL” "
      + "to the redirect URI shown below; click “Register application”. 3) Copy the “Client ID”, click “Generate a new client "
      + "secret” and copy the secret. If the organization restricts OAuth apps, an owner has to approve it." } },
  test: { path: "/user", account: (d) => d.login },
  examples: "Examples: GET /user/repos, GET /repos/{owner}/{repo}/issues, POST /repos/{owner}/{repo}/issues.",
});

const ahrefs = defineConnector({
  id: "ahrefs", name: "Ahrefs", description: "SEO: backlinks, keywords and site audits (API v3)", category: "marketing",
  website: "https://ahrefs.com", docs: "https://docs.ahrefs.com", logo: { favicon: "https://ahrefs.com" },
  baseUrl: "https://api.ahrefs.com/v3",
  auth: { type: "bearer" },
  fields: [{ id: "token", label: "API v3 key", secret: true }],
  help: "In Ahrefs open “Account settings” → “API keys” and create an API v3 key (owners and admins only). Note: “MCP keys” don't "
    + "work here — Ahrefs doesn't allow using them through gateways; add Ahrefs' own MCP server to your agent instead.",
  test: { path: "/subscription-info/limits-and-usage", message: "API key is valid" },
  examples: "Examples: GET /site-explorer/domain-rating?target=example.com&date=2026-10-01, GET /subscription-info/limits-and-usage.",
});

const cloudflare = defineConnector({
  id: "cloudflare", name: "Cloudflare", description: "DNS, zones, WAF and more", category: "developer",
  website: "https://www.cloudflare.com", docs: "https://developers.cloudflare.com/api/", logo: { simpleIcons: "cloudflare" },
  baseUrl: "https://api.cloudflare.com/client/v4",
  auth: { type: "bearer" },
  fields: [{ id: "token", label: "API token", secret: true }],
  keyUrl: "https://dash.cloudflare.com/profile/api-tokens",
  help: "Open dash.cloudflare.com/profile/api-tokens → “Create Token” with the permissions you need (e.g. read zones and DNS).",
  test: { path: "/user/tokens/verify", message: (d) => `Token is ${d?.result?.status || "valid"}` },
  examples: "Examples: GET /zones, GET /zones/{id}/dns_records, POST /zones/{id}/dns_records.",
});

const higgsfield = defineConnector({
  id: "higgsfield", name: "Higgsfield", description: "AI image and video generation", category: "ai",
  website: "https://higgsfield.ai", docs: "https://docs.higgsfield.ai", logo: { favicon: "https://higgsfield.ai" },
  baseUrl: "https://platform.higgsfield.ai",
  auth: { type: "custom", apply: (c) => ({ headers: { Authorization: `Key ${c.key_id}:${c.secret}` } }) },
  fields: [{ id: "key_id", label: "Key ID" }, { id: "secret", label: "Secret", secret: true }],
  help: "In Higgsfield Cloud open “API keys” and create a key: you get a key ID and a secret.",
  // There is no "who am I" endpoint: a status query for a request that doesn't exist answers 404 with valid credentials.
  test: { path: "/requests/00000000-0000-0000-0000-000000000000/status", acceptStatus: [404], message: "Credentials accepted",
          validate: (_d, r) => {
            if (r.status === 401 || r.status === 403) throw new Error("Higgsfield rejected the credentials");
          } },
  examples: "See https://docs.higgsfield.ai for the models; GET /requests/{id}/status checks a generation's status.",
});

// ---------------------------------------------------------------- Odoo (JSON-RPC)

async function odooRpc(cred, service, method, args) {
  const r = await httpRequest(buildUrl(cred.url, "/jsonrpc"), { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", method: "call", params: { service, method, args }, id: Date.now() }) });
  if (!r.ok) throw new Error(`Odoo responded ${r.status}`);
  if (r.data?.error) throw new Error(`Odoo: ${r.data.error.data?.message || r.data.error.message}`);
  return r.data.result;
}

const odooUids = new Map();
async function odoo(model, method, args = [], kwargs = {}) {
  const cred = getCredentials("odoo");
  if (!cred) throw new Error("Odoo is not connected");
  const key = `${cred[SCOPE]}:${cred.url}:${cred.username}`;
  if (!odooUids.has(key)) odooUids.set(key, await odooRpc(cred, "common", "authenticate", [cred.database, cred.username, cred.api_key, {}]));
  const uid = odooUids.get(key);
  if (!uid) {
    odooUids.delete(key);
    throw new Error("Odoo: wrong user or API key");
  }
  return odooRpc(cred, "object", "execute_kw", [cred.database, uid, cred.api_key, model, method, args, kwargs]);
}

const odooConnector = {
  id: "odoo", name: "Odoo", description: "ERP: contacts, sales, invoices and more (JSON-RPC)", type: "key", category: "finance",
  website: "https://www.odoo.com", docs: "https://www.odoo.com/documentation/18.0/developer/reference/external_api.html",
  logo: { favicon: "https://www.odoo.com" },
  help: "You need your Odoo URL, the database name, your user (e-mail) and an API key (Odoo → My profile → Account security → "
    + "“New API key”).",
  fields: [{ id: "url", label: "URL (https://yourcompany.odoo.com)", format: "url" }, { id: "database", label: "Database" },
           { id: "username", label: "User (e-mail)" }, { id: "api_key", label: "API key", secret: true }],
  oauthFields: [],
  ready: (cred) => Boolean(cred?.url && cred?.database && cred?.username && cred?.api_key),
  async test() {
    const cred = getCredentials("odoo");
    const uid = await odooRpc(cred, "common", "authenticate", [cred.database, cred.username, cred.api_key, {}]);
    if (!uid) throw new Error("Wrong user, database or API key");
    return { ok: true, message: `Connected as ${cred.username} (uid ${uid})`, account: cred.username };
  },
  request: async ({ body }) => ({ ok: true, status: 200, data: await odoo(body.model, body.method, body.args, body.kwargs) }),
  tools: [
    { name: "odoo_search_read", title: "Odoo: search and read records", annotations: { readOnlyHint: true },
      description: "search_read on any model (e.g. res.partner, account.move, sale.order).",
      schema: { model: z.string(), domain: z.array(z.any()).default([]).describe("Odoo domain, e.g. [[\"is_company\",\"=\",true]]"),
                fields: z.array(z.string()).default([]), limit: z.number().int().min(1).max(500).default(50) },
      run: ({ model, domain, fields, limit }) => odoo(model, "search_read", [domain], { fields, limit }) },
    { name: "odoo_execute", title: "Odoo: call a method", annotations: { destructiveHint: true },
      description: "Calls any method of a model (create, write, unlink, action_post…).",
      schema: { model: z.string(), method: z.string(), args: z.array(z.any()).default([]), kwargs: z.record(z.string(), z.any()).default({}) },
      run: ({ model, method, args, kwargs }) => odoo(model, method, args, kwargs) },
  ],
};

// ---------------------------------------------------------------- registry

const BUILT_IN = [microsoft365, trello, holded, odooConnector, github, ahrefs, cloudflare, higgsfield];

// Built-ins come first: a catalog definition that repeats an id or a tool name is skipped.
const used = { ids: new Set(), tools: new Set() };
const accepted = [];
for (const c of [...BUILT_IN, ...CATALOG]) {
  const repeated = c.tools.find((t) => used.tools.has(t.name));
  if (used.ids.has(c.id) || repeated) {
    const reason = used.ids.has(c.id) ? `duplicate id "${c.id}"` : `duplicate tool "${repeated.name}"`;
    CATALOG_ERRORS.push(`${c.name}: ${reason}; skipped`);
    console.error(`Catalog: ${c.name}: ${reason}; skipped`);
    continue;
  }
  used.ids.add(c.id);
  for (const t of c.tools) used.tools.add(t.name);
  accepted.push(c);
}
export const CONNECTORS = accepted.sort((a, b) => a.name.localeCompare(b.name, "en"));
export { CATALOG_ERRORS };
const byId = new Map(CONNECTORS.map((c) => [c.id, c]));

export const connector = (id) => byId.get(id);

/** Connected for the current actor = credentials saved (personal or shared) and, for OAuth, the authorization completed. */
export function isConnected(id) {
  const c = byId.get(id);
  if (!c) return false;
  const cred = getCredentials(id);
  return Boolean(cred) && (c.ready ? c.ready(cred) : true);
}

/** Runs the connection test with the current actor's credentials and records the result on that connection. */
export async function testConnector(id) {
  const c = connector(id);
  const conn = connectionFor(id);
  try {
    const r = await c.test();
    if (conn) annotateConnection(id, conn.scope, { test: { ok: true, message: r.message, at: new Date().toISOString() }, ...(r.account ? { account: r.account } : {}) });
    return r;
  } catch (e) {
    if (conn) annotateConnection(id, conn.scope, { test: { ok: false, message: e.message, at: new Date().toISOString() } });
    return { ok: false, message: e.message };
  }
}

export { redactSecrets };
