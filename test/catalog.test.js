import assert from "node:assert/strict";
import { test } from "node:test";
import { tempDataDir } from "./helpers.js";

tempDataDir();
const { CONNECTORS, CATALOG_ERRORS, CATEGORIES } = await import("../src/connectors.js");
const { AGENTS, fillTemplate } = await import("../src/agents.js");

test("every app definition loads", () => {
  assert.deepEqual(CATALOG_ERRORS, []);
  assert.ok(CONNECTORS.length > 1000);
});

test("app ids and tool names are unique, texts fit the panel", () => {
  const ids = new Set();
  const tools = new Set();
  for (const c of CONNECTORS) {
    assert.ok(!ids.has(c.id), `repeated app id ${c.id}`);
    ids.add(c.id);
    assert.ok(CATEGORIES[c.category], `${c.id}: unknown category`);
    assert.ok(c.description.length <= 70, `${c.id}: description longer than 70 characters`);
    for (const t of c.tools) {
      assert.ok(!tools.has(t.name), `repeated tool ${t.name}`);
      assert.match(t.name, /^[a-z0-9_]{3,64}$/);
      tools.add(t.name);
    }
  }
});

// A line ending in `" +` followed by one starting with `+ "` turns the second string into NaN; a missing value
// prints "undefined". Both are easy to miss in review and show up in the panel and in the tool descriptions.
test("app texts have no NaN, undefined or [object Object] from broken concatenation", () => {
  const broken = /\bNaN\b|\bundefined\b|\[object Object\]/;
  for (const c of CONNECTORS) {
    const texts = { description: c.description, help: c.help, oauthHelp: c.oauthHelp,
      ...Object.fromEntries((c.fields || []).flatMap((f) => [[`field ${f.id} label`, f.label], [`field ${f.id} help`, f.help]])),
      ...Object.fromEntries(c.tools.map((t) => [`tool ${t.name}`, t.description])) };
    for (const [where, text] of Object.entries(texts)) {
      const found = typeof text === "string" && text.match(broken);
      assert.ok(!found, `${c.id}: ${where} contains "${found?.[0]}"`);
    }
  }
});

test("every agent has a name, a kind and well-formed install snippets", () => {
  const ids = new Set();
  for (const a of AGENTS) {
    assert.ok(a.id && a.name && a.kind, `incomplete agent ${a.id}`);
    assert.ok(!ids.has(a.id), `repeated agent ${a.id}`);
    ids.add(a.id);
    for (const m of a.methods) {
      assert.ok(["command", "file", "steps"].includes(m.kind), `${a.id}: unknown method kind ${m.kind}`);
      if (m.kind === "file" && m.format === "json") {
        const text = fillTemplate(m.snippet, { url: "https://conector.example.com/mcp", format: "json" }).replaceAll("{{TOKEN}}", "cnr_test");
        assert.doesNotThrow(() => JSON.parse(text), `${a.id}: "${m.title}" is not valid JSON`);
      }
      const text = m.command || m.snippet || JSON.stringify(m.values || []);
      assert.ok(!/\{\{(?!URL|TOKEN|NAME|BRIDGE_PATH|NODE)\w+\}\}/.test(text), `${a.id}: unknown placeholder`);
    }
  }
});
