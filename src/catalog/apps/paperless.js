// Paperless-ngx is a self-hosted document archive: its REST API lives on the same address as the web
// interface under /api and authenticates with the API token from the profile, sent as
// "Authorization: Token <token>".
export default [
  {
    id: "paperless", name: "Paperless-ngx", category: "productivity",
    description: "Search the documents, tags and correspondents of your Paperless-ngx",
    website: "https://docs.paperless-ngx.com", docs: "https://docs.paperless-ngx.com/api/",
    logo: { simpleIcons: "paperlessngx" },
    baseUrl: "{url}/api",
    auth: { type: "header", name: "Authorization", prefix: "Token " },
    fields: [{ id: "token", label: "API token", secret: true },
             { id: "url", label: "Paperless-ngx URL", format: "url", default: "http://localhost:8000", example: "https://example.invalid",
               help: "The address you open Paperless-ngx at, with its port and without /api (e.g. "
                 + "https://paperless.example.com). It must start with https://, except http://localhost:8000 when "
                 + "Paperless-ngx runs on this same machine, or an http:// address on your local network when Conector "
                 + "runs with CONECTOR_ALLOW_PRIVATE_HTTP=1." }],
    keyUrl: "https://docs.paperless-ngx.com/api/#authorization",
    help: "1) In Paperless-ngx click your username in the top right and open “My Profile”. 2) Next to “API Auth Token”, "
      + "copy the token. If it is empty, click the circular arrows (“Regenerate auth token”) and confirm with “Yes”: "
      + "regenerating replaces the old token, so anything still using it stops working. 3) Paste it here, together with your "
      + "instance's address (without /api). The token acts as your user: agents can read and change what that user can.",
    // The profile only needs a valid token (/tags/ also needs the "view tags" permission).
    test: { path: "/profile/", message: "API token is valid", account: (d) => d.email || null,
            // A wrong address (e.g. one ending in /api) redirects to the sign-in page, which also answers 200.
            validate: (d) => {
              if (!Array.isArray(d?.social_accounts)) {
                throw new Error("Paperless-ngx: this URL does not answer like the Paperless-ngx API (use the address you open "
                  + "Paperless-ngx at, without /api)");
              }
            } },
    examples: "Examples: GET /documents/?query=…&page_size=20&fields=id,title,created,correspondent,document_type,tags, "
      + "GET /documents/?title_search=…, GET /documents/{id}/ (its “content” is the extracted text), "
      + "GET /documents/{id}/download/ (the file as base64: only small files fit, prefer “content”), GET /tags/, "
      + "GET /correspondents/, GET /document_types/, POST /tags/ {\"name\":\"…\"}, "
      + "POST /documents/bulk_edit/ {\"documents\":[1],\"method\":\"add_tag\",\"parameters\":{\"tag\":2}}, "
      + "PATCH /documents/{id}/ {\"correspondent\":2}.",
  },
];
