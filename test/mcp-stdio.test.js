import assert from "node:assert/strict";
import path from "node:path";
import { test } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { ROOT, tempDataDir } from "./helpers.js";

test("conector mcp answers over stdio without the web server or a token", async () => {
  const dataDir = tempDataDir();
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [path.join(ROOT, "bin", "conector.js"), "mcp"],
    env: { ...process.env, CONECTOR_DATA_DIR: dataDir },
    stderr: "pipe",
  });
  const client = new Client({ name: "test", version: "1.0.0" });
  await client.connect(transport);
  try {
    assert.equal(client.getServerVersion().name, "conector");
    const { tools } = await client.listTools();
    assert.deepEqual(tools.map((t) => t.name), ["conector_apps"]);
    const result = await client.callTool({ name: "conector_apps", arguments: {} });
    assert.deepEqual(JSON.parse(result.content[0].text).connected, []);
  } finally {
    await client.close();
  }
});
