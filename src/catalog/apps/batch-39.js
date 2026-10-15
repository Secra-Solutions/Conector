// Batch 39 of the catalog, taken from the Composio catalog: e-signature and documents, bookings and rentals, inventory,
// projects, customer feedback, PDF generation and conversion, transcription, to-do lists, churches, invoicing, CMS and field work.

const count = (d, one, many) => (Array.isArray(d) ? `${d.length} ${d.length === 1 ? one : many}` : null);

export default [
  {
    id: "boloforms", name: "BoloSign (BoloForms)", category: "productivity", description: "E-signature: templates, forms and documents sent for signing",
    website: "https://www.boloforms.com", docs: "https://bolosign-developer-docs.readme.io", logo: { favicon: "https://www.boloforms.com" },
    baseUrl: "https://signature-backend.boloforms.com/api/v1",
    allowedOrigins: ["https://sapi.boloforms.com"],
    headers: (c) => (c.workspace ? { workspaceId: c.workspace } : {}),
    auth: { type: "header", name: "x-api-key" },
    fields: [{ id: "token", label: "API key", secret: true },
             { id: "workspace", label: "Workspace ID (optional)", optional: true, format: "segment",
               help: "Only if your account has several workspaces." }],
    help: "1) In BoloSign open “Settings” → “API Key” and generate the key. 2) Also copy the “Workspace ID” if you use several workspaces.",
    test: { path: "/signature/get-all-forms/v1", message: "API key is valid" },
    examples: "Examples: GET /signature/get-all-forms/v1 (forms and templates), POST https://sapi.boloforms.com/signature/pdf-template-lambda "
      + "{…} (sends a template for signing: each recipient's roleTitle must match a role in the template).",
  },
  {
    id: "bookingmood", name: "Bookingmood", category: "ecommerce", description: "Accommodation and activity bookings: products and reservations",
    website: "https://www.bookingmood.com", docs: "https://www.bookingmood.com/api-reference/authentication", logo: { favicon: "https://www.bookingmood.com" },
    baseUrl: "https://api.bookingmood.com/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) In Bookingmood open the organization settings → “API keys” and create a key. 2) Copy it.",
    test: { path: "/products", query: { limit: 1 }, message: "API key is valid" },
    examples: "Examples: GET /products, GET /bookings?limit=20, GET /calendar_events?…, GET /services, GET /members.",
  },
  {
    id: "booqable", name: "Booqable", category: "ecommerce", description: "Equipment rental: customers, orders, products and stock",
    website: "https://booqable.com", docs: "https://developers.booqable.com", logo: { favicon: "https://booqable.com" },
    baseUrl: "https://{company}.booqable.com/api/4",
    auth: { type: "bearer" },
    fields: [{ id: "company", label: "Your account name", format: "subdomain",
               help: "The part before .booqable.com in your panel address." },
             { id: "token", label: "API key", secret: true }],
    help: "1) In Booqable open “Settings” → “User settings” → “API keys” and create a key. 2) Enter your account name here.",
    test: { path: "/customers", query: { "page[size]": 1 }, message: "API key is valid" },
    examples: "JSON:API format. Examples: GET /customers?page[size]=25, GET /orders?filter[status]=reserved, GET /product_groups, GET /products, "
      + "GET /inventory_levels?filter[from]=…&filter[till]=…, POST /orders {\"data\": {\"type\": \"orders\", \"attributes\": {…}}}.",
  },
  {
    id: "boxhero", name: "BoxHero", category: "ecommerce", description: "Inventory: items, stock by warehouse and movements",
    website: "https://www.boxhero.io", docs: "https://docs-en.boxhero.io/integrations/api", logo: { favicon: "https://www.boxhero.io" },
    baseUrl: "https://rest.boxhero-app.com/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API token", secret: true }],
    help: "1) In BoxHero open “Settings” → “Integrations & API” → “API” and create a token. 2) Copy it.",
    test: { path: "/items", query: { limit: 1 }, message: "Token is valid" },
    examples: "Examples: GET /items?limit=100, GET /items/{id}, GET /locations, GET /transactions?limit=50 (stock in, stock out and adjustments).",
  },
  {
    id: "breeze", name: "Breeze", category: "projects", description: "Project management: boards, cards, stages and time tracking",
    website: "https://www.breeze.pm", docs: "https://www.breeze.pm/api", logo: { favicon: "https://www.breeze.pm" },
    baseUrl: "https://api.breeze.pm",
    auth: { type: "query", name: "api_token" },
    fields: [{ id: "token", label: "API token", secret: true }],
    help: "1) In Breeze open your profile → “Personal settings” → “API token”. 2) Copy the token.",
    test: { path: "/projects.json", message: (d) => count(d, "project", "projects") || "Token is valid" },
    examples: "Examples: GET /projects.json, GET /projects/{id}/cards.json, POST /projects/{id}/cards.json {\"name\": \"…\", \"stage_id\": …}, "
      + "GET /projects/{id}/stages.json, PUT /projects/{id}/cards/{cardId}.json {…}, GET /users.json.",
  },
  {
    id: "bugherd", name: "BugHerd", category: "developer", description: "Visual website feedback: projects, tasks and comments",
    website: "https://bugherd.com", docs: "https://www.bugherd.com/api_v2", logo: { favicon: "https://bugherd.com" },
    baseUrl: "https://www.bugherd.com/api_v2",
    auth: { type: "basic", usernameField: "token", fixedPassword: "x" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) In BugHerd open “Settings” → “General settings” → “API key” (the account owner can see it). 2) Copy the key.",
    test: { path: "/organization.json", account: (d) => d?.organization?.name },
    examples: "Examples: GET /projects.json, GET /projects/{id}/tasks.json?status=backlog, POST /projects/{id}/tasks.json {\"task\": "
      + "{\"description\": \"…\", \"priority\": \"normal\"}}, PUT /projects/{id}/tasks/{taskId}.json {…}, GET /projects/{id}/tasks/{taskId}/"
      + "comments.json, GET /users.json.",
  },
  {
    id: "calendarhero", name: "CalendarHero", category: "productivity", description: "Smart scheduling: meetings, contacts and appointment types",
    website: "https://calendarhero.com", docs: "https://api.calendarhero.com/documentation", logo: { favicon: "https://calendarhero.com" },
    baseUrl: "https://api.calendarhero.com",
    auth: { type: "header", name: "Authorization" },
    fields: [{ id: "token", label: "API token", secret: true }],
    keyUrl: "https://app.calendarhero.com/settings/user#API",
    help: "1) In CalendarHero open “Settings” → “User” → “API”. 2) Copy the token.",
    test: { path: "/user", account: (d) => d?.email || d?.name },
    examples: "Examples: GET /user, GET /user/meeting (meeting types), GET /meeting?start=…&end=…, POST /meeting {…}, GET /contact?…, "
      + "POST /contact {…}, GET /meeting/tasks.",
  },
  {
    id: "canny", name: "Canny", category: "support", description: "Product feedback: boards, feature requests, votes and changelog",
    website: "https://canny.io", docs: "https://developers.canny.io/api-reference", logo: { favicon: "https://canny.io" },
    baseUrl: "https://canny.io/api/v1",
    // All calls are POST with the key in the JSON body.
    auth: { type: "body", name: "apiKey" },
    fields: [{ id: "token", label: "Secret API key", secret: true }],
    help: "1) In Canny open “Settings” → “API & Webhooks” and copy the “Secret API key”. 2) Paste it here.",
    test: { method: "POST", path: "/boards/list", body: {}, message: (d) => count(d?.boards, "board", "boards") || "Key is valid" },
    examples: "All calls are POST with JSON (the key is added automatically). Examples: /boards/list {}, /posts/list {\"boardID\": \"…\", "
      + "\"limit\": 20, \"sort\": \"score\"}, /posts/create {\"authorID\": \"…\", \"boardID\": \"…\", \"title\": \"…\", \"details\": \"…\"}, "
      + "/posts/change_status {…}, /votes/create {…}, /users/retrieve {\"email\": \"…\"}, /comments/list {…}, /entries/list {} (changelog).",
  },
  {
    id: "carbone", name: "Carbone", category: "productivity", description: "Reports and documents from templates: PDF, DOCX, XLSX…",
    website: "https://carbone.io", docs: "https://carbone.io/api-reference.html", logo: { favicon: "https://carbone.io" },
    baseUrl: "https://api.carbone.io",
    headers: { "carbone-version": "5" },
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://account.carbone.io",
    help: "1) In account.carbone.io open “API keys” and copy the production or test key. 2) Each generated document uses credit.",
    test: { path: "/templates", message: "API key is valid" },
    examples: "Examples: GET /templates, POST /template (uploads a template as multipart), POST /render/{templateId} {\"data\": {…}, "
      + "\"convertTo\": \"pdf\"}, GET /render/{renderId} (downloads the document), DELETE /template/{templateId}.",
  },
  {
    id: "castingwords", name: "CastingWords", category: "media", description: "Human transcription of audio and video on demand",
    website: "https://castingwords.com", docs: "https://castingwords.com/store/API4/docs", logo: { favicon: "https://castingwords.com" },
    baseUrl: "https://castingwords.com/store/API4",
    auth: { type: "query", name: "api_key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) In CastingWords open your account → “API” and copy the key. 2) Orders are paid from the prepaid balance; use test=1 to "
      + "try it at no cost.",
    test: { path: "/prepay_balance", message: "API key is valid" },
    examples: "Examples: GET /prepay_balance, POST /order_url with form url=https://…&sku=…&test=1 (orders a transcription), "
      + "GET /audiofile/{id}, GET /audiofile/{id}/transcript.txt, POST /webhook with form url=https://….",
  },
  {
    id: "checkvist", name: "Checkvist", category: "productivity", description: "Hierarchical lists and tasks: lists, tasks and notes",
    website: "https://checkvist.com", docs: "https://checkvist.com/auth/api", logo: { favicon: "https://checkvist.com" },
    baseUrl: "https://checkvist.com",
    auth: [{ type: "query", name: "username", field: "username" }, { type: "query", name: "remote_key" }],
    fields: [{ id: "username", label: "Your account email", format: "email" }, { id: "token", label: "Remote API key", secret: true }],
    keyUrl: "https://checkvist.com/auth/profile#status",
    help: "1) In Checkvist open your profile → “OpenAPI key” and copy the “Remote API key”. 2) Enter your email and the key here.",
    test: { path: "/checklists.json", message: (d) => count(d, "list", "lists") || "Credentials are valid" },
    examples: "Examples: GET /checklists.json, GET /checklists/{id}/tasks.json, POST /checklists/{id}/tasks.json with form "
      + "task[content]=…&task[parent_id]=…, POST /checklists/{id}/tasks/{taskId}/close.json, GET /checklists/{id}/tasks/{taskId}/comments.json.",
  },
  {
    id: "chmeetings", name: "ChMeetings", category: "crm", description: "Church management: people, groups, events and donations",
    website: "https://www.chmeetings.com", docs: "https://api.chmeetings.com/swagger", logo: { favicon: "https://www.chmeetings.com" },
    baseUrl: "https://api.chmeetings.com/api/v1",
    auth: { type: "header", name: "ApiKey" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) In ChMeetings open “Settings” → “Integrations” → “API” and generate the key. 2) Copy it.",
    test: { path: "/people", query: { page_size: 1 }, message: "API key is valid" },
    examples: "Examples: GET /people?page=1&page_size=50, GET /people/{id}, POST /people {\"first_name\": \"…\", \"last_name\": \"…\", "
      + "\"email\": \"…\"}, GET /groups, GET /events, GET /contributions.",
  },
  {
    id: "clientary", name: "Clientary", category: "finance", description: "Invoicing for freelancers: clients, estimates and invoices",
    website: "https://www.clientary.com", docs: "https://www.clientary.com/api", logo: { favicon: "https://www.clientary.com" },
    baseUrl: "https://{account}.clientary.com/api/v2",
    headers: { Accept: "application/json" },
    auth: { type: "basic", usernameField: "token", fixedPassword: "x" },
    fields: [{ id: "account", label: "Your account name", format: "subdomain",
               help: "The part before .clientary.com in your panel address." },
             { id: "token", label: "API token", secret: true }],
    help: "1) In Clientary open “Settings” → “API” and copy the token. 2) Enter your account name here.",
    test: { path: "/clients", message: "Token is valid" },
    examples: "Examples: GET /clients, POST /clients {\"client\": {\"name\": \"…\"}}, GET /invoices?page=1, GET /invoices/{id}, GET /estimates, "
      + "GET /projects, GET /payments.",
  },
  {
    id: "cloudpdf", name: "CloudPDF", category: "productivity", description: "Cloud PDF viewer: documents, files and webhooks",
    website: "https://cloudpdf.io", docs: "https://cloudpdf.io/developers/api-docs", logo: { favicon: "https://cloudpdf.io" },
    baseUrl: "https://api.cloudpdf.io/v2",
    auth: { type: "header", name: "X-Authorization" },
    fields: [{ id: "token", label: "Simple API Key", secret: true }],
    help: "1) In CloudPDF open “Dashboard” → “Settings” → “API Keys” and copy the “Simple API Key”. 2) Paste it here.",
    test: { path: "/auth", account: (d) => d?.organizationName },
    examples: "Examples: GET /account, POST /documents {\"name\": \"…\", \"filename\": \"report.pdf\"} (returns the upload URL), "
      + "GET /documents/{id}, PUT /documents/{id} {…}, DELETE /documents/{id}, GET /webhooks, POST /webhooks {…}.",
  },
  {
    id: "cloudconvert", name: "CloudConvert", category: "productivity", description: "File conversion: 200+ formats with jobs and tasks",
    website: "https://cloudconvert.com", docs: "https://cloudconvert.com/api/v2", logo: { favicon: "https://cloudconvert.com" },
    baseUrl: "https://api.cloudconvert.com/v2",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://cloudconvert.com/dashboard/api/v2/keys",
    help: "1) In CloudConvert open “Dashboard” → “API” → “API Keys” and create a key with the permissions user.read, task.read and task.write. "
      + "2) Copy it: it is shown only once. Each conversion uses plan minutes.",
    test: { path: "/users/me", account: (d) => d?.data?.username || d?.data?.email },
    examples: "Examples: POST /jobs {\"tasks\": {\"import-file\": {\"operation\": \"import/url\", \"url\": \"https://…\"}, \"convert-file\": "
      + "{\"operation\": \"convert\", \"input\": \"import-file\", \"output_format\": \"pdf\"}, \"export-file\": {\"operation\": \"export/url\", "
      + "\"input\": \"convert-file\"}}}, GET /jobs/{id} (the result URL is in the export task), GET /tasks?filter[status]=error, "
      + "GET /convert/formats?filter[input_format]=docx, GET /users/me.",
  },
  {
    id: "cloudlayer", name: "cloudlayer.io", category: "productivity", description: "PDFs and images from HTML or a URL, with templates",
    website: "https://cloudlayer.io", docs: "https://docs.cloudlayer.io", logo: { favicon: "https://cloudlayer.io" },
    baseUrl: "https://api.cloudlayer.io/v2",
    auth: { type: "header", name: "x-api-key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) In cloudlayer.io open “Settings” → “API Keys” and create a key. 2) Copy it. Each generated document uses credits.",
    test: { path: "/account", message: "API key is valid" },
    examples: "Examples: POST /url/pdf {\"url\": \"https://…\", \"format\": \"A4\"}, POST /html/pdf {\"html\": \"<base64>\"}, POST /url/image "
      + "{\"url\": \"https://…\"}, POST /template/pdf {\"templateId\": \"…\", \"data\": {…}}, GET /jobs/{id}, GET /assets/{id}, GET /account.",
  },
  {
    id: "commcare", name: "CommCare", category: "data", description: "Mobile data collection: cases, forms and users",
    website: "https://www.dimagi.com/commcare/", docs: "https://dimagi.atlassian.net/wiki/spaces/commcarepublic/pages/2143957633/CommCare+APIs",
    logo: { favicon: "https://www.commcarehq.org" },
    baseUrl: "https://www.commcarehq.org",
    // Header “Authorization: ApiKey <username>:<key>”.
    auth: { type: "signature", sign: ({ headers: hdrs, cred }) => {
      hdrs.Authorization = `ApiKey ${cred.username}:${cred.token}`;
    } },
    fields: [{ id: "username", label: "Web user (email)", format: "email" }, { id: "token", label: "API key", secret: true }],
    keyUrl: "https://www.commcarehq.org/account/api_keys/",
    help: "1) In CommCare HQ open your account → “API Keys” and generate a key. 2) Enter your web user (email) and the key here. Data "
      + "routes include the project name (/a/{project}/…).",
    test: { path: "/api/v0.5/identity/", account: (d) => d?.username || d?.email },
    examples: "Examples: GET /api/v0.5/identity/ (your projects), GET /a/{project}/api/v0.5/case/?limit=20&type=…, "
      + "GET /a/{project}/api/v0.5/form/?limit=20&received_on_start=2026-10-01, GET /a/{project}/api/v0.5/user/, "
      + "GET /a/{project}/api/v0.5/fixture/.",
  },
  {
    id: "companycam", name: "CompanyCam", category: "productivity", description: "Job site photos by project: projects, photos and users",
    website: "https://companycam.com", docs: "https://docs.companycam.com", logo: { favicon: "https://companycam.com" },
    baseUrl: "https://api.companycam.com/v2",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "Access token", secret: true }],
    help: "1) In CompanyCam open “Settings” → “Access Tokens” (or “Integrations” → “API”) and create a token. 2) Copy it.",
    test: { path: "/users/current", account: (d) => d?.email_address || d?.first_name },
    examples: "Examples: GET /projects?per_page=20&query=…, GET /projects/{id}, GET /projects/{id}/photos, POST /projects {\"name\": \"…\", "
      + "\"address\": {…}}, GET /photos/{id}, GET /users, GET /tags.",
  },
  {
    id: "compdf", name: "ComPDF", category: "productivity", description: "Cloud PDF processing: conversion, OCR and editing",
    website: "https://www.compdf.com", docs: "https://www.compdf.com/guides/api-reference/v1/authentication", logo: { favicon: "https://www.compdf.com" },
    baseUrl: "https://api-server.compdf.com/server",
    auth: { type: "header", name: "x-api-key" },
    fields: [{ id: "token", label: "Public Key", secret: true }],
    help: "1) In the ComPDF API dashboard open “API Keys” and copy the “Public Key”. 2) Each processed file is deducted from your balance.",
    test: { path: "/v2/asset/info", message: "Key is valid" },
    examples: "Examples: GET /v2/asset/info (balance), GET /v1/tool/support (available tools), GET /v1/task/{tool} (creates a "
      + "task, e.g. pdf/docx), POST /v1/file/upload (multipart file with taskId), GET /v1/execute/start?taskId=…, "
      + "GET /v1/task/taskInfo?taskId=… (status and result URL).",
  },
  {
    id: "contentfulgraphql", name: "Contentful (GraphQL)", category: "ecommerce", description: "Contentful content via GraphQL: entries and assets",
    website: "https://www.contentful.com", docs: "https://www.contentful.com/developers/docs/references/graphql/", logo: { simpleIcons: "contentful" },
    baseUrl: "https://graphql.contentful.com/content/v1/spaces/{workspace}/environments/{environment}", graphql: { path: "/" },
    auth: { type: "bearer" },
    fields: [{ id: "workspace", label: "Space ID", format: "segment", example: "abc123xyz" },
             { id: "environment", label: "Environment", default: "master", format: "segment" },
             { id: "token", label: "Content Delivery (or Preview) token", secret: true }],
    help: "1) In Contentful open “Settings” → “API keys” and create a key. 2) Copy the “Space ID” and the “Content Delivery API - access "
      + "token” (or the Preview one for drafts). 3) To manage content use the “Contentful” connector.",
    test: { method: "POST", path: "/", body: { query: "{ __typename }" }, message: "Token is valid",
              validate: (d) => {
                if (!d?.data) throw new Error(`Contentful: ${d?.errors?.[0]?.message || "invalid response"}`);
              } },
    examples: "The API is GraphQL (POST /): use contentfulgraphql_graphql. Examples: { blogPostCollection(limit: 5, order: sys_publishedAt_DESC) "
      + "{ items { title slug sys { id publishedAt } } } }, { asset(id: \"…\") { url title } }. Collection names come from "
      + "your content types (introspection with __schema).",
  },
  {
    id: "contractbook", name: "Contractbook", category: "productivity", description: "Contracts: documents, templates, signatures and data",
    website: "https://contractbook.com", docs: "https://api.contractbook.com/docs", logo: { favicon: "https://contractbook.com" },
    baseUrl: "https://api.contractbook.com/v2",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API token", secret: true }],
    help: "1) In Contractbook open “Settings” → “Integrations” → “API” and generate a token. 2) Copy it.",
    test: { path: "/documents", query: { limit: 1 }, message: "Token is valid" },
    examples: "Examples: GET /documents?limit=20, GET /documents/{id}, GET /templates, POST /documents {…} (creates a contract from a "
      + "template), GET /documents/{id}/pdf.",
  },
  {
    id: "conversiontools", name: "Conversion Tools", category: "productivity", description: "File conversion: XML, Excel, PDF, JSON, CSV…",
    website: "https://conversiontools.io", docs: "https://conversiontools.io/api-documentation", logo: { favicon: "https://conversiontools.io" },
    baseUrl: "https://api.conversiontools.io/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API token", secret: true }],
    keyUrl: "https://conversiontools.io/profile",
    help: "1) In conversiontools.io open your profile and copy the API token. 2) Paste it here.",
    test: { path: "/tasks", message: "Token is valid" },
    examples: "Examples: POST /files (uploads the file as multipart; returns file_id), POST /tasks {\"type\": \"convert.xml_to_excel\", "
      + "\"options\": {\"file_id\": \"…\"}}, POST /tasks {\"type\": \"convert.website_to_pdf\", \"options\": {\"url\": \"https://…\"}}, "
      + "GET /tasks/{id} (status and file_id of the result), GET /files/{fileId} (download), GET /tasks.",
  },
];
