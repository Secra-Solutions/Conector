// Miniflux is a self-hosted RSS reader (also offered as a hosted service at reader.miniflux.app): its REST API lives on the
// same address as the web interface under /v1 and authenticates with an API key from the settings, sent in the
// X-Auth-Token header.
export default [
  {
    id: "miniflux", name: "Miniflux", category: "productivity",
    description: "Unread entries, starred items and feeds of your Miniflux",
    website: "https://miniflux.app", docs: "https://miniflux.app/docs/api.html",
    // Simple Icons has no Miniflux icon.
    logo: { favicon: "https://miniflux.app" },
    baseUrl: "{url}/v1",
    auth: { type: "header", name: "X-Auth-Token" },
    fields: [{ id: "url", label: "Miniflux URL", format: "url", default: "http://localhost:8080", example: "https://example.invalid",
               help: "The address you open Miniflux at, without /v1 (e.g. https://reader.miniflux.app for the hosted service, or "
                 + "https://example.com/miniflux when it is served from a folder). It must start with https://, except "
                 + "http://localhost:8080 when Miniflux runs on this same machine, or an http:// address on your local "
                 + "network when Conector runs with CONECTOR_ALLOW_PRIVATE_HTTP=1." },
             { id: "token", label: "API key", secret: true }],
    keyUrl: "https://miniflux.app/docs/api.html#authentication",
    help: "1) In Miniflux open “Settings” in the top menu and then “API Keys”. 2) Click “Create a new API key”, type an "
      + "“API Key Label” (e.g. Conector) and click “Save”. 3) Copy the “Token” of the new key from the list (it stays "
      + "visible there, and “Remove” revokes it). 4) Paste it here, together with the address you open Miniflux at. The key "
      + "acts as your user: agents can read and change your feeds and entries (and, for an administrator, the other users).",
    // A wrong address (e.g. one copied from the browser, ending in /unread) redirects to the sign-in page, which answers
    // 200; one ending in /v1 answers 404.
    test: { path: "/me", acceptStatus: [404], account: (d) => d?.username,
            validate: (d) => {
              if (!Number.isInteger(d?.id) || typeof d?.username !== "string") {
                throw new Error("Miniflux: this URL does not answer like the Miniflux API (use the address you open Miniflux "
                  + "at, without /v1)");
              }
            } },
    examples: "Each entry comes with its full content and the settings of its feed (several KB), and without limit GET /entries "
      + "returns every match: keep limit low and page with offset. Examples: GET /me, GET /feeds, GET /categories, "
      + "GET /feeds/counters (unread entries per feed), GET /entries?status=unread&limit=3&order=published_at&direction=desc, "
      + "GET /entries?starred=true&limit=3, GET /entries?search=…&limit=3, GET /feeds/{id}/entries?status=unread&limit=3, "
      + "GET /entries/{id}, POST /discover {\"url\":\"https://example.com\"} (finds the feeds of a site), "
      + "POST /feeds {\"feed_url\":\"https://example.com/feed.xml\",\"category_id\":1} (category_id is optional), "
      + "PUT /entries {\"entry_ids\":[1,2],\"status\":\"read\"} (or \"unread\"), "
      + "PUT /entries {\"entry_ids\":[1],\"starred\":true} (Miniflux 2.3.2 or later; on older versions "
      + "PUT /entries/{id}/bookmark toggles the star), PUT /feeds/{id}/mark-all-as-read, PUT /feeds/{id}/refresh.",
  },
];
