// Batch 29 of the Composio catalog: AI (gender by name, transcription, Google vision, agents, avatar video, agent memory,
// images, voice, models, AI utilities, prompt security, observability and language, search).

const count = (d, one, many) => (Array.isArray(d) ? `${d.length} ${d.length === 1 ? one : many}` : null);

export default [
  {
    id: "genderize", name: "Genderize.io", category: "data", description: "Gender prediction from a first name",
    website: "https://genderize.io", docs: "https://genderize.io/documentation", logo: { favicon: "https://genderize.io" },
    baseUrl: "https://api.genderize.io",
    auth: { type: "query", name: "apikey" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://store.genderize.io/usage",
    help: "1) Without a key you can make 100 requests per day; for more, buy a plan at store.genderize.io. 2) Copy the API key from your "
      + "account.",
    test: { path: "/", query: { name: "ana" }, message: "API key is valid" },
    examples: "Examples: GET /?name=lucia&country_id=ES, GET /?name[]=ana&name[]=jordi&name[]=alex (up to 10 names).",
  },
  {
    id: "gladia", name: "Gladia", category: "ai", description: "AI audio transcription: diarization, translation and summaries",
    website: "https://www.gladia.io", docs: "https://docs.gladia.io/api-reference", logo: { favicon: "https://www.gladia.io" },
    baseUrl: "https://api.gladia.io/v2",
    auth: { type: "header", name: "x-gladia-key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://app.gladia.io/apikeys",
    help: "1) In the Gladia dashboard, open “API Keys” and create a key. 2) Copy it. 3) The free plan includes 10 hours per month.",
    test: { path: "/pre-recorded", query: { limit: 1 }, message: "API key is valid" },
    examples: "Examples: POST /pre-recorded {\"audio_url\": \"https://…/meeting.mp3\", \"diarization\": true, \"summarization\": true, "
      + "\"language_config\": {\"languages\": [\"en\"]}}, GET /pre-recorded/{id} (result), GET /pre-recorded?limit=20, POST /upload (multipart).",
  },
  {
    id: "googlecloudvision", name: "Google Cloud Vision", category: "ai", description: "Image analysis: labels, OCR, faces, logos and content",
    website: "https://cloud.google.com/vision", docs: "https://cloud.google.com/vision/docs/reference/rest", logo: { favicon: "https://cloud.google.com" },
    baseUrl: "https://vision.googleapis.com/v1",
    auth: { type: "query", name: "key" },
    fields: [{ id: "token", label: "Google Cloud API key", secret: true }],
    oauth: { provider: "google", scopes: ["https://www.googleapis.com/auth/cloud-vision"],
             help: "In the Google Cloud project of your Google OAuth application, enable the “Cloud Vision API” and billing." },
    keyUrl: "https://console.cloud.google.com/apis/credentials",
    help: "1) In Google Cloud Console, enable the “Cloud Vision API” in your project (it requires billing; the first 1,000 units per month "
      + "are free). 2) Under “APIs & Services” → “Credentials”, create an API key and, preferably, restrict it to Cloud Vision. 3) Copy it.",
    test: { method: "POST", path: "/images:annotate", body: { requests: [] }, message: "Credentials are valid" },
    examples: "Examples: POST /images:annotate {\"requests\": [{\"image\": {\"source\": {\"imageUri\": \"https://…/photo.jpg\"}}, \"features\": "
      + "[{\"type\": \"LABEL_DETECTION\", \"maxResults\": 10}, {\"type\": \"TEXT_DETECTION\"}]}]}, POST /files:annotate (PDF and TIFF), "
      + "POST /images:annotate with DOCUMENT_TEXT_DETECTION (document OCR).",
  },
  {
    id: "gptbots", name: "GPTBots", category: "ai", description: "Enterprise AI agents: bots, conversations and knowledge",
    website: "https://www.gptbots.ai", docs: "https://www.gptbots.ai/docs", logo: { favicon: "https://www.gptbots.ai" },
    baseUrl: "https://api.gptbots.ai/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "Agent API key", secret: true }],
    help: "1) In GPTBots, open your agent → “Integration” → “API” and create a key. 2) Copy it: each key belongs to one agent.",
    test: { path: "/bot/list", message: "API key is valid" },
    examples: "Examples: POST /conversation {\"user_id\": \"…\"}, POST /conversation/message {\"conversation_id\": \"…\", \"response_mode\": "
      + "\"blocking\", \"messages\": [{\"role\": \"user\", \"content\": \"…\"}]}, GET /bot/data/page?knowledge_base_id=…, POST /bot/data/text/add {…}.",
  },
  {
    id: "griptape", name: "Griptape Cloud", category: "ai", description: "AI agents and workflows: structures, runs and knowledge",
    website: "https://www.griptape.ai", docs: "https://docs.griptape.ai/stable/griptape-cloud/", logo: { favicon: "https://www.griptape.ai" },
    baseUrl: "https://cloud.griptape.ai/api",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://cloud.griptape.ai/configuration/api-keys",
    help: "1) In Griptape Cloud, open “Configuration” → “API Keys” and create a key. 2) Copy it.",
    test: { path: "/structures", message: (d) => count(d?.structures, "structure", "structures") || "API key is valid" },
    examples: "Examples: GET /structures, POST /structures/{id}/runs {\"args\": [\"…\"]}, GET /structure-runs/{runId}, GET /knowledge-bases, "
      + "POST /knowledge-bases/{id}/queries {\"query\": \"…\"}, GET /assistants.",
  },
  {
    id: "heygen", name: "HeyGen", category: "media", description: "AI avatar videos: templates, translation and quota",
    website: "https://www.heygen.com", docs: "https://docs.heygen.com/reference", logo: { favicon: "https://www.heygen.com" },
    baseUrl: "https://api.heygen.com",
    auth: { type: "header", name: "X-Api-Key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://app.heygen.com/settings?nav=API",
    help: "1) In HeyGen, open “Settings” → “API” and copy the key. 2) Each video uses API credits (separate from the app's credits).",
    test: { path: "/v2/user/remaining_quota", message: (d) => (d?.data?.remaining_quota != null ? `Remaining quota: ${d.data.remaining_quota}` : "API key is valid") },
    examples: "Examples: GET /v2/avatars, GET /v2/voices, POST /v2/video/generate {\"video_inputs\": [{\"character\": {\"type\": \"avatar\", "
      + "\"avatar_id\": \"…\"}, \"voice\": {\"type\": \"text\", \"input_text\": \"…\", \"voice_id\": \"…\"}}]}, GET /v1/video_status.get?video_id=…, "
      + "GET /v2/templates.",
  },
  {
    id: "honcho", name: "Honcho", category: "ai", description: "Memory and context for agents: users, sessions and messages",
    website: "https://honcho.dev", docs: "https://docs.honcho.dev", logo: { favicon: "https://honcho.dev" },
    baseUrl: "https://api.honcho.dev/v2",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://app.honcho.dev/api-keys",
    help: "1) In the Honcho dashboard, open “API Keys” and create a key. 2) Copy it.",
    test: { method: "POST", path: "/workspaces/list", body: {}, message: "API key is valid" },
    examples: "Examples: POST /workspaces/list {}, POST /workspaces/{ws}/peers/list {}, POST /workspaces/{ws}/sessions {\"id\": \"…\"}, "
      + "POST /workspaces/{ws}/sessions/{s}/messages {\"messages\": [{\"peer_id\": \"…\", \"content\": \"…\"}]}, "
      + "POST /workspaces/{ws}/peers/{peer}/chat {\"query\": \"What does this user prefer?\"}.",
  },
  {
    id: "imagerouter", name: "ImageRouter", category: "ai", description: "One API for image and video models (OpenAI-compatible)",
    website: "https://imagerouter.io", docs: "https://docs.imagerouter.io", logo: { favicon: "https://imagerouter.io" },
    baseUrl: "https://api.imagerouter.io/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://imagerouter.io/api-keys",
    help: "1) In imagerouter.io, open “API Keys” and create a key. 2) Copy it. 3) Some models are free; paid ones use credits.",
    test: { path: "/credits", message: "API key is valid" },
    examples: "Examples: POST /openai/images/generations {\"prompt\": \"…\", \"model\": \"…\"}, POST /openai/videos/generations {…}, "
      + "GET /models, GET /credits.",
  },
  {
    id: "inworld", name: "Inworld AI", category: "ai", description: "AI voice: realistic text-to-speech, cloning and recognition",
    website: "https://inworld.ai", docs: "https://docs.inworld.ai/api-reference", logo: { favicon: "https://inworld.ai" },
    baseUrl: "https://api.inworld.ai",
    auth: { type: "header", name: "Authorization", prefix: "Basic " },
    fields: [{ id: "token", label: "API key (Base64)", secret: true }],
    keyUrl: "https://platform.inworld.ai/api-keys",
    help: "1) In the Inworld portal, open “API Keys” and create a key. 2) Copy the “Basic (Base64)” value shown in the console.",
    test: { path: "/tts/v1/voices", message: (d) => count(d?.voices, "voice", "voices") || "API key is valid" },
    examples: "Examples: GET /tts/v1/voices?filter=language=en, POST /tts/v1/voice {\"text\": \"…\", \"voiceId\": \"…\", \"modelId\": "
      + "\"inworld-tts-1\"} (base64 audio), POST /tts/v1/voice:stream {…}.",
  },
  {
    id: "jev", name: "Jev (TypeSafe)", category: "ai", description: "Discover and evaluate AI models: catalog and comparisons",
    website: "https://typesafe.ai", docs: "https://docs.typesafe.ai", logo: { favicon: "https://typesafe.ai" },
    baseUrl: "https://api.typesafe.ai/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) In the TypeSafe AI dashboard, open “API Keys” and create a key for System One. 2) Copy it.",
    test: { path: "/models", message: (d) => count(d?.data, "model", "models") || "API key is valid" },
    examples: "Examples: GET /models, GET /models/{id}, POST /evaluations {…}, GET /evaluations/{id}.",
  },
  {
    id: "jigsawstack", name: "JigsawStack", category: "ai", description: "Small AI models: scraping, OCR, translation, search and more",
    website: "https://jigsawstack.com", docs: "https://jigsawstack.com/docs/api-reference", logo: { favicon: "https://jigsawstack.com" },
    baseUrl: "https://api.jigsawstack.com/v1",
    auth: { type: "header", name: "x-api-key" },
    fields: [{ id: "token", label: "API key (sk_…)", secret: true }],
    keyUrl: "https://jigsawstack.com/dashboard",
    help: "1) Create an account at jigsawstack.com and copy the API key from the dashboard. 2) Each call uses your quota (there is a free plan).",
    // Without data, a valid key responds 400 without using quota.
    test: { method: "POST", path: "/ai/scrape", body: {}, acceptStatus: [400], message: "API key is valid" },
    examples: "Examples: POST /ai/scrape {\"url\": \"https://…\", \"element_prompts\": [\"price\", \"title\"]}, POST /ai/translate {\"text\": \"…\", "
      + "\"target_language\": \"es\"}, POST /vocr {\"url\": \"https://…/invoice.png\", \"prompt\": [\"total\", \"date\"]}, POST /web/search {\"query\": \"…\"}.",
  },
  {
    id: "joggai", name: "JoggAI", category: "media", description: "AI avatar videos, products and lip sync",
    website: "https://www.jogg.ai", docs: "https://docs.jogg.ai", logo: { favicon: "https://www.jogg.ai" },
    baseUrl: "https://api.jogg.ai",
    auth: { type: "header", name: "x-api-key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) In JoggAI, open “Settings” → “API” and generate a key. 2) Copy it. 3) Each video uses credits.",
    // Errors arrive with their own code (10105: invalid key).
    test: { path: "/v1/avatars", validate: (d) => { if (d?.code && d.code !== 0) throw new Error(`JoggAI: ${d.msg || d.code}`); },
              message: "API key is valid" },
    examples: "Examples: GET /v2/avatars/public, GET /v1/voices, POST /v1/create_video_from_talking_avatar {\"avatar_id\": …, \"voice_id\": \"…\", "
      + "\"script\": \"…\"}, GET /v1/project?project_id=….",
  },
  {
    id: "kieai", name: "Kie.ai", category: "ai", description: "Video, image, music and LLMs via API (Veo, Suno, Flux…)",
    website: "https://kie.ai", docs: "https://docs.kie.ai", logo: { favicon: "https://kie.ai" },
    baseUrl: "https://api.kie.ai/api/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://kie.ai/api-key",
    help: "1) Create an account at kie.ai and open “API Key”. 2) Copy the key. 3) Each generation uses credits; the test only checks the balance.",
    // Errors arrive with 200 and a code other than 200.
    test: { path: "/chat/credit", validate: (d) => { if (d?.code && d.code !== 200) throw new Error(`Kie.ai: ${d.msg || d.code}`); },
              message: (d) => (d?.data != null ? `${d.data} credits` : "API key is valid") },
    examples: "Examples: GET /chat/credit, POST /veo/generate {\"prompt\": \"…\", \"model\": \"veo3_fast\"}, GET /veo/record-info?taskId=…, "
      + "POST /generate {\"prompt\": \"…\", \"customMode\": false} (music with Suno), POST /flux/kontext/generate {…}.",
  },
  {
    id: "lakeraguard", name: "Lakera Guard", category: "security", description: "AI protection: prompt injection, data leaks and content",
    website: "https://www.lakera.ai", docs: "https://docs.lakera.ai/docs/api", logo: { favicon: "https://www.lakera.ai" },
    baseUrl: "https://api.lakera.ai/v2",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://platform.lakera.ai/account/api-keys",
    help: "1) In the Lakera platform, open “API Keys” and create a key. 2) Copy it (the community plan is free with a monthly limit).",
    test: { method: "POST", path: "/guard", body: { messages: [{ role: "user", content: "Hello" }] },
              message: (d) => (d?.flagged != null ? `Key is valid (test flagged: ${d.flagged ? "yes" : "no"})` : "API key is valid") },
    examples: "Examples: POST /guard {\"messages\": [{\"role\": \"user\", \"content\": \"…\"}], \"breakdown\": true} (is there injection, personal data, "
      + "or harmful content?), POST /guard/results {…} (detail per detector).",
  },
  {
    id: "langbase", name: "Langbase", category: "ai", description: "Serverless AI: pipes (agents), RAG memory and threads",
    website: "https://langbase.com", docs: "https://langbase.com/docs/api-reference", logo: { favicon: "https://langbase.com" },
    baseUrl: "https://api.langbase.com/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "User or organization API key", secret: true }],
    keyUrl: "https://langbase.com/settings/api",
    help: "1) In Langbase, open “Settings” → “API keys” and create a user or organization key. 2) Copy it.",
    test: { path: "/pipes", message: (d) => count(d, "pipe", "pipes") || "API key is valid" },
    examples: "Examples: GET /pipes, POST /pipes/run {\"name\": \"…\", \"messages\": [{\"role\": \"user\", \"content\": \"…\"}]}, GET /memory, "
      + "POST /memory/retrieve {\"query\": \"…\", \"memory\": [{\"name\": \"…\"}]}, POST /threads {…}.",
  },
  {
    id: "langfuse", name: "Langfuse", category: "ai", description: "LLM observability: traces, evaluations, prompts and costs",
    website: "https://langfuse.com", docs: "https://api.reference.langfuse.com", logo: { favicon: "https://langfuse.com" },
    baseUrl: "https://{server}/api/public",
    auth: { type: "basic", usernameField: "username", passwordField: "token" },
    fields: [{ id: "username", label: "Public key (pk-lf-…)" }, { id: "token", label: "Secret key (sk-lf-…)", secret: true },
             { id: "server", label: "Region", default: "cloud.langfuse.com",
               options: [["cloud.langfuse.com", "European Union"], ["us.cloud.langfuse.com", "US"], ["hipaa.cloud.langfuse.com", "HIPAA (US)"]] }],
    help: "1) In Langfuse, open the project → “Settings” → “API Keys” and click “Create new API keys”. 2) Copy the public key and the secret key (shown "
      + "only once) and choose the region here.",
    test: { path: "/projects", account: (d) => d?.data?.[0]?.name },
    examples: "Examples: GET /traces?limit=20, GET /traces/{id}, GET /observations?traceId=…, GET /scores?limit=20, GET /v2/prompts, "
      + "GET /metrics/daily?fromTimestamp=…, POST /scores {\"traceId\": \"…\", \"name\": \"quality\", \"value\": 1}.",
  },
  {
    id: "linguin", name: "Linguin AI", category: "ai", description: "Language detection and offensive language scoring",
    website: "https://linguin.ai", docs: "https://linguin.ai/api-docs", logo: { favicon: "https://linguin.ai" },
    baseUrl: "https://api.linguin.ai/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) Create an account at linguin.ai and copy the API key from your dashboard (there is a free plan with a daily limit).",
    test: { method: "POST", path: "/detect", form: { q: "Hello, how are you?" }, message: "API key is valid" },
    examples: "Examples: POST /detect with form q=… (language with probability), POST /bulk_detect with form q[]=…&q[]=…, "
      + "POST /profanity with form q=… (score from 0 to 1, English only), GET /status.",
  },
  {
    id: "linkup", name: "Linkup", category: "ai", description: "Web search for AI and RAG: results, answers with sources",
    website: "https://www.linkup.so", docs: "https://docs.linkup.so", logo: { favicon: "https://www.linkup.so" },
    baseUrl: "https://api.linkup.so/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://app.linkup.so/api-keys",
    help: "1) In the Linkup dashboard, open “API Keys” and copy the key. 2) Each search uses credits; the test only checks the balance.",
    test: { path: "/credits/balance", message: (d) => (d?.balance != null ? `${d.balance} credits` : "API key is valid") },
    examples: "Examples: POST /search {\"q\": \"…\", \"depth\": \"standard\", \"outputType\": \"searchResults\"}, POST /search {\"q\": \"…\", "
      + "\"depth\": \"deep\", \"outputType\": \"sourcedAnswer\"}, POST /fetch {\"url\": \"https://…\"}, GET /credits/balance.",
  },
];
