// Karakeep (formerly Hoarder) is a self-hosted bookmark manager for links, notes and files, also offered as a hosted
// service (Karakeep Cloud, cloud.karakeep.app): its REST API lives on the same address as the web interface under /api/v1
// and authenticates with an API key from the user settings, sent as a Bearer token. Since Karakeep 0.32 a key can be
// limited to some resources (“Limited scopes”); the connection test needs “Read” on “User account”.
export default [
  {
    id: "karakeep", name: "Karakeep", category: "productivity",
    description: "Bookmarks, notes, lists and tags of your Karakeep",
    website: "https://karakeep.app", docs: "https://docs.karakeep.app/api/karakeep-api/",
    // Simple Icons 15.22 (the installed version) has no Karakeep icon.
    logo: { favicon: "https://karakeep.app" },
    baseUrl: "{url}/api/v1",
    auth: { type: "bearer" },
    fields: [{ id: "url", label: "Karakeep URL", format: "url", placeholder: "https://karakeep.example.com",
               example: "https://example.invalid",
               help: "The address you open Karakeep at, without /api/v1 (e.g. https://cloud.karakeep.app for Karakeep Cloud, "
                 + "or https://karakeep.example.com). It must start with https://, except http://localhost:3000 when "
                 + "Karakeep runs on this same machine, or an http:// address on your local network when Conector runs with "
                 + "CONECTOR_ALLOW_PRIVATE_HTTP=1." },
             { id: "token", label: "API key", secret: true }],
    help: "1) In Karakeep click your avatar (top right) → “User Settings” → “API Keys”. 2) Click “New API Key” and type a "
      + "“Name” (e.g. Conector). 3) Under “Scopes” leave “Full access”, or choose “Limited scopes” and pick “Read” or "
      + "“Read/write” for what agents may use (e.g. “Bookmarks”, “Lists” and “Tags”), with at least “Read” for “User "
      + "account”, which the connection test needs. 4) Click “Create” and copy the key: it is shown only once. 5) Paste it "
      + "here, together with the address you open Karakeep at. The key acts as your user (with “Full access”, an "
      + "administrator's key also reaches the admin endpoints); the bin icon next to it under “API Keys” revokes it.",
    // A wrong address answers 404 (e.g. one ending in /api/v1, or a page copied from the browser such as
    // /dashboard/bookmarks) or, on another app, 200 with a web page or other JSON.
    test: { path: "/users/me", acceptStatus: [404], account: (d) => d.email || d.name,
            validate: (d) => {
              if (typeof d?.id !== "string" || typeof d?.email !== "string") {
                throw new Error("Karakeep: this URL does not answer like the Karakeep API (use the address you open "
                  + "Karakeep at, e.g. https://cloud.karakeep.app, without /api/v1)");
              }
            } },
    examples: "Lists come in pages: limit (at most 100) and cursor (the “nextCursor” of the previous answer, null on the "
      + "last page). Each bookmark is about 1 KB, plus the whole text of notes; includeContent=true adds the saved page's "
      + "HTML. Examples: GET /users/me, "
      + "GET /bookmarks?limit=20 (newest first, archived ones included; filters: archived=false, favourited=true), "
      + "GET /bookmarks/search?q=…&limit=20 (q also takes qualifiers such as #tag, list:Reading, is:fav, is:archived, "
      + "url:example.com), GET /bookmarks/{id}, GET /bookmarks/{id}/content (Karakeep 0.34 or later: the readable text "
      + "as Markdown, up to 12,000 characters per call; continue with cursor=<nextCursor>), "
      + "GET /bookmarks/check-url?url=https://…, POST /bookmarks {\"type\":\"link\",\"url\":\"https://…\"} (a URL that is "
      + "already saved returns that bookmark with \"alreadyExists\":true), POST /bookmarks {\"type\":\"text\","
      + "\"text\":\"…\",\"title\":\"…\"} (a note), PATCH /bookmarks/{id} {\"favourited\":true,\"archived\":true,"
      + "\"title\":\"…\",\"note\":\"…\"}, DELETE /bookmarks/{id}, POST /bookmarks/{id}/tags "
      + "{\"tags\":[{\"tagName\":\"reading\"}]} (creates the tags that don't exist; or {\"tagId\":\"…\"}), "
      + "DELETE /bookmarks/{id}/tags {\"tags\":[{\"tagName\":\"reading\"}]}, GET /tags (with numBookmarks; "
      + "?nameContains=… filters), GET /tags/{id}/bookmarks?limit=20, GET /lists, POST /lists {\"name\":\"…\","
      + "\"icon\":\"…\"} (icon, an emoji, is required; add \"type\":\"smart\",\"query\":\"#tag is:fav\" for a smart list), "
      + "PUT /lists/{listId}/bookmarks/{bookmarkId} (adds a bookmark to a list), "
      + "DELETE /lists/{listId}/bookmarks/{bookmarkId}, GET /lists/{id}/bookmarks?limit=20, GET /highlights.",
  },
];
