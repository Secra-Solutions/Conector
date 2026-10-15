// MCP server: built per request (stateless mode) with the tools of the apps that are connected for the token's user
// (personal or shared connections) and allowed by the token.
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CONFIG, VERSION } from "./config.js";
import { runAs } from "./context.js";
import { allowed } from "./auth.js";
import { audit } from "./store.js";
import { CONNECTORS, formatResult, isConnected } from "./connectors.js";

export function createMcpServer(token) {
  const actor = { userId: token.userId, via: "mcp" };
  const available = runAs(actor, () => CONNECTORS.filter((c) => allowed(token, c.id) && isConnected(c.id)));
  const apps = available.map((c) => `${c.name} (${c.description})`).join("; ");
  const server = new McpServer({ name: "conector", version: VERSION },
    { instructions: `Conector gives you authenticated access to the user's apps. Connected apps: ${apps || "none yet — connect apps in the Conector panel"}. `
      + "Prefer the app-specific tools when they exist, and use <app>_request for any other operation of an app's API." });
  // Always present (so tools/list works before any app is connected): what this token can use and where to add more.
  server.registerTool("conector_apps", { title: "Connected apps", description: "List the apps this Conector token can use, with their tools, "
    + "and the panel address where the user connects more apps.", inputSchema: {}, annotations: { readOnlyHint: true } },
  () => ({ content: [{ type: "text", text: formatResult({
    connected: available.map((c) => ({ id: c.id, name: c.name, description: c.description, tools: c.tools.map((t) => t.name) })),
    connectMore: `${CONFIG.publicUrl}/apps`,
  }) }] }));
  for (const c of available) {
    for (const t of c.tools) {
      server.registerTool(t.name, { title: t.title, description: t.description, inputSchema: t.schema, annotations: t.annotations },
        (args) => runAs(actor, async () => {
          const started = Date.now();
          const event = { via: "mcp", token: token.name, userId: token.userId, app: c.id, tool: t.name,
                          ...(args?.path ? { method: args.method || "GET", path: String(args.path).slice(0, 200) } : {}) };
          try {
            const result = await t.run(args ?? {});
            audit({ ...event, ok: true, ms: Date.now() - started });
            return { content: [{ type: "text", text: formatResult(result) }] };
          } catch (e) {
            audit({ ...event, ok: false, error: e.message.slice(0, 300), ms: Date.now() - started });
            return { content: [{ type: "text", text: `Error: ${e.message}` }], isError: true };
          }
        }));
    }
  }
  return server;
}
