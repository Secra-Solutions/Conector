// Immich is a self-hosted photo and video library: its REST API lives on the same address as the
// web interface under /api, authenticates with a key created in the account settings and sent in
// the x-api-key header.
export default [
  {
    id: "immich", name: "Immich", category: "media",
    description: "Search the photos, videos and albums of your Immich",
    website: "https://immich.app", docs: "https://immich.app/docs/api/", logo: { simpleIcons: "immich" },
    baseUrl: "{url}/api",
    auth: { type: "header", name: "x-api-key" },
    fields: [{ id: "token", label: "API key", secret: true },
             { id: "url", label: "Immich URL", format: "url", default: "http://localhost:2283",
               help: "The address you open Immich at, with its port and without /api. It must start with https://, except "
                 + "http://localhost:2283 when Immich runs on this same machine, or an http:// address on your local "
                 + "network when Conector runs with CONECTOR_ALLOW_PRIVATE_HTTP=1." }],
    keyUrl: "https://immich.app/account/api-keys",
    help: "1) In Immich click your avatar and open “Account settings”. 2) Under “API Keys” click “New API Key”, give it a "
      + "name (e.g. Conector) and confirm. 3) Copy the key: it is shown only once. 4) Paste your instance's address "
      + "(without /api) and the key here. The key acts as your user: agents can read and change what that user can.",
    test: { path: "/users/me", account: (d) => d.email },
    examples: "Examples: GET /users/me, GET /users, GET /albums, POST /search/metadata {\"page\":1,\"size\":100,"
      + "\"type\":\"IMAGE\"}, GET /albums/{id}, POST /albums {\"albumName\":\"…\"}.",
  },
];