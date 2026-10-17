// Nextcloud's OCS API lives under /ocs/v2.php on the same host as the web UI and rejects
// requests without the OCS-APIRequest header; the OpenAPI spec documents that header on every
// OCS route, so it is sent unconditionally. format=json keeps OCS from answering in XML.
export default [
  {
    id: "nextcloud", name: "Nextcloud", category: "productivity",
    description: "Users, capabilities, shares and group management of your Nextcloud",
    website: "https://nextcloud.com", docs: "https://docs.nextcloud.com/server/latest/developer_manual/client_apis/",
    logo: { simpleIcons: "nextcloud" },
    baseUrl: "{url}/ocs/v2.php",
    auth: { type: "basic", usernameField: "username", passwordField: "app_password" },
    headers: { "OCS-APIRequest": "true" },
    query: { format: "json" },
    fields: [{ id: "url", label: "Nextcloud URL", format: "url", default: "http://localhost:8080",
               help: "The address you open Nextcloud at, with its port (default 8080). It must start with https://, except "
                 + "http://localhost:8080 when Nextcloud runs on this same machine, or an http:// address on your local "
                 + "network when Conector runs with CONECTOR_ALLOW_PRIVATE_HTTP=1." },
             { id: "username", label: "Username", default: "admin",
               help: "The Nextcloud account the app password belongs to." },
             { id: "app_password", label: "App password", secret: true }],
    keyUrl: "https://docs.nextcloud.com/server/latest/user_manual/en/settings_devices.html",
    help: "1) In Nextcloud open “Settings” → “Security” → “Devices & sessions”. 2) Scroll to “App passwords” and click "
      + "“Create new app password”. 3) Name it (e.g. Conector) and confirm with your account password — the generated "
      + "password is shown only once. 4) Paste that app password here together with your username and server address. "
      + "App passwords replace your account password for API access and can be revoked from the same page.",
    test: { path: "/cloud/user", account: (d) => d?.ocs?.data?.displayname || d?.ocs?.data?.id },
    examples: "Examples: GET /cloud/capabilities (enabled apps and their version), GET /cloud/user (your account), "
      + "GET /cloud/users (admin only), GET /cloud/groups, GET /cloud/capabilities?format=json. Note that file contents "
      + "are not served by OCS: upload, download and folder listings go through WebDAV at "
      + "/remote.php/dav/files/{username}, which needs its own basic-auth request outside this tool.",
  },
];