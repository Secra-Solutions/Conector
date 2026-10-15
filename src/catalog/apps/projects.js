// Project and task management.
import { createHash } from "node:crypto";
import { z } from "zod";
import { ensureOk } from "../define.js";

// Jira and Confluence (Cloud) share the site and credentials: Atlassian email + API token without scopes.
const atlassianFields = [
  { id: "site", label: "Atlassian site", format: "subdomain",
    help: "The part before .atlassian.net: if you sign in at https://example.atlassian.net, enter “example”." },
  { id: "email", label: "Your Atlassian account email" },
  { id: "token", label: "API token", secret: true },
  { id: "cloudid", label: "Site ID", format: "segment", hidden: true },
];
// “Continue with Atlassian” (OAuth 2.0 3LO): a single app for Jira and Confluence. With OAuth the API goes through
// api.atlassian.com with the site ID (cloudid), which is looked up when authorizing, from the site entered.
const ATLASSIAN = {
  name: "Atlassian", key: "atlassian",
  authorizeUrl: "https://auth.atlassian.com/authorize", tokenUrl: "https://auth.atlassian.com/oauth/token",
  extraParams: { audience: "api.atlassian.com", prompt: "consent" }, json: true, redirect: "localhost",
  async after(token, cred, httpRequest) {
    const r = await httpRequest("https://api.atlassian.com/oauth/token/accessible-resources",
                           { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } });
    const sites = Array.isArray(r.data) ? r.data : [];
    const site = sites.find((s) => s.url === `https://${cred.site}.atlassian.net`);
    if (!site) {
      throw new Error(`Atlassian: the authorized account has no access to ${cred.site}.atlassian.net`
        + (sites.length ? ` (it does have access to ${sites.map((s) => s.url.replace("https://", "")).join(", ")})` : ""));
    }
    return { cloudid: site.id };
  },
  help: "1) Go to developer.atlassian.com/console/myapps with your Atlassian account and click “Create” → “OAuth 2.0 integration”; "
    + "name it “Conector”. 2) Under “Permissions” add the Jira API and the Confluence API and select the permissions (scopes) shown "
    + "below. 3) Under “Authorization” paste the redirect URI shown below as the “Callback URL”. 4) Under “Settings” copy the "
    + "“Client ID” and the “Secret”. If other people will connect with their own account, turn on sharing under “Distribution”.",
};
const JIRA_SCOPES = ["read:jira-work", "write:jira-work", "read:jira-user", "read:board-scope:jira-software", "read:project:jira",
  "read:sprint:jira-software", "offline_access"];
const CONFLUENCE_SCOPES = ["read:confluence-content.all", "write:confluence-content", "read:confluence-space.summary",
  "search:confluence", "read:confluence-user", "read:page:confluence", "write:page:confluence", "read:space:confluence",
  "read:comment:confluence", "write:comment:confluence", "offline_access"];
const atlassianHelp = (product) => "1) At id.atlassian.com/manage-profile/security/api-tokens click “Create API token” "
  + "(the regular one, without scopes: scoped tokens do not work with the site address). 2) Give it a name and an expiration "
  + "(one year at most) and copy the token: it is shown only once. 3) Enter the site, your Atlassian account email and the token here. "
  + `It will have the same permissions as your user in ${product}.`;

// Plain text → ADF document, the format that Jira API v3 requires for descriptions and comments.
const adfLines = (p) => p.split("\n")
  .flatMap((l, i) => [...(i ? [{ type: "hardBreak" }] : []), ...(l ? [{ type: "text", text: l }] : [])]);
const adf = (text) => ({ type: "doc", version: 1,
  content: text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean).map((p) => ({ type: "paragraph", content: adfLines(p) })) });
const stripHighlight = (t) => (typeof t === "string" ? t.replace(/@@@(end)?hl@@@/g, "") : t);

export default [
  {
    id: "jira", name: "Jira", category: "projects", description: "Jira Cloud issues, projects, boards and sprints",
    website: "https://www.atlassian.com/software/jira", docs: "https://developer.atlassian.com/cloud/jira/platform/rest/v3/intro/",
    logo: { simpleIcons: "jira" },
    baseUrl: "https://{site}.atlassian.net",
    auth: { type: "basic", usernameField: "email", passwordField: "token" },
    fields: atlassianFields,
    oauth: { provider: ATLASSIAN, scopes: JIRA_SCOPES, fields: ["site"], baseUrl: "https://api.atlassian.com/ex/jira/{cloudid}" },
    keyUrl: "https://id.atlassian.com/manage-profile/security/api-tokens",
    help: atlassianHelp("Jira"),
    test: { path: "/rest/api/3/myself", account: (d) => d.emailAddress || d.displayName },
    examples: "Examples: POST /rest/api/3/search/jql {\"jql\": \"project = WEB AND statusCategory != Done\", "
      + "\"fields\": [\"summary\", \"status\"]}, GET /rest/api/3/issue/{key}, PUT /rest/api/3/issue/{key} {\"fields\": {…}}, "
      + "GET /rest/api/3/issue/{key}/transitions, POST /rest/api/3/issue/{key}/transitions {\"transition\": {\"id\": \"…\"}}, "
      + "POST /rest/api/3/issue/{key}/comment (ADF body), GET /rest/api/3/project/search, GET /rest/agile/1.0/board, "
      + "GET /rest/agile/1.0/board/{id}/sprint?state=active, GET /rest/agile/1.0/sprint/{id}/issue.",
    tools: [
      { name: "jira_search", title: "Jira: search issues (JQL)", annotations: { readOnlyHint: true },
        description: "Searches issues with JQL (for example project = WEB AND statusCategory != Done ORDER BY updated DESC, "
          + "or assignee = currentUser()). Returns key, summary, status, type, priority, assignee and last update; "
          + "“next” is used to request the next page.",
        schema: { jql: z.string().describe("JQL query with at least one condition (ORDER BY alone is not enough)"),
                   max: z.number().int().min(1).max(100).default(25),
                   next: z.string().optional().describe("“next” value returned by the previous search") },
        async run({ jql, max, next }, p) {
          const d = ensureOk(await p({ method: "POST", path: "/rest/api/3/search/jql", body: { jql, maxResults: max, nextPageToken: next,
            fields: ["summary", "status", "issuetype", "priority", "assignee", "updated"] } }), "Jira");
          return { issues: (d.issues || []).map(({ key, fields: f = {} }) => ({ key: key, summary: f.summary, status: f.status?.name,
            type: f.issuetype?.name, priority: f.priority?.name, assignee: f.assignee?.displayName || null, updated: f.updated })),
          next: d.nextPageToken || null };
        } },
      { name: "jira_create_issue", title: "Jira: create issue", annotations: { destructiveHint: true, openWorldHint: true },
        description: "Creates an issue in a project. The description is plain text (converted to ADF). Returns the created key.",
        schema: { project: z.string().describe("Project key, e.g. WEB"),
                   type: z.string().describe("Type as it is named in the project (e.g. Task, Bug, Story); "
                     + "if you do not know it: GET /rest/api/3/issue/createmeta/{project}/issuetypes"),
                   summary: z.string(),
                   description: z.string().optional().describe("Plain text; separate paragraphs with a blank line"),
                   fields: z.record(z.string(), z.any()).optional().describe("Other fields, e.g. {\"labels\": [\"web\"], "
                     + "\"priority\": {\"name\": \"High\"}, \"assignee\": {\"id\": \"…\"}}") },
        async run({ project, type, summary, description, fields }, p) {
          const d = ensureOk(await p({ method: "POST", path: "/rest/api/3/issue", body: { fields: { ...fields, project: { key: project },
            issuetype: { name: type }, summary: summary, ...(description ? { description: adf(description) } : {}) } } }), "Jira");
          return { key: d.key, id: d.id };
        } },
    ],
  },
  {
    id: "confluence", name: "Confluence", category: "projects", description: "Confluence Cloud spaces, pages, blogs and comments",
    website: "https://www.atlassian.com/software/confluence", docs: "https://developer.atlassian.com/cloud/confluence/rest/v2/intro/",
    logo: { simpleIcons: "confluence" },
    baseUrl: "https://{site}.atlassian.net/wiki",
    auth: { type: "basic", usernameField: "email", passwordField: "token" },
    fields: atlassianFields,
    oauth: { provider: ATLASSIAN, scopes: CONFLUENCE_SCOPES, fields: ["site"],
             baseUrl: "https://api.atlassian.com/ex/confluence/{cloudid}/wiki" },
    keyUrl: "https://id.atlassian.com/manage-profile/security/api-tokens",
    help: atlassianHelp("Confluence"),
    // With invalid credentials Confluence treats the request as anonymous: getting no error is not enough.
    test: { path: "/rest/api/user/current", account: (d) => d.email || d.displayName,
              validate: (d) => { if (d?.type === "anonymous") throw new Error("Confluence: the email or the token is not valid"); } },
    examples: "Examples: GET /api/v2/spaces, GET /api/v2/pages?space-id={id}&limit=25, GET /api/v2/pages/{id}?body-format=storage, "
      + "POST /api/v2/pages {\"spaceId\": \"…\", \"status\": \"current\", \"title\": \"…\", "
      + "\"body\": {\"representation\": \"storage\", \"value\": \"<p>…</p>\"}}, PUT /api/v2/pages/{id} (with version.number + 1), "
      + "GET /api/v2/pages/{id}/footer-comments, GET /rest/api/search?cql=….",
    tools: [
      { name: "confluence_search", title: "Confluence: search content (CQL)", annotations: { readOnlyHint: true },
        description: "Searches with CQL (for example type = page AND text ~ \"holidays\", or space = DEV AND title ~ \"API\" "
          + "ORDER BY lastmodified DESC). Returns id, type, title, space, excerpt, URL and last modification.",
        schema: { cql: z.string().describe("CQL query"), max: z.number().int().min(1).max(50).default(20) },
        async run({ cql, max }, p) {
          const d = ensureOk(await p({ path: "/rest/api/search", query: { cql, limit: max } }), "Confluence");
          return (d.results || []).map((r) => ({ id: r.content?.id, type: r.content?.type || r.entityType,
            title: stripHighlight(r.title || r.content?.title), space: r.resultGlobalContainer?.title, excerpt: stripHighlight(r.excerpt),
            url: r.url ? `${d._links?.base || ""}${r.url}` : null, modified: r.lastModified }));
        } },
    ],
  },
  {
    id: "asana", name: "Asana", category: "projects", description: "Tasks, projects, sections and comments",
    website: "https://asana.com", docs: "https://developers.asana.com/reference/rest-api-reference", logo: { simpleIcons: "asana" },
    baseUrl: "https://app.asana.com/api/1.0",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "Personal access token", secret: true }],
    oauth: { scopes: [], provider: { name: "Asana", key: "asana", redirect: "localhost",
      authorizeUrl: "https://app.asana.com/-/oauth_authorize", tokenUrl: "https://app.asana.com/-/oauth_token",
      help: "1) Open the Asana developer console (app.asana.com/0/my-apps) and click “Create new app”; name it “Conector”. "
        + "2) Under “OAuth” add the redirect URI shown below as the “Redirect URL” and, under “Permission scopes”, choose “Full "
        + "permissions”. 3) Copy the “Client ID” and the “Client secret”. Unless you distribute it, only the members of your "
        + "workspace can authorize it." } },
    keyUrl: "https://app.asana.com/0/my-apps",
    help: "1) Open the Asana developer console (app.asana.com/0/my-apps) and click “Create new token”. 2) Give it a name, accept the "
      + "API terms and click “Create token”. 3) Copy the token: it is shown only once. It has the same permissions as your user.",
    test: { path: "/users/me", account: (d) => d.data?.email || d.data?.name },
    examples: "Examples: GET /workspaces, GET /projects?workspace={gid}, "
      + "GET /tasks?project={gid}&opt_fields=name,completed,due_on,assignee.name, GET /tasks?assignee=me&workspace={gid}&completed_since=now, "
      + "POST /tasks {\"data\": {\"name\": \"…\", \"projects\": [\"{gid}\"]}}, PUT /tasks/{gid} {\"data\": {\"completed\": true}}, "
      + "POST /tasks/{gid}/stories {\"data\": {\"text\": \"…\"}}.",
  },
  {
    id: "clickup", name: "ClickUp", category: "projects", description: "Spaces, lists, tasks, comments and time tracking",
    website: "https://clickup.com", docs: "https://developer.clickup.com/docs", logo: { simpleIcons: "clickup" },
    baseUrl: "https://api.clickup.com/api/v2",
    auth: { type: "header", name: "Authorization" },
    fields: [{ id: "token", label: "Personal API token (pk_…)", secret: true }],
    // One click: ClickUp has no scopes (the Workspaces are chosen when authorizing), its token does not expire and its token
    // endpoint only asks for client_id, client_secret and code (as JSON or as a form). With OAuth the token is sent as “Bearer”.
    oauth: { scopes: [],
      provider: { name: "ClickUp", key: "clickup", redirect: "localhost",
        authorizeUrl: "https://app.clickup.com/api", tokenUrl: "https://api.clickup.com/api/v2/oauth/token",
        tokenBody: (c) => (c.code ? { client_id: c.client_id, client_secret: c.client_secret, code: c.code } : c),
        help: "1) In ClickUp click your avatar → “Settings” → “Apps” and, under “Create an App”, create an app named “Conector” "
          + "(only the owners and admins of the Workspace can do this). 2) In “Redirect URL(s)” paste the redirect URI "
          + "shown below and save. 3) Copy the “Client ID” and the “Client Secret”." },
      help: "When connecting, ClickUp asks you to choose the Workspaces that Conector can access." },
    keyUrl: "https://app.clickup.com/settings/apps",
    help: "1) In ClickUp click your avatar (top right) → “Settings”. 2) In the side menu open “Apps”. 3) Under “API Token” click "
      + "“Generate” and copy the token (it starts with pk_). It does not expire and has the same permissions as your user.",
    test: { path: "/user", account: (d) => d.user?.email || d.user?.username },
    examples: "Examples: GET /team (workspaces), GET /team/{team_id}/space, GET /space/{space_id}/folder, "
      + "GET /space/{space_id}/list, GET /list/{list_id}/task?include_closed=true, GET /team/{team_id}/task?assignees[]={user_id}, "
      + "POST /list/{list_id}/task {\"name\": \"…\"}, PUT /task/{task_id} {\"status\": \"…\"}, "
      + "POST /task/{task_id}/comment {\"comment_text\": \"…\"}, GET /team/{team_id}/time_entries.",
  },
  {
    id: "monday", name: "monday.com", category: "projects", description: "Boards, items, columns and updates (GraphQL)",
    website: "https://monday.com", docs: "https://developer.monday.com/api-reference/docs/basics", logo: { favicon: "https://monday.com" },
    baseUrl: "https://api.monday.com", graphql: { path: "/v2" },
    auth: { type: "header", name: "Authorization" },
    fields: [{ id: "token", label: "Personal API token", secret: true }],
    // monday accepts the token without “Bearer”, just like the personal one.
    oauth: { scopes: ["me:read", "boards:read", "boards:write", "workspaces:read", "users:read", "updates:read", "updates:write"],
      apply: (headers, token) => { headers.Authorization = token; },
      provider: { name: "monday.com", key: "monday", redirect: "localhost",
        authorizeUrl: "https://auth.monday.com/oauth2/authorize", tokenUrl: "https://auth.monday.com/oauth2/token",
        help: "1) In monday.com click your profile picture → “Developers” → “Create app” and name it “Conector”. 2) Under “OAuth” → "
          + "“Scopes” select the permissions shown below and under “Redirect URLs” add the redirect URI shown below. 3) Under "
          + "“Basic information” copy the “Client ID” and the “Client secret”. You do not need to publish it to use it with your account." } },
    help: "1) In monday.com click your profile picture (top right) → “Developers”: the Developer Center opens. 2) Go to "
      + "“API token” → “Show” and copy the token. Admins also have it under “Administration” → “Connections” → "
      + "“Personal API token”. It has the same permissions as your user.",
    test: { method: "POST", path: "/v2", body: { query: "{ me { name email account { name } } }" },
              account: (d) => [d.data?.me?.email, d.data?.me?.account?.name].filter(Boolean).join(" · ") },
    examples: "The API is GraphQL (POST /v2): use monday_graphql, e.g. { boards(limit: 10) { id name } }, "
      + "{ boards(ids: [123]) { items_page(limit: 50) { cursor items { id name column_values { id text } } } } }, "
      + "mutation { create_item(board_id: 123, item_name: \"…\") { id } }, mutation { create_update(item_id: 123, body: \"…\") { id } }. "
      + "File upload: POST /v2/file.",
  },
  {
    id: "linear", name: "Linear", category: "projects", description: "Issues, projects, cycles and teams (GraphQL)",
    website: "https://linear.app", docs: "https://linear.app/developers/graphql", logo: { simpleIcons: "linear" },
    baseUrl: "https://api.linear.app", graphql: { path: "/graphql" },
    auth: { type: "header", name: "Authorization" },
    fields: [{ id: "token", label: "Personal API key (lin_api_…)", secret: true }],
    oauth: { scopes: ["read", "write"], provider: { name: "Linear", key: "linear", scopeSeparator: ",", redirect: "localhost",
      authorizeUrl: "https://linear.app/oauth/authorize", tokenUrl: "https://api.linear.app/oauth/token",
      help: "1) In Linear go to “Settings” → “API” → “OAuth Applications” and click “Create new” (you must be an admin of the "
        + "workspace). 2) Name it “Conector”, set “Developer URL” to https://www.example.com and “Callback URLs” to the redirect URI "
        + "shown below. 3) Copy the “Client ID” and the “Client secret”." } },
    keyUrl: "https://linear.app/settings/account/security",
    help: "1) In Linear go to “Settings” → “Account” → “Security & access”. 2) Under “Personal API keys” click “New API key”, give it a name "
      + "and choose the permissions (read, write, create issues…) and, if you want, the teams it can access. 3) Copy the key "
      + "(it starts with lin_api_). If you are a member and do not see the option, an admin must allow it under “Administration” → “API”.",
    test: { method: "POST", path: "/graphql", body: { query: "{ viewer { name email organization { name } } }" },
              account: (d) => [d.data?.viewer?.email, d.data?.viewer?.organization?.name].filter(Boolean).join(" · ") },
    examples: "The API is GraphQL (POST /graphql): use linear_graphql, e.g. { teams { nodes { id key name } } }, "
      + "{ issues(first: 20, filter: { assignee: { isMe: { eq: true } } }) { nodes { identifier title url state { name } } } }, "
      + "mutation { issueCreate(input: { teamId: \"…\", title: \"…\", description: \"…\" }) { success issue { identifier url } } }.",
  },
  {
    id: "todoist", name: "Todoist", category: "projects", description: "Tasks, projects, sections, labels and comments",
    website: "https://www.todoist.com", docs: "https://developer.todoist.com/api/v1/", logo: { simpleIcons: "todoist" },
    baseUrl: "https://api.todoist.com/api/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API token", secret: true }],
    oauth: { scopes: ["data:read_write", "data:delete"], provider: { name: "Todoist", key: "todoist", scopeSeparator: ",",
      redirect: "localhost", authorizeUrl: "https://todoist.com/oauth/authorize", tokenUrl: "https://todoist.com/oauth/access_token",
      help: "1) Open the Todoist app console (developer.todoist.com/appconsole.html) and click “Create a new app”; "
        + "name it “Conector” and set “App service URL” to https://www.example.com. 2) In “OAuth redirect URL” paste the redirect URI "
        + "shown below and save. 3) Copy the “Client ID” and the “Client secret”." } },
    keyUrl: "https://app.todoist.com/app/settings/integrations/developer",
    help: "1) At todoist.com click your avatar (top left) → “Settings”. 2) Go to “Integrations” → “Developer” tab. "
      + "3) Click “Copy API token”.",
    test: { path: "/user", account: (d) => d.email || d.full_name },
    examples: "Examples: GET /projects, GET /tasks?project_id={id}, GET /tasks/filter?query=today | overdue, "
      + "POST /tasks {\"content\": \"…\", \"due_string\": \"tomorrow at 10\", \"due_lang\": \"en\"}, POST /tasks/{id}/close, "
      + "GET /comments?task_id={id}, POST /comments {\"task_id\": \"…\", \"content\": \"…\"}. Lists are paginated: next_cursor → ?cursor=.",
    tools: [
      { name: "todoist_tasks", title: "Todoist: tasks by filter", annotations: { readOnlyHint: true },
        description: "Active tasks that match a Todoist filter (today, overdue, 7 days, #Project, @label, p1, assigned to: me…, "
          + "combinable with & and |). Returns id, content, project, due date, priority (p1 = urgent) and labels.",
        schema: { filter: z.string().default("today | overdue"),
                   language: z.string().optional().describe("Language code of the filter if it is not English, e.g. de or fr"),
                   max: z.number().int().min(1).max(200).default(50) },
        async run({ filter, language, max }, p) {
          const d = ensureOk(await p({ path: "/tasks/filter", query: { query: filter, lang: language, limit: max } }), "Todoist");
          return { tasks: (d.results || []).map((t) => ({ id: t.id, content: t.content, project: t.project_id, due: t.due?.date ?? null,
            priority: `p${5 - t.priority}`, labels: t.labels })), has_more: Boolean(d.next_cursor) };
        } },
      { name: "todoist_add", title: "Todoist: add a task in natural language",
        annotations: { destructiveHint: true, openWorldHint: true },
        description: "Creates a task with Quick Add, as in the app: date, #project, @label, p1-p4 and // description in the text itself "
          + "(for example “Call the client tomorrow at 10 #Clients p2 @calls”). Dates are interpreted in the language of the account.",
        schema: { text: z.string(), note: z.string().optional().describe("Comment added to the task") },
        async run({ text, note }, p) {
          const body = { text: text, ...(note ? { note: note } : {}) };
          const t = ensureOk(await p({ method: "POST", path: "/tasks/quick", body: body }), "Todoist");
          return { id: t.id, content: t.content, project: t.project_id, due: t.due?.date ?? null, priority: `p${5 - t.priority}` };
        } },
    ],
  },
  {
    id: "shortcut", name: "Shortcut", category: "projects", description: "Stories, epics, iterations and workflows",
    website: "https://www.shortcut.com", docs: "https://developer.shortcut.com/api/rest/v3", logo: { simpleIcons: "shortcut" },
    baseUrl: "https://api.app.shortcut.com/api/v3",
    auth: { type: "header", name: "Shortcut-Token" },
    fields: [{ id: "token", label: "API token", secret: true }],
    keyUrl: "https://app.shortcut.com/settings/account/api-tokens",
    help: "1) In Shortcut open “Settings” → “Your Account” → “API Tokens” (app.shortcut.com/settings/account/api-tokens). 2) Enter a name "
      + "and click “Generate Token”. 3) Copy the token: it is shown only once. It has the same permissions as your user.",
    test: { path: "/member", account: (d) => [d.mention_name || d.name, d.workspace2?.url_slug].filter(Boolean).join(" · ") },
    examples: "Examples: GET /search/stories?query=owner:{mention_name} !is:done&page_size=25, GET /stories/{id}, "
      + "POST /stories {\"name\": \"…\", \"workflow_state_id\": …}, PUT /stories/{id}, POST /stories/{id}/comments {\"text\": \"…\"}, "
      + "GET /workflows, GET /epics, GET /iterations, GET /members.",
    tools: [
      { name: "shortcut_search", title: "Shortcut: search stories", annotations: { readOnlyHint: true },
        description: "Searches stories with Shortcut operators (owner:name, state:\"In Progress\", type:bug, is:done, label:…, epic:…, "
          + "team:…; ! or - to negate). Returns id, name, type, state (id), epic, whether it is completed, URL and last update.",
        schema: { query: z.string().min(1).describe("e.g. owner:username !is:done type:bug"),
                   max: z.number().int().min(1).max(250).default(25) },
        async run({ query, max }, p) {
          const d = ensureOk(await p({ path: "/search/stories", query: { query: query, page_size: max, detail: "slim" } }), "Shortcut");
          return { total: d.total, stories: (d.data || []).map((s) => ({ id: s.id, name: s.name, type: s.story_type,
            state: s.workflow_state_id, epic: s.epic_id, completed: s.completed, url: s.app_url, updated: s.updated_at })),
          next: d.next ? `https://api.app.shortcut.com${d.next}` : null };
        } },
    ],
  },
  {
    id: "wrike", name: "Wrike", category: "projects", description: "Folders, projects, tasks, comments and hours",
    website: "https://www.wrike.com", docs: "https://developers.wrike.com/docs/overview", logo: { favicon: "https://www.wrike.com" },
    baseUrl: "https://{server}.wrike.com/api/v4",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "Permanent access token", secret: true },
             { id: "server", label: "Data center", default: "www",
               options: [["www", "www.wrike.com"], ["app-eu", "app-eu.wrike.com (EU)"], ["app-us2", "app-us2.wrike.com"]],
               help: "The one you see in the address bar when you use Wrike in the browser." },
             { id: "host", label: "API server", format: "domain", hidden: true, example: "www.wrike.com" }],
    // With OAuth, Wrike returns the server of the account in the token response (www.wrike.com, app-eu.wrike.com…).
    oauth: { scopes: [], baseUrl: "https://{host}/api/v4", provider: { name: "Wrike", key: "wrike", keep: ["host"],
      redirect: "localhost", authorizeUrl: "https://login.wrike.com/oauth2/authorize/v4", tokenUrl: "https://login.wrike.com/oauth2/token",
      help: "1) In Wrike click your profile picture → “Apps & Integrations” → “API” tab and create an app named “Conector”. "
        + "2) In “Redirect URI” paste the redirect URI shown below and save. 3) Copy the “Client ID” and the “Client secret”." } },
    help: "1) In Wrike click your profile picture → “Apps & Integrations” → “API” tab. 2) Create an app (a name is enough) "
      + "or open an existing one. 3) Under “Permanent access token” click “Create token” (or “Get token”), confirm with your password "
      + "and copy the token: it is shown only once. It has the same permissions as your user.",
    test: { path: "/contacts", query: { me: "true" }, account: (d) => d.data?.[0]?.primaryEmail },
    examples: "Examples: GET /folders, GET /folders/{id}/tasks?status=Active, GET /tasks?title=…&status=Active, GET /tasks/{id}, "
      + "POST /folders/{id}/tasks with a form {title, description}, PUT /tasks/{id}, POST /tasks/{id}/comments with a form {text}, "
      + "GET /timelogs. Write parameters go as a form or query; lists go as JSON (e.g. responsibles=[\"KUAAAA\"]).",
  },
  {
    id: "smartsheet", name: "Smartsheet", category: "projects", description: "Sheets, rows, reports and workspaces",
    website: "https://www.smartsheet.com", docs: "https://developers.smartsheet.com/api/smartsheet/introduction",
    logo: { favicon: "https://www.smartsheet.com" },
    baseUrl: "https://{server}/2.0",
    // Server of the authorization page for the region (app.smartsheet.com, .eu or .au); the API lives at api.smartsheet.*.
    derived: { app: (c) => String(c.server || "api.smartsheet.com").replace(/^api\./, "app.") },
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API access token", secret: true },
             { id: "server", label: "Region", default: "api.smartsheet.com",
               options: [["api.smartsheet.com", "Standard (smartsheet.com)"], ["api.smartsheet.eu", "European Union (smartsheet.eu)"],
                          ["api.smartsheet.au", "Australia (smartsheet.au)"]],
               help: "EU and Australia accounts have their own tokens." }],
    // One click: OAuth app registered in the region of the account. Access lasts one week and is renewed with the
    // refresh token. Smartsheet does not receive the secret but a SHA-256 “hash” of “secret|code” (or of “secret|refresh token”
    // when renewing), and its authorization only carries client_id, response_type, scope (space-separated) and state: the
    // redirect URL is the registered one and there is no PKCE.
    oauth: { scopes: ["READ_SHEETS", "WRITE_SHEETS", "CREATE_SHEETS", "READ_USERS", "READ_CONTACTS", "READ_SIGHTS"],
      fields: ["server"],
      provider: { name: "Smartsheet", key: "smartsheet", redirect: "https",
        authorizeUrl: "https://{app}/b/authorize", tokenUrl: "https://{server}/2.0/token",
        params: ({ client_id, response_type, scope, state }) => ({ client_id, response_type, scope, state }),
        tokenBody: (c, cred) => ({ grant_type: c.grant_type, client_id: c.client_id,
          ...(c.code ? { code: c.code } : { refresh_token: c.refresh_token }),
          hash: createHash("sha256").update(`${c.client_secret ?? cred.client_secret}|${c.code ?? c.refresh_token}`).digest("hex") }),
        help: "1) In Smartsheet, in the region of your account (smartsheet.com, smartsheet.eu or smartsheet.au), open your account → "
          + "“Developer Tools”, sign up as a developer (preferably with a company service account; Smartsheet may "
          + "deny it) and create a developer profile. 2) Click “Create New App”, name it “Conector”, fill in the "
          + "description, the app URL (https://www.example.com) and the contact, and in “App redirect URL” paste the redirect URI "
          + "shown below (Smartsheet requires HTTPS). 3) After saving it, copy the “Client ID” and the “Client secret”. When connecting, "
          + "choose the same region where you registered the app." } },
    help: "1) In Smartsheet click “Account” (your picture, bottom left) → “Personal Settings”. 2) Under “API Access” click "
      + "“Generate new access token” and give it a name. 3) Copy the token: it is shown only once. It requires a Business or Enterprise plan.",
    test: { path: "/users/me", account: (d) => d.email },
    examples: "Examples: GET /sheets, GET /sheets/{id}?pageSize=100, GET /sheets/{id}/columns, "
      + "POST /sheets/{id}/rows [{\"toBottom\": true, \"cells\": [{\"columnId\": …, \"value\": \"…\"}]}], PUT /sheets/{id}/rows, "
      + "GET /reports, GET /workspaces, GET /search?query=….",
  },
];
