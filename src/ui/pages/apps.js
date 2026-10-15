// Apps: the catalog grid (tabs, search, categories) and the page of one app with its "Connect" card.
import { CATEGORIES } from "../../catalog/define.js";
import { ago, html, plural, raw, steps } from "../html.js";
import { icon } from "../icons.js";
import { appShell } from "../layout.js";
import { appLogo } from "../logos.js";

export const POPULAR = ["gmail", "github", "googlecalendar", "notion", "googlesheets", "slack", "googledrive", "microsoft365", "linear",
  "hubspot", "jira", "airtable"];
const oneClick = (c) => c.type === "oauth" || c.type === "mixed" || c.type === "device";
const authLabel = (c) => (c.type === "device" ? "Device sign-in" : c.type === "oauth" ? "Sign in" : c.type === "mixed" ? "Sign in or API key"
  : c.fields.filter((f) => !f.hidden).length ? "API key" : "No credentials");

function appCard(c, state, { searchable = false } = {}) {
  const attrs = searchable
    ? raw(` data-search="${[c.name, c.id, c.description, CATEGORIES[c.category]].join(" ").toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/"/g, "")}"`
      + ` data-category="${c.category}" data-connected="${state?.connected ? 1 : 0}" data-shared="${state?.shared ? 1 : 0}" data-oneclick="${oneClick(c) ? 1 : 0}"`)
    : "";
  return html`<a class="app-card" href="/apps/${c.id}"${attrs}>
    ${appLogo(c, 40)}
    <div class="body"><div class="name"><span>${c.name}</span>${oneClick(c) ? html`<span class="bolt" title="Connect by signing in">${raw(icon("lightning", 13))}</span>` : ""}</div>
      <div class="meta"><span class="desc">${c.description}</span></div></div>
    ${state?.connected ? html`<span class="connected-dot" title="Connected">${raw(icon("check-circle", 18))}</span>` : state?.error ? html`<span class="status is-danger" title="Connection error"></span>` : ""}
  </a>`;
}

export function appsPage({ session, apps, states, flash, catalogErrors }) {
  const counts = {
    all: apps.length,
    connected: apps.filter((c) => states[c.id]?.connected).length,
    shared: apps.filter((c) => states[c.id]?.shared).length,
    oneclick: apps.filter(oneClick).length,
  };
  const byId = new Map(apps.map((c) => [c.id, c]));
  const popular = POPULAR.map((id) => byId.get(id)).filter(Boolean).slice(0, 9);
  const featuredOneClick = ["notion", "slack", "hubspot", "dropbox", "salesforce", "zoom"].map((id) => byId.get(id)).filter(Boolean);
  const cats = Object.entries(CATEGORIES).map(([id, label]) => ({ id, label, n: apps.filter((c) => c.category === id).length }))
    .filter((x) => x.n).sort((a, b) => b.n - a.n);
  const tab = (id, label) => html`<button type="button" class="${id === "all" ? "is-active" : ""}" data-tab="${id}">${label} <span class="count">${counts[id].toLocaleString("en-US")}</span></button>`;
  return appShell({ title: "Apps", active: "apps", session, flash, wide: true, catalogErrors, content: html`
    <div class="page-head"><div><h1>Apps</h1><p>Connect an app once and every agent you add can use it. Apps marked with
      ${raw(icon("lightning", 13))} connect by signing in — no API keys.</p></div></div>
    <div data-apps data-page="60">
      <div class="apps-toolbar">
        <div class="segmented" role="tablist" aria-label="Filter apps">${tab("all", "All")}${tab("connected", "Connected")}${tab("shared", "Shared")}${tab("oneclick", "One-click")}</div>
        <label class="search-box">${raw(icon("magnifying-glass", 16))}<span class="sr-only">Search apps</span>
          <input type="search" data-app-search placeholder="Search ${apps.length.toLocaleString("en-US")} apps…" autocomplete="off" spellcheck="false"></label>
      </div>
      <div class="apps-layout">
        <div>
          <section class="section" data-hide-when-filtering>
            <div class="section-head"><h2>Popular</h2></div>
            <div class="app-grid">${popular.map((c) => appCard(c, states[c.id]))}</div>
          </section>
          ${featuredOneClick.length ? html`<section class="section" data-hide-when-filtering>
            <div class="section-head"><h2>${raw(icon("lightning", 16))} One-click</h2><span class="count">Sign in to connect</span></div>
            <div class="app-grid">${featuredOneClick.map((c) => appCard(c, states[c.id]))}</div>
          </section>` : ""}
          <section class="section" data-all-apps>
            <div class="section-head"><h2>All apps <span class="count" data-apps-count>${apps.length.toLocaleString("en-US")}</span></h2></div>
            <div class="app-grid">${apps.map((c) => appCard(c, states[c.id], { searchable: true }))}</div>
            <div class="empty" data-apps-empty hidden>${raw(icon("magnifying-glass", 28))}<h3>No apps match</h3>
              <p>Try another name, or clear the filters. Any API can be added with a small definition file.</p></div>
            <div class="more-row"><button type="button" class="btn" data-show-more hidden>Show more apps</button></div>
          </section>
        </div>
        <aside class="apps-side">
          <div class="card"><div class="card-head"><h3>Categories</h3></div>
            <ul class="cat-list"><li><button type="button" class="is-active" data-category="">All apps <span class="count">${apps.length.toLocaleString("en-US")}</span></button></li>
              ${cats.map((x) => html`<li><button type="button" data-category="${x.id}">${x.label} <span class="count">${x.n}</span></button></li>`)}</ul></div>
          <div class="card card-pad"><h3>Missing an app?</h3><p class="help mt-6">Every app comes with a generic API tool, and new apps are a short
            definition file away. See <code>docs/ADDING_APPS.md</code>.</p></div>
        </aside>
      </div>
    </div>` });
}

// ---------------------------------------------------------------- one app

function fieldInput(f, saved) {
  const value = f.secret ? "" : (saved ?? f.default ?? "");
  const placeholder = f.secret && saved ? "•••••••• (saved — leave empty to keep it)" : (f.placeholder || f.example || "");
  const control = f.options
    ? html`<select name="${f.id}">${f.options.map(([v, t]) => html`<option value="${v}"${v === value ? raw(" selected") : ""}>${t}</option>`)}</select>`
    : html`<input name="${f.id}" ${raw(f.secret ? 'type="password" autocomplete="off"' : 'type="text" autocomplete="off"')} value="${value}" placeholder="${placeholder}" spellcheck="false">`;
  return html`<label class="field"><span>${f.label}${f.optional ? html` <small>(optional)</small>` : ""}</span>${control}${f.help ? html`<span class="field-help">${f.help}</span>` : ""}</label>`;
}

function scopePicker(canShare, current) {
  if (!canShare) return html`<input type="hidden" name="scope" value="personal">`;
  return html`<div class="field"><span>Who can use this connection?</span>
    <div class="segmented"><label><input type="radio" name="scope" value="personal"${current !== "shared" ? raw(" checked") : ""}>${raw(icon("user-circle", 15))} Only me</label>
      <label><input type="radio" name="scope" value="shared"${current === "shared" ? raw(" checked") : ""}>${raw(icon("users-three", 15))} Everyone in the workspace</label></div>
    <span class="field-help">Shared connections are used by every member who hasn't connected their own account.</span></div>`;
}

export function appPage({ session, c, state, oauthApp, flow, savedFields = {}, flash, canShare, needsHttps, catalogErrors }) {
  const csrf = html`<input type="hidden" name="csrf" value="${session.csrf}">`;
  const isAdmin = session.user.role === "admin";
  const connected = state.connected;
  const parts = [];

  if (connected) {
    const test = state.test;
    parts.push(html`<div class="connection-status">
      <div><span class="status ${test?.ok === false ? "is-danger" : "is-ok"}">${test?.ok === false ? "Connection error" : "Connected"}</span>
        <p class="faint mt-4 text-sm">${state.scope === "shared" ? "Shared with the workspace" : "Only you"}${state.account ? html` · ${state.account}` : ""}${test?.at ? html` · tested ${ago(test.at)}` : ""}</p>
        ${test?.ok === false ? html`<p class="help mt-6">${test.message}</p>` : ""}</div>
      <div class="row">
        <form method="post" action="/apps/${c.id}/test">${csrf}<input type="hidden" name="scope" value="${state.scope === "shared" ? "shared" : "personal"}"><button class="btn btn-sm">${raw(icon("arrows-clockwise", 14))} Test</button></form>
        ${state.scope !== "shared" || isAdmin ? html`<form method="post" action="/apps/${c.id}/disconnect" data-confirm="Disconnect ${c.name}? Its credentials will be deleted.">${csrf}
          <input type="hidden" name="scope" value="${state.scope === "shared" ? "shared" : "personal"}"><button class="btn btn-sm btn-danger">Disconnect</button></form>` : ""}
      </div></div>`);
    if (state.scope === "shared" && !isAdmin) {
      parts.push(html`<div class="notice is-info">${raw(icon("users-three", 16))}<span>You're using the workspace's shared connection. Connect your own
        account below to use it instead.</span></div>`);
    }
  }

  if (c.type === "device") {
    const waiting = flow?.status === "waiting";
    parts.push(waiting
      ? html`<div class="stack" data-device-flow data-scope="${flow.scopeKey}">
          <p class="help">1. Open <a href="${flow.url}" target="_blank" rel="noopener">${flow.url}</a> &nbsp;2. Enter this code &nbsp;3. Sign in and accept the permissions.</p>
          <div class="device-code" id="device-code">${flow.code}</div>
          <div class="row"><button type="button" class="btn btn-sm" data-copy="device-code">${raw(icon("copy", 14))} <span class="copy-label">Copy code</span></button>
            <a class="btn btn-sm" href="${flow.url}" target="_blank" rel="noopener">Open Microsoft ${raw(icon("arrow-up-right", 14))}</a></div>
          <p class="faint" data-device-status>Waiting for you to approve the sign-in…</p></div>`
      : html`<form method="post" action="/apps/microsoft365/device" class="stack">${csrf}
          ${flow?.status === "error" ? html`<div class="notice is-error">${raw(icon("warning-circle", 16))}<span>Couldn't connect: ${flow.error}</span></div>` : ""}
          ${flow?.status === "expired" ? html`<div class="notice is-warn">${raw(icon("warning-circle", 16))}<span>The code expired. Try again.</span></div>` : ""}
          ${scopePicker(canShare, state.scope)}
          <button class="btn btn-primary btn-lg btn-block">${connected ? "Reconnect with Microsoft" : "Connect with Microsoft"}</button>
          <details class="disclosure"><summary>${raw(icon("caret-right", 14))} Advanced options</summary><div class="disclosure-body stack">${c.fields.map((f) => fieldInput(f, savedFields[f.id]))}</div></details>
        </form>`);
  } else {
    if (c.oauth) {
      const provider = c.oauth.provider.name;
      const pre = c.oauthFields.filter((f) => !f.hidden);
      const registered = oauthApp?.registered;
      if (needsHttps) {
        parts.push(html`<div class="notice is-warn">${raw(icon("lock-simple", 16))}<span>${provider} only accepts https:// redirect URIs. Set
          <code>CONECTOR_PUBLIC_URL</code> to an https address to enable “Continue with ${provider}”.</span></div>`);
      } else if (!registered && !isAdmin) {
        parts.push(html`<div class="notice is-info">${raw(icon("info", 16))}<span>An admin has to register the ${provider} OAuth app once before
          anyone can sign in with ${provider}.</span></div>`);
      } else {
        parts.push(html`<form method="post" action="/apps/${c.id}/connect" class="stack">${csrf}
          ${pre.map((f) => fieldInput(f, savedFields[f.id]))}
          ${scopePicker(canShare, state.scope)}
          <button class="btn btn-primary btn-lg btn-block">${connected && state.method === "oauth" ? `Reconnect with ${provider}` : `Continue with ${provider}`}</button>
          <p class="faint text-sm text-center">You'll sign in on ${provider} and approve access. Conector never sees your password.
            ${!registered ? html`First time: you'll register the ${provider} OAuth app (one step for all its apps).` : ""}</p>
        </form>`);
      }
      if (c.oauthHelp) parts.push(html`<details class="disclosure"><summary>${raw(icon("caret-right", 14))} Notes about signing in</summary><div class="disclosure-body">${steps(c.oauthHelp)}</div></details>`);
    }
    if (c.type !== "oauth") {
      const visible = c.fields.filter((f) => !f.hidden);
      const viaKey = connected && state.method !== "oauth";
      const label = !visible.length ? (state.exists ? "Test again" : "Enable") : viaKey ? "Save and test" : "Connect";
      const form = html`<form method="post" action="/apps/${c.id}/save" class="stack">${csrf}
        ${visible.length ? visible.map((f) => fieldInput(f, savedFields[f.id])) : html`<p class="help">No credentials needed: this is a public API.</p>`}
        ${c.oauth ? "" : scopePicker(canShare, state.scope)}
        <div class="form-actions"><button class="btn ${c.oauth ? "" : "btn-primary"}">${label}</button>
          ${c.keyUrl ? html`<a class="btn btn-ghost" href="${c.keyUrl}" target="_blank" rel="noopener">Get your key ${raw(icon("arrow-up-right", 14))}</a>` : ""}</div>
      </form>`;
      const help = c.help ? html`<details class="disclosure"${viaKey ? "" : raw(" open")}><summary>${raw(icon("caret-right", 14))} Where do I find ${visible.some((f) => f.secret) ? "the key" : "these details"}?</summary>
        <div class="disclosure-body">${steps(c.help)}</div></details>` : "";
      if (c.oauth) parts.push(html`<div class="divider">or use an API key</div><details class="disclosure"${viaKey ? raw(" open") : ""}><summary>${raw(icon("caret-right", 14))} Connect with an API key</summary>
        <div class="disclosure-body stack">${help}${form}</div></details>`);
      else parts.push(html`${help}${form}`);
    }
  }

  const tools = c.tools.map((t) => html`<li><code>${t.name}</code><p>${String(t.description).split(". ")[0]}</p></li>`);
  return appShell({ title: c.name, active: "apps", session, flash, catalogErrors, content: html`
    <nav class="breadcrumb" aria-label="Breadcrumb"><a href="/apps">Apps</a>${raw(icon("caret-right", 12))}<span>${c.name}</span></nav>
    <div class="app-hero">${appLogo(c, 56, "is-lg")}<div><h1>${c.name}</h1><p>${c.description}</p>
      <div class="row mt-10"><span class="chip">${CATEGORIES[c.category] || c.category}</span>
        <span class="chip ${c.type === "key" ? "" : "is-accent"}">${c.type === "key" ? "" : raw(icon("lightning", 12))}${authLabel(c)}</span>
        ${state.shared ? html`<span class="chip is-ok">${raw(icon("users-three", 12))} Shared connection</span>` : ""}</div></div></div>
    <div class="app-layout">
      <section class="card connect-card" aria-labelledby="connect-title">
        <div class="connect-visual"><span class="mark"><img src="/assets/brand/conector-mark.png" alt="" width="34" height="24"></span><span class="wire"></span>${appLogo(c, 56, "is-lg")}</div>
        <div class="connect-title"><h2 id="connect-title">${connected ? `${c.name} is connected` : `Connect ${c.name}`}</h2>
          <p>${connected ? "Your agents can use it through Conector." : "Credentials are encrypted and stay on your Conector server."}</p></div>
        <div class="connect-body">${parts}</div>
      </section>
      <div class="stack">
        <div class="card"><div class="card-head"><h3>Details</h3></div><ul class="meta-list">
          <li>Category <b>${CATEGORIES[c.category] || c.category}</b></li>
          <li>Authentication <b>${authLabel(c)}</b></li>
          <li>Tools <b>${c.tools.length}</b></li>
          ${c.website ? html`<li>Website <b><a href="${c.website}" target="_blank" rel="noopener">${new URL(c.website).host.replace(/^www\./, "")} ${raw(icon("arrow-up-right", 12))}</a></b></li>` : ""}
          ${c.docs ? html`<li>API docs <b><a href="${c.docs}" target="_blank" rel="noopener">Open ${raw(icon("arrow-up-right", 12))}</a></b></li>` : ""}
          ${isAdmin && c.oauth ? html`<li>OAuth app <b><a href="/oauth-apps/${encodeURIComponent(c.oauth.key)}">${oauthApp?.registered ? "Registered" : "Not registered"}</a></b></li>` : ""}
        </ul></div>
        <div class="card"><div class="card-head"><h3>Tools for agents</h3><span class="count">${plural(c.tools.length, "tool")}</span></div>
          <ul class="tool-list">${tools}</ul></div>
        <a class="card card-pad row-between" href="/agents"><span><b>Use it from an agent</b><br><small>Claude, Codex, Cursor, Gemini CLI and more</small></span>${raw(icon("arrow-up-right", 16))}</a>
      </div>
    </div>` });
}
