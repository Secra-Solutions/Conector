// Admin pages: users and invitations, OAuth apps (one per provider) and the audit log.
import { ago, fmtDate, html, initials, raw, steps } from "../html.js";
import { icon } from "../icons.js";
import { appShell } from "../layout.js";
import { appLogo } from "../logos.js";

export function usersPage({ session, users, invites, inviteLink, resetLink, flash, catalogErrors }) {
  const csrf = html`<input type="hidden" name="csrf" value="${session.csrf}">`;
  const me = session.user.id;
  const linkCard = (title, text, link) => html`<section class="card card-pad secret-once">
    <div class="notice is-ok">${raw(icon("check-circle", 16))}<span><b>${title}</b> ${text}</span></div>
    <div class="code mt-16"><pre id="one-time-link">${link}</pre><button type="button" class="btn btn-sm copy" data-copy="one-time-link">${raw(icon("copy", 14))} <span class="copy-label">Copy</span></button></div></section>`;
  const row = (u) => html`<tr>
    <td><div class="cell-user"><span class="avatar" aria-hidden="true">${initials(u.name || u.email)}</span><div><b>${u.name}${u.id === me ? " (you)" : ""}</b><small>${u.email}</small></div></div></td>
    <td><form method="post" action="/users/${u.id}/role" class="row role-form">${csrf}<select name="role" aria-label="Role for ${u.email}">
      <option value="member"${u.role === "member" ? raw(" selected") : ""}>Member</option><option value="admin"${u.role === "admin" ? raw(" selected") : ""}>Admin</option></select>
      <button class="btn btn-sm">Save</button></form></td>
    <td>${u.disabledAt ? html`<span class="status is-warn">Disabled</span>` : html`<span class="status is-ok">Active</span>`}</td>
    <td>${ago(u.lastLoginAt)}</td>
    <td class="num"><div class="row is-end">
      <form method="post" action="/users/${u.id}/reset">${csrf}<button class="btn btn-sm" title="Create a password reset link">${raw(icon("link", 13))} Reset link</button></form>
      ${u.id === me ? "" : html`<form method="post" action="/users/${u.id}/${u.disabledAt ? "enable" : "disable"}">${csrf}<button class="btn btn-sm">${u.disabledAt ? "Enable" : "Disable"}</button></form>
        <form method="post" action="/users/${u.id}/delete" data-confirm="Delete ${u.email}? Their tokens and personal connections are deleted too.">${csrf}<button class="btn btn-sm btn-danger">Delete</button></form>`}
    </div></td></tr>`;
  return appShell({ title: "Users", active: "users", session, flash, catalogErrors, content: html`
    <div class="page-head"><div><h1>Users</h1><p>Admins manage users, OAuth apps and shared connections. Members connect their own apps and use the
      shared ones. Invitations are links you send yourself — Conector doesn't send e-mail.</p></div></div>
    ${inviteLink ? linkCard("Invitation link created.", "Send it to the person you invited. It works once and expires in 7 days.", inviteLink) : ""}
    ${resetLink ? linkCard("Password reset link created.", "Send it to the user. It works once and expires in 24 hours.", resetLink) : ""}
    <div class="grid-2 mt-24">
      <section class="card"><div class="card-head"><h2>Members</h2><span class="count">${users.length}</span></div>
        <div class="table-wrap"><table><thead><tr><th>User</th><th>Role</th><th>Status</th><th>Last sign-in</th><th></th></tr></thead><tbody>${users.map(row)}</tbody></table></div></section>
      <div class="stack">
        <section class="card"><div class="card-head"><h2>Invite someone</h2></div>
          <form method="post" action="/users/invite" class="card-body">${csrf}
            <label class="field"><span>E-mail</span><input type="email" name="email" required autocomplete="off"></label>
            <label class="field"><span>Role</span><select name="role"><option value="member">Member</option><option value="admin">Admin</option></select></label>
            <div class="form-actions"><button class="btn btn-primary">${raw(icon("link", 14))} Create invitation link</button></div></form></section>
        <section class="card"><div class="card-head"><h2>Pending invitations</h2><span class="count">${invites.length}</span></div>
          ${invites.length ? html`<ul class="list">${invites.map((i) => html`<li><span class="list-title">${i.email}<small>${i.role} · expires ${fmtDate(new Date(i.expiresAt).toISOString())}</small></span>
            <form method="post" action="/invites/${i.id}/revoke">${csrf}<button class="btn btn-sm">Revoke</button></form></li>`)}</ul>`
            : html`<div class="empty"><p>No pending invitations.</p></div>`}</section>
      </div>
    </div>` });
}

export function oauthAppsPage({ session, apps, flash, catalogErrors }) {
  const done = apps.filter((a) => a.registered).length;
  return appShell({ title: "OAuth apps", active: "oauth", session, flash, catalogErrors, content: html`
    <div class="page-head"><div><h1>OAuth apps</h1><p>For “Continue with Google”-style one-click connections, Conector needs its own OAuth app at each
      provider. Register it once per provider; all of the provider's apps share it. <b>${done}</b> of ${apps.length} registered.</p></div></div>
    <div class="app-grid">${apps.map((a) => html`<a class="app-card" href="/oauth-apps/${encodeURIComponent(a.key)}">${appLogo(a.connectors[0], 40)}
      <div class="body"><div class="name"><span>${a.provider.name}</span></div><div class="meta"><span class="desc">${a.connectors.map((c) => c.name).join(", ")}</span></div></div>
      ${a.registered ? html`<span class="connected-dot" title="Registered">${raw(icon("check-circle", 18))}</span>` : ""}</a>`)}</div>` });
}

export function oauthAppPage({ session, a, clientId, hasSecret, next, flash, catalogErrors }) {
  const csrf = html`<input type="hidden" name="csrf" value="${session.csrf}">`;
  const name = a.provider.name;
  const target = next && a.connectors.find((c) => c.id === next);
  return appShell({ title: `${name} OAuth app`, active: "oauth", session, flash, catalogErrors, content: html`
    <nav class="breadcrumb" aria-label="Breadcrumb"><a href="/oauth-apps">OAuth apps</a>${raw(icon("caret-right", 12))}<span>${name}</span></nav>
    <div class="page-head"><div><h1>${name} OAuth app</h1><p>Register it once and ${a.connectors.length > 1 ? `its ${a.connectors.length} apps` : a.connectors[0].name}
      (${a.connectors.map((c) => c.name).join(", ")}) connect in one click: sign in to ${name} and approve.</p></div></div>
    ${target ? html`<div class="notice is-info">${raw(icon("info", 16))}<span>After saving, you'll continue connecting ${target.name}.</span></div>` : ""}
    <div class="grid-2 mt-16">
      <section class="card"><div class="card-head"><h2>1. Register the app at ${name}</h2></div><div class="card-body stack">
        ${steps(a.provider.help || `Create an OAuth application in the ${name} developer console.`)}
        ${a.redirect ? html`<div><p class="field-help">Redirect URI (the same for all its apps)</p><div class="code mt-6"><pre id="redirect-uri">${a.redirect}</pre>
          <button type="button" class="btn btn-sm copy" data-copy="redirect-uri">${raw(icon("copy", 14))} <span class="copy-label">Copy</span></button></div></div>`
          : html`<div class="notice is-warn">${raw(icon("lock-simple", 16))}<span>${name} only accepts https:// redirect URIs: set <code>CONECTOR_PUBLIC_URL</code> to an https address.</span></div>`}
        ${a.scopes.length ? html`<div><p class="field-help">Scopes its apps request</p><div class="code mt-6"><pre id="scopes">${a.scopes.join(" ")}</pre>
          <button type="button" class="btn btn-sm copy" data-copy="scopes">${raw(icon("copy", 14))} <span class="copy-label">Copy</span></button></div></div>` : ""}
      </div></section>
      <section class="card"><div class="card-head"><h2>2. Paste the client ID and secret</h2>${a.registered ? html`<span class="chip is-ok">Registered</span>` : ""}</div>
        <form method="post" action="/oauth-apps/${encodeURIComponent(a.key)}" class="card-body">${csrf}
          ${target ? html`<input type="hidden" name="next" value="${target.id}">` : ""}
          <label class="field"><span>Client ID</span><input name="client_id" value="${clientId || ""}" autocomplete="off" required spellcheck="false"></label>
          <label class="field"><span>Client secret <small>(leave empty to keep the saved one, or if ${name} has none)</small></span>
            <input name="client_secret" type="password" autocomplete="off" placeholder="${hasSecret ? "•••••••• (saved)" : ""}"></label>
          <div class="form-actions"><button class="btn btn-primary">${target ? `Save and connect ${target.name}` : "Save"}</button></div></form>
        ${clientId ? html`<div class="card-foot"><form method="post" action="/oauth-apps/${encodeURIComponent(a.key)}/delete" data-confirm="Delete the ${name} OAuth app?">${csrf}
          <button class="btn btn-sm btn-danger">Delete this OAuth app</button></form></div>` : ""}</section>
    </div>` });
}

export function auditPage({ session, events, users, flash, catalogErrors }) {
  const who = (e) => e.token ? `${e.token} (token)` : users.find((u) => u.id === e.userId)?.email || e.email || e.userId || "—";
  return appShell({ title: "Audit log", active: "audit", session, flash, wide: true, catalogErrors, content: html`
    <div class="page-head"><div><h1>Audit log</h1><p>Every tool call made by an agent and every change in the panel. Payloads and credentials are never recorded.</p></div>
      <span class="count">Last ${events.length} events</span></div>
    <section class="card"><div class="table-wrap"><table><thead><tr><th>When</th><th>Who</th><th>Action</th><th>Request</th><th>Result</th><th class="num">Time</th></tr></thead>
      <tbody>${events.length ? events.map((e) => html`<tr class="${e.ok === false ? "is-failed" : ""}"><td>${fmtDate(e.at)}</td><td>${who(e)}</td>
        <td>${e.tool || e.action || ""}${e.app ? html` <span class="faint">· ${e.app}</span>` : ""}</td><td><code>${[e.method, e.path].filter(Boolean).join(" ")}</code></td>
        <td>${e.ok === false ? html`<span class="status is-danger">${e.error || "failed"}</span>` : html`<span class="status is-ok">ok</span>`}</td>
        <td class="num">${e.ms != null ? `${e.ms} ms` : ""}</td></tr>`) : html`<tr><td colspan="6"><div class="empty"><p>No events yet.</p></div></td></tr>`}</tbody></table></div></section>` });
}

export function errorPage({ session, status, title, text }) {
  return appShell({ title, active: "", session, content: html`<div class="empty">${raw(icon(status === 403 ? "lock-simple" : "question", 32))}
    <h3>${title}</h3><p>${text}</p><div class="form-actions is-center"><a class="btn" href="/">Go home</a></div></div>` });
}
