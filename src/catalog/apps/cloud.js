// Cloud, CI/CD and observability: Azure, Entra ID, Azure DevOps, Heroku, Render, HCP Terraform, Docker Hub, OVHcloud, Scaleway,
// Doppler, Better Stack, UptimeRobot, New Relic, CircleCI, npm and Elastic Cloud.
import crypto from "node:crypto";
import { z } from "zod";
import { USER_AGENT, httpRequest } from "../../http.js";
import { ensureOk } from "../define.js";

// Application registered in Microsoft Entra ID with “client credentials”: the token is requested for a specific API (ARM or Graph).
const microsoftAccess = (api) => ({ type: "client_credentials", url: "https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token",
  credentialsIn: "body", params: { grant_type: "client_credentials", scope: `${api}/.default` } });
const MICROSOFT_FIELDS = [
  { id: "tenant", label: "Directory (tenant) ID", example: "00000000-0000-0000-0000-000000000000",
    help: "The application's “Directory (tenant) ID”; the domain also works, e.g. yourcompany.onmicrosoft.com." },
  { id: "client_id", label: "Application (client) ID" },
  { id: "client_secret", label: "Client secret value", secret: true,
    help: "The secret's “Value”, not its “Secret ID”." },
];
const USER_FIELDS = "id,displayName,userPrincipalName,mail,accountEnabled,userType,createdDateTime";

// Evidence of a Defender alert on one line: “device: pc-01”, “user: jane@example.com”, “ip: 203.0.113.7”…
function evidence(e) {
  const kind = String(e["@odata.type"] || "").replace(/^#microsoft\.graph\.security\./, "").replace(/Evidence$/, "");
  const value = e.deviceDnsName || e.userAccount?.userPrincipalName || e.userAccount?.accountName || e.ipAddress || e.url
    || e.primaryAddress || e.fileDetails?.fileName || e.imageFile?.fileName || e.registryKey || e.displayName;
  return value ? `${kind}: ${value}` : null;
}

// Open Azure DevOps work items (states vary by process: Agile, Scrum, Basic or CMMI).
const WIQL_OPEN = "SELECT [System.Id] FROM WorkItems WHERE [System.TeamProject] = @project "
  + "AND [System.State] NOT IN ('Closed', 'Done', 'Removed') ORDER BY [System.ChangedDate] DESC";
const WIT_FIELDS = ["System.WorkItemType", "System.Title", "System.State", "System.AssignedTo", "Microsoft.VSTS.Common.Priority",
  "System.IterationPath", "System.ChangedDate"].join(",");

// Docker Hub exchanges the personal (or organization) token for a 10-minute JWT, which is kept in memory until it expires.
let dockerHubToken = null;
async function dockerHubAccess(c) {
  const fingerprint = crypto.createHash("sha256").update(JSON.stringify([c.username, c.token])).digest("hex");
  if (dockerHubToken?.fingerprint === fingerprint && dockerHubToken.expires > Date.now() + 60_000) return dockerHubToken.token;
  const d = ensureOk(await httpRequest("https://hub.docker.com/v2/auth/token", { method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json", "User-Agent": USER_AGENT },
    body: JSON.stringify({ identifier: c.username, secret: c.token }) }), "Docker Hub");
  const token = d?.access_token;
  if (!token) throw new Error("Docker Hub: the authentication response does not include a token");
  let expires = Date.now() + 10 * 60_000;
  try {
    const exp = Number(JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString()).exp);
    if (exp) expires = exp * 1000;
  } catch {
    // JWT without a readable “exp”: use the documented 10 minutes.
  }
  dockerHubToken = { fingerprint, token, expires };
  return token;
}

// OVHcloud signs every request: "$1$" + SHA-1 of secret+consumer key+method+full URL+body+time. The time is the server's
// (/auth/time); the difference from the local time is cached for an hour so it is not queried on every call.
const ovhOffsets = new Map();
async function ovhTime(origin) {
  const now = () => Math.floor(Date.now() / 1000);
  const cached = ovhOffsets.get(origin);
  if (cached?.until > Date.now()) return now() + cached.offset;
  let offset = 0;
  try {
    const r = await httpRequest(`${origin}/1.0/auth/time`, { headers: { Accept: "application/json", "User-Agent": USER_AGENT },
      timeout: 10_000 });
    if (r.ok && Number.isFinite(Number(r.data))) offset = Number(r.data) - now();
  } catch {
    // No response: sign with the local time.
  }
  ovhOffsets.set(origin, { offset, until: Date.now() + 3_600_000 });
  return now() + offset;
}

async function signOvh({ method: httpMethod, url, headers: reqHeaders, body: reqBody, cred }) {
  const time = String(await ovhTime(url.origin));
  const bodyText = reqBody == null ? "" : String(reqBody);
  const signature = crypto.createHash("sha1")
    .update([cred.app_secret, cred.consumer_key, httpMethod, url.href, bodyText, time].join("+")).digest("hex");
  Object.assign(reqHeaders, { "X-Ovh-Application": cred.app_key, "X-Ovh-Consumer": cred.consumer_key, "X-Ovh-Timestamp": time,
    "X-Ovh-Signature": `$1$${signature}` });
}

export default [
  {
    id: "azure", name: "Microsoft Azure", category: "developer",
    description: "Subscriptions, resources, virtual machines, costs and Defender",
    website: "https://azure.microsoft.com", docs: "https://learn.microsoft.com/rest/api/azure/",
    logo: { image: "https://github.com/Azure.png" },
    baseUrl: "https://management.azure.com",
    auth: microsoftAccess("https://management.azure.com"),
    fields: MICROSOFT_FIELDS,
    // “Connect with Microsoft”: acts as the signed-in user (delegated Azure Resource Manager permission).
    oauth: { provider: "microsoft", fields: ["tenant"],
      scopes: ["https://management.azure.com/user_impersonation", "offline_access"],
      help: "In the registered Microsoft application → “API permissions” → “Add a permission” → “APIs my organization uses” → "
        + "“Azure Service Management” → “Delegated permissions” → “user_impersonation”. Actions run with the permissions of the user who "
        + "connects, who needs the “Reader” role (or higher) on the subscriptions. In “Directory (tenant) ID”, enter the one from that "
        + "application." },
    keyUrl: "https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade",
    help: "1) In portal.azure.com → “Microsoft Entra ID” → “App registrations” → “New registration”: give it a name (e.g. "
      + "conector), leave “Accounts in this organizational directory only” and click “Register”. 2) Copy the “Application (client) ID” "
      + "and the “Directory (tenant) ID”. 3) Under “Certificates & secrets” → “New client secret”, choose the expiration "
      + "and copy the “Value”: it is shown only once. 4) On each subscription (or on a management group, to cover all those under "
      + "it) → “Access control (IAM)” → “Add role assignment”, choose “Reader” and, under “Members”, select the application by "
      + "its name. The “Reader” role is enough to query resources, costs and Defender for Cloud; making changes requires "
      + "“Contributor”, preferably only on the resource groups needed.",
    test: { path: "/subscriptions", query: { "api-version": "2022-12-01" }, message: (d) => {
      const s = d?.value || [];
      return s.length ? `Credentials are valid: ${s.length} subscriptions (${s.slice(0, 4).map((x) => x.displayName).join(", ")})`
        : "Credentials are valid, but the application has no role on any subscription";
    } },
    examples: "Every call takes an api-version (specific to each resource provider). Examples: GET /subscriptions?api-version=2022-12-01, "
      + "GET /subscriptions/{id}/resourcegroups?api-version=2021-04-01, "
      + "GET /subscriptions/{id}/resources?api-version=2021-04-01&$filter=resourceType eq 'Microsoft.Compute/virtualMachines', "
      + "GET /subscriptions/{id}/providers/Microsoft.Compute/virtualMachines?api-version=2024-07-01&statusOnly=true, "
      + "POST /subscriptions/{id}/resourceGroups/{group}/providers/Microsoft.Compute/virtualMachines/{vm}/restart?api-version=2024-07-01, "
      + "POST /subscriptions/{id}/providers/Microsoft.CostManagement/query?api-version=2023-11-01 "
      + "{\"type\": \"ActualCost\", \"timeframe\": \"MonthToDate\", \"dataset\": {\"granularity\": \"None\", \"aggregation\": "
      + "{\"total\": {\"name\": \"PreTaxCost\", \"function\": \"Sum\"}}, "
      + "\"grouping\": [{\"type\": \"Dimension\", \"name\": \"ServiceName\"}]}}, "
      + "GET /subscriptions/{id}/providers/Microsoft.Security/alerts?api-version=2022-01-01, "
      + "GET /subscriptions/{id}/providers/Microsoft.Security/secureScores?api-version=2020-01-01, "
      + "GET /subscriptions/{id}/providers/Microsoft.Insights/eventtypes/management/values?api-version=2015-04-01"
      + "&$filter=eventTimestamp ge '2026-10-01T00:00:00Z' (activity log). "
      + "For resource inventories, prefer azure_resource_graph.",
    tools: [
      { name: "azure_resource_graph", title: "Azure: Resource Graph query (KQL)", annotations: { readOnlyHint: true },
        description: "Inventory and configuration of the resources in all accessible subscriptions using an Azure "
          + "Resource Graph KQL query (tables resources, resourcecontainers, securityresources, advisorresources…). Returns the rows, the total "
          + "and the next page token.",
        schema: { kql: z.string().describe("KQL, e.g. resources | where type =~ 'microsoft.compute/virtualmachines' "
                     + "| project name, location, resourceGroup, subscriptionId"),
                   subscriptions: z.array(z.string()).optional().describe("Subscription IDs (empty: all accessible ones)"),
                   max: z.number().int().min(1).max(1000).default(100),
                   page: z.string().optional().describe("Next page token (the “next” field of the previous response)") },
        async run({ kql, subscriptions, max, page }, p) {
          const d = ensureOk(await p({ method: "POST", path: "/providers/Microsoft.ResourceGraph/resources",
            query: { "api-version": "2022-10-01" }, body: { query: kql, subscriptions: subscriptions,
              options: { $top: max, $skipToken: page, resultFormat: "objectArray" } } }), "Azure");
          return { rows: d.data, total: d.totalRecords, next: d.$skipToken || null };
        } },
    ],
  },
  {
    id: "entraid", name: "Microsoft Entra ID", category: "developer",
    description: "Users, groups, sign-ins, audit and Defender alerts",
    website: "https://www.microsoft.com/security/business/identity-access/microsoft-entra-id",
    docs: "https://learn.microsoft.com/graph/api/overview?view=graph-rest-1.0",
    logo: { image: "https://github.com/AzureAD.png" },
    baseUrl: "https://graph.microsoft.com/v1.0",
    auth: microsoftAccess("https://graph.microsoft.com"),
    fields: MICROSOFT_FIELDS,
    // “Connect with Microsoft”: delegated Graph permissions, with the user's rights; they require administrator consent.
    oauth: { provider: "microsoft", fields: ["tenant"],
      scopes: ["Directory.Read.All", "AuditLog.Read.All", "SecurityAlert.Read.All", "SecurityEvents.Read.All",
        "SecurityIncident.Read.All", "IdentityRiskyUser.Read.All", "Policy.Read.All", "offline_access"],
      help: "Here actions run with the permissions of the user who connects, not as an application. In the registered Microsoft application → "
        + "“API permissions” → “Add a permission” → “Microsoft Graph” → “Delegated permissions”, add the permissions shown below and "
        + "click “Grant admin consent”. Connect with an administrator account (e.g. Global Reader or "
        + "Security Reader). In “Directory (tenant) ID”, enter the one from that application." },
    keyUrl: "https://entra.microsoft.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade",
    help: "Complements “Microsoft 365”, which acts as your user: here an application reads the whole directory. "
      + "1) At entra.microsoft.com (or portal.azure.com → “Microsoft Entra ID”) → “App registrations” → “New registration”: give it a "
      + "name (e.g. conector-entra) and click “Register”. 2) Copy the “Application (client) ID” and the “Directory (tenant) "
      + "ID”. 3) Under “API permissions” → “Add a permission” → “Microsoft Graph” → “Application permissions”, add "
      + "Directory.Read.All, AuditLog.Read.All, SecurityAlert.Read.All and SecurityEvents.Read.All (if you will use them, also "
      + "SecurityIncident.Read.All, IdentityRiskyUser.Read.All and Policy.Read.All) and click “Grant admin consent” "
      + "(a Global Administrator or Privileged Role Administrator is required). 4) Under “Certificates & secrets” → “New client secret”, "
      + "choose the expiration and copy the “Value”: it is shown only once. Users' last sign-in requires an Entra ID P1 or P2 license, "
      + "and alerts require Microsoft Defender XDR.",
    test: { path: "/organization", query: { $select: "id,displayName" }, account: (d) => d.value?.[0]?.displayName },
    examples: "Examples: GET /users?$select=displayName,userPrincipalName,accountEnabled,userType&$top=100, "
      + "GET /users/{id or UPN}/memberOf, GET /groups?$filter=securityEnabled eq true, "
      + "GET /directoryRoles?$expand=members (administrators), "
      + "GET /auditLogs/signIns?$filter=createdDateTime ge 2026-10-01T00:00:00Z and status/errorCode ne 0&$top=50 (failed sign-ins), "
      + "GET /auditLogs/directoryAudits?$top=50, GET /identityProtection/riskyUsers?$filter=riskState eq 'atRisk', "
      + "GET /identity/conditionalAccess/policies, GET /reports/authenticationMethods/userRegistrationDetails (MFA registration), "
      + "GET /security/secureScores?$top=1, GET /security/incidents?$top=20, GET /servicePrincipals. $search and $count need the "
      + "ConsistencyLevel: eventual header; for the beta API, use the full URL https://graph.microsoft.com/beta/….",
    tools: [
      { name: "entraid_users", title: "Entra ID: users and last sign-in", annotations: { readOnlyHint: true },
        description: "Directory users with status, type (member or guest), creation date and last sign-in "
          + "(interactive, non-interactive and successful): useful for finding inactive accounts or forgotten guests. The activity data "
          + "requires Entra ID P1 or P2.",
        schema: { filter: z.string().optional().describe("OData filter, e.g. userType eq 'Guest', accountEnabled eq false or "
                     + "signInActivity/lastSignInDateTime le 2026-07-01T00:00:00Z (the last one cannot be combined with others)"),
                   max: z.number().int().min(1).max(120).default(100),
                   next: z.string().optional().describe("URL of the next page (the “next” field of the previous response)") },
        async run({ filter, max, next }, p) {
          const fetchUsers = (withActivity) => p(next ? { path: next } : { path: "/users",
            query: { $select: withActivity ? `${USER_FIELDS},signInActivity` : USER_FIELDS, $filter: filter, $top: max } });
          let r = await fetchUsers(true);
          let warning = null;
          if (r.status === 403 && !next && !/signInActivity/i.test(filter || "")) {
            warning = "No sign-in data: the AuditLog.Read.All permission and an Entra ID P1 or P2 license are required "
              + `(Graph: ${r.data?.error?.message || "access denied"})`;
            r = await fetchUsers(false);
          }
          const d = ensureOk(r, "Microsoft Graph");
          return {
            users: (d.value || []).map((u) => ({ id: u.id, name: u.displayName, upn: u.userPrincipalName, email: u.mail,
              active: u.accountEnabled, type: u.userType, created: u.createdDateTime, last_sign_in: u.signInActivity?.lastSignInDateTime,
              last_non_interactive: u.signInActivity?.lastNonInteractiveSignInDateTime,
              last_successful: u.signInActivity?.lastSuccessfulSignInDateTime })),
            next: d["@odata.nextLink"] || null,
            ...(warning ? { warning } : {}),
          };
        } },
      { name: "entraid_security_alerts", title: "Microsoft Defender: security alerts", annotations: { readOnlyHint: true },
        description: "Microsoft Defender XDR alerts (endpoint, identity, Office 365, cloud apps, Entra ID Protection, Sentinel…), "
          + "from newest to oldest, with severity, status, source, MITRE techniques, entities involved, incident and link.",
        schema: { severity: z.enum(["high", "medium", "low", "informational"]).optional(),
                   status: z.enum(["new", "inProgress", "resolved"]).optional(),
                   since: z.string().optional().describe("Only alerts created since this date (YYYY-MM-DD or ISO 8601)"),
                   max: z.number().int().min(1).max(200).default(50) },
        async run({ severity, status: alertStatus, since, max }, p) {
          const filters = [severity && `severity eq '${severity}'`, alertStatus && `status eq '${alertStatus}'`,
            since && `createdDateTime ge ${since.length === 10 ? `${since}T00:00:00Z` : since}`].filter(Boolean);
          const d = ensureOk(await p({ path: "/security/alerts_v2", query: { $filter: filters.join(" and ") || undefined, $top: max } }),
            "Microsoft Graph");
          return (d.value || []).map((a) => ({ id: a.id, title: a.title, severity: a.severity, status: a.status, category: a.category,
            source: a.serviceSource, detection: a.detectionSource, created: a.createdDateTime, updated: a.lastUpdateDateTime,
            mitre: a.mitreTechniques, entities: (a.evidence || []).map(evidence).filter(Boolean).slice(0, 10),
            assigned: a.assignedTo, classification: a.classification, incident: a.incidentId, link: a.alertWebUrl }));
        } },
    ],
  },
  {
    id: "azuredevops", name: "Azure DevOps", category: "developer",
    description: "Repositories, pull requests, pipelines and work items",
    website: "https://azure.microsoft.com/products/devops", docs: "https://learn.microsoft.com/rest/api/azure/devops/",
    logo: { favicon: "https://dev.azure.com" },
    baseUrl: "https://dev.azure.com/{organization}", headers: { "X-TFS-FedAuthRedirect": "Suppress" },
    allowedOrigins: ["https://vssps.dev.azure.com", "https://vsrm.dev.azure.com", "https://almsearch.dev.azure.com",
      "https://feeds.dev.azure.com", "https://auditservice.dev.azure.com"],
    auth: { type: "basic", fixedUsername: "", passwordField: "token" },
    fields: [{ id: "organization", label: "Organization", format: "segment", example: "dnceng-public",
               help: "The part of the URL after dev.azure.com/: if you sign in at https://dev.azure.com/yourcompany, enter “yourcompany”." },
             { id: "token", label: "Personal access token (PAT)", secret: true },
             { id: "tenant", label: "Directory (tenant) ID", optional: true, example: "00000000-0000-0000-0000-000000000000",
               help: "Only for “Connect with Microsoft”: the “Directory (tenant) ID” of the registered application." }],
    // “Connect with Microsoft”: as the signed-in user (delegated Azure DevOps permission).
    oauth: { provider: "microsoft", fields: ["tenant", "organization"],
      scopes: ["499b84ac-1321-427f-aa17-267ca6975798/user_impersonation", "offline_access"],
      help: "In the registered Microsoft application → “API permissions” → “Add a permission” → “Azure DevOps” → “Delegated "
        + "permissions” → “user_impersonation”. The Azure DevOps organization must be connected to the same Microsoft "
        + "Entra directory (“Organization settings” → “Microsoft Entra”); otherwise access will be denied." },
    help: "1) At https://dev.azure.com/<organization>: “User settings” icon (top right) → “Personal access tokens” → "
      + "“New Token”. 2) Give it a name, choose the organization and the expiration (one year at most) and, under “Scopes”, select “Custom defined” with "
      + "what you will use: Project and Team, Code, Build, Release and Work Items set to “Read” (or “Read & write” if you will make changes). "
      + "3) Click “Create” and copy the token: it is shown only once. If it does not let you create it, an administrator must review the "
      + "organization's personal access token policies.",
    // A nonexistent organization gives 404 and an invalid token gives 401 (without the Suppress header it would be a redirect to the sign-in page).
    test: { path: "/_apis/projects", query: { "api-version": "7.1", $top: 100 }, acceptStatus: [404],
              account: (d, c) => `${c.organization} (${(d.value || []).length} projects)`,
              validate: (d) => {
                if (!Array.isArray(d?.value)) throw new Error("Azure DevOps: organization not found; check its name in the URL");
              } },
    examples: "Add api-version=7.1 to every call. Examples: GET /_apis/projects, GET /{project}/_apis/git/repositories, "
      + "GET /{project}/_apis/git/repositories/{repo}/pullrequests?searchCriteria.status=active, "
      + "GET /{project}/_apis/git/repositories/{repo}/items?path=/README.md&includeContent=true, "
      + "GET /{project}/_apis/build/builds?$top=10&queryOrder=finishTimeDescending, GET /{project}/_apis/build/builds/{id}/logs, "
      + "GET /{project}/_apis/pipelines, POST /{project}/_apis/pipelines/{id}/runs {}, "
      + "POST /{project}/_apis/wit/wiql {\"query\": \"SELECT [System.Id] FROM WorkItems WHERE …\"}, GET /_apis/wit/workitems?ids=1,2, "
      + "POST /{project}/_apis/wit/workitems/$Task with a JSON Patch "
      + "[{\"op\": \"add\", \"path\": \"/fields/System.Title\", \"value\": \"…\"}] "
      + "and the header Content-Type: application/json-patch+json. "
      + "Users: https://vssps.dev.azure.com/{organization}/_apis/graph/users?api-version=7.1-preview.1; audit: "
      + "https://auditservice.dev.azure.com/{organization}/_apis/audit/auditlog?api-version=7.1-preview.1.",
    tools: [
      { name: "azuredevops_work_items", title: "Azure DevOps: work items", annotations: { readOnlyHint: true },
        description: "Searches a project's work items (tasks, bugs, stories…) with WIQL and returns type, title, state, "
          + "assignee, priority, iteration and last modification. By default, the open ones, from the most recently modified to the oldest.",
        schema: { project: z.string().describe("Project name or ID"),
                   wiql: z.string().optional().describe("Full WIQL query, e.g. SELECT [System.Id] FROM WorkItems WHERE "
                     + "[System.TeamProject] = @project AND [System.AssignedTo] = @me ORDER BY [System.ChangedDate] DESC"),
                   max: z.number().int().min(1).max(200).default(50) },
        async run({ project, wiql, max }, p) {
          const witPath = `/${encodeURIComponent(project)}/_apis/wit`;
          const q = ensureOk(await p({ method: "POST", path: `${witPath}/wiql`, query: { "api-version": "7.1", $top: max },
            body: { query: wiql || WIQL_OPEN } }), "Azure DevOps");
          const ids = (q.workItems || []).slice(0, max).map((w) => w.id);
          if (!ids.length) return [];
          const d = ensureOk(await p({ path: `${witPath}/workitems`,
            query: { ids: ids.join(","), fields: WIT_FIELDS, errorPolicy: "omit", "api-version": "7.1" } }), "Azure DevOps");
          return (d.value || []).filter(Boolean).map(({ id, fields: f = {} }) => ({ id, type: f["System.WorkItemType"],
            title: f["System.Title"], state: f["System.State"], assigned_to: f["System.AssignedTo"]?.displayName,
            priority: f["Microsoft.VSTS.Common.Priority"], iteration: f["System.IterationPath"], modified: f["System.ChangedDate"] }));
        } },
    ],
  },
  {
    id: "heroku", name: "Heroku", category: "developer", description: "Apps, dynos, releases, add-ons and config vars",
    website: "https://www.heroku.com", docs: "https://devcenter.heroku.com/articles/platform-api-reference",
    logo: { favicon: "https://www.heroku.com" },
    baseUrl: "https://api.heroku.com", headers: { Accept: "application/vnd.heroku+json; version=3" },
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "Authorization token", secret: true }],
    // The Heroku OAuth token lasts 8 hours and is renewed with the refresh token (which does not expire).
    oauth: { scopes: ["global"], provider: { name: "Heroku", key: "heroku", redirect: "localhost",
      authorizeUrl: "https://id.heroku.com/oauth/authorize", tokenUrl: "https://id.heroku.com/oauth/token",
      help: "1) At dashboard.heroku.com/account/applications#api_clients (“Account settings” → “Applications” → “API Clients”) "
        + "register a new client: name it “Conector” and, as “Callback URL”, use the redirect URI shown below. 2) Copy "
        + "the client's “ID” and “Secret”. The permissions (scopes) shown below are requested when connecting. If a team has disabled "
        + "third-party OAuth access to the API, its apps will not be visible." } },
    keyUrl: "https://dashboard.heroku.com/account/applications",
    help: "1) At dashboard.heroku.com → “Account settings” → “Applications” tab → “Authorizations” section → “Create authorization”. "
      + "2) Give it a description (e.g. Conector) and, optionally, an expiration, and click “Create”. 3) Copy the token: it is shown only "
      + "once. It gives full access to your account; to limit it, create it with the CLI: heroku authorizations:create -d Conector -s identity,read "
      + "(read-only, without config vars).",
    test: { path: "/account", account: (d) => d.email || d.name },
    examples: "Examples: GET /apps, GET /apps/{app}, GET /apps/{app}/dynos, DELETE /apps/{app}/dynos (restarts all dynos), "
      + "DELETE /apps/{app}/dynos/{dyno}, GET /apps/{app}/formation, PATCH /apps/{app}/formation/{type} {\"quantity\": 2} (scales; may "
      + "raise the bill), GET /apps/{app}/releases (Range header: version ..; order=desc, max=10), GET /apps/{app}/builds, "
      + "GET /apps/{app}/addons, GET /apps/{app}/config-vars, PATCH /apps/{app}/config-vars {\"KEY\": \"value\"}, GET /teams, "
      + "GET /teams/{team}/apps.",
  },
  {
    id: "render", name: "Render", category: "developer", description: "Services, deploys, Postgres, logs and environment variables",
    website: "https://render.com", docs: "https://render.com/docs/api", logo: { simpleIcons: "render" },
    baseUrl: "https://api.render.com/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key (rnd_…)", secret: true }],
    keyUrl: "https://dashboard.render.com/u/settings?add-api-key",
    help: "1) At dashboard.render.com: your avatar → “Account Settings” → “API Keys” → “Create API Key”. 2) Give it a name and copy the "
      + "key (rnd_…): it is shown only once. It gives access, with your same permissions, to all workspaces you are a member of.",
    test: { path: "/owners", query: { limit: 20 },
              account: (d) => (Array.isArray(d) ? d : []).map((x) => x.owner?.name || x.owner?.email).filter(Boolean).join(", ") },
    examples: "Examples: GET /owners (workspaces), GET /services?limit=50&type=web_service, GET /services/{id}, "
      + "GET /services/{id}/deploys?limit=10, POST /services/{id}/deploys {\"clearCache\": \"do_not_clear\"}, POST /services/{id}/restart, "
      + "POST /services/{id}/suspend, GET /services/{id}/env-vars, GET /services/{id}/events, "
      + "GET /logs?ownerId={workspace}&resource={id}&limit=100, GET /metrics/cpu?resource={id}, GET /postgres, GET /key-value. "
      + "Pagination: cursor=… (the one from the last item).",
  },
  {
    id: "terraform", name: "HCP Terraform", category: "developer",
    description: "Terraform workspaces, runs, state, variables and projects",
    website: "https://www.hashicorp.com/products/terraform", docs: "https://developer.hashicorp.com/terraform/cloud-docs/api-docs",
    logo: { simpleIcons: "terraform" },
    baseUrl: "https://{server}/api/v2",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API token", secret: true },
             { id: "server", label: "Region", default: "app.terraform.io",
               options: [["app.terraform.io", "Global (app.terraform.io)"],
                 ["app.eu.terraform.io", "European Union (app.eu.terraform.io)"]],
               help: "Choose “European Union” if you sign in at app.eu.terraform.io." }],
    keyUrl: "https://app.terraform.io/app/settings/tokens",
    help: "1) In HCP Terraform: your avatar → “Account settings” → “Tokens” → “Create an API token”. 2) Give it a description and expiration, "
      + "click “Generate token” and copy it: it is shown only once. It acts with your permissions in all your organizations; to limit it, "
      + "use a team token (“Organization settings” → “API tokens” → “Team Tokens”) of a team with just the permissions needed.",
    test: { path: "/account/details", account: (d) => d.data?.attributes?.email || d.data?.attributes?.username },
    examples: "JSON:API format (data is in data.attributes). Examples: GET /organizations, "
      + "GET /organizations/{org}/workspaces?page[size]=50&search[name]=…, GET /organizations/{org}/projects, "
      + "GET /workspaces/{id}/runs?page[size]=10, GET /runs/{id}?include=plan, GET /plans/{id}/json-output, "
      + "GET /workspaces/{id}/current-state-version, GET /workspaces/{id}/vars, GET /workspaces/{id}/current-assessment-result (drift), "
      + "POST /runs {\"data\": {\"type\": \"runs\", \"attributes\": {\"message\": \"…\"}, \"relationships\": {\"workspace\": {\"data\": "
      + "{\"type\": \"workspaces\", \"id\": \"ws-…\"}}}}} and POST /runs/{id}/actions/apply (writes, with the header "
      + "Content-Type: application/vnd.api+json).",
    tools: [
      { name: "terraform_workspaces", title: "HCP Terraform: workspaces", annotations: { readOnlyHint: true },
        description: "Workspaces of an organization with Terraform version, execution mode, resource count, lock status, "
          + "repository and last run status, without the full JSON:API dump.",
        schema: { organization: z.string().describe("Organization name (GET /organizations lists them)"),
                   search: z.string().optional().describe("Part of the workspace name"),
                   max: z.number().int().min(1).max(100).default(50),
                   page: z.number().int().min(1).default(1) },
        async run({ organization, search, max, page }, p) {
          const d = ensureOk(await p({ path: `/organizations/${encodeURIComponent(organization)}/workspaces`,
            query: { "page[size]": max, "page[number]": page, "search[name]": search, include: "current_run" } }), "HCP Terraform");
          const runs = new Map((d.included || []).filter((x) => x.type === "runs").map((x) => [x.id, x.attributes || {}]));
          return {
            workspaces: (d.data || []).map((w) => {
              const a = w.attributes || {};
              const runId = w.relationships?.["current-run"]?.data?.id;
              const run = runs.get(runId);
              return { id: w.id, name: a.name, version: a["terraform-version"], mode: a["execution-mode"],
                resources: a["resource-count"], locked: a.locked, repository: a["vcs-repo-identifier"] || null,
                branch: a["vcs-repo"]?.branch || null, last_change: a["latest-change-at"],
                run: run ? { id: runId, status: run.status, message: run.message, date: run["created-at"] } : null };
            }),
            total: d.meta?.pagination?.["total-count"],
          };
        } },
    ],
  },
  {
    id: "dockerhub", name: "Docker Hub", category: "developer",
    description: "Image repositories, tags, organizations and audit logs",
    website: "https://hub.docker.com", docs: "https://docs.docker.com/reference/api/hub/latest/", logo: { simpleIcons: "docker" },
    baseUrl: "https://hub.docker.com",
    auth: { type: "custom", apply: async (c) => ({ headers: { Authorization: `Bearer ${await dockerHubAccess(c)}` } }) },
    fields: [{ id: "username", label: "Docker Hub username (or organization)", format: "segment",
               help: "Your Docker ID; with an organization token, the organization name." },
             { id: "token", label: "Access token (dckr_pat_… or dckr_oat_…)", secret: true }],
    keyUrl: "https://app.docker.com/settings/personal-access-tokens",
    help: "1) At hub.docker.com: your avatar → “Account settings” → “Personal access tokens” → “Generate new token”. 2) Give it a description "
      + "and expiration and choose the permissions: “Read-only” for querying (“Read & Write” or “Read, Write, Delete” only if you need them). "
      + "3) Click “Generate” and copy the token (dckr_pat_…): it is shown only once. With an organization token (dckr_oat_…, Team "
      + "and Business plans), enter the organization name instead of the username.",
    test: { path: "/v2/namespaces/{username}/repositories", query: { page_size: 1 },
              account: (d, c) => `${c.username} (${d.count ?? 0} repositories)` },
    examples: "{namespace} is your username or an organization. Examples: "
      + "GET /v2/namespaces/{namespace}/repositories?page_size=100&ordering=last_updated, GET /v2/namespaces/{namespace}/repositories/{repo}, "
      + "GET /v2/namespaces/{namespace}/repositories/{repo}/tags?page_size=25, "
      + "GET /v2/namespaces/{namespace}/repositories/{repo}/tags/{tag}, GET /v2/orgs/{org}/members, GET /v2/orgs/{org}/groups, "
      + "GET /v2/orgs/{org}/access-tokens, GET /v2/auditlogs/{account}?from=2026-10-01T00:00:00Z (paid plans).",
  },
  {
    id: "ovhcloud", name: "OVHcloud", category: "developer", description: "Domains and DNS, servers, VPS, Public Cloud and invoices",
    website: "https://www.ovhcloud.com", docs: "https://eu.api.ovh.com/console/", logo: { simpleIcons: "ovh" },
    baseUrl: "https://{server}/1.0",
    auth: { type: "signature", sign: signOvh },
    fields: [{ id: "app_key", label: "Application key" },
             { id: "app_secret", label: "Application secret", secret: true },
             { id: "consumer_key", label: "Consumer key", secret: true },
             { id: "server", label: "Account region", default: "eu.api.ovh.com",
               options: [["eu.api.ovh.com", "Europe (ovh.com, ovhcloud.com)"], ["ca.api.ovh.com", "Canada"],
                 ["api.us.ovhcloud.com", "US (us.ovhcloud.com)"]] }],
    keyUrl: "https://eu.api.ovh.com/createToken/",
    help: "1) Open https://eu.api.ovh.com/createToken/ (Canada accounts: ca.api.ovh.com/createToken/; US: "
      + "api.us.ovhcloud.com/createToken/) and sign in with your OVHcloud account. 2) Give it a name and description, choose the validity "
      + "and, under “Rights”, add GET with the path /* for read-only access (POST, PUT or DELETE only if you will make changes, preferably limited to "
      + "paths like /domain/*). 3) Click “Create” and copy the “Application key”, the “Application secret” and the “Consumer key”.",
    test: { path: "/me", account: (d) => [d.nichandle, d.email].filter(Boolean).join(" · ") },
    examples: "Lists return only identifiers: then request the details of each one. Examples: GET /me, "
      + "GET /me/bill?date.from=2026-01-01, GET /me/bill/{id}, GET /services, GET /services/{id} (renewal and expiration), GET /domain, "
      + "GET /domain/zone/{zone}/record?fieldType=A, GET /domain/zone/{zone}/record/{id}, POST /domain/zone/{zone}/record "
      + "{\"fieldType\": \"A\", \"subDomain\": \"www\", \"target\": \"203.0.113.10\", \"ttl\": 3600} and then "
      + "POST /domain/zone/{zone}/refresh, GET /dedicated/server, GET /vps, GET /cloud/project, GET /cloud/project/{id}/instance, GET /ip. "
      + "API v2: the same URL with /v2 instead of /1.0 (e.g. https://eu.api.ovh.com/v2/iam/resource).",
  },
  {
    id: "scaleway", name: "Scaleway", category: "developer", description: "Instances, Kubernetes, databases, DNS, IAM and usage",
    website: "https://www.scaleway.com", docs: "https://www.scaleway.com/en/developers/api/", logo: { simpleIcons: "scaleway" },
    baseUrl: "https://api.scaleway.com",
    auth: { type: "header", name: "X-Auth-Token" },
    fields: [{ id: "token", label: "Secret key", secret: true },
             { id: "organization", label: "Organization ID", format: "segment",
               help: "In the console: organization menu (top right) → “Organization settings”." }],
    keyUrl: "https://console.scaleway.com/iam/api-keys",
    help: "1) At console.scaleway.com → organization menu → “IAM” → “Applications” → “Create application”: give it a name and a "
      + "policy with the permissions needed (e.g. the AllProductsReadOnly permission set on all projects for read-only access). "
      + "2) In the application → “API keys” → “Generate API key”, choose the expiration and copy the “Secret key” (shown only once; the "
      + "“Access key” is not needed). 3) Also copy the “Organization ID” from “Organization settings”.",
    // With a valid key but no permission on the projects, Scaleway responds 403 (an invalid key gives 401).
    test: { path: "/account/v3/projects?organization_id={organization}", query: { page_size: 10 }, acceptStatus: [403],
              message: (d) => (d?.projects ? `Key is valid: ${d.total_count ?? d.projects.length} projects `
                + `(${d.projects.slice(0, 4).map((x) => x.name).join(", ")})` : "Key is valid (no permission to list the projects)") },
    examples: "Zones: fr-par-1/2/3, nl-ams-1/2/3, pl-waw-1/2/3; regions: fr-par, nl-ams, pl-waw. Examples: "
      + "GET /account/v3/projects?organization_id=…, GET /instance/v1/zones/fr-par-1/servers, "
      + "POST /instance/v1/zones/fr-par-1/servers/{id}/action {\"action\": \"reboot\"}, GET /k8s/v1/regions/fr-par/clusters, "
      + "GET /rdb/v1/regions/fr-par/instances, GET /lb/v1/zones/fr-par-1/lbs, GET /domain/v2beta1/dns-zones, "
      + "GET /domain/v2beta1/dns-zones/{zone}/records, GET /iam/v1alpha1/users?organization_id=…, "
      + "GET /billing/v2beta1/consumptions?organization_id=…, GET /secret-manager/v1beta1/regions/fr-par/secrets. "
      + "organization_id is the organization ID: if you do not have it, ask the user (it also appears in many responses).",
  },
  {
    id: "doppler", name: "Doppler", category: "developer", description: "Projects, environments, configs and centralized secrets",
    website: "https://www.doppler.com", docs: "https://docs.doppler.com/reference/api", logo: { favicon: "https://www.doppler.com" },
    baseUrl: "https://api.doppler.com/v3",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "Token (dp.sa.…, dp.pt.… or dp.st.…)", secret: true }],
    help: "A service account with minimal access is best. 1) At dashboard.doppler.com → “Team” → “Service Accounts” → “New "
      + "Service Account”: give it a name and a read role (e.g. “Viewer”) or access only to the projects needed. 2) In the service "
      + "account → “API Tokens” → “Generate”, give it a name and expiration and copy the token (dp.sa.…). 3) A personal "
      + "token (“Tokens” → “Personal”, with your permissions) also works or, for a single config, a service token (project → config → “Access” → "
      + "“Generate”).",
    test: { path: "/me", account: (d) => [d.workplace?.name, d.name].filter(Boolean).join(" · ") },
    examples: "Examples: GET /me, GET /workplace, GET /projects, GET /environments?project=…, GET /configs?project=…, "
      + "GET /configs/config/secrets/names?project=…&config=… (names only), "
      + "GET /configs/config/secret?project=…&config=…&name=… (returns the value in plain text), "
      + "POST /configs/config/secrets {\"project\": \"…\", \"config\": \"…\", \"secrets\": {\"KEY\": \"value\"}}, "
      + "GET /configs/config/logs?project=…&config=… (change history), GET /logs (activity), GET /workplace/users.",
  },
  {
    id: "betterstack", name: "Better Stack Uptime", category: "developer",
    description: "Monitors, heartbeats, incidents, on-call and status pages",
    website: "https://betterstack.com/uptime", docs: "https://betterstack.com/docs/uptime/api/getting-started-with-uptime-api/",
    logo: { simpleIcons: "betterstack" },
    baseUrl: "https://uptime.betterstack.com/api",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "Uptime API token (team)", secret: true }],
    keyUrl: "https://betterstack.com/settings/api-tokens/0",
    help: "1) In Better Stack → “Settings” (bottom left) → “API tokens”. 2) Under “Team-based tokens”, find the team and copy "
      + "its Uptime token or click “Create API token”. The token gives access to everything in the team, including pausing or deleting monitors.",
    test: { path: "/v2/monitors", query: { per_page: 1 }, message: (d) => {
      const m = d?.data?.[0]?.attributes;
      return m ? `Token is valid (e.g. ${m.pronounceable_name || m.url})` : "Token is valid (no monitors yet)";
    } },
    examples: "Examples: GET /v2/monitors?per_page=50, GET /v2/monitors/{id}, GET /v2/monitors/{id}/sla?from=2026-10-01&to=2026-10-15, "
      + "GET /v2/monitors/{id}/response-times, PATCH /v2/monitors/{id} {\"paused\": true}, "
      + "POST /v2/monitors {\"monitor_type\": \"status\", \"url\": \"https://…\", \"pronounceable_name\": \"…\"}, GET /v2/heartbeats, "
      + "GET /v3/incidents?resolved=false, POST /v3/incidents/{id}/acknowledge, POST /v3/incidents/{id}/resolve, GET /v2/on-calls, "
      + "GET /v2/status-pages. Pagination: follow pagination.next.",
    tools: [
      { name: "betterstack_monitors", title: "Better Stack: monitor status", annotations: { readOnlyHint: true },
        description: "Monitors with their current status (up, down, paused, maintenance…), URL, type, frequency and last check; "
          + "it can return only those in a given status, e.g. the ones that are down.",
        schema: { status: z.enum(["down", "up", "validating", "paused", "pending", "maintenance"]).optional()
                     .describe("Only monitors in this status (down: failing)"),
                   name: z.string().optional().describe("Filter by monitor name"),
                   max: z.number().int().min(1).max(250).default(100) },
        async run({ status: monitorStatus, name, max }, p) {
          const monitors = [];
          let page = { path: "/v2/monitors", query: { per_page: 50, pronounceable_name: name } };
          for (let i = 0; i < 10 && page && monitors.length < max; i++) {
            const d = ensureOk(await p(page), "Better Stack");
            monitors.push(...(d.data || []).filter((m) => !monitorStatus || m.attributes?.status === monitorStatus));
            page = d.pagination?.next ? { path: d.pagination.next } : null;
          }
          return monitors.slice(0, max).map(({ id, attributes: a = {} }) => ({ id, name: a.pronounceable_name, url: a.url,
            type: a.monitor_type, status: a.status, frequency_s: a.check_frequency, last_check: a.last_checked_at,
            paused_since: a.paused_at }));
        } },
    ],
  },
  {
    id: "uptimerobot", name: "UptimeRobot", category: "developer",
    description: "Monitors, incidents, uptime statistics and status pages",
    website: "https://uptimerobot.com", docs: "https://uptimerobot.com/api/v3/", logo: { favicon: "https://uptimerobot.com" },
    baseUrl: "https://api.uptimerobot.com/v3",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://dashboard.uptimerobot.com/integrations",
    help: "1) At dashboard.uptimerobot.com → “Integrations & API” → “API” section. 2) Create or copy the “Read-only API key” if you will only "
      + "query, or the “Main API key” if you will also create, pause or edit monitors. Single-monitor keys do not work.",
    test: { path: "/user/me", account: (d) => d.email || d.fullName },
    examples: "Examples: GET /user/me, GET /monitors?status=DOWN,LOOKS_DOWN&limit=50, GET /monitors/{id}, "
      + "GET /monitors/{id}/stats/uptime?from=2026-10-01T00:00:00Z, GET /monitors/{id}/stats/response-time, POST /monitors/{id}/pause, "
      + "POST /monitors/{id}/start, GET /incidents?started_after=2026-10-01T00:00:00Z, GET /incidents/{id}, GET /maintenance-windows, "
      + "GET /psps (status pages), GET /monitor-groups, GET /alert-contacts. Cursor pagination (follow nextLink).",
    tools: [
      { name: "uptimerobot_monitors", title: "UptimeRobot: monitor status", annotations: { readOnlyHint: true },
        description: "Monitors with their status (UP, DOWN, LOOKS_DOWN, PAUSED…), type, URL, interval, time in the current status and "
          + "last incident; it can filter by status, name or tags.",
        schema: { statuses: z.array(z.enum(["UP", "DOWN", "LOOKS_DOWN", "PAUSED", "STARTED"])).optional()
                     .describe("Only these statuses, e.g. [\"DOWN\", \"LOOKS_DOWN\"] (empty: all)"),
                   name: z.string().optional().describe("Part of the monitor name"),
                   tags: z.string().optional().describe("Comma-separated tags"),
                   max: z.number().int().min(1).max(200).default(50),
                   cursor: z.number().optional().describe("Cursor of the next page (the “next” field of the previous response)") },
        async run({ statuses, name, tags, max, cursor }, p) {
          const d = ensureOk(await p({ path: "/monitors",
            query: { status: statuses?.join(","), name: name, tags: tags, limit: max, cursor } }), "UptimeRobot");
          const next = d.nextLink ? Number(new URL(d.nextLink, "https://api.uptimerobot.com").searchParams.get("cursor")) : null;
          return {
            monitors: (d.data || []).map((m) => ({ id: m.id, name: m.friendlyName, status: m.status, type: m.type, url: m.url,
              interval_s: m.interval, in_current_status_s: m.currentStateDuration, tags: (m.tags || []).map((t) => t?.name ?? t),
              last_incident: m.lastIncident ? { id: m.lastIncident.id, reason: m.lastIncident.reason,
                started: m.lastIncident.startedAt, duration_s: m.lastIncident.duration } : null })),
            next: next || null,
          };
        } },
    ],
  },
  {
    id: "newrelic", name: "New Relic", category: "developer", description: "APM, NRQL queries, alerts, incidents and entities",
    website: "https://newrelic.com", docs: "https://docs.newrelic.com/docs/apis/nerdgraph/get-started/introduction-new-relic-nerdgraph/",
    logo: { simpleIcons: "newrelic" },
    baseUrl: "https://{server}",
    auth: { type: "header", name: "API-Key" },
    fields: [{ id: "token", label: "User key (NRAK-…)", secret: true },
             { id: "server", label: "Data region", default: "api.newrelic.com",
               options: [["api.newrelic.com", "US (one.newrelic.com)"],
                 ["api.eu.newrelic.com", "European Union (one.eu.newrelic.com)"]],
               help: "Choose “European Union” if you sign in at one.eu.newrelic.com." }],
    keyUrl: "https://one.newrelic.com/api-keys",
    help: "1) At one.newrelic.com (or one.eu.newrelic.com): your avatar (bottom left) → “API keys” → “Create a key”. 2) Under “Key "
      + "type”, choose “User”, give it a name and click “Create a key”. 3) Copy the key (NRAK-…). It acts with your user's permissions; to "
      + "limit them, create it with a dedicated user that has a read-only role.",
    test: { method: "POST", path: "/graphql", body: { query: "{ actor { user { email name } } }" },
              account: (d) => d.data?.actor?.user?.email || d.data?.actor?.user?.name },
    graphql: { path: "/graphql" },
    examples: "The main API is NerdGraph (use newrelic_graphql or newrelic_nrql), e.g. { actor { accounts { id name } } }, "
      + "{ actor { entitySearch(query: \"domain = 'APM' AND reporting = 'true'\") { results { entities { guid name alertSeverity } } } } } "
      + "or { actor { account(id: 1234567) { alerts { policiesSearch { policies { id name } } } } } }. "
      + "REST v2 (legacy): GET /v2/applications.json.",
    tools: [
      { name: "newrelic_nrql", title: "New Relic: NRQL query", annotations: { readOnlyHint: true },
        description: "Runs an NRQL query on an account and returns the rows, e.g. SELECT count(*) FROM Transaction FACET "
          + "appName SINCE 1 hour ago or SELECT * FROM NrAiIncident WHERE event = 'open' SINCE 1 day ago.",
        schema: { nrql: z.string().describe("NRQL query"),
                   account: z.number().int().optional().describe("Account ID (empty: the only accessible account)") },
        async run({ nrql, account }, p) {
          const gql = async (query, variables) => {
            const d = ensureOk(await p({ method: "POST", path: "/graphql", body: { query, variables } }), "New Relic");
            if (d?.errors?.length) throw new Error(`New Relic: ${d.errors.map((e) => e.message).join("; ")}`);
            return d.data;
          };
          let id = account;
          if (!id) {
            const accounts = (await gql("{ actor { accounts { id name } } }"))?.actor?.accounts || [];
            if (accounts.length !== 1) {
              throw new Error(`Specify the account: ${accounts.map((c) => `${c.id} (${c.name})`).join(", ") || "no accessible accounts"}`);
            }
            id = accounts[0].id;
          }
          const d = await gql("query($id: Int!, $nrql: Nrql!) { actor { account(id: $id) { "
            + "nrql(query: $nrql, timeout: 60) { results } } } }", { id, nrql: nrql });
          return d?.actor?.account?.nrql?.results ?? [];
        } },
    ],
  },
  {
    id: "circleci", name: "CircleCI", category: "developer", description: "Pipelines, workflows, jobs, artifacts and CI/CD insights",
    website: "https://circleci.com", docs: "https://circleci.com/docs/api/v2/", logo: { simpleIcons: "circleci" },
    baseUrl: "https://circleci.com/api/v2",
    auth: { type: "header", name: "Circle-Token" },
    fields: [{ id: "token", label: "Personal API token (CCIPAT_…)", secret: true }],
    keyUrl: "https://app.circleci.com/settings/user/tokens",
    help: "1) At app.circleci.com: your avatar → “User Settings” → “Personal API Tokens” → “Create New Token”. 2) Give it a name and copy "
      + "the token (CCIPAT_…): it is shown only once. It acts with your permissions in all your projects; project tokens do not work "
      + "for API v2.",
    test: { path: "/me", account: (d) => d.login || d.name },
    examples: "{slug} is gh/{org}/{repo}, bb/{org}/{repo} or circleci/{org-id}/{project-id}. Examples: GET /me/collaborations "
      + "(organizations), GET /pipeline?org-slug=gh/{org}&mine=false, GET /project/{slug}/pipeline?branch=main, "
      + "GET /pipeline/{id}/workflow, GET /workflow/{id}/job, GET /project/{slug}/job/{number}, GET /project/{slug}/{number}/artifacts, "
      + "GET /project/{slug}/{number}/tests, GET /insights/{slug}/workflows?branch=main, "
      + "POST /project/{slug}/pipeline {\"branch\": \"main\"}, "
      + "POST /workflow/{id}/rerun {\"from_failed\": true}, POST /workflow/{id}/cancel, GET /project/{slug}/envvar.",
  },
  {
    id: "npm", name: "npm", category: "developer", description: "Packages, versions, organizations and security advisories",
    website: "https://www.npmjs.com", docs: "https://github.com/npm/registry/blob/main/docs/REGISTRY-API.md", logo: { simpleIcons: "npm" },
    baseUrl: "https://registry.npmjs.org", allowedOrigins: ["https://api.npmjs.org"],
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "Granular access token (npm_…)", secret: true }],
    keyUrl: "https://www.npmjs.com/settings/~/tokens",
    help: "1) At npmjs.com: your avatar → “Access Tokens” → “Generate New Token” → “Granular Access Token”. 2) Give it a name and expiration "
      + "and, under “Packages and scopes”, choose “Read-only” (“Read and write” only if you will publish); optionally, limit it to specific packages, "
      + "scopes or organizations and to your IPs. 3) Click “Generate token” and copy it (npm_…): it is shown only once. The "
      + "lifetime of tokens with write permission is limited: note when it expires so you can renew it.",
    test: { path: "/-/whoami", account: (d) => d.username },
    examples: "Scoped packages: @scope%2Fname. Examples: GET /{package} (metadata, versions and maintainers; with the header "
      + "Accept: application/vnd.npm.install-v1+json, abbreviated version), GET /{package}/latest, GET /-/v1/search?text=…&size=20, "
      + "GET /-/package/{package}/dist-tags, GET /-/org/{org}/package, GET /-/org/{org}/user, "
      + "POST /-/npm/v1/security/advisories/bulk {\"package\": [\"1.2.3\"]}, "
      + "GET https://api.npmjs.org/downloads/point/last-month/{package} (downloads).",
    tools: [
      { name: "npm_audit", title: "npm: known package vulnerabilities", annotations: { readOnlyHint: true },
        description: "Looks up the npm registry's security advisories (the same ones npm audit uses) for specific packages and versions. "
          + "Returns, per package, the advisories that affect those versions (severity, title, vulnerable range, CVSS, CWE and "
          + "GHSA link) and the list of packages without advisories.",
        schema: { packages: z.record(z.string(), z.array(z.string()).min(1))
          .describe("Packages and versions to check, e.g. {\"lodash\": [\"4.17.20\"], \"@angular/core\": [\"15.0.0\"]}") },
        async run({ packages }, p) {
          const d = ensureOk(await p({ method: "POST", path: "/-/npm/v1/security/advisories/bulk", body: packages }), "npm") || {};
          return {
            advisories: Object.fromEntries(Object.entries(d).filter(([, l]) => l?.length).map(([name, l]) => [name, l.map((a) => ({
              severity: a.severity, title: a.title, vulnerable: a.vulnerable_versions, cvss: a.cvss?.score || null, cwe: a.cwe,
              link: a.url }))])),
            no_advisories: Object.keys(packages).filter((n) => !d[n]?.length),
          };
        } },
    ],
  },
  {
    id: "elastic", name: "Elastic Cloud", category: "developer",
    description: "Deployments, serverless projects, costs and Elasticsearch proxy",
    website: "https://www.elastic.co/cloud", docs: "https://www.elastic.co/docs/api/doc/cloud/", logo: { simpleIcons: "elasticcloud" },
    baseUrl: "https://api.elastic-cloud.com/api/v1",
    auth: { type: "header", name: "Authorization", prefix: "ApiKey " },
    fields: [{ id: "token", label: "Elastic Cloud API key", secret: true }],
    help: "1) At cloud.elastic.co: user menu → “Organization” → “API keys” → “Create API key”. 2) Give it a name and expiration and "
      + "choose the roles: “Viewer” for read-only access, or “Editor” or “Admin” on the deployments or projects you will manage. "
      + "3) Click “Create API key” and copy the key: it is shown only once. It is an Elastic Cloud console key, not an "
      + "Elasticsearch one: it manages deployments and, through the management proxy, allows occasional queries to the cluster.",
    test: { path: "/deployments", message: (d) => {
      const l = d?.deployments || [];
      return l.length ? `Key is valid: ${l.length} deployments (${l.slice(0, 4).map((x) => x.name).join(", ")})`
        : "Key is valid (it sees no hosted deployments)";
    } },
    examples: "Examples: GET /deployments, GET /deployments/{id} (status and resources), GET /organizations, "
      + "GET /billing/costs/{organization_id}?from=2026-10-01T00:00:00Z&to=2026-10-15T00:00:00Z, "
      + "GET /billing/costs/{organization_id}/deployments, GET /serverless/projects/elasticsearch (also /observability and /security), "
      + "GET /deployments/traffic-filter/rulesets, POST /deployments/{id}/elasticsearch/{ref_id}/_restart. Occasional queries to "
      + "Elasticsearch through the management proxy: GET /deployments/{id}/elasticsearch/main-elasticsearch/proxy/_cluster/health with the "
      + "header X-Management-Request: true.",
  },
];
