// Generates public/logos/<id>.<ext> + index.json for every app, and public/agents/<id>.<ext> + index.json for every agent.
// Run it by hand after adding apps or agents (the server never downloads anything: the panel only serves local files).
//   node scripts/logos.mjs [--agents] [--force] [--simple-icons <dir>] [id …]
// Order: 1) own file in scripts/own-logos/<id>.svg; 2) Simple Icons (CC0): the glyph is redrawn on a tile in the brand
// colour; 3) the image in logo.image (or logo.github: the organization's GitHub avatar); 4) the official icon of the
// app's website (PNG/ICO/SVG, validated and sanitized); 5) a tile with the initials.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { ICONS } from "../src/ui/icons.js";

const ROOT = path.resolve(import.meta.dirname, "..");
const args = process.argv.slice(2);
const agents = args.includes("--agents");
const force = args.includes("--force");
const siArg = args.indexOf("--simple-icons");
const siDir = siArg >= 0 ? args[siArg + 1] : path.join(ROOT, "node_modules", "simple-icons");
const onlyIds = args.filter((a, i) => !a.startsWith("--") && args[i - 1] !== "--simple-icons");
const OUT = path.join(ROOT, "public", agents ? "agents" : "logos");
const OWN = path.join(ROOT, "scripts", "own-logos");
const QUARANTINE = fs.mkdtempSync(path.join(os.tmpdir(), "conector-logos-"));
const BROWSER = "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";

if (!fs.existsSync(path.join(siDir, "data", "simple-icons.json"))) {
  console.error("Simple Icons not found: run \"npm install\" (it is a dev dependency) or pass --simple-icons <dir>.");
  process.exit(2);
}

const items = agents
  ? JSON.parse(fs.readFileSync(path.join(ROOT, "src", "agents.json"), "utf8"))
  : (await import("../src/connectors.js")).CONNECTORS;
const icons = new Map(JSON.parse(fs.readFileSync(path.join(siDir, "data", "simple-icons.json"), "utf8")).map((i) => [i.slug, i]));
fs.mkdirSync(OUT, { recursive: true });
const indexFile = path.join(OUT, "index.json");
const index = fs.existsSync(indexFile) ? JSON.parse(fs.readFileSync(indexFile, "utf8")) : {};

const luminance = (hex) => {
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

function simpleIconsTile(slug) {
  const icon = icons.get(slug);
  if (!icon) return null;
  const svg = fs.readFileSync(path.join(siDir, "icons", `${slug}.svg`), "utf8");
  const d = /<path d="([^"]+)"/.exec(svg)?.[1];
  if (!d || !/^[MmLlHhVvCcSsQqTtAaZz0-9eE.,\s+-]+$/.test(d)) return null; // path data only, never the original SVG
  const background = `#${icon.hex}`;
  const glyph = luminance(icon.hex) > 0.5 ? "#111827" : "#ffffff";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" rx="11" fill="${background}"/>`
    + `<path transform="translate(12 12)" fill="${glyph}" d="${d}"/></svg>`;
}

const PALETTE = ["#4c1d95", "#5b21b6", "#3730a3", "#1e3a8a", "#0f766e", "#9d174d", "#7c2d12", "#374151"];
function initialsTile(item) {
  const initials = item.name.replace(/[^A-Za-z0-9 ]/g, "").split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase() || "?";
  const color = item.logo?.color || PALETTE[[...item.id].reduce((a, ch) => a + ch.charCodeAt(0), 0) % PALETTE.length];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" rx="11" fill="${color}"/>`
    + `<text x="24" y="30.5" text-anchor="middle" font-family="-apple-system,Segoe UI,Roboto,Arial,sans-serif" font-size="${initials.length > 1 ? 18 : 22}" `
    + `font-weight="700" fill="#ffffff">${initials}</text></svg>`;
}

// Fallback logo: a Phosphor glyph (MIT) on a dark tile.
const genericTile = (glyph) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" rx="11" fill="#1d1a26"/>`
  + `<g transform="translate(11 11) scale(0.1015625)" fill="#a594f9">${ICONS[glyph]}</g></svg>`;

function imageType(buf) {
  if (buf.length < 16) return null;
  if (buf[0] === 0x89 && buf.subarray(1, 4).toString() === "PNG") return "png";
  if (buf[0] === 0 && buf[1] === 0 && buf[2] === 1 && buf[3] === 0) return "ico";
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
  if (buf.subarray(0, 4).toString() === "RIFF" && buf.subarray(8, 12).toString() === "WEBP") return "webp";
  const text = buf.subarray(0, 600).toString("utf8").trimStart();
  if (/^(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*<svg[\s>]/i.test(text)) return "svg";
  return null;
}

// A downloaded SVG is only accepted without scripts, embedded objects or external references (the panel also serves
// logos with a sandbox CSP).
function safeSvg(text) {
  return !/<script|<foreignObject|<iframe|<embed|<object|javascript:|\bon[a-z]+\s*=|(?:xlink:)?href\s*=\s*["']\s*(?!#|data:image\/)/i.test(text);
}

async function download(url, limit = 400_000) {
  const r = await fetch(url, { headers: { "User-Agent": BROWSER, Accept: "*/*" }, redirect: "follow", signal: AbortSignal.timeout(20_000) });
  if (!r.ok) return null;
  const buf = Buffer.from(await r.arrayBuffer());
  return buf.length <= limit ? { buf, url: r.url } : null;
}

async function websiteIcon(site) {
  const page = await download(site, 3_000_000).catch(() => null);
  const candidates = [];
  if (page) {
    const markup = page.buf.toString("utf8");
    for (const tag of markup.match(/<link\b[^>]*>/gi) || []) {
      const attr = (n) => new RegExp(`\\b${n}\\s*=\\s*["']([^"']+)["']`, "i").exec(tag)?.[1];
      const rel = (attr("rel") || "").toLowerCase();
      const href = attr("href");
      if (!href || !/icon/.test(rel) || /mask-icon/.test(rel)) continue;
      const side = Math.max(0, ...(attr("sizes") || "").split(/\s+/).map((t) => parseInt(t, 10) || 0));
      const svg = /svg/i.test(attr("type") || "") || /\.svg(\?|$)/i.test(href);
      const score = (rel.includes("apple-touch-icon") ? 400 : 0) + (svg ? 350 : 0) + Math.min(side, 512);
      try {
        candidates.push({ url: new URL(href, page.url).href, score });
      } catch { /* invalid href */ }
    }
  }
  const origin = new URL(page?.url || site).origin;
  candidates.push({ url: `${origin}/apple-touch-icon.png`, score: 100 }, { url: `${origin}/favicon.svg`, score: 90 },
                  { url: `${origin}/favicon.ico`, score: 10 });
  for (const { url } of candidates.sort((a, b) => b.score - a.score)) {
    const d = await download(url).catch(() => null);
    const type = d && imageType(d.buf);
    if (!type) continue;
    if (type === "svg" && !safeSvg(d.buf.toString("utf8"))) continue;
    if (type === "ico" && d.buf.length < 1500) continue; // a 16 px favicon: the initials look better
    return { buf: d.buf, type, url };
  }
  return null;
}

function keep(item, buf, type, source) {
  const temp = path.join(QUARANTINE, `${item.id}.${type}`);
  fs.writeFileSync(temp, buf);
  fs.copyFileSync(temp, path.join(OUT, `${item.id}.${type}`));
  return { file: `${item.id}.${type}`, kind: "image", source };
}

async function process1(item) {
  for (const old of fs.readdirSync(OUT).filter((f) => f.startsWith(`${item.id}.`))) fs.rmSync(path.join(OUT, old));
  const logo = item.logo || {};
  let result = null;
  const own = path.join(OWN, logo.file || `${item.id}.svg`);
  if (fs.existsSync(own)) {
    fs.copyFileSync(own, path.join(OUT, `${item.id}.svg`));
    result = { file: `${item.id}.svg`, kind: "tile", source: "own" };
  }
  if (!result && logo.simpleIcons) {
    const svg = simpleIconsTile(logo.simpleIcons);
    if (svg) {
      fs.writeFileSync(path.join(OUT, `${item.id}.svg`), svg);
      result = { file: `${item.id}.svg`, kind: "tile", source: `simple-icons:${logo.simpleIcons}` };
    }
  }
  const image = logo.image || (logo.github && `https://github.com/${encodeURIComponent(logo.github)}.png?size=128`);
  if (!result && image) {
    const d = await download(image).catch(() => null);
    const type = d && imageType(d.buf);
    if (type && (type !== "svg" || safeSvg(d.buf.toString("utf8")))) result = keep(item, d.buf, type, d.url);
  }
  // logo.initials: true forces the initials tile (official icons that are white or unreadable on the panel's background).
  if (!result && !logo.initials && (logo.favicon || item.website)) {
    const icon = await websiteIcon(logo.favicon || item.website).catch(() => null);
    if (icon) result = keep(item, icon.buf, icon.type, icon.url);
  }
  if (!result) {
    fs.writeFileSync(path.join(OUT, `${item.id}.svg`), initialsTile(item));
    result = { file: `${item.id}.svg`, kind: "tile", source: "initials" };
  }
  index[item.id] = result;
  console.log(`${item.id.padEnd(22)} ${result.source}`);
}

const pending = items.filter((x) => (!onlyIds.length || onlyIds.includes(x.id))
  && (force || !index[x.id] || !fs.existsSync(path.join(OUT, index[x.id].file))));
// Several at a time: with a thousand apps, fetching icons one by one would take almost an hour.
const queue = [...pending];
await Promise.all(Array.from({ length: 8 }, async () => {
  while (queue.length) await process1(queue.shift());
}));

for (const id of Object.keys(index)) if (!items.some((x) => x.id === id)) delete index[id];
fs.writeFileSync(path.join(OUT, "_generic.svg"), genericTile(agents ? "robot" : "plugs-connected"));
fs.writeFileSync(indexFile, `${JSON.stringify(Object.fromEntries(Object.entries(index).sort(([a], [b]) => a.localeCompare(b))), null, 1)}\n`);
fs.rmSync(QUARANTINE, { recursive: true, force: true });
console.log(`\n${pending.length} logos generated; ${Object.keys(index).length} in the index.`);
