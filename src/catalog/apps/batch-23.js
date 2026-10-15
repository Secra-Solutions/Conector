// Batch 23 of the Composio catalog: design and creativity (visual CMS, image editing, video, 3D, presentations,
// templates, image optimization and brand logos).

const count = (d, one, many) => (Array.isArray(d) ? `${d.length} ${d.length === 1 ? one : many}` : null);

export default [
  {
    id: "builderio", name: "Builder.io", category: "ecommerce", description: "Visual CMS: models, content and publishing (Admin API)",
    website: "https://www.builder.io", docs: "https://www.builder.io/c/docs/admin-graphql-schema", logo: { favicon: "https://www.builder.io" },
    baseUrl: "https://builder.io/api", graphql: { path: "/v2/admin" },
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "Private key (bpk-…)", secret: true }],
    help: "1) In Builder.io open “Account settings” → “Space” and, under “Private keys”, click “Add key”. 2) Copy the private key (it starts "
      + "with bpk-): it gives write and admin access to the space, so keep it safe.",
    test: { method: "POST", path: "/v2/admin", body: { query: "{ models { id name } }" },
              message: (d) => count(d?.data?.models, "model", "models") || "Private key is valid" },
    examples: "Admin through GraphQL (POST /v2/admin, better with builderio_graphql): { models { id name } }, { settings }. Content: "
      + "POST /v1/write/{model} {\"name\": \"…\", \"data\": {…}}, PATCH /v1/write/{model}/{id} {…}, DELETE /v1/write/{model}/{id}.",
  },
  {
    id: "claid", name: "Claid.ai", category: "design", description: "AI image editing: backgrounds, enhancement, cropping and upscaling",
    website: "https://claid.ai", docs: "https://docs.claid.ai", logo: { favicon: "https://claid.ai" },
    baseUrl: "https://api.claid.ai/v1-beta1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://claid.ai/integrations/api",
    help: "1) In the Claid.ai dashboard open “API” and create a key. 2) Copy it. 3) Each processed image uses credits; the connection test does not.",
    // There is no account endpoint: with a valid key, an empty edit answers 400/422 without processing anything.
    test: { method: "POST", path: "/image/edit", body: {}, acceptStatus: [400, 422], message: "API key is valid" },
    examples: "Examples: POST /image/edit {\"input\": \"https://…/photo.jpg\", \"operations\": {\"background\": {\"remove\": true}, "
      + "\"resizing\": {\"width\": 1080}}, \"output\": {\"format\": \"png\"}}, POST /image/edit/async {…}, GET /image/edit/async/{taskId}.",
  },
  {
    id: "cloudinary", name: "Cloudinary", category: "design", description: "Images and videos: upload, transformations, folders and usage",
    website: "https://cloudinary.com", docs: "https://cloudinary.com/documentation/admin_api", logo: { simpleIcons: "cloudinary" },
    baseUrl: "https://api.cloudinary.com/v1_1/{cloud}",
    auth: { type: "basic", usernameField: "username", passwordField: "token" },
    fields: [{ id: "cloud", label: "Cloud name", format: "segment" },
             { id: "username", label: "API key" },
             { id: "token", label: "API secret", secret: true }],
    keyUrl: "https://console.cloudinary.com/settings/api-keys",
    help: "1) In the Cloudinary console open “Settings” → “API Keys”. 2) Copy the “Cloud name”, the “API Key” and the “API Secret” (click "
      + "the eye icon to reveal it). 3) You can create a separate key just for Conector.",
    test: { path: "/usage", message: (d) => (d?.plan ? `Plan ${d.plan}` : "Credentials are valid") },
    examples: "Examples: GET /usage, GET /resources/image?max_results=20, GET /resources/search?expression=folder:… (better POST "
      + "/resources/search {\"expression\": \"…\"}), GET /folders, POST /image/upload with the form file=https://…&public_id=… (signed with the "
      + "key), DELETE /resources/image/upload?public_ids[]=….",
  },
  {
    id: "creatomate", name: "Creatomate", category: "media", description: "Automated videos, images and GIFs from templates",
    website: "https://creatomate.com", docs: "https://creatomate.com/docs/api/introduction", logo: { favicon: "https://creatomate.com" },
    baseUrl: "https://api.creatomate.com/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "Project API key", secret: true }],
    help: "1) In Creatomate open your project → “Project settings” → “API Integration”. 2) Copy the API key. 3) Each render uses "
      + "credits; the connection test does not.",
    test: { path: "/templates", message: (d) => count(d, "template", "templates") || "API key is valid" },
    examples: "Examples: GET /templates, POST /renders {\"template_id\": \"…\", \"modifications\": {\"Title\": \"…\"}}, GET /renders/{id}, "
      + "GET /renders?limit=20.",
  },
  {
    id: "cults", name: "Cults", category: "design", description: "3D printing models: creations, sales and search (GraphQL)",
    website: "https://cults3d.com", docs: "https://cults3d.com/en/pages/graphql", logo: { favicon: "https://cults3d.com" },
    baseUrl: "https://cults3d.com", graphql: { path: "/graphql" },
    auth: { type: "basic", usernameField: "username", passwordField: "token" },
    fields: [{ id: "username", label: "Username (nickname)" }, { id: "token", label: "API key", secret: true }],
    keyUrl: "https://cults3d.com/en/api/keys",
    help: "1) In Cults open your account → “API” (cults3d.com/en/api/keys) and generate a key. 2) Enter your nickname and the key here.",
    test: { method: "POST", path: "/graphql", body: { query: "{ __typename }" }, message: "Credentials are valid" },
    examples: "GraphQL (POST /graphql, better with cults_graphql), e.g. { myself { creationsBatch(limit: 20) { results { name url } } } }, "
      + "{ creationsSearchBatch(query: \"…\", limit: 10) { results { name url price(currency: EUR) { cents } } } }.",
  },
  {
    id: "dreamstudio", name: "Stability AI (DreamStudio)", category: "ai", description: "AI images: Stable Diffusion, editing, upscaling and 3D",
    website: "https://stability.ai", docs: "https://platform.stability.ai/docs/api-reference", logo: { favicon: "https://stability.ai" },
    baseUrl: "https://api.stability.ai",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key (sk-…)", secret: true }],
    keyUrl: "https://platform.stability.ai/account/keys",
    help: "1) Sign in at platform.stability.ai with your account (a DreamStudio account works) and open “API Keys”. 2) Copy the key (sk-…). "
      + "3) Each image uses account credits; the connection test does not.",
    test: { path: "/v1/user/account", account: (d) => d?.email },
    examples: "Examples: GET /v1/user/balance, POST /v2beta/stable-image/generate/core (multipart with prompt and output_format; header "
      + "Accept: application/json to receive base64), POST /v2beta/stable-image/edit/remove-background, POST /v2beta/stable-image/upscale/fast.",
  },
  {
    id: "dynamicmockups", name: "Dynamic Mockups", category: "design", description: "Product mockups from your designs, in batches",
    website: "https://dynamicmockups.com", docs: "https://docs.dynamicmockups.com", logo: { favicon: "https://dynamicmockups.com" },
    baseUrl: "https://app.dynamicmockups.com/api/v1",
    auth: { type: "header", name: "x-api-key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://app.dynamicmockups.com/dashboard-api",
    help: "1) In Dynamic Mockups open “API” in the dashboard and create a key. 2) Copy it. 3) Each render uses credits from your plan.",
    test: { path: "/mockups", message: "API key is valid" },
    examples: "Examples: GET /mockups, GET /mockup/{uuid}, POST /renders {\"mockup_uuid\": \"…\", \"smart_objects\": [{\"uuid\": \"…\", "
      + "\"asset\": {\"url\": \"https://…/design.png\"}}]}, POST /renders/batch {…}, GET /collections.",
  },
  {
    id: "gamma", name: "Gamma", category: "productivity", description: "Presentations, documents and websites generated with AI",
    website: "https://gamma.app", docs: "https://developers.gamma.app", logo: { favicon: "https://gamma.app" },
    baseUrl: "https://public-api.gamma.app",
    auth: { type: "header", name: "X-API-KEY" },
    fields: [{ id: "token", label: "API key (sk-gamma-…)", secret: true }],
    help: "1) In Gamma open “Settings” → “API keys” and create a key (you need a Pro plan or higher). 2) Copy it. 3) Each generation "
      + "uses credits; the connection test does not.",
    test: { path: "/v1.0/themes", message: "API key is valid" },
    examples: "Examples: POST /v1.0/generations {\"inputText\": \"…\", \"format\": \"presentation\", \"textOptions\": {\"language\": \"en\"}}, "
      + "GET /v1.0/generations/{generationId} (status and links gammaUrl / exportUrl), GET /v1.0/themes, GET /v1.0/folders.",
  },
  {
    id: "htmlcsstoimage", name: "HTML/CSS to Image", category: "design", description: "Images from HTML, CSS, a URL or templates",
    website: "https://htmlcsstoimage.com", docs: "https://docs.htmlcsstoimage.com", logo: { favicon: "https://htmlcsstoimage.com" },
    baseUrl: "https://hcti.io/v1",
    auth: { type: "basic", usernameField: "username", passwordField: "token" },
    fields: [{ id: "username", label: "User ID" }, { id: "token", label: "API key", secret: true }],
    keyUrl: "https://htmlcsstoimage.com/dashboard/api-keys",
    help: "1) Create an account at htmlcsstoimage.com (it includes 50 free images per month). 2) In the dashboard copy the “User ID” and the “API Key”.",
    // Images that have already been created are public: to check the key an empty one is created, which with valid credentials gives 400 at no cost.
    test: { method: "POST", path: "/image", form: {}, acceptStatus: [400], message: "Credentials are valid" },
    examples: "Examples: POST /image {\"html\": \"<h1>…</h1>\", \"css\": \"h1 { color: #2563eb }\", \"google_fonts\": \"Roboto\"}, "
      + "POST /image {\"url\": \"https://…\", \"selector\": \"#card\"}, POST /image/batch {…}, DELETE /image/{id}.",
  },
  {
    id: "imejis", name: "Imejis.io", category: "design", description: "Images from designs with customizable fields",
    website: "https://www.imejis.io", docs: "https://docs.imejis.io", logo: { favicon: "https://www.imejis.io" },
    baseUrl: "https://api.imejis.io/api",
    auth: { type: "header", name: "dma-api-key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) In Imejis.io open “API” in the dashboard and copy the key. 2) Each generated image uses one from your quota.",
    test: { path: "/designs", message: "API key is valid" },
    examples: "Examples: GET /designs, GET /designs/{designId} (editable fields), POST /designs/{designId} {\"title\": \"…\", "
      + "\"image\": \"https://…\"} (generates the image).",
  },
  {
    id: "imgix", name: "imgix", category: "design", description: "Real-time images: sources, assets and cache purging",
    website: "https://www.imgix.com", docs: "https://docs.imgix.com/apis/management/overview", logo: { favicon: "https://www.imgix.com" },
    baseUrl: "https://api.imgix.com/api/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://dashboard.imgix.com/api-keys",
    help: "1) In the imgix dashboard open “API Keys” and click “Generate Key”. 2) Choose the permissions (Sources, Purge, Asset Manager…) and "
      + "copy the key: it is shown only once.",
    test: { path: "/sources", message: (d) => count(d?.data, "source", "sources") || "API key is valid" },
    examples: "JSON:API format. Examples: GET /sources, GET /sources/{id}, GET /assets/{sourceId}?page[size]=20, POST /purge {\"data\": "
      + "{\"type\": \"purges\", \"attributes\": {\"url\": \"https://….imgix.net/photo.jpg\"}}}.",
  },
  {
    id: "krakenio", name: "Kraken.io", category: "ecommerce", description: "Image optimization and resizing by URL",
    website: "https://kraken.io", docs: "https://kraken.io/docs/getting-started", logo: { favicon: "https://kraken.io" },
    baseUrl: "https://api.kraken.io",
    // Kraken.io reads the credentials inside the JSON: {"auth": {"api_key", "api_secret"}}. With wrong credentials it answers 404.
    auth: { type: "body", name: "auth", value: (c) => ({ api_key: c.username, api_secret: c.token }) },
    fields: [{ id: "username", label: "API key" }, { id: "token", label: "API secret", secret: true }],
    keyUrl: "https://kraken.io/account/api-credentials",
    help: "1) In Kraken.io open “Account” → “API Credentials”. 2) Copy the “API Key” and the “API Secret”. 3) Each optimized image uses "
      + "quota from your plan; the connection test does not.",
    test: { method: "POST", path: "/user_status", message: (d) => (d?.quota_total ? `${d.quota_used} of ${d.quota_total} bytes used` : "Credentials are valid") },
    examples: "All calls are POST with JSON (Conector adds auth). Examples: POST /v1/url {\"url\": \"https://…/photo.jpg\", "
      + "\"wait\": true, \"lossy\": true}, POST /v1/url {\"url\": \"…\", \"wait\": true, \"resize\": {\"width\": 800, \"strategy\": \"auto\"}}, "
      + "POST /user_status.",
  },
  {
    id: "layerre", name: "Layerre", category: "design", description: "Image and PDF variants from templates",
    website: "https://layerre.com", docs: "https://docs.layerre.com", logo: { favicon: "https://layerre.com" },
    baseUrl: "https://api.layerre.com/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API token", secret: true }],
    help: "1) In Layerre open “Settings” → “API” and create a token. 2) Copy it. 3) Each render uses credits from your plan.",
    test: { path: "/templates", message: (d) => count(d, "template", "templates") || "API token is valid" },
    examples: "Examples: GET /templates, GET /templates/{id}, POST /templates/{id}/render {\"layers\": {\"title\": {\"text\": \"…\"}}, "
      + "\"format\": \"png\"}, GET /renders/{id}.",
  },
  {
    id: "logodev", name: "Logo.dev", category: "design", description: "High-resolution company logos and brand search",
    website: "https://www.logo.dev", docs: "https://www.logo.dev/docs", logo: { favicon: "https://www.logo.dev", initials: true },
    baseUrl: "https://api.logo.dev",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "Secret key (sk_…)", secret: true }],
    keyUrl: "https://www.logo.dev/dashboard/api-keys",
    help: "1) Create an account at logo.dev (there is a free plan). 2) In the dashboard copy the secret key (sk_…), not the publishable one (pk_), which is "
      + "the one for img.logo.dev images.",
    test: { path: "/search", query: { q: "conector" }, message: "Secret key is valid" },
    examples: "Examples: GET /search?q=stripe (brands and domains), GET /describe/{domain} (name, colors, social networks and logo). Images: "
      + "https://img.logo.dev/{domain}?token={publishable key}&size=128.",
  },
  {
    id: "magichour", name: "Magic Hour", category: "media", description: "AI video and image: avatars, face swap and effects",
    website: "https://magichour.ai", docs: "https://docs.magichour.ai", logo: { favicon: "https://magichour.ai" },
    baseUrl: "https://api.magichour.ai/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://magichour.ai/developer",
    help: "1) In Magic Hour open “Developer” and create an API key. 2) Copy it. 3) Each project uses credits; the connection test does not.",
    // With a valid key, a non-existent project answers 404.
    test: { path: "/image-projects/check", acceptStatus: [404], message: "API key is valid" },
    examples: "Examples: POST /ai-image-generator {\"name\": \"…\", \"image_count\": 1, \"orientation\": \"landscape\", \"style\": {\"prompt\": \"…\"}}, "
      + "GET /image-projects/{id}, POST /face-swap {…}, GET /video-projects/{id}, POST /files/upload-urls {\"items\": [{\"type\": \"image\", "
      + "\"extension\": \"png\"}]}.",
  },
  {
    id: "meshy", name: "Meshy", category: "design", description: "AI 3D models from text or images, textures and rigging",
    website: "https://www.meshy.ai", docs: "https://docs.meshy.ai", logo: { favicon: "https://www.meshy.ai" },
    baseUrl: "https://api.meshy.ai/openapi",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key (msy_…)", secret: true }],
    keyUrl: "https://www.meshy.ai/settings/api",
    help: "1) In Meshy open “Settings” → “API” and create a key (you need a paid plan). 2) Copy it. 3) Each task uses credits; the "
      + "connection test only checks the balance.",
    test: { path: "/v1/balance", message: (d) => (d?.balance != null ? `${d.balance} credits` : "API key is valid") },
    examples: "Examples: POST /v2/text-to-3d {\"mode\": \"preview\", \"prompt\": \"…\"}, GET /v2/text-to-3d/{id}, POST /v1/image-to-3d "
      + "{\"image_url\": \"https://…\"}, GET /v1/image-to-3d/{id}, GET /v1/balance.",
  },
  {
    id: "orshot", name: "Orshot", category: "design", description: "Images, PDFs and videos from templates",
    website: "https://orshot.com", docs: "https://orshot.com/docs", logo: { favicon: "https://orshot.com" },
    baseUrl: "https://api.orshot.com/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) In Orshot open “Settings” → “API Key” and copy it. 2) Each render uses credits from your plan; the connection test does not.",
    test: { path: "/me", account: (d) => d?.email || d?.name },
    examples: "Examples: GET /studio/templates, POST /studio/render {\"templateId\": …, \"modifications\": {\"title\": \"…\"}, \"response\": "
      + "{\"type\": \"url\", \"format\": \"png\"}}, POST /generate/images {\"templateId\": \"…\", \"modifications\": {…}}.",
  },
  {
    id: "penpot", name: "Penpot", category: "design", description: "Open-source design and prototyping: teams, projects and files",
    website: "https://penpot.app", docs: "https://help.penpot.app/technical-guide/integration/", logo: { simpleIcons: "penpot" },
    baseUrl: "{url}/api/rpc/command",
    auth: { type: "header", name: "Authorization", prefix: "Token " },
    fields: [{ id: "url", label: "Your Penpot URL", format: "url",
               help: "The URL of your installation (e.g. https://penpot.example.com). The official cloud (design.penpot.app) protects the API with "
                 + "Cloudflare and may block automated requests." },
             { id: "token", label: "Access token", secret: true }],
    help: "1) In Penpot open “Your account” → “Access tokens” and click “Generate new token”. 2) Copy the token: it is shown only once. "
      + "3) Enter the URL of your Penpot installation here.",
    test: { method: "POST", path: "/get-profile", body: {}, account: (d) => d?.email || d?.fullname },
    examples: "All calls are POST with JSON. Examples: POST /get-teams {}, POST /get-projects {\"teamId\": \"…\"}, "
      + "POST /get-project-files {\"projectId\": \"…\"}, POST /get-file {\"id\": \"…\"}, POST /get-comment-threads {\"fileId\": \"…\"}.",
  },
];
