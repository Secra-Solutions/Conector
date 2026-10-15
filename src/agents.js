// MCP clients ("agents") and how to add Conector to each one. The data lives in src/agents.json: per agent, the
// supported transports and one or more methods (a CLI command or a config file snippet) with placeholders:
// {{URL}} (the MCP endpoint), {{TOKEN}} (an access token), {{NAME}} (the server name), {{BRIDGE_PATH}} (bin/stdio-bridge.js)
// and {{NODE}} (the Node.js binary running this server, so GUI apps without node on their PATH can start the bridge).
import fs from "node:fs";
import path from "node:path";
import { ROOT } from "./config.js";

export const AGENTS = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, "agents.json"), "utf8"));
export const BRIDGE_PATH = path.join(ROOT, "bin", "stdio-bridge.js");
export const NODE_PATH = process.execPath;

/** Agents shown first and on the home page. */
export const POPULAR_AGENTS = ["claude-code", "claude-desktop", "codex", "cursor", "github-copilot", "gemini-cli", "opencode", "cline",
  "goose", "kiro", "amp", "google-antigravity"];

export const agent = (id) => AGENTS.find((a) => a.id === id);

/**
 * Fills every placeholder except {{TOKEN}}, which the panel fills in the browser once a token exists. Paths are escaped
 * for the snippet's format (JSON, TOML and YAML double-quoted strings share the backslash escapes of Windows paths).
 */
export function fillTemplate(text, { url, name = "conector", format } = {}) {
  const quoted = (v) => (["json", "toml", "yaml"].includes(format) ? JSON.stringify(v).slice(1, -1) : v);
  return String(text || "")
    .split("{{URL}}").join(url)
    .split("{{NAME}}").join(name)
    .split("{{BRIDGE_PATH}}").join(quoted(BRIDGE_PATH))
    .split("{{NODE}}").join(quoted(NODE_PATH));
}
