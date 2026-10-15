// Validates app definitions without touching the store or using real credentials:
//   node scripts/validate-catalog.mjs [src/catalog/apps/projects.js …] [--offline] [--only id1,id2]
// 1) checks the definition (defineConnector), tool names and texts;
// 2) unless --offline, calls the connection test with FAKE credentials to see that the endpoint exists and that the
//    service recognizes the way of authenticating (the normal answer: 401/403 with an "invalid key"-style message; a 404
//    or a DNS error means a wrong URL or path). For OAuth apps it also checks the authorization page and the token endpoint.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

process.env.CONECTOR_DATA_DIR ||= fs.mkdtempSync(path.join(os.tmpdir(), "conector-validate-"));
const ROOT = path.resolve(import.meta.dirname, "..");
const args = process.argv.slice(2);
const offline = args.includes("--offline");
const onlyArg = args.indexOf("--only");
const only = onlyArg >= 0 ? new Set(String(args[onlyArg + 1] || "").split(",").filter(Boolean)) : null;
let files = args.filter((a, i) => !a.startsWith("--") && i !== onlyArg + 1);
if (!files.length) {
  const dir = path.join(ROOT, "src", "catalog", "apps");
  files = fs.readdirSync(dir).filter((f) => f.endsWith(".js")).sort().map((f) => path.join(dir, f));
}

// Fake credentials in memory: defineConnector() reads them from here instead of the store, which is never touched.
const fake = new Map();
const { defineConnector } = await import("../src/catalog/define.js");
const { USER_AGENT } = await import("../src/http.js");

const BROWSER = "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";
// Checked by hand against their docs: they answer 404, like a made-up path, to a client_id that doesn't exist.
const AUTHORIZE_404 = new Set(["login.mailchimp.com", "accounts.crowdin.com"]);
const PLACEHOLDER = /example\.invalid|\/\/example\./;
let problems = 0;
let apps = 0;
const toolNames = new Set();
const appIds = new Set();

function fakeValue(f) {
  if (f.example) return f.example;
  if (f.default) return f.default;
  if (f.options) return f.options[0][0];
  if (f.format === "url") return "https://example.invalid";
  if (f.format === "subdomain") return "example";
  if (f.format === "domain") return "example.invalid";
  if (/mail|user/i.test(f.id)) return "test@example.com";
  return "fake-credential-123456";
}

const summary = (d) => (typeof d === "string" ? d : JSON.stringify(d) || "").replace(/\s+/g, " ").slice(0, 160);

for (const file of files) {
  const defs = (await import(pathToFileURL(path.resolve(file)).href)).default;
  if (only && !defs.some((d) => only.has(d.id))) continue;
  console.log(`\n=== ${path.relative(ROOT, path.resolve(file))}: ${defs.length} apps`);
  for (const def of defs) {
    if (only && !only.has(def.id)) continue;
    apps++;
    let c;
    try {
      c = defineConnector(def, { readCredentials: (id) => fake.get(id) });
    } catch (e) {
      console.log(`✗ ${def.id}: ${e.message}`);
      problems++;
      continue;
    }
    const warnings = [];
    if (appIds.has(c.id)) warnings.push(`repeated app id ${c.id}`);
    appIds.add(c.id);
    if (c.description.length > 70) warnings.push(`long description (${c.description.length} > 70)`);
    if (!/^https:\/\//.test(c.website || "")) warnings.push("missing website (https://…)");
    if (!/^https:\/\//.test(c.docs || "")) warnings.push("missing docs (https://…)");
    if (!c.logo.simpleIcons && !c.logo.favicon && !c.logo.file && !c.logo.image) warnings.push("missing logo (simpleIcons, image or favicon)");
    if (c.type !== "oauth" && (!c.help || c.help.length < 40)) warnings.push("help text too short");
    if (c.oauth && (c.oauth.provider.help || "").length < 40) warnings.push("missing OAuth provider help (how to register the app)");
    for (const t of c.tools) {
      if (toolNames.has(t.name)) warnings.push(`repeated tool ${t.name}`);
      toolNames.add(t.name);
    }
    let network = "";
    if (!offline) {
      const cred = Object.fromEntries(c.fields.map((f) => [f.id, fakeValue(f)]));
      // Each way of connecting on its own: with a key and, if there is one, with OAuth (fake token, through the real path).
      const ways = [];
      if (c.type !== "oauth") ways.push(["", cred, def.baseUrl, def.test]);
      if (c.oauth) {
        ways.push([c.type === "oauth" ? "" : "OAuth: ", { ...cred, method: "oauth", access_token: "fake-token", expires: null },
                   def.oauth?.baseUrl || def.baseUrl, def.oauth?.test || def.test]);
      }
      const parts = [];
      for (const [way, credWay, base, t] of ways) {
        try {
          const template = typeof base === "function" ? base(credWay) : base;
          const filled = template.replace(/\{(\w+)\}/g, (_, k) => (def.derived?.[k] ? def.derived[k](credWay) : credWay[k]));
          if (PLACEHOLDER.test(filled)) {
            parts.push(`${way}(each customer has its own URL: no network check)`);
            continue;
          }
          // Values that arrive with the authorization (e.g. Atlassian's cloudid): without a real one the URL doesn't exist.
          const late = typeof template === "string" ? [...template.matchAll(/\{(\w+)\}/g)].map(([, k]) => c.fields.find((x) => x.id === k))
            .filter((x) => x?.hidden && !x.example) : [];
          if (credWay.method === "oauth" && late.length) {
            parts.push(`${way}(the URL is completed when authorizing: no network check)`);
            continue;
          }
          fake.set(c.id, credWay);
          const route = t.path.replace(/\{(\w+)\}/g, (_, k) => credWay[k] ?? k);
          const r = await c.request({ method: t.method || "GET", path: route, query: t.query, body: t.body, form: t.form, headers: t.headers });
          parts.push(`${way}${r.status} ${summary(r.data)}`);
          // A definition that accepts a status (NVD answers 404 to a bad key) or whose validate rejects the answer (Census
          // returns an "Invalid Key" HTML page) already gives the user a clear error: it is not a wrong path.
          let rejected = false;
          try {
            t.validate?.(r.data, r);
          } catch {
            rejected = true;
          }
          // Some APIs reject a fake key with 404 or 500 (CardClan, Botsonic, GoDial, Fireflies) and say so in the body.
          const authRejection = /invalid[^a-z]*([a-z]+[^a-z]*)?(key|token)|api[^a-z]*key[^a-z]*not[^a-z]*found|unauthori[sz]ed|unauthenticated|auth[^a-z]*failed/i
            .test(summary(r.data));
          const accepted = (t.acceptStatus?.includes(r.status) && rejected) || authRejection;
          if (([404, 405].includes(r.status) || r.status >= 500) && !accepted) warnings.push(`${way}the test returns ${r.status}: check baseUrl/path`);
          // A web page instead of the API (domain moved, app route…) also answers 200.
          if (r.ok && typeof r.data === "string" && /^\s*<(!doctype|html)/i.test(r.data) && !rejected) {
            warnings.push(`${way}the test returns a web page (HTML), not the API: check baseUrl/path`);
          }
        } catch (e) {
          // A 4xx when requesting the token (client credentials) with fake data is expected: the service answers.
          const rejection = /responded (4\d\d)/.exec(e.message);
          parts.push(rejection ? `${way}${rejection[1]} (token request) ${e.message.slice(0, 140)}` : `${way}ERROR ${e.cause?.code || ""} ${e.message}`);
          if (!rejection || ["404", "405"].includes(rejection[1])) warnings.push(`${way}the test doesn't reach the service`);
        }
      }
      if (c.oauth) warnings.push(...await checkOAuth(c, cred));
      network = parts.join(" | ");
    }
    if (warnings.some((w) => /doesn't reach|check |repeated/.test(w))) problems++;
    console.log(`${warnings.length ? "⚠" : "✓"} ${c.id.padEnd(18)} ${c.type.padEnd(6)} ${c.tools.length} tools ${network}`
      + `${warnings.length ? `\n    · ${warnings.join("\n    · ")}` : ""}`);
  }
}

// OAuth: with a fake client, the authorization page must answer (sign-in, error or redirect) and the token endpoint must
// reject the code (400/401); a 404, a 405, a 5xx or a DNS failure means a wrong URL.
async function checkOAuth(c, fakeCred) {
  const cred = { ...fakeCred, client_id: "fake-client", client_secret: "fake-secret" };
  const { provider: p, scopes, resolve } = c.oauth;
  const redirect = p.redirect === "https" ? "https://conector.example.com/oauth/callback" : `http://${p.redirect || "127.0.0.1"}:8790/oauth/callback`;
  const params = { client_id: cred.client_id, redirect_uri: redirect, response_type: "code",
    ...(scopes.length ? { scope: scopes.join(p.scopeSeparator || " ") } : {}), state: "check", ...p.extraParams };
  let body = { grant_type: "authorization_code", code: "fake-code", redirect_uri: redirect, client_id: cred.client_id, client_secret: cred.client_secret };
  if (p.tokenBody) body = p.tokenBody(body, cred);
  const checks = [
    ["the authorization page", p.authorizeUrl, { headers: { "User-Agent": BROWSER } }, p.params ? p.params(params, cred) : params],
    ["the token endpoint", p.tokenUrl, { method: "POST", headers: { "User-Agent": USER_AGENT, Accept: "application/json",
      ...(p.json ? { "Content-Type": "application/json" } : {}) }, body: p.json ? JSON.stringify(body) : new URLSearchParams(body) }, {}],
  ];
  const warnings = [];
  for (const [what, template, options, query] of checks) {
    // Pages of each customer (Salesforce "My Domain", Shopify…) don't exist with fake data: not checked.
    let url;
    try {
      url = new URL(resolve(template, cred));
    } catch {
      continue;
    }
    if (PLACEHOLDER.test(url.href)) continue;
    try {
      for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);
      const r = await fetch(url, { ...options, redirect: "manual", signal: AbortSignal.timeout(20_000) });
      const text = r.status === 404 ? (await r.text().catch(() => "")).slice(0, 500) : (await r.body?.cancel(), "");
      // Some token endpoints answer 404 to a client that doesn't exist (Intercom: "Client not found"): the endpoint exists.
      let unknownClient = r.status === 404 && /client[^a-z]*(not found|unknown)|invalid_client/i.test(text);
      // Some authorization pages answer 404 to an unknown client_id: if the page answers without parameters, it exists.
      if (r.status === 404 && !unknownClient && !options.method) {
        const bare = await fetch(url.origin + url.pathname, { ...options, redirect: "manual", signal: AbortSignal.timeout(20_000) });
        await bare.body?.cancel();
        unknownClient = bare.status !== 404 && bare.status < 500;
      }
      // Control: if a made-up path on the same server answers differently (GitHub: JSON 404 on the token endpoint, HTML 422
      // on the made-up path), the 404 is the endpoint's answer to an unknown client, not a missing route.
      if (r.status === 404 && !unknownClient) {
        const control = await fetch(`${url.origin}${url.pathname.replace(/\/$/, "")}-missing-route${url.search}`,
          { ...options, redirect: "manual", signal: AbortSignal.timeout(20_000) });
        await control.body?.cancel();
        unknownClient = control.status !== 404 || control.headers.get("content-type") !== r.headers.get("content-type");
      }
      if (r.status === 404 && AUTHORIZE_404.has(url.host) && !options.method) unknownClient = true;
      if (([404, 405].includes(r.status) && !unknownClient) || r.status >= 500) warnings.push(`${what} returns ${r.status}: check the URL`);
    } catch (e) {
      warnings.push(`${what} doesn't answer (${e.cause?.code || e.message}): check the URL`);
    }
  }
  return warnings;
}

console.log(problems ? `\n${apps} apps, ${problems} problem(s) to review` : `\n${apps} apps, all good`);
process.exit(problems ? 1 : 0);
