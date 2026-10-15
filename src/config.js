// Runtime configuration, read once from environment variables (see .env.example). A local `.env` file is loaded too.
import fs from "node:fs";
import path from "node:path";

export const ROOT = path.resolve(import.meta.dirname, "..");
export const VERSION = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8")).version;

// Minimal .env support (KEY=value lines); real environment variables win.
const envFile = path.join(ROOT, ".env");
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (m && !line.trim().startsWith("#") && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, "$2");
  }
}

const env = process.env;
const port = Number(env.CONECTOR_PORT || env.PORT || 8790);
const host = env.CONECTOR_HOST || "127.0.0.1";
const publicUrl = (env.CONECTOR_PUBLIC_URL || `http://localhost:${port}`).replace(/\/+$/, "");
const publicParsed = new URL(publicUrl);
const publicHost = publicParsed.host;
// Behind a port mapping (Docker: -p 9000:8790) the browser uses the public port, not the one the server listens on.
const publicPort = Number(publicParsed.port || (publicParsed.protocol === "https:" ? 443 : 80));
const loopback = (p) => [`localhost:${p}`, `127.0.0.1:${p}`, `[::1]:${p}`];
const publicIsLocal = ["localhost", "127.0.0.1", "[::1]"].includes(publicParsed.hostname);

export const CONFIG = {
  port,
  host,
  publicUrl,
  publicHost,
  publicPort,
  publicIsLocal,
  https: publicUrl.startsWith("https://"),
  // HSTS covers every port of the host name: turn it off when the same name also serves plain-HTTP services.
  hsts: publicUrl.startsWith("https://") && env.CONECTOR_HSTS !== "0",
  dataDir: path.resolve(env.CONECTOR_DATA_DIR || path.join(ROOT, "data")),
  allowedHosts: new Set([publicHost, ...loopback(port), ...(publicIsLocal ? loopback(publicPort) : []),
    ...String(env.CONECTOR_ALLOWED_HOSTS || "").split(",").map((h) => h.trim()).filter(Boolean)]),
  trustProxy: env.CONECTOR_TRUST_PROXY === "1",
  sessionHours: Number(env.CONECTOR_SESSION_HOURS || 12),
};

export const LOGS_DIR = path.join(CONFIG.dataDir, "logs");
export const DOWNLOADS_DIR = path.join(CONFIG.dataDir, "downloads");
