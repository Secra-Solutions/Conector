// HTTP helpers shared by every connector: requests with timeouts, URLs locked to each service's official origin,
// JSON/binary bodies, readable errors and the generic <app>_request tool.
import crypto from "node:crypto";
import fs from "node:fs";
import { STATUS_CODES } from "node:http";
import net from "node:net";
import path from "node:path";
import { z } from "zod";
import { DOWNLOADS_DIR, VERSION } from "./config.js";

// Node gives each address (IPv6/IPv4) only 250 ms before trying the next one. With far-away servers the TCP handshake
// can take longer than that, every attempt is cut and the request fails with ETIMEDOUT. Waiting longer per attempt
// costs nothing when an address family is unreachable (that fails immediately).
net.setDefaultAutoSelectFamilyAttemptTimeout(2000);

const TEXT_LIMIT = 45_000; // MCP clients such as Claude Code spill responses over ~50,000 characters to a file
export const USER_AGENT = `conector/${VERSION}`;

const TLS_ERRORS = new Set(["UNABLE_TO_VERIFY_LEAF_SIGNATURE", "SELF_SIGNED_CERT_IN_CHAIN", "DEPTH_ZERO_SELF_SIGNED_CERT",
  "UNABLE_TO_GET_ISSUER_CERT_LOCALLY", "CERT_HAS_EXPIRED", "ERR_TLS_CERT_ALTNAME_INVALID"]);

/** fetch() with a timeout. Returns { status, ok, data } where data is parsed JSON, text, or { base64, contentType }. */
export async function httpRequest(url, options = {}) {
  const { timeout, ...init } = options;
  let r;
  try {
    r = await fetch(url, { ...init, signal: AbortSignal.timeout(timeout || 90_000) });
  } catch (e) {
    // "fetch failed" alone doesn't say why: add the network or TLS error code, and what to do about an untrusted certificate.
    const code = e.cause?.code || e.cause?.errors?.[0]?.code; // connection errors come as an AggregateError (IPv4 and IPv6)
    if (e.message !== "fetch failed" || !code) throw e;
    const hint = TLS_ERRORS.has(code) ? ": the server's certificate isn't trusted (the app's help explains the options, "
      + "e.g. NODE_EXTRA_CA_CERTS for a private CA)" : "";
    throw new Error(`fetch failed (${code})${hint}`, { cause: e });
  }
  const type = r.headers.get("content-type") || "";
  let data;
  if (r.status === 204) data = null;
  else if (type.includes("json")) data = await r.json().catch(() => null);
  else if (type.includes("javascript")) {
    // Some APIs (Sendloop) send JSON as application/x-javascript.
    const text = await r.text();
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  } else if (!type || type.startsWith("text/") || type.includes("xml")) data = await r.text();
  else data = { base64: Buffer.from(await r.arrayBuffer()).toString("base64"), contentType: type };
  return { status: r.status, ok: r.ok, data };
}

// A path relative to the base URL or a full URL on the SAME origin (e.g. pagination links) — never another host.
// `extra` lists other official origins of the same service (e.g. content.dropboxapi.com) or anchored origin patterns
// starting with "^" (e.g. every *.amazonaws.com).
export function buildUrl(base, route, query, extra = []) {
  const b = new URL(base);
  const text = String(route ?? "");
  const url = /^https?:\/\//i.test(text) ? new URL(text) : new URL(`${base.replace(/\/$/, "")}/${text.replace(/^\//, "")}`);
  const patterns = extra.filter((x) => x.startsWith("^"));
  const allowed = [b.origin, ...extra.filter((x) => !x.startsWith("^")).map((x) => new URL(x).origin)];
  const valid = allowed.includes(url.origin) || (url.protocol === "https:" && !url.username && !url.password
    && patterns.some((p) => new RegExp(p).test(url.origin)));
  if (!valid) throw new Error(`For security, only URLs on ${[...allowed, ...patterns].join(", ")} are allowed`);
  for (const [k, v] of Object.entries(query || {})) if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  return url;
}

/** JSON or binary (base64) request body, e.g. to upload a file. */
export function jsonBody(body, bodyBase64, contentType) {
  if (bodyBase64) return { body: Buffer.from(bodyBase64, "base64"), headers: { "Content-Type": contentType || "application/octet-stream" } };
  return body === undefined ? {} : { body: JSON.stringify(body), headers: { "Content-Type": "application/json" } };
}

/** Returns the response data, or throws a readable error with the service's own message. */
export function ensureOk(r, service) {
  if (r.ok) return r.data;
  const d = r.data;
  const text = (v) => (typeof v === "string" && v.trim() ? v : null);
  const msg = text(d?.error?.message) || text(d?.error_description) || text(d?.message) || text(d?.errors?.[0]?.message)
    || text(d?.errors?.[0]?.detail) || text(d?.detail) || text(d?.description) || text(d?.error_message) || text(d?.title)
    || text(d?.info) || text(d?.msg) || text(d?.error)
    // An empty answer (common with 401) gets the standard status text instead of "null".
    || (d === null || d === undefined || d === "" ? STATUS_CODES[r.status] || "empty answer"
      : typeof d === "string" ? d.replace(/\s+/g, " ").slice(0, 300) : JSON.stringify(d)?.slice(0, 300));
  throw new Error(`${service} responded ${r.status}: ${msg}`);
}

export function formatResult(value) {
  const text = typeof value === "string" ? value : JSON.stringify(value, null, 1);
  return text.length > TEXT_LIMIT
    ? `${text.slice(0, TEXT_LIMIT)}\n… [response truncated: ${text.length} characters; ask for less data or paginate]`
    : text;
}

export const requestSchema = {
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).default("GET").describe("HTTP method"),
  path: z.string().describe("Path relative to the API base URL, or a full URL on the same domain (e.g. the next-page link)"),
  query: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional().describe("Query string parameters"),
  body: z.any().optional().describe("JSON request body"),
  body_base64: z.string().optional().describe("Binary body as base64 (instead of body), e.g. the contents of a file to upload"),
  content_type: z.string().optional().describe("Content-Type of the binary body"),
};

export function requestTool(prefix, service, base, examples = "") {
  return {
    name: `${prefix}_request`,
    title: `${service}: API request`,
    description: `Authenticated call to the ${service} API (${base}). Allows any operation of the API. ${examples}`.trim(),
    schema: requestSchema,
    annotations: { destructiveHint: true, openWorldHint: true },
  };
}

/** Saves a downloaded file under <data dir>/downloads and returns its path. */
export function saveDownload(name, data) {
  fs.mkdirSync(DOWNLOADS_DIR, { recursive: true, mode: 0o700 });
  const safe = String(name).replace(/[^\p{L}\p{N}.\- ()_]/gu, "_").slice(0, 120);
  const target = path.join(DOWNLOADS_DIR, `${crypto.randomBytes(3).toString("hex")}_${safe}`);
  fs.writeFileSync(target, data, { mode: 0o600 });
  return { file: target, size: data.length };
}
