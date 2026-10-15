// Batch 24 of the Composio catalog: images and photography (stock images, backgrounds, templates, compression, 3D),
// collaborative design and education (certificates, LMS, quizzes, research, dictionaries and virtual classrooms).
import crypto from "node:crypto";

const count = (d, one, many) => (Array.isArray(d) ? `${d.length} ${d.length === 1 ? one : many}` : null);

export default [
  {
    id: "pexels", name: "Pexels", category: "design", description: "Free stock photos and videos: search, collections and curated photos",
    website: "https://www.pexels.com", docs: "https://www.pexels.com/api/documentation/", logo: { simpleIcons: "pexels" },
    baseUrl: "https://api.pexels.com",
    auth: { type: "header", name: "Authorization" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://www.pexels.com/api/new/",
    help: "1) Sign in at pexels.com with your account and open “Image & Video API”. 2) Fill in what you will use it for and copy the key (it is free, "
      + "with 200 requests per hour). 3) When publishing photos, credit the author and Pexels.",
    test: { path: "/v1/curated", query: { per_page: 1 }, message: "API key is valid" },
    examples: "Examples: GET /v1/search?query=office&per_page=15&locale=en-US&orientation=landscape, GET /v1/curated, GET /v1/photos/{id}, "
      + "GET /videos/search?query=…&per_page=10, GET /v1/collections/featured.",
  },
  {
    id: "photoroom", name: "PhotoRoom", category: "design", description: "AI product photos and backgrounds: cutout, shadows and fill",
    website: "https://www.photoroom.com", docs: "https://docs.photoroom.com", logo: { favicon: "https://www.photoroom.com" },
    baseUrl: "https://image-api.photoroom.com", allowedOrigins: ["https://sdk.photoroom.com"],
    auth: { type: "header", name: "x-api-key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://app.photoroom.com/api-dashboard",
    help: "1) In the PhotoRoom API dashboard create a key (the test key “sandbox_…” uses no credits and marks the images). "
      + "2) Copy it. 3) Each processed image uses credits; the connection test does not.",
    test: { path: "/v2/account", message: (d) => (d?.credits ? `Available credits: ${d.credits.available}` : "API key is valid") },
    examples: "Examples: GET /v2/edit?imageUrl=https://…&removeBackground=true&background.color=FFFFFF&outputSize=1000x1000, "
      + "POST /v2/edit (multipart with imageFile), POST https://sdk.photoroom.com/v1/segment (multipart with image_file: cutout only), GET /v2/account.",
  },
  {
    id: "placid", name: "Placid", category: "design", description: "Automated images, PDFs and videos from templates",
    website: "https://placid.app", docs: "https://placid.app/docs/2.0/rest/", logo: { favicon: "https://placid.app" },
    baseUrl: "https://api.placid.app/api/rest",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "Project API token", secret: true }],
    help: "1) In Placid open your project → “Settings” → “API Tokens”. 2) Create a token and copy it. 3) Each render uses credits; the connection "
      + "test does not.",
    test: { path: "/templates", message: (d) => count(d?.data, "template", "templates") || "API token is valid" },
    examples: "Examples: GET /templates, POST /images {\"template_uuid\": \"…\", \"layers\": {\"title\": {\"text\": \"…\"}}}, GET /images/{id}, "
      + "POST /pdfs {\"pages\": [{\"template_uuid\": \"…\", \"layers\": {…}}]}, POST /videos {…}.",
  },
  {
    id: "presenton", name: "Presenton", category: "productivity", description: "AI presentations: generate, edit and export to PPTX or PDF",
    website: "https://presenton.ai", docs: "https://docs.presenton.ai", logo: { favicon: "https://presenton.ai" },
    baseUrl: "https://api.presenton.ai/api/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) In Presenton open “Settings” → “API Keys” and create a key. 2) Copy it. 3) Each generated presentation uses credits.",
    test: { path: "/ppt/presentation/all", message: (d) => count(d, "presentation", "presentations") || "API key is valid" },
    examples: "Examples: POST /ppt/presentation/generate {\"content\": \"…\", \"n_slides\": 8, \"language\": \"English\", \"export_as\": \"pptx\"}, "
      + "GET /ppt/presentation/all, GET /ppt/presentation/{id}, POST /ppt/presentation/export {\"presentation_id\": \"…\", \"export_as\": \"pdf\"}.",
  },
  {
    id: "removebg", name: "remove.bg", category: "design", description: "Automatic background removal for photos",
    website: "https://www.remove.bg", docs: "https://www.remove.bg/api", logo: { simpleIcons: "removedotbg" },
    baseUrl: "https://api.remove.bg/v1.0",
    auth: { type: "header", name: "X-Api-Key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://www.remove.bg/dashboard#api-key",
    help: "1) Sign in at remove.bg with your account and open “Dashboard” → “API Keys”. 2) Create a key and copy it. 3) Each high-"
      + "resolution image uses credits (preview images are free); the connection test does not.",
    test: { path: "/account", message: (d) => (d?.data?.attributes?.credits ? `${d.data.attributes.credits.total} credits` : "API key is valid") },
    examples: "Examples: POST /removebg with form image_url=https://…&size=auto (returns the image; use the header Accept: application/json "
      + "to receive base64), POST /removebg with form image_url=…&size=preview (free), GET /account.",
  },
  {
    id: "renderform", name: "RenderForm", category: "design", description: "Images and PDFs from templates with variable data",
    website: "https://renderform.io", docs: "https://renderform.io/docs/api/", logo: { favicon: "https://renderform.io" },
    baseUrl: "https://get.renderform.io/api/v2",
    auth: { type: "header", name: "X-API-KEY" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) In the RenderForm console open “Account” → “API Keys”. 2) Copy the key. 3) Each render counts against your plan.",
    test: { path: "/my-templates", message: (d) => count(d, "template", "templates") || "API key is valid" },
    examples: "Examples: GET /my-templates, POST /render {\"template\": \"…\", \"data\": {\"title.text\": \"…\", \"photo.src\": \"https://…\"}}, "
      + "GET /results, GET /results/{requestId}.",
  },
  {
    id: "smugmug", name: "SmugMug", category: "media", description: "Photography: users, albums and public images",
    website: "https://www.smugmug.com", docs: "https://api.smugmug.com/api/v2/doc", logo: { simpleIcons: "smugmug" },
    baseUrl: "https://api.smugmug.com/api/v2",
    auth: { type: "query", name: "APIKey" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://api.smugmug.com/api/developer/apply",
    help: "1) With your SmugMug account request a key at api.smugmug.com/api/developer/apply (it is granted immediately). 2) Copy the “API "
      + "Key”. 3) The key reads public data (users, albums and images); private data needs OAuth 1.0a, which Conector does not use.",
    test: { path: "/user/cmac", message: "API key is valid" },
    examples: "Examples: GET /user/{nick}, GET /user/{nick}!albums, GET /album/{albumKey}!images, GET /image/{imageKey}!sizedetails, "
      + "GET /node/{nodeId}!children.",
  },
  {
    id: "tinypng", name: "TinyPNG", category: "ecommerce", description: "Smart compression of PNG, JPEG, WebP and AVIF images",
    website: "https://tinypng.com", docs: "https://tinypng.com/developers/reference", logo: { favicon: "https://tinypng.com" },
    baseUrl: "https://api.tinify.com",
    auth: { type: "basic", fixedUsername: "api", passwordField: "token" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://tinify.com/dashboard/api",
    help: "1) Sign up at tinify.com/developers with your email (includes 500 free compressions per month). 2) In “API” in the dashboard copy the "
      + "key. 3) Each compression counts; the connection test does not.",
    // Without an image, a valid key returns 400 (InputMissing) without using any compressions.
    test: { method: "POST", path: "/shrink", acceptStatus: [400], message: "API key is valid" },
    examples: "Examples: POST /shrink {\"source\": {\"url\": \"https://…/photo.png\"}} (returns the result URL in the Location header and "
      + "in output.url), POST /output/{id} {\"resize\": {\"method\": \"fit\", \"width\": 800, \"height\": 600}}, "
      + "POST /output/{id} {\"convert\": {\"type\": \"image/webp\"}}.",
  },
  {
    id: "tripo3d", name: "Tripo3D", category: "design", description: "AI 3D models from text or images, with textures",
    website: "https://www.tripo3d.ai", docs: "https://platform.tripo3d.ai/docs/introduction", logo: { favicon: "https://www.tripo3d.ai" },
    baseUrl: "https://api.tripo3d.ai/v2/openapi",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key (tsk_…)", secret: true }],
    keyUrl: "https://platform.tripo3d.ai/api-keys",
    help: "1) On the Tripo platform (platform.tripo3d.ai) open “API Keys” and create a key. 2) Copy it: it is shown only once. "
      + "3) Each task uses credits; the connection test only checks the balance.",
    test: { path: "/user/balance", message: (d) => (d?.data?.balance != null ? `${d.data.balance} credits` : "API key is valid") },
    examples: "Examples: POST /task {\"type\": \"text_to_model\", \"prompt\": \"…\"}, POST /task {\"type\": \"image_to_model\", \"file\": "
      + "{\"type\": \"png\", \"url\": \"https://…\"}}, GET /task/{taskId}, GET /user/balance.",
  },
  {
    id: "zeplin", name: "Zeplin", category: "design", description: "Design handoff: projects, screens, components and styles",
    website: "https://zeplin.io", docs: "https://docs.zeplin.dev/reference", logo: { favicon: "https://zeplin.io" },
    baseUrl: "https://api.zeplin.dev/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "Personal access token", secret: true }],
    oauth: { scopes: [], provider: { name: "Zeplin", key: "zeplin", redirect: "localhost",
      authorizeUrl: "https://api.zeplin.dev/v1/oauth/authorize", tokenUrl: "https://api.zeplin.dev/v1/oauth/token",
      help: "1) In Zeplin open your profile → “Developer” and, under “OAuth applications”, click “Create new application”; name it “Conector”. "
        + "2) Under “Redirect URIs” paste the redirect URI shown below. 3) Copy the “Client ID” and the “Client secret”." } },
    keyUrl: "https://app.zeplin.io/profile/developer",
    help: "1) In Zeplin open your profile → “Developer”. 2) Under “Personal access tokens” click “Create new token”, give it access and copy it.",
    test: { path: "/users/me", account: (d) => d?.email || d?.username },
    examples: "Examples: GET /projects, GET /projects/{projectId}/screens, GET /projects/{projectId}/components, "
      + "GET /projects/{projectId}/colors, GET /styleguides, GET /projects/{projectId}/screens/{screenId}/versions/latest.",
  },
  {
    id: "accredible", name: "Accredible", category: "education", description: "Digital certificates and badges: groups, credentials and designs",
    website: "https://www.accredible.com", docs: "https://docs.api.accredible.com", logo: { favicon: "https://www.accredible.com" },
    baseUrl: "https://{server}/v1",
    auth: { type: "header", name: "Authorization", prefix: "Token token=" },
    fields: [{ id: "token", label: "API key", secret: true },
             { id: "server", label: "Environment", default: "api.accredible.com",
               options: [["api.accredible.com", "Production"], ["sandbox.api.accredible.com", "Sandbox (testing)"]] }],
    keyUrl: "https://dashboard.accredible.com/issuer/dashboard/settings/api_integrations",
    help: "1) In the Accredible dashboard open “Settings” → “API Keys” (Integrations). 2) Copy the API key (the sandbox one is separate).",
    test: { path: "/issuer/details", account: (d) => d?.issuer?.name },
    examples: "Examples: GET /issuer/details, GET /issuer/all_groups?page_size=20, POST /credentials {\"credential\": {\"recipient\": {\"name\": "
      + "\"…\", \"email\": \"…\"}, \"group_id\": …}}, GET /credentials/{id}, POST /credentials/search {\"recipient_email\": \"…\"}.",
  },
  {
    id: "apibible", name: "API.Bible", category: "education", description: "Bible texts: versions, books, chapters, passages and search",
    website: "https://scripture.api.bible", docs: "https://docs.api.bible", logo: { favicon: "https://scripture.api.bible" },
    baseUrl: "https://rest.api.bible/v1",
    auth: { type: "header", name: "api-key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) Sign up at scripture.api.bible and create an application (free for non-commercial use). 2) Copy the API key.",
    test: { path: "/bibles", query: { language: "spa" }, message: (d) => count(d?.data, "Spanish version", "Spanish versions") || "API key is valid" },
    examples: "Examples: GET /bibles?language=eng, GET /bibles/{bibleId}/books, GET /bibles/{bibleId}/chapters/{chapterId}?content-type=text, "
      + "GET /bibles/{bibleId}/passages/{passageId} (e.g. JHN.3.16-JHN.3.18), GET /bibles/{bibleId}/search?query=love.",
  },
  {
    id: "canvas", name: "Canvas LMS", category: "education", description: "Courses, students, assignments, grades and messages",
    website: "https://www.instructure.com/canvas", docs: "https://canvas.instructure.com/doc/api/", logo: { simpleIcons: "canvas" },
    baseUrl: "{url}/api/v1",
    auth: { type: "bearer" },
    fields: [{ id: "url", label: "Your Canvas URL", format: "url", help: "The one for your school, e.g. https://yourschool.instructure.com." },
             { id: "token", label: "Access token", secret: true }],
    help: "1) In Canvas open “Account” → “Settings”. 2) Under “Approved Integrations” click “+ New Access Token”, give it a purpose and an "
      + "expiry date and copy the token. 3) It has the permissions of your Canvas user (teacher, administrator…).",
    test: { path: "/users/self", account: (d) => d?.login_id || d?.name },
    examples: "Examples: GET /courses?enrollment_state=active, GET /courses/{id}/assignments, GET /courses/{id}/students, "
      + "GET /courses/{id}/assignments/{id}/submissions, POST /conversations with form recipients[]=…&body=…, "
      + "GET /courses/{id}/enrollments.",
  },
  {
    id: "certifier", name: "Certifier", category: "education", description: "Digital certificates: groups, credentials, designs and deliveries",
    website: "https://certifier.io", docs: "https://developers.certifier.io", logo: { favicon: "https://certifier.io" },
    baseUrl: "https://api.certifier.io/v1", headers: { "Certifier-Version": "2022-10-26" },
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "Access token", secret: true }],
    keyUrl: "https://app.certifier.io/settings/api",
    help: "1) In Certifier open “Settings” → “API” and create an access token. 2) Copy it: it is shown only once.",
    test: { path: "/groups", message: (d) => count(d?.data, "group", "groups") || "Access token is valid" },
    examples: "Examples: GET /groups, GET /credentials?limit=20, POST /credentials {\"groupId\": \"…\", \"recipient\": {\"name\": \"…\", "
      + "\"email\": \"…\"}}, POST /credentials/{id}/issue, POST /credentials/{id}/send, GET /designs.",
  },
  {
    id: "classmarker", name: "ClassMarker", category: "education", description: "Online tests: groups, links and results",
    website: "https://www.classmarker.com", docs: "https://www.classmarker.com/online-testing/api/developers/", logo: { favicon: "https://www.classmarker.com" },
    baseUrl: "https://api.classmarker.com",
    // Each request carries api_key, timestamp and signature = MD5(key + secret + timestamp).
    auth: { type: "signature", sign: ({ url, cred }) => {
      const timestamp = String(Math.floor(Date.now() / 1000));
      url.searchParams.set("api_key", cred.username);
      url.searchParams.set("signature", crypto.createHash("md5").update(`${cred.username}${cred.token}${timestamp}`).digest("hex"));
      url.searchParams.set("timestamp", timestamp);
    } },
    fields: [{ id: "username", label: "API key" }, { id: "token", label: "API secret", secret: true }],
    help: "1) In ClassMarker open “My Account” → “API Keys” and create a key (Professional or Corporate plan). 2) Copy the “API Key” and the "
      + "“API Secret”. 3) Conector signs each request with them.",
    test: { path: "/v1.json",
              validate: (d) => { if (d?.status === "error") throw new Error(`ClassMarker: ${d.error?.error_message || d.error?.error_code}`); },
              message: "Credentials are valid" },
    examples: "Examples: GET /v1.json (accessible groups, links and tests), GET /v1/groups/recent_results.json?finishedAfterTimestamp=…, "
      + "GET /v1/links/recent_results.json?finishedAfterTimestamp=…, GET /v1/groups/{groupId}/tests/{testId}/recent_results.json.",
  },
  {
    id: "consensus", name: "Consensus", category: "education", description: "Scientific paper search with evidence-based answers",
    website: "https://consensus.app", docs: "https://docs.consensus.app", logo: { favicon: "https://consensus.app" },
    baseUrl: "https://api.consensus.app/v1",
    auth: { type: "header", name: "x-api-key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) Request access to the Consensus API from its website (consensus.app → “API”). 2) Copy the key you are given. 3) Each search "
      + "counts toward your quota; so does the connection test.",
    test: { path: "/quick_search", query: { query: "sleep and memory" }, message: "API key is valid" },
    examples: "Examples: GET /quick_search?query=…&year_min=2020 (papers with title, authors, year, journal, abstract and link).",
  },
  {
    id: "merriamwebster", name: "Merriam-Webster", category: "education", description: "English dictionary and thesaurus (and Spanish-English dictionary)",
    website: "https://www.merriam-webster.com", docs: "https://dictionaryapi.com/products/json", logo: { favicon: "https://www.merriam-webster.com" },
    baseUrl: "https://www.dictionaryapi.com/api/v3/references/{reference}/json",
    auth: { type: "query", name: "key" },
    fields: [{ id: "token", label: "API key for the reference", secret: true },
             { id: "reference", label: "Reference", default: "collegiate",
               options: [["collegiate", "Collegiate Dictionary"], ["thesaurus", "Collegiate Thesaurus"], ["spanish", "Spanish-English Dictionary"],
                          ["learners", "Learner's Dictionary"], ["medical", "Medical Dictionary"]],
               help: "Each reference has its own key: choose the one you requested it for." }],
    help: "1) Sign up at dictionaryapi.com (free for non-commercial use, up to 1,000 queries per day). 2) When signing up choose up to "
      + "two references (e.g. Collegiate Dictionary and Spanish-English) and copy the key.",
    // A wrong key returns 200 with a warning text.
    test: { path: "/test",
              validate: (d) => { if (typeof d === "string" && /invalid api key|not subscribed/i.test(d)) throw new Error(`Merriam-Webster: ${d.trim()}`); },
              message: "API key is valid" },
    examples: "Examples: GET /{word} (definitions, pronunciation, etymology and examples), GET /voluminous, with the reference "
      + "thesaurus: GET /happy (synonyms and antonyms); with spanish: GET /casa.",
  },
  {
    id: "lessonspace", name: "Lessonspace", category: "education", description: "Virtual classrooms: spaces, sessions, recordings and users",
    website: "https://www.thelessonspace.com", docs: "https://www.thelessonspace.com/docs/api/", logo: { favicon: "https://www.thelessonspace.com" },
    baseUrl: "https://api.thelessonspace.com/v2",
    auth: { type: "header", name: "Authorization", prefix: "Organisation " },
    fields: [{ id: "token", label: "Organization API key", secret: true }],
    help: "1) In Lessonspace open “Settings” → “API” (as an organization administrator). 2) Copy the API key.",
    test: { path: "/my-organisation/", account: (d) => d?.name },
    examples: "Examples: POST /spaces/launch/ {\"id\": \"class-123\", \"user\": {\"name\": \"…\", \"role\": \"teacher\"}} (link to the classroom), "
      + "GET /organisations/{orgId}/sessions/, GET /organisations/{orgId}/spaces/, GET /organisations/{orgId}/users/.",
  },
];
