// Batch 40 of the catalog (from the Composio catalog): documents (conversion, generation from templates, AI extraction, comparison,
// e-signature and postal mail), CSV import, task management, inspections and time tracking.

const count = (d, one, many) => (Array.isArray(d) ? `${d.length} ${d.length === 1 ? one : many}` : null);

export default [
  {
    id: "convertapi", name: "ConvertAPI", category: "productivity", description: "Document conversion: Office, PDF, images and web",
    website: "https://www.convertapi.com", docs: "https://docs.convertapi.com", logo: { favicon: "https://www.convertapi.com" },
    baseUrl: "https://v2.convertapi.com",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API token", secret: true }],
    keyUrl: "https://www.convertapi.com/a/authentication",
    help: "1) In ConvertAPI open “Authentication” and copy an API token (or create one). 2) Each conversion uses conversion seconds.",
    test: { path: "/user", account: (d) => d?.Email || d?.FullName },
    examples: "Examples: POST /convert/docx/to/pdf {\"Parameters\": [{\"Name\": \"File\", \"FileValue\": {\"Url\": \"https://…\"}}]}, "
      + "POST /convert/web/to/pdf {\"Parameters\": [{\"Name\": \"Url\", \"Value\": \"https://…\"}]}, POST /convert/pdf/to/jpg {…}, "
      + "POST /convert/pdf/to/merge {…}, GET /user (seconds balance).",
  },
  {
    id: "cradl", name: "Cradl AI", category: "ai", description: "Document data extraction with custom AI models",
    website: "https://www.cradl.ai", docs: "https://docs.cradl.ai", logo: { favicon: "https://www.cradl.ai" },
    baseUrl: "https://api.lucidtech.ai/v1",
    auth: { type: "client_credentials", url: "https://auth.lucidtech.ai/oauth2/token" },
    fields: [{ id: "client_id", label: "Client ID" }, { id: "client_secret", label: "Client Secret", secret: true }],
    help: "1) In the Cradl AI app open “Settings” → “API credentials” and create credentials. 2) Copy the “Client ID” and the “Client "
      + "Secret”. Conector requests and renews the access token automatically.",
    test: { path: "/models", message: "Credentials are valid" },
    examples: "Examples: GET /models, GET /documents?datasetId=…, POST /documents {\"content\": \"<base64>\", \"contentType\": "
      + "\"application/pdf\"}, POST /predictions {\"documentId\": \"…\", \"modelId\": \"…\"}, GET /predictions?modelId=…, GET /workflows.",
  },
  {
    id: "craftmypdf", name: "CraftMyPDF", category: "productivity", description: "PDFs and images from templates with JSON data",
    website: "https://craftmypdf.com", docs: "https://craftmypdf.com/docs/index.html", logo: { favicon: "https://craftmypdf.com" },
    baseUrl: "https://api.craftmypdf.com/v1",
    auth: { type: "header", name: "X-API-KEY" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) In CraftMyPDF open “API Integration” and copy the key. 2) Each generated document uses plan credits.",
    test: { path: "/get-account-info", account: (d) => d?.email },
    examples: "Examples: GET /list-templates, POST /create {\"template_id\": \"…\", \"data\": {…}, \"export_type\": \"json\"} (returns the URL "
      + "of the PDF), POST /create-image {\"template_id\": \"…\", \"data\": {…}}, POST /merge-pdfs {\"urls\": [\"…\", \"…\"]}, "
      + "GET /get-account-info.",
  },
  {
    id: "csvbox", name: "CSVBox", category: "data", description: "Spreadsheet importer for apps: file uploads",
    website: "https://csvbox.io", docs: "https://help.csvbox.io", logo: { favicon: "https://csvbox.io" },
    baseUrl: "https://api.csvbox.io/1.1",
    auth: [{ type: "header", name: "x-csvbox-api-key" }, { type: "header", name: "x-csvbox-secret-api-key", field: "secret" }],
    fields: [{ id: "token", label: "API Key", secret: true }, { id: "secret", label: "Secret API Key", secret: true }],
    help: "1) In CSVBox open the “Account” page of the dashboard. 2) Copy the “API Key” and the “Secret API Key”.",
    test: { method: "POST", path: "/auth", body: {}, message: "Credentials are valid" },
    examples: "Examples: POST /file {\"import\": {\"public_file_url\": \"https://…/customers.xlsx\", \"sheet_license_key\": \"…\", \"user\": "
      + "{\"user_id\": \"…\"}}} (sends a file to the destination configured for the sheet), POST /auth.",
  },
  {
    id: "dart", name: "Dart", category: "projects", description: "Project management with AI: tasks, boards and documents",
    website: "https://dartai.com", docs: "https://app.dartai.com/api/v0/public/docs/", logo: { favicon: "https://dartai.com" },
    baseUrl: "https://app.dartai.com/api/v0/public",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API token", secret: true }],
    help: "1) In Dart open your account → “Settings” → “Account” and copy the “Authentication token”. 2) Paste it here.",
    test: { path: "/config", message: "Token is valid" },
    examples: "Examples: GET /config (boards, statuses, tags and people), GET /tasks/list?dartboard=…&is_completed=false, "
      + "POST /tasks {\"item\": {\"title\": \"…\", \"dartboard\": \"…\", \"assignees\": [\"…\"]}}, GET /tasks/{id}, PUT /tasks/{id} "
      + "{\"item\": {…}}, GET /docs/list, POST /docs {\"item\": {\"title\": \"…\", \"text\": \"…\"}}.",
  },
  {
    id: "datascope", name: "DataScope", category: "data", description: "Mobile forms and inspections: answers and locations",
    website: "https://www.mydatascope.com", docs: "https://www.mydatascope.com/api", logo: { favicon: "https://www.mydatascope.com" },
    baseUrl: "https://www.mydatascope.com/api/external",
    auth: { type: "header", name: "Authorization" },
    fields: [{ id: "token", label: "API token", secret: true }],
    help: "1) In DataScope open “Integrations” → “API” and copy the token. 2) Paste it here.",
    test: { path: "/answers", query: { limit: 1 }, message: "Token is valid" },
    examples: "Examples: GET /answers?form_id=…&start=2026-10-01&end=2026-10-15&limit=50 (form answers), GET /locations, "
      + "POST /locations {\"name\": \"…\", \"address\": \"…\"}.",
  },
  {
    id: "desktime", name: "DeskTime", category: "hr", description: "Time and productivity tracking: employees, projects and hours",
    website: "https://desktime.com", docs: "https://desktime.com/app/api", logo: { favicon: "https://desktime.com" },
    baseUrl: "https://desktime.com/api/v2/json",
    auth: { type: "query", name: "apiKey" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://desktime.com/app/api",
    help: "1) In DeskTime open “Settings” → “API” (desktime.com/app/api) and copy the key. 2) Paste it here.",
    test: { path: "/employees", message: "API key is valid" },
    examples: "Examples: GET /employees?date=2026-10-15 (hours and productivity of each person), GET /employee?id=…&date=…, GET /projects, "
      + "GET /company.",
  },
  {
    id: "docmosis", name: "Docmosis", category: "productivity", description: "Documents from Word templates: PDF, DOCX and more",
    website: "https://www.docmosis.com", docs: "https://resources.docmosis.com/content/documentation/cloud", logo: { favicon: "https://www.docmosis.com" },
    baseUrl: "https://{server}/api",
    // The access key goes in the body of each request (form or JSON).
    auth: { type: "body", name: "accessKey" },
    fields: [{ id: "token", label: "Access Key", secret: true },
             { id: "server", label: "Account region", default: "eu1.dws4.docmosis.com",
               options: [["eu1.dws4.docmosis.com", "Europe"], ["us1.dws4.docmosis.com", "United States"], ["au1.dws4.docmosis.com", "Australia"]] }],
    help: "1) In the Docmosis Cloud console open “Account” → “Access Key” and copy it. 2) Choose the region of your account.",
    test: { method: "POST", path: "/environment/summary", form: {}, message: "Key is valid",
              validate: (d) => {
                if (d?.succeeded === false) throw new Error(`Docmosis: ${d.shortMsg || "invalid response"}`);
              } },
    examples: "Examples: POST /render {\"templateName\": \"invoice.docx\", \"outputName\": \"invoice.pdf\", \"data\": {…}} (returns the "
      + "document), POST /listTemplates {}, POST /getTemplateStructure {\"templateName\": \"…\"}, POST /environment/summary {}.",
  },
  {
    id: "docparser", name: "Docparser", category: "ai", description: "Rule-based data extraction from PDFs and documents",
    website: "https://docparser.com", docs: "https://docparser.com/api/", logo: { favicon: "https://docparser.com" },
    baseUrl: "https://api.docparser.com/v1",
    auth: { type: "basic", usernameField: "token", fixedPassword: "" },
    fields: [{ id: "token", label: "Secret API key", secret: true }],
    help: "1) In Docparser open “My Account” → “API” and copy the secret key. 2) Conector sends it as the Basic auth username with an empty password.",
    test: { path: "/ping", message: "API key is valid" },
    examples: "Examples: GET /parsers, POST /document/fetch/{parserId} with a form url=https://…/invoice.pdf, "
      + "GET /results/{parserId}?list=last_uploaded&limit=10, GET /results/{parserId}/{documentId}.",
  },
  {
    id: "docraptor", name: "DocRaptor", category: "productivity", description: "PDF and Excel from HTML with the Prince engine",
    website: "https://docraptor.com", docs: "https://docraptor.com/documentation/api", logo: { favicon: "https://docraptor.com" },
    baseUrl: "https://api.docraptor.com",
    auth: { type: "basic", usernameField: "token", fixedPassword: "" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) In DocRaptor open your account and copy the API key. 2) Documents with \"test\": true are free (watermarked).",
    test: { path: "/docs", message: "API key is valid" },
    examples: "Examples: POST /docs {\"doc\": {\"document_content\": \"<html>…</html>\", \"type\": \"pdf\", \"test\": true}} (returns the PDF), "
      + "POST /docs {\"doc\": {\"document_url\": \"https://…\", \"type\": \"pdf\"}}, POST /async_docs {…}, GET /status/{statusId}.",
  },
  {
    id: "docsautomator", name: "DocsAutomator", category: "productivity", description: "Documents from Google Docs templates with data",
    website: "https://docsautomator.co", docs: "https://docs.docsautomator.co", logo: { favicon: "https://docsautomator.co" },
    baseUrl: "https://api.docsautomator.co",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) In DocsAutomator open “Settings” → “API” and copy the key. 2) Paste it here.",
    test: { path: "/automations", message: "API key is valid" },
    examples: "Examples: GET /automations, POST /createDocument {\"docId\": \"…\", \"documentName\": \"…\", \"data\": {…}} (returns the "
      + "link to the PDF and the Google Doc).",
  },
  {
    id: "docsumo", name: "Docsumo", category: "ai", description: "AI invoice and document extraction: upload and results",
    website: "https://www.docsumo.com", docs: "https://support.docsumo.com/reference", logo: { favicon: "https://www.docsumo.com" },
    baseUrl: "https://app.docsumo.com/api/v1",
    auth: { type: "header", name: "apikey" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) In Docsumo open “Settings” → “API Keys” and copy the key. 2) Each processed document uses credits.",
    test: { path: "/eevee/apikey/limit/", message: "API key is valid" },
    examples: "Examples: GET /eevee/apikey/limit/ (credits), POST /eevee/apikey/upload/ (multipart file with type=invoice), "
      + "GET /eevee/apikey/documents/all/?limit=20, GET /eevee/apikey/data/simplified/{docId}/ (extracted data).",
  },
  {
    id: "docugenerate", name: "DocuGenerate", category: "productivity", description: "Word and PDF documents from templates with data",
    website: "https://www.docugenerate.com", docs: "https://api.docugenerate.com", logo: { favicon: "https://www.docugenerate.com" },
    baseUrl: "https://api.docugenerate.com/v1",
    auth: { type: "header", name: "Authorization" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) In DocuGenerate open “Settings” → “API” and copy the key. 2) Paste it here.",
    test: { path: "/template", message: (d) => count(d, "template", "templates") || "API key is valid" },
    examples: "Examples: GET /template, GET /template/{id}, POST /document {\"template_id\": \"…\", \"data\": [{…}], \"output_format\": "
      + "\".pdf\"} (returns the document URL), GET /document?template_id=…, GET /document/{id}.",
  },
  {
    id: "documenso", name: "Documenso", category: "productivity", description: "Open-source e-signature: documents and templates",
    website: "https://documenso.com", docs: "https://docs.documenso.com/developers/public-api", logo: { favicon: "https://documenso.com" },
    baseUrl: "https://{server}/api/v1",
    auth: { type: "header", name: "Authorization" },
    fields: [{ id: "token", label: "API token (api_…)", secret: true },
             { id: "server", label: "Server", default: "app.documenso.com", format: "domain",
               help: "Leave it as is for Documenso Cloud; for a self-hosted install, use the domain of your installation." }],
    help: "1) In Documenso open “Settings” → “API Tokens” and create a token. 2) Copy it: it is shown only once.",
    test: { path: "/documents", query: { page: 1, perPage: 1 }, message: "Token is valid" },
    examples: "Examples: GET /documents?page=1&perPage=20, GET /documents/{id}, POST /documents {\"title\": \"…\", \"recipients\": [{\"name\": "
      + "\"…\", \"email\": \"…\", \"role\": \"SIGNER\"}]} (returns the URL to upload the PDF), POST /documents/{id}/send, GET /templates, "
      + "POST /templates/{templateId}/generate-document {…}.",
  },
  {
    id: "documint", name: "Documint", category: "productivity", description: "PDF documents from visual templates with data",
    website: "https://documint.me", docs: "https://docs.documint.me", logo: { favicon: "https://documint.me" },
    baseUrl: "https://api.documint.me/1",
    auth: { type: "header", name: "api_key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) In Documint open “Settings” → “API Keys” and copy the key. 2) Paste it here.",
    test: { path: "/templates", message: "API key is valid" },
    examples: "Examples: GET /templates, POST /templates/{templateId}/content {…template data} (generates the document; "
      + "?preview=true for a draft at no cost).",
  },
  {
    id: "docupilot", name: "Docupilot", category: "productivity", description: "Document generation from templates and data",
    website: "https://docupilot.com", docs: "https://help.docupilot.app/developers", logo: { favicon: "https://docupilot.com" },
    baseUrl: "https://api.docupilot.app",
    headers: (c) => (c.workspace ? { "X-Workspace": c.workspace } : {}),
    // Authorization: Bearer base64(<key>:<secret>).
    auth: { type: "signature", sign: ({ headers: requestHeaders, cred }) => {
      requestHeaders.Authorization = `Bearer ${Buffer.from(`${cred.username}:${cred.token}`).toString("base64")}`;
    } },
    fields: [{ id: "username", label: "API Key" }, { id: "token", label: "API Secret", secret: true },
             { id: "workspace", label: "Workspace (unique key, optional)", optional: true, format: "segment" }],
    help: "1) In Docupilot open “Settings” → “API Keys” and create a key: copy the “API Key” and the “API Secret”. 2) If you have several "
      + "workspaces, also enter the unique key of the workspace.",
    test: { path: "/accounts/v2/users/me/", account: (d) => d?.email },
    examples: "Examples: GET /accounts/v2/users/me/, GET /dashboard/api/v2/templates/, POST /dashboard/api/v2/templates/{id}/generate/ {…data} "
      + "(returns the generated document).",
  },
  {
    id: "docupipe", name: "DocuPipe", category: "ai", description: "Documents to structured data with AI: schemas and standardization",
    website: "https://www.docupipe.ai", docs: "https://docs.docupipe.ai", logo: { favicon: "https://www.docupipe.ai" },
    baseUrl: "https://app.docupipe.ai",
    auth: { type: "header", name: "X-API-Key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) In DocuPipe open “Settings” → “API Key” and copy the key. 2) Each processed page uses credits.",
    test: { path: "/documents", message: "API key is valid" },
    examples: "Examples: POST /document {\"document\": {\"file\": {\"contents\": \"<base64>\", \"filename\": \"invoice.pdf\"}}}, "
      + "GET /document/{documentId}, GET /documents, POST /v2/standardize/batch {\"documentIds\": [\"…\"], \"schemaId\": \"…\"}, "
      + "GET /standardization/{id}, GET /schemas.",
  },
  {
    id: "docupost", name: "DocuPost", category: "marketing", description: "Letters and postcards by US postal mail from a PDF",
    website: "https://www.docupost.com", docs: "https://www.docupost.com/developer", logo: { favicon: "https://www.docupost.com" },
    baseUrl: "https://app.docupost.com/api/1.1/wf",
    auth: { type: "query", name: "api_token" },
    fields: [{ id: "token", label: "API token", secret: true }],
    help: "1) In DocuPost open “Developer” and copy the API token. 2) Mailings cost real money (printing and postage).",
    // The response arrives as JSON text; a bad token answers 200 with {"error": "Invalid API token…"}.
    test: { method: "POST", path: "/getbalance", message: "Token is valid",
              validate: (d) => {
                let j = d;
                try {
                  j = typeof d === "string" ? JSON.parse(d) : d;
                } catch {
                  j = d;
                }
                if (j?.error) throw new Error(`DocuPost: ${j.error}`);
              } },
    examples: "All calls are POST with parameters in the URL. Examples: POST /getbalance, POST /sendletter?to_name=…&to_address1=…&"
      + "to_city=…&to_state=…&to_zip=…&from_name=…&…&pdf=https://…/letter.pdf (sends a real letter), POST /sendpostcard?….",
  },
  {
    id: "docuseal", name: "DocuSeal", category: "productivity", description: "E-signature: templates, submissions and signers",
    website: "https://www.docuseal.com", docs: "https://www.docuseal.com/docs/api", logo: { favicon: "https://www.docuseal.com" },
    baseUrl: "https://{server}",
    auth: { type: "header", name: "X-Auth-Token" },
    fields: [{ id: "token", label: "API key", secret: true },
             { id: "server", label: "Server", default: "api.docuseal.com",
               options: [["api.docuseal.com", "DocuSeal Cloud (US)"], ["api.docuseal.eu", "DocuSeal Cloud (Europe)"]] }],
    keyUrl: "https://console.docuseal.com/api",
    help: "1) In the DocuSeal console open “API” and copy the key. 2) Choose the server of your account (US or Europe).",
    test: { path: "/templates", query: { limit: 1 }, message: "API key is valid" },
    examples: "Examples: GET /templates, POST /submissions {\"template_id\": 1, \"send_email\": true, \"submitters\": [{\"role\": \"First Party\", "
      + "\"email\": \"…\"}]} (sends for signing), GET /submissions?template_id=…, GET /submissions/{id}, GET /submitters?…, "
      + "POST /templates/pdf {\"name\": \"…\", \"documents\": [{\"name\": \"…\", \"file\": \"<base64>\"}]}.",
  },
  {
    id: "draftable", name: "Draftable", category: "productivity", description: "Document comparison: PDF, Word and PowerPoint",
    website: "https://www.draftable.com", docs: "https://api.draftable.com", logo: { favicon: "https://www.draftable.com" },
    baseUrl: "https://api.draftable.com/v1",
    auth: { type: "header", name: "Authorization", prefix: "Token " },
    fields: [{ id: "token", label: "Auth Token", secret: true }],
    keyUrl: "https://api.draftable.com/account/credentials",
    help: "1) In your Draftable API account open “Credentials”. 2) Copy the “Auth Token”.",
    test: { path: "/comparisons", message: "Token is valid" },
    examples: "Examples: GET /comparisons, POST /comparisons {\"left\": {\"source_url\": \"https://…/v1.pdf\", \"file_type\": \"pdf\"}, "
      + "\"right\": {\"source_url\": \"https://…/v2.pdf\", \"file_type\": \"pdf\"}}, GET /comparisons/{identifier}, "
      + "DELETE /comparisons/{identifier}.",
  },
  {
    id: "dropboxsign", name: "Dropbox Sign", category: "productivity", description: "E-signature (formerly HelloSign): requests and templates",
    website: "https://sign.dropbox.com", docs: "https://developers.hellosign.com/api/reference/", logo: { simpleIcons: "dropbox" },
    baseUrl: "https://api.hellosign.com/v3",
    auth: { type: "basic", usernameField: "token", fixedPassword: "" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://app.hellosign.com/home/myAccount#api",
    help: "1) In Dropbox Sign open “Settings” → “API” and copy the key (or create one). 2) Conector sends it as the Basic auth username "
      + "with an empty password. Use test_mode=1 for tests with no legal validity.",
    test: { path: "/account", account: (d) => d?.account?.email_address },
    examples: "Examples: GET /account, GET /signature_request/list?page_size=20, GET /signature_request/{id}, POST /signature_request/send "
      + "{\"title\": \"…\", \"signers\": [{\"email_address\": \"…\", \"name\": \"…\"}], \"file_urls\": [\"https://…\"], \"test_mode\": 1}, "
      + "POST /signature_request/send_with_template {…}, GET /template/list, GET /signature_request/files/{id}?file_type=pdf.",
  },
];
