// Personal pages: access tokens for agents and account settings.
import { MIN_PASSWORD } from "../../auth.js";
import { CONFIG, VERSION } from "../../config.js";
import { ago, fmtDate, html, raw } from "../html.js";
import { icon } from "../icons.js";
import { appShell } from "../layout.js";

const appNames = (apps, ids) => (ids.includes("*") ? "All apps" : ids.map((x) => apps.find((c) => c.id === x)?.name || x).join(", "));

export function tokensPage({ session, tokens, workspaceTokens = null, users = [], apps, connectedIds, created, flash, catalogErrors }) {
  const csrf = html`<input type="hidden" name="csrf" value="${session.csrf}">`;
  const option = (c) => html`<label class="check"><input type="checkbox" name="apps" value="${c.id}"${connectedIds.includes(c.id) ? raw(" checked") : ""}>${c.name}</label>`;
  const row = (t, owner = false) => html`<tr><td><b>${t.name}</b></td>${owner ? html`<td>${users.find((u) => u.id === t.userId)?.email || "—"}</td>` : ""}
    <td>${appNames(apps, t.apps)}</td><td>${fmtDate(t.createdAt)}</td><td>${ago(t.lastUsedAt)}</td>
    <td class="num"><form method="post" action="/tokens/${t.id}/revoke" data-confirm="Revoke “${t.name}”? Agents using it will stop working.">${csrf}<button class="btn btn-sm btn-danger">Revoke</button></form></td></tr>`;
  return appShell({ title: "Access tokens", active: "tokens", session, flash, catalogErrors, content: html`
    <div class="page-head"><div><h1>Access tokens</h1><p>Agents authenticate with a token. Use one per agent or device so you can limit what it reaches and
      revoke it on its own. Tokens act as you: they use your personal connections and the workspace's shared ones.</p></div>
      <a class="btn" href="/agents">${raw(icon("robot", 15))} Connect an agent</a></div>
    ${created ? html`<section class="card card-pad secret-once">
      <div class="notice is-ok">${raw(icon("check-circle", 16))}<span><b>Token “${created.name}” created.</b> Copy it now — it won't be shown again.</span></div>
      <div class="code mt-16"><pre id="new-token">${created.token}</pre><button type="button" class="btn btn-sm copy" data-copy="new-token">${raw(icon("copy", 14))} <span class="copy-label">Copy</span></button></div>
      <div class="form-actions"><a class="btn btn-primary" href="/agents">Set up an agent with it</a></div></section>` : ""}
    <div class="grid-2 mt-24">
      <section class="card">
        <div class="card-head"><h2>Your tokens</h2><span class="count">${tokens.length}</span></div>
        ${tokens.length ? html`<div class="table-wrap"><table><thead><tr><th>Name</th><th>Apps</th><th>Created</th><th>Last used</th><th></th></tr></thead>
          <tbody>${tokens.map((t) => row(t))}</tbody></table></div>`
          : html`<div class="empty">${raw(icon("key", 26))}<h3>No tokens yet</h3><p>Create one, or let “Connect agents” create it for you.</p></div>`}
      </section>
      <section class="card">
        <div class="card-head"><h2>Create a token</h2></div>
        <form method="post" action="/tokens" class="card-body stack">${csrf}
          <label class="field"><span>Name</span><input name="name" required maxlength="60" placeholder="e.g. Claude Code on my laptop"></label>
          <label class="check"><input type="checkbox" id="token-all" name="all" value="1" checked><span>All apps, including apps connected later</span></label>
          <fieldset id="token-apps" class="stack"><legend class="field-help">Only these apps</legend>
            ${apps.filter((c) => connectedIds.includes(c.id)).map(option)}
            ${connectedIds.length ? "" : html`<p class="help">Connect an app first, or keep “All apps”.</p>`}</fieldset>
          <div class="form-actions"><button class="btn btn-primary">${raw(icon("plus", 14))} Create token</button></div>
        </form>
      </section>
    </div>
    ${workspaceTokens && users.length > 1 ? html`<section class="card section">
      <div class="card-head"><h2>All tokens in the workspace</h2><span class="count">${workspaceTokens.length}</span></div>
      ${workspaceTokens.length ? html`<div class="table-wrap"><table><thead><tr><th>Name</th><th>Owner</th><th>Apps</th><th>Created</th><th>Last used</th><th></th></tr></thead>
        <tbody>${workspaceTokens.map((t) => row(t, true))}</tbody></table></div>` : html`<div class="empty"><p>No tokens yet.</p></div>`}
    </section>` : ""}` });
}

export function settingsPage({ session, mcpUrl, flash, catalogErrors }) {
  const csrf = html`<input type="hidden" name="csrf" value="${session.csrf}">`;
  const u = session.user;
  return appShell({ title: "Settings", active: "settings", session, flash, catalogErrors, content: html`
    <div class="page-head"><div><h1>Settings</h1><p>Your profile and how this Conector server is reached.</p></div></div>
    <div class="grid-2">
      <div class="stack">
        <section class="card"><div class="card-head"><h2>Profile</h2><span class="chip ${u.role === "admin" ? "is-accent" : ""}">${u.role}</span></div>
          <form method="post" action="/settings/profile" class="card-body">${csrf}
            <label class="field"><span>Name</span><input name="name" value="${u.name}" maxlength="80" required></label>
            <label class="field"><span>E-mail</span><input value="${u.email}" disabled></label>
            <div class="form-actions"><button class="btn">Save</button></div></form></section>
        <section class="card"><div class="card-head"><h2>Password</h2></div>
          <form method="post" action="/settings/password" class="card-body">${csrf}
            <label class="field"><span>Current password</span><input type="password" name="current" required autocomplete="current-password"></label>
            <label class="field"><span>New password <small>(at least ${MIN_PASSWORD} characters)</small></span><input type="password" name="password" required minlength="${MIN_PASSWORD}" autocomplete="new-password"></label>
            <label class="field"><span>Repeat the new password</span><input type="password" name="password2" required minlength="${MIN_PASSWORD}" autocomplete="new-password"></label>
            <div class="form-actions"><button class="btn">Change password</button></div></form></section>
      </div>
      <section class="card"><div class="card-head"><h2>Server</h2></div><ul class="meta-list">
        <li>Version <b>${VERSION}</b></li>
        <li>Public URL <b>${CONFIG.publicUrl}</b></li>
        <li>MCP endpoint <b><code>${mcpUrl}</code></b></li>
        <li>OAuth redirect URI <b><code>${CONFIG.publicIsLocal ? `http://127.0.0.1:${CONFIG.publicPort}` : CONFIG.publicUrl}/oauth/callback</code></b></li>
        <li>HTTPS <b>${CONFIG.https ? "Yes" : "No — some providers need https://"}</b></li>
        ${u.role === "admin" ? html`<li>Data directory <b><code>${CONFIG.dataDir}</code></b></li>` : ""}
      </ul><div class="card-foot"><p class="help">Change these with the environment variables in <code>.env.example</code> (e.g. <code>CONECTOR_PUBLIC_URL</code>).</p></div></section>
    </div>` });
}
