// Batch 44 of the Composio catalog: no-code databases, tasks, notifications, documents (OCR, conversion and PDF),
// CRM, cloud office, forms, delivery routes, wikis, proposals and data extraction from emails.

const count = (d, one, many) => (Array.isArray(d) ? `${d.length} ${d.length === 1 ? one : many}` : null);

export default [
  {
    id: "nocodb", name: "NocoDB", category: "productivity", description: "No-code databases: bases, tables and records",
    website: "https://nocodb.com", docs: "https://docs.nocodb.com/developer-resources/rest-apis", logo: { favicon: "https://nocodb.com" },
    baseUrl: "https://{server}/api/v2",
    auth: { type: "header", name: "xc-token" },
    fields: [{ id: "token", label: "API token", secret: true },
             { id: "server", label: "Server", default: "app.nocodb.com", format: "domain",
               help: "app.nocodb.com for NocoDB Cloud; if you host it yourself, the domain of your installation." }],
    keyUrl: "https://app.nocodb.com/#/account/tokens",
    help: "1) In NocoDB open “Account settings” → “Tokens” → “Add new token”. 2) Copy the token.",
    test: { path: "/meta/bases", message: (d) => count(d?.list, "base", "bases") || "Token is valid" },
    examples: "Examples: GET /meta/bases, GET /meta/bases/{baseId}/tables, GET /tables/{tableId}/records?limit=25&where=(Status,eq,Open), "
      + "POST /tables/{tableId}/records [{\"Name\": \"…\"}], PATCH /tables/{tableId}/records [{\"Id\": 1, \"Status\": \"Closed\"}], "
      + "DELETE /tables/{tableId}/records [{\"Id\": 1}].",
  },
  {
    id: "nozbe", name: "Nozbe", category: "projects", description: "Team tasks: projects, tasks, comments and teams",
    website: "https://nozbe.com", docs: "https://api4.nozbe.com/v1/api/docs", logo: { favicon: "https://nozbe.com" },
    baseUrl: "https://api4.nozbe.com/v1/api",
    auth: { type: "header", name: "Authorization" },
    fields: [{ id: "token", label: "API token", secret: true }],
    help: "1) In Nozbe open “Settings” → “Integrations” → “API” and generate a token. 2) Copy it.",
    test: { path: "/tasks", query: { limit: 1 }, message: "Token is valid" },
    examples: "Examples: GET /tasks?limit=50, POST /tasks {\"name\": \"…\", \"project_id\": \"…\"}, PUT /tasks/{id} {…}, GET /projects, "
      + "GET /teams, GET /comments?task_id=…, POST /comments {\"task_id\": \"…\", \"body\": \"…\"}.",
  },
  {
    id: "ntfy", name: "ntfy", category: "communication", description: "Push notifications to phone or desktop through topics",
    website: "https://ntfy.sh", docs: "https://docs.ntfy.sh/publish/", logo: { favicon: "https://ntfy.sh" },
    baseUrl: "https://{server}",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "Access token (tk_…)", secret: true },
             { id: "server", label: "Server", default: "ntfy.sh", format: "domain",
               help: "ntfy.sh or the domain of your own ntfy server." }],
    keyUrl: "https://ntfy.sh/account",
    help: "1) In ntfy.sh (or your own server) open “Account” → “Access tokens” and create a token. 2) Copy it. Unprotected topics do not "
      + "need it, but it lets you publish to reserved topics.",
    test: { path: "/v1/account", account: (d) => d?.username },
    examples: "Examples: POST / {\"topic\": \"my-alerts\", \"title\": \"…\", \"message\": \"…\", \"priority\": 4, \"tags\": [\"warning\"], "
      + "\"click\": \"https://…\"} (publishes a notification), GET /{topic}/json?poll=1&since=1h (recent messages), GET /v1/account.",
  },
  {
    id: "nutrient", name: "Nutrient DWS", category: "productivity", description: "Cloud documents: conversion, OCR, signing and PDF editing",
    website: "https://www.nutrient.io", docs: "https://www.nutrient.io/api/reference/public/", logo: { favicon: "https://www.nutrient.io" },
    baseUrl: "https://api.nutrient.io",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://dashboard.nutrient.io/api/api_keys/",
    help: "1) In the Nutrient dashboard (formerly PSPDFKit) open “API Keys” and copy the key. 2) Each processed document uses credits.",
    test: { path: "/account/info", message: "API key is valid" },
    examples: "Examples: POST /build (multipart: the files and an instructions field with the operations: convert to PDF, OCR, "
      + "watermark, flatten, extract pages…), POST /sign (digital signature), GET /account/info (credits).",
  },
  {
    id: "ocrwebservice", name: "OCR Web Service", category: "ai", description: "OCR of documents and images to text, Word or searchable PDF",
    website: "https://www.ocrwebservice.com", docs: "https://www.ocrwebservice.com/api/restguide", logo: { favicon: "https://www.ocrwebservice.com" },
    baseUrl: "https://www.ocrwebservice.com/restservices",
    auth: { type: "basic", usernameField: "username", passwordField: "token" },
    fields: [{ id: "username", label: "Username" }, { id: "token", label: "License code", secret: true }],
    help: "1) Sign up at ocrwebservice.com. 2) Enter your username and the “license code” you receive by email.",
    test: { path: "/getAccountInformation", message: "Credentials are valid" },
    examples: "Examples: GET /getAccountInformation (available pages), POST /processDocument?language=english&outputformat=txt "
      + "(body: the file in binary; outputformat also doc, docx, xlsx or pdf).",
  },
  {
    id: "ocrspace", name: "OCR.space", category: "ai", description: "OCR of images and PDFs to text, with tables and many languages",
    website: "https://ocr.space", docs: "https://ocr.space/OCRAPI", logo: { favicon: "https://ocr.space" },
    baseUrl: "https://api.ocr.space",
    auth: { type: "header", name: "apikey" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://ocr.space/ocrapi/freekey",
    help: "1) Request a free key at ocr.space/ocrapi/freekey (25,000 requests per month) or use one from a PRO plan. 2) Paste it here.",
    test: { path: "/parse/imageurl", query: { url: "https://ocr.space/Content/Images/receipt-ocr-original.jpg" },
              message: "API key is valid",
              validate: (d) => {
                if (d?.IsErroredOnProcessing && d?.OCRExitCode >= 3) throw new Error(`OCR.space: ${[].concat(d.ErrorMessage || []).join(" ")}`);
              } },
    examples: "Examples: GET /parse/imageurl?url=https://…/invoice.png&language=eng&isTable=true&OCREngine=2, POST /parse/image with form "
      + "url=https://…/document.pdf&language=eng or base64Image=data:image/png;base64,…; the text arrives in ParsedResults[].ParsedText.",
  },
  {
    id: "onepagecrm", name: "OnePageCRM", category: "crm", description: "Action-based CRM: contacts, actions, deals and notes",
    website: "https://www.onepagecrm.com", docs: "https://developer.onepagecrm.com", logo: { favicon: "https://www.onepagecrm.com" },
    baseUrl: "https://app.onepagecrm.com/api/v3",
    auth: { type: "basic", usernameField: "username", passwordField: "token" },
    fields: [{ id: "username", label: "User ID" }, { id: "token", label: "API Key", secret: true }],
    keyUrl: "https://app.onepagecrm.com/app/api",
    help: "1) In OnePageCRM open “Apps” → “Configuration” → “API” (app.onepagecrm.com/app/api). 2) Copy the “User ID” and the “API Key”.",
    test: { path: "/bootstrap.json", account: (d) => d?.data?.user?.user?.email || d?.data?.user?.email },
    examples: "Examples: GET /contacts.json?per_page=20&search=…, POST /contacts.json {\"first_name\": \"…\", \"last_name\": \"…\", \"emails\": "
      + "[{\"type\": \"work\", \"value\": \"…\"}]}, GET /deals.json, POST /actions.json {\"contact_id\": \"…\", \"text\": \"Call\", \"date\": "
      + "\"2026-10-20\"}, GET /notes.json, POST /notes.json {…}.",
  },
  {
    id: "onlyoffice", name: "ONLYOFFICE DocSpace", category: "productivity", description: "Collaborative office: rooms, files, folders and users",
    website: "https://www.onlyoffice.com/docspace.aspx", docs: "https://api.onlyoffice.com/docspace/", logo: { simpleIcons: "onlyoffice" },
    baseUrl: "https://{server}/api/2.0",
    auth: { type: "bearer" },
    fields: [{ id: "server", label: "Your DocSpace address", format: "domain", example: "example.onlyoffice.com",
               help: "e.g. example.onlyoffice.com or the domain of your own installation." },
             { id: "token", label: "API key", secret: true }],
    help: "1) In DocSpace open “Developer Tools” → “API keys” and create a key with the required permissions. 2) Enter your "
      + "DocSpace address and the key.",
    test: { path: "/people/@self", account: (d) => d?.response?.email || d?.response?.displayName },
    examples: "Examples: GET /files/@my, GET /files/rooms, POST /files/rooms {\"title\": \"…\", \"roomType\": 2}, GET /files/{folderId}, "
      + "GET /files/file/{fileId}, POST /files/{folderId}/file {\"title\": \"Report.docx\"}, GET /people.",
  },
  {
    id: "opnform", name: "OpnForm", category: "productivity", description: "Open-source forms: workspaces, forms and responses",
    website: "https://opnform.com", docs: "https://docs.opnform.com/api-reference", logo: { favicon: "https://opnform.com" },
    baseUrl: "https://api.opnform.com/open",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API token", secret: true }],
    help: "1) In OpnForm open “Settings” → “Access Tokens” and create a token. 2) Copy it.",
    test: { path: "/workspaces", message: (d) => count(d, "workspace", "workspaces") || "Token is valid" },
    examples: "Examples: GET /workspaces, GET /workspaces/{workspaceId}/forms, GET /forms/{formId}/submissions?page=1, "
      + "GET /forms/{formId}.",
  },
  {
    id: "optimoroute", name: "OptimoRoute", category: "productivity", description: "Delivery and visit routing: orders, planning and routes",
    website: "https://optimoroute.com", docs: "https://optimoroute.com/api/", logo: { favicon: "https://optimoroute.com" },
    baseUrl: "https://api.optimoroute.com/v1",
    auth: { type: "query", name: "key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) In OptimoRoute open “Administration” → “Settings” → “WS API” and enable the API. 2) Copy the key.",
    // OptimoRoute returns 200 for a bad key: {"success": false, "code": "AUTH_KEY_UNKNOWN"}.
    test: { path: "/get_routes", query: { date: "2026-01-01" }, message: "API key is valid",
              validate: (d) => {
                if (d?.success === false) throw new Error(`OptimoRoute: ${d.message || d.code}`);
              } },
    examples: "Examples: GET /get_routes?date=2026-10-16, POST /create_order {\"orderNo\": \"…\", \"type\": \"D\", \"date\": \"…\", "
      + "\"location\": {\"address\": \"…\"}, \"duration\": 10}, POST /get_orders {\"orders\": [{\"orderNo\": \"…\"}]}, POST /start_planning "
      + "{\"date\": \"…\"}, GET /get_planning_status?planningId=…, GET /get_scheduling_info?orderNo=….",
  },
  {
    id: "outline", name: "Outline", category: "productivity", description: "Team wiki: documents, collections and search",
    website: "https://www.getoutline.com", docs: "https://www.getoutline.com/developers", logo: { simpleIcons: "outline" },
    baseUrl: "https://{server}/api",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true },
             { id: "server", label: "Server", default: "app.getoutline.com", format: "domain",
               help: "app.getoutline.com (or <team>.getoutline.com) or the domain of your own installation." }],
    help: "1) In Outline open “Settings” → “API” and create a key. 2) Copy it.",
    test: { method: "POST", path: "/auth.info", body: {}, account: (d) => d?.data?.user?.email || d?.data?.user?.name },
    examples: "All calls are POST with JSON. Examples: /documents.search {\"query\": \"…\"}, /documents.info {\"id\": \"…\"}, "
      + "/documents.create {\"title\": \"…\", \"text\": \"…\", \"collectionId\": \"…\", \"publish\": true}, /documents.update {\"id\": \"…\", "
      + "\"text\": \"…\"}, /collections.list {}, /documents.list {\"collectionId\": \"…\"}.",
  },
  {
    id: "pandadoc", name: "PandaDoc", category: "crm", description: "Proposals and contracts: documents, templates, signing and payments",
    website: "https://www.pandadoc.com", docs: "https://developers.pandadoc.com/reference/about", logo: { image: "https://app.pandadoc.com/favicon.ico" },
    baseUrl: "https://api.pandadoc.com/public/v1",
    auth: { type: "header", name: "Authorization", prefix: "API-Key " },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://app.pandadoc.com/a/#/settings/integrations/api",
    help: "1) In PandaDoc open “Settings” → “Integrations” → “API” and generate a key (the sandbox one is free for testing). 2) Copy it.",
    test: { path: "/members/current", account: (d) => d?.email },
    examples: "Examples: GET /documents?count=20&status=2, POST /documents {\"name\": \"…\", \"template_uuid\": \"…\", \"recipients\": "
      + "[{\"email\": \"…\", \"role\": \"Client\"}], \"tokens\": [{\"name\": \"Client.Company\", \"value\": \"…\"}]}, GET /documents/{id}, "
      + "POST /documents/{id}/send {\"message\": \"…\"}, GET /documents/{id}/download, GET /templates.",
  },
  {
    id: "paperform", name: "Paperform", category: "productivity", description: "Forms and surveys: forms, fields and responses",
    website: "https://paperform.co", docs: "https://paperform.readme.io", logo: { favicon: "https://paperform.co" },
    baseUrl: "https://api.paperform.co/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) In Paperform open “Account” → “Developer” and generate a key (Pro plan or higher). 2) Copy it.",
    test: { path: "/forms", query: { limit: 1 }, message: "API key is valid" },
    examples: "Examples: GET /forms, GET /forms/{slug}/fields, GET /forms/{slug}/submissions?limit=20, GET /submissions/{id}, "
      + "GET /forms/{slug}/partial-submissions, GET /forms/{slug}/coupons.",
  },
  {
    id: "parseur", name: "Parseur", category: "ai", description: "Data extraction from emails and documents: mailboxes and results",
    website: "https://parseur.com", docs: "https://help.parseur.com/en/articles/3566128-parseur-api", logo: { favicon: "https://parseur.com" },
    baseUrl: "https://api.parseur.com",
    auth: { type: "header", name: "Authorization" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) In Parseur open “Account” → “API keys” and copy the key. 2) Paste it here.",
    test: { path: "/parser", message: "API key is valid" },
    examples: "Examples: GET /parser (mailboxes), GET /parser/{parserId}, GET /parser/{parserId}/document_set?page=1, GET /document/{documentId}, "
      + "POST /parser/{parserId}/upload (file as multipart), POST /document/{documentId}/process.",
  },
  {
    id: "parsio", name: "Parsio", category: "ai", description: "AI data extraction from emails, PDFs and documents",
    website: "https://parsio.io", docs: "https://help.parsio.io/public-api", logo: { favicon: "https://parsio.io" },
    baseUrl: "https://api.parsio.io",
    auth: { type: "header", name: "X-API-Key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) In Parsio open your account → “API” and copy the key. 2) Paste it here.",
    test: { path: "/mailboxes/", message: (d) => count(d, "mailbox", "mailboxes") || "API key is valid" },
    examples: "Examples: GET /mailboxes/, GET /mailboxes/{mailboxId}/docs?page=1, GET /docs/{docId}, POST /mailboxes/{mailboxId}/upload "
      + "(file as multipart), GET /mailboxes/{mailboxId}/parsed?page=1 (extracted data).",
  },
  {
    id: "pdfapiio", name: "PDF-API.io", category: "productivity", description: "PDFs from templates designed with a visual editor",
    website: "https://pdf-api.io", docs: "https://pdf-api.io/en/docs", logo: { favicon: "https://pdf-api.io" },
    baseUrl: "https://pdf-api.io/api",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) In PDF-API.io open “API Keys” and create a key. 2) Copy it. Each generated PDF counts against your plan.",
    test: { path: "/templates", message: (d) => count(d?.data ?? d, "template", "templates") || "API key is valid" },
    examples: "Examples: GET /templates, POST /templates/{templateId}/pdf {\"data\": {\"customer\": \"…\", \"total\": \"…\"}} (returns the PDF "
      + "or its URL).",
  },
  {
    id: "pdfco", name: "PDF.co", category: "productivity", description: "PDF tools: conversion, extraction, merging, forms and OCR",
    website: "https://pdf.co", docs: "https://docs.pdf.co", logo: { favicon: "https://pdf.co" },
    baseUrl: "https://api.pdf.co/v1",
    auth: { type: "header", name: "x-api-key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://app.pdf.co/account",
    help: "1) In app.pdf.co open your account and copy the API key. 2) Each operation uses credits; the test only checks the balance.",
    test: { path: "/account/credit/balance", message: (d) => (d?.remainingCredits != null ? `${d.remainingCredits} credits` : "API key is valid") },
    examples: "Examples: POST /pdf/convert/to/text {\"url\": \"https://…\"}, POST /pdf/convert/to/csv {…}, POST /pdf/convert/from/html "
      + "{\"html\": \"<p>…</p>\", \"name\": \"doc.pdf\"}, POST /pdf/merge {\"url\": \"https://…/a.pdf,https://…/b.pdf\"}, "
      + "POST /pdf/edit/add {…} (text and images), POST /pdf/documentparser {…}, GET /account/credit/balance.",
  },
];
