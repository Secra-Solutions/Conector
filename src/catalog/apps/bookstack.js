// BookStack is a self-hosted wiki/documentation platform. API uses Token auth:
// Authorization: Token <token_id>:<token_secret> — two fields combined.
export default [
  {
    id: "bookstack", name: "BookStack", category: "productivity",
    description: "Wiki pages, books and chapters on your BookStack instance",
    website: "https://www.bookstackapp.com", docs: "https://demo.bookstackapp.com/api/docs",
    logo: { simpleIcons: "bookstack" },
    baseUrl: "{url}/api",
    // Token ID and secret combined into one header value
    auth: { type: "custom", apply: (c) => ({ headers: { Authorization: "Token " + c.api_key_id + ":" + c.api_key_secret } }) },
    fields: [{ id: "api_key_id", label: "API token ID", secret: true },
             { id: "api_key_secret", label: "API token secret", secret: true },
             { id: "url", label: "BookStack URL", format: "url", default: "https://bookstack.example.com",
               help: "The address of your BookStack instance. It must start with https://, except "
                 + "http://localhost:8080 when BookStack runs on this same machine, or an http:// address on your local "
                 + "network when Conector runs with CONECTOR_ALLOW_PRIVATE_HTTP=1." }],
    keyUrl: "https://www.bookstackapp.com/docs/api",
    help: "1) In BookStack click your avatar → Profile → API Tokens. 2) Click “Create New Token”, enter a name and click “Save”. "
      + "3) Copy the Token ID and Token Secret: both are shown only once. If you use your own instance, the link below points "
      + "to bookstackapp.com: open the same menu on your server.",
    test: { path: "/books?count=1", account: (d) => d?.data?.[0]?.id ?? d?.id },
    examples: "Examples: GET /books (your books), GET /books/{id} (a book), GET /pages?book_id={id} (pages in a book), " +
      + "POST /pages (create a page), GET /search?query={q} (search wiki).",
  },
];