// Development and infrastructure (GitHub and Cloudflare are in src/connectors.js).
import { z } from "zod";
import { ensureOk } from "../define.js";

const isoDate = (ms) => (ms ? new Date(ms).toISOString() : null);
const vercelGit = (meta, field) => meta?.[`github${field}`] ?? meta?.[`gitlab${field}`] ?? meta?.[`bitbucket${field}`];
const dropletIp = (d, type) => d.networks?.v4?.find((n) => n.type === type)?.ip_address;

export default [
  {
    id: "gitlab", name: "GitLab", category: "developer", description: "Repositories, merge requests, issues and CI/CD pipelines",
    website: "https://about.gitlab.com", docs: "https://docs.gitlab.com/api/rest/", logo: { simpleIcons: "gitlab" },
    baseUrl: "{url}/api/v4",
    auth: { type: "header", name: "PRIVATE-TOKEN" },
    fields: [{ id: "token", label: "Personal access token (glpat-…)", secret: true },
             { id: "url", label: "GitLab URL", format: "url", default: "https://gitlab.com",
               help: "Change it only if you use a self-hosted instance, e.g. https://gitlab.example.com." }],
    oauth: { scopes: ["api"], fields: ["url"], provider: { name: "GitLab", key: "gitlab", redirect: "localhost",
      authorizeUrl: "{url}/oauth/authorize", tokenUrl: "{url}/oauth/token",
      help: "1) In GitLab click your avatar → “Edit profile” → “Applications” (gitlab.com/-/profile/applications) and “Add new application”. "
        + "2) Name it “Conector”, paste the redirect URI shown below as “Redirect URI”, keep “Confidential” checked and "
        + "select the permissions (scopes) shown below. 3) Click “Save application” and copy the “Application ID” (Client ID) and the "
        + "“Secret” (it is shown only once). For a self-hosted GitLab instance, register the application there (same menu) and enter "
        + "its URL in “GitLab URL” when connecting: this application only works for one instance." } },
    keyUrl: "https://gitlab.com/-/user_settings/personal_access_tokens",
    help: "In GitLab: your avatar → “Edit profile” → “Access” → “Personal access tokens” → “Generate token” → “Legacy token”. "
      + "Give it a name and an expiry date (1 year at most) and check the api scope (or read_api if you will only read). Copy the token (glpat-…): "
      + "it is shown only once.",
    test: { path: "/user", account: (d) => d.username || d.name },
    examples: "Examples: GET /projects?membership=true&simple=true&search=…, GET /projects/{id}/merge_requests?state=opened, "
      + "GET /projects/{id}/issues?state=opened, GET /projects/{id}/pipelines?per_page=10, GET /projects/{id}/jobs/{job_id}/trace, "
      + "GET /projects/{id}/repository/files/{encoded path}/raw?ref=main, POST /projects/{id}/issues. "
      + "{id} is the numeric ID or the URL-encoded path (group%2Fproject).",
  },
  {
    id: "bitbucket", name: "Bitbucket", category: "developer", description: "Repositories, pull requests and pipelines",
    website: "https://bitbucket.org", docs: "https://developer.atlassian.com/cloud/bitbucket/rest/intro/", logo: { simpleIcons: "bitbucket" },
    baseUrl: "https://api.bitbucket.org/2.0",
    auth: { type: "basic", usernameField: "email", passwordField: "token" },
    fields: [{ id: "email", label: "Your Atlassian account email" },
             { id: "token", label: "Atlassian API token", secret: true }],
    // The permissions (scopes) are chosen in the OAuth consumer, not in the authorization request.
    oauth: { scopes: [], provider: { name: "Bitbucket", key: "bitbucket", redirect: "localhost", clientAuth: "basic",
      authorizeUrl: "https://bitbucket.org/site/oauth2/authorize", tokenUrl: "https://bitbucket.org/site/oauth2/access_token",
      help: "1) In Bitbucket Cloud click your avatar, choose the workspace → “Settings” (gear icon) → “Workspace settings” → "
        + "“OAuth consumers” → “Add consumer”. 2) Name it “Conector”, paste the redirect URI shown below as “Callback URL” "
        + "and leave “This is a private consumer” unchecked. 3) Under “Permissions” check “Read” for Account, Workspace membership, "
        + "Projects, Repositories, Pull requests, Pipelines and Issues (and “Write” for whatever you will modify). 4) Click “Save”, open the "
        + "consumer and copy the “Key” (Client ID) and the “Secret”." } },
    keyUrl: "https://id.atlassian.com/manage-profile/security/api-tokens",
    help: "Bitbucket no longer supports app passwords: use an API token. Your avatar → “Account settings” → “Security” → "
      + "“Create and manage API tokens” → “Create API token with scopes”; give it a name and an expiry date, choose the “Bitbucket” app and check "
      + "read:user:bitbucket (used by the connection test), read:workspace:bitbucket, read:repository:bitbucket, "
      + "read:pullrequest:bitbucket, read:pipeline:bitbucket and any write scopes you need. Copy the token (it is shown only once).",
    test: { path: "/user", account: (d) => d.display_name || d.nickname },
    examples: "Examples: GET /user/workspaces, GET /repositories/{workspace}?pagelen=50&sort=-updated_on, "
      + "GET /repositories/{workspace}/{repo}/pullrequests?state=OPEN, GET /repositories/{workspace}/{repo}/pipelines?sort=-created_on, "
      + "GET /repositories/{workspace}/{repo}/commits/{branch}, GET /repositories/{workspace}/{repo}/src/{branch}/{path}, "
      + "POST /repositories/{workspace}/{repo}/pullrequests.",
  },
  {
    id: "vercel", name: "Vercel", category: "developer", description: "Projects, deployments, domains and environment variables",
    website: "https://vercel.com", docs: "https://vercel.com/docs/rest-api", logo: { simpleIcons: "vercel" },
    baseUrl: "https://api.vercel.com",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "Access token (vcp_…)", secret: true }],
    // No OAuth: “Sign in with Vercel” only identifies the user; the permissions to call the API are in private beta.
    keyUrl: "https://vercel.com/account/settings/tokens",
    help: "At vercel.com/account/tokens give it a name and, under “Scope”, choose the team with “All Projects” (or “Full Account” for your "
      + "personal account and all your teams; in that case add teamId=… when working with a team). Choose the expiry, click “Create” and "
      + "copy the token (vcp_…): it is shown only once.",
    test: { path: "/v10/projects", query: { limit: 1 }, message: (d) => {
      const projects = Array.isArray(d) ? d : d?.projects || [];
      return projects.length ? `Token is valid (sees projects, e.g. ${projects[0].name})` : "Token is valid (there are no projects in its scope)";
    } },
    examples: "Examples: GET /v10/projects, GET /v9/projects/{idOrName}, GET /v7/deployments?projectId=…&limit=10, "
      + "GET /v13/deployments/{id or url}, GET /v3/deployments/{id}/events (build log), GET /v10/projects/{idOrName}/env, "
      + "GET /v5/domains. With a full-account token add teamId=… to the query to work with a team.",
    tools: [
      { name: "vercel_deployments", title: "Vercel: latest deployments", annotations: { readOnlyHint: true },
        description: "Recent deployments (newest first) with status, environment, URL, branch, commit, author and error if it failed.",
        schema: { project: z.string().optional().describe("Project ID or name (empty: all)"),
                   environment: z.enum(["production", "preview"]).optional(),
                   status: z.enum(["BUILDING", "ERROR", "INITIALIZING", "QUEUED", "READY", "CANCELED"]).optional(),
                   team: z.string().optional().describe("teamId; only needed with full-account tokens"),
                   max: z.number().int().min(1).max(100).default(20) },
        run: async ({ project, environment, status: deployState, team, max }, p) => ensureOk(await p({ path: "/v7/deployments",
          query: { projectId: project, target: environment, state: deployState, teamId: team, limit: max } }), "Vercel").deployments
          .map((d) => ({ id: d.uid, project: d.name, status: d.state || d.readyState, environment: d.target || "preview",
            url: d.url ? `https://${d.url}` : null, created: isoDate(d.created), branch: vercelGit(d.meta, "CommitRef"),
            commit: vercelGit(d.meta, "CommitMessage"), author: d.creator?.username, error: d.errorMessage, dashboard: d.inspectorUrl })) },
    ],
  },
  {
    id: "netlify", name: "Netlify", category: "developer", description: "Sites, deployments, builds and forms",
    website: "https://www.netlify.com", docs: "https://open-api.netlify.com/", logo: { simpleIcons: "netlify" },
    baseUrl: "https://api.netlify.com/api/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "Personal access token", secret: true }],
    // Netlify has no scopes: the token gives access to the whole account and is only invalidated when it is revoked or the password changes.
    oauth: { scopes: [], provider: { name: "Netlify", key: "netlify", redirect: "localhost",
      authorizeUrl: "https://app.netlify.com/authorize", tokenUrl: "https://api.netlify.com/oauth/token",
      help: "1) At app.netlify.com/user/applications#oauth-applications (“User settings” → “Applications” → “OAuth applications”) "
        + "click “New OAuth app”. 2) Name it “Conector” and paste the redirect URI shown below as “Redirect URI”. "
        + "3) Save and copy the “Client ID” and the “Secret”." } },
    keyUrl: "https://app.netlify.com/user/applications#personal-access-tokens",
    help: "At app.netlify.com/user/applications#personal-access-tokens (“User settings” → “Applications” → “Personal access tokens”) "
      + "click “New access token”, give it a name and an expiry date and, if the team uses SAML, check “Allow access to my SAML-based Netlify team”. "
      + "Copy the token: it is shown only once.",
    test: { path: "/user", account: (d) => d.email || d.full_name },
    examples: "Examples: GET /sites, GET /sites/{site_id}/deploys?per_page=10, GET /deploys/{deploy_id}, POST /sites/{site_id}/builds "
      + "(starts a build), POST /sites/{site_id}/deploys/{deploy_id}/restore (publishes a previous deployment again), "
      + "GET /sites/{site_id}/forms, GET /forms/{form_id}/submissions, GET /accounts/{account_id}/env?site_id=….",
    tools: [
      { name: "netlify_sites", title: "Netlify: sites", annotations: { readOnlyHint: true },
        description: "List the sites with their ID, URL, domain, repository and the published deployment (status, branch and date).",
        schema: { name: z.string().optional().describe("Filter by site name"),
                   max: z.number().int().min(1).max(100).default(50) },
        run: async ({ name, max }, p) => ensureOk(await p({ path: "/sites", query: { name: name, filter: "all", per_page: max } }),
          "Netlify").map((s) => ({ id: s.id, name: s.name, url: s.ssl_url || s.url, domain: s.custom_domain, dashboard: s.admin_url,
          repository: s.build_settings?.repo_url, branch: s.build_settings?.repo_branch, updated: s.updated_at,
          published: s.published_deploy ? { id: s.published_deploy.id, status: s.published_deploy.state, branch: s.published_deploy.branch,
            date: s.published_deploy.published_at } : null })) },
    ],
  },
  {
    id: "digitalocean", name: "DigitalOcean", category: "developer", description: "Droplets, apps, databases, DNS and billing",
    website: "https://www.digitalocean.com", docs: "https://docs.digitalocean.com/reference/api/", logo: { simpleIcons: "digitalocean" },
    baseUrl: "https://api.digitalocean.com",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "Personal access token (dop_v1_…)", secret: true }],
    oauth: { scopes: ["read", "write"], provider: { name: "DigitalOcean", key: "digitalocean", redirect: "localhost",
      authorizeUrl: "https://cloud.digitalocean.com/v1/oauth/authorize", tokenUrl: "https://cloud.digitalocean.com/v1/oauth/token",
      help: "1) At cloud.digitalocean.com/account/api/applications/new (“API” → “OAuth Applications” → “Register OAuth application”) "
        + "name it “Conector” and set the website to https://www.example.com. 2) In “Callback URL” paste the redirect URI shown "
        + "below and register the application (confidential type, with a secret). 3) Copy the “Client ID” and the “Client Secret” (the "
        + "secret is shown only once). When connecting, DigitalOcean asks you to choose the team that gets access." } },
    keyUrl: "https://cloud.digitalocean.com/account/api/tokens",
    help: "At cloud.digitalocean.com/account/api/tokens (“API” → “Tokens”) click “Generate New Token”, give it a name and an expiry date and choose "
      + "“Full Access”, “Read Only” or “Custom Scopes” (include account:read, which the connection test uses). Copy the token: it is "
      + "shown only once.",
    test: { path: "/v2/account", account: (d) => [d.account?.email, d.account?.team?.name].filter(Boolean).join(" · ") },
    examples: "Examples: GET /v2/droplets, POST /v2/droplets/{id}/actions {\"type\": \"reboot\"}, GET /v2/apps, "
      + "GET /v2/apps/{id}/deployments, GET /v2/databases, GET /v2/domains/{domain}/records, GET /v2/kubernetes/clusters, "
      + "GET /v2/customers/my/balance, GET /v2/monitoring/alerts.",
    tools: [
      { name: "digitalocean_droplets", title: "DigitalOcean: droplets", annotations: { readOnlyHint: true },
        description: "List the droplets with status, region, size, IPs, image and tags.",
        schema: { tag: z.string().optional().describe("Only the droplets with this tag"),
                   max: z.number().int().min(1).max(200).default(50) },
        run: async ({ tag, max }, p) => ensureOk(await p({ path: "/v2/droplets", query: { tag_name: tag, per_page: max } }),
          "DigitalOcean").droplets.map((d) => ({ id: d.id, name: d.name, status: d.status, region: d.region?.slug, size: d.size_slug,
          vcpus: d.vcpus, memory_mb: d.memory, disk_gb: d.disk, ipv4: dropletIp(d, "public"), private_ipv4: dropletIp(d, "private"),
          image: [d.image?.distribution, d.image?.name].filter(Boolean).join(" "), created: d.created_at, tags: d.tags })) },
    ],
  },
  {
    id: "hetzner", name: "Hetzner Cloud", category: "developer", description: "Cloud servers, volumes, firewalls, networks and DNS",
    website: "https://www.hetzner.com/cloud/", docs: "https://docs.hetzner.cloud/reference/cloud", logo: { simpleIcons: "hetzner" },
    baseUrl: "https://api.hetzner.cloud/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "Project API token", secret: true }],
    help: "At console.hetzner.com open the project → “Security” → “API Tokens” → “Generate API token”, choose “Read” or “Read & Write” and "
      + "copy the token: it is shown only once. Each token gives access to a single project; to manage another project you need another "
      + "token.",
    test: { path: "/servers", query: { per_page: 1 }, message: (d) => {
      const n = d?.meta?.pagination?.total_entries;
      return n === undefined || n === null ? "Token is valid" : `Token is valid (servers in the project: ${n})`;
    } },
    examples: "Examples: GET /servers, GET /servers/{id}/metrics?type=cpu&start=…&end=… (ISO 8601), POST /servers/{id}/actions/reboot, "
      + "POST /servers/{id}/actions/poweroff, GET /volumes, GET /firewalls, GET /load_balancers, GET /zones (DNS), "
      + "GET /zones/{zone}/rrsets, GET /pricing.",
    tools: [
      { name: "hetzner_servers", title: "Hetzner Cloud: servers", annotations: { readOnlyHint: true },
        description: "Servers in the project with status, type (CPU, RAM and disk), location, IPs, image and labels.",
        schema: { labels: z.string().optional().describe("Label selector, e.g. environment=production"),
                   status: z.enum(["running", "off", "initializing", "starting", "stopping", "deleting", "migrating", "rebuilding",
                     "unknown"]).optional(),
                   max: z.number().int().min(1).max(50).default(50) },
        run: async ({ labels, status: serverStatus, max }, p) => ensureOk(await p({ path: "/servers",
          query: { label_selector: labels, status: serverStatus, per_page: max } }), "Hetzner Cloud").servers
          .map((s) => ({ id: s.id, name: s.name, status: s.status, type: s.server_type?.name, cpus: s.server_type?.cores,
            ram_gb: s.server_type?.memory, disk_gb: s.primary_disk_size ?? s.server_type?.disk,
            location: (s.location ?? s.datacenter?.location)?.name, ipv4: s.public_net?.ipv4?.ip, ipv6: s.public_net?.ipv6?.ip,
            image: s.image?.description, created: s.created, labels: s.labels })) },
    ],
  },
  {
    id: "sentry", name: "Sentry", category: "developer", description: "Errors and issues, events, projects and releases",
    website: "https://sentry.io", docs: "https://docs.sentry.io/api/", logo: { simpleIcons: "sentry" },
    baseUrl: "https://{region}.sentry.io",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "Auth token", secret: true },
             { id: "region", label: "Data region", default: "us",
               options: [["us", "US (us.sentry.io)"], ["de", "European Union (de.sentry.io)"]],
               help: "If you sign in at de.sentry.io or your organization stores its data in the EU, choose “European Union”." }],
    // The Sentry OAuth token only gives access to the organization chosen when authorizing and expires after 30 days (with a refresh token).
    oauth: { scopes: ["org:read", "project:read", "team:read", "member:read", "event:read", "event:write"], fields: ["region"],
      provider: { name: "Sentry", key: "sentry", redirect: "localhost",
        authorizeUrl: "https://sentry.io/oauth/authorize/", tokenUrl: "https://sentry.io/oauth/token/",
        help: "1) In Sentry open your profile → “User settings” → “API” → “Applications” (sentry.io/settings/account/api/applications/) and "
          + "click “Create New Application”. 2) Name it “Conector” and, under “Authorized Redirect URIs”, paste the redirect URI "
          + "shown below (you can leave the other fields empty). 3) Save and copy the “Client ID” and the “Client Secret”. "
          + "The permissions (scopes) shown below are requested when connecting. You choose an organization when connecting: access is "
          + "limited to it (for another one, connect again)." } },
    keyUrl: "https://sentry.io/settings/account/api/auth-tokens/",
    help: "Recommended: an internal integration. In Sentry: “Settings” → “Custom Integrations” → “Create New Integration” → “Internal "
      + "Integration”; give it a name, under “Permissions” grant read access to Organization, Project and Issue & Event (write access to Issue & Event if "
      + "you want to resolve or assign issues), save and copy the token. A personal token (“User settings” → "
      + "“Personal Tokens”) with org:read, project:read and event:read also works.",
    test: { path: "/api/0/organizations/", account: (d) => d.map((o) => o.slug).join(", "),
              message: "Token is valid, but it does not see any organization" },
    examples: "Examples: GET /api/0/organizations/, GET /api/0/organizations/{org}/projects/, "
      + "GET /api/0/organizations/{org}/issues/?query=is:unresolved&statsPeriod=24h, "
      + "GET /api/0/organizations/{org}/issues/{id}/events/latest/, PUT /api/0/organizations/{org}/issues/{id}/ {\"status\": \"resolved\"}, "
      + "GET /api/0/organizations/{org}/releases/.",
    tools: [
      { name: "sentry_issues", title: "Sentry: issues", annotations: { readOnlyHint: true },
        description: "Search the issues of an organization: title, level, status, events, affected users, dates and link.",
        schema: { organization: z.string().describe("Organization slug (GET /api/0/organizations/ lists them)"),
                   query: z.string().default("is:unresolved")
                     .describe("Sentry search, e.g. is:unresolved level:error (empty: all)"),
                   project: z.string().optional().describe("Project slug or ID (empty: all)"),
                   period: z.string().default("14d").describe("Period: 24h, 7d, 14d, 90d…"),
                   order: z.enum(["date", "new", "freq", "user", "trends"]).default("date")
                     .describe("date: last seen; new: first seen; freq: most events; user: most users"),
                   max: z.number().int().min(1).max(100).default(25) },
        run: async ({ organization, query, project, period, order, max }, p) => ensureOk(await p({
          path: `/api/0/organizations/${encodeURIComponent(organization)}/issues/`,
          query: { query: query, project: project, statsPeriod: period, sort: order, limit: max, collapse: "stats" } }), "Sentry")
          .map((i) => ({ id: i.id, short_id: i.shortId, title: i.title, culprit: i.culprit, level: i.level, status: i.status,
            project: i.project?.slug, events: Number(i.count), users: i.userCount, first_seen: i.firstSeen, last_seen: i.lastSeen,
            assigned_to: i.assignedTo?.name, link: i.permalink })) },
    ],
  },
  {
    id: "supabase", name: "Supabase", category: "developer", description: "Projects, database (SQL), Edge Functions and health",
    website: "https://supabase.com", docs: "https://supabase.com/docs/reference/api/introduction", logo: { simpleIcons: "supabase" },
    baseUrl: "https://api.supabase.com",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "Personal access token (sbp_…)", secret: true }],
    // The permissions are chosen when the OAuth app is created (the scope parameter is deprecated); the secret goes in a Basic header.
    oauth: { scopes: [], provider: { name: "Supabase", key: "supabase", redirect: "localhost", clientAuth: "basic",
      authorizeUrl: "https://api.supabase.com/v1/oauth/authorize", tokenUrl: "https://api.supabase.com/v1/oauth/token",
      help: "1) At supabase.com/dashboard open your organization settings → “OAuth Apps” (supabase.com/dashboard/org/_/apps) and "
        + "click “Add application”. 2) Name it “Conector”, set the website to https://www.example.com and, as the callback URL, the redirect URI "
        + "shown below. 3) Grant only the permissions you will use: “Read” for “Organizations”, “Projects”, "
        + "“Database” and “Edge Functions” (running SQL queries requires “Write” for “Database”; better not to grant “Secrets”). 4) Click "
        + "“Confirm” and copy the “Client ID” and the “Client Secret”. When connecting, the user chooses which organizations to authorize." } },
    keyUrl: "https://supabase.com/dashboard/account/tokens",
    help: "At supabase.com/dashboard/account/tokens click “Generate new token”. You can limit it to specific organizations or projects: "
      + "grant at least “Projects” read access (used by the connection test) and “Database” read access for SQL queries (read and "
      + "write access if you want to modify data). Choose the expiry and copy the token (sbp_…).",
    test: { path: "/v1/projects", message: (d) => `Token is valid (accessible projects: ${(Array.isArray(d) ? d : []).length})` },
    examples: "Examples: GET /v1/projects, GET /v1/organizations, GET /v1/projects/{ref}/health?services=db,auth,rest, "
      + "POST /v1/projects/{ref}/database/query/read-only {\"query\": \"select …\"}, GET /v1/projects/{ref}/functions, "
      + "GET /v1/projects/{ref}/advisors/security, GET /v1/projects/{ref}/types/typescript.",
    tools: [
      { name: "supabase_sql_read_only", title: "Supabase: read-only SQL query", annotations: { readOnlyHint: true },
        description: "Run SQL as the read-only user of a project's database and return the rows. "
          + "Tables must be qualified with their schema (public.table).",
        schema: { project: z.string().describe("Project ref (20 letters; GET /v1/projects → ref)"),
                   query: z.string().describe("Read-only SQL, e.g. select id, email from public.customers limit 20") },
        run: async ({ project, query }, p) => ensureOk(await p({ method: "POST",
          path: `/v1/projects/${encodeURIComponent(project)}/database/query/read-only`, body: { query: query } }), "Supabase") },
    ],
  },
  {
    id: "n8n", name: "n8n", category: "developer", description: "Workflows, executions, tags and variables",
    website: "https://n8n.io", docs: "https://docs.n8n.io/connect/n8n-api", logo: { simpleIcons: "n8n" },
    baseUrl: "{url}/api/v1",
    auth: { type: "header", name: "X-N8N-API-KEY" },
    fields: [{ id: "url", label: "Your n8n URL", format: "url",
               help: "e.g. https://your-name.app.n8n.cloud or https://n8n.example.com (without /api/v1)." },
             { id: "token", label: "API key", secret: true }],
    help: "In n8n: “Settings” → “n8n API” → “Create an API key”; give it a label and an expiry date and copy it. The URL is the one of your instance: "
      + "https://<name>.app.n8n.cloud on n8n Cloud or the public URL of your own installation. The API is not available during the n8n "
      + "Cloud free trial.",
    test: { path: "/workflows", query: { limit: 1 }, message: "API key is valid" },
    examples: "Examples: GET /workflows?active=true, GET /workflows/{id}, POST /workflows/{id}/activate, POST /workflows/{id}/deactivate, "
      + "GET /executions?status=error&limit=20, GET /executions/{id}?includeData=true, POST /executions/{id}/retry, GET /tags, "
      + "POST /audit (security audit).",
    tools: [
      { name: "n8n_workflows", title: "n8n: workflows", annotations: { readOnlyHint: true },
        description: "List the workflows without their full definition: ID, name, whether it is active, tags, number of nodes and "
          + "last modification.",
        schema: { active: z.boolean().optional().describe("true: only active; false: only inactive"),
                   name: z.string().optional().describe("Filter by name"),
                   tags: z.string().optional().describe("Tag names separated by commas"),
                   max: z.number().int().min(1).max(250).default(100),
                   cursor: z.string().optional().describe("Cursor of the next page (the “next” field of the previous response)") },
        async run({ active, name, tags, max, cursor }, p) {
          const d = ensureOk(await p({ path: "/workflows", query: { active: active, name: name, tags: tags, limit: max, cursor,
            excludePinnedData: true } }), "n8n");
          return {
            workflows: (d.data || []).map((w) => ({ id: w.id, name: w.name,
              active: w.activeVersionId === undefined ? w.active : w.activeVersionId !== null, archived: w.isArchived,
              tags: (w.tags || []).map((t) => t.name), nodes: w.nodes?.length, updated: w.updatedAt })),
            next: d.nextCursor || null,
          };
        } },
    ],
  },
  {
    id: "teamviewer", name: "TeamViewer", category: "developer", description: "Devices, users, support sessions and reports",
    website: "https://www.teamviewer.com", docs: "https://webapi.teamviewer.com/api/v1/docs/index", logo: { simpleIcons: "teamviewer" },
    baseUrl: "https://webapi.teamviewer.com",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "Script token", secret: true }],
    // The permissions are chosen when the app is created; the token expires and each refresh token is valid only once (it is rotated).
    oauth: { scopes: [], provider: { name: "TeamViewer", key: "teamviewer", redirect: "localhost", extraParams: { display: "popup" },
      authorizeUrl: "https://login.teamviewer.com/oauth2/authorize", tokenUrl: "https://webapi.teamviewer.com/api/v1/oauth2/token",
      help: "1) In the Management Console (login.teamviewer.com) click your user → “Edit profile” → “Apps” → “Create app” (an "
        + "“App”, not a “Script”). 2) Name it “Conector” and add a description, paste the redirect URI shown below as “Redirect URI” "
        + "and check the read permissions you will use (account, users, computers and contacts, sessions and "
        + "connection reports). To see the data of the whole company, choose company access (an administrator authorizes it). "
        + "3) Click “Create” and copy the “Client ID” and the “Client secret”." } },
    help: "In the Management Console (login.teamviewer.com): your user → “Edit profile” → “Apps” → “Create script token” (in the new web "
      + "client: “Edit profile” → “Apps & Tokens” → “Create app or token”). Check only the permissions you will use (e.g. view "
      + "devices, sessions and connection reports), create the token and copy it.",
    test: { path: "/api/v1/ping", message: "Token is valid", validate: (d) => {
      if (!d?.token_valid) throw new Error("TeamViewer: the token is not valid");
    } },
    examples: "Examples: GET /api/v1/account, GET /api/v1/devices, GET /api/v1/managed/devices, GET /api/v1/groups, GET /api/v1/users, "
      + "GET /api/v1/sessions, GET /api/v1/reports/connections?from_date=2026-10-01T00:00:00Z, GET /api/v1/monitoring/alarms. "
      + "Each call needs the corresponding permission in the token.",
  },
  {
    id: "tailscale", name: "Tailscale", category: "developer", description: "Devices, users, keys, ACLs and DNS of the tailnet",
    website: "https://tailscale.com", docs: "https://tailscale.com/api", logo: { simpleIcons: "tailscale" },
    baseUrl: "https://api.tailscale.com/api/v2",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API access token (tskey-api-…)", secret: true }],
    keyUrl: "https://login.tailscale.com/admin/settings/keys",
    help: "At login.tailscale.com/admin/settings/keys click “Generate access token…” (you must be an Owner, Admin, IT admin or Network "
      + "admin). Choose the expiry (1 to 90 days; when it expires you will need to generate another one) and copy the token (tskey-api-…).",
    test: { path: "/tailnet/-/devices", message: (d) => `Token is valid (devices in the tailnet: ${(d?.devices || []).length})` },
    examples: "Examples (- is the tailnet of the token): GET /tailnet/-/devices, GET /device/{id}?fields=all, "
      + "POST /device/{id}/authorized {\"authorized\": true}, POST /device/{id}/tags {\"tags\": [\"tag:server\"]}, GET /tailnet/-/users, "
      + "GET /tailnet/-/keys, GET /tailnet/-/acl, GET /tailnet/-/dns/nameservers, DELETE /device/{id}.",
  },
  {
    id: "postman", name: "Postman", category: "developer", description: "Workspaces, collections, environments and APIs",
    website: "https://www.postman.com", docs: "https://learning.postman.com/api-docs/api-reference", logo: { simpleIcons: "postman" },
    baseUrl: "https://{server}.postman.com",
    auth: { type: "header", name: "X-Api-Key" },
    fields: [{ id: "token", label: "API key (PMAK-…)", secret: true },
             { id: "server", label: "Region", default: "api", options: [["api", "Global"], ["api.eu", "European Union (Enterprise)"]],
               help: "Choose “European Union” only if your Enterprise team has its data hosted in the EU." }],
    keyUrl: "https://go.postman.co/settings/me/api-keys",
    help: "In Postman: your avatar → “Settings” → “Account settings” → “API keys” (go.postman.co/settings/me/api-keys) → "
      + "“Generate API Key”, give it a name and copy the key (PMAK-…). Each call counts toward the monthly API usage limit of your plan.",
    test: { path: "/me", account: (d) => d.user?.email || d.user?.username },
    examples: "Examples: GET /me, GET /workspaces, GET /collections?workspace={id}, GET /collections/{uid}, "
      + "GET /environments?workspace={id}, GET /environments/{uid}, GET /apis?workspaceId={id}, "
      + "PUT /collections/{uid} (replaces the whole collection).",
  },
  {
    id: "datadog", name: "Datadog", category: "developer", description: "Monitors, metrics, logs, dashboards and incidents",
    website: "https://www.datadoghq.com", docs: "https://docs.datadoghq.com/api/latest/", logo: { simpleIcons: "datadog" },
    baseUrl: "https://api.{site}",
    auth: [{ type: "header", name: "DD-API-KEY", field: "api_key" },
           { type: "header", name: "DD-APPLICATION-KEY", field: "app_key" }],
    fields: [{ id: "api_key", label: "API key", secret: true },
             { id: "app_key", label: "Application key", secret: true },
             { id: "site", label: "Datadog site", default: "datadoghq.com",
               options: [["datadoghq.com", "US1 (app.datadoghq.com)"], ["us3.datadoghq.com", "US3"], ["us5.datadoghq.com", "US5"],
                 ["datadoghq.eu", "EU1 (app.datadoghq.eu)"], ["ap1.datadoghq.com", "AP1"], ["ap2.datadoghq.com", "AP2"],
                 ["uk1.datadoghq.com", "UK1"], ["ddog-gov.com", "US1-FED (app.ddog-gov.com)"], ["us2.ddog-gov.com", "US2-FED"]],
               help: "The one in the URL you sign in with: app.datadoghq.eu → EU1, us5.datadoghq.com → US5…" }],
    // No OAuth (Datadog OAuth clients can only be created from a partner account) and no keyUrl (the address depends on the site).
    help: "Two keys are needed: in “Organization Settings” → “API Keys” → “New Key” create the API key, and in “Organization Settings” "
      + "→ “Application Keys” → “New Key” (or in your profile → “Personal Settings” → “Application Keys”) the application key, which you can "
      + "limit with scopes. Choose the site your account is on.",
    test: { path: "/api/v2/current_user", account: (d) => d.data?.attributes?.email || d.data?.attributes?.handle },
    examples: "Examples: GET /api/v1/monitor/search?query=status:alert, GET /api/v1/monitor/{id}, GET /api/v1/dashboard, "
      + "GET /api/v1/query?from=…&to=… (Unix seconds)&query=avg:system.cpu.user{*}, "
      + "POST /api/v2/logs/events/search {\"filter\": {\"query\": \"service:web status:error\", \"from\": \"now-1h\"}}, "
      + "GET /api/v2/incidents, POST /api/v2/downtime.",
  },
  {
    id: "pagerduty", name: "PagerDuty", category: "developer", description: "Incidents, on-call, services and schedules",
    website: "https://www.pagerduty.com", docs: "https://docs.pagerduty.com/developer/api/reference", logo: { simpleIcons: "pagerduty" },
    baseUrl: "https://{server}.pagerduty.com", headers: { Accept: "application/vnd.pagerduty+json;version=2" },
    auth: { type: "header", name: "Authorization", prefix: "Token token=" },
    fields: [{ id: "token", label: "REST API key", secret: true },
             { id: "server", label: "Region", default: "api",
               options: [["api", "US (pagerduty.com)"], ["api.eu", "European Union (eu.pagerduty.com)"]],
               help: "Choose “European Union” if you sign in at <your-subdomain>.eu.pagerduty.com." }],
    // “Classic User OAuth”: scope write = read and write with the user's permissions; it works for any PagerDuty account.
    oauth: { scopes: ["write"], fields: ["server"],
      test: { path: "/users/me", account: (d) => d.user?.email || d.user?.name },
      provider: { name: "PagerDuty", key: "pagerduty", redirect: "localhost",
        authorizeUrl: "https://identity.pagerduty.com/oauth/authorize", tokenUrl: "https://identity.pagerduty.com/oauth/token",
        help: "1) In PagerDuty (you must be a Manager, Global Admin or account owner) go to “Integrations” → “Developer "
          + "Tools” → “App Registration” and click “New App”. 2) Name it “Conector”, check “OAuth 2.0” (leave “Events "
          + "Integration” unchecked) and click “Next”. 3) Choose “Classic User OAuth”, paste the redirect URI shown below as “Redirect URL” "
          + "and, under “Permission Scope”, choose “Read & Write” (the scope is shown below). Click “Register App”. 4) Copy the “Client "
          + "ID” and the “Client Secret” (shown only once). The application works for any PagerDuty account." } },
    help: "As an administrator: “Integrations” → “API Access Keys” → “Create New API Key”, give it a description (check “Read-only API Key” if "
      + "you will only read) and copy the key: it is shown only once. With an account key, write operations need the "
      + "From header with the email of a PagerDuty user.",
    test: { path: "/abilities", message: "API key is valid" },
    examples: "Examples: GET /incidents?statuses[]=triggered&statuses[]=acknowledged, GET /incidents/{id}/log_entries, "
      + "PUT /incidents/{id} {\"incident\": {\"type\": \"incident_reference\", \"status\": \"acknowledged\"}} (with an account key, "
      + "From header with the email of a user), GET /oncalls, GET /services, GET /schedules, "
      + "GET /users/me (only with a user token).",
    tools: [
      { name: "pagerduty_incidents", title: "PagerDuty: incidents", annotations: { readOnlyHint: true },
        description: "Incidents from the last month (by default, the open ones), from newest to oldest, with service, urgency, "
          + "assignees and link.",
        schema: { statuses: z.array(z.enum(["triggered", "acknowledged", "resolved"])).min(1).default(["triggered", "acknowledged"]),
                   urgency: z.enum(["high", "low"]).optional(),
                   service: z.string().optional().describe("Service ID (GET /services)"),
                   max: z.number().int().min(1).max(100).default(25) },
        run: async ({ statuses, urgency, service, max }, p) => ensureOk(await p({
          path: `/incidents?${new URLSearchParams(statuses.map((e) => ["statuses[]", e]))}`,
          query: { "urgencies[]": urgency, "service_ids[]": service, sort_by: "created_at:desc", limit: max } }), "PagerDuty").incidents
          .map((i) => ({ id: i.id, number: i.incident_number, title: i.title, status: i.status, urgency: i.urgency,
            priority: i.priority?.summary, service: i.service?.summary, assignees: (i.assignments || []).map((a) => a.assignee?.summary),
            created: i.created_at, last_status_change: i.last_status_change_at, link: i.html_url })) },
    ],
  },
  {
    id: "grafana", name: "Grafana", category: "developer", description: "Dashboards, data sources, alerts and annotations",
    website: "https://grafana.com", docs: "https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/",
    logo: { simpleIcons: "grafana" },
    baseUrl: "{url}",
    auth: { type: "bearer" },
    fields: [{ id: "url", label: "Grafana URL", format: "url",
               help: "The one of your Grafana Cloud stack (https://<stack>.grafana.net) or of your own installation." },
             { id: "token", label: "Service account token (glsa_…)", secret: true }],
    help: "In Grafana: “Administration” → “Users and access” → “Service accounts” → “Add service account”; give it a name and a role (Viewer "
      + "to read, Editor to create or edit dashboards and alerts) → “Add service account token” → “Generate token” and copy it (glsa_…).",
    test: { path: "/api/user", account: (d) => d.name || d.login },
    examples: "Examples: GET /api/search?query=…&type=dash-db, GET /api/dashboards/uid/{uid}, GET /api/datasources, POST /api/ds/query, "
      + "GET /api/folders, GET /api/v1/provisioning/alert-rules, GET /api/prometheus/grafana/api/v1/rules (alert status), "
      + "GET /api/alertmanager/grafana/api/v2/alerts, POST /api/annotations.",
  },
  {
    id: "jenkins", name: "Jenkins", category: "developer", description: "Jobs, builds, console logs and queue",
    website: "https://www.jenkins.io", docs: "https://www.jenkins.io/doc/book/using/remote-access-api/", logo: { simpleIcons: "jenkins" },
    baseUrl: "{url}",
    auth: { type: "basic", usernameField: "username", passwordField: "token" },
    fields: [{ id: "url", label: "Jenkins URL", format: "url",
               help: "e.g. https://jenkins.example.com (include the path if it is served from a subfolder, such as /jenkins)." },
             { id: "username", label: "Jenkins username" },
             { id: "token", label: "API token", secret: true }],
    help: "In Jenkins: your name (top right) → “Security” (in older versions, “Configure”) → “API Token” → “Add new Token” "
      + "→ “Generate” and copy the token. The username is your Jenkins user ID. With an API token the CSRF crumb is not needed.",
    test: { path: "/me/api/json", query: { tree: "id,fullName" }, account: (d) => d.fullName || d.id },
    examples: "Examples: GET /api/json?tree=jobs[name,color,url], GET /job/{name}/api/json?tree=lastBuild[number,result,timestamp,url], "
      + "GET /job/{name}/lastBuild/consoleText, POST /job/{name}/build, POST /job/{name}/buildWithParameters?PARAM=value, "
      + "GET /queue/api/json, GET /computer/api/json?tree=computer[displayName,offline]. In folders: /job/{folder}/job/{name}/….",
  },
];
