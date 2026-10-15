// Conector: web panel to connect apps, MCP server for agents and a small REST API — one Node process.
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";
import path from "node:path";
import zlib from "node:zlib";
import * as auth from "./auth.js";
import { AGENTS } from "./agents.js";
import { CONFIG, ROOT, VERSION } from "./config.js";
import { runAs } from "./context.js";
import { CATEGORIES, CATALOG_ERRORS, CONNECTORS, connector, isConnected, MICROSOFT_CLIENT, microsoftFlow, startMicrosoftDeviceFlow,
         testConnector } from "./connectors.js";
import { createMcpServer } from "./mcp.js";
import { authorizationUrl, completeAuthorization, discardPending, pendingAuthorization } from "./oauth.js";
import { audit, connectionIn, connectionsIn, deleteConnection, deleteOAuthApp, getCredentialsIn, getOAuthApp, personalScope, recentAudit,
         saveCredentials, saveOAuthApp, SHARED } from "./store.js";
import { render } from "./ui/html.js";
import { agentLogoSrc, appLogoSrc } from "./ui/logos.js";
import { agentsPage } from "./ui/pages/agents.js";
import { appPage, appsPage } from "./ui/pages/apps.js";
import { auditPage, errorPage, oauthAppPage, oauthAppsPage, usersPage } from "./ui/pages/admin.js";
import { invitePage, loginPage, oauthReturnPage, resetPage, setupPage } from "./ui/pages/auth.js";
import { homePage } from "./ui/pages/home.js";
import { settingsPage, tokensPage } from "./ui/pages/account.js";

const app = express();
app.disable("x-powered-by");
if (CONFIG.trustProxy) app.set("trust proxy", "loopback, linklocal, uniquelocal");
// Pages (the full catalog is ~700 kB of HTML) and the command palette's JSON are compressed when the browser allows it.
function compressed(res, type, text) {
  const accept = String(res.req.headers["accept-encoding"] || "");
  const body = Buffer.from(text);
  res.type(type).vary("Accept-Encoding");
  if (body.length < 4096) return res.send(body);
  if (/\bbr\b/.test(accept)) return res.set("Content-Encoding", "br").send(zlib.brotliCompressSync(body, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 5 } }));
  if (/\bgzip\b/.test(accept)) return res.set("Content-Encoding", "gzip").send(zlib.gzipSync(body, { level: 6 }));
  res.send(body);
}
const send = (res, page, status = 200) => compressed(res.status(status), "html", render(page));
const MCP_URL = `${CONFIG.publicUrl}/mcp`;

// ---------------------------------------------------------------- security for every request

app.use((req, res, next) => {
  if (!CONFIG.allowedHosts.has(req.headers.host)) return res.status(421).send("Host not allowed"); // DNS rebinding
  res.set({
    "X-Frame-Options": "DENY", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "same-origin", "Cache-Control": "no-store",
    "Cross-Origin-Opener-Policy": "same-origin",
    // form-action allows https: because "Continue with …" forms end in a redirect to the provider's sign-in page.
    "Content-Security-Policy": "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; font-src 'self'; "
      + "connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self' https: http://localhost:* http://127.0.0.1:*",
    ...(CONFIG.hsts ? { "Strict-Transport-Security": "max-age=31536000" } : {}),
  });
  next();
});
const sandboxed = (req, res, next) => {
  res.set({ "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox", "Cache-Control": "public, max-age=86400" });
  next();
};
app.use("/logos", sandboxed, express.static(path.join(ROOT, "public", "logos"), { maxAge: "1d" }));
app.use("/agent-logos", sandboxed, express.static(path.join(ROOT, "public", "agents"), { maxAge: "1d" }));
app.use("/assets", (req, res, next) => {
  res.set("Cache-Control", "public, max-age=3600");
  next();
}, express.static(path.join(ROOT, "public"), { index: false, maxAge: "1h" }));
app.get("/favicon.ico", (req, res) => res.redirect(301, "/assets/brand/favicon.png"));
app.get("/healthz", (req, res) => res.json({ ok: true, version: VERSION }));

const cookie = (req, name) => (req.headers.cookie || "").split(";").map((c) => c.trim().split("=")).find(([k]) => k === name)?.[1];
const bearer = (req) => /^Bearer\s+(.+)$/i.exec(req.headers.authorization || "")?.[1]?.trim();
const origin = (req) => `${req.protocol}://${req.headers.host}`;
const short = (v) => (typeof v === "string" ? v.slice(0, 300) : undefined);
const flashOf = (req) => ({ ok: short(req.query.ok), error: short(req.query.error) });
const back = (res, url, kind, text) => res.redirect(303, `${url}${url.includes("?") ? "&" : "?"}${kind}=${encodeURIComponent(text)}`);

// Forms must come from this panel. When a browser sends "Origin: null", Sec-Fetch-Site (set by the browser itself) decides.
function sameOrigin(req, res, next) {
  const o = req.headers.origin || (req.headers.referer ? new URL(req.headers.referer).origin : null);
  const own = o && CONFIG.allowedHosts.has(o.replace(/^https?:\/\//, ""));
  if (!own && req.headers["sec-fetch-site"] !== "same-origin") return res.status(403).send("Origin not allowed");
  next();
}
const form = [express.urlencoded({ extended: false, limit: "64kb" }), sameOrigin];
const SESSION_COOKIE = CONFIG.https ? "__Host-conector" : "conector_session";
// Lax (not Strict): coming back from the OAuth provider is a cross-site navigation that must keep the session. Forms are
// still protected by the CSRF token and the origin check, and no GET request changes data.
const setSession = (res, id) => res.set("Set-Cookie", `${SESSION_COOKIE}=${id}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${CONFIG.sessionHours * 3600}${CONFIG.https ? "; Secure" : ""}`);
const clearSession = (res) => res.set("Set-Cookie", `${SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${CONFIG.https ? "; Secure" : ""}`);

function withSession(req, res, next) {
  const s = auth.getSession(cookie(req, SESSION_COOKIE));
  if (!s) {
    if (["GET", "HEAD"].includes(req.method) && req.accepts("html")) {
      return res.redirect(auth.hasUsers() ? `/login?next=${encodeURIComponent(req.originalUrl)}` : "/setup");
    }
    return res.status(401).json({ error: "Not signed in" });
  }
  if (req.method === "POST" && req.body?.csrf !== s.csrf) return res.status(403).send("This form expired: reload the page and try again.");
  req.session = s;
  runAs({ userId: s.user.id, via: "panel" }, next);
}
function adminOnly(req, res, next) {
  if (req.session.user.role !== "admin") return send(res, errorPage({ session: req.session, status: 403, title: "Admins only", text: "Ask an admin of your workspace for access." }), 403);
  next();
}
const page = (req) => ({ session: req.session, flash: flashOf(req), catalogErrors: CATALOG_ERRORS });
const who = (req) => ({ userId: req.session.user.id, email: req.session.user.email });

// ---------------------------------------------------------------- first-run setup, sign in, invitations, resets

const failures = new Map();
const throttled = (key) => (failures.get(key)?.until || 0) > Date.now();
function failed(key) {
  if (failures.size > 10_000) for (const [k, f] of failures) if (f.until < Date.now()) failures.delete(k);
  const f = failures.get(key) || { n: 0, until: 0 };
  f.n += 1;
  if (f.n >= 5) Object.assign(f, { n: 0, until: Date.now() + 10 * 60_000 });
  failures.set(key, f);
}

app.get("/setup", (req, res) => (auth.hasUsers() ? res.redirect("/login") : send(res, setupPage({ code: short(req.query.code) || "" }))));
app.post("/setup", form, (req, res) => {
  if (auth.hasUsers()) return res.redirect("/login");
  const { code, name, email, password, password2 } = req.body;
  const retry = (error) => send(res, setupPage({ code, error }), 400);
  if (throttled(`setup:${req.ip}`)) return retry("Too many attempts. Wait a few minutes.");
  if (!auth.checkSetupCode(String(code || "").trim())) {
    failed(`setup:${req.ip}`);
    return retry("That setup code is not valid. Check the server log.");
  }
  if (password !== password2) return retry("The passwords don't match.");
  let user;
  try {
    user = auth.createUser({ email, name, role: "admin", password });
  } catch (e) {
    return retry(e.message);
  }
  auth.consumeSetupCode();
  audit({ action: "create admin account", userId: user.id, email: user.email, ok: true });
  setSession(res, auth.startSession(user.id)).redirect(303, "/?ok=Welcome%20to%20Conector");
});

app.get("/login", (req, res) => (auth.hasUsers() ? send(res, loginPage({ next: short(req.query.next) || "" })) : res.redirect("/setup")));
app.post("/login", form, async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const next = /^\/(?!\/)/.test(req.body.next || "") ? req.body.next : "/";
  if (throttled(`login:${email}`) || throttled(`login-ip:${req.ip}`)) return send(res, loginPage({ email, next, error: "Too many attempts. Wait a few minutes." }), 429);
  const user = auth.verifyPassword(email, req.body.password);
  if (!user) {
    failed(`login:${email}`);
    failed(`login-ip:${req.ip}`);
    audit({ action: "sign in", email, ok: false, error: "wrong credentials" });
    await new Promise((ok) => setTimeout(ok, 800));
    return send(res, loginPage({ email, next, error: "Wrong e-mail or password." }), 401);
  }
  failures.delete(`login:${email}`);
  audit({ action: "sign in", userId: user.id, email: user.email, ok: true });
  setSession(res, auth.startSession(user.id)).redirect(303, next);
});
app.post("/logout", form, withSession, (req, res) => {
  auth.endSession(cookie(req, SESSION_COOKIE));
  clearSession(res).redirect(303, "/login");
});

app.get("/invite/:token", (req, res) => send(res, invitePage({ invite: auth.findInvite(req.params.token), token: req.params.token })));
app.post("/invite/:token", form, (req, res) => {
  const invite = auth.findInvite(req.params.token);
  const retry = (error) => send(res, invitePage({ invite, token: req.params.token, error }), 400);
  if (!invite) return retry();
  if (req.body.password !== req.body.password2) return retry("The passwords don't match.");
  try {
    const user = auth.acceptInvite(req.params.token, { name: req.body.name, password: req.body.password });
    audit({ action: "accept invitation", userId: user.id, email: user.email, ok: true });
    setSession(res, auth.startSession(user.id)).redirect(303, "/?ok=Welcome%20to%20the%20workspace");
  } catch (e) {
    retry(e.message);
  }
});

app.get("/reset/:token", (req, res) => send(res, resetPage({ valid: Boolean(auth.findReset(req.params.token)), token: req.params.token })));
app.post("/reset/:token", form, (req, res) => {
  const retry = (error) => send(res, resetPage({ valid: Boolean(auth.findReset(req.params.token)), token: req.params.token, error }), 400);
  if (req.body.password !== req.body.password2) return retry("The passwords don't match.");
  try {
    const user = auth.useReset(req.params.token, req.body.password);
    audit({ action: "reset password", userId: user.id, email: user.email, ok: true });
    res.redirect(303, "/login?ok=Password%20changed.%20Sign%20in%20again.");
  } catch (e) {
    retry(e.message);
  }
});

// ---------------------------------------------------------------- connection state helpers

const oneClick = (c) => c.type === "oauth" || c.type === "mixed" || c.type === "device";

function readyIn(c, scope) {
  const cred = getCredentialsIn(c.id, scope);
  return Boolean(cred) && (c.ready ? c.ready(cred) : true);
}

/** Per-app state for the list views: connected (personal or shared), shared, error. */
function appStates(user) {
  const personal = connectionsIn(personalScope(user.id));
  const shared = connectionsIn(SHARED);
  const states = {};
  for (const id of new Set([...Object.keys(personal), ...Object.keys(shared)])) {
    const c = connector(id);
    if (!c) continue;
    const mine = personal[id] && readyIn(c, personalScope(user.id));
    const team = shared[id] && readyIn(c, SHARED);
    const meta = mine ? personal[id] : team ? shared[id] : null;
    states[id] = { connected: Boolean(meta) && meta.test?.ok !== false, error: Boolean(meta) && meta.test?.ok === false, shared: Boolean(team) };
  }
  return states;
}

/** Detailed state of one app for the current user: which connection is in use and its metadata. */
function appState(c, user) {
  const p = connectionIn(c.id, personalScope(user.id));
  const s = connectionIn(c.id, SHARED);
  const personalReady = p && readyIn(c, personalScope(user.id));
  const sharedReady = s && readyIn(c, SHARED);
  const inUse = personalReady ? { ...p, scope: "personal" } : sharedReady ? { ...s, scope: "shared" } : null;
  const cred = personalReady ? getCredentialsIn(c.id, personalScope(user.id)) : sharedReady ? getCredentialsIn(c.id, SHARED) : null;
  return { connected: Boolean(inUse), scope: inUse?.scope || null, account: inUse?.account, test: inUse?.test,
           method: cred && c.method ? c.method(cred) : null, exists: Boolean(p?.hasSecret || s?.hasSecret), shared: Boolean(sharedReady) };
}

const scopeFor = (req, wanted) => (wanted === "shared" && req.session.user.role === "admin" ? SHARED : personalScope(req.session.user.id));

/** Public (non-secret) saved values to prefill a form; secrets only report that they exist. */
function savedFields(c, scope) {
  const cred = getCredentialsIn(c.id, scope) || {};
  return Object.fromEntries(c.fields.filter((f) => cred[f.id] && !f.hidden).map((f) => [f.id, f.secret ? true : cred[f.id]]));
}

// OAuth redirect URI. Locally, honour the provider's preferred loopback host ("localhost" or 127.0.0.1): the callback is
// matched by its state, not by the cookie. HTTPS-only providers need an https:// public URL.
function redirectUri(provider) {
  if (provider?.redirect === "https" && !CONFIG.https) return null;
  if (!CONFIG.publicIsLocal) return `${CONFIG.publicUrl}/oauth/callback`;
  return `http://${provider?.redirect === "localhost" ? "localhost" : "127.0.0.1"}:${CONFIG.publicPort}/oauth/callback`;
}

function oauthApps() {
  const byKey = new Map();
  for (const c of CONNECTORS.filter((x) => x.oauth)) {
    const a = byKey.get(c.oauth.key) || { key: c.oauth.key, provider: c.oauth.provider, connectors: [], scopes: new Set() };
    a.connectors.push(c);
    for (const s of c.oauth.scopes) a.scopes.add(s);
    byKey.set(c.oauth.key, a);
  }
  return [...byKey.values()].map((a) => ({ ...a, scopes: [...a.scopes], redirect: redirectUri(a.provider), registered: Boolean(getOAuthApp(a.key)?.client_id) }))
    .sort((x, y) => x.provider.name.localeCompare(y.provider.name, "en"));
}

// ---------------------------------------------------------------- panel pages

app.get("/", withSession, (req, res) => {
  const states = appStates(req.session.user);
  const mine = auth.tokensOf(req.session.user.id);
  send(res, homePage({ ...page(req), totals: { apps: CONNECTORS.length, oneClick: CONNECTORS.filter(oneClick).length },
    connected: CONNECTORS.filter((c) => states[c.id]?.connected), agents: AGENTS, mcpUrl: MCP_URL, tokens: mine.length,
    usedTokens: mine.filter((t) => t.lastUsedAt).length, team: { users: auth.listUsers().length, invites: auth.listInvites().length } }));
});

app.get("/apps", withSession, (req, res) => send(res, appsPage({ ...page(req), apps: CONNECTORS, states: appStates(req.session.user) })));

app.get("/palette.json", withSession, (req, res) => {
  const pages = [["Home", "/"], ["Apps", "/apps"], ["Connect agents", "/agents"], ["Access tokens", "/tokens"], ["Settings", "/settings"],
    ...(req.session.user.role === "admin" ? [["Users", "/users"], ["OAuth apps", "/oauth-apps"], ["Audit log", "/audit"]] : [])];
  const norm = (t) => t.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
  const logo = ({ src, image }) => ({ logo: src, image });
  res.set("Cache-Control", "private, max-age=300");
  compressed(res, "json", JSON.stringify([
    ...pages.map(([label, href]) => ({ label, href, hint: "Page", search: norm(label) })),
    ...AGENTS.map((a) => ({ label: a.name, href: `/agents?agent=${a.id}`, hint: "Agent", ...logo(agentLogoSrc(a)), search: norm(`${a.name} agent`) })),
    ...CONNECTORS.map((c) => ({ label: c.name, href: `/apps/${c.id}`, hint: CATEGORIES[c.category], ...logo(appLogoSrc(c)),
      search: norm(`${c.name} ${c.id} ${c.description}`) })),
  ]));
});

app.get("/apps/:id", withSession, (req, res, next) => {
  const c = connector(req.params.id);
  if (!c) return next();
  const state = appState(c, req.session.user);
  const scope = state.scope === "shared" ? SHARED : personalScope(req.session.user.id);
  const flowScope = scopeFor(req, req.query.scope);
  const flow = c.type === "device" ? (microsoftFlow(flowScope) || microsoftFlow(scope)) : null;
  send(res, appPage({ ...page(req), c, state, savedFields: savedFields(c, scope),
    oauthApp: c.oauth ? { registered: Boolean(getOAuthApp(c.oauth.key)?.client_id) } : null,
    flow: flow ? { ...flow, scopeKey: microsoftFlow(flowScope) ? (flowScope === SHARED ? "shared" : "personal") : (scope === SHARED ? "shared" : "personal") } : null,
    canShare: req.session.user.role === "admin", needsHttps: Boolean(c.oauth) && !redirectUri(c.oauth.provider) }));
});

// Connect with an API key (or enable a public API). If it was connected with OAuth, that authorization is dropped.
app.post("/apps/:id/save", form, withSession, async (req, res, next) => {
  const c = connector(req.params.id);
  if (!c || c.type === "device" || c.type === "oauth") return next();
  const scope = scopeFor(req, req.body.scope);
  const current = getCredentialsIn(c.id, scope) || {};
  const data = Object.fromEntries(Object.entries(current).filter(([k]) => !["method", "access_token", "refresh_token", "expires"].includes(k)));
  for (const f of c.fields) {
    const v = String(req.body[f.id] || "").trim();
    if (v) data[f.id] = v;
    else if (!data[f.id] && f.default) data[f.id] = f.default;
  }
  if (c.type === "mixed") data.method = "key";
  const missing = c.fields.filter((f) => !f.optional && !f.hidden && !data[f.id]).map((f) => f.label);
  if (missing.length) return back(res, `/apps/${c.id}`, "error", `Missing: ${missing.join(", ")}`);
  try {
    c.validate?.(data);
  } catch (e) {
    return back(res, `/apps/${c.id}`, "error", e.message);
  }
  saveCredentials(c.id, data, { scope, meta: { connectedBy: req.session.user.id } });
  audit({ ...who(req), action: `connect ${c.id} (${scope === SHARED ? "shared" : "personal"})`, app: c.id, ok: true });
  const r = await runAs({ userId: scope === SHARED ? null : req.session.user.id, via: "panel" }, () => testConnector(c.id));
  back(res, `/apps/${c.id}`, r.ok ? "ok" : "error", r.message);
});

// "Continue with …": stores the pre-fields (subdomain, data center…) and opens the provider's sign-in page.
app.post("/apps/:id/connect", form, withSession, (req, res, next) => {
  const c = connector(req.params.id);
  if (!c?.oauth) return next();
  const scope = scopeFor(req, req.body.scope);
  const current = getCredentialsIn(c.id, scope) || {};
  const data = { ...current };
  for (const f of c.oauthFields.filter((x) => !x.hidden)) {
    const v = String(req.body[f.id] || "").trim();
    if (v) data[f.id] = v;
    else if (!data[f.id] && f.default) data[f.id] = f.default;
  }
  const missing = c.oauthFields.filter((f) => !f.optional && !f.hidden && !data[f.id]).map((f) => f.label);
  if (missing.length) return back(res, `/apps/${c.id}`, "error", `Missing: ${missing.join(", ")}`);
  try {
    c.validate({ ...data, method: "oauth" });
  } catch (e) {
    return back(res, `/apps/${c.id}`, "error", e.message);
  }
  if (Object.keys(data).some((k) => data[k] !== current[k])) saveCredentials(c.id, data, { scope, meta: { connectedBy: req.session.user.id } });
  res.redirect(303, `/oauth/${c.id}/start?scope=${scope === SHARED ? "shared" : "personal"}`);
});

app.get("/oauth/:id/start", withSession, (req, res, next) => {
  const c = connector(req.params.id);
  if (!c?.oauth) return next();
  const scope = scopeFor(req, req.query.scope);
  const redirect = redirectUri(c.oauth.provider);
  if (!redirect) return back(res, `/apps/${c.id}`, "error", `${c.oauth.provider.name} only accepts https:// redirect URIs: set CONECTOR_PUBLIC_URL to an https address.`);
  if (!getOAuthApp(c.oauth.key)?.client_id) {
    if (req.session.user.role !== "admin") return back(res, `/apps/${c.id}`, "error", `An admin has to register the ${c.oauth.provider.name} OAuth app first.`);
    return res.redirect(303, `/oauth-apps/${encodeURIComponent(c.oauth.key)}?next=${c.id}&scope=${scope === SHARED ? "shared" : "personal"}`);
  }
  const cred = getCredentialsIn(c.id, scope) || {};
  const missing = c.oauthFields.filter((f) => !f.optional && !f.hidden && !cred[f.id]).map((f) => f.label);
  if (missing.length) return back(res, `/apps/${c.id}`, "error", `Missing: ${missing.join(", ")}`);
  try {
    res.redirect(authorizationUrl(c, redirect, { userId: req.session.user.id, scope, returnTo: origin(req) }));
  } catch (e) {
    back(res, `/apps/${c.id}`, "error", e.message);
  }
});

// The provider redirects here, maybe to another host than the panel's and without the cookie: the request is matched by
// its single-use state and then sent back to the panel address where "Connect" was clicked.
app.get(["/oauth/callback", "/oauth/:id/callback"], async (req, res) => {
  const state = String(req.query.state || "");
  const p = pendingAuthorization(state);
  const c = connector(p?.id);
  const done = (ok, text) => {
    const target = p?.returnTo && CONFIG.allowedHosts.has(p.returnTo.replace(/^https?:\/\//, "")) ? p.returnTo : CONFIG.publicUrl;
    res.status(ok ? 200 : 400).type("html").send(render(oauthReturnPage({ appId: c?.id, ok, text })).replace(/url=\//, `url=${target}/`).replace(/href="\//g, `href="${target}/`));
  };
  if (!c) return done(false, "The authorization expired or is not valid: start again from the app's page.");
  if (req.query.error) {
    discardPending(state);
    audit({ action: `connect ${c.id} (OAuth)`, app: c.id, userId: p.userId, ok: false, error: String(req.query.error).slice(0, 100) });
    return done(false, `${c.oauth.provider.name}: ${String(req.query.error_description || req.query.error).slice(0, 300)}`);
  }
  try {
    const r0 = await completeAuthorization(c, String(req.query.code || ""), state);
    const r = await runAs({ userId: r0.scope === SHARED ? null : r0.userId, via: "panel" }, () => testConnector(c.id));
    audit({ action: `connect ${c.id} (OAuth, ${r0.scope === SHARED ? "shared" : "personal"})`, app: c.id, userId: r0.userId, ok: r.ok });
    done(r.ok, r.ok ? r.message : `Authorized, but the connection test failed: ${r.message}`);
  } catch (e) {
    audit({ action: `connect ${c.id} (OAuth)`, app: c.id, userId: p.userId, ok: false, error: e.message.slice(0, 200) });
    done(false, e.message);
  }
});

app.post("/apps/microsoft365/device", form, withSession, async (req, res) => {
  const scope = scopeFor(req, req.body.scope);
  const previous = getCredentialsIn("microsoft365", scope) || {};
  const tenant = String(req.body.tenant || previous.tenant || "organizations").trim();
  const clientId = String(req.body.client_id || previous.client_id || MICROSOFT_CLIENT).trim();
  try {
    await startMicrosoftDeviceFlow({ tenant, client_id: clientId, scope, userId: req.session.user.id });
    audit({ ...who(req), action: "connect microsoft365 (device code)", app: "microsoft365", ok: true });
    res.redirect(303, `/apps/microsoft365?scope=${scope === SHARED ? "shared" : "personal"}`);
  } catch (e) {
    back(res, "/apps/microsoft365", "error", e.message);
  }
});
app.get("/apps/microsoft365/device-status", withSession, (req, res) => {
  const f = microsoftFlow(scopeFor(req, req.query.scope));
  res.json(f ? { status: f.status, account: f.account, error: f.error } : {});
});

app.post("/apps/:id/test", form, withSession, async (req, res, next) => {
  const c = connector(req.params.id);
  if (!c) return next();
  const scope = scopeFor(req, req.body.scope);
  const r = await runAs({ userId: scope === SHARED ? null : req.session.user.id, via: "panel" }, () => testConnector(c.id));
  back(res, `/apps/${c.id}`, r.ok ? "ok" : "error", r.message);
});

app.post("/apps/:id/disconnect", form, withSession, (req, res, next) => {
  const c = connector(req.params.id);
  if (!c) return next();
  const scope = scopeFor(req, req.body.scope);
  deleteConnection(c.id, scope);
  audit({ ...who(req), action: `disconnect ${c.id} (${scope === SHARED ? "shared" : "personal"})`, app: c.id, ok: true });
  back(res, `/apps/${c.id}`, "ok", "Disconnected. Its credentials were deleted.");
});

// ---------------------------------------------------------------- agents and tokens

app.get("/agents", withSession, (req, res) => send(res, agentsPage({ ...page(req), agents: AGENTS, mcpUrl: MCP_URL })));

function tokensView(req, created = null) {
  const states = appStates(req.session.user);
  const isAdmin = req.session.user.role === "admin";
  return tokensPage({ ...page(req), tokens: auth.tokensOf(req.session.user.id), apps: CONNECTORS,
    connectedIds: CONNECTORS.filter((c) => states[c.id]?.connected).map((c) => c.id), created,
    workspaceTokens: isAdmin ? auth.allTokens().filter((t) => t.userId !== req.session.user.id) : null, users: isAdmin ? auth.listUsers() : [] });
}
app.get("/tokens", withSession, (req, res) => send(res, tokensView(req)));
app.post("/tokens", form, withSession, (req, res) => {
  const name = String(req.body.name || "").trim().slice(0, 60);
  const all = req.body.all || req.body.apps === "*";
  const apps = all ? ["*"] : [].concat(req.body.apps || []).filter((id) => connector(id));
  const json = req.body.format === "json";
  if (!name || !apps.length) {
    if (json) return res.status(400).json({ error: "Give the token a name and choose at least one app." });
    return back(res, "/tokens", "error", "Give the token a name and choose at least one app.");
  }
  const { id, token } = auth.createToken({ name, userId: req.session.user.id, apps });
  audit({ ...who(req), action: `create token “${name}”`, ok: true });
  if (json) return res.json({ id, token });
  send(res, tokensView(req, { name, token }));
});
app.post("/tokens/:id/revoke", form, withSession, (req, res) => {
  const t = auth.allTokens().find((x) => x.id === req.params.id);
  if (!t || (t.userId !== req.session.user.id && req.session.user.role !== "admin")) return back(res, "/tokens", "error", "Unknown token.");
  auth.revokeToken(t.id);
  audit({ ...who(req), action: `revoke token “${t.name}”`, ok: true });
  back(res, "/tokens", "ok", `Token “${t.name}” revoked.`);
});

// ---------------------------------------------------------------- settings

app.get("/settings", withSession, (req, res) => send(res, settingsPage({ ...page(req), mcpUrl: MCP_URL })));
app.post("/settings/profile", form, withSession, (req, res) => {
  auth.updateUser(req.session.user.id, { name: req.body.name });
  back(res, "/settings", "ok", "Profile saved.");
});
app.post("/settings/password", form, withSession, (req, res) => {
  const u = req.session.user;
  if (!auth.verifyPassword(u.email, req.body.current)) return back(res, "/settings", "error", "Your current password is not correct.");
  if (req.body.password !== req.body.password2) return back(res, "/settings", "error", "The new passwords don't match.");
  try {
    auth.setPassword(u.id, req.body.password);
  } catch (e) {
    return back(res, "/settings", "error", e.message);
  }
  audit({ ...who(req), action: "change password", ok: true });
  back(res, "/settings", "ok", "Password changed.");
});

// ---------------------------------------------------------------- users (admin)

function usersView(req, extra = {}) {
  return usersPage({ ...page(req), users: auth.listUsers(), invites: auth.listInvites(), ...extra });
}
app.get("/users", withSession, adminOnly, (req, res) => send(res, usersView(req)));
app.post("/users/invite", form, withSession, adminOnly, (req, res) => {
  try {
    const { token } = auth.createInvite({ email: req.body.email, role: req.body.role, createdBy: req.session.user.id });
    audit({ ...who(req), action: `invite ${String(req.body.email).toLowerCase()} (${req.body.role})`, ok: true });
    send(res, usersView(req, { inviteLink: `${CONFIG.publicUrl}/invite/${token}` }));
  } catch (e) {
    back(res, "/users", "error", e.message);
  }
});
app.post("/invites/:id/revoke", form, withSession, adminOnly, (req, res) => {
  auth.revokeInvite(req.params.id);
  back(res, "/users", "ok", "Invitation revoked.");
});
const userAction = (fn, message) => [form, withSession, adminOnly, (req, res) => {
  const u = auth.getUser(req.params.id);
  if (!u) return back(res, "/users", "error", "Unknown user.");
  try {
    const out = fn(req, u);
    audit({ ...who(req), action: `${message} ${u.email}`, ok: true });
    if (out?.resetLink) return send(res, usersView(req, { resetLink: out.resetLink }));
    back(res, "/users", "ok", `${message[0].toUpperCase()}${message.slice(1)}: ${u.email}`);
  } catch (e) {
    back(res, "/users", "error", e.message);
  }
}];
app.post("/users/:id/role", ...userAction((req, u) => auth.updateUser(u.id, { role: req.body.role }), "changed role of"));
app.post("/users/:id/disable", ...userAction((req, u) => {
  if (u.id === req.session.user.id) throw new Error("You can't disable yourself.");
  auth.updateUser(u.id, { disabled: true });
}, "disabled"));
app.post("/users/:id/enable", ...userAction((req, u) => auth.updateUser(u.id, { disabled: false }), "enabled"));
app.post("/users/:id/delete", ...userAction((req, u) => {
  if (u.id === req.session.user.id) throw new Error("You can't delete yourself.");
  auth.deleteUser(u.id);
}, "deleted"));
app.post("/users/:id/reset", ...userAction((req, u) => ({ resetLink: `${CONFIG.publicUrl}/reset/${auth.createReset(u.id)}` }), "created a reset link for"));

// ---------------------------------------------------------------- OAuth apps (admin)

const oauthAppOf = (key) => oauthApps().find((a) => a.key === key);
app.get("/oauth-apps", withSession, adminOnly, (req, res) => send(res, oauthAppsPage({ ...page(req), apps: oauthApps() })));
app.get("/oauth-apps/:key", withSession, adminOnly, (req, res, next) => {
  const a = oauthAppOf(req.params.key);
  if (!a) return next();
  const saved = getOAuthApp(a.key);
  send(res, oauthAppPage({ ...page(req), a, clientId: saved?.client_id, hasSecret: Boolean(saved?.client_secret),
    next: a.connectors.some((c) => c.id === req.query.next) ? req.query.next : null }));
});
app.post("/oauth-apps/:key", form, withSession, adminOnly, (req, res, next) => {
  const a = oauthAppOf(req.params.key);
  if (!a) return next();
  const target = a.connectors.some((c) => c.id === req.body.next) ? req.body.next : null;
  const retry = (error) => back(res, `/oauth-apps/${encodeURIComponent(a.key)}${target ? `?next=${target}` : ""}`, "error", error);
  const current = getOAuthApp(a.key) || {};
  const clientId = String(req.body.client_id || "").trim();
  const clientSecret = String(req.body.client_secret || "").trim() || (clientId === current.client_id ? current.client_secret || "" : "");
  if (!clientId) return retry("The client ID is missing");
  if (clientId.length > 400 || clientSecret.length > 1000 || /\s/.test(clientId + clientSecret)) return retry("The client ID or secret is not valid");
  saveOAuthApp(a.key, { client_id: clientId, client_secret: clientSecret, redirect: a.redirect });
  audit({ ...who(req), action: `save OAuth app ${a.key}`, ok: true });
  if (target) return res.redirect(303, `/oauth/${target}/start?scope=${req.query.scope === "shared" ? "shared" : "personal"}`);
  back(res, `/oauth-apps/${encodeURIComponent(a.key)}`, "ok", "OAuth app saved: its apps now connect in one click.");
});
app.post("/oauth-apps/:key/delete", form, withSession, adminOnly, (req, res, next) => {
  const a = oauthAppOf(req.params.key);
  if (!a) return next();
  deleteOAuthApp(a.key);
  audit({ ...who(req), action: `delete OAuth app ${a.key}`, ok: true });
  back(res, `/oauth-apps/${encodeURIComponent(a.key)}`, "ok", "OAuth app deleted. Its apps have to be connected again when their access expires.");
});

app.get("/audit", withSession, adminOnly, (req, res) => send(res, auditPage({ ...page(req), events: recentAudit(300), users: auth.listUsers() })));

// ---------------------------------------------------------------- MCP (agents)

app.post("/mcp", express.json({ limit: "25mb" }), async (req, res) => {
  const token = auth.validateToken(bearer(req));
  if (!token) return res.status(401).json({ jsonrpc: "2.0", error: { code: -32001, message: "Invalid or revoked token" }, id: null });
  const server = createMcpServer(token);
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  res.on("close", () => {
    transport.close();
    server.close();
  });
  await runAs({ userId: token.userId, via: "mcp" }, async () => {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });
});
app.all("/mcp", (req, res) => res.status(405).set("Allow", "POST").json({ jsonrpc: "2.0", error: { code: -32000, message: "Method not allowed" }, id: null }));

// ---------------------------------------------------------------- REST API (scripts and automations)

function apiToken(req, res) {
  const token = auth.validateToken(bearer(req));
  if (!token) res.status(401).json({ error: "Invalid or revoked token" });
  return token;
}
app.get("/api/v1/apps", (req, res) => {
  const token = apiToken(req, res);
  if (!token) return;
  runAs({ userId: token.userId, via: "api" }, () => res.json(CONNECTORS.filter((c) => auth.allowed(token, c.id) && isConnected(c.id))
    .map((c) => ({ id: c.id, name: c.name, tools: c.tools.map((t) => t.name) }))));
});
app.post("/api/v1/apps/:id/request", express.json({ limit: "25mb" }), (req, res) => {
  const token = apiToken(req, res);
  if (!token) return;
  runAs({ userId: token.userId, via: "api" }, async () => {
    const c = connector(req.params.id);
    if (!c || !auth.allowed(token, c.id)) return res.status(403).json({ error: "This token can't use that app" });
    if (!isConnected(c.id)) return res.status(409).json({ error: `${c.name} is not connected` });
    const started = Date.now();
    try {
      const r = await c.request(req.body || {});
      audit({ via: "api", token: token.name, userId: token.userId, app: c.id, tool: "api", method: req.body?.method || "GET",
              path: String(req.body?.path || "").slice(0, 200), ok: r.ok, ms: Date.now() - started });
      res.json(r);
    } catch (e) {
      audit({ via: "api", token: token.name, userId: token.userId, app: c.id, tool: "api", ok: false, error: e.message.slice(0, 300), ms: Date.now() - started });
      res.status(502).json({ error: e.message });
    }
  });
});

// ---------------------------------------------------------------- 404 and start

app.use((req, res) => {
  const s = auth.getSession(cookie(req, SESSION_COOKIE));
  if (s && req.accepts("html")) return send(res, errorPage({ session: s, status: 404, title: "Page not found", text: "That page doesn't exist." }), 404);
  res.status(404).json({ error: "Not found" });
});

setInterval(auth.persistUsage, 60_000).unref();
// In a container the server is PID 1, which gets no default signal handlers: save pending token usage and exit.
for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () => {
    auth.persistUsage();
    process.exit(0);
  });
}
const listener = app.listen(CONFIG.port, CONFIG.host, () => {
  console.log(`Conector ${VERSION} listening on http://${CONFIG.host}:${CONFIG.port} — public URL ${CONFIG.publicUrl}`);
  console.log(`${CONNECTORS.length} apps loaded${CATALOG_ERRORS.length ? `, ${CATALOG_ERRORS.length} catalog error(s)` : ""}.`);
  if (!auth.hasUsers()) {
    const code = auth.createSetupCode();
    console.log(`\nNo users yet. Create the admin account at:\n  ${CONFIG.publicUrl}/setup?code=${code}\n`);
  }
});
listener.on("error", (e) => {
  console.error(e.code === "EADDRINUSE" ? `Port ${CONFIG.port} is already in use: stop the other process or set CONECTOR_PORT.` : e.message);
  process.exit(1);
});
