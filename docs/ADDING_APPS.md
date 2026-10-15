# Adding an app

Every app in Conector is a plain object in one of the files in `src/catalog/apps/`. Each file exports an array of
definitions. `src/catalog/define.js` turns each definition into a connector with:

- a connection form in the panel, with help text and a connection test;
- an authenticated `<id>_request` tool that agents use to call any endpoint of the app's API;
- any extra tools you add.

New files in `src/catalog/apps/` are picked up automatically. After editing, run:

```bash
npm run validate                                    # definitions, texts, tool names (offline)
node scripts/validate-catalog.mjs src/catalog/apps/<file>.js   # also calls the API with fake credentials
npm run logos                                       # fetch the logo of the new app
```

The network check expects the app to *reject* the fake credentials (usually 401 or 403). A 404 or a DNS error means
that the base URL or the test path is wrong.

## A minimal app

```js
{
  id: "acme",                              // lowercase letters and digits, unique
  name: "Acme",
  category: "productivity",                // see CATEGORIES in src/catalog/define.js
  description: "Projects and tasks in Acme", // 70 characters at most
  website: "https://acme.example",
  docs: "https://developers.acme.example",
  logo: { simpleIcons: "acme" },           // or { favicon: "https://acme.example" }
  baseUrl: "https://api.acme.example/v1",
  fields: [{ id: "token", label: "API key", secret: true }],
  auth: { type: "bearer" },                // sends "Authorization: Bearer <token>"
  keyUrl: "https://acme.example/settings/api",
  help: "1) In Acme open “Settings” → “API”. 2) Click “New key”, copy it and paste it here.",
  test: { path: "/me", account: (d) => d.email },
  examples: "Examples: GET /projects, POST /tasks {\"title\": \"…\"}",  // shown in the <id>_request tool description
}
```

`help` uses the `1) … 2) …` format, which the panel renders as a numbered list. Quote UI labels with curly quotes and
→ arrows, as in the vendor's interface.

## Fields

| Key | |
|---|---|
| `id` | Credential key (`token`, `username`, `subdomain`…). Use `token` for the main secret. |
| `label`, `help`, `placeholder`, `example` | Texts in the form. `example` is also used as the fake value by the validator. |
| `secret: true` | Masked in the form, never shown again, removed from API answers that echo it. |
| `optional: true` | Not required to save. |
| `default` | Value used when the field is left empty. |
| `options: [["eu", "Europe"], ["us", "United States"]]` | A select. The first element is the stored value. |
| `format` | `subdomain`, `domain`, `segment` (no spaces or slashes), `email` or `url` (a self-hosted instance; `https://` required except on localhost). |
| `hidden: true` | Not asked; filled in by OAuth (for example the instance URL returned with the token). |

Fields can be used in URLs as `{placeholders}`: `baseUrl: "https://{subdomain}.acme.example/api"`. Every placeholder is
validated against its format before the request is sent, so credentials can't be redirected to another server.
`derived: { host: (cred) => … }` adds computed placeholders.

## Authentication

`auth` is one object or an array (for example a key in a header plus an account ID in the query).

| Type | Options |
|---|---|
| `bearer` | `field` (default `token`). |
| `header` | `name`, `field`, `prefix` (for example `"Token "`). |
| `query` | `name`, `field`. |
| `body` | `name`, `field`, or `value: (cred) => …` for composite values. Added to the JSON or form body of requests with a body. |
| `basic` | `usernameField`, `passwordField`, or `fixedUsername` / `fixedPassword` (for example a key as the username and an empty password). |
| `client_credentials` | `url` (token endpoint), `params`, `clientIdField`, `clientSecretField`, `credentialsIn: "body"`, `paramsIn: "query"`, `format: "json"`. The token is cached until it expires. |
| `aws` | Signature Version 4. `keyField`, `secretField`, `sessionField`, `service`, `region` (deduced from the host when omitted). |
| `signature` | `sign({ method, url, headers, body, cred })` signs each request (HMAC schemes). |
| `custom` | `apply: async (cred) => ({ headers, query })`. |
| `none` | Public APIs. The panel shows an “Enable” button. |

Other request options: `headers` (object or `(cred) => object`), `query` (fixed parameters), `allowedOrigins`
(extra hosts that `<id>_request` may call with the same credentials, such as an upload host), `timeout` (ms),
`graphql: { path: "/graphql" }` (adds an `<id>_graphql` tool) and `toolPrefix`.

## One-click sign-in (OAuth)

Add an `oauth` block next to `auth` to offer “Continue with …” as well as the API key, or leave out `auth` for OAuth only:

```js
oauth: {
  provider: "google",          // a shared provider from src/oauth.js (google, microsoft, dropbox, zoho)…
  scopes: ["https://www.googleapis.com/auth/drive"],
  test: { path: "/about?fields=user" },
},
```

…or a provider of its own:

```js
oauth: {
  provider: {
    key: "acme", name: "Acme",
    authorizeUrl: "https://acme.example/oauth/authorize",
    tokenUrl: "https://acme.example/oauth/token",
    help: "1) In Acme open “Developer” → “OAuth apps” → “New app”. 2) Paste the redirect URI shown here. 3) Copy the client ID and secret.",
  },
  scopes: ["read", "write"],
  fields: ["subdomain"],       // fields asked before signing in
},
```

Provider options: `extraParams` (added to the authorization URL), `clientAuth: "basic" | "body"`, `json: true` (JSON
token requests), `scopeSeparator`, `redirect: "localhost" | "127.0.0.1" | "https"`, `keep: ["instance_url"]` (token
response fields to store), `after: async (token, cred, httpRequest) => ({ … })` (extra values to store, for example the
account ID), `parseResponse`, `params`, `tokenBody` and `refreshUrl`. `oauth.baseUrl`, `oauth.apply(headers, token, cred)`
and `oauth.test` apply only to OAuth connections.

Every app with the same provider `key` shares one OAuth app, which an admin registers once under **OAuth apps**.

## Connection test

`test: { path, method, query, body, form, headers }` is called when the user saves the form.

- `account: (data, cred) => "name@example.com"`: shown as “Connected as …”.
- `message: "…" | (data) => "…"`: shown when there is no account name.
- `validate: (data, response) => { throw new Error("…") }`: for APIs that answer 200 with an error in the body.
- `acceptStatus: [404]`: statuses that still mean the key is valid.

## Extra tools

```js
tools: [{
  name: "acme_tasks",                      // must start with the app id (or toolPrefix) and an underscore
  title: "Acme: list tasks",
  description: "Lists the tasks of a project, newest first.",
  schema: { project: z.string(), limit: z.number().int().max(100).optional() },
  annotations: { readOnlyHint: true },
  async run({ project, limit = 20 }, request) {
    const r = await request({ path: `/projects/${encodeURIComponent(project)}/tasks`, query: { limit } });
    return ensureOk(r, "Acme").map((t) => ({ id: t.id, title: t.title, done: t.completed }));
  },
}],
```

`request` is the app's authenticated request function, and `ensureOk` comes from `../define.js`. Return compact
objects: agents read every byte. Add an extra tool only when it saves the agent real work. `<id>_request` already covers
the rest of the API.
