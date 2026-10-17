// Nextcloud is a self-hosted file sync and collaboration server. Two APIs live on the same address as the web interface,
// both with the login and an app password (HTTP basic auth): OCS under /ocs/v2.php (users, groups, shares, capabilities,
// search), which rejects requests without the OCS-APIRequest header and answers in XML unless format=json is asked for,
// and WebDAV under /remote.php/dav (file contents), which ignores both. The base URL is the instance itself so agents
// reach both with relative paths.
export default [
  {
    id: "nextcloud", name: "Nextcloud", category: "productivity",
    description: "Files, shares, users and groups of your Nextcloud",
    website: "https://nextcloud.com", docs: "https://docs.nextcloud.com/server/latest/developer_manual/client_apis/",
    logo: { simpleIcons: "nextcloud" },
    baseUrl: "{url}",
    auth: { type: "basic", usernameField: "username", passwordField: "app_password" },
    headers: { "OCS-APIRequest": "true" },
    query: { format: "json" },
    fields: [{ id: "url", label: "Nextcloud URL", format: "url", placeholder: "https://cloud.example.com",
               example: "https://example.invalid",
               help: "The address you open Nextcloud at, without /index.php, /apps/… or /ocs (e.g. https://cloud.example.com, "
                 + "or https://example.com/nextcloud when it is installed in a folder). It must start with https://, except "
                 + "http://localhost:<port> when Nextcloud runs on this same machine, or an http:// address on your local "
                 + "network when Conector runs with CONECTOR_ALLOW_PRIVATE_HTTP=1." },
             { id: "username", label: "Login",
               help: "The “Login” shown next to the new app password (your account name, not your display name)." },
             { id: "app_password", label: "App password", secret: true }],
    keyUrl: "https://docs.nextcloud.com/server/latest/user_manual/en/session_management.html",
    help: "1) In Nextcloud click your avatar (top right), open “Settings” and then “Security” in the left menu. 2) At the "
      + "bottom of “Devices & sessions”, type a name in “App name” (e.g. Conector) and click “Create new app password”; "
      + "confirm with your account password when asked. 3) Copy the “Login” and the “Password” from “New app password”: "
      + "the password is shown only once. 4) Paste them here, together with your Nextcloud address. The app password acts "
      + "as your account (it is the only kind of password that works with two-factor authentication on) and can be revoked "
      + "from “Devices & sessions”.",
    // A wrong address (e.g. one copied from the browser, ending in /apps/files) answers 404 with an empty body.
    test: { path: "/ocs/v2.php/cloud/user", acceptStatus: [404], account: (d) => d?.ocs?.data?.displayname || d?.ocs?.data?.id,
            validate: (d) => {
              if (!d?.ocs?.data?.id) {
                throw new Error("Nextcloud: this URL does not answer like the Nextcloud API (use the address you open "
                  + "Nextcloud at, without /index.php, /apps/… or /ocs)");
              }
            } },
    examples: "OCS API (JSON): GET /ocs/v2.php/cloud/user (your account: its “id” is the {user} of file paths), "
      + "GET /ocs/v2.php/cloud/capabilities (version and enabled features), "
      + "GET /ocs/v2.php/search/providers/files/search?term=… (find files by name), "
      + "GET /ocs/v2.php/apps/files_sharing/api/v1/shares (add ?shared_with_me=true for the ones shared with you), "
      + "POST /ocs/v2.php/apps/files_sharing/api/v1/shares {\"path\":\"/Documents/report.pdf\",\"shareType\":3} (public "
      + "link; shareType 0 with \"shareWith\":\"<user>\" shares with a user), GET /ocs/v2.php/cloud/users and "
      + "GET /ocs/v2.php/cloud/groups (administrators and group admins only). Files (WebDAV): "
      + "GET /remote.php/dav/files/{user}/Documents/notes.txt (download; binary files come back as base64), "
      + "PUT /remote.php/dav/files/{user}/Documents/notes.txt with body_base64 (upload or overwrite; the folder must exist), "
      + "DELETE /remote.php/dav/files/{user}/Documents/notes.txt. Listing folders (PROPFIND) and creating them (MKCOL) are "
      + "not possible with this tool: search the files instead.",
  },
];
