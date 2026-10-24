// Sonarr is a self-hosted TV series manager that searches indexers and sends releases to a download client: its REST API
// lives on the same address as the web interface under /api/v3 and authenticates with the instance's API key, sent in
// the X-Api-Key header. Radarr (radarr.js) has the same API shape, so a Radarr address and key would also pass a plain
// status check: the connection test checks the appName in the answer.
export default [
  {
    id: "sonarr", name: "Sonarr", category: "media",
    description: "TV series, episodes, calendar and downloads of your Sonarr",
    website: "https://sonarr.tv", docs: "https://sonarr.tv/docs/api/",
    logo: { simpleIcons: "sonarr" },
    baseUrl: "{url}/api/v3",
    auth: { type: "header", name: "X-Api-Key" },
    fields: [{ id: "url", label: "Sonarr URL", format: "url", default: "http://localhost:8989", example: "https://example.invalid",
               help: "The address you open Sonarr at, with its port and without /api/v3 (e.g. https://sonarr.example.com, or "
                 + "https://example.com/sonarr when it runs behind a reverse proxy with a “URL Base”). It must start with "
                 + "https://, except http://localhost:8989 when Sonarr runs on this same machine, or an http:// address on "
                 + "your local network when Conector runs with CONECTOR_ALLOW_PRIVATE_HTTP=1." },
             { id: "token", label: "API key", secret: true }],
    keyUrl: "https://wiki.servarr.com/sonarr/settings#security",
    help: "1) In Sonarr open “Settings” → “General”. 2) In the “Security” section, click the copy button next to “API Key” "
      + "(the red button next to it generates a new key). 3) Paste it here, together with the address you open Sonarr at. "
      + "Sonarr has a single API key with full access (series, downloads, settings and system), shared with every app "
      + "connected to it (Prowlarr, Overseerr…): generating a new one disconnects all of them.",
    // A wrong path under the address (e.g. one copied from the browser, ending in /series) answers 200 with the web app's
    // HTML; one ending in /api/v3 answers 404 with an empty body; Radarr answers like Sonarr with another appName.
    // The instance name always starts or ends with "Sonarr" (e.g. "Sonarr 4K"): shown when it isn't the default one.
    test: { path: "/system/status", acceptStatus: [404],
            account: (d) => (d.instanceName && d.instanceName !== "Sonarr"
              ? `${d.instanceName} (Sonarr ${d.version})` : `Sonarr ${d.version}`),
            validate: (d) => {
              if (d?.appName === "Sonarr") return;
              throw new Error(typeof d?.appName === "string" && d.appName
                ? `Sonarr: this address is ${d.appName}, not Sonarr (use the address and API key of your Sonarr)`
                : "Sonarr: this URL does not answer like the Sonarr API (use the address you open Sonarr at, without /api/v3)");
            } },
    examples: "GET /series returns every series in full (seasons, images and statistics: 3 to 15 KB each, without paging), "
      + "so in a large library find one with GET /series?tvdbId=… or GET /series/lookup?term=… (series already in Sonarr "
      + "come back with their “id”). Examples: GET /series/{id}, GET /series/lookup?term=the expanse (searches TheTVDB, "
      + "several KB per match, so a common title can be cut off; term=tvdb:280619 for one exact match), "
      + "POST /series {\"tvdbId\":280619,\"title\":\"The Expanse\",\"qualityProfileId\":1,\"rootFolderPath\":\"/tv\","
      + "\"monitored\":true,\"seasonFolder\":true,\"addOptions\":{\"monitor\":\"all\",\"searchForMissingEpisodes\":false}} "
      + "(tvdbId and title from the lookup, qualityProfileId from GET /qualityprofile, a long answer in which only id and "
      + "name matter, rootFolderPath from GET /rootfolder; without monitored and seasonFolder the series is added "
      + "unmonitored and without season folders; monitor: which episodes to monitor, e.g. all, future, missing, existing, "
      + "recent, pilot, firstSeason, lastSeason or none; searchForMissingEpisodes true searches for them right away), "
      + "GET /episode?seriesId={id}&seasonNumber=1 (episode ids; without seasonNumber every episode of the series), "
      + "GET /calendar?start=2026-01-01&end=2026-01-31 (monitored episodes airing in that range, the next two days without "
      + "dates; unmonitored=true adds the rest, includeSeries=true adds the whole series to each episode), GET /queue "
      + "(downloads in progress), GET /wanted/missing?pageSize=20 (aired monitored episodes without a file, newest first), "
      + "GET /history?pageSize=20 (these lists are paginated: page, pageSize and totalRecords), "
      + "POST /command {\"name\":\"EpisodeSearch\",\"episodeIds\":[123]} or {\"name\":\"SeriesSearch\",\"seriesId\":1} "
      + "(searches the indexers; GET /command/{id} for its status), GET /health.",
  },
];
