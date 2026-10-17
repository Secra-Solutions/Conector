// Miniflux is a self-hosted RSS reader. Its API uses a custom header: X-Auth-Token: <key>.
export default [
  {
    id: "miniflux", name: "Miniflux", category: "productivity",
    description: "Unread entries, starred items and feeds of your Miniflux instance",
    website: "https://miniflux.app", docs: "https://miniflux.app/docs/api.html",
    logo: { simpleIcons: "miniflux" },
    baseUrl: "{url}/v1",
    auth: { type: "header", name: "X-Auth-Token" },
    fields: [{ id: "token", label: "API key", secret: true,
               example: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" },
             { id: "url", label: "Miniflux URL", format: "url", default: "https://miniflux.example.org",
               help: "The address of your Miniflux instance. It must start with https://, except "
                 + "http://localhost:8080 when Miniflux runs on this same machine, or an http:// address on your local "
                 + "network when Conector runs with CONECTOR_ALLOW_PRIVATE_HTTP=1." }],
    keyUrl: "https://miniflux.app/docs/api.html",
    help: "1) In Miniflux click your avatar → “Settings” → “API Keys”. 2) Click “Add an API key”, enter a name and " +
      + "click “Confirm”. 3) Copy the key: it is shown only once. If you use your own instance, the link below points " +
      + "to miniflux.app: open the same menu on your server.",
    test: { path: "/me", account: (d) => d?.username ?? d?.full_name ?? d?.email },
    examples: "Examples: GET /me (your account), GET /feeds (your feeds), GET /entries?status=unread (unread items), "
      + "GET /entries?starred=true (starred items), POST /feeds (add a feed), POST /entries/{id}/star (star an item).",
  },
];