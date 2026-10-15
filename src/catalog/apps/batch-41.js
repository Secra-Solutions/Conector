// Batch 41 of the catalog (from the Composio catalog): short links, environmental impact, documents and e-signature, events,
// time tracking, predictive data, meeting notes, workspaces, files, fleets and planning.

const count = (d, one, many) => (Array.isArray(d) ? `${d.length} ${d.length === 1 ? one : many}` : null);

export default [
  {
    id: "dub", name: "Dub", category: "marketing", description: "Short links with analytics: links, domains, tags and clicks",
    website: "https://dub.co", docs: "https://dub.co/docs/api-reference/introduction", logo: { favicon: "https://dub.co" },
    baseUrl: "https://api.dub.co",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "Workspace API key (dub_…)", secret: true, example: "dub_0000000000000000000000000000" }],
    help: "1) In Dub open “Settings” → “API Keys” of the workspace and create a key with the permissions you need. 2) Copy it (dub_…).",
    test: { path: "/domains", message: (d) => count(d, "domain", "domains") || "API key is valid" },
    examples: "Examples: POST /links {\"url\": \"https://…\", \"domain\": \"dub.sh\", \"key\": \"deal\"}, GET /links?pageSize=20, "
      + "GET /links/info?domain=…&key=…, PATCH /links/{linkId} {…}, GET /analytics?event=clicks&interval=30d&groupBy=timeseries, "
      + "GET /analytics?groupBy=countries&linkId=…, GET /domains, GET /tags.",
  },
  {
    id: "ecologi", name: "Ecologi", category: "data", description: "Environmental impact: trees planted and CO₂ offset",
    website: "https://ecologi.com", docs: "https://docs.ecologi.com", logo: { favicon: "https://ecologi.com" },
    baseUrl: "https://public.ecologi.com",
    auth: { type: "bearer" },
    fields: [{ id: "username", label: "Ecologi username", format: "segment", example: "ecologi",
               help: "It appears in the URL of your public profile: ecologi.com/<username>." },
             { id: "token", label: "Impact API key (optional)", secret: true, optional: true,
               help: "Only to buy impact (trees, offsets) through the API." }],
    help: "1) Enter your Ecologi username: the impact data is public. 2) To fund impact through the API, create a "
      + "key in “Settings” → “API” and paste it (each purchase is charged for real).",
    test: { path: "/users/{username}/impact", message: (d) => (d?.trees != null ? `${d.trees} trees funded` : "User found") },
    examples: "Examples: GET /users/{username}/impact, GET /users/{username}/trees, GET /users/{username}/carbon-offset, "
      + "GET /users/{username}/carbon-removal, POST /impact/trees {\"number\": 1, \"name\": \"…\"} (with a key; real purchase).",
  },
  {
    id: "encodian", name: "Encodian", category: "productivity", description: "Document utilities: PDF, Word, Excel, images and OCR",
    website: "https://www.encodian.com", docs: "https://support.encodian.com", logo: { favicon: "https://www.encodian.com" },
    baseUrl: "https://api.apps-encodian.com/api/v1",
    auth: { type: "header", name: "x-ApiKey" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) Request or retrieve your API key at encodian.com/apikey. 2) Paste it here. Each action uses credits from the subscription.",
    test: { path: "/General/GetSubscriptionStatus", message: (d) => (d?.subscriptionLevel ? `Plan ${d.subscriptionLevel}` : "Key is valid") },
    examples: "POST operations with the file in base64 (fileContent) and its name (fileName): conversion to PDF, PDF merge and split, "
      + "watermarks, OCR, compression, Word template filling, Excel and image operations. GET /General/GetSubscriptionStatus (credits).",
  },
  {
    id: "esignatures", name: "eSignatures", category: "productivity", description: "E-signature contracts from templates",
    website: "https://esignatures.com", docs: "https://esignatures.com/docs/api", logo: { favicon: "https://esignatures.com" },
    baseUrl: "https://esignatures.com/api",
    auth: { type: "query", name: "token" },
    fields: [{ id: "token", label: "Secret token", secret: true }],
    help: "1) In eSignatures open “API & Automation” and copy the “Secret token”. 2) Use \"test\": \"yes\" for free test contracts.",
    test: { path: "/templates", message: "Token is valid" },
    examples: "Examples: GET /templates, POST /contracts {\"template_id\": \"…\", \"signers\": [{\"name\": \"…\", \"email\": \"…\"}], "
      + "\"placeholder_fields\": [{\"api_key\": \"amount\", \"value\": \"…\"}], \"test\": \"yes\"}, GET /contracts/{id}, "
      + "POST /contracts/{id}/withdraw, DELETE /contracts/{id}.",
  },
  {
    id: "evenium", name: "Evenium", category: "marketing", description: "Event management: events, guests and registrations",
    website: "https://www.evenium.com", docs: "https://www.evenium.com/developers", logo: { favicon: "https://www.evenium.com" },
    baseUrl: "https://secure.evenium.com/api/1",
    headers: { Accept: "application/json" },
    auth: { type: "header", name: "X-Evenium-Token" },
    fields: [{ id: "token", label: "API token", secret: true }],
    help: "1) In Evenium open “Settings” → “API” and generate a token. 2) Copy it.",
    test: { path: "/events", query: { maxResults: 1 }, message: "Token is valid" },
    examples: "Examples: GET /events?maxResults=20, GET /events/{eventId}, GET /events/{eventId}/guests, POST /events/{eventId}/guests "
      + "{\"firstName\": \"…\", \"lastName\": \"…\", \"email\": \"…\"}, GET /events/{eventId}/guests/{guestId}.",
  },
  {
    id: "eventee", name: "Eventee", category: "marketing", description: "Event app: schedule, speakers, rooms and sponsors",
    website: "https://eventee.com", docs: "https://eventee.com/api", logo: { favicon: "https://eventee.com" },
    baseUrl: "https://api.eventee.co/public/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "Event API token", secret: true }],
    help: "1) In the Eventee dashboard open the event → “Settings” → “Integrations” → “API” and generate a token. 2) Copy it.",
    test: { path: "/content", message: "Token is valid" },
    examples: "Examples: GET /content (talks, speakers, rooms, days and sponsors), POST /lecture {…}, PUT /lecture/{id} {…}, "
      + "POST /speaker {…}, DELETE /lecture/{id}.",
  },
  {
    id: "eventzilla", name: "Eventzilla", category: "marketing", description: "Ticketing and registration: events, attendees and orders",
    website: "https://www.eventzilla.net", docs: "https://developer.eventzilla.net", logo: { favicon: "https://www.eventzilla.net" },
    baseUrl: "https://www.eventzillaapi.net/api/v2",
    auth: { type: "header", name: "x-api-key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) In Eventzilla open “Settings” → “App Management” → “API Key” and generate the key. 2) Copy it.",
    test: { path: "/events", query: { limit: 1 }, message: "API key is valid" },
    examples: "Examples: GET /events?status=live, GET /events/{eventId}, GET /events/{eventId}/attendees?limit=50, GET /events/{eventId}/tickets, "
      + "GET /events/{eventId}/transactions, GET /users.",
  },
  {
    id: "everhour", name: "Everhour", category: "projects", description: "Time tracking: projects, tasks, timers and reports",
    website: "https://everhour.com", docs: "https://everhour.docs.apiary.io", logo: { favicon: "https://everhour.com" },
    baseUrl: "https://api.everhour.com",
    auth: { type: "header", name: "X-Api-Key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://app.everhour.com/#/account/profile",
    help: "1) In Everhour open your profile (“My Profile”) and copy the API key at the bottom of the page. 2) Paste it here.",
    test: { path: "/users/me", account: (d) => d?.name || d?.email },
    examples: "Examples: GET /projects, GET /projects/{id}/tasks, POST /tasks/{taskId}/time {\"time\": 3600, \"date\": \"2026-10-15\"}, "
      + "GET /team/time?from=2026-10-01&to=2026-10-15, GET /timers/current, POST /timers {\"task\": \"…\"}, DELETE /timers/current, "
      + "GET /clients.",
  },
  {
    id: "eversign", name: "Xodo Sign (eversign)", category: "productivity", description: "E-signature: documents, templates and signers",
    website: "https://eversign.com", docs: "https://eversign.com/api/documentation", logo: { favicon: "https://eversign.com" },
    baseUrl: "https://api.eversign.com/api",
    auth: { type: "query", name: "access_key" },
    fields: [{ id: "token", label: "Access Key", secret: true }],
    help: "1) In Xodo Sign (formerly eversign) open “Developer” and copy the “Access Key”. 2) Most calls also require business_id "
      + "(returned by GET /business).",
    // eversign answers 200 to a bad key: {"success": false, "error": {"type": "invalid_access_key"}}.
    test: { path: "/business", message: (d) => count(d, "business", "businesses") || "Key is valid",
              validate: (d) => {
                if (d?.success === false) throw new Error(`Xodo Sign: ${d.error?.info || d.error?.type || "invalid response"}`);
              } },
    examples: "Examples: GET /business, GET /document?business_id=…&type=all, GET /document?business_id=…&document_hash=…, "
      + "POST /document?business_id=… {\"title\": \"…\", \"signers\": [{\"id\": 1, \"name\": \"…\", \"email\": \"…\"}], \"files\": "
      + "[{\"name\": \"…\", \"file_url\": \"https://…\"}], \"sandbox\": 1}, GET /template?business_id=…, GET /download_final_document?….",
  },
  {
    id: "faraday", name: "Faraday", category: "data", description: "AI customer prediction: cohorts, outcomes and scores",
    website: "https://faraday.ai", docs: "https://faraday.ai/developers/reference", logo: { favicon: "https://faraday.ai" },
    baseUrl: "https://api.faraday.ai/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) In Faraday open “Settings” → “API keys” and create a key. 2) Copy it.",
    test: { path: "/accounts/current", account: (d) => d?.name },
    examples: "Examples: GET /cohorts, GET /outcomes, GET /persona_sets, GET /scopes, GET /datasets, GET /targets, "
      + "POST /targets/{targetId}/lookup {\"email\": \"…\"} (predictions for one person).",
  },
  {
    id: "fathom", name: "Fathom", category: "productivity", description: "AI meeting notes: recordings, summaries and transcripts",
    website: "https://fathom.video", docs: "https://developers.fathom.ai", logo: { favicon: "https://fathom.video" },
    baseUrl: "https://api.fathom.ai/external/v1",
    auth: { type: "header", name: "X-Api-Key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) In Fathom open “Settings” → “API Access” and generate a key. 2) Copy it.",
    test: { path: "/meetings", message: "API key is valid" },
    examples: "Examples: GET /meetings?created_after=2026-10-01T00:00:00Z, GET /meetings?include_transcript=true&include_summary=true, "
      + "GET /recordings/{recordingId}/summary, GET /recordings/{recordingId}/transcript, GET /teams, GET /team_members, POST /webhooks {…}.",
  },
  {
    id: "fibery", name: "Fibery", category: "productivity", description: "Connected workspace: databases, entities and documents",
    website: "https://fibery.io", docs: "https://the.fibery.io/@public/User_Guide/Guide/Fibery-API-Overview-279", logo: { favicon: "https://fibery.io" },
    baseUrl: "https://{account}.fibery.io/api",
    auth: { type: "header", name: "Authorization", prefix: "Token " },
    fields: [{ id: "account", label: "Your workspace name", format: "subdomain",
               help: "The part before .fibery.io in the address of your workspace." },
             { id: "token", label: "API token", secret: true }],
    help: "1) In Fibery open your avatar → “Settings” → “API Keys” and create a token. 2) Enter the name of your workspace here.",
    test: { method: "POST", path: "/commands", body: [{ command: "fibery.schema/query" }], message: "Token is valid" },
    examples: "Commands via POST /commands (a list of commands). Examples: [{\"command\": \"fibery.entity/query\", \"args\": {\"query\": "
      + "{\"q/from\": \"Tasks/Task\", \"q/select\": [\"fibery/id\", \"Tasks/name\"], \"q/limit\": 10}}}], [{\"command\": "
      + "\"fibery.entity/create\", \"args\": {\"type\": \"Tasks/Task\", \"entity\": {\"Tasks/name\": \"…\"}}}], [{\"command\": "
      + "\"fibery.schema/query\"}] (types and fields). Also GraphQL per workspace: POST /graphql/space/{Space} {\"query\": \"…\"}.",
  },
  {
    id: "filescom", name: "Files.com", category: "productivity", description: "Managed file storage and transfer (SFTP, cloud)",
    website: "https://www.files.com", docs: "https://developers.files.com", logo: { favicon: "https://www.files.com" },
    baseUrl: "https://{server}/api/rest/v1",
    auth: { type: "header", name: "X-FilesAPI-Key" },
    fields: [{ id: "token", label: "API key", secret: true },
             { id: "server", label: "Your site domain", default: "app.files.com", format: "domain",
               help: "Leave it as is or enter the subdomain of your site (e.g. example.files.com)." }],
    help: "1) In Files.com open “Settings” → “API Keys” and create a key (or a user key). 2) Copy it.",
    test: { path: "/api_key", message: "API key is valid" },
    examples: "File paths carry the full path. Examples: GET /folders/{path} (contents of a folder; / for the root), "
      + "GET /files/{path} (returns download_uri), POST /file_actions/begin_upload/{path} (starts an upload), DELETE /files/{path}, "
      + "GET /users.json, GET /history?page=1.",
  },
  {
    id: "fleetio", name: "Fleetio", category: "productivity", description: "Fleet management: vehicles, fuel, maintenance and issues",
    website: "https://www.fleetio.com", docs: "https://developer.fleetio.com", logo: { favicon: "https://www.fleetio.com" },
    baseUrl: "https://secure.fleetio.com/api/v1",
    auth: [{ type: "header", name: "Authorization", prefix: "Token " }, { type: "header", name: "Account-Token", field: "account" }],
    fields: [{ id: "token", label: "API key", secret: true }, { id: "account", label: "Account Token" }],
    keyUrl: "https://secure.fleetio.com/api_keys",
    help: "1) In Fleetio open your profile → “Manage API Keys” and create a key. 2) Copy the key and the “Account Token” shown on that page.",
    test: { path: "/vehicles", query: { per_page: 1 }, message: "Credentials are valid" },
    examples: "Examples: GET /vehicles?per_page=50, GET /vehicles/{id}, GET /fuel_entries?q[vehicle_id_eq]=…, POST /fuel_entries {…}, "
      + "GET /service_entries, GET /issues?q[state_eq]=open, POST /issues {…}, GET /contacts.",
  },
  {
    id: "float", name: "Float", category: "projects", description: "Resource planning: people, projects, tasks and hours",
    website: "https://www.float.com", docs: "https://developer.float.com", logo: { favicon: "https://www.float.com" },
    baseUrl: "https://api.float.com/v3",
    // Float requires a User-Agent with the application name and a contact email.
    headers: (c) => ({ "User-Agent": `Conector (${c.contact})` }),
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API token", secret: true },
             { id: "contact", label: "Contact email (for the User-Agent)", format: "email", example: "you@example.com" }],
    help: "1) In Float open “Team settings” → “Integrations” and copy the API token (the account owner can see it). "
      + "2) Enter a contact email: Float requires it on every request.",
    test: { path: "/people", query: { "per-page": 1 }, message: "Token is valid" },
    examples: "Examples: GET /people, GET /projects, GET /tasks?start_date=2026-10-01&end_date=2026-10-31, POST /tasks {\"project_id\": …, "
      + "\"people_ids\": […], \"start_date\": \"…\", \"end_date\": \"…\", \"hours\": 4}, GET /timeoffs, GET /logged-time?….",
  },
];
