// Infrastructure, deployment platforms and data: Vultr, Akamai Cloud (Linode), Railway, Fly.io, HashiCorp Vault, Statuspage,
// incident.io, SonarQube Cloud, Algolia, Pinecone, Qdrant, Neon, Upstash and PlanetScale.
import { z } from "zod";
import { ensureOk } from "../define.js";

// Pinecone API version (quarterly; each one is kept for at least 12 months). 2026-07 changes the index model.
const PINECONE_VERSION = "2026-04";

// Fly.io: tokens from `fly tokens create` (FlyV1 fm2_…) are sent as is in Authorization; the old ones from `fly auth token`, as Bearer.
function flyAuthorization(c) {
  const t = String(c.token || "").trim();
  return { headers: { Authorization: /^FlyV1 /.test(t) ? t : /^fm\d_/.test(t) ? `FlyV1 ${t}` : `Bearer ${t}` } };
}

async function railwayGraphql(p, query, variables) {
  const d = ensureOk(await p({ method: "POST", path: "/graphql/v2", body: { query, variables } }), "Railway");
  if (d?.errors?.length && !d.data) throw new Error(`Railway: ${d.errors.map((e) => e.message).join("; ")}`);
  return d?.data;
}
const nodes = (connection) => (connection?.edges || []).map((e) => e.node);

// Accessible workspaces: with a key, those of the token (apiToken); with “Connect with Railway” (OAuth) there is no apiToken and
// they are the ones the user shared on authorization (me.workspaces).
async function railwayWorkspaces(p) {
  let workspaces = null;
  try {
    workspaces = (await railwayGraphql(p, "{ apiToken { workspaces { id name } } }"))?.apiToken?.workspaces;
  } catch {
    // No apiToken (OAuth token): me.workspaces is used.
  }
  return workspaces || (await railwayGraphql(p, "{ me { workspaces { id name } } }"))?.me?.workspaces || [];
}

// SonarQube: project status metrics (software_quality_* are those of MQR mode, the one SonarQube Cloud uses).
const SONAR_METRICS = ["alert_status", "quality_gate_details", "software_quality_security_issues", "software_quality_reliability_issues",
  "software_quality_maintainability_issues", "new_violations", "security_hotspots", "security_hotspots_reviewed", "security_rating",
  "reliability_rating", "sqale_rating", "security_review_rating", "coverage", "duplicated_lines_density", "ncloc"];
const numOrNull = (v) => (v === undefined || v === null || v === "" || Number.isNaN(Number(v)) ? null : Number(v));
const grade = (v) => (numOrNull(v) === null ? null : ["A", "B", "C", "D", "E"][Math.round(Number(v)) - 1] || v);

export default [
  {
    id: "vultr", name: "Vultr", category: "developer",
    description: "Instances, Kubernetes, databases, DNS, firewalls and billing",
    website: "https://www.vultr.com", docs: "https://www.vultr.com/api/", logo: { simpleIcons: "vultr" },
    baseUrl: "https://api.vultr.com/v2",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://my.vultr.com/settings/#settingsapi",
    help: "1) In my.vultr.com → “Account” → “API” click “Enable API” (if it is not enabled) and copy the API key. 2) In “Access Control”, "
      + "further down, the IPs Conector connects from must be allowed: add the public IP of this server (or click “Allow "
      + "All IPv4”). The key acts with all your user's permissions: to limit it, create a user in “Account” → “Users” with only "
      + "the necessary permissions (ACL), enable the API for it and use its key.",
    test: { path: "/account", account: (d) => [d.account?.email, d.account?.name].filter(Boolean).join(" · ") },
    examples: "Examples: GET /account (balance and pending charges), GET /instances?per_page=100, GET /instances/{id}, "
      + "POST /instances/{id}/reboot, POST /instances/{id}/halt, POST /instances/{id}/start, GET /bare-metals, GET /kubernetes/clusters, "
      + "GET /databases, GET /domains, GET /domains/{domain}/records, POST /domains/{domain}/records "
      + "{\"name\": \"www\", \"type\": \"A\", \"data\": \"203.0.113.10\", \"ttl\": 300}, GET /firewalls, GET /firewalls/{id}/rules, "
      + "GET /load-balancers, GET /blocks, GET /snapshots, GET /billing/history, GET /billing/invoices, GET /users, GET /regions, "
      + "GET /plans. Pagination: per_page (up to 500) and cursor=… (meta.links.next).",
    tools: [
      { name: "vultr_instances", title: "Vultr: instances", annotations: { readOnlyHint: true },
        description: "Cloud instances with status (active, powered on or stopped), region, plan, CPU, RAM and disk, IPs, operating system, "
          + "tags and creation date.",
        schema: { tag: z.string().optional().describe("Only those with this tag"),
                   region: z.string().optional().describe("Only those in this region, e.g. ewr or fra"),
                   name: z.string().optional().describe("Only those with this name (label)"),
                   max: z.number().int().min(1).max(500).default(100),
                   cursor: z.string().optional().describe("Cursor for the next page (the “next” field of the previous response)") },
        async run({ tag, region, name, max, cursor }, p) {
          const d = ensureOk(await p({ path: "/instances", query: { tag: tag, region, label: name, per_page: max, cursor } }), "Vultr");
          return {
            instances: (d.instances || []).map((i) => ({ id: i.id, name: i.label, host: i.hostname, status: i.status,
              power: i.power_status, server: i.server_status, region: i.region, plan: i.plan, vcpus: i.vcpu_count, ram_mb: i.ram,
              disk_gb: i.disk, ipv4: i.main_ip, ipv6: i.v6_main_ip || null, internal_ip: i.internal_ip || null, os: i.os,
              tags: i.tags, created: i.date_created })),
            total: d.meta?.total,
            next: d.meta?.links?.next || null,
          };
        } },
    ],
  },
  {
    id: "linode", name: "Akamai Cloud (Linode)", category: "developer",
    description: "Linodes, Kubernetes (LKE), databases, DNS, firewalls and invoices",
    website: "https://www.linode.com", docs: "https://techdocs.akamai.com/linode-api/reference/api", logo: { simpleIcons: "akamai" },
    baseUrl: "https://api.linode.com/v4",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "Personal access token", secret: true }],
    // scope * = everything the user allows (like a token with “Read/Write” on everything); the token lasts 2 hours and renews itself.
    oauth: { scopes: ["*"], provider: { name: "Akamai Cloud (Linode)", key: "linode", redirect: "localhost",
      authorizeUrl: "https://login.linode.com/oauth/authorize", tokenUrl: "https://login.linode.com/oauth/token",
      help: "1) In cloud.linode.com click your username (top right) → “OAuth Apps” (cloud.linode.com/profile/clients) → "
        + "“Create an OAuth App”. 2) Give it the label “Conector”, paste the redirect URI shown below as “Callback URL” "
        + "and leave “Public” unchecked (so that a secret is generated). 3) Click “Create” and copy the “Client ID” and the “Client Secret” (it is "
        + "shown only once)." } },
    keyUrl: "https://cloud.linode.com/profile/tokens",
    help: "1) In cloud.linode.com: your username (top right) → “API Tokens” → “Create a Personal Access Token”. 2) Give it a label "
      + "and an expiry and, for each service, choose “No Access”, “Read Only” or “Read/Write” (to only read, “Read Only” on all). "
      + "3) Click “Create Token” and copy it: it is shown only once.",
    test: { path: "/profile", account: (d) => d.username || d.email },
    examples: "Examples: GET /profile, GET /account, GET /linode/instances?page_size=100, GET /linode/instances/{id}, "
      + "GET /linode/instances/{id}/stats, POST /linode/instances/{id}/reboot, POST /linode/instances/{id}/shutdown, "
      + "POST /linode/instances/{id}/boot, GET /linode/instances/{id}/backups, GET /lke/clusters, GET /databases/instances, GET /domains, "
      + "GET /domains/{id}/records, POST /domains/{id}/records {\"type\": \"A\", \"name\": \"www\", \"target\": \"203.0.113.10\", "
      + "\"ttl_sec\": 300}, GET /networking/firewalls, GET /networking/firewalls/{id}/rules, GET /nodebalancers, GET /volumes, "
      + "GET /object-storage/buckets, GET /account/invoices, GET /account/events?page_size=50, GET /account/users, GET /regions. "
      + "Filters with the X-Filter header, e.g. {\"region\": \"us-east\"} or {\"tags\": \"production\"}; pagination: page and page_size "
      + "(25 to 500).",
    tools: [
      { name: "linode_instances", title: "Akamai Cloud: instances (Linodes)", annotations: { readOnlyHint: true },
        description: "Linodes with status, region, type (CPU, RAM and disk), IPs, image, tags, whether backups are enabled and creation "
          + "date.",
        schema: { tag: z.string().optional().describe("Only those with this tag"),
                   region: z.string().optional().describe("Only those in this region, e.g. us-east or de-fra-2"),
                   max: z.number().int().min(25).max(500).default(100),
                   page: z.number().int().min(1).default(1) },
        async run({ tag, region, max, page }, p) {
          const filter = { ...(tag ? { tags: tag } : {}), ...(region ? { region } : {}) };
          const d = ensureOk(await p({ path: "/linode/instances", query: { page: page, page_size: max },
            headers: Object.keys(filter).length ? { "X-Filter": JSON.stringify(filter) } : undefined }), "Akamai Cloud");
          return {
            linodes: (d.data || []).map((l) => ({ id: l.id, name: l.label, status: l.status, region: l.region, type: l.type,
              vcpus: l.specs?.vcpus, ram_mb: l.specs?.memory, disk_mb: l.specs?.disk, ipv4: l.ipv4, ipv6: l.ipv6, image: l.image,
              tags: l.tags, backups: l.backups?.enabled, created: l.created })),
            page: d.page, pages: d.pages, total: d.results,
          };
        } },
    ],
  },
  {
    id: "railway", name: "Railway", category: "developer", description: "Projects, services, deployments, logs and variables (GraphQL)",
    website: "https://railway.com", docs: "https://docs.railway.com/integrations/api", logo: { simpleIcons: "railway" },
    baseUrl: "https://backboard.railway.com", graphql: { path: "/graphql/v2" },
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API token (account or workspace)", secret: true }],
    // “Login with Railway”: the token lasts 1 hour and is renewed with the refresh token (offline_access + prompt=consent).
    oauth: { scopes: ["openid", "email", "profile", "offline_access", "workspace:member"],
      test: { method: "POST", path: "/graphql/v2", body: { query: "{ me { name email workspaces { id name } } }" },
                account: (d) => [d.data?.me?.email, (d.data?.me?.workspaces || []).map((w) => w.name).join(", ")]
                  .filter(Boolean).join(" · ") },
      provider: { name: "Railway", key: "railway", redirect: "localhost", clientAuth: "basic", extraParams: { prompt: "consent" },
        authorizeUrl: "https://backboard.railway.com/oauth/auth", tokenUrl: "https://backboard.railway.com/oauth/token",
        help: "1) In Railway open the workspace settings → “Developer” → “New OAuth App” (you must be a workspace "
          + "admin). 2) Name it “Conector”, choose the “Web” type (confidential) and, in “Redirect URIs”, paste the redirect "
          + "URI shown below. 3) Copy the “Client ID” and the “Client secret” (it is shown only once). When connecting, Railway "
          + "lets you choose which workspaces are shared; the scopes shown below are requested on every connection." } },
    keyUrl: "https://railway.com/account/tokens",
    help: "1) In railway.com/account/tokens create a new token and give it a name. 2) In “Workspace” choose the specific workspace (it will "
      + "only see its projects; recommended) or “No workspace” for an account token, with access to everything of yours and all your workspaces. "
      + "3) Click “Create” and copy the token: it is shown only once. Project tokens (the ones under “Settings” → “Tokens” of each "
      + "project) do not work here.",
    test: { method: "POST", path: "/graphql/v2", body: { query: "{ apiToken { workspaces { id name } } }" },
              account: (d) => (d.data?.apiToken?.workspaces || []).map((w) => w.name).join(", ") },
    examples: "The API is GraphQL (POST /graphql/v2): use railway_graphql, e.g. { apiToken { workspaces { id name } } } (with "
      + "“Connect with Railway”: { me { workspaces { id name } } }), { projects(workspaceId: \"…\") { edges { node { id name } } } }, "
      + "{ deployments(first: 10, input: { projectId: \"…\", serviceId: \"…\", environmentId: \"…\" }) { edges { node { id status "
      + "createdAt staticUrl } } } }, { deploymentLogs(deploymentId: \"…\", limit: 200) { timestamp severity message } }, "
      + "{ buildLogs(deploymentId: \"…\", limit: 200) { timestamp message } }, "
      + "{ variables(projectId: \"…\", environmentId: \"…\", serviceId: \"…\") } (returns the values in plain text), "
      + "mutation { deploymentRestart(id: \"…\") }, mutation { deploymentRollback(id: \"…\") }, "
      + "mutation { serviceInstanceRedeploy(serviceId: \"…\", environmentId: \"…\") }, "
      + "mutation { variableUpsert(input: { projectId: \"…\", environmentId: \"…\", serviceId: \"…\", name: \"KEY\", value: \"…\" }) } "
      + "(redeploys the service unless skipDeploys: true).",
    tools: [
      { name: "railway_projects", title: "Railway: projects, services and environments", annotations: { readOnlyHint: true },
        description: "Projects of the workspaces accessible with the token (or of a specific one) with their services and environments (IDs and "
          + "names), which are then used in deployment, log and variable queries.",
        schema: { workspace: z.string().optional().describe("Workspace ID (empty: all accessible with the token)") },
        async run({ workspace }, p) {
          const workspaces = workspace ? [{ id: workspace, name: workspace }] : await railwayWorkspaces(p);
          const projects = [];
          for (const w of workspaces.slice(0, 10)) {
            const d = await railwayGraphql(p, "query($w: String!) { projects(workspaceId: $w, first: 100) { edges { node { id name "
              + "updatedAt services { edges { node { id name } } } environments { edges { node { id name } } } } } } }", { w: w.id });
            for (const x of nodes(d?.projects)) {
              projects.push({ id: x.id, name: x.name, workspace: w.name, updated: x.updatedAt,
                services: nodes(x.services).map((s) => ({ id: s.id, name: s.name })),
                environments: nodes(x.environments).map((e) => ({ id: e.id, name: e.name })) });
            }
          }
          return projects;
        } },
      { name: "railway_status", title: "Railway: status of a project's services", annotations: { readOnlyHint: true },
        description: "For each environment, each service of the project with its latest deployment: status (SUCCESS, FAILED, CRASHED, BUILDING, "
          + "DEPLOYING, SLEEPING…), date, URL, region and replicas; use it to see at a glance what is down or deploying.",
        schema: { project: z.string().describe("Project ID (railway_projects lists them)"),
                   environment: z.string().optional().describe("Name or ID of an environment (empty: all)") },
        async run({ project, environment }, p) {
          const d = await railwayGraphql(p, "query($id: String!) { project(id: $id) { name environments { edges { node { id name "
            + "serviceInstances { edges { node { serviceId serviceName region numReplicas latestDeployment { id status createdAt "
            + "staticUrl } } } } } } } } }", { id: project });
          return nodes(d?.project?.environments).filter((e) => !environment || e.id === environment || e.name === environment).map((e) => ({
            environment: e.name, id: e.id,
            services: nodes(e.serviceInstances).map((s) => {
              const u = s.latestDeployment;
              return { service: s.serviceName, id: s.serviceId, region: s.region, replicas: s.numReplicas,
                deployment: u ? { id: u.id, status: u.status, date: u.createdAt,
                  url: u.staticUrl ? (/^https?:\/\//.test(u.staticUrl) ? u.staticUrl : `https://${u.staticUrl}`) : null } : null };
            }),
          }));
        } },
    ],
  },
  {
    id: "flyio", name: "Fly.io", category: "developer", description: "Apps, machines, volumes and certificates (Machines API)",
    website: "https://fly.io", docs: "https://docs.fly.io/machines/api/", logo: { simpleIcons: "flydotio" },
    baseUrl: "https://api.machines.dev/v1", allowedOrigins: ["https://api.fly.io"],
    auth: { type: "custom", apply: flyAuthorization },
    fields: [{ id: "token", label: "API token (FlyV1 fm2_…)", secret: true },
             { id: "organization", label: "Organization (slug)", format: "segment", default: "personal",
               help: "“personal” for your personal organization; the others appear with fly orgs list." }],
    help: "1) With flyctl installed and signed in (fly auth login), create a read-only token for the organization: "
      + "fly tokens create readonly -o <organization> -x 8760h. If you will start, stop or modify machines, create an organization one: "
      + "fly tokens create org -o <organization> -x 8760h (also from fly.io/dashboard → “Tokens”). 2) Copy the full token, "
      + "including “FlyV1 ”. 3) Enter the organization slug (personal for yours). Deploy tokens (fly tokens deploy) "
      + "only work for one app and do not pass the connection test.",
    test: { path: "/apps?org_slug={organization}",
              account: (d, c) => `${c.organization} (${d.total_apps ?? (d.apps || []).length} apps)` },
    examples: "{app} is the app name. Examples: GET /apps?org_slug=personal, GET /apps/{app}, GET /apps/{app}/machines, "
      + "GET /apps/{app}/machines/{id}, POST /apps/{app}/machines/{id}/stop, POST /apps/{app}/machines/{id}/start, "
      + "POST /apps/{app}/machines/{id}/suspend, GET /apps/{app}/machines/{id}/wait?state=started, GET /apps/{app}/volumes, "
      + "GET /apps/{app}/volumes/{id}/snapshots, GET /apps/{app}/certificates, GET /apps/{app}/certificates/{domain}, "
      + "POST /apps/{app}/certificates/{domain}/check. App IPs are not in the Machines API but in the GraphQL API: "
      + "POST https://api.fly.io/graphql {\"query\": \"{ app(name: \\\"…\\\") { ipAddresses { nodes { address type region } } } }\"}.",
    tools: [
      { name: "flyio_machines", title: "Fly.io: machines of an app", annotations: { readOnlyHint: true },
        description: "Machines of an app with status (started, stopped, suspended…), region, process group, image, CPU, "
          + "memory, private IP and dates, without the full configuration.",
        schema: { app: z.string().describe("App name (GET /apps?org_slug=… lists them)"),
                   region: z.string().optional().describe("Only those in this region, e.g. iad or cdg"),
                   status: z.string().optional().describe("Only those in this state, e.g. started or stopped") },
        async run({ app, region, status: state }, p) {
          const d = ensureOk(await p({ path: `/apps/${encodeURIComponent(app)}/machines` }), "Fly.io");
          return (Array.isArray(d) ? d : []).filter((m) => (!region || m.region === region) && (!state || m.state === state))
            .map((m) => ({ id: m.id, name: m.name, status: m.state, region: m.region, group: m.config?.metadata?.fly_process_group,
              image: m.config?.image, cpus: m.config?.guest?.cpus, cpu_type: m.config?.guest?.cpu_kind,
              memory_mb: m.config?.guest?.memory_mb, private_ip: m.private_ip, created: m.created_at, updated: m.updated_at }));
        } },
    ],
  },
  {
    id: "vault", name: "HashiCorp Vault", category: "developer", description: "Secrets (KV), policies, tokens, PKI and cluster status",
    website: "https://www.hashicorp.com/products/vault", docs: "https://developer.hashicorp.com/vault/api-docs", logo: { simpleIcons: "vault" },
    baseUrl: "{url}/v1", headers: (c) => (c.namespace ? { "X-Vault-Namespace": c.namespace } : {}),
    auth: { type: "header", name: "X-Vault-Token" },
    fields: [{ id: "url", label: "Vault URL", format: "url",
               help: "Your server's URL, with the port if it has one, e.g. https://vault.example.com:8200 (without /v1); in HCP Vault "
                 + "Dedicated, the “Public cluster URL”." },
             { id: "token", label: "Token (hvs.…)", secret: true },
             { id: "namespace", label: "Namespace", optional: true,
               help: "Only in Vault Enterprise or HCP Vault Dedicated (e.g. admin)." }],
    help: "1) Create a policy with just what is needed, e.g. read-only: vault policy write conector-read policy.hcl, with the capabilities "
      + "read and list on the paths it will query (e.g. secret/data/* and secret/metadata/*). 2) Create a token with that policy: "
      + "vault token create -policy=conector-read -display-name=conector -orphan -period=720h, and copy the “token” value (hvs.…). "
      + "3) A periodic token expires if it is not renewed within its period (here, 30 days): renew it with vault token renew or by asking "
      + "the agent to POST /auth/token/renew-self. In Vault Enterprise or HCP Vault Dedicated also enter the namespace.",
    test: { path: "/auth/token/lookup-self",
              account: (d) => [d.data?.display_name, (d.data?.policies || []).join(", ")].filter(Boolean).join(" · ") },
    examples: "Each path needs permission in the token's policy. KV v2 (“secret” engine): GET /secret/metadata/{folder}?list=true "
      + "(lists keys, without values), GET /secret/data/{path} (reads the secret: returns the values in plain text), GET /secret/metadata/{path} "
      + "(versions and dates), POST /secret/data/{path} {\"data\": {\"key\": \"value\"}} (creates a new version). Others: GET /sys/health, "
      + "GET /sys/seal-status, GET /sys/mounts, GET /sys/auth, GET /sys/policies/acl?list=true, GET /sys/policies/acl/{name}, "
      + "GET /sys/audit, GET /auth/token/lookup-self, POST /auth/token/renew-self, GET /identity/entity/id?list=true, "
      + "POST /pki/issue/{role} {\"common_name\": \"…\", \"ttl\": \"72h\"}, GET /database/creds/{role}, "
      + "POST /transit/encrypt/{key} {\"plaintext\": \"<base64>\"}. To list use GET with list=true (equivalent to LIST).",
    tools: [
      { name: "vault_list", title: "Vault: list secrets (without values)", annotations: { readOnlyHint: true },
        description: "Lists the keys and subfolders (ending in /) of a path in a KV engine without reading any value. To read a "
          + "specific secret, use vault_request with GET /{engine}/data/{path} (KV v2) or GET /{engine}/{path} (KV v1).",
        schema: { engine: z.string().default("secret").describe("Path of the KV engine, e.g. secret or kv (GET /sys/mounts lists them)"),
                   path: z.string().default("").describe("Folder inside the engine, e.g. apps/web (empty: the root)"),
                   version: z.enum(["2", "1"]).default("2").describe("KV engine version") },
        async run({ engine, path: folder, version }, p) {
          const clean = (t) => String(t).split("/").filter(Boolean).map(encodeURIComponent).join("/");
          const r = await p({ path: `/${clean(engine)}${version === "2" ? "/metadata" : ""}/${clean(folder)}`, query: { list: true } });
          if (r.status === 404) return { keys: [], notice: "Nothing at that path (or the engine is not KV of that version)" };
          return { keys: ensureOk(r, "Vault")?.data?.keys || [] };
        } },
    ],
  },
  {
    id: "statuspage", name: "Atlassian Statuspage", category: "developer",
    description: "Status pages: components, incidents and maintenances",
    website: "https://www.atlassian.com/software/statuspage", docs: "https://developer.statuspage.io/", logo: { simpleIcons: "statuspage" },
    baseUrl: "https://api.statuspage.io/v1",
    auth: { type: "header", name: "Authorization", prefix: "OAuth " },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) In manage.statuspage.io: your avatar → “API info”. 2) Click “Create key”, give it a name and copy the key (on that same "
      + "screen you will see the “Page ID” of each page). The key acts with your permissions on all the organization's pages; to "
      + "limit it, create it with a dedicated user with just the right role.",
    test: { path: "/pages", account: (d) => (Array.isArray(d) ? d : []).map((x) => x.name).join(", "),
              message: "Key is valid, but it sees no pages" },
    examples: "{page_id} comes from GET /pages. Examples: GET /pages, GET /pages/{page_id}/components, "
      + "PATCH /pages/{page_id}/components/{id} {\"component\": {\"status\": \"degraded_performance\"}} (operational, "
      + "degraded_performance, partial_outage, major_outage, under_maintenance), GET /pages/{page_id}/component-groups, "
      + "GET /pages/{page_id}/incidents/unresolved, GET /pages/{page_id}/incidents?q=…&limit=20, "
      + "GET /pages/{page_id}/incidents/scheduled (maintenances), POST /pages/{page_id}/incidents {\"incident\": {\"name\": \"…\", "
      + "\"status\": \"investigating\", \"body\": \"…\", \"component_ids\": [\"…\"], \"components\": {\"{id}\": \"partial_outage\"}, "
      + "\"deliver_notifications\": true}}, PATCH /pages/{page_id}/incidents/{id} {\"incident\": {\"status\": \"resolved\", "
      + "\"body\": \"…\"}}, GET /pages/{page_id}/subscribers.",
    tools: [
      { name: "statuspage_status", title: "Statuspage: status of a page", annotations: { readOnlyHint: true },
        description: "Components of a status page with their current status (operational, degraded_performance, partial_outage, "
          + "major_outage, under_maintenance) and unresolved incidents with their latest update.",
        schema: { page: z.string().optional().describe("Page ID (empty: the only one in the account; GET /pages lists them)") },
        async run({ page }, p) {
          let id = page;
          if (!id) {
            const pages = ensureOk(await p({ path: "/pages" }), "Statuspage") || [];
            if (pages.length !== 1) {
              throw new Error(`Specify the page: ${pages.map((x) => `${x.id} (${x.name})`).join(", ") || "there are no pages"}`);
            }
            id = pages[0].id;
          }
          const pagePath = `/pages/${encodeURIComponent(id)}`;
          const components = ensureOk(await p({ path: `${pagePath}/components`, query: { per_page: 100 } }), "Statuspage") || [];
          const incidents = ensureOk(await p({ path: `${pagePath}/incidents/unresolved` }), "Statuspage") || [];
          const groups = new Map(components.filter((c) => c.group).map((c) => [c.id, c.name]));
          return {
            components: components.filter((c) => !c.group).map((c) => ({ id: c.id, name: c.name, status: c.status,
              group: groups.get(c.group_id) || null, updated: c.updated_at })),
            incidents: incidents.map((i) => {
              const u = i.incident_updates?.[0];
              return { id: i.id, name: i.name, status: i.status, impact: i.impact, created: i.created_at, link: i.shortlink,
                components: (i.components || []).map((c) => c.name),
                latest: u ? { status: u.status, text: String(u.body || "").slice(0, 300), date: u.created_at } : null };
            }),
          };
        } },
    ],
  },
  {
    id: "incidentio", name: "incident.io", category: "developer",
    description: "Incidents, severities, on-call, alerts and follow-ups",
    website: "https://incident.io", docs: "https://docs.incident.io/api-reference/introduction", logo: { favicon: "https://incident.io" },
    baseUrl: "https://api.incident.io",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) In app.incident.io → “Settings” → “API keys” → “Add new” (you must be an administrator). 2) Give it a name and select only the "
      + "permissions you will use: view data and public incidents to read and, if needed, view private incidents, create "
      + "incidents or edit them. 3) Click “Create” and copy the key: it is shown only once.",
    test: { path: "/v1/identity",
              account: (d) => [String(d.identity?.dashboard_url || "").split("/").filter(Boolean).pop(), d.identity?.name]
                .filter(Boolean).join(" · ") },
    examples: "Examples: GET /v1/identity (the key's permissions), GET /v2/incidents?page_size=25&status_category[one_of]=live "
      + "(live = active; also triage, learning = post-incident, closed…), GET /v2/incidents/{id}, "
      + "GET /v2/incident_updates?incident_id=…, GET /v2/incident_timeline_items?incident_id=…, GET /v1/severities, "
      + "GET /v1/incident_statuses, GET /v1/incident_types, GET /v2/incident_roles, GET /v2/custom_fields, "
      + "POST /v2/incidents {\"idempotency_key\": \"…\", \"visibility\": \"public\", \"name\": \"…\", \"severity_id\": \"…\", "
      + "\"summary\": \"…\"}, POST /v2/incidents/{id}/actions/edit {\"incident\": {\"summary\": \"…\"}, \"notify_incident_channel\": true}, "
      + "GET /v3/follow_ups?incident_id=…, GET /v2/schedules, GET /v2/schedule_entries?schedule_id=…&entry_window_start=…, "
      + "GET /v2/alerts?page_size=25, GET /v2/escalations, GET /v2/status_pages, GET /v3/catalog_types, "
      + "GET /v3/catalog_entries?catalog_type_id=…&page_size=50, GET /v2/users?email=…. Pagination: after=pagination_meta.after.",
    tools: [
      { name: "incidentio_incidents", title: "incident.io: incidents", annotations: { readOnlyHint: true },
        description: "Incidents from newest to oldest (by default, active and in triage) with reference (INC-…), status, "
          + "severity, type, lead, summary, dates and link.",
        schema: { categories: z.array(z.enum(["triage", "live", "learning", "paused", "closed", "declined", "merged", "canceled"])).min(1)
                     .default(["triage", "live"]).describe("Status categories: live = active, learning = post-incident"),
                   since: z.string().optional().describe("Only those created since this date (YYYY-MM-DD)"),
                   max: z.number().int().min(1).max(250).default(25),
                   after: z.string().optional().describe("Cursor for the next page (the “next” field of the previous response)") },
        async run({ categories, since, max, after }, p) {
          const filters = new URLSearchParams(categories.map((c) => ["status_category[one_of]", c]));
          if (since) filters.set("created_at[gte]", since);
          const d = ensureOk(await p({ path: `/v2/incidents?${filters}`, query: { page_size: max, after: after } }), "incident.io");
          return {
            incidents: (d.incidents || []).map((i) => ({ id: i.id, reference: i.reference, name: i.name,
              status: i.incident_status?.name, category: i.incident_status?.category, severity: i.severity?.name,
              type: i.incident_type?.name, mode: i.mode, visibility: i.visibility,
              lead: (i.incident_role_assignments || []).find((a) => a.role?.role_type === "lead")?.assignee?.name || null,
              summary: typeof i.summary === "string" ? i.summary.slice(0, 300) : null, created: i.created_at, updated: i.updated_at,
              link: i.permalink })),
            next: d.pagination_meta?.after || null,
          };
        } },
    ],
  },
  {
    id: "sonarqube", name: "SonarQube Cloud", category: "developer",
    description: "Code quality and security: issues, hotspots and quality gates",
    website: "https://www.sonarsource.com/products/sonarqube/cloud/", docs: "https://sonarcloud.io/web_api",
    logo: { simpleIcons: "sonarqubecloud" },
    baseUrl: "{url}/api",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "User token", secret: true },
             { id: "url", label: "SonarQube URL", format: "url", default: "https://sonarcloud.io",
               help: "Leave it as is for SonarQube Cloud (EU region); for the US region, https://sonarqube.us; for SonarQube Server, the "
                 + "URL of your installation." }],
    keyUrl: "https://sonarcloud.io/account/security",
    help: "1) In sonarcloud.io (or sonarqube.us): your avatar → “My Account” → “Security”. 2) In “Generate Tokens” give it a name and click "
      + "“Generate”. 3) Copy the token: it is shown only once. It acts with your permissions in all your organizations. With SonarQube Server "
      + "it is created the same way (“My Account” → “Security”) and must be a “User token”; project analysis tokens do not work for queries.",
    // validate answers 200 both when the token is valid ({"valid": true}) and when it is not ({"valid": false}).
    test: { path: "/authentication/validate", message: "Token is valid", validate: (d) => {
      if (d?.valid !== true) throw new Error("SonarQube: the token is not valid or has expired");
    } },
    examples: "Paths are relative to /api; in SonarQube Cloud almost all require organization=… or the project key. Examples: "
      + "GET /organizations/search?member=true (your organizations), GET /projects/search?organization=…&ps=100, "
      + "GET /issues/search?componentKeys={project}&resolved=false&impactSeverities=BLOCKER,HIGH&ps=100, "
      + "GET /hotspots/search?projectKey={project}&status=TO_REVIEW, "
      + "GET /measures/component?component={project}&metricKeys=alert_status,coverage,software_quality_security_issues, "
      + "GET /project_branches/list?project={project}, GET /project_pull_requests/list?project={project}, "
      + "GET /ce/activity?component={project}&ps=10 (latest analyses), GET /rules/show?key={rule}&organization=…, "
      + "GET /sources/raw?key={project}:{file path}, POST /issues/do_transition as a form (issue=…&transition=accept, "
      + "falsepositive or reopen), POST /issues/add_comment as a form (issue=…&text=…).",
    tools: [
      { name: "sonarqube_issues", title: "SonarQube Cloud: issues", annotations: { readOnlyHint: true },
        description: "Open issues of a project (or of a whole organization), from most to least severe, with rule, message, "
          + "file and line, impact (security, reliability or maintainability and its severity), status, author and date.",
        schema: { project: z.string().optional().describe("Project key (GET /projects/search?organization=… lists them)"),
                   organization: z.string().optional().describe("Organization key; required if you do not specify the project"),
                   qualities: z.array(z.enum(["SECURITY", "RELIABILITY", "MAINTAINABILITY"])).optional()
                     .describe("Only those affecting these qualities"),
                   severities: z.array(z.enum(["BLOCKER", "HIGH", "MEDIUM", "LOW", "INFO"])).optional(),
                   branch: z.string().optional().describe("Branch (empty: the main one)"),
                   pull_request: z.string().optional().describe("ID of an analyzed pull request"),
                   max: z.number().int().min(1).max(500).default(50),
                   page: z.number().int().min(1).default(1) },
        async run({ project, organization, qualities, severities, branch, pull_request, max, page }, p) {
          if (!project && !organization) throw new Error("Specify the project or the organization");
          const d = ensureOk(await p({ path: "/issues/search", query: { componentKeys: project, organization: organization, resolved: false,
            impactSoftwareQualities: qualities?.join(","), impactSeverities: severities?.join(","), branch: branch,
            pullRequest: pull_request, s: "IMPACT_RANK", asc: true, ps: max, p: page } }), "SonarQube");
          return {
            total: d.paging?.total ?? d.total,
            issues: (d.issues || []).map((i) => ({ key: i.key, rule: i.rule, message: i.message,
              project: i.project, file: String(i.component || "").replace(`${i.project}:`, ""), line: i.line,
              impact: (i.impacts || []).map((x) => `${x.softwareQuality}:${x.severity}`), status: i.issueStatus || i.status,
              tags: i.tags, author: i.author || null, assignee: i.assignee || null, effort: i.effort, created: i.creationDate })),
          };
        } },
      { name: "sonarqube_status", title: "SonarQube Cloud: quality status of a project", annotations: { readOnlyHint: true },
        description: "Quality gate of a project (OK or ERROR and the failing conditions) and its key metrics: security, reliability "
          + "and maintainability issues, new issues, security hotspots and percentage reviewed, ratings (A-E), coverage, "
          + "duplication and lines of code.",
        schema: { project: z.string().describe("Project key"),
                   branch: z.string().optional().describe("Branch (empty: the main one)"),
                   pull_request: z.string().optional().describe("ID of an analyzed pull request") },
        async run({ project, branch, pull_request }, p) {
          const fetchMetrics = (metrics) => p({ path: "/measures/component",
            query: { component: project, branch: branch, pullRequest: pull_request, metricKeys: metrics.join(",") } });
          let r = await fetchMetrics(SONAR_METRICS);
          // Older SonarQube Server does not have all the metrics: repeat without the missing ones.
          const missing = r.status === 404 && /metric keys are not found: (.+)$/i.exec(r.data?.errors?.[0]?.msg || "");
          if (missing) {
            const drop = new Set(missing[1].split(/,\s*/));
            r = await fetchMetrics(SONAR_METRICS.filter((k) => !drop.has(k)));
          }
          const d = ensureOk(r, "SonarQube");
          const m = Object.fromEntries((d.component?.measures || []).map((x) => [x.metric, x.value ?? x.period?.value
            ?? x.periods?.[0]?.value]));
          let conditions = [];
          try {
            conditions = JSON.parse(m.quality_gate_details || "{}").conditions || [];
          } catch {
            conditions = [];
          }
          return {
            project: d.component?.name, quality_gate: m.alert_status || "NONE",
            failed_conditions: conditions.filter((c) => c.level && c.level !== "OK").map((c) => ({ metric: c.metric,
              value: c.actual, threshold: `${c.op === "LT" ? "minimum" : "maximum"} ${c.error}`, level: c.level,
              new_code: Boolean(c.period) })),
            issues: { security: numOrNull(m.software_quality_security_issues), reliability: numOrNull(m.software_quality_reliability_issues),
              maintainability: numOrNull(m.software_quality_maintainability_issues), new_issues: numOrNull(m.new_violations) },
            hotspots: { total: numOrNull(m.security_hotspots), reviewed_pct: numOrNull(m.security_hotspots_reviewed) },
            ratings: { security: grade(m.security_rating), reliability: grade(m.reliability_rating), maintainability: grade(m.sqale_rating),
              security_review: grade(m.security_review_rating) },
            coverage_pct: numOrNull(m.coverage), duplication_pct: numOrNull(m.duplicated_lines_density), lines: numOrNull(m.ncloc),
          };
        } },
    ],
  },
  {
    id: "algolia", name: "Algolia", category: "developer", description: "Indices, searches, records, rules, synonyms and analytics",
    website: "https://www.algolia.com", docs: "https://www.algolia.com/doc/rest-api/search/", logo: { simpleIcons: "algolia" },
    baseUrl: "https://{app_id}.algolia.net/1",
    allowedOrigins: ["https://{app_id}-dsn.algolia.net", "https://analytics.algolia.com", "https://analytics.us.algolia.com",
      "https://analytics.de.algolia.com", "https://insights.algolia.io", "https://usage.algolia.com"],
    auth: [{ type: "header", name: "X-Algolia-Application-Id", field: "app_id" },
           { type: "header", name: "X-Algolia-API-Key", field: "token" }],
    fields: [{ id: "app_id", label: "Application ID", format: "subdomain", example: "latency",
               help: "In the Algolia dashboard: “Settings” → “API Keys” (e.g. ABCD1234EF)." },
             { id: "token", label: "API key", secret: true }],
    keyUrl: "https://dashboard.algolia.com/account/api-keys/all",
    help: "1) In dashboard.algolia.com → “Settings” → “API Keys” copy the “Application ID”. 2) Better to use a dedicated key with just the "
      + "right permissions: in “All API Keys” → “New API Key”, give it a description, limit it to the indices you want and select the necessary ACLs "
      + "(search, browse and listIndexes to read; settings, addObject or deleteObject only if you will change something; analytics for "
      + "statistics). 3) Click “Create” and copy the key. The “Admin API Key” also works, but it gives full control of the application.",
    // A key without the listIndexes permission gets 403 “Method not allowed with this API key”; an invalid key, 403 “Invalid…”.
    test: { path: "/indexes", acceptStatus: [403],
              validate: (d, r) => {
                if (r.status === 403 && !/not allowed/i.test(d?.message || "")) throw new Error(`Algolia: ${d?.message || "invalid key"}`);
              },
              message: (d) => (Array.isArray(d?.items)
                ? `API key is valid: ${d.items.length}${d.nbPages > 1 ? "+" : ""} indices (${d.items.slice(0, 4).map((x) => x.name).join(", ")})`
                : "API key is valid (without the listIndexes permission to list the indices)") },
    examples: "Paths are relative to /1. Examples: GET /indexes, POST /indexes/{index}/query {\"query\": \"…\", \"filters\": "
      + "\"category:books AND price < 20\", \"hitsPerPage\": 20, \"analytics\": false}, "
      + "POST /indexes/*/queries {\"requests\": [{\"indexName\": \"…\", \"query\": \"…\"}]}, "
      + "POST /indexes/{index}/browse {\"hitsPerPage\": 1000} (all records; continue with the cursor), "
      + "GET /indexes/{index}/{objectID}, GET /indexes/{index}/settings, PUT /indexes/{index}/settings {…}, "
      + "PUT /indexes/{index}/{objectID} {…} (creates or replaces), POST /indexes/{index}/{objectID}/partial {…}, "
      + "POST /indexes/{index}/batch {\"requests\": [{\"action\": \"addObject\", \"body\": {…}}]}, DELETE /indexes/{index}/{objectID}, "
      + "GET /indexes/{index}/task/{taskID} (status of a write), POST /indexes/{index}/rules/search {\"query\": \"\"}, "
      + "POST /indexes/{index}/synonyms/search {\"query\": \"\"}, GET /keys, GET /logs?length=20. Analytics (full URL; "
      + "analytics.de.algolia.com if the application is in the EU): GET https://analytics.algolia.com/2/searches?index=…, "
      + "GET https://analytics.algolia.com/2/searches/noResults?index=…, GET https://analytics.algolia.com/2/clicks/clickThroughRate?index=….",
    tools: [
      { name: "algolia_search", title: "Algolia: search an index", annotations: { readOnlyHint: true },
        description: "Searches an index and returns the total number of results and the records found (with the requested attributes), with "
          + "optional filters. The search does not count towards analytics.",
        schema: { index: z.string().describe("Index name (GET /indexes lists them)"),
                   query: z.string().default("").describe("Text to search (empty: all records)"),
                   filters: z.string().optional().describe("Algolia filter, e.g. category:books AND price < 20"),
                   attributes: z.array(z.string()).optional().describe("Attributes to return (empty: those configured in the index)"),
                   max: z.number().int().min(1).max(100).default(20),
                   page: z.number().int().min(0).default(0).describe("Page, starting at 0") },
        async run({ index, query, filters, attributes, max, page }, p) {
          const d = ensureOk(await p({ method: "POST", path: `/indexes/${encodeURIComponent(index)}/query`,
            body: { query: query, filters: filters, attributesToRetrieve: attributes, hitsPerPage: max, page: page,
              attributesToHighlight: [], attributesToSnippet: [], analytics: false, clickAnalytics: false } }), "Algolia");
          return { total: d.nbHits, page: d.page, pages: d.nbPages,
            records: (d.hits || []).map(({ _highlightResult, _snippetResult, _rankingInfo, ...h }) => h) };
        } },
    ],
  },
  {
    id: "pinecone", name: "Pinecone", category: "developer",
    description: "Vector indexes, semantic search, namespaces and embeddings",
    website: "https://www.pinecone.io", docs: "https://docs.pinecone.io/reference/api/introduction", logo: { favicon: "https://www.pinecone.io" },
    baseUrl: "https://api.pinecone.io", allowedOrigins: ["^https://[a-z0-9-]+(\\.[a-z0-9-]+)*\\.pinecone\\.io$"],
    headers: (c) => ({ "X-Pinecone-API-Version": c.version || PINECONE_VERSION }),
    auth: { type: "header", name: "Api-Key" },
    fields: [{ id: "token", label: "API key", secret: true },
             { id: "version", label: "API version", default: PINECONE_VERSION, optional: true,
               help: "Change it only if you need another one (format YYYY-MM)." }],
    // No OAuth: “Pinecone Connect” is a widget for partners that hands over an API key, not OAuth 2.0 with your own application.
    keyUrl: "https://app.pinecone.io/organizations/-/projects/-/keys",
    help: "1) In app.pinecone.io choose the project → “API keys” → “Create API key”. 2) Give it a name and choose the permissions: “All” or, with "
      + "“Custom”, read-only on the control plane and the data plane to query (“ReadWrite” if you will create indexes or write "
      + "vectors). 3) Click “Create key” and copy it: it is shown only once. Each key gives access to a single project.",
    test: { path: "/indexes", message: (d) => {
      const l = d?.indexes || [];
      return l.length ? `API key is valid: ${l.length} indexes (${l.slice(0, 4).map((x) => x.name).join(", ")})` : "API key is valid (no indexes yet)";
    } },
    examples: "The control plane is at api.pinecone.io; data operations go to the host of each index (host field of "
      + "GET /indexes/{name}). Examples: GET /indexes, GET /indexes/{name}, POST https://{host}/describe_index_stats {}, "
      + "POST https://{host}/query {\"vector\": […], \"topK\": 10, \"namespace\": \"…\", \"filter\": {\"type\": {\"$eq\": \"faq\"}}, "
      + "\"includeMetadata\": true}, POST https://{host}/records/namespaces/{namespace}/search {\"query\": {\"inputs\": {\"text\": \"…\"}, "
      + "\"top_k\": 10}} (indexes with integrated embeddings), GET https://{host}/vectors/fetch?ids=…&namespace=…, "
      + "GET https://{host}/vectors/list?namespace=…&prefix=…, GET https://{host}/namespaces, "
      + "POST https://{host}/vectors/upsert {\"vectors\": [{\"id\": \"…\", \"values\": […], \"metadata\": {…}}], \"namespace\": \"…\"}, "
      + "POST https://{host}/vectors/delete {\"ids\": [\"…\"], \"namespace\": \"…\"}, POST /embed {\"model\": \"multilingual-e5-large\", "
      + "\"parameters\": {\"input_type\": \"query\"}, \"inputs\": [{\"text\": \"…\"}]}, POST /rerank, GET /backups, GET /collections.",
    tools: [
      { name: "pinecone_search", title: "Pinecone: semantic search in an index", annotations: { readOnlyHint: true },
        description: "Searches an index for the records most similar to a text (indexes with integrated embeddings) or to a vector and "
          + "returns ID, score and fields or metadata. It finds the index host by itself.",
        schema: { index: z.string().describe("Index name (GET /indexes lists them)"),
                   text: z.string().optional().describe("Text to search (only indexes with integrated embeddings)"),
                   vector: z.array(z.number()).optional().describe("Query vector (same dimension as the index), instead of the text"),
                   namespace: z.string().optional().describe("Namespace (empty: the default one)"),
                   filter: z.record(z.string(), z.any()).optional().describe("Metadata filter, e.g. {\"type\": {\"$eq\": \"faq\"}}"),
                   fields: z.array(z.string()).optional().describe("Fields or metadata to return (empty: all)"),
                   max: z.number().int().min(1).max(100).default(10) },
        async run({ index, text, vector, namespace, filter, fields, max }, p) {
          if (!text && !vector?.length) throw new Error("Specify the text or the vector to search for");
          const info = ensureOk(await p({ path: `/indexes/${encodeURIComponent(index)}` }), "Pinecone");
          if (!info?.host) throw new Error(`Pinecone: index “${index}” has no host yet (is it ready?)`);
          const host = `https://${String(info.host).replace(/^https?:\/\//, "")}`;
          if (vector?.length) {
            const d = ensureOk(await p({ method: "POST", path: `${host}/query`,
              body: { vector, topK: max, namespace: namespace || "", filter: filter, includeMetadata: true } }), "Pinecone");
            return (d.matches || []).map((m) => ({ id: m.id, score: m.score, metadata: fields?.length
              ? Object.fromEntries(Object.entries(m.metadata || {}).filter(([k]) => fields.includes(k))) : m.metadata }));
          }
          const d = ensureOk(await p({ method: "POST",
            path: `${host}/records/namespaces/${encodeURIComponent(namespace || "__default__")}/search`,
            body: { query: { inputs: { text: text }, top_k: max, filter: filter }, fields: fields } }), "Pinecone");
          return (d.result?.hits || []).map((h) => ({ id: h._id, score: h._score, fields: h.fields }));
        } },
    ],
  },
  {
    id: "qdrant", name: "Qdrant", category: "developer", description: "Collections, vector search, points, payloads and snapshots",
    website: "https://qdrant.tech", docs: "https://api.qdrant.tech/api-reference", logo: { simpleIcons: "qdrant" },
    baseUrl: "{url}",
    auth: { type: "header", name: "api-key" },
    fields: [{ id: "url", label: "Qdrant URL", format: "url",
               help: "In Qdrant Cloud, the cluster endpoint with port 6333, e.g. https://xyz.eu-central-1-0.aws.cloud.qdrant.io:6333; "
                 + "on a self-hosted installation, its public URL (http://localhost:6333 only if it runs on this server)." },
             { id: "token", label: "API key", secret: true, optional: true,
               help: "Leave it empty only if your Qdrant does not require a key." }],
    help: "Qdrant Cloud: 1) In cloud.qdrant.io → “Clusters” → your cluster, copy its endpoint (add :6333 at the end if it does not have it). 2) In "
      + "the “API Keys” tab create a key with just the right access (read-only if you will only query, or limited to some "
      + "collections) and copy it: it is shown only once. Self-hosted installation: its URL and the key defined in service.api_key (or "
      + "service.read_only_api_key for read-only) in the configuration.",
    test: { path: "/collections", message: (d) => {
      const l = d?.result?.collections || [];
      return l.length ? `Connection successful: ${l.length} collections (${l.slice(0, 4).map((x) => x.name).join(", ")})`
        : "Connection successful (no collections yet)";
    } },
    examples: "Examples: GET /collections, GET /collections/{c} (status, points and configuration), POST /collections/{c}/points/query "
      + "{\"query\": [0.12, …], \"limit\": 10, \"with_payload\": true, \"filter\": {\"must\": [{\"key\": \"city\", \"match\": "
      + "{\"value\": \"London\"}}]}}, POST /collections/{c}/points/scroll {\"limit\": 50, \"with_payload\": true, \"filter\": {…}}, "
      + "POST /collections/{c}/points/count {\"exact\": true}, POST /collections/{c}/points {\"ids\": [1, 2], \"with_payload\": true}, "
      + "PUT /collections/{c}/points?wait=true {\"points\": [{\"id\": 1, \"vector\": […], \"payload\": {…}}]}, "
      + "POST /collections/{c}/points/delete?wait=true {\"points\": [1]}, PUT /collections/{c}/index {\"field_name\": \"city\", "
      + "\"field_schema\": \"keyword\"}, GET /collections/{c}/snapshots, POST /collections/{c}/snapshots, GET /aliases, GET /cluster.",
    tools: [
      { name: "qdrant_collections", title: "Qdrant: collections", annotations: { readOnlyHint: true },
        description: "Collections with their status (green, yellow, red), number of points and indexed vectors, segments, vectors "
          + "(size and distance), shards, replicas and indexed payload fields.",
        schema: { name: z.string().optional().describe("Only this collection (empty: all, up to 30)") },
        async run({ name }, p) {
          const names = name ? [name]
            : (ensureOk(await p({ path: "/collections" }), "Qdrant")?.result?.collections || []).map((c) => c.name);
          const vectors = (v) => (!v ? null : typeof v.size === "number" ? { size: v.size, distance: v.distance }
            : Object.fromEntries(Object.entries(v).map(([k, x]) => [k, { size: x?.size, distance: x?.distance }])));
          const collections = [];
          for (const n of names.slice(0, 30)) {
            const r = ensureOk(await p({ path: `/collections/${encodeURIComponent(n)}` }), "Qdrant")?.result || {};
            const params = r.config?.params || {};
            collections.push({ name: n, status: r.status,
              optimizer: typeof r.optimizer_status === "string" ? r.optimizer_status : r.optimizer_status?.error || null,
              points: r.points_count, indexed_vectors: r.indexed_vectors_count, segments: r.segments_count,
              vectors: vectors(params.vectors), sparse_vectors: Object.keys(params.sparse_vectors || {}),
              shards: params.shard_number, replicas: params.replication_factor,
              indexed_fields: Object.fromEntries(Object.entries(r.payload_schema || {}).map(([k, x]) => [k, x?.data_type])) });
          }
          return { collections, total: names.length };
        } },
    ],
  },
  {
    id: "neon", name: "Neon", category: "developer", description: "Serverless Postgres: projects, branches, endpoints and usage",
    website: "https://neon.com", docs: "https://api-docs.neon.tech/reference/getting-started-with-neon-api", logo: { simpleIcons: "neon" },
    baseUrl: "https://console.neon.tech/api/v2",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    // No OAuth: Neon only grants OAuth applications to partners with a commercial relationship.
    keyUrl: "https://console.neon.tech/app/settings/api-keys",
    help: "1) In console.neon.tech: your avatar → “Account settings” → “API keys” → “Create new API key”; give it a name and copy the key: "
      + "it is shown only once. It acts with your permissions in all your organizations. 2) Alternative, if you are an admin: an organization "
      + "key, in the organization → “Settings” → “API keys” → “Create new”, which can be limited to a single project "
      + "(“Project-scoped”).",
    // With a personal key and several organizations, Neon may require org_id (400): the key is valid anyway.
    test: { path: "/projects", query: { limit: 1 }, acceptStatus: [400],
              validate: (d, r) => {
                if (r.status === 400 && !/org_id/i.test(d?.message || "")) throw new Error(`Neon: ${d?.message || "request rejected"}`);
              },
              message: (d) => (d?.projects?.length ? `API key is valid (it sees projects, e.g. ${d.projects[0].name})`
                : "API key is valid (to see an organization's projects, specify org_id)") },
    examples: "Examples: GET /users/me, GET /users/me/organizations (with its org_id), GET /projects?org_id=…&limit=100, "
      + "GET /projects/{id}, GET /projects/{id}/branches, GET /projects/{id}/branches/{branch}/databases, "
      + "GET /projects/{id}/branches/{branch}/roles, GET /projects/{id}/endpoints, POST /projects/{id}/endpoints/{endpoint}/start, "
      + "POST /projects/{id}/endpoints/{endpoint}/suspend, POST /projects/{id}/branches {\"branch\": {\"name\": \"…\"}, "
      + "\"endpoints\": [{\"type\": \"read_write\"}]}, DELETE /projects/{id}/branches/{branch}, GET /projects/{id}/operations?limit=20, "
      + "GET /projects/{id}/connection_uri?database_name=neondb&role_name=neondb_owner (returns the password), "
      + "GET /consumption_history/projects?org_id=…&from=2026-10-01T00:00:00Z&to=2026-10-15T00:00:00Z&granularity=daily (paid "
      + "plans). {branch} is the branch ID (br-…) and {endpoint}, the compute ID (ep-…).",
    tools: [
      { name: "neon_projects", title: "Neon: projects", annotations: { readOnlyHint: true },
        description: "Projects with region, Postgres version, storage, active compute hours in the period, last activity "
          + "and organization, without the full configuration.",
        schema: { organization: z.string().optional()
                     .describe("org_id (GET /users/me/organizations lists them); usually needed with a personal key"),
                   search: z.string().optional().describe("Part of the project name or ID"),
                   max: z.number().int().min(1).max(400).default(100),
                   cursor: z.string().optional().describe("Cursor for the next page (the “next” field of the previous response)") },
        async run({ organization, search, max, cursor }, p) {
          const d = ensureOk(await p({ path: "/projects", query: { org_id: organization, search: search, limit: max, cursor } }), "Neon");
          const projects = d.projects || [];
          return {
            projects: projects.map((x) => ({ id: x.id, name: x.name, region: x.region_id, postgres: x.pg_version,
              storage_mb: numOrNull(x.synthetic_storage_size) === null ? null : Math.round(x.synthetic_storage_size / 1048576),
              active_h: numOrNull(x.active_time) === null ? null : Math.round(x.active_time / 36) / 100,
              last_activity: x.compute_last_active_at || null, organization: x.org_id || null, created: x.created_at })),
            next: projects.length === max ? d.pagination?.cursor || null : null,
          };
        } },
    ],
  },
  {
    id: "upstash", name: "Upstash", category: "developer",
    description: "Redis, Vector, Search and QStash: databases, statistics and backups",
    website: "https://upstash.com", docs: "https://upstash.com/docs/devops/developer-api/introduction", logo: { simpleIcons: "upstash" },
    baseUrl: "https://api.upstash.com/v2",
    auth: { type: "basic", usernameField: "email", passwordField: "token" },
    fields: [{ id: "email", label: "Your Upstash account email" },
             { id: "token", label: "Developer API key", secret: true }],
    keyUrl: "https://console.upstash.com/account/api",
    help: "1) In console.upstash.com → “Account” → “Developer API” tab → “Create API Key”. 2) Give it a name and copy the key: it is "
      + "shown only once. 3) The username is the email you sign in to Upstash with. The Developer API is only available on native "
      + "Upstash accounts, not on those created through Vercel or Fly.io.",
    test: { path: "/redis/databases", message: (d) => `API key is valid: ${(Array.isArray(d) ? d : []).length} Redis databases` },
    examples: "Examples: GET /redis/databases, GET /redis/database/{id}?credentials=hide (without passwords), GET /redis/stats/{id}, "
      + "GET /redis/list-backup/{id}, POST /redis/create-backup/{id} {\"name\": \"…\"}, POST /redis/reset-password/{id}, "
      + "PATCH /redis/update-budget/{id} {\"budget\": 50}, DELETE /redis/database/{id}, GET /vector/index, GET /vector/index/{id}, "
      + "GET /search, GET /search/{id}, GET /qstash/users, GET /qstash/stats/{id}, GET /teams, GET /teams/{id} (members), "
      + "GET /auditlogs.",
    tools: [
      { name: "upstash_redis", title: "Upstash: Redis databases", annotations: { readOnlyHint: true },
        description: "Redis databases with status, plan, primary region, endpoint, TLS, eviction, monthly budget and limits, "
          + "without passwords or tokens.",
        schema: {},
        async run(_, p) {
          const d = ensureOk(await p({ path: "/redis/databases" }), "Upstash");
          return (Array.isArray(d) ? d : []).map((x) => ({ id: x.database_id, name: x.database_name, status: x.state, plan: x.type,
            region: x.primary_region || x.region, read_regions: x.read_regions, endpoint: x.endpoint, port: x.port, tls: x.tls,
            eviction: x.eviction, budget: x.budget, max_commands_s: x.db_max_commands_per_second,
            max_memory_mb: numOrNull(x.db_memory_threshold) === null ? null : Math.round(x.db_memory_threshold / 1048576),
            created: x.creation_time ? new Date(x.creation_time * 1000).toISOString() : null }));
        } },
    ],
  },
  {
    id: "planetscale", name: "PlanetScale", category: "developer",
    description: "Databases, branches, deploy requests, schema and insights",
    website: "https://planetscale.com", docs: "https://planetscale.com/docs/api/reference/getting-started-with-planetscale-api",
    logo: { simpleIcons: "planetscale" },
    baseUrl: "https://api.planetscale.com/v1",
    auth: { type: "custom", apply: (c) => ({ headers: { Authorization: `${c.token_id}:${c.token}` } }) },
    fields: [{ id: "token_id", label: "Service token ID" },
             { id: "token", label: "Service token (pscale_tkn_…)", secret: true }],
    // The scopes are chosen when creating the OAuth application: the authorization request carries no scope.
    oauth: { scopes: [], provider: { name: "PlanetScale", key: "planetscale", redirect: "localhost",
      authorizeUrl: "https://auth.planetscale.com/oauth/authorize", tokenUrl: "https://auth.planetscale.com/oauth/token",
      help: "1) In app.planetscale.com open your organization → “Settings” → “OAuth applications” → “Create new application”. 2) "
        + "Name it “Conector”. In “Domain” enter the origin of the redirect URI shown below (what comes before "
        + "/oauth/callback) and in “Redirect URI”, that full URI. 3) In “Save access scopes” select read_user, read_organizations, "
        + "read_organization, read_databases, read_branches, read_deploy_requests, read_backups, read_members and read_invoices (and the "
        + "write_… or create_… ones you need to make changes) and save. 4) Copy the “Client ID” and the “Client secret” (it is "
        + "shown only once). When connecting, the user chooses which organizations to give access to." } },
    help: "1) In app.planetscale.com, in your organization → “Settings” → “Service tokens” → “New service token”: give it a name and click "
      + "“Create service token”. 2) Copy the ID and the token (pscale_tkn_…): the token is shown only once. 3) Grant just the right "
      + "permissions: on the organization, read_organization and read_databases; on each database you want to query, read_database, "
      + "read_branch and read_deploy_request (create_branch or create_deploy_request only if you will make changes).",
    test: { path: "/organizations", account: (d) => (d.data || []).map((o) => o.name).join(", "),
              message: "Token is valid, but it has no access to any organization" },
    examples: "Examples: GET /organizations, GET /organizations/{org}/databases, GET /organizations/{org}/databases/{db}, "
      + "GET /organizations/{org}/databases/{db}/branches, GET /organizations/{org}/databases/{db}/branches/{branch}/schema, "
      + "GET /organizations/{org}/databases/{db}/branches/{branch}/schema/lint, "
      + "GET /organizations/{org}/databases/{db}/deploy-requests?state=open, "
      + "POST /organizations/{org}/databases/{db}/deploy-requests {\"branch\": \"…\", \"into_branch\": \"main\"}, "
      + "GET /organizations/{org}/databases/{db}/branches/{branch}/backups, "
      + "GET /organizations/{org}/databases/{db}/branches/{branch}/insights (most expensive queries), "
      + "GET /organizations/{org}/databases/{db}/schema-recommendations, GET /organizations/{org}/members, "
      + "GET /organizations/{org}/invoices, GET /organizations/{org}/audit-log. Pagination: page and per_page (follow next_page).",
    tools: [
      { name: "planetscale_databases", title: "PlanetScale: databases", annotations: { readOnlyHint: true },
        description: "Databases of an organization with engine (MySQL/Vitess or Postgres), status, region, plan, default branch, "
          + "number of branches, pending schema recommendations, deletion protection and link.",
        schema: { organization: z.string().describe("Organization name (GET /organizations lists them)"),
                   search: z.string().optional().describe("Part of the database name"),
                   max: z.number().int().min(1).max(100).default(50),
                   page: z.number().int().min(1).default(1) },
        async run({ organization, search, max, page }, p) {
          const d = ensureOk(await p({ path: `/organizations/${encodeURIComponent(organization)}/databases`,
            query: { q: search, per_page: max, page: page } }), "PlanetScale");
          return {
            databases: (d.data || []).map((b) => ({ name: b.name, engine: b.kind, status: b.state, region: b.region?.slug, plan: b.plan,
              default_branch: b.default_branch, production_branches: b.production_branches_count,
              development_branches: b.development_branches_count, recommendations: b.open_schema_recommendations_count,
              deploy_approval_required: b.require_approval_for_deploy, deletion_protected: b.deletion_protected, created: b.created_at,
              link: b.html_url })),
            next: d.next_page || null,
          };
        } },
    ],
  },
];
