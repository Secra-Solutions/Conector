#!/usr/bin/env node
// stdio ⇄ Streamable HTTP bridge for agents that can only start local MCP servers. It has no dependencies, so it can be
// copied to any machine with Node.js 18 or later. Configuration comes from the environment:
//   CONECTOR_URL    the MCP endpoint, e.g. https://conector.example.com/mcp (default http://localhost:8790/mcp)
//   CONECTOR_TOKEN  an access token created in the panel ("Access tokens")
// Every JSON-RPC message read from stdin (one per line) is POSTed to Conector; the answers are written to stdout.
// Logs go to stderr, which agents show in their MCP logs.
import readline from "node:readline";

const URL_ = process.env.CONECTOR_URL || "http://localhost:8790/mcp";
const TOKEN = process.env.CONECTOR_TOKEN || "";
const log = (text) => process.stderr.write(`[conector] ${text}\n`);
let protocolVersion = null;

if (!TOKEN) log("CONECTOR_TOKEN is not set: create a token in the Conector panel (Access tokens) and add it to this server's env.");

const write = (message) => process.stdout.write(`${JSON.stringify(message)}\n`);
const errorFor = (message, code, text) => {
  if (message?.id !== undefined && message?.method) write({ jsonrpc: "2.0", id: message.id, error: { code, message: text } });
};

/** Reads a text/event-stream body and returns the JSON payload of every "data:" event. */
function parseEventStream(text) {
  const out = [];
  for (const block of text.split(/\r?\n\r?\n/)) {
    const data = block.split(/\r?\n/).filter((l) => l.startsWith("data:")).map((l) => l.slice(5).trimStart()).join("\n");
    if (data) out.push(JSON.parse(data));
  }
  return out;
}

async function forward(message) {
  const headers = { "Content-Type": "application/json", Accept: "application/json, text/event-stream", Authorization: `Bearer ${TOKEN}` };
  if (protocolVersion) headers["MCP-Protocol-Version"] = protocolVersion;
  let res;
  try {
    res = await fetch(URL_, { method: "POST", headers, body: JSON.stringify(message) });
  } catch (e) {
    log(`can't reach ${URL_}: ${e.cause?.code || e.message}`);
    return errorFor(message, -32000, `Can't reach Conector at ${URL_}. Is the server running?`);
  }
  if (res.status === 202 || res.status === 204) return;
  const text = await res.text();
  if (res.status === 401) {
    log("the token was rejected (revoked, mistyped or for another server)");
    return errorFor(message, -32001, "Conector rejected the token: create a new one in the panel (Access tokens).");
  }
  let replies;
  try {
    replies = (res.headers.get("content-type") || "").includes("text/event-stream") ? parseEventStream(text) : [JSON.parse(text)];
  } catch {
    log(`unexpected answer (HTTP ${res.status}): ${text.slice(0, 200)}`);
    return errorFor(message, -32603, `Conector answered HTTP ${res.status}`);
  }
  for (const reply of replies.flat()) {
    if (message.method === "initialize" && reply?.result?.protocolVersion) protocolVersion = reply.result.protocolVersion;
    write(reply);
  }
}

const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
let pending = 0;
let closed = false;
rl.on("line", (line) => {
  if (!line.trim()) return;
  let message;
  try {
    message = JSON.parse(line);
  } catch {
    write({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } });
    return;
  }
  // Requests run concurrently (answers carry their id), so a slow tool call doesn't block the others.
  pending += 1;
  forward(message).catch((e) => log(e.message)).finally(() => {
    pending -= 1;
    if (closed && !pending) process.exit(0);
  });
});
rl.on("close", () => {
  closed = true;
  if (!pending) process.exit(0);
});
