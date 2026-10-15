// Users (e-mail + password hashed with scrypt; roles "admin" and "member"), invites, password resets, panel sessions
// (in memory) and agent access tokens (only their SHA-256 hash is stored; the token is shown once when created).
import crypto from "node:crypto";
import { CONFIG } from "./config.js";
import { deletePersonalConnections, read, save } from "./store.js";

const SCRYPT = { N: 2 ** 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const SESSION_MS = CONFIG.sessionHours * 3600 * 1000;
const INVITE_MS = 7 * 24 * 3600 * 1000;
const RESET_MS = 24 * 3600 * 1000;
export const ROLES = ["admin", "member"];
export const MIN_PASSWORD = 12;
export const TOKEN_PREFIX = "cnr_";

const sessions = new Map();
const sha256 = (text) => crypto.createHash("sha256").update(text).digest("hex");
const derive = (password, salt) => crypto.scryptSync(password, salt, 64, SCRYPT);
const randomId = (bytes = 8) => crypto.randomBytes(bytes).toString("hex");
const safeEqual = (a, b) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
const normalizeEmail = (email) => String(email || "").trim().toLowerCase();
const now = () => new Date().toISOString();

// ------------------------------------------------------------------ users

export const hasUsers = () => Object.keys(read().users).length > 0;
export const listUsers = () => Object.values(read().users).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
export const getUser = (id) => (id ? read().users[id] || null : null);
export const findUserByEmail = (email) => Object.values(read().users).find((u) => u.email === normalizeEmail(email)) || null;
export const adminCount = () => Object.values(read().users).filter((u) => u.role === "admin" && !u.disabledAt).length;

export function publicUser(u) {
  if (!u) return null;
  const { salt: _salt, hash: _hash, ...rest } = u;
  return rest;
}

function checkPasswordPolicy(password) {
  if (String(password || "").length < MIN_PASSWORD) throw new Error(`The password must be at least ${MIN_PASSWORD} characters long.`);
}

export function createUser({ email, name, role = "member", password }) {
  const e = normalizeEmail(email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) throw new Error("Enter a valid e-mail address.");
  if (findUserByEmail(e)) throw new Error("A user with that e-mail already exists.");
  if (!ROLES.includes(role)) throw new Error("Unknown role.");
  checkPasswordPolicy(password);
  const salt = crypto.randomBytes(16);
  const user = { id: randomId(), email: e, name: String(name || "").trim().slice(0, 80) || e.split("@")[0], role,
                 salt: salt.toString("base64"), hash: derive(password, salt).toString("base64"), createdAt: now() };
  read().users[user.id] = user;
  save();
  return user;
}

export function updateUser(id, { name, role, disabled }) {
  const u = getUser(id);
  if (!u) throw new Error("Unknown user.");
  if (role !== undefined) {
    if (!ROLES.includes(role)) throw new Error("Unknown role.");
    if (u.role === "admin" && role !== "admin" && adminCount() <= 1) throw new Error("There must be at least one admin.");
    u.role = role;
  }
  if (disabled !== undefined) {
    if (disabled && u.role === "admin" && !u.disabledAt && adminCount() <= 1) throw new Error("You can't disable the last admin.");
    u.disabledAt = disabled ? now() : undefined;
    if (disabled) endSessionsOf(id);
  }
  if (name !== undefined) u.name = String(name).trim().slice(0, 80) || u.name;
  save();
  return u;
}

export function setPassword(id, password) {
  const u = getUser(id);
  if (!u) throw new Error("Unknown user.");
  checkPasswordPolicy(password);
  const salt = crypto.randomBytes(16);
  Object.assign(u, { salt: salt.toString("base64"), hash: derive(password, salt).toString("base64"), passwordChangedAt: now() });
  save();
}

export function deleteUser(id) {
  const u = getUser(id);
  if (!u) return;
  if (u.role === "admin" && !u.disabledAt && adminCount() <= 1) throw new Error("You can't delete the last admin.");
  const s = read();
  delete s.users[id];
  for (const [tid, t] of Object.entries(s.tokens)) if (t.userId === id) delete s.tokens[tid];
  save();
  deletePersonalConnections(id);
  endSessionsOf(id);
}

/** Returns the user when the e-mail and password match (and the account is enabled), else null. Constant-time-ish. */
export function verifyPassword(email, password) {
  const u = findUserByEmail(email);
  const hash = derive(String(password || ""), u ? Buffer.from(u.salt, "base64") : crypto.randomBytes(16));
  if (!u || !crypto.timingSafeEqual(hash, Buffer.from(u.hash, "base64")) || u.disabledAt) return null;
  u.lastLoginAt = now();
  save();
  return u;
}

// ------------------------------------------------------------------ first-run setup code

export function createSetupCode() {
  const code = crypto.randomBytes(9).toString("base64url");
  read().setup = { hash: sha256(code), createdAt: now() };
  save();
  return code;
}

export function checkSetupCode(code) {
  const s = read().setup;
  return Boolean(s && code) && safeEqual(sha256(String(code)), s.hash);
}

export function consumeSetupCode() {
  read().setup = null;
  save();
}

// ------------------------------------------------------------------ invites and password resets (single-use links)

export function createInvite({ email, role = "member", createdBy }) {
  const e = normalizeEmail(email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) throw new Error("Enter a valid e-mail address.");
  if (findUserByEmail(e)) throw new Error("A user with that e-mail already exists.");
  if (!ROLES.includes(role)) throw new Error("Unknown role.");
  const token = crypto.randomBytes(24).toString("base64url");
  const id = randomId(6);
  read().invites[id] = { email: e, role, hash: sha256(token), createdBy, createdAt: now(), expiresAt: Date.now() + INVITE_MS };
  save();
  return { id, token };
}

export function findInvite(token) {
  if (!token) return null;
  const h = sha256(String(token));
  const entry = Object.entries(read().invites).find(([, i]) => safeEqual(h, i.hash));
  if (!entry || entry[1].expiresAt < Date.now()) return null;
  return { id: entry[0], ...entry[1] };
}

export const listInvites = () => Object.entries(read().invites).filter(([, i]) => i.expiresAt > Date.now())
  .map(([id, i]) => ({ id, email: i.email, role: i.role, createdAt: i.createdAt, expiresAt: i.expiresAt }));

export function revokeInvite(id) {
  delete read().invites[id];
  save();
}

export function acceptInvite(token, { name, password }) {
  const invite = findInvite(token);
  if (!invite) throw new Error("This invitation link is not valid any more. Ask an admin for a new one.");
  const user = createUser({ email: invite.email, name, role: invite.role, password });
  revokeInvite(invite.id);
  return user;
}

export function createReset(userId) {
  if (!getUser(userId)) throw new Error("Unknown user.");
  const token = crypto.randomBytes(24).toString("base64url");
  const s = read();
  for (const [id, r] of Object.entries(s.resets)) if (r.userId === userId || r.expiresAt < Date.now()) delete s.resets[id];
  s.resets[randomId(6)] = { userId, hash: sha256(token), expiresAt: Date.now() + RESET_MS };
  save();
  return token;
}

export function findReset(token) {
  if (!token) return null;
  const h = sha256(String(token));
  const entry = Object.entries(read().resets).find(([, r]) => safeEqual(h, r.hash));
  if (!entry || entry[1].expiresAt < Date.now()) return null;
  return { id: entry[0], ...entry[1] };
}

export function useReset(token, password) {
  const r = findReset(token);
  if (!r) throw new Error("This password reset link is not valid any more.");
  setPassword(r.userId, password);
  delete read().resets[r.id];
  save();
  endSessionsOf(r.userId);
  return getUser(r.userId);
}

// ------------------------------------------------------------------ sessions

export function startSession(userId) {
  const id = crypto.randomBytes(32).toString("base64url");
  sessions.set(id, { userId, csrf: crypto.randomBytes(24).toString("base64url"), expires: Date.now() + SESSION_MS });
  return id;
}

/** The session plus its (fresh) user, or null when expired, unknown or the user was disabled. */
export function getSession(id) {
  const s = id && sessions.get(id);
  const user = s && getUser(s.userId);
  if (!s || s.expires < Date.now() || !user || user.disabledAt) {
    if (id) sessions.delete(id);
    return null;
  }
  s.expires = Date.now() + SESSION_MS;
  return { ...s, id, user };
}

export const endSession = (id) => sessions.delete(id);

export function endSessionsOf(userId) {
  for (const [id, s] of sessions) if (s.userId === userId) sessions.delete(id);
}

// ------------------------------------------------------------------ agent access tokens

export function createToken({ name, userId, apps = ["*"] }) {
  const token = `${TOKEN_PREFIX}${crypto.randomBytes(32).toString("base64url")}`;
  const id = randomId(6);
  read().tokens[id] = { name: String(name).slice(0, 60), userId, apps, hash: sha256(token), createdAt: now(), lastUsedAt: null };
  save();
  return { id, token };
}

/** "*" means every app, including apps connected later. */
export const allowed = (token, appId) => token.apps.includes("*") || token.apps.includes(appId);

export const tokensOf = (userId) => Object.entries(read().tokens).filter(([, t]) => t.userId === userId)
  .map(([id, t]) => ({ id, ...t }));

export const allTokens = () => Object.entries(read().tokens).map(([id, t]) => ({ id, ...t }));

export function revokeToken(id) {
  delete read().tokens[id];
  save();
}

const pendingUsage = new Map();

export function validateToken(token) {
  if (!token?.startsWith(TOKEN_PREFIX)) return null;
  const h = sha256(token);
  const entry = Object.entries(read().tokens).find(([, t]) => safeEqual(h, t.hash));
  if (!entry) return null;
  const [id, t] = entry;
  const user = getUser(t.userId);
  if (!user || user.disabledAt) return null;
  t.lastUsedAt = now();
  pendingUsage.set(id, t.lastUsedAt);
  return { id, ...t, user };
}

// Last use is written at most once a minute (not on every request), on top of a freshly read store so changes made
// meanwhile by the CLI are not overwritten.
export function persistUsage() {
  if (!pendingUsage.size) return;
  const tokens = read().tokens;
  for (const [id, at] of pendingUsage) if (tokens[id]) tokens[id].lastUsedAt = at;
  pendingUsage.clear();
  save();
}
