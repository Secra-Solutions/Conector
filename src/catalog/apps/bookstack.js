// BookStack is a self-hosted wiki (shelves, books, chapters and pages): its REST API lives on the same address as the web
// interface under /api and authenticates with an API token, sent as "Authorization: Token <token_id>:<token_secret>". The
// web interface shows the “Token ID” and the “Token Secret” separately, so they are asked for separately and joined here.
// Only roles with the “Access system API” permission can use the API (by default only Admin). The API has no endpoint for
// the token's own user, so the connection test lists one book, which works on every BookStack version.
export default [
  {
    id: "bookstack", name: "BookStack", category: "productivity",
    description: "Books, chapters and pages of your BookStack wiki",
    website: "https://www.bookstackapp.com", docs: "https://demo.bookstackapp.com/api/docs",
    logo: { simpleIcons: "bookstack" },
    baseUrl: "{url}/api",
    auth: { type: "custom", apply: (c) => ({ headers: { Authorization: `Token ${c.token_id}:${c.token_secret}` } }) },
    fields: [{ id: "url", label: "BookStack URL", format: "url", placeholder: "https://wiki.example.com",
               example: "https://example.invalid",
               help: "The address you open BookStack at, without /api (e.g. https://wiki.example.com, or "
                 + "https://example.com/bookstack when it is served from a folder). It must start with https://, except "
                 + "http://localhost:<port> when BookStack runs on this same machine, or an http:// address on your local "
                 + "network when Conector runs with CONECTOR_ALLOW_PRIVATE_HTTP=1." },
             { id: "token_id", label: "Token ID",
               help: "The “Token ID” shown with the secret (it also stays visible in your list of API tokens)." },
             { id: "token_secret", label: "Token Secret", secret: true }],
    keyUrl: "https://demo.bookstackapp.com/api/docs#authentication",
    help: "1) In BookStack click your name (top right) → “My Account” → “Access & Security”. If there is no “API Tokens” "
      + "section, your role lacks the “Access system API” permission (by default only Admin has it): an administrator can "
      + "tick it in “Settings” → “Roles” → your role → “System Permissions”. 2) Under “API Tokens” click “Create Token”, "
      + "type a “Name” (e.g. Conector), leave “Expiry Date” empty (the token then lasts 100 years) or pick a date, and click "
      + "“Save”. 3) Copy the “Token ID” and the “Token Secret”: the secret is shown only once. 4) Paste them here, together "
      + "with the address you open BookStack at. The token acts as your user: agents can read and change what you can. "
      + "To revoke it, click “Edit” next to it under “API Tokens” and then “Delete Token”. The link below opens the API "
      + "documentation of BookStack's demo: your own instance has it at <your address>/api/docs.",
    // A wrong address (e.g. one copied from the browser, ending in /books/…, or one ending in /api) gets BookStack's
    // "Page Not Found" HTML page with a 404, or another app's answer.
    test: { path: "/books", query: { count: 1 }, acceptStatus: [404], message: "API token is valid",
            validate: (d) => {
              if (!Array.isArray(d?.data) || typeof d?.total !== "number") {
                throw new Error("BookStack: this URL does not answer like the BookStack API (use the address you open "
                  + "BookStack at, without /api)");
              }
            } },
    examples: "Lists come as {\"data\": […], \"total\": n} with 100 items by default: page with count (at most 500) and "
      + "offset, sort with sort=-updated_at and filter with filter[field]=value (filter[name:like]=%vpn% for part of a "
      + "name). Examples: GET /books, GET /books/{id} (its chapters and pages in “contents”), "
      + "GET /chapters?filter[book_id]={id}, GET /chapters/{id} (with its pages), GET /pages?filter[book_id]={id} (or "
      + "filter[chapter_id]={id}), GET /pages/{id} (the content as html, and as markdown when it was written in the "
      + "Markdown editor), GET /search?query=vpn (shelves, books, chapters and pages; BookStack's search syntax works, "
      + "e.g. vpn {type:page} or [category=policy]), POST /books {\"name\":\"…\",\"description_html\":\"<p>…</p>\"}, "
      + "POST /chapters {\"book_id\":1,\"name\":\"…\"}, POST /pages {\"book_id\":1,\"name\":\"…\",\"markdown\":\"# …\"} "
      + "(chapter_id instead of book_id puts it in a chapter; html instead of markdown; tags: [{\"name\":\"category\","
      + "\"value\":\"policy\"}]), PUT /pages/{id} {\"markdown\":\"…\"} (or html, or name to rename it), "
      + "DELETE /pages/{id} (moves it to the recycle bin), GET /shelves, GET /system (version).",
  },
];
