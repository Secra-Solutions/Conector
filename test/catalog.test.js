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
