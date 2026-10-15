// End to end: starts the real server on a free port, creates the admin account through the setup page, signs in,
// creates a token and talks MCP to it (directly and through the stdio bridge).
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import http from "node:http";
import net from "node:net";
import path from "node:path";
import { after, before, test } from "node:test";
import { ROOT, tempDataDir } from "./helpers.js";

const freePort = () => new Promise((resolve) => {
  const s = net.createServer().listen(0, "127.0.0.1", () => {
    const { port } = s.address();
    s.close(() => resolve(port));
  });
});

let server;
let base;
let setupCode;
let cookie;
let token;

before(async () => {
  const port = await freePort();
  base = `http://localhost:${port}`;
  server = spawn(process.execPath, [path.join(ROOT, "src", "server.js")], {
    env: { ...process.env, CONECTOR_PORT: String(port), CONECTOR_DATA_DIR: tempDataDir(), CONECTOR_PUBLIC_URL: base },
    stdio: ["ignore", "pipe", "inherit"],
  });
  let out = "";
  await new Promise((resolve, reject) => {
    server.stdout.on("data", (d) => {
      out += d;
      const m = /setup\?code=([\w-]+)/.exec(out);
      if (m) {
        setupCode = m[1];
        resolve();
      }
    });
    server.on("exit", (code) => reject(new Error(`server exited (${code})`)));
  });
});
after(() => server?.kill());

const form = (data) => new URLSearchParams(data).toString();
const post = (route, data, headers = {}) => fetch(base + route, { method: "POST", redirect: "manual", body: form(data),
  headers: { "Content-Type": "application/x-www-form-urlencoded", Origin: base, ...(cookie ? { Cookie: cookie } : {}), ...headers } });
const csrfOf = async (route) => /name="csrf" value="([^"]+)"/.exec(await (await fetch(base + route, { headers: { Cookie: cookie } })).text())[1];

test("unknown Host headers are refused (DNS rebinding)", async () => {
  // fetch() can't override Host, node:http can.
  const status = await new Promise((resolve, reject) => {
    http.get(`${base}/healthz`, { headers: { Host: "attacker.example" } }, (r) => resolve(r.statusCode)).on("error", reject);
  });
  assert.equal(status, 421);
});

test("setup creates the admin account and signs in", async () => {
  assert.equal((await fetch(`${base}/`, { redirect: "manual" })).headers.get("location"), "/setup");
  const bad = await post("/setup", { code: "wrong", name: "A", email: "admin@example.com", password: "correct-horse-battery", password2: "correct-horse-battery" });
  assert.equal(bad.status, 400);
  const crossSite = await post("/setup", { code: setupCode }, { Origin: "https://attacker.example" });
  assert.equal(crossSite.status, 403);
  const r = await post("/setup", { code: setupCode, name: "Admin", email: "admin@example.com", password: "correct-horse-battery",
                                   password2: "correct-horse-battery" });
  assert.equal(r.status, 303);
  cookie = r.headers.get("set-cookie").split(";")[0];
  const home = await fetch(`${base}/`, { headers: { Cookie: cookie } });
  assert.equal(home.status, 200);
  assert.match(await home.text(), /Connect your apps once/);
});

test("panel pages render", async () => {
  for (const route of ["/apps", "/apps/github", "/apps/microsoft365", "/agents", "/tokens", "/settings", "/users", "/oauth-apps", "/audit"]) {
    const r = await fetch(base + route, { headers: { Cookie: cookie } });
    assert.equal(r.status, 200, route);
  }
});

test("forms without the CSRF token are rejected", async () => {
  const r = await post("/tokens", { name: "x", all: "1" });
  assert.equal(r.status, 403);
});

test("tokens give MCP access", async () => {
  const r = await post("/tokens", { csrf: await csrfOf("/tokens"), name: "Test agent", all: "1", format: "json" });
  ({ token } = await r.json());
  const mcp = (body, t = token) => fetch(`${base}/mcp`, { method: "POST", body: JSON.stringify(body),
    headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json", Accept: "application/json, text/event-stream" } });
  const init = await (await mcp({ jsonrpc: "2.0", id: 1, method: "initialize",
    params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "test", version: "1" } } })).json();
  assert.equal(init.result.serverInfo.name, "conector");
  const list = await (await mcp({ jsonrpc: "2.0", id: 2, method: "tools/list" })).json();
  assert.ok(list.result.tools.some((t) => t.name === "conector_apps"));
  assert.equal((await mcp({ jsonrpc: "2.0", id: 3, method: "tools/list" }, "cnr_invalid")).status, 401);
});

test("the stdio bridge forwards JSON-RPC", async () => {
  const bridge = spawn(process.execPath, [path.join(ROOT, "bin", "stdio-bridge.js")], {
    env: { ...process.env, CONECTOR_URL: `${base}/mcp`, CONECTOR_TOKEN: token }, stdio: ["pipe", "pipe", "ignore"] });
  const lines = [];
  bridge.stdout.on("data", (d) => lines.push(...String(d).split("\n").filter(Boolean)));
  bridge.stdin.end(`${JSON.stringify({ jsonrpc: "2.0", id: 7, method: "tools/call", params: { name: "conector_apps", arguments: {} } })}\n`);
  await new Promise((resolve) => bridge.on("exit", resolve));
  const reply = JSON.parse(lines[0]);
  assert.equal(reply.id, 7);
  assert.match(reply.result.content[0].text, /connectMore/);
});

test("REST API lists the token's connected apps", async () => {
  const r = await fetch(`${base}/api/v1/apps`, { headers: { Authorization: `Bearer ${token}` } });
  assert.deepEqual(await r.json(), []);
  const missing = await fetch(`${base}/api/v1/apps/github/request`, { method: "POST", body: "{}",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } });
  assert.equal(missing.status, 409);
});
