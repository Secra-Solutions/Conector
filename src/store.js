// Local store: one JSON file with users, invites, agent tokens, connections and OAuth apps.
// Connector credentials and OAuth client secrets are encrypted with AES-256-GCM; the master key lives in
// <data dir>/master.key (readable only by the current OS user). Connections live in scopes: "shared" (the whole
// team can use them) and "user:<id>" (personal). A user's personal connection wins over the shared one.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { CONFIG, LOGS_DIR } from "./config.js";
import { currentActor } from "./context.js";

const FILE = path.join(CONFIG.dataDir, "store.json");
const KEY_FILE = path.join(CONFIG.dataDir, "master.key");
const AUDIT_FILE = path.join(LOGS_DIR, "audit.jsonl");
const EMPTY = { version: 1, users: {}, invites: {}, resets: {}, tokens: {}, connections: { shared: {} }, oauthApps: {}, setup: null };

export const SHARED = "shared";
export const personalScope = (userId) => `user:${userId}`;
/** Non-enumerable marker on credential objects: the scope they were read from (so refreshed tokens go back there). */
export const SCOPE = Symbol("scope");

fs.mkdirSync(CONFIG.dataDir, { recursive: true, mode: 0o700 });
if (!fs.existsSync(KEY_FILE)) fs.writeFileSync(KEY_FILE, crypto.randomBytes(32), { mode: 0o600 });
const MASTER = fs.readFileSync(KEY_FILE);

let state;
let loadedVersion = null;

const fileVersion = () => {
  try {
    return fs.statSync(FILE).mtimeMs;
  } catch {
    return null;
  }
};

function load() {
  loadedVersion = fileVersion();
  try {
    const data = JSON.parse(fs.readFileSync(FILE, "utf8"));
    return { ...structuredClone(EMPTY), ...data, connections: { shared: {}, ...(data.connections || {}) } };
  } catch {
    return structuredClone(EMPTY);
  }
}

// The server and the CLI (bin/conector.js) are different processes: if the file changed on disk, reload it.
export function read() {
  if (!state || fileVersion() !== loadedVersion) state = load();
  return state;
}

export function save() {
  const tmp = `${FILE}.${process.pid}.tmp`; // per process: the server, the CLI and `conector mcp` can save at the same time
  fs.writeFileSync(tmp, JSON.stringify(state, null, 1), { mode: 0o600 });
  fs.renameSync(tmp, FILE);
  loadedVersion = fileVersion();
}

export function encrypt(value) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", MASTER, iv);
  const data = Buffer.concat([c.update(JSON.stringify(value), "utf8"), c.final()]);
  return [iv, c.getAuthTag(), data].map((b) => b.toString("base64")).join(".");
}

export function decrypt(text) {
  const [iv, tag, data] = text.split(".").map((s) => Buffer.from(s, "base64"));
  const d = crypto.createDecipheriv("aes-256-gcm", MASTER, iv);
  d.setAuthTag(tag);
  return JSON.parse(Buffer.concat([d.update(data), d.final()]).toString("utf8"));
}

// ------------------------------------------------------------------ connections

const scopesFor = (actor) => (actor?.userId ? [personalScope(actor.userId), SHARED] : [SHARED]);

/** Credentials of a connector for the current actor (personal first, then shared), or null. */
export function getCredentials(id, actor = currentActor()) {
  for (const scope of scopesFor(actor)) {
    const c = read().connections[scope]?.[id];
    if (c?.secret) {
      const cred = decrypt(c.secret);
      Object.defineProperty(cred, SCOPE, { value: scope, enumerable: false });
      return cred;
    }
  }
  return null;
}

export function getCredentialsIn(id, scope) {
  const c = read().connections[scope]?.[id];
  if (!c?.secret) return null;
  const cred = decrypt(c.secret);
  Object.defineProperty(cred, SCOPE, { value: scope, enumerable: false });
  return cred;
}

/** Metadata (account, last test, who connected it…) of the connection the actor would use, plus its scope. */
export function connectionFor(id, actor = currentActor()) {
  for (const scope of scopesFor(actor)) {
    const c = read().connections[scope]?.[id];
    if (c?.secret) {
      const { secret: _secret, ...meta } = c;
      return { scope, ...meta };
    }
  }
  return null;
}

export function connectionIn(id, scope) {
  const c = read().connections[scope]?.[id];
  if (!c) return null;
  const { secret: _secret, ...meta } = c;
  return { scope, hasSecret: Boolean(c.secret), ...meta };
}

export function saveCredentials(id, data, { scope = SHARED, meta = {} } = {}) {
  const all = read().connections;
  all[scope] ||= {};
  all[scope][id] = { ...(all[scope][id] || {}), ...meta, secret: encrypt(data), updatedAt: new Date().toISOString() };
  save();
}

export function annotateConnection(id, scope, meta) {
  const all = read().connections;
  if (!all[scope]?.[id]) return;
  Object.assign(all[scope][id], meta);
  save();
}

export function deleteConnection(id, scope) {
  delete read().connections[scope]?.[id];
  save();
}

/** All connections of one scope: { connectorId: metadata }. */
export function connectionsIn(scope) {
  return Object.fromEntries(Object.entries(read().connections[scope] || {}).filter(([, c]) => c.secret)
    .map(([id, { secret: _secret, ...meta }]) => [id, meta]));
}

export function deletePersonalConnections(userId) {
  delete read().connections[personalScope(userId)];
  save();
}

// ------------------------------------------------------------------ OAuth apps (one per provider, shared by its connectors)

export function getOAuthApp(key) {
  const a = read().oauthApps?.[key];
  return a?.secret ? decrypt(a.secret) : null;
}

export function saveOAuthApp(key, data) {
  const s = read();
  s.oauthApps ||= {};
  s.oauthApps[key] = { secret: encrypt(data), updatedAt: new Date().toISOString() };
  save();
}

export function deleteOAuthApp(key) {
  delete read().oauthApps?.[key];
  save();
}

// ------------------------------------------------------------------ audit log (no payloads, no secrets)

export function audit(event) {
  fs.mkdirSync(LOGS_DIR, { recursive: true, mode: 0o700 });
  fs.appendFileSync(AUDIT_FILE, `${JSON.stringify({ at: new Date().toISOString(), ...event })}\n`, { mode: 0o600 });
}

export function recentAudit(n = 200) {
  try {
    return fs.readFileSync(AUDIT_FILE, "utf8").trim().split("\n").filter(Boolean).slice(-n).reverse().map((l) => JSON.parse(l));
  } catch {
    return [];
  }
}
