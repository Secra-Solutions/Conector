// Jellyfin is a self-hosted media server: its API lives on the same address as the web interface
// (no /api suffix) and authenticates with an API key created in the dashboard, sent as the
// MediaBrowser Token authorization header (current servers reject the legacy X-Emby-Token header and api_key parameter).
export default [
  {
    id: "jellyfin", name: "Jellyfin", category: "media",
    description: "Search the library, sessions and playlists of your Jellyfin",
    website: "https://jellyfin.org", docs: "https://api.jellyfin.org/", logo: { simpleIcons: "jellyfin" },
    baseUrl: "{url}",
    // MediaBrowser Token="<key>" needs a closing quote, which a bare prefix can't express.
    auth: { type: "custom", apply: (c) => ({ headers: { Authorization: `MediaBrowser Token="${c.token}"` } }) },
    fields: [{ id: "url", label: "Jellyfin URL", format: "url", default: "http://localhost:8096", example: "https://example.invalid",
               help: "The address you open Jellyfin at, with its port and without /web (e.g. https://jellyfin.example.com). "
                 + "It must start with https://, except http://localhost:8096 when Jellyfin runs on this same machine, or an "
                 + "http:// address on your local network when Conector runs with CONECTOR_ALLOW_PRIVATE_HTTP=1." },
             { id: "token", label: "API key", secret: true }],
    help: "1) In Jellyfin, signed in as an administrator, open “Dashboard” and go to “Advanced” → “API Keys”. 2) Click "
      + "“New API Key”, enter an “App name” (e.g. Conector) and click “Create”. 3) Copy the new key from the list and paste "
      + "it here with your server's address. An API key can't be limited: it has administrator access to the whole server "
      + "(every user and library). “Revoke” in the same list removes it.",
    test: { path: "/System/Info", account: (d) => `${d.ServerName} (Jellyfin ${d.Version})`,
            validate: (d) => {
              if (!d?.Version) {
                throw new Error("Jellyfin: this URL does not answer like the Jellyfin API (use the address you open Jellyfin "
                  + "at, without /web)");
              }
            } },
    examples: "With an API key, endpoints that act for a user need userId (an Id from GET /Users). Examples: GET /System/Info, "
      + "GET /Users, GET /Items?Recursive=true&IncludeItemTypes=Movie&searchTerm=…&Limit=20 (every library, no userId "
      + "needed), GET /Items/{itemId}?userId=…, GET /Items/Latest?userId=…, GET /Sessions (what is playing now), "
      + "GET /Items?Recursive=true&IncludeItemTypes=Playlist (the playlists), GET /Playlists/{id}/Items?userId=…, "
      + "POST /Playlists {\"Name\": \"…\", \"Ids\": [\"…\"], \"UserId\": \"…\"}, POST /Playlists/{id}/Items?ids=…&userId=….",
  },
];
