// Artificial intelligence: language models, voice, image, translation and inference (all with an API key).
// Audio and images do not fit in the response of *_request (the base64 would be truncated): their tools save them under downloads/.
import { z } from "zod";
import { saveDownload } from "../../http.js";
import { ensureOk } from "../define.js";

const LONG_TIMEOUT = 300_000; // ms: a long model response (reasoning, long texts, images) can take minutes
const models = (list) => ((list || []).length === 1 ? "1 model available" : `${(list || []).length} models available`);
const fmt = (n) => Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 2 });

export default [
  {
    id: "openai", name: "OpenAI", category: "ai", description: "GPT models: text, images, embeddings, moderation and batches",
    website: "https://openai.com", docs: "https://developers.openai.com/api/reference/overview",
    logo: { favicon: "https://developers.openai.com" },
    baseUrl: "https://api.openai.com/v1", timeout: LONG_TIMEOUT,
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "Secret API key (sk-…)", secret: true }],
    keyUrl: "https://platform.openai.com/api-keys",
    help: "1) At platform.openai.com/api-keys click “Create new secret key”, choose the project and the permissions: “All”, or "
      + "“Restricted” with read access to “Models” (the connection test uses it) and access to whatever you plan to use. 2) Copy the key: "
      + "it is shown only once. The API is prepaid: add credit in “Settings” → “Billing”. Image models may require "
      + "organization verification.",
    test: { path: "/models", message: (d) => models(d?.data) },
    examples: "Examples: POST /responses {\"model\": \"…\", \"input\": \"…\"}, POST /chat/completions {\"model\": \"…\", "
      + "\"messages\": […]}, POST /embeddings {\"model\": \"text-embedding-3-small\", \"input\": [\"…\"]}, "
      + "POST /moderations {\"input\": \"…\"}, GET /models, GET /files, GET /batches. To generate images use openai_generate_image.",
    tools: [
      { name: "openai_generate_image", title: "OpenAI: generate images", annotations: { openWorldHint: true },
        description: "Generates images from a description with a GPT Image model and saves them on the server (Conector's "
          + "downloads folder). Returns the path of each file. Each image has a cost.",
        schema: { description: z.string().min(1).describe("What the image should show: subject, style, framing, text…"),
                   model: z.string().default("gpt-image-2")
                     .describe("gpt-image-2, gpt-image-2.5-flare (fast), gpt-image-2.5-sunburst (more precise)…"),
                   size: z.string().default("1024x1024").describe("1024x1024, 1536x1024 (landscape), 1024x1536 (portrait) or auto"),
                   quality: z.enum(["auto", "low", "medium", "high"]).default("auto"),
                   format: z.enum(["png", "jpeg", "webp"]).default("png"), count: z.number().int().min(1).max(4).default(1) },
        async run({ description, model, size, quality, format, count }, p) {
          const d = ensureOk(await p({ method: "POST", path: "/images/generations", body: { model: model, prompt: description,
            size: size, quality: quality, output_format: format, n: count } }), "OpenAI");
          const images = (d?.data || []).filter((i) => i.b64_json);
          if (!images.length) throw new Error("OpenAI returned no images");
          return images.map((i, n) => ({ ...saveDownload(`image_${n + 1}.${format}`, Buffer.from(i.b64_json, "base64")),
            ...(i.revised_prompt ? { revised_description: i.revised_prompt } : {}) }));
        } },
    ],
  },
  {
    id: "anthropic", name: "Anthropic", category: "ai", description: "Claude models: messages, batches and token counting",
    website: "https://www.anthropic.com", docs: "https://platform.claude.com/docs/en/api/overview", logo: { simpleIcons: "anthropic" },
    baseUrl: "https://api.anthropic.com/v1", headers: { "anthropic-version": "2023-06-01" }, timeout: LONG_TIMEOUT,
    auth: { type: "header", name: "x-api-key" },
    fields: [{ id: "token", label: "API key (sk-ant-…)", secret: true }],
    keyUrl: "https://platform.claude.com/settings/keys",
    help: "1) At platform.claude.com/settings/keys (the Claude Console, formerly console.anthropic.com) click “Create Key”, give it "
      + "a name and choose the workspace. 2) Copy the key: it is shown only once. A credit balance is required "
      + "(“Settings” → “Billing”).",
    test: { path: "/models", query: { limit: 1000 }, message: (d) => models(d?.data) },
    examples: "Examples: POST /messages {\"model\": \"…\", \"max_tokens\": 1024, \"messages\": [{\"role\": \"user\", "
      + "\"content\": \"…\"}]}, POST /messages/count_tokens {model, messages}, POST /messages/batches {\"requests\": […]}, "
      + "GET /messages/batches/{id}, GET /models.",
  },
  {
    id: "gemini", name: "Google Gemini", category: "ai", description: "Gemini models: text, vision, embeddings and token counting",
    website: "https://ai.google.dev", docs: "https://ai.google.dev/api", logo: { simpleIcons: "googlegemini" },
    baseUrl: "https://generativelanguage.googleapis.com/v1beta", timeout: LONG_TIMEOUT,
    auth: { type: "header", name: "x-goog-api-key" },
    fields: [{ id: "token", label: "Gemini API key", secret: true }],
    keyUrl: "https://aistudio.google.com/api-keys",
    help: "1) At aistudio.google.com/api-keys click “Create API key” and choose (or import) a Google Cloud project. 2) Copy "
      + "the key. Without billing the free tier is used, with limits, and Google may use the content to improve its "
      + "products: for customer data, enable billing on the project (paid tier).",
    test: { path: "/models", query: { pageSize: 1000 }, message: (d) => models(d?.models) },
    examples: "Examples: POST /models/{model}:generateContent {\"contents\": [{\"parts\": [{\"text\": \"…\"}]}]}, "
      + "POST /models/{model}:countTokens, POST /models/{model}:embedContent {\"content\": {\"parts\": [{\"text\": \"…\"}]}}, "
      + "POST /interactions {\"model\": \"…\", \"input\": \"…\"}, GET /models (model names).",
  },
  {
    id: "mistral", name: "Mistral AI", category: "ai", description: "Mistral models: chat, embeddings, document OCR and code",
    website: "https://mistral.ai", docs: "https://docs.mistral.ai/api", logo: { simpleIcons: "mistralai" },
    baseUrl: "https://api.mistral.ai/v1", timeout: LONG_TIMEOUT,
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://console.mistral.ai/api-keys",
    help: "1) At console.mistral.ai, in the “API Keys” menu, click “Create new key”, give it a name and an expiry date, and confirm. 2) Copy "
      + "the key: it is shown only once. The free mode does not ask for a card but has usage limits; for more volume, enable "
      + "billing in the console.",
    test: { path: "/models", message: (d) => models(d?.data) },
    examples: "Examples: POST /chat/completions {\"model\": \"mistral-large-latest\", \"messages\": […]}, POST /embeddings "
      + "{\"model\": \"mistral-embed\", \"input\": [\"…\"]}, POST /ocr {\"model\": \"mistral-ocr-latest\", \"document\": "
      + "{\"type\": \"document_url\", \"document_url\": \"https://…\"}}, POST /fim/completions (code), GET /models.",
  },
  {
    id: "perplexity", name: "Perplexity", category: "ai", description: "Answers with web search, search results and embeddings",
    website: "https://www.perplexity.ai", docs: "https://docs.perplexity.ai/api-reference/agent-post", logo: { simpleIcons: "perplexity" },
    baseUrl: "https://api.perplexity.ai", timeout: LONG_TIMEOUT,
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key (pplx-…)", secret: true }],
    keyUrl: "https://console.perplexity.ai/project/keys",
    help: "1) At console.perplexity.ai, in the “API Keys” section, generate a new key. 2) Copy it. It is pay-per-use: add a "
      + "payment method or credit in the console's billing section.",
    test: { path: "/v1/models", message: (d) => models(d?.data) },
    examples: "Examples: POST /v1/agent {\"preset\": \"fast\", \"input\": \"…\"} (answers by searching the web; presets fast, low, "
      + "medium, high and xhigh; the text is in output[].content[] of type output_text, with the sources in annotations), "
      + "POST /search {\"query\": \"…\", \"max_results\": 5} (web results), POST /v1/embeddings {\"model\": "
      + "\"pplx-embed-v1-0.6b\", \"input\": [\"…\"]}, GET /v1/models, POST /router/v1/chat/completions {model, messages} (OpenAI format).",
  },
  {
    id: "elevenlabs", name: "ElevenLabs", category: "ai", description: "Text to speech, voices, models and audio history",
    website: "https://elevenlabs.io", docs: "https://elevenlabs.io/docs/api-reference/introduction", logo: { simpleIcons: "elevenlabs" },
    baseUrl: "https://api.elevenlabs.io", timeout: LONG_TIMEOUT,
    auth: { type: "header", name: "xi-api-key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://elevenlabs.io/app/developers/api-keys",
    help: "1) At elevenlabs.io/app/developers/api-keys create a new key and give it a name. 2) If you restrict it, give it at least "
      + "read access to “User” (the connection test uses it) and access to whatever you plan to use: Text to Speech, Voices, History… "
      + "3) Copy the key. Each generation uses credits from your plan.",
    test: { path: "/v1/user", message: (d) => `Plan ${d?.subscription?.tier || "?"}: ${fmt(d?.subscription?.character_count)} `
      + `of ${fmt(d?.subscription?.character_limit)} credits used` },
    examples: "Examples: GET /v2/voices?search=…, GET /v1/voices/{voice_id}, GET /v1/models, GET /v1/user/subscription, "
      + "GET /v1/history. To generate speech use elevenlabs_text_to_speech, which saves the audio to a file.",
    tools: [
      { name: "elevenlabs_text_to_speech", title: "ElevenLabs: convert text to speech", annotations: { openWorldHint: true },
        description: "Generates the audio of a text with an ElevenLabs voice and saves it on the server (Conector's downloads "
          + "folder). Returns the path of the file. Uses credits. Voices are listed with GET /v2/voices (elevenlabs_request).",
        schema: { text: z.string().min(1).describe("Text to be read aloud"),
                   voice: z.string().describe("Voice ID (voice_id), e.g. JBFqnCBsd6RMkjVDRZzb"),
                   model: z.string().optional().describe("e.g. eleven_multilingual_v2 (default), eleven_v3 or eleven_flash_v2_5"),
                   format: z.string().default("mp3_44100_128")
                     .describe("Output format: mp3_44100_128, mp3_44100_192, wav_44100, pcm_24000…") },
        async run({ text, voice, model, format }, p) {
          const d = ensureOk(await p({ method: "POST", path: `/v1/text-to-speech/${encodeURIComponent(voice)}`,
            query: { output_format: format }, body: { text: text, ...(model ? { model_id: model } : {}) },
            headers: { Accept: "*/*" } }), "ElevenLabs");
          if (!d?.base64) throw new Error("ElevenLabs returned no audio");
          return saveDownload(`voice.${format.split("_")[0]}`, Buffer.from(d.base64, "base64"));
        } },
    ],
  },
  {
    id: "huggingface", name: "Hugging Face", category: "ai", description: "Hub models, datasets and Spaces, and inference on providers",
    website: "https://huggingface.co", docs: "https://huggingface.co/docs/hub/api", logo: { simpleIcons: "huggingface" },
    baseUrl: "https://huggingface.co", allowedOrigins: ["https://router.huggingface.co"], timeout: LONG_TIMEOUT,
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "Access token (hf_…)", secret: true }],
    // The OAuth token lasts 8 hours and is renewed with the refresh token; inference-api allows using the inference providers.
    oauth: { scopes: ["openid", "profile", "read-repos", "inference-api"], provider: { name: "Hugging Face", key: "huggingface",
      redirect: "localhost", authorizeUrl: "https://huggingface.co/oauth/authorize", tokenUrl: "https://huggingface.co/oauth/token",
      help: "1) At huggingface.co/settings/applications/new (“Settings” → “Connected Applications” → “Create new application”) "
        + "name it “Conector” and set the website to https://www.example.com. 2) In “Redirect URLs” paste the redirect URI shown "
        + "below, select the permissions (scopes) listed below and let a secret be generated (do not create it as a public "
        + "application). 3) Click “Create app” and copy the application ID (Client ID) and its secret (Client Secret): the secret is "
        + "shown only once." } },
    keyUrl: "https://huggingface.co/settings/tokens",
    help: "1) At huggingface.co/settings/tokens click “Create new token” and choose the “Fine-grained” type. 2) Select “Make calls to "
      + "Inference Providers” and, to read private repositories or your organization's, their read permissions. 3) Copy the "
      + "token. Inference is pay-per-use: PRO accounts and Team or Enterprise organizations include monthly credit; "
      + "free ones must buy it.",
    test: { path: "/api/whoami-v2", account: (d) => d.name },
    examples: "Examples: GET /api/models?search=…&sort=downloads&limit=10, GET /api/models/{author}/{model}, "
      + "GET /api/datasets?search=…, GET /api/spaces?search=…. Inference (OpenAI format): POST "
      + "https://router.huggingface.co/v1/chat/completions {\"model\": \"author/model\", \"messages\": […]} (add :fastest or "
      + ":cheapest to the model to choose a provider), GET https://router.huggingface.co/v1/models.",
  },
  {
    id: "replicate", name: "Replicate", category: "ai", description: "Run image, video, audio and text models in the cloud",
    website: "https://replicate.com", docs: "https://replicate.com/docs/reference/http", logo: { simpleIcons: "replicate" },
    baseUrl: "https://api.replicate.com/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API token (r8_…)", secret: true }],
    keyUrl: "https://replicate.com/account/api-tokens",
    help: "1) At replicate.com/account/api-tokens create a token and copy it. 2) Set up billing at "
      + "replicate.com/account/billing: each run is charged according to the model and the compute time.",
    test: { path: "/account", account: (d) => d.username || d.name },
    examples: "Examples: GET /search?query=…, GET /models/{owner}/{model}, POST /models/{owner}/{model}/predictions "
      + "{\"input\": {…}} (with the Prefer: wait header it waits up to 60 s for the result), GET /predictions/{id} (status and URL of the "
      + "result), POST /predictions/{id}/cancel, GET /collections.",
  },
  {
    id: "deepl", name: "DeepL", category: "ai", description: "Text translation, glossaries and writing improvement",
    website: "https://www.deepl.com", docs: "https://developers.deepl.com/api-reference", logo: { simpleIcons: "deepl" },
    baseUrl: (c) => (String(c.token || "").trim().endsWith(":fx") ? "https://api-free.deepl.com" : "https://api.deepl.com"),
    auth: { type: "header", name: "Authorization", prefix: "DeepL-Auth-Key " },
    fields: [{ id: "token", label: "API key", secret: true, example: "00000000-0000-0000-0000-000000000000:fx",
               help: "Keys on the Free plan end in “:fx”; Conector uses the matching server." }],
    keyUrl: "https://www.deepl.com/your-account/keys",
    help: "1) Sign up for a DeepL API plan, Free or Pro, at deepl.com/pro#api: it is separate from the DeepL Pro translator "
      + "subscription and, if you already have a translator account, DeepL asks you to create another one for the API. 2) At deepl.com/your-account/keys "
      + "copy the key or create another.",
    test: { path: "/v2/usage", message: (d) => `${fmt(d?.character_count)} characters used this period`
      + `${d?.character_limit && d.character_limit < 1e12 ? ` of ${fmt(d.character_limit)}` : ""}` },
    examples: "Paths on https://api.deepl.com or https://api-free.deepl.com, depending on the key. Examples: POST /v2/translate "
      + "{\"text\": [\"…\"], \"target_lang\": \"EN-GB\"}, POST /v2/write/rephrase {\"text\": [\"…\"], \"target_lang\": \"en-US\"}, "
      + "GET /v2/usage, GET /v3/languages?resource=translate_text, GET /v3/glossaries.",
    tools: [
      { name: "deepl_translate", title: "DeepL: translate texts", annotations: { readOnlyHint: true },
        description: "Translates one or more texts with DeepL. Returns, in the same order, each translation and the detected source language.",
        schema: { texts: z.array(z.string()).min(1).max(50).describe("Texts to translate (each one is translated separately)"),
                   target: z.string().describe("Target language: EN-US, EN-GB, ES, FR, DE, IT, PT-PT, PT-BR…"),
                   source: z.string().optional().describe("Source language without variant (EN, ES, FR…); detected if omitted"),
                   formality: z.enum(["formal", "informal"]).optional().describe("Formal or informal form of address, in the languages that support it"),
                   context: z.string().optional().describe("Text that guides the translation; it is not translated or billed") },
        run: async ({ texts, target, source, formality, context }, p) => ensureOk(await p({ method: "POST", path: "/v2/translate",
          body: { text: texts, target_lang: target.toUpperCase(), ...(source ? { source_lang: source.toUpperCase() } : {}),
                    ...(formality ? { formality: formality === "formal" ? "prefer_more" : "prefer_less" } : {}),
                    ...(context ? { context: context } : {}) } }), "DeepL").translations
          .map((t) => ({ translation: t.text, source: t.detected_source_language })) },
    ],
  },
  {
    id: "openrouter", name: "OpenRouter", category: "ai", description: "Hundreds of AI models with one key: chat and pricing",
    website: "https://openrouter.ai", docs: "https://openrouter.ai/docs/api_reference/overview", logo: { simpleIcons: "openrouter" },
    baseUrl: "https://openrouter.ai/api/v1", timeout: LONG_TIMEOUT,
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key (sk-or-v1-…)", secret: true, example: `sk-or-v1-${"0".repeat(64)}` }],
    // No OAuth: its PKCE sign-in does not register applications (there is no client ID) and returns an API key.
    keyUrl: "https://openrouter.ai/settings/keys",
    help: "1) At openrouter.ai/settings/keys create a key, with a name and, optionally, a spending limit. 2) Copy the key: it is "
      + "shown only once. Paid models use credits (openrouter.ai/settings/credits); free ones (“:free”) "
      + "have daily limits.",
    test: { path: "/key", message: (d) => `API key is valid: ${fmt(d?.data?.usage)} USD spent`
      + `${d?.data?.limit != null ? ` of a ${fmt(d.data.limit)} USD limit` : ""}` },
    examples: "Examples: POST /chat/completions {\"model\": \"provider/model\", \"messages\": […]} (e.g. anthropic/…, "
      + "openai/…, google/…), GET /models (catalog with prices and context), GET /key (spend and limit of the key), "
      + "GET /generation?id=… (cost of a response).",
  },
  {
    id: "groq", name: "Groq", category: "ai", description: "Very fast inference of open models: chat, responses and batches",
    website: "https://groq.com", docs: "https://console.groq.com/docs/api-reference", logo: { favicon: "https://groq.com" },
    baseUrl: "https://api.groq.com/openai/v1", timeout: LONG_TIMEOUT,
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key (gsk_…)", secret: true }],
    keyUrl: "https://console.groq.com/keys",
    help: "1) At console.groq.com/keys click “Create API Key” and give it a name. 2) Copy the key: it is shown only once. "
      + "The free plan has per-minute and per-day limits; for more volume, switch to the paid plan in “Settings” → “Billing”.",
    test: { path: "/models", message: (d) => models(d?.data) },
    examples: "Examples: POST /chat/completions {\"model\": \"…\", \"messages\": […]}, POST /responses {\"model\": \"…\", "
      + "\"input\": \"…\"}, GET /models, GET /batches, POST /batches {\"input_file_id\": \"…\", \"endpoint\": "
      + "\"/v1/chat/completions\", \"completion_window\": \"24h\"}.",
  },
  {
    id: "cohere", name: "Cohere", category: "ai", description: "Command models: chat, embeddings and reranking",
    website: "https://cohere.com", docs: "https://docs.cohere.com/reference/about", logo: { favicon: "https://cohere.com" },
    baseUrl: "https://api.cohere.com", timeout: LONG_TIMEOUT,
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://dashboard.cohere.com/api-keys",
    help: "1) At dashboard.cohere.com/api-keys create a key: trial keys (“Trial”) are free but limited (about 1000 "
      + "calls a month) and production keys require setting up billing. 2) Copy the key.",
    test: { path: "/v1/models", query: { page_size: 1000 }, message: (d) => models(d?.models) },
    examples: "Examples: POST /v2/chat {\"model\": \"…\", \"messages\": [{\"role\": \"user\", \"content\": \"…\"}]}, "
      + "POST /v2/embed {\"model\": \"…\", \"texts\": [\"…\"], \"input_type\": \"search_document\", \"embedding_types\": "
      + "[\"float\"]}, POST /v2/rerank {\"model\": \"…\", \"query\": \"…\", \"documents\": [\"…\"]}, GET /v1/models?endpoint=chat.",
  },
];
