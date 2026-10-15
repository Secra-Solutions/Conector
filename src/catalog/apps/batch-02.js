// Batch 02 of the catalog: browsers and web agents, workflows, page monitoring, connected devices and routes.
import crypto from "node:crypto";
import { z } from "zod";
import { USER_AGENT, httpRequest } from "../../http.js";
import { ensureOk } from "../define.js";

const LONG_TIMEOUT = 300_000; // ms: synchronous browser automations that can take minutes

const dropEmpty = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== ""));

// Number of items in a list that arrives as an array or inside an object (undefined if not recognized).
const count = (d, ...keys) => (Array.isArray(d) ? d : keys.map((k) => d?.[k]).find(Array.isArray))?.length;

// Inistate: the API key is sent as “fsk <key>”; if the user pastes it with the prefix, it is not duplicated.
const inistateKey = (c) => `fsk ${String(c.token || "").trim().replace(/^fsk\s+/i, "")}`;

// Spondyr replies with APIStatus “ERROR” (and a 400) when something fails.
const spondyr = (d) => {
  if (d?.APIStatus === "ERROR") throw new Error(`Spondyr: ${d.ErrorMessage || "error"}`);
};

// Wachete: the user ID and the API key are exchanged for a session token (1 h), which is kept in memory until it expires.
let wacheteToken = null;
async function getWacheteToken(c) {
  const fingerprint = crypto.createHash("sha256").update(JSON.stringify([c.user_id, c.token])).digest("hex");
  if (wacheteToken?.fingerprint === fingerprint && wacheteToken.expires > Date.now() + 60_000) return wacheteToken.token;
  const d = ensureOk(await httpRequest("https://api.wachete.com/thirdparty/v1/user/apilogin", { method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json", "User-Agent": USER_AGENT },
    body: JSON.stringify({ userId: String(c.user_id || "").trim(), apiKey: String(c.token || "").trim() }) }), "Wachete");
  if (!d?.token) throw new Error("Wachete: the authentication response does not include a token");
  wacheteToken = { fingerprint, token: d.token, expires: Date.now() + (Number(d.expiresInSec) || 3000) * 1000 };
  return d.token;
}

export default [
  {
    id: "hyperbrowser", name: "Hyperbrowser", category: "automation",
    description: "Cloud browsers: sessions, scraping and web agents",
    website: "https://www.hyperbrowser.ai", docs: "https://hyperbrowser.ai/docs", logo: { favicon: "https://www.hyperbrowser.ai" },
    baseUrl: "https://api.hyperbrowser.ai", timeout: LONG_TIMEOUT,
    auth: { type: "header", name: "x-api-key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) Sign up or log in at app.hyperbrowser.ai and copy your API key from the dashboard (the quickstart guide is at "
      + "app.hyperbrowser.ai/quickstart). 2) Each browser session, scrape, crawl or agent task uses credits from your plan (there is a "
      + "free plan with limited credits), so start with a few pages.",
    test: { path: "/api/sessions", query: { page: 1 },
              message: (d) => (d?.totalCount === undefined ? "API key is valid"
                : `API key is valid · registered sessions: ${d.totalCount}`) },
    examples: "Examples: GET /api/sessions?page=1, POST /api/scrape {\"url\": \"https://…\"} (then GET /api/scrape/{id}), "
      + "POST /api/web/search {\"query\": \"…\"}, POST /api/extract {\"urls\": [\"https://…\"], \"prompt\": \"…\"}, "
      + "POST /api/task/hyper-agent {\"task\": \"…\"} (then GET /api/task/hyper-agent/{id}), PUT /api/session/{id}/stop.",
  },
  {
    id: "inistate", name: "Inistate", category: "automation",
    description: "Modules, records and activities of your workflow apps",
    website: "https://inistate.com", docs: "https://community.inistate.com/t/how-to-use-inistate-api/437",
    logo: { favicon: "https://inistate.com" },
    baseUrl: "https://api.inistate.com", headers: (c) => (c.wsid ? { wsid: String(c.wsid).trim() } : {}),
    auth: { type: "custom", apply: (c) => ({ headers: { Authorization: inistateKey(c) } }) },
    fields: [{ id: "token", label: "API key", secret: true, example: "0123456789abcdef:0123456789abcdef0123456789abcdef" },
             { id: "wsid", label: "Workspace ID (wsid)", optional: true,
               help: "Returned by GET /api/workspace. If you leave it empty, you must pass the wsid header on every module call." }],
    help: "1) In your Inistate app open “Account” → “Integration”, generate a new API key and copy it; paste it without the “fsk” prefix, "
      + "which Conector adds. 2) Calls on modules and records need the workspace ID (wsid header): "
      + "get it with GET /api/workspace and save it here. 3) The key has the permissions of your user.",
    test: { path: "/api/workspace",
              message: (d) => { const n = count(d, "data", "workspaces");
                                return n === undefined ? "API key is valid" : `API key is valid · workspaces: ${n}`; } },
    examples: "Examples: GET /api/workspace (workspaces), GET /api/mcp/ (modules; needs wsid), "
      + "GET /api/mcp/{module}?tier=basic (fields and states), "
      + "POST /api/mcp/list {\"module\": \"…\", \"currentPage\": 0, \"pageSize\": 50}, "
      + "POST /api/mcp/entry {\"module\": \"…\", \"entryId\": 42}, "
      + "POST /api/mcp/activity {\"module\": \"…\", \"activity\": \"create\", \"input\": {…}}.",
  },
  {
    id: "maintainx", name: "MaintainX", category: "automation",
    description: "Work orders, assets, locations and spare parts",
    website: "https://www.getmaintainx.com", docs: "https://api.getmaintainx.com/v1/docs", logo: { favicon: "https://www.getmaintainx.com" },
    baseUrl: "https://api.getmaintainx.com/v1",
    headers: (c) => (c.organization ? { "x-organization-id": String(c.organization).trim() } : {}),
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true },
             { id: "organization", label: "Organization ID", optional: true,
               help: "Only if the key works for several organizations: the ID of the one you want to use (GET /organizations lists them)." }],
    help: "1) In MaintainX open “Settings” → “Organization Settings” → “Integrations” → “API Keys” → “+ New Key”. 2) Enter a "
      + "label, if “Key usage” appears choose “REST API”, click “Generate Key” and copy the key: it is shown only once. 3) If you work "
      + "with several organizations, turn on “Allow this token to be used on all my organizations” and fill in the organization ID. "
      + "API access depends on your plan.",
    test: { path: "/organizations", query: { limit: 1 }, account: (d) => d?.organizations?.[0]?.name },
    examples: "Examples: GET /workorders?limit=20, GET /workorders/{id}, POST /workorders {\"title\": \"…\", \"description\": \"…\", "
      + "\"priority\": \"MEDIUM\"}, PATCH /workorders/{id}, GET /assets, GET /locations, GET /parts, GET /users. Pagination uses "
      + "a cursor (nextCursor in each response).",
  },
  {
    id: "make", name: "Make", category: "automation",
    description: "Scenarios, executions, connections and data stores",
    website: "https://www.make.com", docs: "https://developers.make.com/api-documentation", logo: { simpleIcons: "make" },
    baseUrl: "https://{zone}/api/v2",
    auth: { type: "header", name: "Authorization", prefix: "Token " },
    fields: [{ id: "token", label: "API token", secret: true },
             { id: "zone", label: "Account zone", default: "eu1.make.com",
               options: [["eu1.make.com", "EU1"], ["eu2.make.com", "EU2"], ["us1.make.com", "US1"], ["us2.make.com", "US2"],
                          ["eu1.make.celonis.com", "Celonis EU1"], ["us1.make.celonis.com", "Celonis US1"]],
               help: "The one in the address of your Make dashboard (e.g. eu1.make.com). Calls fail with a different zone." }],
    help: "1) In Make click your avatar (bottom left) → “Profile” → “API” tab → “Add token”. 2) Enter a label and check "
      + "the permissions (scopes): organizations:read (used by the connection test), teams:read, scenarios:read and, to run "
      + "scenarios, scenarios:write and scenarios:run. Click “Save” and copy the token: it is not shown again. 3) Choose the zone "
      + "of your account here, the one in the address of your dashboard.",
    test: { path: "/users/me", account: (d) => d?.authUser?.email || d?.authUser?.name },
    examples: "To list scenarios without knowing the IDs, use make_scenarios. Examples: GET /users/me, GET /organizations, "
      + "GET /teams?organizationId={id}, GET /scenarios?teamId={id}, POST /scenarios/{id}/run, GET /scenarios/{id}/logs, "
      + "GET /connections?teamId={id}, GET /data-stores?teamId={id}. Each endpoint requires its scope on the token.",
    tools: [
      { name: "make_scenarios", title: "Make: scenarios", annotations: { readOnlyHint: true },
        description: "List the Make scenarios (most recent first) with their status, schedule and last edit: across all "
          + "your organizations, in one organization or in one team. Requires the organizations:read and scenarios:read permissions.",
        schema: { organization: z.number().int().optional().describe("Organization ID (GET /organizations); if omitted, all"),
                   team: z.number().int().optional().describe("Team ID (GET /teams?organizationId=…); replaces the previous one"),
                   only_active: z.boolean().default(false), search: z.string().optional().describe("Text the name must contain"),
                   max: z.number().int().min(1).max(200).default(50) },
        async run({ organization, team, only_active, search, max }, p) {
          const scopes = team ? [{ teamId: team }] : organization ? [{ organizationId: organization }]
            : (ensureOk(await p({ path: "/organizations" }), "Make").organizations || [])
              .map((o) => ({ organizationId: o.id, orgName: o.name }));
          const scenarios = [];
          for (const { orgName, ...filter } of scopes) {
            if (scenarios.length >= max) break;
            const d = ensureOk(await p({ path: "/scenarios", query: { ...filter, name: search, isActive: only_active ? true : undefined,
              "pg[limit]": max - scenarios.length, "pg[sortBy]": "lastEdit", "pg[sortDir]": "desc" } }), "Make");
            for (const s of d?.scenarios || []) {
              scenarios.push(dropEmpty({ id: s.id, name: s.name, team: s.teamId, organization: orgName, active: s.isActive,
                paused: s.isPaused || undefined, invalid: s.isinvalid || undefined, locked: s.islocked || undefined,
                scheduling: s.scheduling?.type, interval_s: s.scheduling?.interval, next_execution: s.nextExec,
                edited: s.lastEdit, incomplete_executions: s.dlqCount || undefined }));
            }
          }
          return scenarios;
        } },
    ],
  },
  {
    id: "manus", name: "Manus", category: "automation",
    description: "Manus AI agent tasks, projects and files",
    website: "https://manus.im", docs: "https://open.manus.ai/docs", logo: { favicon: "https://manus.im" },
    baseUrl: "https://api.manus.ai/v2",
    auth: { type: "header", name: "x-manus-api-key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://manus.im/app#settings/developers",
    help: "1) In Manus open manus.im/app#settings/developers and click “Create API Key”. 2) Name it and copy it: it is shown "
      + "only once (up to 50 keys per account). 3) Tasks you start through the API use credits from your Manus plan.",
    test: { path: "/user.me", account: (d) => d?.email || d?.name || d?.user_id },
    examples: "Paths use an RPC style (with a dot) and responses include “ok”. Examples: GET /user.me, GET /task.list?limit=20, "
      + "POST /task.create {\"message\": {\"content\": \"…\"}}, GET /task.detail?task_id=…, GET /task.listMessages?task_id=…, "
      + "GET /usage.availableCredits.",
  },
  {
    id: "neetoform", name: "NeetoForm", category: "productivity",
    description: "Forms, responses and team members",
    website: "https://www.neeto.com/neetoform", docs: "https://apidocs.neetoform.com/api/introduction",
    logo: { favicon: "https://www.neeto.com/neetoform" },
    baseUrl: "https://{subdomain}.neetoform.com/api/external/v2",
    auth: { type: "header", name: "X-Api-Key" },
    fields: [{ id: "subdomain", label: "Workspace subdomain", format: "subdomain", example: "example",
               help: "The part before .neetoform.com in the address of your workspace (the sample value “spinkart” does not work)." },
             { id: "token", label: "API key", secret: true }],
    help: "1) In NeetoForm open the “Admin panel” → “API keys” → “Add API key”. 2) Enter a name, leave the type as “General” (the "
      + "Zapier one is only for that integration), choose the expiration or “Never expires” and click “Save changes”. 3) Copy the key with the "
      + "copy icon. Each key works only for its own workspace.",
    test: { path: "/forms", query: { page_number: 1, page_size: 1 },
              message: (d) => `API key is valid · forms: ${d?.total_count ?? (d?.forms || []).length}` },
    examples: "Examples: GET /forms?page_number=1&page_size=30, POST /forms (creates a form), "
      + "GET /forms/{form_id}/submissions?page_number=1, GET /team-members.",
  },
  {
    id: "noloco", name: "Noloco", category: "automation",
    description: "Data of your Noloco app through its GraphQL API",
    website: "https://noloco.io", docs: "https://guides.noloco.io/api-documentation/api-overview", logo: { favicon: "https://noloco.io" },
    // The API does not accept a trailing slash (…/data/<app>/ returns 404): the “#” keeps Conector from adding one, because the fragment is not sent.
    baseUrl: "https://api.portals.noloco.io/data/{app}#",
    auth: { type: "bearer" },
    fields: [{ id: "app", label: "App name",
               help: "The part after /data/ in the API address of your app: https://api.portals.noloco.io/data/<name>." },
             { id: "token", label: "App API key", secret: true }],
    help: "1) In your Noloco app open “Settings” → “Integrations & API Keys” and copy the “App API key” (the “Account API key” does not work "
      + "for the data API). 2) The app name is the one in the API address; the GraphiQL explorer on that same screen "
      + "shows it. 3) The key has the permissions of the user who generated it and stops working if you deactivate that user.",
    test: { method: "POST", path: "/", body: { query: "{ usersCollection(first: 1) { edges { node { id } } } }" },
              message: "API key is valid" },
    graphql: { path: "/" },
    examples: "A single GraphQL address: use noloco_graphql (or POST / with {\"query\": \"…\"}). Each table is queried as "
      + "<table>Collection: { usersCollection(first: 20, where: { email: { equals: \"a@b.com\" } }) { edges { node { id email } } "
      + "pageInfo { hasNextPage } } }. Writes: mutation { create<Table>(field: \"value\") { id } }, "
      + "mutation { update<Table>(id: 17, field: \"value\") { id } }. The app's GraphiQL lists tables and fields.",
  },
  {
    id: "pneumatic", name: "Pneumatic", category: "automation",
    description: "Workflow templates, processes and tasks",
    website: "https://www.pneumatic.app", docs: "https://api.pneumatic.app/api/docs/", logo: { favicon: "https://www.pneumatic.app" },
    baseUrl: "https://api.pneumatic.app",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) Log in at my.pneumatic.app and open “Integrations” in the side menu. 2) Copy your key under “Your API Key”. 3) The key "
      + "has the permissions of your user; to manage the keys of other users you must be the account owner. It works only "
      + "for the cloud version (api.pneumatic.app), not for self-hosted installations.",
    test: { path: "/accounts/account", account: (d) => d?.name },
    examples: "Examples: GET /accounts/account, GET /accounts/users, GET /templates, POST /templates/{id}/run {\"name\": \"…\"} "
      + "(starts a process), GET /workflows, GET /workflows/{id}, GET /v2/tasks. "
      + "Full reference at https://api.pneumatic.app/api/docs/.",
  },
  {
    id: "printautopilot", name: "PrintAutopilot", category: "automation",
    description: "PDF delivery to remote printers through queues",
    website: "https://printautopilot.com", docs: "https://documenter.getpostman.com/view/1334461/TW6wJonb",
    logo: { favicon: "https://printautopilot.com" },
    baseUrl: "https://printautopilot.com/api",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API token", secret: true }],
    keyUrl: "https://printautopilot.com/user/api-tokens",
    help: "1) At printautopilot.com create an account, install the client (Windows or macOS) on the computer the printers are attached to and create a "
      + "queue by choosing a printer and paper size; the API token is generated at printautopilot.com/user/api-tokens. 2) Copy it: the "
      + "connection token of the print client is a different one and does not work. 3) The service is paid per document (the first 25 are "
      + "free). The connection test sends an empty document on purpose: with a valid token the service rejects it (400) "
      + "without creating anything.",
    test: { method: "POST", path: "/document/create", body: {}, acceptStatus: [400], message: "API token is valid" },
    examples: "There is only one endpoint for this token. Example: POST /document/create {\"fileName\": \"invoice.pdf\", \"base64\": "
      + "\"<base64 PDF>\"} (queues a PDF for printing and responds 202; billing is per document and the API does not check that the "
      + "base64 is valid). Without base64 it responds 400 “Base64 not set”. The client routes (GET /print-jobs, POST /printers) "
      + "use the connection token.",
  },
  {
    id: "processstreet", name: "Process Street", category: "automation",
    description: "Workflows, checklists, runs and comments",
    website: "https://www.process.st", docs: "https://public-api.process.st/api/v1.1/docs/index.html",
    logo: { favicon: "https://www.process.st" },
    baseUrl: "https://public-api.process.st/api/v1.1",
    auth: { type: "header", name: "X-API-Key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) You need to be an organization admin: in Process Street open the integrations page of the "
      + "organization manager. 2) Generate a new API key, name it and copy it. 3) It is available on all plans and has "
      + "the permissions of its creator.",
    test: { path: "/workflows", message: (d) => `API key is valid · workflows on the first page: ${(d?.workflows || []).length}` },
    examples: "Examples: GET /workflows, GET /workflows/{id}/form-fields, POST /workflow-runs {\"workflowId\": \"…\", \"name\": \"…\"} "
      + "(starts a run), GET /workflow-runs?workflowId=…&status=Active, GET /workflow-runs/{id}/tasks, "
      + "PUT /workflow-runs/{id}/tasks/{taskId} {\"status\": \"Completed\"}, GET /tasks?assigneeEmail=… (required).",
  },
  {
    id: "proxiedmail", name: "ProxiedMail", category: "communication",
    description: "Proxy email addresses and received emails",
    website: "https://proxiedmail.com", docs: "https://docs.proxiedmail.com/docs/category/http-endpoints",
    logo: { favicon: "https://proxiedmail.com" },
    baseUrl: "https://proxiedmail.com/api/v1",
    auth: { type: "header", name: "Token" },
    fields: [{ id: "token", label: "API token", secret: true }],
    keyUrl: "https://proxiedmail.com/en/settings",
    help: "1) Log in at proxiedmail.com and open “Settings” (proxiedmail.com/en/settings). 2) Copy your API token: it does not expire, "
      + "although it can be revoked. 3) The number of proxy addresses you can create depends on your plan.",
    test: { path: "/proxy-bindings",
              message: (d) => `Token is valid · proxy addresses in use: ${d?.meta?.usedProxyBindings ?? (d?.data || []).length}` },
    examples: "Responses follow JSON:API. Examples: GET /proxy-bindings, POST /proxy-bindings {\"data\": {\"type\": "
      + "\"proxy_bindings\", \"attributes\": {\"real_addresses\": [\"you@example.com\"], \"proxy_address\": \"alias@proxiedmail.com\", "
      + "\"is_browsable\": true}}}, PATCH /proxy-bindings/{id}, GET /received-emails/{id}.",
  },
  {
    id: "quintadb", name: "QuintaDB", category: "productivity",
    description: "No-code databases, forms and records",
    website: "https://quintadb.com", docs: "https://quintadb.com/api/index", logo: { favicon: "https://quintadb.com" },
    baseUrl: "https://quintadb.com",
    auth: { type: "query", name: "rest_api_key" },
    fields: [{ id: "token", label: "REST API key", secret: true }],
    keyUrl: "https://quintadb.com/rest_apis",
    help: "1) At quintadb.com open the “API” menu (top right) and go to “REST API” (quintadb.com/rest_apis). 2) Copy your "
      + "key (you can have several). 3) In the paths, APP_ID is the database, ENTITY_ID the form (the table) and the “dtypes” "
      + "are the records; the identifiers come from GET /apps.json and GET /apps/{app_id}/entities.json.",
    test: { path: "/apps.json",
              message: (d) => { const n = count(d, "apps");
                                return n === undefined ? "API key is valid" : `API key is valid · databases: ${n}`; } },
    examples: "Add .json to the paths. Examples: GET /apps.json, GET /apps/{app_id}/entities.json, "
      + "GET /apps/{app_id}/dtypes/entity/{entity_id}.json?per_page=100&page=1, GET /apps/{app_id}/dtypes/{id}.json, "
      + "POST /apps/{app_id}/dtypes.json {\"values\": {\"entity_id\": …, \"<field id>\": \"…\"}}, PUT /apps/{app_id}/dtypes/{id}.json.",
  },
  {
    id: "route4me", name: "Route4Me", category: "automation",
    description: "Delivery route planning and optimization",
    website: "https://route4me.com", docs: "https://integrate.route4me.com/docs/getting_started", logo: { favicon: "https://route4me.com" },
    baseUrl: "https://api.route4me.com",
    auth: { type: "query", name: "api_key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) In Route4Me open “Settings” → “Organization Settings” and, in the side menu, “Integrations” → “API Key”. 2) Click "
      + "“Copy” to copy the API key of the account. 3) Optimizing routes and geocoding addresses can use quota or incur "
      + "costs depending on your plan; the connection test only lists routes.",
    test: { path: "/api.v4/route.php", query: { limit: 1 }, message: "API key is valid" },
    examples: "Examples: GET /api.v4/route.php?limit=10&offset=0 (routes), GET /api.v4/route.php?route_id={id}, "
      + "GET /api.v4/address_book.php?limit=20, POST /api.v4/optimization_problem.php (creates and optimizes a route; uses quota).",
  },
  {
    id: "seam", name: "Seam", category: "automation",
    description: "Locks, thermostats and sensors: devices and codes",
    website: "https://www.seam.co", docs: "https://www.seam.co/docs", logo: { favicon: "https://www.seam.co" },
    baseUrl: "https://connect.getseam.com",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key (seam_…)", secret: true }],
    help: "1) In Seam Console (console.seam.co) choose the workspace with the selector at the top left. 2) Open "
      + "“API Keys” in the side menu, click the add button (top right), name it and copy the key (it starts with "
      + "seam_). 3) Each key belongs to a single workspace: the sandbox is for testing with virtual devices; for "
      + "real devices use a production workspace.",
    test: { path: "/workspaces/get",
              account: (d) => [d?.workspace?.name, d?.workspace?.is_sandbox ? "sandbox" : null].filter(Boolean).join(" · ") },
    examples: "Queries are GET requests with parameters and actions are POST requests with a JSON body. Examples: GET /workspaces/get, "
      + "GET /devices/list, GET /devices/get?device_id=…, GET /connected_accounts/list, GET /access_codes/list?device_id=…, "
      + "POST /locks/lock_door {\"device_id\": \"…\"}, POST /locks/unlock_door {\"device_id\": \"…\"}, "
      + "POST /access_codes/create {\"device_id\": \"…\", \"name\": \"…\", \"code\": \"1234\"}, GET /events/list?since=….",
  },
  {
    id: "sensibo", name: "Sensibo", category: "automation",
    description: "Smart air conditioners: status, sensors and schedules",
    website: "https://sensibo.com", docs: "https://support.sensibo.com/api/", logo: { favicon: "https://sensibo.com" },
    baseUrl: "https://home.sensibo.com/api/v2",
    auth: { type: "query", name: "apiKey" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://home.sensibo.com/me/api",
    help: "1) Log in with your Sensibo account at home.sensibo.com/me/api. 2) Create an API key (or copy the one you already have). 3) The "
      + "key gives access to all the devices in your account. The API with a personal key is free (with a request limit) and does "
      + "not require Sensibo Plus.",
    test: { path: "/users/me/pods", query: { fields: "id" }, message: (d) => `API key is valid · devices: ${(d?.result || []).length}` },
    examples: "Examples: GET /users/me/pods?fields=id,room, GET /pods/{id}/acStates?limit=5, POST /pods/{id}/acStates "
      + "{\"acState\": {\"on\": true, \"mode\": \"cool\", \"targetTemperature\": 22, \"temperatureUnit\": \"C\", \"fanLevel\": \"auto\"}}, "
      + "PATCH /pods/{id}/acStates/targetTemperature {\"newValue\": 23}, GET /pods/{id}/measurements, "
      + "GET /pods/{id}/historicalMeasurements?days=1.",
  },
  {
    id: "skyvern", name: "Skyvern", category: "automation",
    description: "AI browser automation: tasks, workflows and runs",
    website: "https://www.skyvern.com", docs: "https://www.skyvern.com/docs", logo: { favicon: "https://www.skyvern.com" },
    baseUrl: "https://api.skyvern.com",
    auth: { type: "header", name: "x-api-key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://app.skyvern.com/settings/api-keys",
    help: "1) Log in at app.skyvern.com and open “Settings” (app.skyvern.com/settings). 2) Copy your API key or create a new one. 3) "
      + "Tasks, workflows and browser sessions use credits from your Skyvern Cloud plan.",
    test: { path: "/v1/agents", query: { page_size: 1 }, message: "API key is valid" },
    examples: "Examples: POST /v1/run/tasks {\"prompt\": \"…\", \"url\": \"https://…\"} (returns run_id), GET /v1/runs/{run_id}, "
      + "GET /v1/runs?page_size=10, GET /v1/agents (saved workflows), "
      + "POST /v1/run/agents {\"agent_id\": \"wpid_…\", \"parameters\": {…}}, GET /v1/credentials.",
  },
  {
    id: "smtp2go", name: "SMTP2GO", category: "marketing",
    description: "Transactional email sending, statistics and domains",
    website: "https://www.smtp2go.com", docs: "https://developers.smtp2go.com/", logo: { favicon: "https://www.smtp2go.com" },
    baseUrl: "https://{server}/v3",
    auth: { type: "header", name: "X-Smtp2go-Api-Key" },
    fields: [{ id: "token", label: "API key (api-…)", secret: true, example: "api-0123456789abcdef0123456789abcdef" },
             { id: "server", label: "Region", default: "api.smtp2go.com",
               options: [["api.smtp2go.com", "Global"], ["eu-api.smtp2go.com", "EU"], ["us-api.smtp2go.com", "US"],
                          ["au-api.smtp2go.com", "Australia"]],
               help: "Global routes automatically to the nearest region; choose a specific one to control where data is processed." }],
    keyUrl: "https://app.smtp2go.com/sending/apikeys/",
    help: "1) At app.smtp2go.com open “Sending” → “API Keys” in the side menu and add a new key. 2) Each key has permissions "
      + "per endpoint: leave checked the ones you need (the connection test uses /stats/email_summary, so a key limited to only "
      + "sending email will fail the test even though it can send). Copy the key: it starts with api-. 3) Monthly sending limits depend "
      + "on your plan.",
    test: { method: "POST", path: "/stats/email_summary", body: {}, message: "API key is valid" },
    examples: "All calls are POST requests with a JSON body (Conector adds the key). Examples: POST /email/send "
      + "{\"sender\": \"you@example.com\", \"to\": [\"a@x.com\"], \"subject\": \"…\", \"html_body\": \"…\"}, POST /stats/email_summary {}, "
      + "POST /stats/email_history {}, POST /email/search {\"limit\": 20}, POST /domain/view {}.",
  },
  {
    id: "spondyr", name: "Spondyr", category: "automation",
    description: "Templates and delivery of correspondence (email, SMS, fax, mail)",
    website: "https://www.spondyr.io", docs: "https://client.spondyr.io/#/Public/Public/Documentation",
    logo: { favicon: "https://www.spondyr.io" },
    baseUrl: "https://client.spondyr.io/api/v1.0.0",
    auth: [{ type: "header", name: "APIKey", field: "token" },
           { type: "header", name: "ApplicationToken", field: "application_token" }],
    fields: [{ id: "token", label: "Subscription API key (APIKey)", secret: true },
             { id: "application_token", label: "Application token (ApplicationToken)", secret: true }],
    help: "1) Log in at client.spondyr.io (if you have no account, sign up: a subscription and an application are created). 2) The API "
      + "key (APIKey) belongs to the subscription and the token (ApplicationToken) to each application: both are generated when you sign up and "
      + "you can see them in the dashboard. 3) Each subscription limits the correspondence that can be generated per month.",
    test: { path: "/TransactionTypes", validate: spondyr,
              message: (d) => `Keys are valid · transaction types: ${(d?.Data || []).length}` },
    examples: "The keys go in headers; there is no need to repeat them in the body. Examples: GET /TransactionTypes, "
      + "POST /Spondyr {\"EventType\": \"…\", \"IsGenerateOnly\": false, \"Data\": {…}} (generates and delivers correspondence; returns "
      + "a ReferenceID), GET /Spondyr?ReferenceID=… (status), GET /Spondyrs?EventType=…&Page=1&PageSize=20 (search).",
  },
  {
    id: "temporal", name: "Temporal Cloud", category: "automation",
    description: "Namespaces, users, service accounts and keys",
    website: "https://temporal.io", docs: "https://saas-api.tmprl.cloud/docs/httpapi.html", logo: { simpleIcons: "temporal" },
    baseUrl: "https://saas-api.tmprl.cloud",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "Temporal Cloud API key", secret: true }],
    keyUrl: "https://cloud.temporal.io/profile/api-keys",
    help: "1) In the Temporal Cloud interface open your profile → “API Keys” → “Create API key”. 2) Enter a name, a description "
      + "and the expiration date (maximum 2 years), click “Generate API Key” and copy it: it is shown only once. 3) The key has the "
      + "permissions of the user or service account (“Account Read” is enough for read-only queries). This is the account management API: "
      + "it does not run or query workflows.",
    test: { path: "/cloud/current-identity",
              account: (d) => d?.user?.spec?.email || d?.serviceAccount?.spec?.name || d?.principalApiKey?.spec?.displayName },
    examples: "Examples: GET /cloud/current-identity, GET /cloud/namespaces?pageSize=20, GET /cloud/namespaces/{namespace}, "
      + "GET /cloud/users, GET /cloud/service-accounts, GET /cloud/regions, GET /cloud/api-keys. Optional: the "
      + "temporal-cloud-api-version header to pin the API version.",
  },
  {
    id: "tinyfish", name: "TinyFish", category: "automation",
    description: "Web agents, search, extraction and remote browsers",
    website: "https://www.tinyfish.ai", docs: "https://docs.tinyfish.ai", logo: { favicon: "https://www.tinyfish.ai" },
    baseUrl: "https://agent.tinyfish.ai/v1", timeout: LONG_TIMEOUT,
    allowedOrigins: ["https://api.search.tinyfish.ai", "https://api.fetch.tinyfish.ai", "https://api.browser.tinyfish.ai"],
    auth: { type: "header", name: "X-API-Key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://agent.tinyfish.ai/api-keys",
    help: "1) Log in at agent.tinyfish.ai/api-keys and click “Create API Key”. 2) Copy it right away: it is shown only once. 3) Search "
      + "and page extraction have a free daily allowance; agents and remote browsers use the balance "
      + "of your wallet.",
    test: { path: "/runs", query: { limit: 1 },
              message: (d) => `API key is valid · registered runs: ${d?.pagination?.total ?? (d?.data || []).length}` },
    examples: "Agents (base …/v1): POST /automation/run {\"url\": \"https://…\", \"goal\": \"…\"} (synchronous), "
      + "POST /automation/run-async (returns run_id), GET /runs/{id}, GET /runs?status=COMPLETED&limit=20, POST /runs/{id}/cancel. "
      + "Other APIs (full URL): GET https://api.search.tinyfish.ai/?query=…, "
      + "POST https://api.fetch.tinyfish.ai/ {\"urls\": [\"https://…\"]}, POST https://api.browser.tinyfish.ai/ (remote browser).",
  },
  {
    id: "visualping", name: "Visualping", category: "automation",
    description: "Web page change monitoring and alerts",
    website: "https://visualping.io", docs: "https://github.com/webmonitoring/visualping-api-skill/blob/develop/reference/api-reference.md",
    logo: { favicon: "https://visualping.io" },
    baseUrl: "https://job.api.visualping.io", allowedOrigins: ["https://account.api.visualping.io", "https://api.visualping.io"],
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://visualping.io/account/developer",
    help: "1) Log in at visualping.io/account/developer (Account Settings → Developer) and create an API key (up to 5 active). "
      + "2) Choose its scope (organization or workspace) and the permission (read-only or read and write) and copy it: it is "
      + "shown only once. 3) According to Visualping, the API is included in all plans; each check uses the quota of "
      + "your plan.",
    test: { path: "https://account.api.visualping.io/describe-user", account: (d) => d?.emailAddress },
    examples: "Examples: GET /v2/jobs (monitors), GET /v2/jobs/{id} (details and history), POST /v2/jobs (creates a monitor), "
      + "POST /v2/jobs/launch (checks now; uses quota), PUT /v2/jobs/{id}, DELETE /v2/jobs/{id}, GET /v2/jobs/labels, "
      + "GET https://account.api.visualping.io/describe-user.",
  },
  {
    id: "wachete", name: "Wachete", category: "automation",
    description: "Web page change monitoring and notifications",
    website: "https://www.wachete.com", docs: "https://api.wachete.com/swagger/ui/index", logo: { favicon: "https://www.wachete.com" },
    baseUrl: "https://api.wachete.com/thirdparty/v1",
    auth: { type: "custom", apply: async (c) => ({ headers: { Authorization: `Bearer ${await getWacheteToken(c)}` } }) },
    fields: [{ id: "user_id", label: "User ID" },
             { id: "token", label: "API key", secret: true }],
    help: "1) Log in at wachete.com and open your profile: your user ID and API key are shown there. 2) Copy both. "
      + "Conector exchanges them for a session token (1 hour) whenever needed. 3) Wachete's documentation does not say which "
      + "plans include the API: if your profile does not show the key, ask them.",
    test: { path: "/folder/list",
              message: (d) => `Credentials are valid · in the root: ${(d?.tasks || []).length} monitors `
                + `and ${(d?.subfolders || []).length} folders` },
    examples: "Examples: GET /folder/list?parentId=… (monitors and subfolders; without parentId, the root), GET /task/search?query=…, "
      + "GET /task/{id}, GET /data/list/{id} (history of a monitor), PUT /task (creates or updates a monitor), "
      + "GET /notification/list (triggered alerts).",
  },
];
