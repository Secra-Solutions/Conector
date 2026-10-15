#!/usr/bin/env node
// Conector command line: start the server, manage users and tokens, and add Conector to agents (`conector install`).
// It works on the same data directory as the server (CONECTOR_DATA_DIR), so run it on the machine where Conector runs.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseArgs } from "node:util";

const HELP = `Conector — one MCP server for all your apps.

Usage: conector <command> [options]

Server
  start                         Start the server (same as npm start)
  setup-link                    Print a link to create the first admin account

Users and tokens
  users                         List users
  invite <email> [--admin]      Print an invitation link (7 days)
  reset-link <email>            Print a password reset link (24 hours)
  token <email> [--name N] [--apps a,b]
                                Create an access token for agents (shown once)
  tokens                        List access tokens
  revoke <token id>             Revoke an access token

Agents
  agents                        List the agents Conector can be added to
  install <agent>               Add Conector to an agent (runs its CLI or edits its config file)
      --user <email>            Create the token for this user (default: the only user)
      --token <token>           Use an existing token instead of creating one
      --url <url>               MCP endpoint (default: <CONECTOR_PUBLIC_URL>/mcp)
      --method <n>              Pick one of the agent's methods (see "conector install <agent> --list")
      --list                    Show the agent's methods
      --dry-run                 Print what would be done, without a real token

Apps
  apps [--connected]            List the app catalog (or only connected apps)
`;

const { values: opt, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    admin: { type: "boolean" }, name: { type: "string" }, apps: { type: "string" }, user: { type: "string" }, token: { type: "string" },
    url: { type: "string" }, method: { type: "string" }, list: { type: "boolean" }, "dry-run": { type: "boolean" },
    connected: { type: "boolean" }, help: { type: "boolean", short: "h" },
  },
});
const [command, ...args] = positionals;
const fail = (text) => {
  console.error(`Error: ${text}`);
  process.exit(1);
};

if (!command || opt.help || command === "help") {
  console.log(HELP);
  process.exit(0);
}
// ---------------------------------------------------------------- install

const OS = { darwin: "macos", linux: "linux", win32: "windows" }[process.platform] || "linux";

function expandPath(p) {
  if (!p) return null;
  const out = p.replace(/^~(?=$|[\\/])/, os.homedir()).replace(/%([A-Z_]+)%/g, (m, k) => process.env[k] || m);
  return path.isAbsolute(out) ? out : null; // relative paths are per project: left to the user
}
const onPath = (bin) => spawnSync(process.platform === "win32" ? "where" : "sh", process.platform === "win32" ? [bin] : ["-c", `command -v ${bin}`],
  { stdio: "ignore" }).status === 0;

/** Picks how to install: the agent's own CLI if it is installed, else a JSON/TOML file we can edit, else instructions. */
function chooseMethod(a) {
  if (opt.method) return a.methods[Number(opt.method) - 1] || fail(`${a.name} has ${a.methods.length} method(s)`);
  const usable = (m) => m.kind === "file" && ["json", "toml"].includes(m.format) && expandPath(m.path?.[OS]);
  const cli = a.methods.find((m) => m.kind === "command" && !m.command.includes("{{BRIDGE_PATH}}") && /^[\w.-]+$/.test(m.command.split(" ")[0])
    && onPath(m.command.split(" ")[0]));
  return cli || a.methods.find((m) => usable(m) && !m.snippet.includes("{{BRIDGE_PATH}}")) || a.methods.find(usable) || a.methods[0];
}

function deepMerge(target, source) {
  for (const [k, v] of Object.entries(source)) {
    if (v && typeof v === "object" && !Array.isArray(v) && target[k] && typeof target[k] === "object" && !Array.isArray(target[k])) deepMerge(target[k], v);
    else target[k] = v;
  }
  return target;
}

function backup(file) {
  if (fs.existsSync(file)) fs.copyFileSync(file, `${file}.conector-backup`);
}

function writeJson(file, snippet) {
  const add = JSON.parse(snippet);
  let current = {};
  if (fs.existsSync(file)) {
    const text = fs.readFileSync(file, "utf8");
    try {
      current = text.trim() ? JSON.parse(text) : {};
    } catch {
      return false; // comments (JSONC) or invalid JSON: rewriting it would lose content
    }
  }
  backup(file);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(deepMerge(current, add), null, 2)}\n`);
  return true;
}

function appendToml(file, snippet) {
  const text = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
  const headers = [...snippet.matchAll(/^\s*(\[\[?[^\]\n]+\]\]?)\s*$/gm)].map((m) => m[1]);
  const clash = headers.some((h) => (h.startsWith("[[") ? text.includes('"conector"') && text.includes(h) : text.split(/\r?\n/).some((l) => l.trim() === h)));
  if (clash) return false; // the table already exists: merging TOML by hand is safer than duplicating it
  backup(file);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${text}${text && !text.endsWith("\n") ? "\n" : ""}${text ? "\n" : ""}${snippet}\n`);
  return true;
}

async function install([id], { CONFIG, auth }) {
  const { AGENTS, fillTemplate } = await import("../src/agents.js");
  if (!id) fail("usage: conector install <agent>. Run \"conector agents\" for the list.");
  const a = AGENTS.find((x) => x.id === id) || AGENTS.find((x) => x.id.startsWith(id) || x.name.toLowerCase() === id.toLowerCase())
    || fail(`unknown agent "${id}". Run "conector agents" for the list.`);
  if (!a.methods.length) fail(`${a.name} can't be added automatically. ${a.notes || ""}`);
  if (opt.list) {
    a.methods.forEach((m, i) => console.log(`${i + 1}. ${m.title} (${m.kind === "command" ? "command" : m.kind === "steps" ? "steps in the app" : `${m.format} file`})`));
    return;
  }
  const url = opt.url || `${CONFIG.publicUrl}/mcp`;
  try {
    if (!/^https?:$/.test(new URL(url).protocol) || !/^[\w:/.~%?=&@[\]-]+$/.test(url)) throw new Error();
  } catch {
    fail(`"${url}" is not a valid MCP URL`);
  }
  const m = chooseMethod(a);
  const dry = opt["dry-run"];
  let token = opt.token || process.env.CONECTOR_TOKEN;
  if (token && !/^cnr_[\w-]+$/.test(token)) fail("that doesn't look like a Conector token (cnr_…)");
  if (!token && dry) token = "YOUR_CONECTOR_TOKEN";
  if (!token) {
    const users = auth.listUsers();
    const user = opt.user ? auth.findUserByEmail(opt.user) : users.length === 1 ? users[0] : null;
    if (!user) fail(users.length ? "pass --user <email> (the token acts as that user) or --token." : "create the admin account first (conector setup-link).");
    token = auth.createToken({ name: `${a.name} (${os.hostname().split(".")[0]})`, userId: user.id, apps: ["*"] }).token;
    console.log(`Created an access token for ${user.email} named “${a.name} (${os.hostname().split(".")[0]})”. Revoke it in the panel at any time.`);
  }
  const fill = (text, format) => fillTemplate(text, { url, format }).split("{{TOKEN}}").join(token);
  console.log(`${a.name}: ${m.title}`);

  if (m.kind === "steps") {
    m.steps.forEach((s, i) => console.log(`  ${i + 1}. ${s}`));
    for (const v of m.values || []) console.log(`  ${v.label}: ${fill(v.value)}`);
    return;
  }
  if (m.kind === "command") {
    const cmd = fill(m.command);
    if (dry) return console.log(`  would run: ${cmd}`);
    const r = spawnSync(cmd, { shell: true, stdio: "inherit" });
    if (r.status !== 0) fail(`the command failed (exit code ${r.status}). Try another method: conector install ${a.id} --list`);
  } else {
    const file = expandPath(m.path?.[OS]);
    const snippet = fill(m.snippet, m.format);
    if (dry || !file || !["json", "toml"].includes(m.format)) {
      console.log(`  ${dry ? "would add" : "Add"} this to ${file || m.path?.[OS] || "the agent's config file"}:\n\n${snippet}\n`);
      if (!dry) return;
    } else if (!(m.format === "json" ? writeJson(file, snippet) : appendToml(file, snippet))) {
      console.log(`  ${file} already has settings that can't be merged automatically. Add this by hand:\n\n${snippet}\n`);
      return;
    } else {
      console.log(`  Updated ${file}${fs.existsSync(`${file}.conector-backup`) ? ` (previous version saved as ${path.basename(file)}.conector-backup)` : ""}.`);
    }
  }
  if (a.verify && !dry) console.log(`\nCheck it: ${a.verify}`);
}

// ---------------------------------------------------------------- commands

if (command === "start") {
  await import("../src/server.js");
} else {
  const { CONFIG } = await import("../src/config.js");
  const auth = await import("../src/auth.js");
  const userByEmail = (email) => auth.findUserByEmail(email) || fail(`no user with the e-mail ${email}`);

  const commands = {
    "setup-link"() {
      if (auth.hasUsers()) fail("the admin account already exists. Use \"conector invite\" or \"conector reset-link\".");
      console.log(`Create the admin account at:\n  ${CONFIG.publicUrl}/setup?code=${auth.createSetupCode()}`);
    },
    users() {
      const users = auth.listUsers();
      if (!users.length) return console.log("No users yet. Run \"conector setup-link\".");
      for (const u of users) console.log(`${u.email.padEnd(36)} ${u.role.padEnd(7)} ${u.disabledAt ? "disabled" : "active  "} ${u.name}`);
    },
    invite([email]) {
      if (!email) fail("usage: conector invite <email> [--admin]");
      const { token } = auth.createInvite({ email, role: opt.admin ? "admin" : "member", createdBy: "cli" });
      console.log(`Invitation for ${email} (valid 7 days, single use):\n  ${CONFIG.publicUrl}/invite/${token}`);
    },
    "reset-link"([email]) {
      if (!email) fail("usage: conector reset-link <email>");
      console.log(`Password reset link for ${email} (valid 24 hours, single use):\n  ${CONFIG.publicUrl}/reset/${auth.createReset(userByEmail(email).id)}`);
    },
    token([email]) {
      if (!email) fail("usage: conector token <email> [--name N] [--apps a,b]");
      const u = userByEmail(email);
      const apps = opt.apps ? opt.apps.split(",").map((s) => s.trim()).filter(Boolean) : ["*"];
      const { id, token } = auth.createToken({ name: opt.name || `CLI token (${os.hostname().split(".")[0]})`, userId: u.id, apps });
      console.log(`Token ${id} for ${u.email} (${apps.includes("*") ? "all apps" : apps.join(", ")}). It is shown only once:\n  ${token}`);
    },
    tokens() {
      const users = new Map(auth.listUsers().map((u) => [u.id, u.email]));
      const tokens = auth.allTokens();
      if (!tokens.length) return console.log("No tokens yet.");
      for (const t of tokens) {
        console.log(`${t.id}  ${t.name.padEnd(32)} ${String(users.get(t.userId) || "?").padEnd(30)} ${t.apps.includes("*") ? "all apps" : t.apps.join(",")}  `
          + `last used ${t.lastUsedAt || "never"}`);
      }
    },
    revoke([id]) {
      const t = auth.allTokens().find((x) => x.id === id) || fail(`no token with the id ${id}`);
      auth.revokeToken(t.id);
      console.log(`Revoked “${t.name}”.`);
    },
    async agents() {
      const { AGENTS } = await import("../src/agents.js");
      for (const a of [...AGENTS].sort((x, y) => x.name.localeCompare(y.name, "en"))) {
        const how = a.methods.length ? a.methods.map((m) => (m.kind === "command" ? "cli" : m.kind === "steps" ? "app" : m.format)).join(", ") : "not supported";
        console.log(`${a.id.padEnd(20)} ${a.name.padEnd(22)} ${how}`);
      }
    },
    async apps() {
      const { CONNECTORS, isConnected } = await import("../src/connectors.js");
      const { runAs } = await import("../src/context.js");
      const list = opt.connected ? CONNECTORS.filter((c) => runAs({ userId: null, via: "cli" }, () => isConnected(c.id))) : CONNECTORS;
      for (const c of list) console.log(`${c.id.padEnd(24)} ${c.name.padEnd(32)} ${c.category}`);
      console.log(`\n${list.length} apps${opt.connected ? " connected (shared)" : ""}.`);
    },
    install: (a) => install(a, { CONFIG, auth }),
  };
  if (!commands[command]) fail(`unknown command "${command}". Run "conector help".`);
  await commands[command](args);
}
