// "Connect with …" in one click: OAuth 2.0 (authorization code + PKCE). Each provider uses ONE OAuth app registered by
// the admin (panel → OAuth apps) and shared by all its connectors, so connecting is just signing in to the service.
// The provider redirects back to <public url>/oauth/callback; the request is matched by its single-use `state`.
import crypto from "node:crypto";
import { getCredentialsIn, getOAuthApp, saveCredentials, SCOPE, SHARED } from "./store.js";
import { ensureOk, httpRequest } from "./http.js";

export const PROVIDERS = {
  google: {
    name: "Google",
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    extraParams: { access_type: "offline", prompt: "consent" },
    redirect: "localhost",
    help: "In Google Cloud Console (console.cloud.google.com): 1) Create or pick a project and, under “APIs & Services → Library”, "
      + "enable the APIs of the services you will connect (Gmail, Drive, Calendar…). 2) Configure the “OAuth consent screen” "
      + "(“Internal” for Workspace organizations, so grants don't expire). 3) Under “Credentials → Create credentials → OAuth client "
      + "ID” choose “Web application”, add the redirect URI shown below to “Authorized redirect URIs” and click “Create”. 4) Copy "
      + "the client ID and secret: they work for every Google connector.",
  },
  dropbox: {
    name: "Dropbox",
    authorizeUrl: "https://www.dropbox.com/oauth2/authorize",
    tokenUrl: "https://api.dropboxapi.com/oauth2/token",
    extraParams: { token_access_type: "offline" },
    help: "At dropbox.com/developers/apps: 1) “Create app” → “Scoped access” → “Full Dropbox”. 2) Under “Permissions” tick the "
      + "scopes you need (files.metadata.read, files.content.read, files.content.write, sharing.read…). 3) Under “Settings → OAuth 2 → "
      + "Redirect URIs” add the redirect URI shown below. 4) Copy the “App key” (client ID) and the “App secret”.",
  },
  // Zoho connectors have a "server" field (data center) and, when the URL needs it, a hidden "api_domain" field.
  zoho: {
    name: "Zoho",
    authorizeUrl: "https://{server}/oauth/v2/auth",
    tokenUrl: "https://{server}/oauth/v2/token",
    extraParams: { access_type: "offline", prompt: "consent" },
    scopeSeparator: ",",
    redirect: "localhost",
    keep: ["api_domain"],
    // Zoho answers 200 without a token when the chosen data center is not the account's.
    after: async (token, c) => {
      if (!token) throw new Error("Zoho did not return a token: check that the data center you chose is your account's");
      if (!/^https:\/\/[a-z0-9.-]*zohoapis\.[a-z.]+$/i.test(String(c.api_domain || ""))) throw new Error("Zoho did not return a valid API domain");
      return {};
    },
    help: "1) Open the Zoho API console of your data center (api-console.zoho.com, .eu, .in, .com.au…) and click “Add Client” → "
      + "“Server-based Applications”. 2) Give it a name, set “Homepage URL” to your website and add the redirect URI shown below to "
      + "“Authorized Redirect URIs”; click “Create”. 3) Copy the “Client ID” and “Client Secret”: the same client works for every "
      + "Zoho connector. 4) Choose your account's data center here and click “Continue with Zoho”.",
  },
  // Microsoft connectors have a "tenant" field and request offline_access among their scopes.
  microsoft: {
    name: "Microsoft",
    authorizeUrl: "https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize",
    tokenUrl: "https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token",
    redirect: "localhost",
    help: "In the Microsoft Entra admin center (entra.microsoft.com): 1) “Applications → App registrations → New registration”; under "
      + "“Redirect URI” choose “Web” and paste the redirect URI shown below. 2) Copy the “Application (client) ID” and the "
      + "“Directory (tenant) ID”. 3) Under “Certificates & secrets” create a client secret and copy its value (it expires: note the "
      + "date). 4) The same app works for every Microsoft connector in the catalog.",
  },
};

const pending = new Map(); // state → { id, verifier, redirect, userId, scope, returnTo, expiresAt }
const refreshes = new Map();

// Providers can also be described inside a connector definition: { name, key, authorizeUrl, tokenUrl (URLs may use
// {field} placeholders), extraParams, clientAuth: "body" | "basic" (how the secret is sent), json: true (the token endpoint
// wants a JSON body), parseResponse: (d) => d (normalizes nested token responses), params: (params, cred) => params and
// tokenBody: (body, cred) => body (providers that rename client_id, e.g. TikTok), redirect: "127.0.0.1" | "localhost" |
// "https" (HTTPS-only providers need an https:// public URL), keep: [token response fields to store, e.g. instance_url],
// after: async (token, cred, httpRequest) => extra fields, refreshUrl: refresh endpoint when it differs from tokenUrl,
// help: how to register the app }.
// When the provider returns neither an expiry nor a refresh token (GitHub, Notion, Slack…), the token is valid until revoked.

export function oauthClient(oauth) {
  const app = getOAuthApp(oauth.key);
  if (!app?.client_id) throw new Error(`Register the ${oauth.provider.name} OAuth app first (panel → OAuth apps)`);
  return app;
}

/** URL of the provider's sign-in page. `scope` decides where the tokens are stored (personal or shared). */
export function authorizationUrl(connector, redirect, { userId, scope, returnTo }) {
  const { provider: p, scopes, resolve } = connector.oauth;
  const client = oauthClient(connector.oauth);
  const cred = { ...(getCredentialsIn(connector.id, scope) || {}), ...client };
  const state = crypto.randomBytes(16).toString("base64url");
  const verifier = crypto.randomBytes(32).toString("base64url");
  for (const [k, v] of pending) if (v.expiresAt < Date.now()) pending.delete(k);
  pending.set(state, { id: connector.id, verifier, redirect, userId, scope, returnTo, expiresAt: Date.now() + 15 * 60_000 });
  const url = new URL(resolve(p.authorizeUrl, cred));
  const params = { client_id: client.client_id, redirect_uri: redirect, response_type: "code",
    ...(scopes.length ? { scope: scopes.join(p.scopeSeparator || " ") } : {}), state, code_challenge_method: "S256",
    code_challenge: crypto.createHash("sha256").update(verifier).digest("base64url"), ...p.extraParams };
  for (const [k, v] of Object.entries(p.params ? p.params(params, cred) : params)) url.searchParams.set(k, v);
  return url.toString();
}

// The provider's redirect carries no panel cookie guarantees: the connector is identified by the state.
export function pendingAuthorization(state) {
  const p = pending.get(state);
  return p && p.expiresAt > Date.now() ? { id: p.id, returnTo: p.returnTo, userId: p.userId, scope: p.scope } : null;
}

export function discardPending(state) {
  pending.delete(state);
}

// `cred` also carries the app's client ID and secret, in case provider hooks need them.
async function requestToken(oauth, cred, params) {
  const p = oauth.provider;
  let body = { ...params };
  const headers = { Accept: "application/json", ...(p.json ? { "Content-Type": "application/json" } : {}) };
  if (p.clientAuth === "basic") {
    headers.Authorization = `Basic ${Buffer.from(`${cred.client_id}:${cred.client_secret || ""}`).toString("base64")}`;
  } else {
    body.client_id = cred.client_id;
    if (cred.client_secret) body.client_secret = cred.client_secret;
  }
  if (p.tokenBody) body = p.tokenBody(body, cred);
  // Some providers refresh on a different endpoint (Figma: /v1/oauth/refresh).
  const target = params.grant_type === "refresh_token" && p.refreshUrl ? p.refreshUrl : p.tokenUrl;
  const r = await httpRequest(oauth.resolve(target, cred), { method: "POST", headers,
    body: p.json ? JSON.stringify(body) : new URLSearchParams(body) });
  const d = ensureOk(r, p.name);
  return p.parseResponse ? p.parseResponse(d) || {} : d;
}

// Some providers (GitHub, Zoho…) answer 200 with an error instead of a token.
const missingToken = (p, d, what) => new Error(`${p.name} has not ${what}${d?.error ? ` (${d.error_description || d.error})` : ""}; `
  + `connect ${p.name} again in the Conector panel`);

const kept = (p, d) => Object.fromEntries((p.keep || []).filter((k) => d?.[k] != null).map((k) => [k, d[k]]));

/** Exchanges the code for tokens and stores them in the scope chosen when the user started signing in. */
export async function completeAuthorization(connector, code, state) {
  const p0 = pending.get(state);
  pending.delete(state);
  if (!p0 || p0.id !== connector.id || p0.expiresAt < Date.now()) {
    throw new Error("The authorization expired or is not valid: start again from the app's page");
  }
  const p = connector.oauth.provider;
  const client = oauthClient(connector.oauth);
  // If it was connected with an API key before, that key is dropped: only non-secret data (subdomain, region…) is kept.
  const secrets = new Set(connector.fields.filter((f) => f.secret).map((f) => f.id));
  const cred = Object.fromEntries(Object.entries(getCredentialsIn(connector.id, p0.scope) || {}).filter(([k]) => !secrets.has(k)));
  const d = await requestToken(connector.oauth, { ...cred, ...client }, { grant_type: "authorization_code", code,
    redirect_uri: p0.redirect, code_verifier: p0.verifier });
  const refresh = d.refresh_token;
  const expires = Number(d.expires_in) ? Date.now() + Number(d.expires_in) * 1000 : refresh ? Date.now() + 3600_000 : null;
  const next = { ...cred, method: "oauth", access_token: d.access_token, refresh_token: refresh, expires, ...kept(p, d) };
  if (p.after) Object.assign(next, await p.after(d.access_token, next, httpRequest));
  if (!next.access_token) throw missingToken(p, d, "returned an access token");
  saveCredentials(connector.id, next, { scope: p0.scope, meta: { connectedBy: p0.userId } });
  return { userId: p0.userId, scope: p0.scope, returnTo: p0.returnTo };
}

/** A valid access token; refreshes it with the refresh token when expired (one refresh at a time). */
export async function getAccessToken(id, oauth, read) {
  const cred = read(id);
  if (cred?.access_token && (cred.expires === null || cred.expires > Date.now() + 60_000)) return cred.access_token;
  if (!cred?.refresh_token) throw new Error("The account is not authorized yet: connect it in the Conector panel");
  const scope = cred[SCOPE] || SHARED;
  const key = `${scope}:${id}`;
  if (!refreshes.has(key)) {
    refreshes.set(key, (async () => {
      try {
        const d = await requestToken(oauth, { ...cred, ...oauthClient(oauth) }, { grant_type: "refresh_token", refresh_token: cred.refresh_token });
        if (!d.access_token) throw missingToken(oauth.provider, d, "refreshed the access");
        saveCredentials(id, { ...(getCredentialsIn(id, scope) || cred), access_token: d.access_token,
          refresh_token: d.refresh_token || cred.refresh_token, expires: Date.now() + (Number(d.expires_in) || 3600) * 1000,
          ...kept(oauth.provider, d) }, { scope });
        return d.access_token;
      } finally {
        refreshes.delete(key);
      }
    })());
  }
  return refreshes.get(key);
}
