// Page shells: the app layout (sidebar + content) and the centered auth layout (sign in, setup, invites).
import { VERSION } from "../config.js";
import { html, initials, raw, render } from "./html.js";
import { icon } from "./icons.js";

const NAV = [
  { id: "home", href: "/", label: "Home", icon: "house" },
  { id: "apps", href: "/apps", label: "Apps", icon: "squares-four" },
  { id: "agents", href: "/agents", label: "Connect agents", icon: "robot" },
  { id: "tokens", href: "/tokens", label: "Access tokens", icon: "key" },
];
const ADMIN_NAV = [
  { id: "users", href: "/users", label: "Users", icon: "users-three" },
  { id: "oauth", href: "/oauth-apps", label: "OAuth apps", icon: "plugs-connected" },
  { id: "audit", href: "/audit", label: "Audit log", icon: "clock-counter-clockwise" },
];

const head = (title) => html`<!doctype html><html lang="en" class="no-js"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="color-scheme" content="dark"><meta name="theme-color" content="#08070b">
<title>${title ? `${title} · Conector` : "Conector"}</title>
<link rel="icon" type="image/png" href="/assets/brand/favicon.png"><link rel="apple-touch-icon" href="/assets/brand/apple-touch-icon.png">
<link rel="preload" href="/assets/fonts/Geist-Variable.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/css/app.css?v=${VERSION}"></head>`;

const toast = (flash) => {
  if (!flash?.ok && !flash?.error) return "";
  return html`<div class="toasts" aria-live="polite">${flash.ok ? html`<div class="toast is-ok" role="status">${raw(icon("check-circle", 18))}<span>${flash.ok}</span></div>` : ""}${flash.error ? html`<div class="toast is-error" role="alert">${raw(icon("warning-circle", 18))}<span>${flash.error}</span></div>` : ""}</div>`;
};

function navItem(item, active) {
  const current = item.id === active;
  return html`<a class="nav-item${current ? " is-active" : ""}" href="${item.href}"${current ? raw(' aria-current="page"') : ""}>${raw(icon(item.icon, 18))}<span>${item.label}</span></a>`;
}

/** Full app page. `session` = { user, csrf }; `flash` = { ok, error }. */
export function appShell({ title, active, session, content, flash, wide = false, catalogErrors = [] }) {
  const u = session.user;
  const csrf = html`<input type="hidden" name="csrf" value="${session.csrf}">`;
  return raw(render(html`${head(title)}<body class="app">
<a class="skip-link" href="#main">Skip to content</a>
<div class="shell">
  <aside class="sidebar" id="sidebar" aria-label="Main navigation">
    <div class="sidebar-top">
      <a class="brand" href="/" aria-label="Conector home"><img src="/assets/brand/conector-mark.png" alt="" width="34" height="24"><img class="brand-word" src="/assets/brand/conector-wordmark.png" alt="Conector" width="112" height="16"></a>
      <button class="icon-button sidebar-close" type="button" data-close-sidebar aria-label="Close menu">${raw(icon("x", 18))}</button>
    </div>
    <button class="search-trigger" type="button" data-palette-open aria-keyshortcuts="Meta+K">${raw(icon("magnifying-glass", 16))}<span>Search</span><kbd>⌘K</kbd></button>
    <nav class="nav">${NAV.map((i) => navItem(i, active))}
      ${u.role === "admin" ? html`<p class="nav-heading">Workspace</p>${ADMIN_NAV.map((i) => navItem(i, active))}` : ""}</nav>
    <div class="sidebar-bottom">
      ${navItem({ id: "settings", href: "/settings", label: "Settings", icon: "gear-six" }, active)}
      <div class="me">
        <span class="avatar" aria-hidden="true">${initials(u.name || u.email)}</span>
        <span class="me-text"><b>${u.name}</b><small>${u.email}</small></span>
        <form method="post" action="/logout">${csrf}<button class="icon-button" title="Sign out" aria-label="Sign out">${raw(icon("sign-out", 18))}</button></form>
      </div>
    </div>
  </aside>
  <div class="scrim" data-close-sidebar hidden></div>
  <div class="main-wrap">
    <header class="topbar">
      <button class="icon-button" type="button" data-open-sidebar aria-label="Open menu" aria-controls="sidebar" aria-expanded="false">${raw(icon("list", 20))}</button>
      <a class="brand" href="/"><img src="/assets/brand/conector-mark.png" alt="" width="30" height="21"><img class="brand-word" src="/assets/brand/conector-wordmark.png" alt="Conector" width="98" height="14"></a>
      <button class="icon-button" type="button" data-palette-open aria-label="Search">${raw(icon("magnifying-glass", 20))}</button>
    </header>
    <main id="main" class="main${wide ? " is-wide" : ""}" tabindex="-1">
      ${catalogErrors.length && u.role === "admin" ? html`<details class="banner is-error"><summary>${catalogErrors.length} catalog definition(s) failed to load</summary><ul>${catalogErrors.map((x) => html`<li>${x}</li>`)}</ul></details>` : ""}
      ${content}
    </main>
  </div>
</div>
<div class="palette" id="palette" hidden role="dialog" aria-modal="true" aria-label="Search">
  <div class="palette-box">
    <div class="palette-input">${raw(icon("magnifying-glass", 18))}<input id="palette-input" type="search" placeholder="Search apps and pages…" autocomplete="off" spellcheck="false" aria-controls="palette-results"><kbd>Esc</kbd></div>
    <ul class="palette-results" id="palette-results" role="listbox"></ul>
  </div>
</div>
${toast(flash)}
<script src="/assets/js/app.js?v=${VERSION}" defer></script>
</body></html>`));
}

/** Centered card for sign-in, first-run setup, invitations and password resets. */
export function authShell({ title, content, flash }) {
  return raw(render(html`${head(title)}<body class="auth">
<main class="auth-main" id="main">
  <a class="auth-brand" href="/"><img src="/assets/brand/conector-logo.png" alt="Conector" width="168" height="112"></a>
  <section class="auth-card">${content}</section>
  <p class="auth-foot">Conector ${VERSION} · self-hosted MCP gateway</p>
</main>
${toast(flash)}
<script src="/assets/js/app.js?v=${VERSION}" defer></script>
</body></html>`));
}
