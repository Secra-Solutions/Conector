// Websites and stores (2): e-commerce, content management systems and internal search; and cybersecurity: search engines for
// exposed assets, vulnerability databases, leaks and URL reputation. The specific tools return compact summaries;
// the full detail is requested with *_request.
import crypto from "node:crypto";
import { z } from "zod";
import { ensureOk } from "../define.js";

const segment = (v) => encodeURIComponent(String(v).trim());
const shorten = (t, n = 300) => (typeof t === "string" && t.length > n ? `${t.slice(0, n)}…` : t);
const base64 = (t) => Buffer.from(String(t), "utf8").toString("base64");
const isoDate = (days = 0) => new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
const DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format YYYY-MM-DD");
// ISO 8601 or RFC 2822 dates, or seconds/milliseconds since 1970 → YYYY-MM-DD.
function day(t) {
  if (!t) return undefined;
  const s = String(t);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const n = typeof t === "number" || /^\d{9,}$/.test(s) ? Number(t) : null;
  const d = n === null ? new Date(s) : new Date(n > 1e11 ? n : n * 1000);
  return Number.isNaN(d.getTime()) ? s : d.toISOString().slice(0, 10);
}
const dateTime = (t) => {
  const d = new Date(String(t || ""));
  return Number.isNaN(d.getTime()) ? t || undefined : d.toISOString().slice(0, 16).replace("T", " ");
};
const dropEmpty = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== ""
  && !(Array.isArray(v) && !v.length)));

// Ghost (Admin API): every request carries a 5-minute HS256 JWT signed with the “secret” part (hexadecimal) of the integration's
// “id:secret” key, with kid = id and aud = /admin/.
function ghostToken(key) {
  const [id, secret, ...rest] = String(key || "").trim().split(":");
  if (rest.length || !/^[a-f0-9]+$/i.test(id || "") || !/^[a-f0-9]+$/i.test(secret || "") || secret.length % 2) {
    throw new Error("Ghost: the Admin API key is not valid (it must have the form id:secret, as shown by the integration)");
  }
  const part = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const data = `${part({ alg: "HS256", typ: "JWT", kid: id })}.${part({ iat: now, exp: now + 300, aud: "/admin/" })}`;
  return `${data}.${crypto.createHmac("sha256", Buffer.from(secret, "hex")).update(data).digest("base64url")}`;
}

// Wix: site APIs carry wix-site-id and account APIs carry wix-account-id (never both). By default the connection's site is sent;
// with the header x-conector-wix-level: account the stored account ID is used, and if the agent itself passes
// wix-site-id or wix-account-id (e.g. another site of the same account), that is respected.
function wixHeaders({ headers: requestHeaders, cred }) {
  const findHeader = (n) => Object.keys(requestHeaders).find((k) => k.toLowerCase() === n);
  const level = findHeader("x-conector-wix-level");
  const isAccount = level !== undefined && String(requestHeaders[level]).trim().toLowerCase() === "account";
  if (level !== undefined) delete requestHeaders[level];
  if (findHeader("wix-site-id") || findHeader("wix-account-id")) return;
  if (!isAccount) {
    requestHeaders["wix-site-id"] = cred.site_id;
    return;
  }
  if (!cred.account_id) throw new Error("Wix: the account ID is missing in the connection, which account APIs require");
  requestHeaders["wix-account-id"] = cred.account_id;
}

const BIGCOMMERCE_STATUSES = "0 incomplete, 1 pending, 2 shipped, 3 partially shipped, 4 refunded, 5 cancelled, 6 declined, "
  + "7 awaiting payment, 8 awaiting pickup, 9 awaiting shipment, 10 completed, 11 awaiting fulfillment, "
  + "12 manual verification required, 13 disputed, 14 partially refunded";

// Sanity API version: any published date works; with 2025-02-19 or later, queries see only published content.
const SANITY_VERSION = "v2025-02-19";

const zoomeye = (d) => {
  if (d?.code && d.code !== 60000) throw new Error(`ZoomEye: ${d.message || d.error || `code ${d.code}`}`);
  return d;
};
const fofa = (d) => {
  if (d?.error) throw new Error(`FOFA: ${d.errmsg || "error"}`);
  return d;
};
const vulners = (d) => {
  if (d?.result === "error") throw new Error(`Vulners: ${d.data?.error || "error"}`);
  return d?.data ?? d?.result ?? d;
};

const SAFEBROWSING_THREATS = { MALWARE: "malware", SOCIAL_ENGINEERING: "phishing or social engineering",
  UNWANTED_SOFTWARE: "unwanted software", POTENTIALLY_HARMFUL_APPLICATION: "potentially harmful application" };

// Vulners: the most recent CVSS score the bulletin has (v4, v3 or the generic one).
function vulnersCvss(b) {
  for (const x of [b.cvss4?.cvssV4 || b.cvss4, b.cvss3?.cvssV3, b.metrics?.cvss, b.cvss]) {
    const score = x?.baseScore ?? x?.score;
    if (score != null && score !== 0) {
      return dropEmpty({ score, severity: x.baseSeverity || x.severity, vector: x.vectorString || x.vector, version: x.version });
    }
  }
  return undefined;
}
// References arrive grouped by source type and identifier: they are flattened down to the bulletins (those with an id).
const flatten = (x) => (Array.isArray(x) ? x.flatMap(flatten) : x && typeof x === "object" ? (x.id ? [x] : Object.values(x).flatMap(flatten)) : []);

const leakixService = (e) => dropEmpty({
  ip: e.ip, host: e.host || undefined, port: e.port, protocol: e.protocol,
  software: [e.service?.software?.name, e.service?.software?.version].filter(Boolean).join(" ") || undefined,
  http_title: shorten(e.http?.title, 120), http_status: e.http?.status || undefined, certificate: e.ssl?.certificate?.cn || undefined,
  tags: e.tags, date: day(e.time),
});
const leakixLeak = (e) => dropEmpty({
  ip: e.ip, host: e.host || undefined, port: e.port, plugin: e.event_source, severity: e.leak?.severity, type: e.leak?.type,
  rows: e.leak?.dataset?.rows || undefined, size: e.leak?.dataset?.size || undefined, summary: shorten(e.summary, 200),
  date: day(e.time),
});

export default [
  {
    id: "bigcommerce", name: "BigCommerce", category: "ecommerce", description: "Orders, products, customers and catalog of your store",
    website: "https://www.bigcommerce.com", docs: "https://docs.bigcommerce.com/developer/docs/overview/api-fundamentals/api-accounts",
    logo: { simpleIcons: "bigcommerce" },
    baseUrl: "https://api.bigcommerce.com/stores/{store_hash}",
    auth: { type: "header", name: "X-Auth-Token" },
    fields: [{ id: "store_hash", label: "Store hash", example: "abc123",
               help: "What comes after /stores/ in the “API path”: https://api.bigcommerce.com/stores/<store hash>/v3/" },
             { id: "token", label: "Access token", secret: true }],
    help: "1) In the BigCommerce dashboard: “Settings” → “Store-level API accounts” (“API” section) → “Create API account” and choose "
      + "“V2/V3 API token”. 2) Give it a name and select the permissions (OAuth scopes) you need (e.g. “Orders”, “Products” and "
      + "“Customers”, read-only or modify) and, for the connection test, “Information & settings” read-only. 3) Click "
      + "“Save” and copy the “Access token” and the store hash from the “API path” in the file that is downloaded. The token is not "
      + "shown again; only the store owner or users with permission can create API accounts.",
    test: { path: "/v2/store", account: (d) => d.name || d.domain },
    examples: "Paths carry the version: v3 for catalog and customers, v2 for orders and store data. Examples: "
      + "GET /v3/catalog/products?limit=20&keyword=…&include=variants, PUT /v3/catalog/products/{id} {\"price\": 19.99, "
      + "\"inventory_level\": 5}, GET /v3/catalog/categories, GET /v2/orders?sort=date_created:desc&limit=20&status_id=11, "
      + "GET /v2/orders/{id}/products, PUT /v2/orders/{id} {\"status_id\": 2}, GET /v3/customers?email:in=…, GET /v2/store. "
      + "An empty v2 list returns 204 with no body.",
    tools: [
      { name: "bigcommerce_orders", title: "BigCommerce: recent orders", annotations: { readOnlyHint: true },
        description: "Orders from newest to oldest, in compact format: number, status, date, total, customer, email, "
          + "payment method and number of items. If no status is given, incomplete orders are not included.",
        schema: { status: z.number().int().min(0).max(14).optional().describe(`status_id: ${BIGCOMMERCE_STATUSES}`),
                   from: DATE.optional().describe("Only orders created from this date (YYYY-MM-DD)"),
                   max: z.number().int().min(1).max(250).default(20) },
        run: async ({ status: orderStatus, from, max }, p) => (ensureOk(await p({ path: "/v2/orders", query: { sort: "date_created:desc",
          limit: max, status_id: orderStatus, min_date_created: from ? `${from}T00:00:00Z` : undefined } }), "BigCommerce") || [])
          .map((o) => ({ id: o.id, status: o.status, date: dateTime(o.date_created), total: `${o.total_inc_tax} ${o.currency_code}`,
            customer: [o.billing_address?.first_name, o.billing_address?.last_name, o.billing_address?.company].filter(Boolean).join(" "),
            email: o.billing_address?.email, payment: o.payment_method, items: o.items_total })) },
    ],
  },
  {
    id: "wix", name: "Wix", category: "ecommerce", description: "Your Wix site: store, orders, blog, contacts and bookings",
    website: "https://www.wix.com", docs: "https://dev.wix.com/docs/api-reference", logo: { simpleIcons: "wix" },
    baseUrl: "https://www.wixapis.com",
    auth: [{ type: "header", name: "Authorization" }, { type: "signature", sign: wixHeaders }],
    fields: [{ id: "token", label: "API key", secret: true },
             { id: "site_id", label: "Site ID", format: "segment", example: "0a1b2c3d-1111-2222-3333-444455556666",
               help: "It is in the address of the site dashboard: manage.wix.com/dashboard/<site ID>/…" },
             { id: "account_id", label: "Account ID", format: "segment", optional: true,
               help: "Only for account APIs (site list, domains…). It appears on the API keys page." }],
    keyUrl: "https://manage.wix.com/account/api-keys",
    help: "1) Sign in as the owner or a co-owner of the account at manage.wix.com/account/api-keys (“API Keys” in the "
      + "account settings). 2) Click “Generate API Key”, give it a name, choose which sites it gives access to and select the required permissions "
      + "(e.g. Wix Stores, Wix eCommerce, Wix Blog or Contacts). 3) Click “Generate Key” and copy it: it is not "
      + "shown again. The account ID is also on that page. The key only works for sites of the account where it was created.",
    test: { path: "/site-properties/v4/properties", acceptStatus: [403],
              account: (d) => d.properties?.siteDisplayName || d.properties?.businessName,
              message: (d) => (d?.properties ? "Site connected"
                : `API key accepted, but Wix does not allow reading the site properties (${d?.message || "missing permission"}): check the `
                  + "key's permissions and that the site belongs to that account") },
    examples: "Site APIs use the connection's site ID (for another site of the same account, pass the header "
      + "wix-site-id). Examples: POST /ecom/v1/orders/search {\"search\": {\"cursorPaging\": {\"limit\": 20}, \"sort\": "
      + "[{\"fieldName\": \"createdDate\", \"order\": \"DESC\"}]}}, POST /stores/v3/products/query {\"query\": {\"cursorPaging\": "
      + "{\"limit\": 20}}} (catalog V3; sites with the old catalog use POST /stores/v1/products/query {\"query\": "
      + "{\"paging\": {\"limit\": 20}}}), GET /blog/v3/posts?paging.limit=10, POST /contacts/v4/contacts/query {\"query\": "
      + "{\"paging\": {\"limit\": 50}}}, GET /site-properties/v4/properties. Account APIs (with the header x-conector-wix-level: "
      + "account): POST /site-list/v2/sites/query {\"query\": {\"cursorPaging\": {\"limit\": 50}}}.",
    tools: [
      { name: "wix_orders", title: "Wix: recent orders", annotations: { readOnlyHint: true },
        description: "Store orders (Wix eCommerce) from newest to oldest, in compact format: number, date, "
          + "order, payment and fulfillment status, total, buyer and items.",
        schema: { payment_status: z.enum(["PAID", "NOT_PAID", "PARTIALLY_PAID", "PENDING", "REFUNDED", "PARTIALLY_REFUNDED"]).optional()
                     .describe("Only orders with this payment status"),
                   max: z.number().int().min(1).max(100).default(20) },
        run: async ({ payment_status, max }, p) => (ensureOk(await p({ method: "POST", path: "/ecom/v1/orders/search", body: { search: {
          cursorPaging: { limit: max }, sort: [{ fieldName: "createdDate", order: "DESC" }], ...(payment_status ? { filter: { paymentStatus: payment_status } } : {}),
        } } }), "Wix").orders || []).map((o) => {
          const c = o.billingInfo?.contactDetails || {};
          return dropEmpty({ id: o.id, number: o.number, date: dateTime(o.createdDate), status: o.status, payment_status: o.paymentStatus,
            fulfillment_status: o.fulfillmentStatus, total: o.priceSummary?.total?.formattedAmount || o.priceSummary?.total?.amount,
            customer: [c.firstName, c.lastName, c.company].filter(Boolean).join(" "), email: o.buyerInfo?.email,
            items: (o.lineItems || []).map((l) => `${l.quantity} × ${l.productName?.translated || l.productName?.original}`) });
        }) },
    ],
  },
  {
    id: "ghost", name: "Ghost", category: "ecommerce", description: "Posts, pages, tags and members of your Ghost blog",
    website: "https://ghost.org", docs: "https://docs.ghost.org/admin-api", logo: { simpleIcons: "ghost" },
    baseUrl: "{url}/ghost/api/admin", derived: { url: (c) => String(c.url || "").trim().replace(/\/+$/, "").replace(/\/ghost(\/.*)?$/i, "") },
    // Minimum API version expected: v5.0 works for Ghost 5 and 6 (Ghost rejects versions higher than its own).
    headers: { "Accept-Version": "v5.0" },
    auth: { type: "custom", apply: (c) => ({ headers: { Authorization: `Ghost ${ghostToken(c.token)}` } }) },
    fields: [{ id: "url", label: "API URL (https://…)", format: "url",
               help: "The one shown by the integration; on Ghost(Pro) it is usually https://<site>.ghost.io even if the website uses another domain." },
             { id: "token", label: "Admin API key (id:secret)", secret: true }],
    help: "1) In Ghost Admin: “Settings” → “Advanced” → “Integrations” → “Add custom integration”. 2) Give it a name (e.g. "
      + "Conector) and click “Add”. 3) Copy the “Admin API key” and the “API URL”. The integration can read and write posts, pages, "
      + "tags, members, newsletters and offers, and can only read users. To act with the permissions of a specific person, "
      + "use their “Staff access token” (in their profile, same id:secret format).",
    test: { path: "/posts/", query: { limit: 1, fields: "id" },
              message: (d) => `Connected: ${d?.meta?.pagination?.total ?? "?"} posts on the blog` },
    examples: "Paths end in “/”. Examples: GET /posts/?limit=10&order=updated_at desc&filter=status:draft&include=tags,authors, "
      + "GET /posts/{id}/?formats=html, POST /posts/?source=html {\"posts\": [{\"title\": \"…\", \"html\": \"<p>…</p>\", \"status\": "
      + "\"draft\"}]}, PUT /posts/{id}/ {\"posts\": [{\"title\": \"…\", \"updated_at\": \"<current value>\"}]} (updated_at is "
      + "required), GET /pages/, GET /tags/?limit=all, GET /members/?limit=50&filter=status:paid, POST /members/ {\"members\": "
      + "[{\"email\": \"…\", \"name\": \"…\"}]}, GET /newsletters/, GET /tiers/, GET /site/.",
    tools: [
      { name: "ghost_posts", title: "Ghost: recent posts", annotations: { readOnlyHint: true },
        description: "Blog posts ordered by last modification, in compact format: title, status, publication and modification "
          + "dates, URL, visibility, authors and tags.",
        schema: { status: z.enum(["all", "published", "drafts", "scheduled"]).default("all"),
                   max: z.number().int().min(1).max(100).default(15) },
        async run({ status: postStatus, max }, p) {
          const statusFilter = { published: "status:published", drafts: "status:draft", scheduled: "status:scheduled" }[postStatus];
          const d = ensureOk(await p({ path: "/posts/", query: { limit: max, order: "updated_at desc", filter: statusFilter,
                                                               include: "tags,authors" } }), "Ghost");
          return { total: d.meta?.pagination?.total, posts: (d.posts || []).map((x) => dropEmpty({
            id: x.id, title: x.title, status: x.status, published: x.published_at, modified: x.updated_at, url: x.url,
            visibility: x.visibility, featured: x.featured || undefined, authors: x.authors?.map((a) => a.name),
            tags: x.tags?.map((t) => t.name) })) };
        } },
    ],
  },
  {
    id: "contentful", name: "Contentful", category: "ecommerce", description: "Spaces, content types, entries and assets of the CMS",
    website: "https://www.contentful.com", docs: "https://www.contentful.com/developers/docs/references/content-management-api/",
    logo: { simpleIcons: "contentful" },
    baseUrl: "https://{server}",
    // Sign-in and OAuth token server of the chosen region.
    derived: { be: (c) => (c.server === "api.eu.contentful.com" ? "be.eu.contentful.com" : "be.contentful.com") },
    auth: [{ type: "bearer" }, { type: "signature", sign: ({ headers: requestHeaders }) => {
      // The Management API expects its own content type in JSON bodies.
      if (requestHeaders["Content-Type"] === "application/json") requestHeaders["Content-Type"] = "application/vnd.contentful.management.v1+json";
    } }],
    fields: [{ id: "token", label: "Personal access token (CFPAT-…)", secret: true },
             { id: "server", label: "Data region", default: "api.contentful.com",
               options: [["api.contentful.com", "Standard (app.contentful.com)"], ["api.eu.contentful.com", "European Union (app.eu.contentful.com)"]],
               help: "If you sign in at app.eu.contentful.com, choose “European Union”." }],
    // OAuth 2.0 (authorization code) with an application from the account; the Management API still requires its content type.
    oauth: { scopes: ["content_management_manage"], fields: ["server"],
      apply: (requestHeaders, token) => {
        requestHeaders.Authorization = `Bearer ${token}`;
        if (requestHeaders["Content-Type"] === "application/json") {
          requestHeaders["Content-Type"] = "application/vnd.contentful.management.v1+json";
        }
      },
      provider: { name: "Contentful", key: "contentful", redirect: "localhost",
        authorizeUrl: "https://{be}/oauth/authorize", tokenUrl: "https://{be}/oauth/token",
        // If Contentful gave an expiry without a refresh token, access would be valid until the application's date: without “expires_in” the
        // connection is considered ready and, once it expires, you just need to click “Connect” again.
        parseResponse: (d) => (d?.refresh_token ? d : { ...d, expires_in: undefined }),
        help: "1) In Contentful click your avatar → “Account settings” → “Developers” → “OAuth applications” and click “Create "
          + "application”. 2) Name it “Conector” and add a description, paste the redirect URI shown below into “Redirect URI” "
          + "(Contentful requires HTTPS), choose the expiry, select the “Manage” permission (the scope shown below) "
          + "and leave “Confidential” checked. 3) Click “Create application” and, in the application, copy the “Client ID” and the “Client "
          + "Secret”. Register the application in the same region as your account (app.contentful.com or app.eu.contentful.com) and choose "
          + "that region here. When the application's expiry date arrives, connect it again." } },
    keyUrl: "https://app.contentful.com/account/profile/cma_tokens",
    help: "This uses the Content Management API, which reads and writes. 1) In Contentful click your avatar → “Account settings” → “CMA tokens”. "
      + "2) Click “Create personal access token”, give it a name and an expiry. 3) Copy the token (CFPAT-…): it is shown only once. "
      + "It has the same permissions as your user in all your spaces; to limit it, create it with a user that has a more "
      + "restricted role.",
    test: { path: "/users/me", account: (d) => d.email || [d.firstName, d.lastName].filter(Boolean).join(" ") },
    examples: "Examples: GET /spaces, GET /spaces/{space_id}/environments, GET /spaces/{space_id}/environments/master/content_types, "
      + "GET /spaces/{space_id}/environments/master/entries?content_type=…&order=-sys.updatedAt&limit=20, "
      + "GET /spaces/{space_id}/environments/master/entries/{id}, POST /spaces/{space_id}/environments/master/entries (header "
      + "X-Contentful-Content-Type: {content type id}) {\"fields\": {\"title\": {\"en-US\": \"…\"}}} (locale codes in "
      + "GET …/locales), PUT …/entries/{id} (header X-Contentful-Version: current version; send all the fields), "
      + "PUT …/entries/{id}/published (header X-Contentful-Version), GET /spaces/{space_id}/environments/master/assets.",
  },
  {
    id: "sanity", name: "Sanity", category: "ecommerce", description: "Documents, GROQ queries and assets of your Sanity project",
    website: "https://www.sanity.io", docs: "https://www.sanity.io/docs/http-reference", logo: { simpleIcons: "sanity" },
    baseUrl: `https://{project}.api.sanity.io/${SANITY_VERSION}`,
    allowedOrigins: ["https://api.sanity.io", "https://{project}.apicdn.sanity.io"],
    auth: { type: "bearer" },
    fields: [{ id: "project", label: "Project ID", format: "subdomain", example: "abc12345",
               help: "It appears at sanity.io/manage when you open the project (and as projectId in sanity.config)." },
             { id: "token", label: "API token", secret: true }],
    help: "1) At sanity.io/manage open the project → “API” → “Tokens” → “Add API token”. 2) Give it a name and choose the permissions: "
      + "“Viewer” to read (including drafts and private datasets) or “Editor” to write. 3) Click “Save” and copy the token: "
      + "it is shown only once.",
    test: { path: "/datasets",
              message: (d) => `Connected: dataset(s) ${(Array.isArray(d) ? d : []).map((x) => x.name).join(", ") || "none"}` },
    examples: "Replace {dataset} with yours (list them with GET /datasets; it is usually production). Examples: "
      + "GET /data/query/{dataset}?query=*[_type == \"post\"] | order(_updatedAt desc)[0...10]{_id, title} (with "
      + "perspective=drafts it also sees drafts), GET /data/doc/{dataset}/{id}, POST /data/mutate/{dataset}?returnIds=true "
      + "{\"mutations\": [{\"create\": {\"_type\": \"post\", \"title\": \"…\"}}]} (also createOrReplace, patch {\"id\": …, \"set\": "
      + "{…}} and delete {\"id\": …}), POST /assets/images/{dataset} (body_base64 + content_type), GET /users/me, "
      + `GET https://api.sanity.io/${SANITY_VERSION}/projects/{project} (project management).`,
    tools: [
      { name: "sanity_query", title: "Sanity: GROQ query", annotations: { readOnlyHint: true },
        description: "Runs a GROQ query on a dataset and returns the result. By default it only sees published documents; "
          + "with drafts=true it uses the “drafts” perspective (drafts on top of what is published).",
        schema: { groq: z.string().describe("GROQ query, e.g. *[_type == \"post\"] | order(_updatedAt desc)[0...10]"
                     + "{_id, title, \"slug\": slug.current}"),
                   parameters: z.record(z.string(), z.any()).optional().describe("Values of the $parameters, e.g. {\"type\": \"post\"}"),
                   dataset: z.string().regex(/^[a-z0-9_-]{1,64}$/i).default("production"),
                   drafts: z.boolean().default(false) },
        async run({ groq, parameters, dataset, drafts }, p) {
          const d = ensureOk(await p({ method: "POST", path: `/data/query/${dataset}`,
                                     query: drafts ? { perspective: "drafts" } : undefined,
                                     body: { query: groq, ...(parameters ? { params: parameters } : {}) } }), "Sanity");
          return { result: d.result, ms: d.ms };
        } },
    ],
  },
  {
    id: "strapi", name: "Strapi", category: "ecommerce", description: "Collections, single types and media of your Strapi CMS",
    website: "https://strapi.io", docs: "https://docs.strapi.io/cms/api/rest", logo: { simpleIcons: "strapi" },
    baseUrl: "{url}/api", derived: { url: (c) => String(c.url || "").trim().replace(/\/+$/, "").replace(/\/(api|admin)$/i, "") },
    auth: { type: "bearer" },
    fields: [{ id: "url", label: "Strapi server address (https://…)", format: "url",
               help: "The backend's address (where /admin is), not the public website's." },
             { id: "token", label: "API token", secret: true }],
    help: "1) In the Strapi admin panel: “Settings” → “API Tokens” → “Create new API Token”. 2) Give it a name, a duration and the type: "
      + "“Read-only” to query, “Full access” to read and write, or “Custom” to choose the permissions for each content type. "
      + "3) Click “Save” and copy the token: it is shown in full only once. It works for Strapi 4 and 5; the connection test queries the "
      + "media library, and if the token has no permission for it, it only checks that the token is valid.",
    // API tokens cannot call /users/me: the media library is requested filtered down to nothing. A fake token gives 401;
    // a valid one without permission on media gives Strapi's own 403 (ForbiddenError).
    test: { path: "/upload/files", query: { "filters[id][$eq]": 0 }, acceptStatus: [403],
              validate: (d, r) => {
                if (r.status === 403 && d?.error?.name !== "ForbiddenError") throw new Error("Strapi: the URL does not respond like a Strapi API (403)");
                if (r.status !== 403 && !Array.isArray(d) && !Array.isArray(d?.data)) throw new Error("Strapi: the URL does not respond like a Strapi API");
              },
              message: (d) => (d?.error ? "Token is valid (no permission to view the media library)" : "Token is valid") },
    examples: "Collections use the plural (e.g. /articles) and single types the singular. Examples: "
      + "GET /articles?populate=*&sort=updatedAt:desc&pagination[pageSize]=10, GET /articles?filters[slug][$eq]=…&locale=en, "
      + "GET /articles/{documentId} (Strapi 5; in Strapi 4, the numeric id), POST /articles {\"data\": {\"title\": \"…\"}}, "
      + "PUT /articles/{documentId} {\"data\": {…}}, DELETE /articles/{documentId}, GET /articles?status=draft (drafts in "
      + "Strapi 5), GET /upload/files, GET /i18n/locales.",
  },
  {
    id: "doofinder", name: "Doofinder", category: "ecommerce", description: "Search engines, indices, products and search statistics",
    website: "https://www.doofinder.com", docs: "https://docs.doofinder.com", logo: { favicon: "https://www.doofinder.com" },
    baseUrl: "https://{zone}-api.doofinder.com/api/v2", allowedOrigins: ["https://{zone}-search.doofinder.com"],
    derived: { zone: (c) => /^(eu1|us1|ap1)-/i.exec(String(c.token || "").trim())?.[1].toLowerCase() || c.zone || "eu1" },
    auth: { type: "header", name: "Authorization", prefix: "Token " },
    fields: [{ id: "token", label: "API key", secret: true, example: "eu1-0123456789abcdef0123456789abcdef01234567" },
             { id: "zone", label: "Zone", default: "eu1", options: [["eu1", "Europe (eu1)"], ["us1", "US (us1)"], ["ap1", "Asia-Pacific (ap1)"]],
               help: "If the key starts with eu1-, us1- or ap1-, that zone is used." }],
    help: "1) Sign in at admin.doofinder.com as the account owner. 2) Go to “Account” → “API Keys” and generate a "
      + "key. 3) Copy it: the prefix (eu1-, us1- or ap1-) indicates the zone of your search engines. Only the owner's keys work, "
      + "not those of team members. The same key works for the management API, the statistics API and the search API.",
    test: { path: "/search_engines", account: (d) => (Array.isArray(d) ? d.map((s) => s.name).join(", ") : null),
              message: "API key is valid, but the account has no search engines" },
    examples: "Examples: GET /search_engines (hashid of each search engine), GET /search_engines/{hashid}/indices, "
      + "GET /search_engines/{hashid}/indices/{index}/items/?rpp=50 (iterate with scroll_id), "
      + "GET /search_engines/{hashid}/indices/{index}/items/{id}, PATCH …/items/{id} {\"price\": 19.9}, "
      + "POST …/items/_bulk [{…}], POST /search_engines/{hashid}/_process (reindex from the feeds), "
      + "GET /stats/searches/top?from=20260101&to=20260131&no_results=true, GET /stats/usage?from=…&to=…, "
      + "search as a visitor: GET https://eu1-search.doofinder.com/6/{hashid}/_search?query=…&rpp=10 (same zone).",
    tools: [
      { name: "doofinder_searches", title: "Doofinder: most searched terms", annotations: { readOnlyHint: true },
        description: "Most searched terms in a period, across all the account's search engines or in one, with their number of searches. "
          + "With no_results=true, only those that returned nothing: useful to detect missing products, synonyms or "
          + "redirects.",
        schema: { from: DATE.optional().describe("YYYY-MM-DD; default: 30 days ago"),
                   to: DATE.optional().describe("YYYY-MM-DD; default: today"),
                   search_engine: z.string().regex(/^[a-f0-9]{32}$/).optional().describe("hashid of the search engine; empty: all"),
                   no_results: z.boolean().default(false), max: z.number().int().min(1).max(500).default(50) },
        async run({ from, to, search_engine, no_results, max }, p) {
          const d = ensureOk(await p({ path: "/stats/searches/top", query: { from: (from || isoDate(30)).replaceAll("-", ""),
            to: (to || isoDate()).replaceAll("-", ""), tz: "UTC", "hashids[]": search_engine,
            no_results: no_results ? "true" : undefined } }), "Doofinder");
          return { distinct_terms: d.total, searches: d.total_count,
                   terms: (d.results || []).slice(0, max).map((r) => ({ term: r.query, count: r.count })) };
        } },
    ],
  },
  {
    id: "zoomeye", name: "ZoomEye", category: "security", description: "Exposed asset search engine: IPs, ports, services and websites",
    website: "https://www.zoomeye.ai", docs: "https://www.zoomeye.ai/doc", logo: { favicon: "https://www.zoomeye.ai" },
    baseUrl: "https://api.zoomeye.ai",
    auth: { type: "header", name: "API-KEY" },
    fields: [{ id: "token", label: "API-KEY", secret: true }],
    keyUrl: "https://www.zoomeye.ai/profile",
    help: "1) Sign in at www.zoomeye.ai with your account. 2) Click your avatar → “Profile” and copy the “API-KEY”. The free account comes with "
      + "a reduced monthly quota and paid plans increase it. This is the international version: the Chinese one (zoomeye.org) uses a different "
      + "account and its API may not be available from your location.",
    test: { method: "POST", path: "/v2/userinfo", body: {}, validate: zoomeye,
              account: (d) => {
                const u = d.data || {};
                const s = u.subscription || {};
                return [u.username || u.email, s.plan && `plan ${s.plan}`, s.points != null && `${s.points} points`].filter(Boolean).join(" · ");
              } },
    examples: "Queries go in base64 (field qbase64). Examples: POST /v2/search {\"qbase64\": \"<query in base64>\", \"page\": 1, "
      + "\"pagesize\": 20, \"sub_type\": \"v4\" (or v6, web), \"fields\": \"ip,port,domain,title,product,update_time\", \"facets\": "
      + "\"country,port,product\"}, POST /v2/userinfo (plan and quota), GET /v2/vuldb/{CVE}. Syntax: ip=\"1.2.3.4\", "
      + "cidr=\"1.2.3.0/24\", hostname=\"example.com\", domain=\"example.com\", port=3389 && country=\"US\", app=\"Apache Tomcat\", "
      + "title=\"…\", ssl.cert.subject.cn=\"…\", org=\"…\".",
    tools: [
      { name: "zoomeye_search", title: "ZoomEye: search", annotations: { readOnlyHint: true },
        description: "Searches with ZoomEye syntax (ip=\"…\", cidr=\"…\", hostname=\"…\", domain=\"…\", port=…, app=\"…\", "
          + "title=\"…\", ssl.cert.subject.cn=\"…\", country=\"US\"…, combinable with && and ||). Returns the total, the requested "
          + "facets and summarized results. Uses account quota according to the plan.",
        schema: { query: z.string().describe("e.g. domain=\"example.com\" or port=3389 && country=\"US\""),
                   type: z.enum(["v4", "v6", "web"]).default("v4").describe("IPv4, IPv6 or web assets"),
                   facets: z.string().optional().describe("e.g. country,port,product,service,os"),
                   fields: z.string().optional().describe("Fields to request, comma-separated (default: a summary)"),
                   page: z.number().int().min(1).default(1), max: z.number().int().min(1).max(100).default(20) },
        async run({ query, type, facets, fields, page, max }, p) {
          const d = zoomeye(ensureOk(await p({ method: "POST", path: "/v2/search", body: { qbase64: base64(query), page: page,
            pagesize: max, sub_type: type, ...(facets ? { facets: facets } : {}),
            fields: fields || "ip,port,domain,hostname,service,product,version,title,os,country.name,organization.name,asn,update_time",
          } }), "ZoomEye"));
          return { total: d.total, facets: d.facets, results: (d.data || []).map((r) => dropEmpty({ ...r,
            title: Array.isArray(r.title) ? r.title.map((t) => shorten(t, 120)) : shorten(r.title, 120),
            banner: shorten(r.banner, 200), header: shorten(r.header, 200), body: shorten(r.body, 200) })) };
        } },
    ],
  },
  {
    id: "fofa", name: "FOFA", category: "security", description: "Exposed asset search engine: IPs, ports, websites and certificates",
    website: "https://en.fofa.info", docs: "https://en.fofa.info/api", logo: { image: "https://github.com/FofaInfo.png" },
    baseUrl: "https://fofa.info/api/v1",
    auth: [{ type: "query", name: "key" }, { type: "query", name: "email", field: "email" }],
    fields: [{ id: "token", label: "API key", secret: true },
             { id: "email", label: "Account email", optional: true,
               help: "No longer required; fill it in only if FOFA still asks for it for your account." }],
    keyUrl: "https://fofa.info/userInfo",
    help: "1) Sign in at fofa.info (or en.fofa.info) with your account. 2) Open your “Personal Center” → “API” and copy the “API KEY”. API usage "
      + "depends on the account level: paid plans come with a monthly quota of queries and results, and without them F-points "
      + "are used. Error messages often arrive in Chinese.",
    test: { path: "/info/my", validate: fofa,
              account: (d) => [d.username || d.email, d.vip_level != null && `VIP level ${d.vip_level}`,
                d.remain_api_query != null && `${d.remain_api_query} queries remaining`].filter(Boolean).join(" · ") },
    examples: "Queries go in base64 (parameter qbase64). Examples: GET /search/all?qbase64=<query in base64>&fields=ip,port,"
      + "host,domain,title,server,protocol,country&size=100&page=1, GET /search/stats?qbase64=…&fields=country,port (aggregates), "
      + "GET /host/{ip}?detail=true, GET /info/my. Syntax: domain=\"example.com\", host=\"…\", ip=\"1.2.3.0/24\", cert=\"example.com\", "
      + "title=\"…\", port=\"3389\" && country=\"US\", app=\"…\". Errors arrive with status 200 and \"error\": true.",
    tools: [
      { name: "fofa_search", title: "FOFA: search", annotations: { readOnlyHint: true },
        description: "Searches with FOFA syntax (domain=\"…\", host=\"…\", ip=\"1.2.3.0/24\", cert=\"…\", title=\"…\", "
          + "port=\"3389\" && country=\"US\", app=\"…\"…). Returns the total and the results: IP, port, host, domain, title, "
          + "server, protocol, country and organization. Uses API quota according to the plan.",
        schema: { query: z.string().describe("e.g. domain=\"example.com\" || cert=\"example.com\""),
                   page: z.number().int().min(1).default(1), max: z.number().int().min(1).max(1000).default(50) },
        async run({ query, page, max }, p) {
          const fields = ["ip", "port", "host", "domain", "title", "server", "protocol", "country", "as_organization"];
          const names = ["ip", "port", "host", "domain", "title", "server", "protocol", "country", "organization"];
          const d = fofa(ensureOk(await p({ path: "/search/all", query: { qbase64: base64(query), fields: fields.join(","),
                                                                         page: page, size: max } }), "FOFA"));
          return { total: d.size, page: d.page, results: (d.results || []).map((r) =>
            dropEmpty(Object.fromEntries(names.map((n, i) => [n, n === "title" ? shorten(r[i], 120) : r[i]])))) };
        } },
    ],
  },
  {
    id: "netlas", name: "Netlas", category: "security", description: "Hosts, domains, certificates and WHOIS of Internet assets",
    website: "https://netlas.io", docs: "https://docs.netlas.io/automation/", logo: { image: "https://github.com/netlas-io.png" },
    baseUrl: "https://app.netlas.io/api",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://app.netlas.io/profile/",
    help: "1) Sign in at app.netlas.io with your account. 2) Open your profile (top right) and copy the “API Key”. The free plan "
      + "has a limited number of requests per day and paid plans increase it; if the quota runs out, the API returns 402.",
    test: { path: "/users/current/", account: (d) => d.email || d.username },
    examples: "Examples: GET /host/{ip or domain}/, GET /responses/?q=host:example.com&start=0 (20 per page; also ip:…, port:…, "
      + "http.title:…, certificate.subject.common_name:…), GET /responses_count/?q=…, GET /domains/?q=domain:*.example.com&start=0 "
      + "(subdomains), GET /domains_count/?q=…, GET /certs/?q=certificate.subject.common_name:example.com, "
      + "GET /whois_domains/?q=domain:example.com, GET /whois_ip/?q=ip:8.8.8.8, GET /users/current/.",
    tools: [
      { name: "netlas_host", title: "Netlas: host information", annotations: { readOnlyHint: true },
        description: "Summary of an IP or domain: ports and protocols, detected software, associated domains, organization, "
          + "location, ASN and network, privacy signals (VPN, proxy, Tor) and indicators of compromise. Uses one request of the quota.",
        schema: { host: z.string().describe("IP or domain, e.g. 8.8.8.8 or example.com") },
        async run({ host }, p) {
          const r = await p({ path: `/host/${segment(host)}/` });
          if (r.status === 404) return { host, message: "Netlas has no data for this host" };
          const h = ensureOk(r, "Netlas") || {};
          const w = h.whois || {};
          return dropEmpty({
            type: h.type, ip: h.ip, domain: h.domain, ptr: h.ptr, organization: h.organization, country: h.geo?.country,
            city: h.geo?.city, privacy: Object.entries(h.privacy || {}).filter(([, v]) => v === true).map(([k]) => k),
            asn: w.asn ? dropEmpty({ number: w.asn.number, name: w.asn.name, cidr: w.asn.cidr }) : undefined,
            network: w.net ? dropEmpty({ name: w.net.name, cidr: w.net.cidr, country: w.net.country }) : undefined,
            registrar: w.registrar?.name, created: day(w.created_date), expires: day(w.expiration_date),
            ports: (h.ports || []).map((x) => [`${x.port}/${x.prot4 || "tcp"}`, x.prot7 || x.protocol].filter(Boolean).join(" ")),
            software: (h.software || []).slice(0, 30).map((s) => ({ uri: s.uri,
              technologies: (s.tag || []).map((t) => [t.fullname || t.name, t.version].filter(Boolean).join(" ")) })),
            domains: (h.domains || []).slice(0, 50), total_domains: h.domains_count,
            ioc: (h.ioc || []).slice(0, 10).map((x) => dropEmpty({ domain: x.domain, url: x.url, tags: x.tags,
              seen: day(x.lseen) })),
          });
        } },
    ],
  },
  {
    id: "vulners", name: "Vulners", category: "security", description: "Vulnerabilities and exploits: CVEs, advisories, EPSS and auditing",
    website: "https://vulners.com", docs: "https://docs.vulners.com/docs/api/", logo: { favicon: "https://vulners.com" },
    baseUrl: "https://vulners.com",
    auth: { type: "header", name: "X-Api-Key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://vulners.com/userinfo",
    help: "1) Sign in at vulners.com with your account. 2) Open your profile → “API Keys”, choose the “api” scope and click “Generate new key”. "
      + "3) Copy the key. The free plan has a query limit (when exceeded the API returns 429) and downloading "
      + "full collections requires a paid plan.",
    test: { path: "/api/v4/search/collections",
              message: (d) => `API key is valid (${Array.isArray(d?.result) ? d.result.length : "?"} collections available)` },
    examples: "Examples: POST /api/v3/search/id {\"id\": \"CVE-2024-3400\", \"fields\": [\"id\", \"title\", \"cvss3\", \"epss\", "
      + "\"exploitation\"]} (up to 100 ids; with \"references\": true it brings related exploits and advisories), POST /api/v3/search/lucene "
      + "{\"query\": \"bulletinFamily:exploit AND \\\"CVE-2023-20198\\\"\", \"size\": 10}, POST /api/v4/audit/software {\"software\": "
      + "[{\"vendor\": \"openssh\", \"product\": \"openssh\", \"version\": \"9.5p1\"}], \"match\": \"full\"}, POST /api/v4/audit/linux "
      + "{\"osName\": \"ubuntu\", \"osVersion\": \"22.04\", \"packages\": [\"bash 5.1-6ubuntu1 amd64\"]}, POST /api/v4/audit/cve "
      + "{\"cve\": \"CVE-2021-44228\"} (affected packages and CPEs), GET /api/v4/search/references?id=CVE-…. v3 paths respond "
      + "{\"result\": \"OK\", \"data\": …} and v4 ones {\"result\": …}.",
    tools: [
      { name: "vulners_cve", title: "Vulners: CVE or bulletin details", annotations: { readOnlyHint: true },
        description: "Data of a CVE or any Vulners bulletin (vendor advisory, exploit, KB…): title, description, "
          + "CVSS, EPSS, AI score, whether it is actively exploited (CISA KEV and other sources), CWE and, above all, the public exploits "
          + "and related advisories (count by source and list of exploits, newest first).",
        schema: { id: z.string().describe("e.g. CVE-2024-3400, MS17-010 or EDB-ID:42315"),
                   max_exploits: z.number().int().min(0).max(100).default(20) },
        async run({ id, max_exploits }, p) {
          const bulletinId = id.trim();
          const r = await p({ method: "POST", path: "/api/v3/search/id", body: { id: bulletinId, references: true,
            fields: ["id", "title", "description", "short_description", "type", "bulletinFamily", "published", "modified", "href",
              "cvss", "cvss3", "cvss4", "metrics", "epss", "exploitation", "enchantments", "ai_score", "cvelist", "cwe"],
            referenceFields: ["id", "title", "href", "type", "bulletinFamily", "published"] } });
          if (r.status === 404) return { id: bulletinId, message: "Vulners has no record of this identifier" };
          const d = vulners(ensureOk(r, "Vulners"));
          const b = d.documents?.[bulletinId] || Object.values(d.documents || {})[0];
          if (!b) return { id: bulletinId, message: "Vulners has no record of this identifier" };
          const seen = new Set();
          const related = flatten(d.references).filter((x) => x.id !== b.id && !seen.has(x.id) && seen.add(x.id));
          const byType = {};
          for (const x of related) byType[x.type || "?"] = (byType[x.type || "?"] || 0) + 1;
          const exploits = related.filter((x) => x.bulletinFamily === "exploit")
            .sort((x, y) => String(y.published || "").localeCompare(String(x.published || "")));
          const exploitation = b.exploitation || b.enchantments?.exploitation;
          const epss = b.epss?.[0] || b.metrics?.epss?.[0];
          return dropEmpty({
            id: b.id, type: b.type, family: b.bulletinFamily, title: b.title, description: shorten(b.description || b.short_description, 800),
            published: day(b.published), modified: day(b.modified), cvss: vulnersCvss(b),
            epss: epss ? dropEmpty({ probability: epss.epss, percentile: epss.percentile }) : undefined,
            ai_score: b.enchantments?.score?.value ?? b.ai_score?.value,
            exploited: exploitation?.wildExploited, exploitation_sources: exploitation?.wildExploitedSources?.map((s) => s.type || s),
            cwe: b.cwe, cves: b.cvelist?.slice(0, 20), url: b.href,
            related: { total: related.length, by_type: byType, public_exploits: exploits.length },
            exploits: exploits.slice(0, max_exploits).map((x) => dropEmpty({ id: x.id, source: x.type, title: shorten(x.title, 150),
              date: day(x.published), url: x.href })),
          });
        } },
      { name: "vulners_search", title: "Vulners: search", annotations: { readOnlyHint: true },
        description: "Lucene search in the Vulners database, e.g. exploits of a CVE (bulletinFamily:exploit AND \"CVE-…\"), "
          + "advisories of a product (Fortinet AND RCE order:published), by source type (type:githubexploit, type:msupdate…). "
          + "Returns the total and summarized bulletins.",
        schema: { query: z.string().describe("Lucene query; add order:published to sort by date"),
                   max: z.number().int().min(1).max(100).default(20),
                   skip: z.number().int().min(0).default(0).describe("Results to skip, for pagination") },
        async run({ query, max, skip }, p) {
          const d = vulners(ensureOk(await p({ method: "POST", path: "/api/v3/search/lucene", body: { query: query, size: max,
            skip: skip, fields: ["id", "title", "type", "bulletinFamily", "published", "href", "cvss", "cvelist", "short_description"] } }),
          "Vulners"));
          return { total: d.total, results: (d.search || []).map((h) => h._source || h).map((b) => dropEmpty({
            id: b.id, type: b.type, family: b.bulletinFamily, title: shorten(b.title, 160), date: day(b.published),
            cvss: b.cvss?.score || undefined, cves: b.cvelist?.slice(0, 10), summary: shorten(b.short_description, 200), url: b.href })) };
        } },
    ],
  },
  {
    id: "safebrowsing", name: "Google Safe Browsing", category: "security",
    description: "Phishing, malware or unwanted software URLs according to Google",
    website: "https://safebrowsing.google.com", docs: "https://developers.google.com/safe-browsing/v4", logo: { simpleIcons: "google" },
    baseUrl: "https://safebrowsing.googleapis.com",
    auth: { type: "query", name: "key" },
    fields: [{ id: "token", label: "Google Cloud API key", secret: true }],
    keyUrl: "https://console.cloud.google.com/apis/credentials",
    help: "1) At console.cloud.google.com choose or create a project and enable “Safe Browsing API” (“APIs & Services” → “Library”). "
      + "2) Under “APIs & Services” → “Credentials” click “Create credentials” → “API key”, restrict it to Safe Browsing API and "
      + "copy it. It is free, but Google reserves it for non-commercial use: to check URLs inside services for customers "
      + "it offers the paid Web Risk API.",
    test: { path: "/v4/threatLists",
              message: (d) => `API key is valid (${(d?.threatLists || []).length} threat lists available)` },
    examples: "API v4 is used (v5 responds in protobuf). Examples: POST /v4/threatMatches:find {\"client\": {\"clientId\": "
      + "\"conector\", \"clientVersion\": \"1.0\"}, \"threatInfo\": {\"threatTypes\": [\"MALWARE\", \"SOCIAL_ENGINEERING\", "
      + "\"UNWANTED_SOFTWARE\", \"POTENTIALLY_HARMFUL_APPLICATION\"], \"platformTypes\": [\"ANY_PLATFORM\"], \"threatEntryTypes\": "
      + "[\"URL\"], \"threatEntries\": [{\"url\": \"https://…\"}]}} (up to 500 URLs; responds {} if none appears), "
      + "GET /v4/threatLists.",
    tools: [
      { name: "safebrowsing_check", title: "Safe Browsing: check URLs", annotations: { readOnlyHint: true },
        description: "Checks up to 500 URLs against Google Safe Browsing lists (malware, phishing or social engineering, unwanted "
          + "software and potentially harmful applications) and returns, for each one, whether it appears and in which lists. For "
          + "non-commercial use only.",
        schema: { urls: z.array(z.string().min(4)).min(1).max(500).describe("Full URLs, e.g. https://example.com/login") },
        async run({ urls }, p) {
          const d = ensureOk(await p({ method: "POST", path: "/v4/threatMatches:find", body: {
            client: { clientId: "conector", clientVersion: "1.0" },
            threatInfo: { threatTypes: Object.keys(SAFEBROWSING_THREATS), platformTypes: ["ANY_PLATFORM"], threatEntryTypes: ["URL"],
                          threatEntries: urls.map((url) => ({ url })) } } }), "Safe Browsing");
          const found = new Map();
          for (const m of d?.matches || []) {
            const list = found.get(m.threat?.url) || new Set();
            list.add(SAFEBROWSING_THREATS[m.threatType] || m.threatType);
            found.set(m.threat?.url, list);
          }
          return urls.map((url) => (found.has(url) ? { url, dangerous: true, threats: [...found.get(url)] } : { url, dangerous: false }));
        } },
    ],
  },
  {
    id: "leakix", name: "LeakIX", category: "security", description: "Exposed services and data leaks detected on the Internet",
    website: "https://leakix.net", docs: "https://docs.leakix.net/docs/api/", logo: { image: "https://github.com/LeakIX.png" },
    baseUrl: "https://leakix.net",
    auth: { type: "header", name: "api-key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://leakix.net/settings/api",
    help: "1) Sign in at leakix.net with your account (registration is free). 2) Open your account settings → “API key” and copy "
      + "the key. The free account has a limited number of queries; paid plans increase the quota and access to the "
      + "results.",
    // There is no “who am I” path: a harmless public IP is queried; a fake key gives 401 and a host without data, 404.
    test: { path: "/host/8.8.8.8", acceptStatus: [404], message: "API key is valid" },
    examples: "Examples: GET /host/{ip} (services and leaks of an IP), GET /domain/{domain} (of the domain and its subdomains), "
      + "GET /search?scope=leak&q=+host:example.com&page=0 (scope=service for services; 20 results per page), "
      + "GET /api/subdomains/{domain}, GET /api/plugins. Syntax: +host:…, +ip:…, +port:…, +plugin:…, +country:\"United States\". "
      + "The responses of /host and /domain include the Services and Leaks lists.",
    tools: [
      { name: "leakix_host", title: "LeakIX: services and leaks of a host", annotations: { readOnlyHint: true },
        description: "Exposed services (port, software, HTTP title, certificate) and detected leaks (plugin, severity, type, "
          + "rows and size of the exposed data) of an IP, or of a domain and its subdomains, with organization, ASN and country. "
          + "Counts toward the plan's query quota.",
        schema: { target: z.string().describe("IP (e.g. 8.8.8.8) or domain (e.g. example.com)"),
                   max: z.number().int().min(1).max(200).default(50).describe("Maximum number of services and leaks returned") },
        async run({ target, max }, p) {
          const value = target.trim();
          const isIp = /^[\d.]+$/.test(value) || value.includes(":");
          const r = await p({ path: `/${isIp ? "host" : "domain"}/${segment(value)}` });
          if (r.status === 404) return { target: value, message: "LeakIX has no data for this target" };
          const d = ensureOk(r, "LeakIX") || {};
          const services = d.Services || [];
          const leaks = d.Leaks || [];
          const first = services[0] || leaks[0] || {};
          return dropEmpty({ target: value, organization: first.network?.organization_name, asn: first.network?.asn,
            network: first.network?.network, country: first.geoip?.country_name, total_services: services.length,
            total_leaks: leaks.length, services: services.slice(0, max).map(leakixService), leaks: leaks.slice(0, max).map(leakixLeak) });
        } },
    ],
  },
];
