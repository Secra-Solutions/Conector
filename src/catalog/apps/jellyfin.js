// Jellyfin is a self-hosted media server: its API lives on the same address as the web interface
// (no /api suffix) and authenticates with an API key created in the dashboard, sent as the
// MediaBrowser Token authorization header.
export default [
  {
    id: "jellyfin", name: "Jellyfin", category: "media",
    description: "Search the library, sessions and playlists of your Jellyfin",
    website: "https://jellyfin.org", docs: "https://api.jellyfin.org/", logo: { simpleIcons: "jellyfin" },
    baseUrl: "{url}",
    // MediaBrowser Token="<key>" needs a closing quote, which a bare prefix can't express.
    auth: { type: "custom", apply: (c) => ({ headers: { Authorization: `MediaBrowser Token="${c.token}"` } }) },
    fields: [{ id: "token", label: "API key", secret: true },
             { id: "url", label: "Jellyfin URL", format: "url", default: "http://localhost:8096",
               help: "The address you open Jellyfin at, with its port (default 8096). It must start with https://, except "
                 + "http://localhost:8096 when Jellyfin runs on this same machine, or an http:// address on your local "
                 + "network when Conector runs with CONECTOR_ALLOW_PRIVATE_HTTP=1." }],
    keyUrl: "https://jellyfin.org/docs/general/administration/api-keys/",
    help: "1) In Jellyfin open “Dashboard” and go to “Advanced” → “API Keys”. 2) Click “+”, give the key a name "
      + "(e.g. Conector) and confirm. 3) Copy the key: it is shown only once, and paste it here with your instance's "
      + "address. The key acts as its own user; give the API key access to the users and libraries you want reachable.",
    test: { path: "/System/Info", account: (d) => `${d.ServerName} ${d.Version}` },
    examples: "Examples: GET /System/Info (server name and version), GET /Items?Recursive=true&IncludeItemTypes=Movie,"
      + " GET /Items/{itemId}, GET /Sessions (what is playing now), GET /Users, GET /Playlists, "
      + "POST /Playlists {\"Name\": \"…\", \"Ids\": [\"…\"]}.",
  },
];