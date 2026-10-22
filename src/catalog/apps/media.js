// Sonarr and Radarr are self-hosted media managers with the same authenticated v3 API shape.
export default [
  {
    id: "sonarr", name: "Sonarr", category: "media",
    description: "Manage TV series, episodes, downloads and calendar events",
    website: "https://sonarr.tv", docs: "https://sonarr.tv/docs/api/", logo: { favicon: "https://sonarr.tv" },
    baseUrl: "{url}/api/v3",
    auth: { type: "header", name: "X-Api-Key" },
    fields: [{ id: "url", label: "Sonarr URL", format: "url", placeholder: "https://sonarr.example.com",
               help: "The address of your Sonarr web interface, including its port if needed, but without /api/v3." },
             { id: "token", label: "API key", secret: true }],
    keyUrl: "https://sonarr.tv/docs/api/",
    help: "1) In Sonarr open “Settings” → “General” and find the “Security” section. 2) Copy the API key. 3) Enter your Sonarr "
      + "web address below (without /api/v3) and paste the key here.",
    test: { path: "/system/status", account: (d) => d?.version ? `Sonarr ${d.version}` : "API key is valid" },
    examples: "Examples: GET /series, GET /series/{id}, POST /series {…} (add a series), GET /calendar, GET /queue, "
      + "GET /wanted/missing, POST /command {\"name\": \"EpisodeSearch\", \"episodeIds\": [123]}.",
  },
  {
    id: "radarr", name: "Radarr", category: "media",
    description: "Manage movies, downloads, collections and calendar events",
    website: "https://radarr.video", docs: "https://radarr.video/docs/api/", logo: { favicon: "https://radarr.video" },
    baseUrl: "{url}/api/v3",
    auth: { type: "header", name: "X-Api-Key" },
    fields: [{ id: "url", label: "Radarr URL", format: "url", placeholder: "https://radarr.example.com",
               help: "The address of your Radarr web interface, including its port if needed, but without /api/v3." },
             { id: "token", label: "API key", secret: true }],
    keyUrl: "https://radarr.video/docs/api/",
    help: "1) In Radarr open “Settings” → “General” and find the “Security” section. 2) Copy the API key. 3) Enter your Radarr "
      + "web address below (without /api/v3) and paste the key here.",
    test: { path: "/system/status", account: (d) => d?.version ? `Radarr ${d.version}` : "API key is valid" },
    examples: "Examples: GET /movie, GET /movie/{id}, POST /movie {…} (add a movie), GET /calendar, GET /queue, "
      + "GET /wanted/missing, POST /command {\"name\": \"MoviesSearch\", \"movieIds\": [123]}.",
  },
];
