// Mealie is a self-hosted recipe manager and meal planner. API uses Bearer token.
export default [
  {
    id: "audiobookshelf", name: "Audiobookshelf", category: "media",
    description: "Audiobookshelf: books, podcasts and listening progress",
    website: "https://audiobookshelf.org", docs: "https://api.audiobookshelf.org/",
    logo: { simpleIcons: "audiobookshelf" },
    baseUrl: "{url}/api",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API token", secret: true,
               example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." },
             { id: "url", label: "Audiobookshelf URL", format: "url", default: "http://localhost:8000",
               help: "The address of your Audiobookshelf instance. It must start with https://, except "
                 + "http://localhost:8000 when Audiobookshelf runs on this same machine, or an http:// address on your local "
                 + "network when Conector runs with CONECTOR_ALLOW_PRIVATE_HTTP=1." }],
    keyUrl: "https://audiobookshelf.org/docs/api/",
    help: "1) In Audiobookshelf click your avatar → Settings → API Tokens. 2) Click “+ New API Token”, enter a name and click “Save”. "
      + "3) Copy the token: it is shown only once. If you use your own instance, the link below points to audiobookshelf.org: open "
      + "the same menu on your server.",
    test: { path: "/me", account: (d) => d?.username ?? d?.id },
    examples: "Examples: GET /me (your account), GET /libraries (your libraries), GET /books (your books), " +
      + "GET /podcasts (your podcasts), GET /users/{userId} (a user), GET /playback/sessions (current playback sessions).",
  },
];