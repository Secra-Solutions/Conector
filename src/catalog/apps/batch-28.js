// Batch 28 of the catalog, taken from the Composio catalog: AI (voice agents and calls, chatbots, evaluation, model APIs,
// dubbing, search, plagiarism detection, automated ML, images, avatar video and agent workflows).
import crypto from "node:crypto";
import { USER_AGENT, httpRequest } from "../../http.js";
import { ensureOk } from "../define.js";

const count = (d, one, many) => (Array.isArray(d) ? `${d.length} ${d.length === 1 ? one : many}` : null);

// Copyleaks: the email and the key are exchanged for a 48-hour token, which is kept in memory until shortly before it expires.
const copyleaksTokens = new Map();
async function copyleaksToken(c) {
  const fingerprint = crypto.createHash("sha256").update(`${c.email}:${c.token}`).digest("hex");
  const cached = copyleaksTokens.get(fingerprint);
  if (cached && cached.expires > Date.now() + 60_000) return cached.token;
  const d = ensureOk(await httpRequest("https://id.copyleaks.com/v3/account/login/api", { method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", "User-Agent": USER_AGENT },
    body: JSON.stringify({ email: c.email, key: c.token }) }), "Copyleaks");
  if (!d?.access_token) throw new Error("Copyleaks: the login response does not include a token");
  copyleaksTokens.set(fingerprint, { token: d.access_token, expires: Date.parse(d[".expires"] || "") || Date.now() + 47 * 3600_000 });
  return d.access_token;
}

export default [
  {
    id: "blandai", name: "Bland AI", category: "ai", description: "Phone voice agents: calls, transcripts and numbers",
    website: "https://www.bland.ai", docs: "https://docs.bland.ai", logo: { favicon: "https://www.bland.ai" },
    baseUrl: "https://api.bland.ai/v1",
    auth: { type: "header", name: "authorization" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://app.bland.ai/dashboard/settings",
    help: "1) In the Bland dashboard open “Settings” → “API Key”. 2) Copy the key. 3) Each call minute is charged; the connection test is not.",
    test: { path: "/me", account: (d) => d?.data?.user?.email || d?.data?.user?.first_name },
    examples: "Examples: POST /calls {\"phone_number\": \"+1…\", \"task\": \"…\", \"voice\": \"…\", \"language\": \"en\"} (this places a real call), "
      + "GET /calls?limit=20, GET /calls/{call_id} (transcript and summary), GET /inbound (inbound numbers), GET /voices.",
  },
  {
    id: "botpress", name: "Botpress", category: "ai", description: "Chatbots and agents: bots, conversations, users and tables",
    website: "https://botpress.com", docs: "https://botpress.com/docs/api-reference", logo: { favicon: "https://botpress.com" },
    baseUrl: "https://api.botpress.cloud/v1",
    auth: { type: "bearer" },
    headers: (c) => (c.workspace ? { "x-workspace-id": c.workspace } : {}),
    fields: [{ id: "token", label: "Personal access token (bp_pat_…)", secret: true },
             { id: "workspace", label: "Workspace ID", optional: true, format: "segment",
               help: "Required for the bot administration routes (it appears in the panel URL)." }],
    keyUrl: "https://app.botpress.cloud/profile/settings",
    help: "1) In Botpress Cloud open your profile → “Settings” → “Personal Access Tokens” and generate a token. 2) Copy it and, if you are going to manage "
      + "bots, also enter the workspace ID.",
    test: { path: "/admin/account/me", account: (d) => d?.account?.email },
    examples: "Examples: GET /admin/bots (with x-workspace-id), GET /admin/bots/{id}, GET /chat/conversations (with the x-bot-id header), "
      + "GET /chat/messages?conversationId=…, GET /tables (with x-bot-id), POST /tables/{table}/rows/find {…}.",
  },
  {
    id: "braintrust", name: "Braintrust", category: "ai", description: "AI evaluation: projects, experiments, datasets and prompts",
    website: "https://www.braintrust.dev", docs: "https://www.braintrust.dev/docs/reference/api", logo: { favicon: "https://www.braintrust.dev" },
    baseUrl: "https://api.braintrust.dev/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://www.braintrust.dev/app/settings?subroute=api-keys",
    help: "1) In Braintrust open “Settings” → “API keys” and create a key. 2) Copy it: it is shown only once.",
    test: { path: "/project", query: { limit: 1 }, message: "API key is valid" },
    examples: "Examples: GET /project?limit=20, GET /experiment?project_id=…, GET /dataset?project_id=…, POST /dataset/{id}/insert {\"events\": "
      + "[{\"input\": …, \"expected\": …}]}, GET /prompt?project_id=…, POST /btql {\"query\": \"…\"} (queries over logs).",
  },
  {
    id: "byteplusark", name: "BytePlus ModelArk", category: "ai", description: "ByteDance AI models (Seed…) with an OpenAI-compatible API",
    website: "https://www.byteplus.com/en/product/modelark", docs: "https://docs.byteplus.com/en/docs/ModelArk", logo: { favicon: "https://www.byteplus.com" },
    baseUrl: "https://ark.ap-southeast.bytepluses.com/api/v3",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "ModelArk API key", secret: true }],
    help: "1) In the BytePlus console open “ModelArk” → “API Key Management” and create a key. 2) Activate the models you plan to use in "
      + "“Model activation”. 3) Each call is charged by tokens.",
    test: { path: "/models", message: "API key is valid" },
    examples: "OpenAI-compatible. Examples: POST /chat/completions {\"model\": \"seed-1-6-250615\", \"messages\": [{\"role\": \"user\", "
      + "\"content\": \"…\"}]}, POST /images/generations {\"model\": \"seedream-3-0-t2i-250415\", \"prompt\": \"…\"}, POST /embeddings {…}.",
  },
  {
    id: "cambai", name: "CAMB.AI", category: "ai", description: "AI dubbing, voice and multilingual translation",
    website: "https://www.camb.ai", docs: "https://docs.camb.ai", logo: { favicon: "https://www.camb.ai" },
    baseUrl: "https://client.camb.ai/apis",
    auth: { type: "header", name: "x-api-key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) Create an account in camb.ai Studio and open “API Keys”. 2) Copy the key. 3) Each dubbing or synthesis uses credits.",
    test: { path: "/source-languages", message: (d) => count(d, "source language", "source languages") || "API key is valid" },
    examples: "Examples: GET /source-languages, GET /target-languages, GET /list-voices, POST /tts {\"text\": \"…\", \"voice_id\": …, "
      + "\"language\": 54}, GET /tts/{task_id}, POST /end_to_end_dubbing {\"video_url\": \"…\", \"source_language\": 1, \"target_languages\": [54]}.",
  },
  {
    id: "ceramic", name: "Ceramic Search", category: "ai", description: "Fast lexical web search for AI agents",
    website: "https://ceramic.ai", docs: "https://docs.ceramic.ai", logo: { favicon: "https://ceramic.ai" },
    baseUrl: "https://api.ceramic.ai",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) Create an account at ceramic.ai and open “API Keys”. 2) Create a key and copy it. 3) Each search uses credits; the connection test "
      + "runs one.",
    test: { method: "POST", path: "/search", body: { query: "Conector" }, message: "API key is valid" },
    examples: "Examples: POST /search {\"query\": \"…\"} (results with title, URL and excerpt).",
  },
  {
    id: "chatbotkit", name: "ChatBotKit", category: "ai", description: "AI chatbots: bots, conversations, datasets and skills",
    website: "https://chatbotkit.com", docs: "https://chatbotkit.com/docs/api", logo: { favicon: "https://chatbotkit.com" },
    baseUrl: "https://api.chatbotkit.com/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API token", secret: true }],
    keyUrl: "https://chatbotkit.com/tokens",
    help: "1) In ChatBotKit open “Tokens” and create a token. 2) Copy it.",
    test: { path: "/bot/list", message: (d) => count(d?.items, "bot", "bots") || "Token is valid" },
    examples: "Examples: GET /bot/list, POST /bot/create {\"name\": \"…\", \"backstory\": \"…\"}, POST /conversation/complete {\"botId\": \"…\", "
      + "\"messages\": [{\"type\": \"user\", \"text\": \"…\"}]}, GET /dataset/list, POST /dataset/{id}/record/create {\"text\": \"…\"}.",
  },
  {
    id: "cody", name: "Cody", category: "ai", description: "AI assistant trained on your company's documentation",
    website: "https://getcody.ai", docs: "https://developers.getcody.ai", logo: { favicon: "https://getcody.ai" },
    baseUrl: "https://getcody.ai/api/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://getcody.ai/settings/api-keys",
    help: "1) In Cody open “Settings” → “API Keys” and create a key. 2) Copy it (the API is available on paid plans).",
    test: { path: "/bots", message: (d) => count(d?.data, "bot", "bots") || "API key is valid" },
    examples: "Examples: GET /bots, GET /conversations?bot_id=…, POST /conversations {\"name\": \"…\", \"bot_id\": \"…\"}, "
      + "POST /messages {\"content\": \"…\", \"conversation_id\": \"…\"}, POST /documents {\"name\": \"…\", \"folder_id\": \"…\", \"content\": \"…\"}.",
  },
  {
    id: "cometapi", name: "CometAPI", category: "ai", description: "One API for text, image, audio and video models (OpenAI-style)",
    website: "https://www.cometapi.com", docs: "https://apidoc.cometapi.com", logo: { favicon: "https://www.cometapi.com" },
    baseUrl: "https://api.cometapi.com/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key (sk-…)", secret: true }],
    help: "1) Create an account at cometapi.com and open “API Keys” in the console. 2) Create a key and copy it. 3) Each call is charged "
      + "according to the model.",
    test: { path: "/models", message: (d) => count(d?.data, "model", "models") || "API key is valid" },
    examples: "OpenAI-compatible. Examples: GET /models, POST /chat/completions {\"model\": \"…\", \"messages\": [{\"role\": \"user\", "
      + "\"content\": \"…\"}]}, POST /images/generations {\"model\": \"…\", \"prompt\": \"…\"}, POST /embeddings {…}.",
  },
  {
    id: "copyleaks", name: "Copyleaks", category: "ai", description: "Plagiarism and AI-generated text detection",
    website: "https://copyleaks.com", docs: "https://docs.copyleaks.com", logo: { favicon: "https://copyleaks.com" },
    baseUrl: "https://api.copyleaks.com",
    auth: { type: "custom", apply: async (c) => ({ headers: { Authorization: `Bearer ${await copyleaksToken(c)}` } }) },
    fields: [{ id: "email", label: "Your Copyleaks account email" }, { id: "token", label: "API key", secret: true }],
    keyUrl: "https://api.copyleaks.com/dashboard",
    help: "1) In the Copyleaks API dashboard copy your API key. 2) Enter the account email and the key here: Conector requests the "
      + "access token for you and renews it every 48 hours.",
    test: { path: "/v3/scans/credits", message: (d) => (d?.Amount != null ? `${d.Amount} credits` : "Credentials are valid") },
    examples: "Examples: PUT /v3/scans/submit/url/{scanId} {\"url\": \"https://…\", \"properties\": {\"webhooks\": {\"status\": \"https://…\"}}}, "
      + "POST /v2/writer-detector/{scanId}/check {\"text\": \"…\"} (checks whether text is AI-written), GET /v3/scans/credits.",
  },
  {
    id: "customgpt", name: "CustomGPT.ai", category: "ai", description: "Chatbots on your documents: projects, sources and conversations",
    website: "https://customgpt.ai", docs: "https://docs.customgpt.ai", logo: { favicon: "https://customgpt.ai" },
    baseUrl: "https://app.customgpt.ai/api/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://app.customgpt.ai/profile#api",
    help: "1) In CustomGPT.ai open your profile → “API” and create a key. 2) Copy it.",
    test: { path: "/projects", query: { limit: 1 }, message: "API key is valid" },
    examples: "Examples: GET /projects, POST /projects with form project_name=…&sitemap_path=https://…/sitemap.xml, "
      + "POST /projects/{id}/conversations, POST /projects/{id}/conversations/{sessionId}/messages {\"prompt\": \"…\"}, GET /projects/{id}/sources.",
  },
  {
    id: "datarobot", name: "DataRobot", category: "ai", description: "Automated ML: projects, models, deployments and predictions",
    website: "https://www.datarobot.com", docs: "https://docs.datarobot.com/en/docs/api/reference/public-api/", logo: { favicon: "https://www.datarobot.com" },
    baseUrl: "https://{server}/api/v2",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true },
             { id: "server", label: "Region", default: "app.datarobot.com",
               options: [["app.datarobot.com", "US"], ["app.eu.datarobot.com", "European Union"], ["app.jp.datarobot.com", "Japan"]] }],
    help: "1) In DataRobot open your profile → “API keys and tools” and create a key. 2) Copy it and choose your account's region here.",
    test: { path: "/account/info/", account: (d) => d?.email || d?.username },
    examples: "Examples: GET /projects/?limit=20, GET /deployments/?limit=20, GET /projects/{projectId}/models/, "
      + "POST /deployments/{deploymentId}/predictions (CSV or JSON), GET /useCases/.",
  },
  {
    id: "deepimage", name: "Deep-Image.ai", category: "design", description: "AI image enhancement and upscaling, backgrounds and retouching",
    website: "https://deep-image.ai", docs: "https://documentation.deep-image.ai", logo: { favicon: "https://deep-image.ai" },
    baseUrl: "https://deep-image.ai/rest_api",
    auth: { type: "header", name: "x-api-key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://deep-image.ai/app/my-profile/api",
    help: "1) In Deep-Image.ai open your profile → “API” and copy the key. 2) Each processed image uses credits. With a wrong key, the "
      + "API responds 404.",
    test: { path: "/me", account: (d) => d?.email || d?.username },
    examples: "Examples: GET /me (credits), POST /process_result {\"url\": \"https://…/photo.jpg\", \"width\": 2000, \"enhancements\": "
      + "[\"denoise\", \"deblur\"]}, POST /process {…} (asynchronous), GET /result/{job_hash}.",
  },
  {
    id: "edenai", name: "Eden AI", category: "ai", description: "One API for many AI providers: text, image, audio and OCR",
    website: "https://www.edenai.co", docs: "https://docs.edenai.co", logo: { favicon: "https://www.edenai.co" },
    baseUrl: "https://api.edenai.run/v2",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://app.edenai.run/admin/iam/api-keys",
    help: "1) In Eden AI open “Admin” → “API Keys”. 2) Copy the key. 3) Each call is charged according to the chosen provider.",
    test: { path: "/cost_management/credits/", message: (d) => (d?.credits != null ? `${d.credits} credits` : "API key is valid") },
    examples: "Examples: POST /text/chat {\"providers\": \"openai\", \"text\": \"…\"}, POST /translation/automatic_translation {\"providers\": "
      + "\"deepl\", \"source_language\": \"en\", \"target_language\": \"es\", \"text\": \"…\"}, POST /ocr/ocr {…}, GET /cost_management/credits/.",
  },
  {
    id: "elai", name: "Elai", category: "media", description: "AI presenter videos from text or slides",
    website: "https://elai.io", docs: "https://elai.readme.io/reference", logo: { favicon: "https://elai.io" },
    baseUrl: "https://apis.elai.io/api/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://app.elai.io/account",
    help: "1) In Elai open “Account” → “API” and copy the key. 2) Each rendered video uses minutes from your plan.",
    test: { path: "/videos", query: { limit: 1 }, message: "API key is valid" },
    examples: "Examples: GET /videos?limit=20, POST /videos/generate/from-text {…}, POST /videos/render/{videoId}, GET /videos/{videoId}, "
      + "GET /avatars, GET /voices.",
  },
  {
    id: "falai", name: "fal.ai", category: "ai", description: "600+ generative models for image, video and audio",
    website: "https://fal.ai", docs: "https://docs.fal.ai", logo: { favicon: "https://fal.ai" },
    baseUrl: "https://api.fal.ai/v1", allowedOrigins: ["https://queue.fal.run", "https://fal.run"],
    auth: { type: "header", name: "Authorization", prefix: "Key " },
    fields: [{ id: "token", label: "API key (id:secret)", secret: true }],
    keyUrl: "https://fal.ai/dashboard/keys",
    help: "1) In fal.ai open “Dashboard” → “Keys” and create a key. 2) Copy the full key (it has the form id:secret). 3) Each generation "
      + "is charged according to the model.",
    test: { path: "/models", query: { limit: 1 }, message: "API key is valid" },
    examples: "Examples: GET /models?q=flux, POST https://queue.fal.run/fal-ai/flux/dev {\"prompt\": \"…\"} (returns request_id), "
      + "GET https://queue.fal.run/fal-ai/flux/dev/requests/{id}/status, GET https://queue.fal.run/fal-ai/flux/dev/requests/{id}, "
      + "POST https://fal.run/fal-ai/flux/schnell {\"prompt\": \"…\"} (synchronous).",
  },
  {
    id: "fishaudio", name: "Fish Audio", category: "ai", description: "AI voice: text to speech, voice cloning and transcription",
    website: "https://fish.audio", docs: "https://docs.fish.audio", logo: { favicon: "https://fish.audio" },
    baseUrl: "https://api.fish.audio",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://fish.audio/app/api-keys/",
    help: "1) In Fish Audio open “API Keys” and create a key. 2) Copy it. 3) Each synthesis uses credits; the connection test only "
      + "checks the balance.",
    test: { path: "/wallet/self/api-credit", message: (d) => (d?.credit != null ? `${d.credit} credits` : "API key is valid") },
    examples: "Examples: POST /v1/tts {\"text\": \"…\", \"reference_id\": \"…\", \"format\": \"mp3\"} (returns audio), GET /model?page_size=20 "
      + "(voices), POST /v1/asr (multipart with audio: transcribes), GET /wallet/self/api-credit.",
  },
  {
    id: "flowise", name: "Flowise", category: "ai", description: "Open-source AI agents and flows: chatflows and predictions",
    website: "https://flowiseai.com", docs: "https://docs.flowiseai.com/api-reference", logo: { favicon: "https://flowiseai.com" },
    baseUrl: "{url}/api/v1",
    auth: { type: "bearer" },
    fields: [{ id: "url", label: "Your Flowise URL", format: "url", help: "The URL of your installation or of Flowise Cloud (e.g. https://cloud.flowiseai.com)." },
             { id: "token", label: "API key", secret: true }],
    help: "1) In Flowise open “API Keys” and create a key. 2) Enter the URL of your installation and the key here.",
    test: { path: "/chatflows", message: (d) => count(d, "chatflow", "chatflows") || "API key is valid" },
    examples: "Examples: GET /chatflows, POST /prediction/{chatflowId} {\"question\": \"…\"}, GET /chatmessage/{chatflowId}, "
      + "POST /vector/upsert/{chatflowId}, GET /document-store/store.",
  },
];
