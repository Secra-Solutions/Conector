// Tiny HTML helpers. Everything dynamic goes through esc(); the `html` tag escapes interpolations unless wrapped in raw().
const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ESC[c]);

const RAW = Symbol("raw");
export const raw = (s) => ({ [RAW]: String(s ?? "") });

const part = (v) => {
  if (v === null || v === undefined || v === false) return "";
  if (Array.isArray(v)) return v.map(part).join("");
  if (typeof v === "object" && RAW in v) return v[RAW];
  return esc(v);
};

/** html`<p>${value}</p>` — interpolations are escaped; arrays are joined; raw() and nested html`` pass through. */
export function html(strings, ...values) {
  let out = strings[0];
  values.forEach((v, i) => {
    out += part(v) + strings[i + 1];
  });
  return raw(out);
}

export const render = (v) => part(v);

export const fmtDate = (iso) => (iso ? new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "—");

export function ago(iso) {
  if (!iso) return "never";
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  const units = [[60, "minute"], [24, "hour"], [30, "day"], [12, "month"], [Infinity, "year"]];
  let n = s / 60;
  for (const [step, unit] of units) {
    if (n < step) return `${Math.floor(n)} ${unit}${Math.floor(n) === 1 ? "" : "s"} ago`;
    n /= step;
  }
  return fmtDate(iso);
}

export const initials = (name) => String(name || "?").trim().split(/[\s@._-]+/).filter(Boolean).slice(0, 2)
  .map((w) => w[0].toUpperCase()).join("") || "?";

export const plural = (n, one, many = `${one}s`) => `${n.toLocaleString("en-US")} ${n === 1 ? one : many}`;

/** "1) Do this 2) Then that. Note." → an intro paragraph, an ordered list and a trailing note. */
export function steps(text) {
  const parts = String(text || "").split(/\s*\b\d\)\s+/);
  if (parts.length < 3) return text ? html`<p class="help">${text}</p>` : "";
  const [intro, ...list] = parts;
  const last = list.pop();
  const tail = /\.\s+(?=[A-Z“"])/.exec(last); // text after the last step
  const finalStep = tail ? last.slice(0, tail.index + 1) : last;
  const note = tail ? last.slice(tail.index + 1).trim() : "";
  return html`${intro.trim() ? html`<p class="help">${intro.trim()}</p>` : ""}<ol class="steps">${[...list, finalStep].map((p) => html`<li>${p.trim()}</li>`)}</ol>${note ? html`<p class="help">${note}</p>` : ""}`;
}

/** Text with `backticks` (agent install notes) rendered as inline <code>. */
export function inlineCode(text) {
  return String(text || "").split("`").map((part, i) => (i % 2 ? html`<code>${part}</code>` : html`${part}`));
}
