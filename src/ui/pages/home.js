// Home: what Conector is, the MCP endpoint, getting-started checklist and the most used agents.
import { html, plural, raw } from "../html.js";
import { icon } from "../icons.js";
import { appShell } from "../layout.js";
import { agentLogo, appLogo } from "../logos.js";

const copyButton = (id, label = "Copy") => html`<button type="button" class="btn btn-sm" data-copy="${id}">${raw(icon("copy", 14))} <span class="copy-label">${label}</span></button>`;

export function homePage({ session, totals, connected, agents, mcpUrl, tokens, usedTokens, team, flash, catalogErrors }) {
  const isAdmin = session.user.role === "admin";
  const steps = [
    { done: connected.length > 0, title: "Connect your first app", text: `Pick one of ${totals.apps.toLocaleString("en-US")} apps and sign in or paste its API key.`, href: "/apps", cta: "Browse apps" },
    { done: tokens > 0, title: "Create an access token", text: "Each agent authenticates with its own token, which you can revoke at any time.", href: "/tokens", cta: "Create token" },
    { done: usedTokens > 0, title: "Add Conector to your agent", text: "Copy one command or config snippet for Claude, Codex, Cursor and 40+ more.", href: "/agents", cta: "Connect agent" },
  ];
  const groups = [
    ["Anthropic", ["claude-code", "claude-desktop"]],
    ["OpenAI and GitHub", ["codex", "github-copilot"]],
    ["Editors and CLIs", ["cursor", "gemini-cli", "opencode", "cline"]],
  ].map(([label, ids]) => [label, ids.map((id) => agents.find((a) => a.id === id)).filter(Boolean)]).filter(([, l]) => l.length);
  return appShell({ title: "Home", active: "home", session, flash, catalogErrors, content: html`
    <section class="hero">
      <p class="eyebrow">${raw(icon("plugs-connected", 14))} Self-hosted MCP gateway</p>
      <h1>Connect your apps once. Use them from every agent.</h1>
      <p>Conector turns ${totals.apps.toLocaleString("en-US")} apps into tools for Claude, Codex, Cursor, Gemini CLI, Copilot and any other MCP client.
        Credentials stay encrypted on your server.</p>
      <div class="row">
        <a class="btn btn-primary btn-lg btn-cta" href="/agents">Connect my agent <span class="btn-orb">${raw(icon("arrow-up-right", 16))}</span></a>
        <a class="btn btn-lg" href="/apps">Browse apps</a>
      </div>
      <div class="hero-stats"><span><b>${totals.apps.toLocaleString("en-US")}</b> apps</span><span><b>${totals.oneClick}</b> one-click</span>
        <span><b>${connected.length}</b> connected</span><span><b>${agents.filter((a) => a.methods.length).length}</b> supported agents</span></div>
    </section>
    <div class="home-grid">
      <section class="card">
        <div class="card-head"><h2>Connect an agent</h2><a class="btn btn-sm btn-ghost" href="/agents">All ${agents.length} ${raw(icon("caret-right", 13))}</a></div>
        ${groups.map(([label, list]) => html`<div class="agent-group"><h3>${label}</h3>
          ${list.map((a) => html`<div class="agent-row">${agentLogo(a, 28, "is-sm")}<span class="grow">${a.name}</span>
            <a class="btn btn-sm" href="/agents?agent=${a.id}">Install ${raw(icon("arrow-up-right", 13))}</a></div>`)}</div>`)}
      </section>
      <div class="stack">
        <section class="card card-pad">
          <div class="row-between"><h2>MCP endpoint</h2><span class="chip">Streamable HTTP</span></div>
          <p class="help mt-6">Point any MCP client here and send <code>Authorization: Bearer &lt;token&gt;</code>.</p>
          <div class="endpoint mt-16"><code id="mcp-url">${mcpUrl}</code>${copyButton("mcp-url")}</div>
        </section>
        <section class="card">
          <div class="card-head"><h2>Get started</h2><span class="count">${steps.filter((s) => s.done).length} of 3</span></div>
          <ol class="checklist">${steps.map((s, i) => html`<li class="${s.done ? "is-done" : ""}">
            <span class="num-dot">${s.done ? raw(icon("check", 13)) : i + 1}</span>
            <div class="list-title"><b>${s.title}</b><p>${s.text}</p></div>
            ${s.done ? "" : html`<a class="btn btn-sm" href="${s.href}">${s.cta}</a>`}</li>`)}</ol>
        </section>
        <section class="card">
          <div class="card-head"><h2>Your apps</h2><a class="btn btn-sm btn-ghost" href="/apps">Manage ${raw(icon("caret-right", 13))}</a></div>
          ${connected.length
            ? html`<div class="card-body"><div class="logo-stack">${connected.slice(0, 12).map((c) => appLogo(c, 28, "is-sm"))}</div>
                <p class="help mt-10">${plural(connected.length, "app")} ready for your agents${connected.length > 12 ? ` (+${connected.length - 12} more)` : ""}.</p></div>`
            : html`<div class="empty">${raw(icon("squares-four", 26))}<h3>No apps connected yet</h3><p>Start with Gmail, GitHub, Slack or Notion.</p>
                <div class="form-actions is-center"><a class="btn btn-primary" href="/apps">Browse apps</a></div></div>`}
        </section>
        ${isAdmin ? html`<section class="card card-pad"><div class="row-between"><div><h2>Workspace</h2>
          <p class="help mt-6">${plural(team.users, "member")}${team.invites ? `, ${plural(team.invites, "pending invite")}` : ""}</p></div>
          <a class="btn btn-sm" href="/users">${raw(icon("plus", 13))} Invite</a></div></section>` : ""}
      </div>
    </div>` });
}
