// Immich is a self-hosted photo and video library: its REST API lives on the same address as the
// web interface under /api, authenticates with a key created in the account settings and sent in
// the x-api-key header.
export default [
  {
    id: "immich", name: "Immich", category: "media",
    description: "Search the photos, videos and albums of your Immich",
    website: "https://immich.app", docs: "https://docs.immich.app/api/", logo: { simpleIcons: "immich" },
    baseUrl: "{url}/api",
    auth: { type: "header", name: "x-api-key" },
    fields: [{ id: "url", label: "Immich URL", format: "url", default: "http://localhost:2283", example: "https://example.invalid",
               help: "The address you open Immich at, with its port and without /api. It must start with https://, except "
                 + "http://localhost:2283 when Immich runs on this same machine, or an http:// address on your local "
                 + "network when Conector runs with CONECTOR_ALLOW_PRIVATE_HTTP=1." },
             { id: "token", label: "API key", secret: true }],
    // My Immich asks for the address of your instance once and opens its “API Keys” settings there.
    keyUrl: "https://my.immich.app/user-settings?isOpen=api-keys",
    help: "1) In Immich click your avatar (top right) and open “Account Settings”. 2) Open “API Keys” and click “New API "
      + "Key”. 3) Give it a name (e.g. Conector), tick the permissions agents may use (“Select all” for everything; the "
      + "connection test needs at least user.read) and click “Create”. 4) Copy the key: it is shown only once. 5) Paste "
      + "your instance's address (without /api) and the key here. The key acts as your user, limited to the permissions "
      + "you ticked.",
    test: { path: "/users/me", account: (d) => d.email },
    examples: "Examples: GET /users/me, GET /users, GET /albums, POST /search/metadata {\"page\":1,\"size\":100,"
      + "\"type\":\"IMAGE\"}, GET /albums/{id}, POST /search/metadata {\"albumIds\":[\"…\"]} (the photos of an album), "
      + "POST /albums {\"albumName\":\"…\"}, PUT /albums/{id}/assets {\"ids\":[\"…\"]}.",
  },
];
