// Radarr is a self-hosted movie manager that searches indexers and sends releases to a download client: its REST API
// lives on the same address as the web interface under /api/v3 (Radarr 6 still uses v3) and authenticates with the
// instance's API key, sent in the X-Api-Key header. Sonarr (sonarr.js) has the same API shape, so a Sonarr address and
// key would also pass a plain status check: the connection test checks the appName in the answer.
export default [
  {
    id: "radarr", name: "Radarr", category: "media",
    description: "Movies, release calendar and downloads of your Radarr",
    website: "https://radarr.video", docs: "https://radarr.video/docs/api/",
    logo: { simpleIcons: "radarr" },
    baseUrl: "{url}/api/v3",
    auth: { type: "header", name: "X-Api-Key" },
    fields: [{ id: "url", label: "Radarr URL", format: "url", default: "http://localhost:7878", example: "https://example.invalid",
               help: "The address you open Radarr at, with its port and without /api/v3 (e.g. https://radarr.example.com, or "
                 + "https://example.com/radarr when it runs behind a reverse proxy with a “URL Base”). It must start with "
                 + "https://, except http://localhost:7878 when Radarr runs on this same machine, or an http:// address on "
                 + "your local network when Conector runs with CONECTOR_ALLOW_PRIVATE_HTTP=1." },
             { id: "token", label: "API key", secret: true }],
    keyUrl: "https://wiki.servarr.com/radarr/settings#security",
    help: "1) In Radarr open “Settings” → “General”. 2) In the “Security” section, click the copy button next to “API Key” "
      + "(the red button next to it generates a new key). 3) Paste it here, together with the address you open Radarr at. "
      + "Radarr has a single API key with full access (movies, downloads, settings and system), shared with every app "
      + "connected to it (Prowlarr, Overseerr…): generating a new one disconnects all of them.",
    // A wrong path under the address (e.g. one copied from the browser, ending in /movies) answers 200 with the web app's
    // HTML; one ending in /api/v3 answers 404 with an empty body; Sonarr answers like Radarr with another appName.
    // The instance name always contains "Radarr" (e.g. "Radarr 4K"): shown when it isn't the default one.
    test: { path: "/system/status", acceptStatus: [404],
            account: (d) => (d.instanceName && d.instanceName !== "Radarr"
              ? `${d.instanceName} (Radarr ${d.version})` : `Radarr ${d.version}`),
            validate: (d) => {
              if (d?.appName === "Radarr") return;
              throw new Error(typeof d?.appName === "string" && d.appName
                ? `Radarr: this address is ${d.appName}, not Radarr (use the address and API key of your Radarr)`
                : "Radarr: this URL does not answer like the Radarr API (use the address you open Radarr at, without /api/v3)");
            } },
    examples: "GET /movie returns every movie in full (images, ratings and file details: about 3 KB each, without paging), "
      + "so in a large library find one with GET /movie?tmdbId=… or GET /movie/lookup?term=… (movies already in Radarr "
      + "come back with their “id”). Examples: GET /movie/{id}, GET /movie/lookup?term=the matrix (searches TMDb: up to "
      + "20 matches of about 3 KB each, so the answer can be cut off; term=tmdb:603 or term=imdb:tt0133093 for one exact "
      + "match), POST /movie {\"tmdbId\":603,\"qualityProfileId\":1,\"rootFolderPath\":\"/movies\",\"monitored\":true,"
      + "\"minimumAvailability\":\"released\",\"addOptions\":{\"searchForMovie\":false}} (tmdbId from the lookup, "
      + "qualityProfileId from GET /qualityprofile, a long answer in which only id and name matter, rootFolderPath from "
      + "GET /rootfolder; minimumAvailability: announced, inCinemas or released; searchForMovie true searches for it right "
      + "away), GET /calendar?start=2026-01-01&end=2026-03-31 (monitored movies with a cinema, digital or physical release "
      + "in that range, the next two days without dates; unmonitored=true adds the rest), GET /queue (downloads in "
      + "progress), GET /wanted/missing?pageSize=20 (monitored movies without a file, also unreleased ones: see "
      + "isAvailable; Radarr 5.6 or later), GET /wanted/cutoff, GET /history?pageSize=20 (these lists are paginated: "
      + "page, pageSize and totalRecords), POST /command {\"name\":\"MoviesSearch\",\"movieIds\":[123]} (searches the "
      + "indexers; GET /command/{id} for its status), GET /collection, GET /health.",
  },
];
