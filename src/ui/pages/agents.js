// "Connect agents": every supported MCP client with its exact command or config snippet. Each card opens a drawer
// (rendered from a <template>) where the user creates a token that is filled into the snippets in the browser.
import { POPULAR_AGENTS, fillTemplate } from "../../agents.js";
import { html, inlineCode, raw } from "../html.js";
import { icon } from "../icons.js";
import { appShell } from "../layout.js";
import { agentLogo } from "../logos.js";

const KIND = { cli: "CLI", ide: "Editor", desktop: "Desktop app", web: "Web app" };
const OS = { macos: "macOS", linux: "Linux", windows: "Windows" };
const PLACEHOLDER = "YOUR_CONECTOR_TOKEN";

function codeBlock(id, template, ctx) {
  const filled = fillTemplate(template, ctx);
  return html`<div class="code"><pre id="${id}" data-template="${filled}">${filled.split("{{TOKEN}}").join(PLACEHOLDER)}</pre>
    <button type="button" class="btn btn-sm copy" data-copy="${id}">${raw(icon("copy", 14))} <span class="copy-label">Copy</span></button></div>`;
}

function methodBlock(a, m, i, ctx) {
  const id = `${a.id}-m${i}`;
  if (m.kind === "command") {
    return html`<div class="code-label"><b>${m.title}</b><span class="chip">${raw(icon("terminal-window", 12))} Terminal</span></div>${codeBlock(id, m.command, ctx)}`;
  }
  if (m.kind === "steps") {
    return html`<div class="code-label"><b>${m.title}</b><span class="chip">${raw(icon("globe", 12))} In the app</span></div>
      <ol class="steps">${m.steps.map((s) => html`<li>${s}</li>`)}</ol>
      ${(m.values || []).map((v, k) => html`<p class="help mt-10">${v.label}</p><div class="mt-6">${codeBlock(`${id}-v${k}`, v.value, ctx)}</div>`)}`;
  }
  // One entry per distinct path ("macOS, Linux: ~/.x/mcp.json · Windows: %USERPROFILE%\.x\mcp.json").
  const byPath = new Map();
  for (const [os, p] of Object.entries(m.path || {})) if (p) byPath.set(p, [...(byPath.get(p) || []), OS[os] || os]);
  const paths = [...byPath];
  return html`<div class="code-label"><b>${m.title}</b><span class="chip">${(m.format || "json").toUpperCase()}</span></div>
    ${paths.length ? html`<p class="help">${paths.length === 1 ? html`File: <code>${paths[0][0]}</code>` : paths.map(([p, systems], k) => html`${k ? " · " : ""}${systems.join(", ")}: <code>${p}</code>`)}</p>` : ""}
    <div class="mt-6">${codeBlock(id, m.snippet, { ...ctx, format: m.format })}</div>`;
}

function drawerTemplate(a, ctx) {
  const methods = a.methods || [];
  return html`<template id="agent-${a.id}">
    <div class="drawer-head">${agentLogo(a, 40)}<div class="grow"><h2>${a.name}</h2><small>${a.vendor || ""}${a.kind ? ` · ${KIND[a.kind] || a.kind}` : ""}</small></div>
      <button type="button" class="icon-button" data-close-drawer aria-label="Close">${raw(icon("x", 18))}</button></div>
    <div class="drawer-body">
      <h3>1. Create an access token</h3>
      <div class="stack mt-10" data-token-step>
        <p class="help">${a.name} authenticates with a personal access token. The new token can use all your apps; you can limit or revoke it in Access tokens.</p>
        <div class="row"><button type="button" class="btn btn-primary" data-create-token data-name="${a.name}">${raw(icon("key", 15))} Create a token for ${a.name}</button></div>
        <div class="stack" data-token-box hidden>
          <div class="notice is-ok">${raw(icon("check-circle", 16))}<span>Token created and filled in below. Copy it now if you need it elsewhere — it won't be shown again.</span></div>
          <div class="code"><pre class="secret-once"></pre><button type="button" class="btn btn-sm copy" data-copy>${raw(icon("copy", 14))} <span class="copy-label">Copy</span></button></div>
        </div>
        <label class="field"><span>…or paste a token you already have</span><input type="password" data-use-token placeholder="cnr_…" autocomplete="off"></label>
      </div>
      <h3 class="mt-24">2. Add Conector to ${a.name}</h3>
      ${methods.length ? methods.map((m, i) => methodBlock(a, m, i, ctx)) : html`<div class="notice is-warn mt-10">${raw(icon("info", 16))}<span>${a.name} has no documented way to add a
        remote MCP server with a token. ${inlineCode(a.notes)}</span></div>`}
      ${a.verify ? html`<h3 class="mt-24">3. Check it works</h3><p class="help mt-6">${inlineCode(a.verify)}</p>` : ""}
      ${a.notes && methods.length ? html`<details class="disclosure mt-16"><summary>${raw(icon("caret-right", 14))} Notes</summary><div class="disclosure-body"><p class="help">${inlineCode(a.notes)}</p></div></details>` : ""}
      <div class="row mt-24">${a.mcpDocs ? html`<a class="btn btn-sm" href="${a.mcpDocs}" target="_blank" rel="noopener">${a.name} MCP docs ${raw(icon("arrow-up-right", 13))}</a>` : ""}
        ${a.website ? html`<a class="btn btn-sm btn-ghost" href="${a.website}" target="_blank" rel="noopener">Website ${raw(icon("arrow-up-right", 13))}</a>` : ""}</div>
    </div>
  </template>`;
}

export function agentsPage({ session, agents, mcpUrl, flash, catalogErrors }) {
  const ctx = { url: mcpUrl, name: "conector" };
  const popular = new Set(POPULAR_AGENTS);
  const ordered = [...agents].sort((x, y) => (popular.has(y.id) - popular.has(x.id)) || (POPULAR_AGENTS.indexOf(x.id) - POPULAR_AGENTS.indexOf(y.id))
    || x.name.localeCompare(y.name, "en"));
  const kinds = [...new Set(agents.map((a) => a.kind).filter(Boolean))];
  const card = (a) => html`<article class="agent-card" data-search="${`${a.name} ${a.vendor || ""} ${a.id}`.toLowerCase()}" data-kind="${a.kind || ""}" data-popular="${popular.has(a.id) ? 1 : 0}">
      ${agentLogo(a, 40)}
      <div class="body"><div class="name">${a.name}</div>
        <div class="chips">${a.kind ? html`<span class="chip">${KIND[a.kind] || a.kind}</span>` : ""}
          ${a.remoteHttp ? html`<span class="chip is-accent">HTTP</span>` : a.stdio ? html`<span class="chip">stdio bridge</span>` : html`<span class="chip is-warn">Limited</span>`}</div>
        <div class="links">${a.mcpDocs || a.website ? html`<a href="${a.mcpDocs || a.website}" target="_blank" rel="noopener">Install guide ${raw(icon("arrow-up-right", 12))}</a>` : ""}</div></div>
      <button type="button" class="btn btn-sm" data-agent-open="${a.id}">${raw(icon("plus", 13))} Add</button>
    </article>`;
  return appShell({ title: "Connect agents", active: "agents", session, flash, wide: true, catalogErrors, content: html`
    <div class="page-head"><div><h1>Connect an agent</h1><p>Conector is one MCP server for all your apps. Pick your agent to get the exact command or
      config file, with a token for your account filled in.</p></div></div>
    <section class="card card-pad">
      <div class="row-between"><div><h2>Your MCP endpoint</h2><p class="help mt-6">Streamable HTTP with the header <code>Authorization: Bearer &lt;token&gt;</code>.
        Agents that only run local servers use the bundled stdio bridge.</p></div></div>
      <div class="endpoint mt-16"><code id="endpoint">${mcpUrl}</code><button type="button" class="btn btn-sm" data-copy="endpoint">${raw(icon("copy", 14))} <span class="copy-label">Copy</span></button></div>
    </section>
    <div data-agents class="section">
      <div class="apps-toolbar">
        <div class="segmented" role="tablist" aria-label="Filter agents"><button type="button" class="is-active" data-kind="all">All <span class="count">${agents.length}</span></button>
          <button type="button" data-kind="popular">Popular</button>${kinds.map((k) => html`<button type="button" data-kind="${k}">${KIND[k] || k}</button>`)}</div>
        <label class="search-box">${raw(icon("magnifying-glass", 16))}<span class="sr-only">Search agents</span><input type="search" data-agent-search placeholder="Search agents…" autocomplete="off"></label>
      </div>
      <div class="agent-grid mt-16">${ordered.map(card)}</div>
      <div class="empty" data-agents-empty hidden>${raw(icon("robot", 28))}<h3>No agents match</h3><p>Any MCP client works: use the endpoint above with a token.</p></div>
    </div>
    ${ordered.map((a) => drawerTemplate(a, ctx))}` });
}
