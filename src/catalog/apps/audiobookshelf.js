// Audiobookshelf is a self-hosted audiobook and podcast server: its REST API lives on the same address as the web
// interface under /api (by default it also answers under /audiobookshelf, its ROUTER_BASE_PATH, for reverse proxies that
// serve it from a folder) and authenticates with an API key (“Settings” → “API Keys”, Audiobookshelf 2.26 or later),
// sent as a Bearer token. The older per-user API token, shown today as the “Legacy API Token”, works the same way but is
// deprecated. GET /me, GET /users and GET /users/{id} include that legacy token (“token”), which never expires, in their
// answers. Every id is a UUID. The docs at api.audiobookshelf.org describe the routes but are no longer maintained (they
// predate API keys).
export default [
  {
    id: "audiobookshelf", name: "Audiobookshelf", category: "media",
    description: "Audiobooks, podcasts and listening progress of your Audiobookshelf",
    website: "https://audiobookshelf.org", docs: "https://api.audiobookshelf.org/",
    logo: { simpleIcons: "audiobookshelf" },
    baseUrl: "{url}/api",
    auth: { type: "bearer" },
    fields: [{ id: "url", label: "Audiobookshelf URL", format: "url", default: "http://localhost:13378",
               example: "https://example.invalid",
               help: "The address you open Audiobookshelf at, with its port and without /api (e.g. "
                 + "https://abs.example.com, or https://example.com/audiobookshelf when it is served from that folder). "
                 + "It must start with https://, except http://localhost:13378 when Audiobookshelf runs on this same "
                 + "machine, or an http:// address on your local network when Conector runs with "
                 + "CONECTOR_ALLOW_PRIVATE_HTTP=1." },
             { id: "token", label: "API key", secret: true, example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9…" }],
    keyUrl: "https://audiobookshelf.org/docs/documentation/server-management/api-keys/",
    help: "1) In Audiobookshelf, signed in as an administrator (only they can create API keys), click the gear icon "
      + "(“Settings”) at the top right and open “API Keys” in the left menu. 2) Click “Add API Key”, type a “Name” (e.g. "
      + "Conector), leave “Expires in (seconds)” empty for a key that doesn't expire, pick in “Act on behalf of user” the "
      + "user whose libraries and progress agents will use, and click “Submit”. 3) Copy the key: it is shown only once. "
      + "4) Paste it here, together with the address you open Audiobookshelf at. The key acts as that user: agents can "
      + "read and change what the user can (for an administrator, also the users and libraries), and Audiobookshelf "
      + "shows them the user's “Legacy API Token” too (in GET /me). The bin icon next to the key in “API Keys” revokes "
      + "it (the pencil disables it). Before version 2.26 there are no API keys: use the token an administrator finds "
      + "in “Settings” → “Users” → the user.",
    // A wrong address (e.g. one ending in /api, or a page copied from the browser) answers 404 with an HTML error page.
    test: { path: "/me", acceptStatus: [404], account: (d) => d?.username,
            validate: (d) => {
              if (typeof d?.id !== "string" || typeof d?.username !== "string" || !Array.isArray(d?.mediaProgress)
                || typeof d?.permissions !== "object") {
                throw new Error("Audiobookshelf: this URL does not answer like the Audiobookshelf API (use the address you "
                  + "open Audiobookshelf at, without /api)");
              }
            } },
    examples: "Books and podcasts are the items of a library: start with GET /libraries. Without limit, GET "
      + "/libraries/{id}/items returns every item: keep limit low and page with page (from 0). Examples: GET /me (your "
      + "account, with your progress on every item), GET /libraries (their ids, and mediaType book or podcast), "
      + "GET /libraries/{id}/items?limit=20&page=0 (the list is in “results”; add sort=addedAt&desc=1 for the newest or "
      + "sort=media.metadata.title), GET /libraries/{id}/search?q=…&limit=10 (books or podcasts, authors, series, "
      + "narrators and tags), GET /items/{id}?expanded=1 (a book with its chapters and files, or a podcast with its "
      + "episodes; include=progress adds yours), GET /me/items-in-progress (what you are listening to), "
      + "GET /me/progress/{itemId} (404 if not started; /me/progress/{itemId}/{episodeId} for a podcast episode), "
      + "PATCH /me/progress/{itemId} {\"isFinished\":true} (or {\"currentTime\":…} in seconds; add /{episodeId} for an "
      + "episode), GET /me/listening-sessions?itemsPerPage=10&page=0 (your listening history, newest first), "
      + "GET /me/listening-stats, GET /libraries/{id}/recent-episodes?limit=10 (the newest unfinished episodes of a "
      + "podcast library), POST /me/item/{itemId}/bookmark {\"time\":120,\"title\":\"…\"}, "
      + "POST /playlists {\"libraryId\":\"…\",\"name\":\"…\",\"items\":[{\"libraryItemId\":\"…\"}]}, "
      + "POST /collections {\"libraryId\":\"…\",\"name\":\"…\",\"books\":[\"…\"]} (users with the update permission). "
      + "Administrators only: POST /libraries/{id}/scan (look for new files), GET /users, GET /users/{id}, "
      + "GET /sessions?itemsPerPage=10&sort=updatedAt&desc=1 (the listening sessions of every user; &user={userId} for "
      + "one), GET /sessions/open (what is being played right now, and by whom).",
  },
];
