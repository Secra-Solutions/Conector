// Linkding is a self-hosted bookmark manager with a token-authenticated REST API.
export default [
  {
    id: "linkding", name: "Linkding", category: "productivity",
    description: "Save, search and tag bookmarks in your Linkding instance",
    website: "https://linkding.link", docs: "https://linkding.link/api/", logo: { favicon: "https://linkding.link" },
    baseUrl: "{url}/api",
    auth: { type: "header", name: "Authorization", prefix: "Token " },
    fields: [{ id: "token", label: "API token", secret: true },
             { id: "url", label: "Linkding URL", format: "url",
               help: "Use the root URL of your Linkding instance, without /api." }],
    help: "1) Sign in to your Linkding instance. 2) Open “Settings” → “Integrations” and copy the API token. "
      + "3) Enter your instance's root URL below (without /api) and paste the token.",
    test: { path: "/bookmarks/", query: { limit: 1 }, message: "API token is valid" },
    examples: "Examples: GET /bookmarks/?q=…&limit=20, GET /bookmarks/{id}/, GET /tags/, "
      + "POST /bookmarks/ {\"url\": \"https://example.com\", \"tag_names\": [\"reading\"]}, "
      + "PATCH /bookmarks/{id}/, POST /bookmarks/{id}/archive/, DELETE /bookmarks/{id}/.",
  },
];
