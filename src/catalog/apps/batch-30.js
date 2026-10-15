// Batch 30 of the Composio catalog: AI (documents for LLMs, video and image, agents, brand style, moderation, RAG,
// cloud models, AI quality, generative interfaces, prompts, transcription, vision, NLP, GPU and data labeling).

const count = (d, one, many) => (Array.isArray(d) ? `${d.length} ${d.length === 1 ? one : many}` : null);

export default [
  {
    id: "llmwhisperer", name: "LLMWhisperer", category: "ai", description: "Complex documents (PDF, scans, tables) to text for LLMs",
    website: "https://unstract.com/llmwhisperer/", docs: "https://docs.unstract.com/llmwhisperer/", logo: { favicon: "https://unstract.com" },
    baseUrl: "https://{server}/api/v2",
    auth: { type: "header", name: "unstract-key" },
    fields: [{ id: "token", label: "API key", secret: true },
             { id: "server", label: "Region", default: "llmwhisperer-api.us-central.unstract.com",
               options: [["llmwhisperer-api.us-central.unstract.com", "US"], ["llmwhisperer-api.eu-west.unstract.com", "European Union"]] }],
    keyUrl: "https://us-central.unstract.com/llm-whisperer",
    help: "1) Create an account at unstract.com and open LLMWhisperer → “API Keys”. 2) Copy the key and choose your account's region here. "
      + "3) The free plan allows 100 pages per day.",
    test: { path: "/get-usage-info", message: (d) => (d?.daily_quota != null ? `${d.today_page_count ?? 0} of ${d.daily_quota} pages today` : "API key is valid") },
    examples: "Examples: POST /whisper?mode=form&output_mode=layout_preserving (binary body of the PDF with content_type application/octet-stream), "
      + "POST /whisper?url=https://…/invoice.pdf, GET /whisper-status?whisper_hash=…, GET /whisper-retrieve?whisper_hash=…, GET /get-usage-info.",
  },
  {
    id: "lumalabs", name: "Luma AI (Dream Machine)", category: "ai", description: "AI videos and images: Ray, Photon and generations",
    website: "https://lumalabs.ai", docs: "https://docs.lumalabs.ai/reference", logo: { favicon: "https://lumalabs.ai" },
    baseUrl: "https://api.lumalabs.ai/dream-machine/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://lumalabs.ai/dream-machine/api/keys",
    help: "1) In Luma AI, open “API” → “Keys” and create a key (the API is paid separately from the app plan). 2) Copy it.",
    test: { path: "/generations", query: { limit: 1 }, message: "API key is valid" },
    examples: "Examples: POST /generations {\"prompt\": \"…\", \"model\": \"ray-2\", \"aspect_ratio\": \"16:9\"}, GET /generations/{id}, "
      + "GET /generations?limit=20, POST /generations/image {\"prompt\": \"…\", \"model\": \"photon-1\"}, GET /credits.",
  },
  {
    id: "lyzr", name: "Lyzr", category: "ai", description: "AI agents: create, run and manage agents and their memory",
    website: "https://www.lyzr.ai", docs: "https://docs.lyzr.ai", logo: { favicon: "https://www.lyzr.ai" },
    baseUrl: "https://agent-prod.studio.lyzr.ai",
    auth: { type: "header", name: "x-api-key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://studio.lyzr.ai/account",
    help: "1) In Lyzr Studio, open your account → “API Keys”. 2) Copy the key.",
    test: { path: "/v3/agents/", message: (d) => count(d, "agent", "agents") || "API key is valid" },
    examples: "Examples: GET /v3/agents/, GET /v3/agents/{agentId}, POST /v3/inference/chat/ {\"user_id\": \"…\", \"agent_id\": \"…\", "
      + "\"session_id\": \"…\", \"message\": \"…\"}, POST /v3/agents/ {…}.",
  },
  {
    id: "markupai", name: "Markup AI", category: "ai", description: "Brand style and terminology: text review and rewriting",
    website: "https://markup.ai", docs: "https://docs.markup.ai", logo: { favicon: "https://markup.ai" },
    baseUrl: "https://api.markup.ai/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) In Markup AI, open “Settings” → “API Keys” and create a key. 2) Copy it.",
    test: { path: "/style-guides", message: (d) => count(d, "style guide", "style guides") || "API key is valid" },
    examples: "Examples: GET /style-guides, POST /style/checks (multipart with file_upload, style_guide, dialect and tone), GET /style/checks/{id}, "
      + "POST /style/rewrites (multipart: rewrites according to the guide), GET /style/rewrites/{id}.",
  },
  {
    id: "moderationapi", name: "Moderation API", category: "security", description: "Content moderation: text and images, review queues",
    website: "https://moderationapi.com", docs: "https://docs.moderationapi.com", logo: { favicon: "https://moderationapi.com" },
    baseUrl: "https://api.moderationapi.com/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "Project API key", secret: true }],
    help: "1) In the Moderation API dashboard, open your project → “Settings” → “API Key”. 2) Copy the project key.",
    test: { path: "/account", account: (d) => d?.name || d?.id },
    examples: "Examples: POST /moderate/text {\"value\": \"…\", \"authorId\": \"…\"}, POST /moderate/image {\"url\": \"https://…\"}, GET /account, "
      + "GET /review_queues/{queueId}/items, POST /actions/execute {…}.",
  },
  {
    id: "needle", name: "Needle", category: "ai", description: "Managed RAG: collections, files and semantic search",
    website: "https://needle.app", docs: "https://docs.needle.app", logo: { favicon: "https://needle.app" },
    baseUrl: "https://needle.app/api/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key (sk-ndl-…)", secret: true }],
    keyUrl: "https://needle.app/dashboard/settings",
    help: "1) In Needle, open “Settings” → “API Keys” and create a key (it starts with sk-ndl-). 2) Copy it.",
    test: { path: "/collections", message: (d) => count(d?.result, "collection", "collections") || "API key is valid" },
    examples: "Examples: GET /collections, POST /collections {\"name\": \"…\"}, POST /collections/{id}/files {\"files\": [{\"name\": \"…\", "
      + "\"url\": \"https://…\"}]}, POST /collections/{id}/search {\"text\": \"…\"}, GET /collections/{id}/files.",
  },
  {
    id: "ollama", name: "Ollama Cloud", category: "ai", description: "Open models on Ollama's cloud: chat, generation and embeddings",
    website: "https://ollama.com", docs: "https://docs.ollama.com/cloud", logo: { favicon: "https://ollama.com" },
    baseUrl: "https://ollama.com/api",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "Ollama API key", secret: true }],
    keyUrl: "https://ollama.com/settings/keys",
    help: "1) Sign in at ollama.com and open “Settings” → “Keys”. 2) Create a key and copy it. 3) Cloud models have a free "
      + "quota; paid plans give more.",
    // The model list is public: the key is checked when a model is used.
    test: { path: "/tags", message: (d) => `Response received (${count(d?.models, "model", "models") || "models"}; the key is checked when one is used)` },
    examples: "Examples: GET /tags (cloud models), POST /chat {\"model\": \"gpt-oss:120b\", \"messages\": [{\"role\": \"user\", \"content\": "
      + "\"…\"}], \"stream\": false}, POST /generate {\"model\": \"…\", \"prompt\": \"…\", \"stream\": false}, POST /embed {\"model\": \"…\", \"input\": \"…\"}.",
  },
  {
    id: "openlayer", name: "Openlayer", category: "ai", description: "AI quality: projects, tests, monitoring and inferences",
    website: "https://www.openlayer.com", docs: "https://www.openlayer.com/docs/api-reference", logo: { favicon: "https://www.openlayer.com" },
    baseUrl: "https://api.openlayer.com/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://app.openlayer.com/settings/api-keys",
    help: "1) In Openlayer, open “Settings” → “API Keys” and create a key. 2) Copy it.",
    test: { path: "/projects", message: (d) => count(d?.items, "project", "projects") || "API key is valid" },
    examples: "Examples: GET /projects, GET /projects/{id}/inference-pipelines, GET /inference-pipelines/{id}/test-results, "
      + "POST /inference-pipelines/{id}/data-stream {\"config\": {…}, \"rows\": [{…}]}, GET /projects/{id}/commits.",
  },
  {
    id: "openui", name: "OpenUI (Thesys)", category: "ai", description: "Generative UI: AI responds with interactive components",
    website: "https://www.thesys.dev", docs: "https://docs.thesys.dev", logo: { favicon: "https://www.thesys.dev" },
    baseUrl: "https://api.thesys.dev/v1/embed",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://console.thesys.dev/keys",
    help: "1) In the Thesys console, open “API Keys” and create a key. 2) Copy it. 3) Each response is billed by tokens.",
    test: { path: "/models", message: (d) => count(d?.data, "model", "models") || "API key is valid" },
    examples: "OpenAI-compatible. Examples: GET /models, POST /chat/completions {\"model\": \"c1/anthropic/claude-sonnet-4/v-20250815\", "
      + "\"messages\": [{\"role\": \"user\", \"content\": \"Show me sales by month\"}]} (returns a C1 interface).",
  },
  {
    id: "prompthub", name: "PromptHub", category: "ai", description: "Prompt management: projects, versions and runs",
    website: "https://www.prompthub.us", docs: "https://app.prompthub.us/api/docs", logo: { favicon: "https://www.prompthub.us" },
    baseUrl: "https://app.prompthub.us/api/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API token", secret: true }],
    keyUrl: "https://app.prompthub.us/account/api",
    help: "1) In PromptHub, open “Account” → “API” and create a token. 2) Copy it.",
    test: { path: "/me", account: (d) => d?.data?.email || d?.data?.name },
    examples: "Examples: GET /me, GET /teams/{teamId}/projects, GET /projects/{projectId}/head (current version of the prompt), "
      + "POST /projects/{projectId}/run {\"variables\": {…}}, GET /projects/{projectId}/commits.",
  },
  {
    id: "promptlayer", name: "PromptLayer", category: "ai", description: "Prompts and LLM observability: templates, logs and evaluations",
    website: "https://www.promptlayer.com", docs: "https://docs.promptlayer.com/reference", logo: { favicon: "https://www.promptlayer.com" },
    baseUrl: "https://api.promptlayer.com",
    auth: { type: "header", name: "X-API-KEY" },
    fields: [{ id: "token", label: "API key (pl_…)", secret: true }],
    help: "1) In PromptLayer, open “Settings” → “API Keys” and create a key. 2) Copy it.",
    test: { path: "/prompt-templates", message: "API key is valid" },
    examples: "Examples: GET /prompt-templates, POST /prompt-templates/{name} {\"label\": \"prod\"} (gets the version), "
      + "POST /log-request {…}, GET /requests/{id}, GET /reports, POST /workflows/{name}/run {…}.",
  },
  {
    id: "revai", name: "Rev AI", category: "ai", description: "Audio and video transcription: jobs, captions and languages",
    website: "https://www.rev.ai", docs: "https://docs.rev.ai/api/", logo: { favicon: "https://www.rev.ai" },
    baseUrl: "https://api.rev.ai/speechtotext/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "Access token", secret: true }],
    keyUrl: "https://www.rev.ai/access-token",
    help: "1) In Rev AI, open “Access Token” and generate a token. 2) Copy it: it is shown only once. 3) Each transcribed minute is charged; the "
      + "connection test is not.",
    test: { path: "/account", account: (d) => d?.email },
    examples: "Examples: POST /jobs {\"source_config\": {\"url\": \"https://…/audio.mp3\"}, \"language\": \"en\"}, GET /jobs/{id}, "
      + "GET /jobs/{id}/transcript (Accept: text/plain or application/vnd.rev.transcript.v1.0+json), GET /jobs/{id}/captions, GET /jobs?limit=20.",
  },
  {
    id: "roboflow", name: "Roboflow", category: "ai", description: "Computer vision: projects, datasets, models and inference",
    website: "https://roboflow.com", docs: "https://docs.roboflow.com/api-reference", logo: { favicon: "https://roboflow.com" },
    baseUrl: "https://api.roboflow.com", allowedOrigins: ["https://detect.roboflow.com", "https://serverless.roboflow.com"],
    auth: { type: "query", name: "api_key" },
    fields: [{ id: "token", label: "Private API key", secret: true }],
    keyUrl: "https://app.roboflow.com/settings/api",
    help: "1) In Roboflow, open the workspace's “Settings” → “API Keys”. 2) Copy the “Private API Key”.",
    test: { path: "/", account: (d) => d?.workspace },
    examples: "Examples: GET / (workspace), GET /{workspace}, GET /{workspace}/{project}, GET /{workspace}/{project}/{version}, "
      + "POST https://serverless.roboflow.com/{project}/{version}?image=https://… (inference).",
  },
  {
    id: "babelstreet", name: "Babel Street Analytics (Rosette)", category: "ai", description: "Multilingual NLP: entities, sentiment, language and names",
    website: "https://www.babelstreet.com", docs: "https://docs.babelstreet.com/API/en/index-en.html", logo: { favicon: "https://www.babelstreet.com" },
    baseUrl: "https://analytics.babelstreet.com/rest/v1",
    auth: { type: "header", name: "X-BabelStreetAPI-Key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) In the Babel Street Analytics portal (formerly Rosette), open your account and copy the API key. 2) Old Rosette keys "
      + "still work.",
    test: { path: "/ping", message: "API key is valid" },
    examples: "Examples: POST /entities {\"content\": \"…\"}, POST /sentiment {\"content\": \"…\", \"language\": \"eng\"}, POST /language "
      + "{\"content\": \"…\"}, POST /name-similarity {\"name1\": {\"text\": \"…\"}, \"name2\": {\"text\": \"…\"}}, GET /info.",
  },
  {
    id: "runpod", name: "RunPod", category: "ai", description: "Cloud GPUs: pods, serverless endpoints and templates",
    website: "https://www.runpod.io", docs: "https://docs.runpod.io/api-reference", logo: { favicon: "https://www.runpod.io" },
    baseUrl: "https://rest.runpod.io/v1", allowedOrigins: ["https://api.runpod.ai"],
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://www.runpod.io/console/user/settings",
    help: "1) In the RunPod console, open “Settings” → “API Keys” and create a key (read-only or read and write). 2) Copy it. "
      + "3) Pods and endpoints are billed by usage: creating one costs money.",
    test: { path: "/pods", message: (d) => count(d, "pod", "pods") || "API key is valid" },
    examples: "Examples: GET /pods, GET /pods/{podId}, POST /pods/{podId}/stop, GET /endpoints, GET /templates, "
      + "POST https://api.runpod.ai/v2/{endpointId}/runsync {\"input\": {…}} (runs a serverless endpoint).",
  },
  {
    id: "scaleai", name: "Scale AI", category: "ai", description: "Data labeling: projects, batches and annotation tasks",
    website: "https://scale.com", docs: "https://docs.scale.com/reference", logo: { favicon: "https://scale.com" },
    baseUrl: "https://api.scale.com/v1",
    auth: { type: "basic", usernameField: "token", fixedPassword: "" },
    fields: [{ id: "token", label: "API key (live_… or test_…)", secret: true }],
    keyUrl: "https://dashboard.scale.com/settings/api-keys",
    help: "1) In the Scale dashboard, open “Settings” → “API Keys”. 2) Copy the key (test_… for testing, live_… for production): "
      + "Conector sends it as the Basic auth username with an empty password.",
    test: { path: "/projects", message: (d) => count(d, "project", "projects") || "API key is valid" },
    examples: "Examples: GET /projects, GET /batches?project=…, GET /tasks?project=…&status=completed&limit=20, GET /task/{taskId}, "
      + "POST /task/imageannotation {…}.",
  },
];
