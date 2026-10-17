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
             { id: "url", label: "Paperless-ngx URL", format: "url", default: "http://localhost:8000",
               help: "The address you open Paperless-ngx at, with its port and without /api (e.g. "
                 + "https://paperless.example.com). It must start with https://, except http://localhost:8000 when "
                 + "Paperless-ngx runs on this same machine, or an http:// address on your local network when Conector "
                 + "runs with CONECTOR_ALLOW_PRIVATE_HTTP=1." }],
    keyUrl: "https://docs.paperless-ngx.com/api/#authorization",
    help: "1) In Paperless-ngx click your username in the top right and open “My Profile”. 2) Click the circular arrow "
      + "button next to the API token to create (or re-create) it. 3) Copy the token and paste it here, together with your "
      + "instance's address (without /api). The token acts as your user: agents can read and change what that user can.",
    test: { path: "/tags/", query: { page_size: 1 }, message: "API token is valid" },
    examples: "Examples: GET /documents/?query=…&page_size=20, GET /documents/?title_search=…, GET /documents/{id}/ "
      + "(its “content” is the extracted text), GET /documents/{id}/download/, GET /tags/, GET /correspondents/, "
      + "GET /document_types/, POST /tags/ {\"name\":\"…\"}.",
  },
];