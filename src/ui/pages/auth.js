// Sign in, first-run setup, invitations, password resets and the OAuth return page.
import { MIN_PASSWORD } from "../../auth.js";
import { esc, html, raw } from "../html.js";
import { icon } from "../icons.js";
import { authShell } from "../layout.js";

const errorBox = (error) => (error ? html`<div class="notice is-error" role="alert">${raw(icon("warning-circle", 16))}<span>${error}</span></div>` : "");

const passwordFields = (autocomplete = "new-password") => html`
  <label class="field"><span>Password <small>(at least ${MIN_PASSWORD} characters)</small></span>
    <input type="password" name="password" required minlength="${MIN_PASSWORD}" autocomplete="${autocomplete}"></label>
  <label class="field"><span>Repeat the password</span>
    <input type="password" name="password2" required minlength="${MIN_PASSWORD}" autocomplete="${autocomplete}"></label>`;

export function setupPage({ code = "", error } = {}) {
  return authShell({ title: "Set up Conector", content: html`
    <h1>Create the admin account</h1>
    <p>This is the first start of this Conector server. Use the setup code printed in the server log (or run
      <code>node bin/conector.js setup-code</code>).</p>
    <form method="post" action="/setup" class="stack">
      ${errorBox(error)}
      <label class="field"><span>Setup code</span><input name="code" value="${code}" required autocomplete="off" spellcheck="false"></label>
      <label class="field"><span>Your name</span><input name="name" required autocomplete="name" maxlength="80"></label>
      <label class="field"><span>E-mail</span><input type="email" name="email" required autocomplete="email"></label>
      ${passwordFields()}
      <button class="btn btn-primary btn-lg btn-block">Create account</button>
    </form>` });
}

export function loginPage({ error, email = "", next = "" } = {}) {
  return authShell({ title: "Sign in", content: html`
    <h1>Sign in</h1>
    <p>Welcome back. Use the e-mail and password of your Conector account.</p>
    <form method="post" action="/login" class="stack">
      ${errorBox(error)}
      <input type="hidden" name="next" value="${next}">
      <label class="field"><span>E-mail</span><input type="email" name="email" value="${email}" required autocomplete="username" autofocus></label>
      <label class="field"><span>Password</span><input type="password" name="password" required autocomplete="current-password"></label>
      <button class="btn btn-primary btn-lg btn-block">Sign in</button>
    </form>
    <p class="auth-hint">Forgot your password? Ask an admin for a reset link.</p>` });
}

export function invitePage({ invite, token, error } = {}) {
  if (!invite) {
    return authShell({ title: "Invitation", content: html`<h1>Invitation not valid</h1>
      <p>This link was already used or has expired. Ask an admin of your workspace for a new one.</p>
      <div class="form-actions"><a class="btn" href="/login">Go to sign in</a></div>` });
  }
  return authShell({ title: "Join the workspace", content: html`
    <h1>Join the workspace</h1>
    <p>You were invited as <b>${invite.role}</b> with <b>${invite.email}</b>. Choose your name and a password.</p>
    <form method="post" action="/invite/${encodeURIComponent(token)}" class="stack">
      ${errorBox(error)}
      <label class="field"><span>Your name</span><input name="name" required autocomplete="name" maxlength="80"></label>
      ${passwordFields()}
      <button class="btn btn-primary btn-lg btn-block">Create my account</button>
    </form>` });
}

export function resetPage({ valid, token, error } = {}) {
  if (!valid) {
    return authShell({ title: "Reset password", content: html`<h1>Link not valid</h1>
      <p>This password reset link was already used or has expired. Ask an admin for a new one.</p>
      <div class="form-actions"><a class="btn" href="/login">Go to sign in</a></div>` });
  }
  return authShell({ title: "Reset password", content: html`
    <h1>Choose a new password</h1>
    <p>Signing in again is required on every device afterwards.</p>
    <form method="post" action="/reset/${encodeURIComponent(token)}" class="stack">
      ${errorBox(error)}
      ${passwordFields()}
      <button class="btn btn-primary btn-lg btn-block">Save password</button>
    </form>` });
}

/** Shown after the OAuth provider redirects back: a short page that returns to the app page. */
export function oauthReturnPage({ appId, ok, text }) {
  const target = appId ? `/apps/${encodeURIComponent(appId)}?${ok ? "ok" : "error"}=${encodeURIComponent(text)}` : "/apps";
  return raw(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=${esc(target)}">
<title>Returning to Conector</title><link rel="stylesheet" href="/assets/css/app.css"></head>
<body class="auth"><main class="auth-main"><section class="auth-card"><h1>${ok ? "Connected" : "Couldn't connect"}</h1><p>${esc(text)}</p>
<div class="form-actions"><a class="btn btn-primary" href="${esc(target)}">Back to Conector</a></div></section></main></body></html>`);
}
