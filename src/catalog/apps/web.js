// Websites and online stores: content management and e-commerce.
import crypto from "node:crypto";
import { z } from "zod";
import { USER_AGENT, httpRequest } from "../../http.js";
import { ensureOk } from "../define.js";

// Stable version of the Shopify Admin API: one is released per quarter and each is supported for 12 months.
const SHOPIFY_VERSION = "2026-10";
const ORDER_STATUSES = ["any", "pending", "processing", "on-hold", "completed", "cancelled", "refunded", "failed"];

// Shopify apps created in the Dev Dashboard (since 2026) request a 24 h token with “client credentials”, which is kept in
// memory until it expires. Old custom apps use their permanent Admin API token (shpat_…) directly.
let shopifyToken = null;
async function getShopifyToken(c) {
  if (c.token) return c.token;
  if (!c.client_id || !c.client_secret) throw new Error("Shopify: the Client ID and the Client secret are missing (or the token of an old app)");
  if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(c.store || "")) throw new Error("Shopify: the store is not valid");
  const fingerprint = crypto.createHash("sha256").update(JSON.stringify([c.store, c.client_id, c.client_secret])).digest("hex");
  if (shopifyToken?.fingerprint === fingerprint && shopifyToken.expires > Date.now() + 60_000) return shopifyToken.token;
  const d = ensureOk(await httpRequest(`https://${c.store}.myshopify.com/admin/oauth/access_token`, { method: "POST",
    headers: { Accept: "application/json", "User-Agent": USER_AGENT },
    body: new URLSearchParams({ grant_type: "client_credentials", client_id: c.client_id, client_secret: c.client_secret }) }), "Shopify");
  if (!d?.access_token) throw new Error("Shopify: the authentication response does not include a token");
  shopifyToken = { fingerprint, token: d.access_token, expires: Date.now() + (Number(d.expires_in) || 86399) * 1000 };
  return d.access_token;
}

export default [
  {
    id: "wordpress", name: "WordPress", category: "ecommerce", description: "Posts, pages, media and users of your website",
    website: "https://wordpress.org", docs: "https://developer.wordpress.org/rest-api/reference/", logo: { simpleIcons: "wordpress" },
    baseUrl: "{url}/wp-json",
    auth: { type: "basic", usernameField: "username", passwordField: "token" },
    fields: [{ id: "url", label: "Website address (https://…)", format: "url" },
             { id: "username", label: "WordPress username" },
             { id: "token", label: "Application password", secret: true,
               help: "It is not your regular password: create it as explained above." }],
    help: "In the WordPress dashboard: “Users” → “Profile” → “Application Passwords” section. Enter a name (e.g. Conector), "
      + "click “Add New Application Password” and copy it (it is shown only once; spaces do not matter). Requires WordPress 5.6 "
      + "or later, https and permalinks other than “Plain”. Access will have the permissions of that user.",
    test: { path: "/wp/v2/users/me", query: { context: "edit" }, account: (d) => d.email || d.name },
    examples: "Examples: GET /wp/v2/posts?per_page=10&status=draft,publish&context=edit, "
      + "POST /wp/v2/posts {\"title\": \"…\", \"content\": \"…\", \"status\": \"draft\"}, POST /wp/v2/posts/{id} (update), "
      + "GET /wp/v2/pages, GET /wp/v2/categories, GET /wp/v2/comments, "
      + "POST /wp/v2/media (body_base64 + content_type + Content-Disposition header: attachment; filename=photo.jpg), "
      + "GET /wp/v2/plugins.",
  },
  {
    id: "woocommerce", name: "WooCommerce", category: "ecommerce", description: "Orders, products, customers and coupons of your store",
    website: "https://woocommerce.com", docs: "https://woocommerce.github.io/woocommerce-rest-api-docs/", logo: { favicon: "https://woocommerce.com" },
    baseUrl: "{url}/wp-json/wc/v3",
    auth: { type: "basic", usernameField: "consumer_key", passwordField: "consumer_secret" },
    fields: [{ id: "url", label: "Store address (https://…)", format: "url" },
             { id: "consumer_key", label: "Consumer key (ck_…)", secret: true },
             { id: "consumer_secret", label: "Consumer secret (cs_…)", secret: true }],
    help: "In the WordPress dashboard: “WooCommerce” → “Settings” → “Advanced” → “REST API” → “Add key”. Choose a "
      + "user who is an administrator or shop manager and the “Read/Write” permissions (or “Read” if you will only query), click “Generate "
      + "API key” and copy the key and the secret: they are not shown again. The store must use https.",
    test: { path: "/data/currencies/current", message: (d) => `Store connected${d?.code ? ` (currency: ${d.code})` : ""}` },
    examples: "Examples: GET /orders?status=processing&per_page=20, GET /orders/{id}, PUT /orders/{id} {\"status\": \"completed\"}, "
      + "GET /products?search=…&per_page=20, POST /products, PUT /products/{id} {\"stock_quantity\": 5}, GET /customers?email=…, "
      + "GET /coupons, GET /reports/sales?period=month.",
    tools: [
      { name: "woocommerce_orders", title: "WooCommerce: recent orders", annotations: { readOnlyHint: true },
        description: "Orders from newest to oldest, in compact format: number, status, date, total, customer, payment "
          + "and items.",
        schema: { status: z.enum(ORDER_STATUSES).default("any"),
                   since: z.string().optional().describe("Only those created since this date (YYYY-MM-DD)"),
                   max: z.number().int().min(1).max(100).default(20) },
        run: async ({ status: orderStatus, since, max }, p) => ensureOk(await p({ path: "/orders", query: { status: orderStatus, per_page: max,
          after: since ? (since.length === 10 ? `${since}T00:00:00` : since) : undefined } }), "WooCommerce").map((o) => ({
          id: o.id, number: o.number, status: o.status, date: o.date_created, total: `${o.total} ${o.currency}`,
          customer: [o.billing?.first_name, o.billing?.last_name, o.billing?.company].filter(Boolean).join(" "), email: o.billing?.email,
          payment: o.payment_method_title, items: (o.line_items || []).map((l) => `${l.quantity} × ${l.name}`) })) },
    ],
  },
  {
    id: "shopify", name: "Shopify", category: "ecommerce", description: "Orders, products, customers and inventory of your store",
    website: "https://www.shopify.com", docs: "https://shopify.dev/docs/api/admin-graphql", logo: { simpleIcons: "shopify" },
    baseUrl: `https://{store}.myshopify.com/admin/api/${SHOPIFY_VERSION}`,
    auth: { type: "custom", apply: async (c) => ({ headers: { "X-Shopify-Access-Token": await getShopifyToken(c) } }) },
    fields: [{ id: "store", label: "Store (the part before .myshopify.com)", format: "subdomain" },
             { id: "client_id", label: "App Client ID", optional: true },
             { id: "client_secret", label: "App Client secret", secret: true, optional: true },
             { id: "token", label: "Admin API token (shpat_…), old apps only", secret: true, optional: true,
               help: "Only for custom apps created before 2026; if you fill it in, it is used instead of the Client ID and secret." }],
    // One-click connect: OAuth install (authorization code) on a store; the token and the URL belong to each store. Shopify requires
    // expiring access tokens (1 h) with a refresh token: they are requested when exchanging the code and renewed automatically.
    oauth: { scopes: ["read_products", "write_products", "read_orders", "read_customers", "read_inventory", "write_inventory"],
      fields: ["store"], apply: (headers, token) => { headers["X-Shopify-Access-Token"] = token; },
      provider: { name: "Shopify", key: "shopify", redirect: "https", scopeSeparator: ",",
        authorizeUrl: "https://{store}.myshopify.com/admin/oauth/authorize",
        tokenUrl: "https://{store}.myshopify.com/admin/oauth/access_token",
        tokenBody: (body) => (body.grant_type === "authorization_code" ? { ...body, expiring: "1" } : body),
        help: "1) Log in to the Shopify Dev Dashboard (dev.shopify.com/dashboard) with the organization that owns the store and click “Create "
          + "app”: name it “Conector”. 2) In its version set “App URL” to any https URL (e.g. https://www.example.com), “Redirect "
          + "URLs” to the redirect URI shown below and, under “Access”, the permissions (scopes) listed below; click “Release”. "
          + "3) Under “Settings” copy the “Client ID” and the “Secret”. 4) Enter the name of your store above (the part before "
          + ".myshopify.com) and click “Continue with Shopify”: Shopify will ask you to install the app with a user who can do so. Access to "
          + "orders covers the last 60 days." } },
    keyUrl: "https://dev.shopify.com/dashboard",
    help: "In the Shopify admin: “Settings” → “Apps” → “Develop apps” → “Build apps in Dev Dashboard” → “Create app”. In the "
      + "app version set any URL (e.g. https://www.example.com), add the permissions you need under “Access” (e.g. "
      + "read_products, write_products, read_orders, read_customers; read_orders only sees 60 days, read_all_orders the full history) and "
      + "click “Release”. Then, under “Installs”, install it on the store and copy the Client ID and the Client secret. If you already had an old "
      + "custom app, its Admin API token is enough.",
    test: { method: "POST", path: "/graphql.json", body: { query: "{ shop { name myshopifyDomain } }" },
              account: (d) => d.data?.shop?.name },
    graphql: { path: "/graphql.json" },
    examples: "The main API is GraphQL (use shopify_graphql), e.g. { orders(first: 10, reverse: true) { nodes { name createdAt "
      + "displayFinancialStatus totalPriceSet { shopMoney { amount currencyCode } } } } } or "
      + "{ products(first: 20, query: \"status:active\") { nodes { id title totalInventory } } }. "
      + "REST (legacy): GET /shop.json, GET /orders.json?status=any&limit=50, GET /products.json?limit=50, "
      + "GET /customers/search.json?query=email:….",
  },
  {
    id: "webflow", name: "Webflow", category: "ecommerce", description: "Sites, pages, CMS collections, forms and publishing",
    website: "https://webflow.com", docs: "https://developers.webflow.com/data/reference/rest-introduction", logo: { simpleIcons: "webflow" },
    baseUrl: "https://api.webflow.com/v2",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "Site API token", secret: true }],
    // One-click connect: Conector app with the “Data Client” block. Webflow rejects the URL if it requests permissions the app has not configured.
    oauth: { scopes: ["sites:read", "sites:write", "pages:read", "pages:write", "cms:read", "cms:write", "forms:read"],
      provider: { name: "Webflow", key: "webflow", redirect: "https",
        authorizeUrl: "https://webflow.com/oauth/authorize", tokenUrl: "https://api.webflow.com/oauth/access_token",
        help: "1) In Webflow, as a workspace administrator: “Workspace settings” → “Apps & integrations” → “App Development” → "
          + "“Create an App”. 2) Name it “Conector”, enter your company website (e.g. https://www.example.com), enable the block "
          + "“Data Client”, check the permissions (scopes) listed below and paste into “Redirect URI” the redirect URI shown "
          + "below. 3) Save and copy the “Client ID” and the “Client secret” (only workspace administrators can see them). 4) When "
          + "connecting, Webflow will ask you to choose the sites the app can access." } },
    help: "In Webflow: open the site → “Site settings” (gear icon) → “Apps & integrations” → at the bottom, “API access” → “Generate "
      + "API token”. Name it, choose the permissions (e.g. Sites, Pages and Forms read-only; CMS read and write) and copy it. "
      + "Only site administrators can create it and it expires after 365 days without use.",
    test: { path: "/token/introspect",
              message: (d) => `Token with access to ${(d.authorization?.authorizedTo?.siteIds || []).length} site(s)` },
    examples: "Examples: GET /sites, GET /sites/{site_id}/pages, GET /sites/{site_id}/collections, GET /collections/{collection_id}/items, "
      + "POST /collections/{collection_id}/items/insert {\"items\": [{\"fieldData\": {\"name\": \"…\", \"slug\": \"…\"}}]}, "
      + "POST /collections/{collection_id}/items/publish {\"itemIds\": […]}, GET /sites/{site_id}/form_submissions, "
      + "POST /sites/{site_id}/publish {\"publishToWebflowSubdomain\": true}.",
  },
  {
    id: "prestashop", name: "PrestaShop", category: "ecommerce", description: "Orders, products, customers and stock of your store",
    website: "https://www.prestashop.com", docs: "https://devdocs.prestashop-project.org/9/webservice/", logo: { simpleIcons: "prestashop" },
    baseUrl: "{url}/api", query: { output_format: "JSON" },
    auth: { type: "basic", usernameField: "token", fixedPassword: "" },
    fields: [{ id: "url", label: "Store address (https://…)", format: "url",
               help: "If the store is in a subfolder, include it." },
             { id: "token", label: "Webservice key", secret: true }],
    help: "In the back office: “Advanced Parameters” → “Webservice” → turn on “Enable PrestaShop's webservice” and save. Then "
      + "click “Add new webservice key”, generate the key and check, resource by resource, only the permissions needed (view, "
      + "modify, add, delete). The server must have URL rewriting (mod_rewrite) enabled for /api to work.",
    test: { path: "/", query: { output_format: "XML" }, account: (d) => /shopName="([^"]+)"/.exec(String(d))?.[1] },
    examples: "Responses are JSON; writes go in XML (body_base64 with content_type application/xml; template with "
      + "GET /{resource}?schema=blank&output_format=XML). Examples: "
      + "GET /orders?display=[id,reference,current_state,total_paid]&sort=[id_DESC]&limit=20, GET /orders/{id}, "
      + "GET /products?display=full&filter[active]=1&limit=20, GET /customers?filter[email]=…, "
      + "GET /stock_availables?filter[id_product]=….",
  },
];
