// Batch 31 of the catalog, from the Composio catalog: AI (academic research, transcription, models, memory, NLP, voice, social
// publishing, voice agents, GPUs, workflows, model gateways, visual extraction, ML experiments, AI detection) and email.

const count = (d, one, many) => (Array.isArray(d) ? `${d.length} ${d.length === 1 ? one : many}` : null);

export default [
  {
    id: "semanticscholar", name: "Semantic Scholar", category: "education", description: "Scientific papers: search, authors, citations and recommendations",
    website: "https://www.semanticscholar.org", docs: "https://api.semanticscholar.org/api-docs/", logo: { favicon: "https://www.semanticscholar.org" },
    baseUrl: "https://api.semanticscholar.org/graph/v1", allowedOrigins: ["https://api.semanticscholar.org"],
    auth: { type: "header", name: "x-api-key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://www.semanticscholar.org/product/api#api-key-form",
    help: "1) Request a free key at semanticscholar.org/product/api (“API Key” form). 2) Copy the key they send you by email: "
      + "it gives a guaranteed 1 request per second (without a key, the quota is shared).",
    test: { path: "/paper/search", query: { query: "transformers", limit: 1 }, message: "API key is valid" },
    examples: "Examples: GET /paper/search?query=…&fields=title,year,authors,abstract&limit=10, GET /paper/{paperId}?fields=title,citationCount, "
      + "GET /paper/{paperId}/citations?limit=20, GET /author/search?query=…, GET https://api.semanticscholar.org/recommendations/v1/papers/forpaper/{paperId}.",
  },
  {
    id: "speechmatics", name: "Speechmatics", category: "ai", description: "Audio and video transcription in more than 50 languages",
    website: "https://www.speechmatics.com", docs: "https://docs.speechmatics.com/api-ref/", logo: { favicon: "https://www.speechmatics.com" },
    baseUrl: "https://{server}/v2",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true },
             { id: "server", label: "Region", default: "asr.api.speechmatics.com",
               options: [["asr.api.speechmatics.com", "European Union"], ["us1.asr.api.speechmatics.com", "US"]] }],
    keyUrl: "https://portal.speechmatics.com/settings/api-keys",
    help: "1) In the Speechmatics portal, open “Settings” → “API Keys” and create a key. 2) Copy it and choose the region here. 3) The "
      + "free plan includes 8 hours per month.",
    test: { path: "/jobs", query: { limit: 1 }, message: "API key is valid" },
    examples: "Examples: POST /jobs (multipart with config {\"type\": \"transcription\", \"transcription_config\": {\"language\": \"es\", "
      + "\"diarization\": \"speaker\"}} and data_file, or fetch_data.url), GET /jobs?limit=20, GET /jobs/{id}, GET /jobs/{id}/transcript?format=txt.",
  },
  {
    id: "ai21", name: "AI21 Studio", category: "ai", description: "AI21 Jamba models: chat, documents and file library",
    website: "https://www.ai21.com", docs: "https://docs.ai21.com/reference", logo: { favicon: "https://www.ai21.com" },
    baseUrl: "https://api.ai21.com/studio/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://studio.ai21.com/v2/account/api-key",
    help: "1) In AI21 Studio, open “Account” → “API Key”. 2) Copy the key. 3) Each call is billed by tokens (there is trial credit).",
    test: { path: "/library/files", message: "API key is valid" },
    examples: "Examples: POST /chat/completions {\"model\": \"jamba-large\", \"messages\": [{\"role\": \"user\", \"content\": \"…\"}]}, "
      + "GET /library/files, POST /library/files (multipart), POST /maestro/runs {\"input\": \"…\"}.",
  },
  {
    id: "supermemory", name: "Supermemory", category: "ai", description: "Memory for AI: store, organize and search content and context",
    website: "https://supermemory.ai", docs: "https://supermemory.ai/docs/api-reference", logo: { favicon: "https://supermemory.ai" },
    baseUrl: "https://api.supermemory.ai/v3",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://console.supermemory.ai/keys",
    help: "1) In the Supermemory console, open “API Keys” and create a key. 2) Copy it.",
    test: { method: "POST", path: "/documents/list", body: { limit: 1 }, message: "API key is valid" },
    examples: "Examples: POST /documents {\"content\": \"…\", \"containerTags\": [\"customer-123\"]}, POST /documents/list {\"limit\": 20}, "
      + "POST /search {\"q\": \"…\", \"limit\": 5}, GET /documents/{id}, DELETE /documents/{id}.",
  },
  {
    id: "textrazor", name: "TextRazor", category: "ai", description: "NLP: entities, topics, relations and text classification",
    website: "https://www.textrazor.com", docs: "https://www.textrazor.com/docs/rest", logo: { favicon: "https://www.textrazor.com" },
    baseUrl: "https://api.textrazor.com",
    auth: { type: "header", name: "x-textrazor-key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://www.textrazor.com/console",
    help: "1) Create an account at textrazor.com (500 free requests per day). 2) Copy the API key from the console.",
    test: { path: "/account/", message: (d) => (d?.response?.plan ? `Plan ${d.response.plan}` : "API key is valid") },
    examples: "Examples: POST / with form text=…&extractors=entities,topics&languageOverride=spa, POST / with form url=https://…&"
      + "extractors=entities, POST / with form text=…&classifiers=textrazor_newscodes, GET /account/.",
  },
  {
    id: "tisane", name: "Tisane", category: "ai", description: "NLP: detects abuse, insults and problematic content in 30 languages",
    website: "https://tisane.ai", docs: "https://docs.tisane.ai", logo: { favicon: "https://tisane.ai" },
    baseUrl: "https://api.tisane.ai",
    auth: { type: "header", name: "Ocp-Apim-Subscription-Key" },
    fields: [{ id: "token", label: "Subscription key", secret: true }],
    keyUrl: "https://dev.tisane.ai/profile",
    help: "1) Sign up at dev.tisane.ai and subscribe to a plan (there is a free one). 2) In your profile, copy the primary key of the subscription.",
    test: { path: "/languages", message: (d) => count(d, "language", "languages") || "Key is valid" },
    examples: "Examples: POST /parse {\"language\": \"es\", \"content\": \"…\", \"settings\": {\"snippets\": true}} (abuse, sentiment, entities), "
      + "POST /transform {\"from\": \"es\", \"to\": \"en\", \"content\": \"…\"}, GET /languages.",
  },
  {
    id: "typecast", name: "Typecast", category: "ai", description: "Expressive AI voices: text-to-speech with emotions and voices",
    website: "https://typecast.ai", docs: "https://typecast.ai/docs/api-reference", logo: { favicon: "https://typecast.ai" },
    baseUrl: "https://api.typecast.ai/v1",
    auth: { type: "header", name: "X-API-KEY" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) In Typecast, open “Developers” → “API Key” and create a key. 2) Copy it. 3) Each synthesis uses credits.",
    test: { path: "/voices", message: (d) => count(d, "voice", "voices") || "API key is valid" },
    examples: "Examples: GET /voices?model=ssfm-v21, POST /text-to-speech {\"voice_id\": \"…\", \"text\": \"…\", \"model\": \"ssfm-v21\", "
      + "\"language\": \"spa\", \"prompt\": {\"emotion_preset\": \"happy\"}} (returns the audio).",
  },
  {
    id: "typefully", name: "Typefully", category: "marketing", description: "Posts on X, LinkedIn, Threads and Bluesky: drafts and schedule",
    website: "https://typefully.com", docs: "https://typefully.com/docs/api", logo: { favicon: "https://typefully.com" },
    baseUrl: "https://api.typefully.com/v2",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) In Typefully, open “Settings” → “API & Integrations” and create a key. 2) Copy it (the v1 API with keys is disabled; "
      + "Conector uses v2).",
    test: { path: "/me", account: (d) => d?.email || d?.name },
    examples: "Examples: GET /social-sets, GET /social-sets/{id}/drafts?status=scheduled, POST /social-sets/{id}/drafts {\"platforms\": "
      + "{\"x\": {\"enabled\": true, \"posts\": [{\"text\": \"…\"}]}}, \"publish_at\": \"next-free-slot\"}, GET /me.",
  },
  {
    id: "vapi", name: "Vapi", category: "ai", description: "Voice agents: assistants, calls, numbers and tools",
    website: "https://vapi.ai", docs: "https://docs.vapi.ai/api-reference", logo: { favicon: "https://vapi.ai" },
    baseUrl: "https://api.vapi.ai",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "Private API key", secret: true }],
    keyUrl: "https://dashboard.vapi.ai/org/api-keys",
    help: "1) In the Vapi dashboard, open “API Keys”. 2) Copy the private key (not the public one, which is for the browser). 3) Calls are "
      + "billed per minute.",
    test: { path: "/assistant", query: { limit: 1 }, message: "Private key is valid" },
    examples: "Examples: GET /assistant, GET /call?limit=20, GET /call/{id} (transcript and recording), POST /call {\"assistantId\": \"…\", "
      + "\"phoneNumberId\": \"…\", \"customer\": {\"number\": \"+1…\"}} (it places a real call), GET /phone-number.",
  },
  {
    id: "vastai", name: "Vast.ai", category: "ai", description: "Cloud GPU marketplace: offers, instances and billing",
    website: "https://vast.ai", docs: "https://docs.vast.ai/api-reference", logo: { favicon: "https://vast.ai" },
    baseUrl: "https://console.vast.ai/api/v0",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://cloud.vast.ai/manage-keys/",
    help: "1) In Vast.ai, open “Keys” (cloud.vast.ai/manage-keys) and create an API key. 2) Copy it. With a wrong key, the API responds "
      + "404. Instances are billed by the hour: creating one costs money.",
    test: { path: "/users/current/", account: (d) => d?.email || d?.username },
    examples: "Examples: GET /users/current/ (balance), GET /instances/, POST /bundles/ {\"q\": {\"gpu_name\": {\"eq\": \"RTX_4090\"}, \"rentable\": "
      + "{\"eq\": true}}} (searches offers), PUT /asks/{offerId}/ {…} (rents), DELETE /instances/{id}/.",
  },
  {
    id: "vectorshift", name: "VectorShift", category: "automation", description: "No-code AI workflows: pipelines, knowledge bases and chatbots",
    website: "https://vectorshift.ai", docs: "https://docs.vectorshift.ai/api-reference", logo: { favicon: "https://vectorshift.ai" },
    baseUrl: "https://api.vectorshift.ai/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key (sk_…)", secret: true }],
    keyUrl: "https://app.vectorshift.ai/account/api-keys",
    help: "1) In VectorShift, open “Account” → “API Keys” and create a key. 2) Copy it.",
    test: { path: "/pipelines", message: "API key is valid" },
    examples: "Examples: GET /pipelines, POST /pipeline/{id}/run {\"inputs\": {\"input_0\": \"…\"}}, GET /knowledge-bases, "
      + "POST /knowledge-base/{id}/query {\"query\": \"…\"}, GET /chatbots.",
  },
  {
    id: "vercelaigateway", name: "Vercel AI Gateway", category: "ai", description: "Vercel gateway to hundreds of models with a single key",
    website: "https://vercel.com/ai-gateway", docs: "https://vercel.com/docs/ai-gateway", logo: { favicon: "https://vercel.com" },
    baseUrl: "https://ai-gateway.vercel.sh/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "AI Gateway key", secret: true }],
    keyUrl: "https://vercel.com/dashboard/ai-gateway/api-keys",
    help: "1) In the Vercel dashboard, open “AI Gateway” → “API Keys” and create a key. 2) Copy it. 3) You are billed for the model's tokens, "
      + "with no markup (there is a free monthly credit).",
    test: { path: "/credits", message: (d) => (d?.balance != null ? `Balance: ${d.balance} USD` : "Key is valid") },
    examples: "OpenAI-compatible. Examples: GET /models, POST /chat/completions {\"model\": \"anthropic/claude-sonnet-4.5\", \"messages\": "
      + "[{\"role\": \"user\", \"content\": \"…\"}]}, POST /embeddings {\"model\": \"openai/text-embedding-3-small\", \"input\": \"…\"}, GET /credits.",
  },
  {
    id: "vlmrun", name: "VLM Run", category: "ai", description: "AI structured extraction from documents, images and video",
    website: "https://vlm.run", docs: "https://docs.vlm.run", logo: { favicon: "https://vlm.run" },
    baseUrl: "https://api.vlm.run/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://app.vlm.run/dashboard",
    help: "1) In the VLM Run dashboard, copy your API key. 2) Each document or image processed uses credits.",
    test: { path: "/files", message: "API key is valid" },
    examples: "Examples: POST /document/generate {\"url\": \"https://…/invoice.pdf\", \"domain\": \"document.invoice\"}, POST /image/generate "
      + "{\"images\": [\"https://…\"], \"domain\": \"document.receipt\"}, GET /predictions/{id}, GET /files.",
  },
  {
    id: "voiceflow", name: "Voiceflow", category: "ai", description: "Conversational agents: dialogs, state and transcripts",
    website: "https://www.voiceflow.com", docs: "https://docs.voiceflow.com/reference", logo: { favicon: "https://www.voiceflow.com" },
    baseUrl: "https://general-runtime.voiceflow.com", allowedOrigins: ["https://api.voiceflow.com"], headers: { versionID: "production" },
    auth: { type: "header", name: "Authorization" },
    fields: [{ id: "token", label: "Project API key (VF.DM.…)", secret: true }],
    help: "1) In Voiceflow, open your agent → “Integrations” (or “Settings” → “API Keys”). 2) Copy the project key (it starts with VF.DM.).",
    // With a valid key, the state of a user that does not exist responds 404.
    test: { path: "/state/user/conector-check", acceptStatus: [404], message: "API key is valid" },
    examples: "Examples: POST /state/user/{userId}/interact {\"action\": {\"type\": \"text\", \"payload\": \"Hello\"}} (talks to the agent), "
      + "GET /state/user/{userId}, DELETE /state/user/{userId}, GET https://api.voiceflow.com/v2/transcripts/{projectId}.",
  },
  {
    id: "wandb", name: "Weights & Biases", category: "ai", description: "MLOps: projects, runs, artifacts and metrics (GraphQL)",
    website: "https://wandb.ai", docs: "https://docs.wandb.ai/ref/", logo: { favicon: "https://wandb.ai" },
    baseUrl: "https://api.wandb.ai", graphql: { path: "/graphql" },
    auth: { type: "basic", fixedUsername: "api", passwordField: "token" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://wandb.ai/authorize",
    help: "1) Sign in at wandb.ai and open wandb.ai/authorize. 2) Copy the API key (it is also under “User settings” → “API keys”).",
    // With a wrong key it responds 200 with viewer: null.
    test: { method: "POST", path: "/graphql", body: { query: "{ viewer { username email } }" },
              validate: (d) => { if (!d?.data?.viewer) throw new Error("Weights & Biases: the API key is not valid"); },
              account: (d) => d?.data?.viewer?.email || d?.data?.viewer?.username },
    examples: "GraphQL (POST /graphql, better with wandb_graphql), e.g. { viewer { username } }, { models(entityName: \"…\") { edges { node { name } } } }, "
      + "{ project(name: \"…\", entityName: \"…\") { runs(first: 10) { edges { node { name state summaryMetrics } } } } }.",
  },
  {
    id: "winstonai", name: "Winston AI", category: "ai", description: "Detection of AI-generated text and images, and plagiarism",
    website: "https://gowinston.ai", docs: "https://docs.gowinston.ai", logo: { favicon: "https://gowinston.ai" },
    baseUrl: "https://api.gowinston.ai/v2",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) In Winston AI, open “API Access” and create a key. 2) Copy it. 3) Each analysis uses credits; the connection test does not.",
    // Without text, a valid key responds 400 without using credits.
    test: { method: "POST", path: "/ai-content-detection", body: {}, acceptStatus: [400], message: "API key is valid" },
    examples: "Examples: POST /ai-content-detection {\"text\": \"…\", \"language\": \"es\"}, POST /plagiarism {\"text\": \"…\"}, "
      + "POST /image-detection {\"url\": \"https://…\"}.",
  },
  {
    id: "witai", name: "Wit.ai", category: "ai", description: "Meta's language understanding: intents, entities and speech",
    website: "https://wit.ai", docs: "https://wit.ai/docs/http", logo: { favicon: "https://wit.ai" },
    baseUrl: "https://api.wit.ai", query: { v: "20240304" },
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "Server access token", secret: true }],
    help: "1) At wit.ai, open your app → “Management” → “Settings”. 2) Copy the “Server Access Token”.",
    test: { path: "/message", query: { q: "hello" }, message: "Token is valid" },
    examples: "Examples: GET /message?q=… (intent and entities), POST /speech (WAV or MP3 audio with its Content-Type), GET /intents, "
      + "GET /entities, POST /utterances [{\"text\": \"…\", \"intent\": \"…\", \"entities\": [], \"traits\": []}] (trains).",
  },
  {
    id: "writer", name: "Writer", category: "ai", description: "Enterprise generative AI: Palmyra models, apps and knowledge",
    website: "https://writer.com", docs: "https://dev.writer.com/api-reference", logo: { favicon: "https://writer.com" },
    baseUrl: "https://api.writer.com/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://app.writer.com/aistudio/api-keys",
    help: "1) In Writer AI Studio, open “API Keys” and create a key. 2) Copy it.",
    test: { path: "/models", message: (d) => count(d?.models, "model", "models") || "API key is valid" },
    examples: "Examples: GET /models, POST /chat {\"model\": \"palmyra-x5\", \"messages\": [{\"role\": \"user\", \"content\": \"…\"}]}, "
      + "GET /graphs, POST /graphs/question {\"graph_ids\": [\"…\"], \"question\": \"…\"}, POST /applications/{id} {…}.",
  },
  {
    id: "zep", name: "Zep", category: "ai", description: "Memory for agents: users, threads, graph and search",
    website: "https://www.getzep.com", docs: "https://help.getzep.com/sdk-reference", logo: { favicon: "https://www.getzep.com" },
    baseUrl: "https://api.getzep.com/api/v2",
    auth: { type: "header", name: "Authorization", prefix: "Api-Key " },
    fields: [{ id: "token", label: "Project API key", secret: true }],
    help: "1) In the Zep dashboard, open your project → “Project Settings” → “API Keys” and create a key. 2) Copy it.",
    test: { path: "/users-ordered", query: { pageSize: 1 }, message: "API key is valid" },
    examples: "Examples: POST /users {\"user_id\": \"…\", \"email\": \"…\"}, POST /threads {\"thread_id\": \"…\", \"user_id\": \"…\"}, "
      + "POST /threads/{id}/messages {\"messages\": [{\"role\": \"user\", \"content\": \"…\"}]}, GET /threads/{id}/context, "
      + "POST /graph/search {\"user_id\": \"…\", \"query\": \"…\"}.",
  },
  {
    id: "activetrail", name: "ActiveTrail", category: "marketing", description: "Email marketing: contacts, groups, campaigns and automations",
    website: "https://www.activetrail.com", docs: "https://webapi.mymarketing.co.il/api/docs", logo: { favicon: "https://www.activetrail.com" },
    baseUrl: "https://webapi.mymarketing.co.il/api",
    auth: { type: "header", name: "Authorization" },
    fields: [{ id: "token", label: "API token", secret: true }],
    help: "1) In ActiveTrail, open “Settings” → “API Apps” and create a token. 2) Copy it.",
    test: { path: "/account/details", message: "API token is valid" },
    examples: "Examples: GET /contacts?Limit=50, POST /contacts {\"email\": \"…\", \"first_name\": \"…\"}, GET /groups, "
      + "POST /groups/{id}/members {\"email\": \"…\"}, GET /campaigns, GET /campaignreports/{id}.",
  },
];
