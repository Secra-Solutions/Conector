// Declarative connectors: each app is described with data (auth, base URL, connection test and help) and turned here
// into a full connector with its generic <app>_request tool plus any specific tools it ships.
// The definition format is documented in docs/ADDING_APPS.md.
import crypto from "node:crypto";
import { z } from "zod";
import { getCredentials } from "../store.js";
import { USER_AGENT, buildUrl, ensureOk, httpRequest, jsonBody, requestSchema, requestTool } from "../http.js";
import { getAccessToken, PROVIDERS } from "../oauth.js";

export const CATEGORIES = {
  productivity: "Productivity & documents",
  projects: "Project management",
  communication: "Communication",
  crm: "Sales & CRM",
  marketing: "Marketing & SEO",
  finance: "Finance & accounting",
  developer: "Developer tools",
  data: "Data & analytics",
  security: "Security",
  ai: "Artificial intelligence",
  automation: "Automation",
  support: "Customer support",
  ecommerce: "Web & e-commerce",
  design: "Design & creative",
  media: "Media & entertainment",
  education: "Education",
  hr: "HR & recruiting",
};

const AUTH_TYPES = ["bearer", "header", "query", "body", "basic", "client_credentials", "oauth", "aws", "signature", "custom", "none"];
const FORMATS = {
  subdomain: [/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i, "only letters, numbers and hyphens (the part before the first dot)"],
  domain: [/^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i, "a domain name, e.g. shop.myshopify.com"],
  segment: [/^[A-Za-z0-9:_.~-]+$/, "no spaces or slashes"],
  // E-mails inside a URL path (e.g. /accounts/{email}/…): no slashes, "?", "#" or spaces.
  email: [/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/, "a valid e-mail address"],
};
const FORBIDDEN_HEADERS = new Set(["authorization", "proxy-authorization", "cookie", "host", "content-length"]);

const extendedRequestSchema = {
  ...requestSchema,
  form: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional()
    .describe("Body as a form (application/x-www-form-urlencoded) instead of JSON, e.g. for Stripe or Twilio"),
  headers: z.record(z.string(), z.string()).optional()
    .describe("Extra HTTP headers, e.g. Accept (Conector adds the authentication headers itself)"),
};

function bodyOf({ body, body_base64, content_type, form }) {
  if (!body_base64 && form) {
    return { body: new URLSearchParams(Object.entries(form).map(([k, v]) => [k, String(v)])),
             headers: { "Content-Type": "application/x-www-form-urlencoded" } };
  }
  return jsonBody(body, body_base64, content_type);
}

/** URL of a self-hosted instance (n8n, WordPress…): https is required except on this machine. */
// Addresses on a local network. Many self-hosted apps there have no certificate, so with CONECTOR_ALLOW_PRIVATE_HTTP=1
// they may use plain http://: credentials then travel unencrypted, but only inside that network. Cloud metadata
// endpoints stay excluded, so a connection can't be pointed at the credentials of the machine Conector runs on.
function isPrivateHost(hostname) {
  const h = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (["169.254.169.254", "fd00:ec2::254", "metadata.google.internal"].includes(h)) return false;
  const v4 = /^(\d{1,3})\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/.exec(h);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    return a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
  }
  if (h.includes(":")) return /^f[cd][0-9a-f]{2}:/.test(h); // IPv6 unique local addresses (fc00::/7)
  return !h.includes(".") || /\.(local|lan|home\.arpa)$/.test(h) || h === "host.docker.internal";
}

export function normalizeUrl(value) {
  let u;
  try {
    u = new URL(String(value).trim());
  } catch {
    throw new Error(`"${value}" is not a valid URL`);
  }
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(u.hostname);
  if (u.protocol === "http:" && !local && isPrivateHost(u.hostname)) {
    if (process.env.CONECTOR_ALLOW_PRIVATE_HTTP !== "1") {
      throw new Error("The URL must start with https://. To use http:// on your local network, start Conector with "
        + "CONECTOR_ALLOW_PRIVATE_HTTP=1");
    }
  } else if (u.protocol !== "https:" && !(local && u.protocol === "http:")) throw new Error("The URL must start with https://");
  if (u.username || u.password || u.search || u.hash) throw new Error("The URL cannot contain a user, query parameters or #");
  return `${u.origin}${u.pathname.replace(/\/+$/, "")}`;
}

// Fills {field} placeholders in URLs with validated values, so nobody can redirect the credentials to another server.
function fill(template, def, cred) {
  return template.replace(/\{(\w+)\}/g, (_, k) => {
    const field = def.fields.find((f) => f.id === k);
    const value = def.derived?.[k] ? def.derived[k](cred) : (cred?.[k] ?? field?.default);
    const label = field?.label || k;
    if (value === undefined || value === null || value === "") throw new Error(`Missing "${label}"`);
    if (field?.options && !field.options.some(([v]) => v === value)) throw new Error(`"${label}": invalid option`);
    if (field?.format === "url") return normalizeUrl(value);
    const [pattern, explanation] = FORMATS[field?.format || "segment"];
    if (!pattern.test(String(value))) throw new Error(`"${label}" is not valid: ${explanation}`);
    return String(value);
  });
}

const clientTokens = new Map();

// OAuth "client credentials" (Zoom, PayPal, Personio…): the token is requested on the fly and cached until it expires.
async function clientCredentialsToken(def, a, cred) {
  const client = cred[a.clientIdField || "client_id"];
  const secret = cred[a.clientSecretField || "client_secret"];
  const url = new URL(fill(typeof a.url === "function" ? a.url(cred) : a.url, def, cred));
  const params = Object.fromEntries(Object.entries(a.params || { grant_type: "client_credentials" })
    .map(([k, v]) => [k, fill(String(v), def, cred)]));
  // Keyed by everything that shapes the token: members with personal connections to the same app have their own clients.
  const fingerprint = crypto.createHash("sha256").update(JSON.stringify([def.id, client, secret, url.href, params])).digest("hex");
  const cached = clientTokens.get(fingerprint);
  if (cached && cached.expires > Date.now() + 60_000) return cached.token;
  const options = { method: "POST", headers: { Accept: "application/json", "User-Agent": USER_AGENT } };
  if (a.credentialsIn === "body") Object.assign(params, { client_id: client, client_secret: secret });
  else options.headers.Authorization = `Basic ${Buffer.from(`${client}:${secret}`).toString("base64")}`;
  if (a.paramsIn === "query") for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  else if (a.format === "json") Object.assign(options, { body: JSON.stringify(params), headers: { ...options.headers, "Content-Type": "application/json" } });
  else options.body = new URLSearchParams(params);
  const d = ensureOk(await httpRequest(url, options), def.name);
  const token = d?.access_token || d?.data?.token || d?.token;
  if (!token) throw new Error(`${def.name}: the authentication response has no token`);
  clientTokens.set(fingerprint, { token, expires: Date.now() + (Number(d.expires_in) || 3000) * 1000 });
  return token;
}

// AWS Signature Version 4: AWS services and S3-compatible storage (Cloudflare R2, Wasabi…).
const AWS_SIGNING_ALIASES = { email: "ses", "bedrock-runtime": "bedrock", "bedrock-agent": "bedrock", "bedrock-agent-runtime": "bedrock",
  "runtime.sagemaker": "sagemaker", "api.sagemaker": "sagemaker", "api.ecr": "ecr", "streams.dynamodb": "dynamodb", "data.iot": "iotdata",
  "runtime.lex": "lex", "api.pricing": "pricing" };
const rfc3986 = (t) => encodeURIComponent(t).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
const sha256 = (data) => crypto.createHash("sha256").update(data).digest("hex");
const hmac = (key, data) => crypto.createHmac("sha256", key).update(data).digest();

/** Signing name and region from the host name (ec2.eu-west-1.amazonaws.com, iam.amazonaws.com, bucket.s3.eu-west-1…). */
export function awsServiceAndRegion(host) {
  let m;
  if ((m = /^(?:.+\.)?s3[.-](?:dualstack\.)?([a-z]{2}(?:-gov)?-[a-z]+-\d)\.amazonaws\.com$/.exec(host))) return { service: "s3", region: m[1] };
  if (/^(?:.+\.)?s3\.amazonaws\.com$/.test(host)) return { service: "s3", region: "us-east-1" };
  if ((m = /^(.+)\.([a-z]{2}(?:-gov)?-[a-z]+-\d)\.amazonaws\.com$/.exec(host))) return { service: AWS_SIGNING_ALIASES[m[1]] || m[1], region: m[2] };
  if ((m = /^([a-z0-9-]+)\.amazonaws\.com$/.exec(host))) return { service: AWS_SIGNING_ALIASES[m[1]] || m[1], region: "us-east-1" };
  return { service: "s3", region: "us-east-1" };
}

/** Signs the request: adds x-amz-date and Authorization to `headers` and puts the query of `url` in canonical form. */
export function signAws({ method, url, headers, body, key, secret, session, service, region, date = new Date() }) {
  const amz = date.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const day = amz.slice(0, 8);
  const bodyHash = sha256(body == null ? "" : body instanceof URLSearchParams ? body.toString() : body);
  headers["x-amz-date"] = amz;
  if (service === "s3") headers["x-amz-content-sha256"] = bodyHash;
  if (session) headers["x-amz-security-token"] = session;
  const query = [...url.searchParams].map(([k, v]) => [rfc3986(k), rfc3986(v)])
    .sort(([a, x], [b, y]) => (a < b ? -1 : a > b ? 1 : x < y ? -1 : x > y ? 1 : 0)).map(([k, v]) => `${k}=${v}`).join("&");
  url.search = query ? `?${query}` : "";
  const decode = (t) => {
    try {
      return decodeURIComponent(t);
    } catch {
      return t;
    }
  };
  const route = url.pathname.split("/").map((t) => rfc3986(service === "s3" ? decode(t) : t)).join("/") || "/";
  const signed = { host: url.host };
  for (const [k, v] of Object.entries(headers)) signed[k.toLowerCase()] = String(v).trim().replace(/\s+/g, " ");
  const names = Object.keys(signed).sort();
  const canonical = [method, route, query, names.map((n) => `${n}:${signed[n]}\n`).join(""), names.join(";"), bodyHash].join("\n");
  const scope = `${day}/${region}/${service}/aws4_request`;
  const signingKey = hmac(hmac(hmac(hmac(`AWS4${secret}`, day), region), service), "aws4_request");
  const signature = crypto.createHmac("sha256", signingKey).update(["AWS4-HMAC-SHA256", amz, scope, sha256(canonical)].join("\n")).digest("hex");
  headers.Authorization = `AWS4-HMAC-SHA256 Credential=${key}/${scope}, SignedHeaders=${names.join(";")}, Signature=${signature}`;
}

async function applyAuth(def, cred, headers, query, oauthCfg, read) {
  for (const a of [].concat(def.auth || [])) {
    const value = cred[a.field || "token"];
    switch (a.type) {
      case "bearer":
        if (value) headers.Authorization = `Bearer ${value}`;
        break;
      case "header":
        if (value) headers[a.name] = `${a.prefix || ""}${value}`;
        break;
      case "query":
        if (value) query[a.name] = value;
        break;
      case "basic": {
        const user = a.fixedUsername ?? cred[a.usernameField] ?? "";
        const password = a.fixedPassword ?? cred[a.passwordField] ?? "";
        headers.Authorization = `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`;
        break;
      }
      case "client_credentials":
        headers.Authorization = `Bearer ${await clientCredentialsToken(def, a, cred)}`;
        break;
      case "oauth":
        headers.Authorization = `Bearer ${await getAccessToken(def.id, oauthCfg, read)}`;
        break;
      case "custom": {
        const r = (await a.apply(cred)) || {};
        Object.assign(headers, r.headers);
        Object.assign(query, r.query);
        break;
      }
      default:
        break;
    }
  }
}

// Some services echo the key in their error messages (e.g. Semrush): it must never reach the agent or the audit log.
export function redactSecrets(r, secrets) {
  if (!secrets.length || r.data == null || r.data.base64) return r;
  let text = typeof r.data === "string" ? r.data : JSON.stringify(r.data);
  if (!secrets.some((x) => text.includes(x))) return r;
  for (const x of secrets) text = text.split(x).join("••••••");
  return { ...r, data: typeof r.data === "string" ? text : JSON.parse(text) };
}

function filterHeaders(headers) {
  return Object.fromEntries(Object.entries(headers || {}).filter(([k, v]) =>
    /^[A-Za-z0-9-]{1,64}$/.test(k) && !FORBIDDEN_HEADERS.has(k.toLowerCase()) && typeof v === "string" && !/[\r\n]/.test(v)));
}

function checkDefinition(def) {
  const fail = (m) => {
    throw new Error(`App "${def.id || def.name || "?"}": ${m}`);
  };
  if (!/^[a-z][a-z0-9]{1,30}$/.test(def.id || "")) fail("invalid id (lowercase letters and digits, starting with a letter)");
  if (!def.name || !def.description) fail("missing name or description");
  if (!CATEGORIES[def.category]) fail(`unknown category "${def.category}"`);
  if (!def.baseUrl || !["string", "function"].includes(typeof def.baseUrl)) fail("missing baseUrl");
  if (!def.test?.path) fail("missing connection test (test.path)");
  const ids = new Set();
  for (const f of def.fields) {
    if (!/^[a-z_][a-z0-9_]*$/.test(f.id || "") || ids.has(f.id)) fail(`invalid or repeated field: ${f.id}`);
    if (f.format && f.format !== "url" && !FORMATS[f.format]) fail(`unknown format in ${f.id}`);
    ids.add(f.id);
  }
  for (const a of [].concat(def.auth || [])) {
    if (!AUTH_TYPES.includes(a.type)) fail(`unknown auth type "${a.type}"`);
    const refs = ["bearer", "header", "query"].includes(a.type) || (a.type === "body" && !a.value) ? [a.field || "token"]
      : a.type === "basic" ? [a.fixedUsername === undefined && a.usernameField, a.fixedPassword === undefined && a.passwordField]
      : a.type === "client_credentials" ? [a.clientIdField || "client_id", a.clientSecretField || "client_secret"]
      : a.type === "aws" ? [a.keyField || "access_key_id", a.secretField || "secret_access_key"] : [];
    for (const r of refs.filter(Boolean)) if (!ids.has(r)) fail(`auth uses the field "${r}", which does not exist`);
    if (a.type === "header" && !a.name) fail("header auth without a name");
    if (a.type === "query" && !a.name) fail("query auth without a name");
    if (a.type === "body" && !a.name) fail("body auth without a name");
    if (a.type === "body" && a.value && typeof a.value !== "function") fail("body auth \"value\" must be a function");
    if (a.type === "signature" && typeof a.sign !== "function") fail("\"signature\" auth needs a sign function");
    if (a.type === "custom" && typeof a.apply !== "function") fail("\"custom\" auth needs an apply function");
    if (a.type === "oauth") {
      const p = typeof a.provider === "string" ? PROVIDERS[a.provider] : a.provider;
      // scopes: [] for providers without scopes (permissions are chosen when registering the app).
      if (!p?.name || !p.authorizeUrl || !p.tokenUrl || !Array.isArray(a.scopes)) fail("OAuth without a valid provider (name, authorizeUrl, tokenUrl) or scopes");
    }
  }
  // Every {placeholder} that gets filled in (URLs, token requests, AWS hints, OAuth endpoints, test paths) must name a
  // field or a derived value.
  const placeholders = (where, text) => {
    if (typeof text !== "string") return;
    for (const [, k] of text.matchAll(/\{(\w+)\}/g)) if (!ids.has(k) && !def.derived?.[k]) fail(`${where} uses {${k}}, which is not a field`);
  };
  placeholders("the URL", def.baseUrl);
  placeholders("oauth.baseUrl", def.oauth?.baseUrl);
  placeholders("test.path", def.test?.path);
  placeholders("oauth.test.path", def.oauth?.test?.path);
  for (const o of def.allowedOrigins || []) if (!o.startsWith("^")) placeholders("allowedOrigins", o);
  for (const a of [].concat(def.auth || [])) {
    if (a.type === "client_credentials") {
      placeholders("the token URL", a.url);
      for (const v of Object.values(a.params || {})) placeholders("the token request", v);
    }
    if (a.type === "aws") for (const v of [a.service, a.region]) placeholders("the AWS settings", v);
  }
  for (const p of [def.oauth?.provider, ...[].concat(def.auth || []).filter((a) => a.type === "oauth").map((a) => a.provider)]) {
    if (p && typeof p === "object") for (const u of [p.authorizeUrl, p.tokenUrl, p.refreshUrl]) placeholders("the OAuth provider", u);
  }
  if (def.oauth) {
    if ([].concat(def.auth || []).some((a) => a.type === "oauth")) fail("use either the \"oauth\" block or auth: { type: \"oauth\" }, not both");
    const p = typeof def.oauth.provider === "string" ? PROVIDERS[def.oauth.provider] : def.oauth.provider;
    if (!p?.name || !p.authorizeUrl || !p.tokenUrl || !Array.isArray(def.oauth.scopes)) fail("oauth without a valid provider (name, authorizeUrl, tokenUrl) or scopes");
    for (const k of def.oauth.fields || []) if (!ids.has(k)) fail(`oauth.fields uses "${k}", which is not a field`);
    if (def.oauth.baseUrl && !["string", "function"].includes(typeof def.oauth.baseUrl)) fail("invalid oauth.baseUrl");
    if (def.oauth.apply && typeof def.oauth.apply !== "function") fail("oauth.apply must be a function");
    if (def.oauth.test && !def.oauth.test.path) fail("oauth.test without a path");
    // With OAuth only oauth.fields are asked for: the URL cannot depend on the others (except those that come with the token).
    const base = def.oauth.baseUrl || def.baseUrl;
    const valid = new Set([...(def.oauth.fields || []), ...def.fields.filter((f) => f.hidden).map((f) => f.id)]);
    if (def.auth && typeof base === "string") {
      for (const [, k] of base.matchAll(/\{(\w+)\}/g)) if (!valid.has(k) && !def.derived?.[k]) fail(`with OAuth the URL uses {${k}}: add it to oauth.fields`);
    }
  }
  if (def.keyUrl && !/^https:\/\/[^\s]+$/.test(def.keyUrl)) fail("keyUrl must be an https URL");
  const prefix = def.toolPrefix || def.id;
  for (const t of def.tools || []) {
    if (!t.name?.startsWith(`${prefix}_`) || !/^[a-z0-9_]{3,64}$/.test(t.name)) fail(`tool with an invalid name: ${t.name}`);
    if (!t.description || typeof t.run !== "function" || typeof t.schema !== "object") fail(`incomplete tool: ${t.name}`);
  }
}

/**
 * Turns an app definition into a connector. `readCredentials` lets the catalog validator use fake credentials
 * without touching the store (scripts/validate-catalog.mjs).
 */
export function defineConnector(definition, { readCredentials = getCredentials } = {}) {
  const def = { fields: [], ...definition };
  const auths = [].concat(def.auth || []);
  checkDefinition(def);
  const prefix = def.toolPrefix || def.id;
  // Two ways to connect: one click (OAuth: the definition's "oauth" block, or auth: { type: "oauth" } when it is the only
  // one) and API key (auth + fields). The OAuth app belongs to the provider (src/oauth.js): definitions never ask for a
  // client ID or secret.
  const oauthAuth = auths.find((a) => a.type === "oauth");
  const oauthDef = def.oauth || oauthAuth;
  const oauthOnly = Boolean(oauthAuth) || (Boolean(def.oauth) && !def.auth);
  const oauthCfg = oauthDef ? {
    key: typeof oauthDef.provider === "string" ? oauthDef.provider : (oauthDef.provider.key || def.id),
    provider: typeof oauthDef.provider === "string" ? PROVIDERS[oauthDef.provider] : oauthDef.provider,
    scopes: oauthDef.scopes,
    resolve: (text, cred) => fill(text, def, cred),
  } : null;
  // Data asked before "Connect" (subdomain, data center…): for OAuth-only apps, all fields.
  const oauthFields = !oauthCfg ? [] : oauthOnly ? def.fields : def.fields.filter((f) => (def.oauth.fields || []).includes(f.id));
  const viaOAuth = (cred) => Boolean(oauthCfg) && (oauthOnly || cred?.method === "oauth");
  const baseOf = (cred) => (viaOAuth(cred) && def.oauth?.baseUrl ? def.oauth.baseUrl : def.baseUrl);
  const aws = auths.find((a) => a.type === "aws");

  async function request({ method = "GET", path, query, body, body_base64, content_type, form, headers } = {}) {
    const cred = readCredentials(def.id);
    if (!cred) throw new Error(`${def.name} is not connected`);
    const oauthNow = viaOAuth(cred);
    const template = baseOf(cred);
    const base = fill(typeof template === "function" ? template(cred) : template, def, cred);
    const origins = (def.allowedOrigins || []).map((o) => (o.startsWith("^") ? o : fill(o, def, cred)));
    const q = { ...(def.query || {}), ...(query || {}) };
    // Key inside the body (APIs that only read it from the JSON or form body of each request that has a body).
    const inBody = !oauthNow && auths.find((a) => a.type === "body");
    // `value` builds composite values (Kraken.io: {"auth": {"api_key", "api_secret"}}).
    const key = inBody && (inBody.value ? inBody.value(cred) : cred[inBody.field || "token"]);
    if (key && !["GET", "HEAD"].includes(String(method).toUpperCase()) && !body_base64) {
      if (form) form = { ...form, [inBody.name]: key };
      else body = { ...(body && typeof body === "object" && !Array.isArray(body) ? body : {}), [inBody.name]: key };
    }
    const payload = bodyOf({ body, body_base64, content_type, form });
    const fixed = typeof def.headers === "function" ? def.headers(cred) : def.headers;
    const h = { Accept: "application/json", "User-Agent": USER_AGENT, ...(fixed || {}), ...payload.headers, ...filterHeaders(headers) };
    if (oauthNow && def.oauth) {
      const token = await getAccessToken(def.id, oauthCfg, readCredentials);
      if (def.oauth.apply) def.oauth.apply(h, token, cred);
      else h.Authorization = `Bearer ${token}`;
    } else {
      await applyAuth(def, cred, h, q, oauthCfg, readCredentials);
    }
    const url = buildUrl(base, path, q, origins);
    if (aws && !oauthNow) {
      // The agent can pass the signing name or region when they can't be deduced from the host (x-conector-aws-* headers).
      const hint = (n) => {
        const k = Object.keys(h).find((x) => x.toLowerCase() === n);
        const v = k ? h[k] : undefined;
        if (k) delete h[k];
        return v;
      };
      const deduced = awsServiceAndRegion(url.hostname);
      signAws({ method, url, headers: h, body: payload.body, key: cred[aws.keyField || "access_key_id"],
                secret: cred[aws.secretField || "secret_access_key"], session: cred[aws.sessionField || "session_token"],
                service: hint("x-conector-aws-service") || (aws.service && fill(aws.service, def, cred)) || deduced.service,
                region: hint("x-conector-aws-region") || (aws.region && fill(aws.region, def, cred)) || deduced.region });
    }
    // Signatures that depend on the exact request (OVHcloud, exchanges…): they get the method, final URL and body.
    for (const a of auths.filter((x) => x.type === "signature" && (!oauthNow || oauthOnly))) {
      await a.sign({ method, url, headers: h, body: payload.body, cred });
    }
    const r = await httpRequest(url, { method, ...payload, headers: h, timeout: def.timeout });
    const secrets = def.fields.filter((f) => f.secret).map((f) => cred[f.id]).filter((v) => typeof v === "string" && v.length >= 8);
    return redactSecrets(r, secrets);
  }

  async function test() {
    const cred = readCredentials(def.id);
    if (!cred) throw new Error(`${def.name} is not connected`);
    const t = viaOAuth(cred) && def.oauth?.test ? def.oauth.test : def.test;
    const path = t.path.includes("{") ? fill(t.path, def, cred) : t.path;
    const r = await request({ method: t.method || "GET", path, query: t.query, body: t.body, form: t.form, headers: t.headers });
    if (!r.ok && !(t.acceptStatus || []).includes(r.status)) ensureOk(r, def.name);
    const errors = r.data?.errors;
    if (Array.isArray(errors) && errors.length && !r.data?.data) throw new Error(`${def.name}: ${errors[0]?.message || JSON.stringify(errors[0])}`);
    if (t.validate) t.validate(r.data, r);
    let account = null;
    try {
      account = t.account ? t.account(r.data, cred) : null;
    } catch {
      account = null;
    }
    account = account ? String(account).slice(0, 80) : null;
    const message = typeof t.message === "function" ? t.message(r.data) : t.message;
    return { ok: true, message: account ? `Connected as ${account}` : (message || "Credentials are valid"), account };
  }

  // Checks the form data before saving it (formats and the resulting URL).
  function validate(cred) {
    for (const f of viaOAuth(cred) ? oauthFields : def.fields) {
      if (cred[f.id] && f.options && !f.options.some(([v]) => v === cred[f.id])) throw new Error(`"${f.label}": invalid option`);
      if (cred[f.id] && f.format === "url") normalizeUrl(cred[f.id]);
      else if (cred[f.id] && f.format && !FORMATS[f.format][0].test(cred[f.id])) {
        throw new Error(`"${f.label}" is not valid: ${FORMATS[f.format][1]}`);
      }
    }
    // Hidden fields (e.g. the instance returned by OAuth) don't exist yet when saving: they are not required.
    const hidden = new Set(def.fields.filter((f) => f.hidden).map((f) => f.id));
    const template = baseOf(cred);
    const base = typeof template === "function" ? template(cred) : template;
    if (![...base.matchAll(/\{(\w+)\}/g)].some(([, k]) => hidden.has(k) && !cred[k])) fill(base, def, cred);
  }

  const tools = [{
    ...requestTool(prefix, def.name, typeof def.baseUrl === "string" ? def.baseUrl : "API", def.examples),
    schema: extendedRequestSchema,
    run: (a) => request(a).then((r) => ensureOk(r, def.name)),
  }];
  if (def.graphql) {
    tools.push({
      name: `${prefix}_graphql`, title: `${def.name}: GraphQL query`, annotations: { destructiveHint: true, openWorldHint: true },
      description: `Runs a GraphQL query or mutation against the ${def.name} API.`,
      schema: { query: z.string().describe("GraphQL query or mutation"), variables: z.record(z.string(), z.any()).optional() },
      async run({ query, variables }) {
        const d = ensureOk(await request({ method: "POST", path: def.graphql.path, body: { query, variables } }), def.name);
        if (d?.errors?.length && !d.data) throw new Error(`${def.name}: ${d.errors.map((x) => x.message).join("; ")}`);
        return d;
      },
    });
  }
  for (const t of def.tools || []) tools.push({ ...t, run: (a) => t.run(a, request) });

  return {
    id: def.id, name: def.name, description: def.description, category: def.category, website: def.website, docs: def.docs,
    logo: def.logo || {}, fields: def.fields, oauthFields, type: oauthOnly ? "oauth" : oauthCfg ? "mixed" : "key",
    // help: how to get the key (or connection notes when there is only OAuth); registering the OAuth app is explained in
    // the provider's help (OAuth apps page).
    help: oauthOnly ? "" : def.help, oauthHelp: oauthOnly ? def.help : def.oauth?.help, keyUrl: def.keyUrl,
    oauth: oauthCfg,
    baseUrlText: typeof def.baseUrl === "string" ? def.baseUrl : null,
    request, test, validate, tools,
    method: (cred) => (viaOAuth(cred) ? "oauth" : "key"),
    // OAuth: authorized when there is a refresh token or a non-expiring token. Key: all required fields saved.
    ready: (cred) => {
      if (!cred) return false;
      if (viaOAuth(cred)) return Boolean(cred.refresh_token || (cred.access_token && cred.expires === null));
      return def.fields.every((f) => f.optional || f.hidden || cred[f.id]);
    },
  };
}

export { ensureOk };
