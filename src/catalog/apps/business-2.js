// Business (2): time tracking, forms and surveys, support, HR and recruiting, payments and accounting, CRM, design and Pinterest.
import { z } from "zod";
import { USER_AGENT, saveDownload } from "../../http.js";
import { ensureOk } from "../define.js";

// Teamtailor requires the API version in the X-Api-Version header (the current one as of October 2026).
const TEAMTAILOR_VERSION = "20240904";
// Zoho CRM: REST API version.
const ZOHO_VERSION = "v8";
const ZOHO_SCOPES = ["ZohoCRM.modules.ALL", "ZohoCRM.settings.READ", "ZohoCRM.users.READ", "ZohoCRM.org.READ", "ZohoCRM.coql.READ"];
// Zoho: each data center has its own accounts server (Canada's is at zohocloud.ca).
const ZOHO_SERVERS = [["accounts.zoho.eu", "European Union (crm.zoho.eu)"], ["accounts.zoho.com", "United States (crm.zoho.com)"],
  ["accounts.zoho.uk", "United Kingdom (crm.zoho.uk)"], ["accounts.zoho.in", "India (crm.zoho.in)"],
  ["accounts.zoho.com.au", "Australia (crm.zoho.com.au)"], ["accounts.zoho.jp", "Japan (crm.zoho.jp)"],
  ["accounts.zohocloud.ca", "Canada (crm.zohocloud.ca)"], ["accounts.zoho.sa", "Saudi Arabia (crm.zoho.sa)"],
  ["accounts.zoho.com.cn", "China (crm.zoho.com.cn)"]];
const CANVA_SCOPES = ["profile:read", "design:meta:read", "design:content:read", "design:content:write", "asset:read", "asset:write",
  "folder:read"];
const FRESHSERVICE_STATUSES = { 2: "open", 3: "pending", 4: "resolved", 5: "closed" };
const FRESHSERVICE_PRIORITIES = { 1: "low", 2: "medium", 3: "high", 4: "urgent" };

const fullName = (...parts) => parts.filter(Boolean).join(" ");
const isoDay = (v, end) => (/^\d{4}-\d{2}-\d{2}$/.test(v || "") ? `${v}T${end ? "23:59:59" : "00:00:00"}Z` : v);
const daysAgo = (n) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// JSON:API APIs (Lemon Squeezy, Teamtailor): JSON bodies are sent as application/vnd.api+json.
const jsonApiBody = { type: "signature", sign: ({ headers: requestHeaders }) => {
  if (requestHeaders["Content-Type"] === "application/json") requestHeaders["Content-Type"] = "application/vnd.api+json";
} };

// Adyen: Checkout is at checkout-test.adyen.com (test) or on each company's live server, with its prefix.
function adyenCheckoutServer(c) {
  if (c.environment === "test") return "checkout-test.adyen.com";
  const prefix = String(c.prefix || "").trim();
  if (!prefix) return "management-live.adyen.com"; // without a prefix there is no live Checkout: only the Management API
  if (!/^[A-Za-z0-9-]{1,48}$/.test(prefix)) throw new Error("Adyen: the live URL prefix only allows letters, numbers and hyphens");
  return `${prefix}-checkout-live.adyenpayments.com`;
}

// Zoho CRM: drops the metadata ($…) and empty fields; for lookups, keeps only id and name.
const cleanZoho = (r) => Object.fromEntries(Object.entries(r || {})
  .filter(([k, v]) => !k.startsWith("$") && v !== null && v !== "" && !(Array.isArray(v) && !v.length))
  .map(([k, v]) => [k, v && typeof v === "object" && !Array.isArray(v) && ("name" in v || "id" in v) ? { id: v.id, name: v.name } : v]));

// Jotform answers: question → answer as text (without headings, buttons or empty fields).
const jotformAnswers = (answers) => Object.fromEntries(Object.values(answers || {})
  .filter((a) => a.answer !== undefined && a.answer !== "")
  .sort((a, b) => Number(a.order) - Number(b.order))
  .map((a) => [a.text || a.name, a.prettyFormat
    || (a.answer && typeof a.answer === "object" ? Object.values(a.answer).filter(Boolean).join(" ") : a.answer)]));

export default [
  {
    id: "toggl", name: "Toggl Track", category: "productivity",
    description: "Time tracking: entries, projects, clients and reports",
    website: "https://toggl.com", docs: "https://engineering.toggl.com/docs/", logo: { simpleIcons: "toggltrack" },
    baseUrl: "https://api.track.toggl.com/api/v9",
    auth: { type: "basic", usernameField: "token", fixedPassword: "api_token" },
    fields: [{ id: "token", label: "API token", secret: true }],
    keyUrl: "https://track.toggl.com/profile",
    help: "1) In Toggl Track (track.toggl.com) open your profile: “Profile settings” (track.toggl.com/profile). 2) At the very bottom, under “API "
      + "Token”, click “Click to reveal” and copy the token (“Reset token” generates a new one and the previous one stops working). It has "
      + "your user's permissions: a workspace administrator sees the whole team's hours in the reports.",
    test: { path: "/me", account: (d) => d.email || d.fullname },
    examples: "Examples: GET /me/workspaces, GET /me/time_entries?start_date=2026-10-01&end_date=2026-10-16&meta=true (only the last 3 "
      + "months; meta adds project and client names), GET /me/time_entries/current, POST /workspaces/{workspace_id}/time_entries "
      + "{\"created_with\": \"conector\", \"workspace_id\": …, \"project_id\": …, \"description\": \"…\", \"start\": "
      + "\"2026-10-15T08:00:00Z\", \"duration\": 5400, \"billable\": true} (with \"duration\": -1 it starts the timer), PATCH "
      + "/workspaces/{workspace_id}/time_entries/{id}/stop, PUT /workspaces/{workspace_id}/time_entries/{id} {…}, GET "
      + "/workspaces/{workspace_id}/projects?active=true, GET /workspaces/{workspace_id}/clients, GET /workspaces/{workspace_id}/tags. "
      + "Reports for the whole team (full URL, up to one year per request): POST "
      + "https://api.track.toggl.com/reports/api/v3/workspace/{workspace_id}/summary/time_entries {\"start_date\": \"2026-01-01\", "
      + "\"end_date\": \"2026-06-30\", \"grouping\": \"projects\", \"sub_grouping\": \"users\"}, POST "
      + "…/reports/api/v3/workspace/{workspace_id}/search/time_entries {\"start_date\": \"…\", \"end_date\": \"…\", \"page_size\": 50} "
      + "(detail).",
    tools: [
      { name: "toggl_hours", title: "Toggl Track: logged hours", annotations: { readOnlyHint: true },
        description: "Your time entries between two dates (only the last 3 months; for earlier dates, use the Reports API): start, end, "
          + "hours, description, project, client, tags and whether it is billable, with the sum of hours. An entry without an end is the "
          + "running timer.",
        schema: { from: z.string().describe("YYYY-MM-DD"), to: z.string().describe("YYYY-MM-DD (inclusive)") },
        async run({ from, to }, p) {
          const d = ensureOk(await p({ path: "/me/time_entries",
            query: { start_date: isoDay(from), end_date: isoDay(to, true), meta: true } }), "Toggl Track");
          const entries = (Array.isArray(d) ? d : []).map((t) => ({ id: t.id, start: t.start, end: t.stop || null,
            hours: t.duration >= 0 ? Math.round(t.duration / 36) / 100 : null, description: t.description || undefined,
            project: t.project_name || t.project_id || undefined, client: t.client_name || undefined,
            tags: t.tags?.length ? t.tags : undefined, billable: t.billable, workspace: t.workspace_id }));
          return { hours: Math.round(entries.reduce((s, t) => s + (t.hours || 0), 0) * 100) / 100, entries };
        } },
    ],
  },
  {
    id: "jotform", name: "Jotform", category: "productivity", description: "Forms, responses, questions, files and reports",
    website: "https://www.jotform.com", docs: "https://api.jotform.com/docs/", logo: { favicon: "https://www.jotform.com" },
    baseUrl: "https://{server}",
    auth: { type: "header", name: "APIKEY" },
    fields: [{ id: "token", label: "API key", secret: true },
             { id: "server", label: "Account server", default: "api.jotform.com",
               options: [["api.jotform.com", "General (www.jotform.com)"], ["eu-api.jotform.com", "European Union (eu.jotform.com)"],
                          ["hipaa-api.jotform.com", "HIPAA (hipaa.jotform.com)"]] }],
    keyUrl: "https://www.jotform.com/myaccount/api",
    help: "1) In Jotform click your profile picture (top right) → “Settings” → “API”. 2) Click “Create New "
      + "Key” and, in its permissions, choose “Read Access” if you will only query data or “Full "
      + "Access” to create and modify. 3) Copy the key. If you sign in through eu.jotform.com (EU data) or your account is "
      + "HIPAA, choose that server here. All plans include the API (the free one, with 1,000 calls per day).",
    test: { path: "/user", account: (d) => d.content?.email || d.content?.username },
    examples: "The data comes in content. Examples: GET /user/forms?limit=50&orderby=created_at, GET /form/{id}, GET "
      + "/form/{id}/questions, GET /form/{id}/submissions?limit=100&offset=0&filter={\"created_at:gt\":\"2026-10-01 00:00:00\"} (better with "
      + "jotform_responses), GET /submission/{id}, GET /user/submissions?limit=50, GET /form/{id}/files, GET /form/{id}/reports, POST "
      + "/form/{id}/submissions as a form {\"submission[3]\": \"…\"} (3 = question ID), POST /submission/{id} as a form "
      + "{\"submission[3]\": \"…\"} (edit), DELETE /submission/{id}, GET /user/usage. Pagination: offset and limit (max. 1,000).",
    tools: [
      { name: "jotform_responses", title: "Jotform: responses of a form", annotations: { readOnlyHint: true },
        description: "Responses (submissions) of a form by submission date: id, date, status and each question with its answer as "
          + "text. Can filter those submitted since a date.",
        schema: { form: z.string().describe("Form ID (GET /user/forms)"),
                   since: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("Submitted since this date (YYYY-MM-DD)"),
                   max: z.number().int().min(1).max(1000).default(50),
                   skip: z.number().int().min(0).default(0).describe("Responses to skip (pagination)") },
        async run({ form: formId, since, max, skip }, p) {
          const filter = since ? JSON.stringify({ "created_at:gt": `${since} 00:00:00` }) : undefined;
          const d = ensureOk(await p({ path: `/form/${encodeURIComponent(formId)}/submissions`,
            query: { limit: max, offset: skip, orderby: "created_at", filter } }), "Jotform");
          return { returned: d.resultSet?.count, responses: (d.content || []).map((s) => ({ id: s.id, date: s.created_at,
            status: s.status, unread: s.new === "1" || undefined, answers: jotformAnswers(s.answers) })) };
        } },
    ],
  },
  {
    id: "surveymonkey", name: "SurveyMonkey", category: "productivity", description: "Surveys, responses, collectors and contacts",
    website: "https://www.surveymonkey.com", docs: "https://api.surveymonkey.com/v3/docs", logo: { simpleIcons: "surveymonkey" },
    baseUrl: "https://{server}/v3",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "App access token", secret: true },
             { id: "server", label: "Account data center", default: "api.surveymonkey.com",
               options: [["api.surveymonkey.com", "United States (www.surveymonkey.com)"],
                          ["api.eu.surveymonkey.com", "European Union (eu.surveymonkey.com)"],
                          ["api.surveymonkey.ca", "Canada (surveymonkey.ca)"]] }],
    // SurveyMonkey does not ask for scopes when authorizing (they are set in the app) and its tokens do not expire; each data center has its own portal.
    oauth: { scopes: [], fields: ["server"], provider: { name: "SurveyMonkey", key: "surveymonkey", redirect: "localhost",
      authorizeUrl: "https://{server}/oauth/authorize", tokenUrl: "https://{server}/oauth/token",
      help: "1) Go to developer.surveymonkey.com (or developer.eu.surveymonkey.com if your account is in the EU) → “My Apps” → “Add a "
        + "New App”: name it “Conector” and choose a private app (“Private”). 2) In “Settings” paste into “OAuth Redirect URL” "
        + "the redirect URI shown below and, under “Scopes”, select “View Users”, “View Surveys”, “View Responses” and “View "
        + "Response Details” (and the write ones you need); save. 3) Copy the “Client ID” and the “Secret”. Choose your account's data center "
        + "here: the app must be registered on that same data center's portal. Until it is deployed (paid plan with API access), "
        + "the app is a draft that only works for 90 days and only with the account that created it." } },
    keyUrl: "https://developer.surveymonkey.com/apps/",
    help: "1) Sign in to the developer portal with your account (developer.surveymonkey.com, or developer.eu.surveymonkey.com if your "
      + "account is in the EU) and, under “My Apps”, click “Add a New App”: choose a private app (“Private”), name it and create it. 2) In "
      + "“Settings” → “Scopes” select at least “View Users”, “View Surveys”, “View Responses” and “View Response Details” (and the write ones "
      + "you need) and save. 3) Copy the “Access Token” from that same page. A private app requires a paid plan with API access; without it, it "
      + "works as a draft for 90 days. Limit: 500 calls per day. Choose your account's data center here.",
    test: { path: "/users/me", account: (d) => d.email || d.username },
    examples: "Examples: GET /surveys?per_page=50&sort_by=date_modified&sort_order=DESC, GET /surveys/{id}/details (pages, questions and "
      + "options), GET /surveys/{id}/responses/bulk?simple=true&per_page=100&start_created_at=2026-10-01T00:00:00 (better with "
      + "surveymonkey_responses), GET /surveys/{id}/responses/{response_id}/details, GET /surveys/{id}/rollups (summary per question), "
      + "GET /surveys/{id}/collectors, POST /surveys/{id}/collectors {\"type\": \"weblink\"} (link to respond), GET /contact_lists, "
      + "GET /users/me. Pagination: page and per_page (follow links.next).",
    tools: [
      { name: "surveymonkey_responses", title: "SurveyMonkey: responses of a survey", annotations: { readOnlyHint: true },
        description: "Responses of a survey, from the most recent to the oldest: id, date, status (completed, partial…), email if "
          + "known and each question with its answer as text.",
        schema: { survey: z.string().describe("Survey ID (GET /surveys)"),
                   since: z.string().optional().describe("Created since this date (YYYY-MM-DD)"),
                   status: z.enum(["completed", "partial", "overquota", "disqualified"]).optional(),
                   page: z.number().int().min(1).default(1), max: z.number().int().min(1).max(100).default(50) },
        async run({ survey, since, status: responseStatus, page, max }, p) {
          const start = since && /^\d{4}-\d{2}-\d{2}$/.test(since) ? `${since}T00:00:00` : since;
          const d = ensureOk(await p({ path: `/surveys/${encodeURIComponent(survey)}/responses/bulk`, query: { simple: true,
            per_page: max, page: page, sort_order: "DESC", status: responseStatus, start_created_at: start } }), "SurveyMonkey");
          return { total: d.total, page: d.page, has_more: Boolean(d.links?.next), responses: (d.data || []).map((r) => ({ id: r.id,
            date: r.date_created, status: r.response_status, email: r.email_address || undefined,
            answers: (r.pages || []).flatMap((pg) => pg.questions || []).map((q) => ({ question: q.heading,
              answer: (q.answers || []).map((a) => a.simple_text || a.text).filter(Boolean).join("; ") })) })) };
        } },
    ],
  },
  {
    id: "crisp", name: "Crisp", category: "support", description: "Website chat: conversations, messages, contacts and operators",
    website: "https://crisp.chat", docs: "https://docs.crisp.chat/references/rest-api/v1/", logo: { favicon: "https://crisp.chat" },
    baseUrl: "https://api.crisp.chat/v1/website/{site}",
    headers: (c) => ({ "X-Crisp-Tier": c.level === "plugin" ? "plugin" : "website" }),
    auth: { type: "basic", usernameField: "identifier", passwordField: "token" },
    fields: [{ id: "identifier", label: "Token identifier" },
             { id: "token", label: "Token key", secret: true },
             { id: "site", label: "Website ID", help: "In Crisp: “Settings” → “Workspace Settings” → “Setup Instructions”." },
             { id: "level", label: "Token type", default: "website",
               options: [["website", "Workspace token"], ["plugin", "Plugin token (Marketplace)"]] }],
    help: "1) As the workspace owner, in Crisp open “Settings” → “Workspace Settings” → “Advanced configuration” and, under "
      + "“API Token”, click “Generate Token”. 2) Copy the identifier and the key: they are shown only once. 3) Copy the “Website ID” from "
      + "“Workspace Settings” → “Setup Instructions”. That token only gives access to its own workspace (up to 10,000 requests per day). "
      + "For several workspaces, create a plugin at marketplace.crisp.chat, install it in them, use its production token and choose the "
      + "“Plugin” type here.",
    test: { path: "https://api.crisp.chat/v1/website/{site}", account: (d) => d.data?.name || d.data?.domain },
    examples: "Paths are relative to the site (…/v1/website/{website_id}); for the rest, use the full URL https://api.crisp.chat/v1/…. Examples: "
      + "GET /conversations/1?filter_not_resolved=1 (page 1), GET /conversations/1?search_query=…&search_type=text, "
      + "GET /conversation/{session_id}, GET /conversation/{session_id}/messages, POST /conversation/{session_id}/message {\"type\": "
      + "\"text\", \"from\": \"operator\", \"origin\": \"chat\", \"content\": \"…\"} (with \"type\": \"note\", a private note), "
      + "PATCH /conversation/{session_id}/state {\"state\": \"resolved\"}, PATCH /conversation/{session_id}/routing {\"assigned\": "
      + "{\"user_id\": \"…\"}}, GET /people/profiles/1?search_text=…, GET /people/profile/{people_id}, GET /operators/list.",
    tools: [
      { name: "crisp_conversations", title: "Crisp: conversations", annotations: { readOnlyHint: true },
        description: "Chat conversations, paginated: session id, contact (name and email), state (pending, unresolved or "
          + "resolved), subject, last message, unread messages, assigned operator and date of the last change. Can search text and "
          + "filter the unresolved ones, the resolved ones or those with unread messages.",
        schema: { text: z.string().optional().describe("Text to search in the messages and contact details"),
                   filter: z.enum(["all", "unresolved", "resolved", "unread"]).default("all"),
                   page: z.number().int().min(1).default(1) },
        async run({ text, filter, page }, p) {
          const query = { search_query: text, search_type: text ? "text" : undefined,
            filter_not_resolved: filter === "unresolved" ? 1 : undefined, filter_resolved: filter === "resolved" ? 1 : undefined,
            filter_unread: filter === "unread" ? 1 : undefined };
          const d = ensureOk(await p({ path: `/conversations/${page}`, query }), "Crisp");
          return (d.data || []).map((c) => ({ id: c.session_id, name: c.meta?.nickname, email: c.meta?.email || undefined,
            state: c.state, subject: c.meta?.subject || c.topic || undefined, last_message: c.last_message || c.preview_message?.excerpt,
            unread: c.unread?.operator || undefined, assigned: c.assigned?.user_id || undefined,
            updated: c.updated_at ? new Date(c.updated_at).toISOString() : undefined }));
        } },
    ],
  },
  {
    id: "freshservice", name: "Freshservice", category: "support",
    description: "Service desk: tickets, assets, changes, problems and catalog",
    website: "https://www.freshworks.com/freshservice/", docs: "https://api.freshservice.com/",
    logo: { favicon: "https://www.freshworks.com/freshservice/" },
    baseUrl: "https://{subdomain}.freshservice.com/api/v2",
    auth: { type: "basic", usernameField: "token", fixedPassword: "X" },
    fields: [{ id: "subdomain", label: "Freshservice subdomain", format: "subdomain",
               help: "If you sign in at https://example.freshservice.com, enter “example”." },
             { id: "token", label: "API key", secret: true }],
    help: "1) In Freshservice click your profile picture (top right) → “Profile Settings”. 2) On the right, under “Your API Key”, "
      + "click to reveal it (it may ask for a captcha) and copy it. It has the same permissions as your Freshservice agent account: to view or change tickets, "
      + "assets or changes, that agent needs those permissions.",
    test: { path: "/tickets", query: { per_page: 1 }, message: "Key is valid (ticket read access)" },
    examples: "Examples: GET /tickets?filter=new_and_my_open&include=requester, GET /tickets/{id}?include=conversations, "
      + "GET /tickets/filter?query=\"priority:4 AND status:2\" (better with freshservice_search), POST /tickets {\"subject\": \"…\", "
      + "\"description\": \"…\", \"email\": \"…\", \"priority\": 2, \"status\": 2}, POST /tickets/{id}/reply {\"body\": \"…\"}, "
      + "POST /tickets/{id}/notes {\"body\": \"…\", \"private\": true}, PUT /tickets/{id} {\"status\": 4}, GET /requesters?email=…, "
      + "GET /agents, GET /assets?per_page=50, GET /changes, GET /problems, GET /service_catalog/items. "
      + "Pagination: page and per_page (max. 100).",
    tools: [
      { name: "freshservice_search", title: "Freshservice: filter tickets", annotations: { readOnlyHint: true },
        description: "Filters tickets using Freshservice syntax: status (2 open, 3 pending, 4 resolved, 5 closed), priority (1 "
          + "low to 4 urgent), agent_id, group_id, requester_id, tag:'…', created_at:>'2026-10-01', due_by…, which can be combined with AND/OR and "
          + "parentheses. 30 per page.",
        schema: { filter: z.string().max(500).describe("e.g. status:2 AND priority:4, or tag:'vpn' AND created_at:>'2026-10-01'"),
                   page: z.number().int().min(1).default(1) },
        async run({ filter, page }, p) {
          const query = `"${filter.replace(/"/g, "'")}"`; // Freshservice requires the query in double quotes
          const d = ensureOk(await p({ path: "/tickets/filter", query: { query, page: page } }), "Freshservice");
          return { total: d.total, tickets: (d.tickets || []).map((t) => ({ id: t.id, subject: t.subject, type: t.type,
            status: FRESHSERVICE_STATUSES[t.status] || t.status, priority: FRESHSERVICE_PRIORITIES[t.priority] || t.priority,
            requester: t.requester_id, agent: t.responder_id, group: t.group_id, created: t.created_at, updated: t.updated_at,
            due: t.due_by })) };
        } },
    ],
  },
  {
    id: "deel", name: "Deel", category: "hr", description: "People, contracts, invoices and hours of international teams",
    website: "https://www.deel.com", docs: "https://developer.deel.com/home", logo: { favicon: "https://www.deel.com" },
    baseUrl: "https://{environment}/rest/v2",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API token", secret: true },
             { id: "environment", label: "Environment", default: "api.letsdeel.com",
               options: [["api.letsdeel.com", "Production"], ["api-sandbox.demo.deel.com", "Sandbox (testing)"]] }],
    help: "1) With an administrator user, in Deel open “More” → “Developer” → “Access Tokens” tab and click “Generate new token”. 2) "
      + "Choose “Organization token” (access to the whole organization; the personal one only sees your own user's data) and select the scopes: at least "
      + "organizations:read (used by the connection test) and the read ones you need (people:read, contracts:read, timesheets:read…), "
      + "plus the write ones if you will make changes. 3) Generate the token and copy it: it is not shown again. For testing, create the token in the "
      + "Deel sandbox and choose that environment here.",
    test: { path: "/organizations", account: (d) => (Array.isArray(d.data) ? d.data[0] : d.data)?.name },
    examples: "Request bodies go inside \"data\". Examples: GET /people?limit=50&offset=0&search=…, GET /people/{id}, "
      + "GET /contracts?limit=50, GET /contracts/{id}, GET /invoices?limit=50, GET /timesheets?contract_id=…, POST /timesheets "
      + "{\"data\": {\"contract_id\": \"…\", \"quantity\": 8, \"description\": \"…\", \"date_submitted\": \"2026-10-15\"}}, "
      + "GET /legal-entities, GET /lookups/countries, GET /organizations. Pagination: limit and offset (contracts use after_cursor).",
    tools: [
      { name: "deel_people", title: "Deel: people", annotations: { readOnlyHint: true },
        description: "People in the organization (employees and contractors): id, name, email, job title, country, hiring type, "
          + "status, start date and department. Can search by text.",
        schema: { text: z.string().optional().describe("Searches by name or email"),
                   max: z.number().int().min(1).max(100).default(50),
                   skip: z.number().int().min(0).default(0).describe("People to skip (pagination)") },
        async run({ text, max, skip }, p) {
          const d = ensureOk(await p({ path: "/people", query: { search: text, limit: max, offset: skip } }), "Deel");
          return { total: d.page?.total_rows, people: (d.data || []).map((x) => ({ id: x.id,
            name: x.full_name || fullName(x.first_name, x.last_name), email: x.work_email || x.emails?.[0]?.value,
            job_title: x.job_title, country: x.country, type: x.hiring_type, status: x.hiring_status, start_date: x.start_date,
            department: x.department?.name })) };
        } },
    ],
  },
  {
    id: "workable", name: "Workable", category: "hr", description: "Recruiting: jobs, candidates, stages and hiring team",
    website: "https://www.workable.com", docs: "https://workable.readme.io/reference/generate-an-access-token",
    logo: { favicon: "https://www.workable.com" },
    baseUrl: "https://{subdomain}.workable.com/spi/v3",
    auth: { type: "bearer" },
    fields: [{ id: "subdomain", label: "Workable subdomain", format: "subdomain",
               help: "If your account is https://example.workable.com, enter “example”." },
             { id: "token", label: "Access token", secret: true }],
    help: "1) As an administrator, in Workable open your profile menu (top right) → “Integrations”. 2) Click “Generate new "
      + "token”, name it and select the scopes: r_jobs (jobs; used by the connection test), r_candidates and, if you will make changes, "
      + "w_candidates; r_employees gives access to confidential employee data. 3) Copy the token: it is shown only once. The API "
      + "allows about 10 requests every 10 seconds.",
    test: { path: "/accounts", account: (d) => d.accounts?.[0]?.name },
    examples: "Examples: GET /jobs?state=published&limit=50, GET /jobs/{shortcode}, GET /jobs/{shortcode}/questions, "
      + "GET /candidates?shortcode=…&stage=interview&limit=100&created_after=2026-10-01T00:00:00Z (better with workable_candidates), "
      + "GET /candidates/{id}, POST /jobs/{shortcode}/candidates {\"sourced\": true, \"candidate\": {\"name\": \"…\", \"email\": \"…\"}}, "
      + "POST /candidates/{id}/comments {\"member_id\": \"…\", \"comment\": {\"body\": \"…\"}}, POST /candidates/{id}/move "
      + "{\"member_id\": \"…\", \"target_stage\": \"interview\"}, GET /stages, GET /members, GET /requisitions. "
      + "Pagination: since_id (follow paging.next).",
    tools: [
      { name: "workable_candidates", title: "Workable: candidates", annotations: { readOnlyHint: true },
        description: "Candidates for all jobs or for one, optionally of a stage, by email or created since a date: id, "
          + "name, email, job, stage, whether disqualified, source and dates. Returns “next” if there are more.",
        schema: { job: z.string().optional().describe("Job shortcode (GET /jobs)"),
                   stage: z.string().optional().describe("Stage slug: applied, phone-screen, interview, offer, hired…"),
                   email: z.string().optional(),
                   since: z.string().optional().describe("Created since this date (YYYY-MM-DD)"),
                   max: z.number().int().min(1).max(100).default(50),
                   next: z.string().optional().describe("The “next” value from the previous call") },
        async run({ job, stage, email, since, max, next }, p) {
          const d = ensureOk(await p({ path: "/candidates", query: { shortcode: job, stage: stage, email, created_after: isoDay(since),
            limit: max, since_id: next } }), "Workable");
          const nextId = d.paging?.next ? new URL(d.paging.next).searchParams.get("since_id") : null;
          return { next: nextId, candidates: (d.candidates || []).map((c) => ({ id: c.id, name: c.name, email: c.email,
            job: c.job?.title, job_code: c.job?.shortcode, stage: c.stage, disqualified: c.disqualified || undefined,
            source: c.sourced ? "sourced" : "application", created: c.created_at, updated: c.updated_at })) };
        } },
    ],
  },
  {
    id: "teamtailor", name: "Teamtailor", category: "hr",
    description: "Recruiting: jobs, candidates, applications, stages and users",
    website: "https://www.teamtailor.com", docs: "https://docs.teamtailor.com", logo: { favicon: "https://www.teamtailor.com" },
    baseUrl: "https://{server}/v1",
    headers: { Accept: "application/vnd.api+json", "X-Api-Version": TEAMTAILOR_VERSION },
    auth: [{ type: "header", name: "Authorization", prefix: "Token token=" }, jsonApiBody],
    fields: [{ id: "token", label: "API key", secret: true },
             { id: "server", label: "Account region", default: "api.teamtailor.com",
               options: [["api.teamtailor.com", "Europe"], ["api.na.teamtailor.com", "North America"],
                          ["api.au.teamtailor.com", "Asia-Pacific"]] }],
    help: "1) With a company administrator user, in Teamtailor open “Settings” → “Integrations” → “API keys” and click “New API "
      + "key”. 2) Choose the “Admin” scope (candidates and applications; “Internal” only gives jobs, departments and similar, and “Public” "
      + "gives what is on the careers site) and the read or read and write permission. 3) Copy the key. "
      + "Choose your account's region here.",
    test: { path: "/company", account: (d) => d.data?.attributes?.name },
    examples: "JSON:API (attributes use hyphens, e.g. first-name). Examples: GET /jobs?filter[status]=open&page[size]=30, "
      + "GET /jobs/{id}?include=department,locations, GET /candidates?filter[email]=…, GET /candidates/{id}?include=job-applications, "
      + "GET /job-applications?include=candidate,job,stage&page[size]=30, GET /stages, GET /users, GET /departments, GET /locations, "
      + "POST /candidates {\"data\": {\"type\": \"candidates\", \"attributes\": {\"first-name\": \"…\", \"last-name\": \"…\", \"email\": "
      + "\"…\"}}}, POST /job-applications {\"data\": {\"type\": \"job-applications\", \"relationships\": {\"candidate\": {\"data\": "
      + "{\"type\": \"candidates\", \"id\": \"…\"}}, \"job\": {\"data\": {\"type\": \"jobs\", \"id\": \"…\"}}}}} (submits a candidate to a job). "
      + "Pagination: page[size] (max. 30); follow links.next.",
  },
  {
    id: "adyen", name: "Adyen", category: "finance",
    description: "Payments: accounts, stores, payment methods, webhooks, payment links",
    website: "https://www.adyen.com", docs: "https://docs.adyen.com/api-explorer/Management/latest/overview",
    logo: { favicon: "https://www.adyen.com" },
    baseUrl: "https://management-{environment}.adyen.com/v3",
    allowedOrigins: ["https://{checkout}"],
    derived: { checkout: adyenCheckoutServer },
    auth: { type: "header", name: "X-API-Key" },
    fields: [{ id: "token", label: "API key", secret: true },
             { id: "environment", label: "Environment", default: "live", options: [["live", "Production (live)"], ["test", "Testing (test)"]] },
             { id: "prefix", label: "Live URL prefix (Checkout only)", optional: true, format: "subdomain",
               help: "In the live Customer Area: “Developers” → “API URLs” (e.g. 1797a841fbb37ca7-YourCompany). Only needed to "
                 + "use the Checkout API in production." }],
    keyUrl: "https://ca-live.adyen.com/ca/ca/config/api_credentials_new.shtml",
    help: "1) In the Adyen Customer Area (ca-live.adyen.com, or ca-test.adyen.com for testing) open “Developers” → “API credentials” and "
      + "create a “Web service user” credential (or open an existing one). 2) Under “Roles”, within “Management API”, select the "
      + "read permissions you need (accounts, stores, payment methods, webhooks…) and the write ones if you will change something; for "
      + "payment links and refunds, the credential also needs the Checkout roles. 3) Under “Server settings” → “Authentication” click "
      + "“Generate API key”, copy it and save the changes. Choose the same environment here; for Checkout in production, also enter "
      + "your live URL prefix.",
    test: { path: "/me", account: (d) => [d.username, d.companyName].filter(Boolean).join(" · ") },
    examples: "Management API (Management v3): GET /me, GET /companies, GET /merchants?pageSize=100, GET /merchants/{merchantId}/stores, "
      + "GET /merchants/{merchantId}/paymentMethodSettings, GET /companies/{companyId}/webhooks, GET /companies/{companyId}/users, GET "
      + "/terminals?merchantIds=…. Checkout with the full URL (test: https://checkout-test.adyen.com/v71; production: "
      + "https://{prefix}-checkout-live.adyenpayments.com/checkout/v71, only if the prefix is set in the connector's settings), "
      + "amounts in cents: POST …/paymentLinks {\"amount\": {\"currency\": \"EUR\", \"value\": 1500}, \"reference\": \"…\", "
      + "\"merchantAccount\": \"…\", \"description\": \"…\"}, GET …/paymentLinks/{linkId}, PATCH …/paymentLinks/{linkId} {\"status\": "
      + "\"expired\"}, POST …/payments/{pspReference}/refunds {\"amount\": {\"currency\": \"EUR\", \"value\": 500}, \"merchantAccount\": "
      + "\"…\"}, POST …/paymentMethods {\"merchantAccount\": \"…\"}.",
  },
  {
    id: "lemonsqueezy", name: "Lemon Squeezy", category: "finance",
    description: "Digital sales: orders, subscriptions, customers and licenses",
    website: "https://www.lemonsqueezy.com", docs: "https://docs.lemonsqueezy.com/api", logo: { simpleIcons: "lemonsqueezy" },
    baseUrl: "https://api.lemonsqueezy.com/v1",
    headers: { Accept: "application/vnd.api+json" },
    auth: [{ type: "bearer" }, jsonApiBody],
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://app.lemonsqueezy.com/settings/api",
    help: "1) In Lemon Squeezy (app.lemonsqueezy.com) open “Settings” → “API” and click “+” to create a key. 2) Name it and "
      + "copy it: it is shown only once. It gives full access to all the stores in the account. Keys created in test mode "
      + "(“Test mode”) only see test data.",
    test: { path: "/users/me", account: (d) => d.data?.attributes?.email || d.data?.attributes?.name },
    examples: "JSON:API; amounts in cents. Examples: GET /stores, GET "
      + "/orders?filter[store_id]=…&filter[user_email]=…&page[size]=50, GET /orders/{id}, GET /subscriptions?filter[status]=active, GET "
      + "/subscriptions/{id}, DELETE /subscriptions/{id} (cancels; resume with PATCH /subscriptions/{id} {\"data\": {\"type\": "
      + "\"subscriptions\", \"id\": \"…\", \"attributes\": {\"cancelled\": false}}}), GET /customers?filter[email]=…, GET /products, GET "
      + "/variants?filter[product_id]=…, GET /license-keys?filter[order_id]=…, GET /discounts, POST /checkouts {\"data\": {\"type\": "
      + "\"checkouts\", \"relationships\": {\"store\": {\"data\": {\"type\": \"stores\", \"id\": \"…\"}}, \"variant\": {\"data\": "
      + "{\"type\": \"variants\", \"id\": \"…\"}}}}} (payment link). Pagination: page[number] and page[size] (max. 100).",
    tools: [
      { name: "lemonsqueezy_orders", title: "Lemon Squeezy: orders", annotations: { readOnlyHint: true },
        description: "Orders: id, number, date, customer, email, product, total, status (paid, refunded, partial_refund, pending, "
          + "failed…) and receipt link. Can filter by store and by customer email.",
        schema: { store: z.string().optional().describe("Store ID (GET /stores)"), email: z.string().optional(),
                   page: z.number().int().min(1).default(1), max: z.number().int().min(1).max(100).default(25) },
        async run({ store, email, page, max }, p) {
          const d = ensureOk(await p({ path: "/orders", query: { "filter[store_id]": store, "filter[user_email]": email,
            "page[number]": page, "page[size]": max } }), "Lemon Squeezy");
          const pages = d.meta?.page;
          return { page: pages?.currentPage, pages: pages?.lastPage, total: pages?.total,
            orders: (d.data || []).map(({ id, attributes: a = {} }) => ({ id, number: a.order_number, date: a.created_at,
              customer: a.user_name, email: a.user_email, total: a.total_formatted, status: a.status, receipt: a.urls?.receipt,
              product: fullName(a.first_order_item?.product_name, a.first_order_item?.variant_name
                && `(${a.first_order_item.variant_name})`) || undefined })) };
        } },
    ],
  },
  {
    id: "quaderno", name: "Quaderno", category: "finance",
    description: "Invoices, credit notes, contacts and tax calculation (VAT, OSS…)",
    website: "https://www.quaderno.io", docs: "https://developers.quaderno.io/api/", logo: { favicon: "https://www.quaderno.io" },
    baseUrl: "https://{account}.{environment}/api",
    auth: { type: "basic", usernameField: "token", fixedPassword: "" },
    fields: [{ id: "account", label: "Account name", format: "subdomain",
               help: "The part before .quadernoapp.com in your API URL (e.g. “example” in "
                 + "https://example.quadernoapp.com/api/)." },
             { id: "token", label: "Private API key", secret: true },
             { id: "environment", label: "Environment", default: "quadernoapp.com",
               options: [["quadernoapp.com", "Live"], ["sandbox-quadernoapp.com", "Sandbox (testing)"]] }],
    help: "1) In Quaderno open your profile (top right) → “API keys”. 2) Copy the private key (the public one, pk_…, does not work) and "
      + "note the API URL shown on that same page: the account name is the part before .quadernoapp.com. The "
      + "key gives full access to the account. 3) For testing, create an account at sandbox-quadernoapp.com, use its key and choose the "
      + "“Sandbox” environment here.",
    test: { path: "/authorization", account: (d) => d.identity?.name || d.identity?.email },
    examples: "Examples: GET /invoices?date=2026-10-01,2026-10-31&state=outstanding&limit=50, GET /invoices?q=… (number, customer or "
      + "order), GET /invoices/{id}, POST /invoices {\"contact\": {\"id\": …}, \"currency\": \"EUR\", \"items\": [{\"description\": "
      + "\"…\", \"quantity\": 1, \"unit_price\": 100}]}, GET /invoices/{id}/deliver (send by email), GET /credits (credit notes), GET "
      + "/contacts?q=…, POST /contacts {…}, GET /tax_rates/calculate?to_country=DE&to_postal_code=10115&tax_code=eservice (applicable "
      + "tax; only where the account is registered), GET /tax_ids/validate?country=DE&tax_id=… (validate a VAT ID), GET /ping. "
      + "Pagination: limit (max. 100) and created_before with the id of the last one.",
    tools: [
      { name: "quaderno_invoices", title: "Quaderno: invoices", annotations: { readOnlyHint: true },
        description: "Issued invoices, from the most recent to the oldest: id, number, date, customer, tax ID, country, total, currency, status "
          + "and PDF link. Filters by text (number, customer or order), dates and status.",
        schema: { text: z.string().optional(),
                   from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("YYYY-MM-DD"),
                   to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("YYYY-MM-DD (default: today)"),
                   status: z.enum(["outstanding", "late", "paid", "uncollectible"]).optional(),
                   max: z.number().int().min(1).max(100).default(25),
                   next: z.string().optional().describe("The “next” value from the previous call") },
        async run({ text, from, to, status: invoiceStatus, max, next }, p) {
          const date = from || to ? `${from || "2000-01-01"},${to || daysAgo(0)}` : undefined;
          const d = ensureOk(await p({ path: "/invoices", query: { q: text, date, state: invoiceStatus, limit: max, created_before: next } }),
            "Quaderno");
          const list = Array.isArray(d) ? d : [];
          const amount = (cents, value) => (cents != null ? cents / 100 : value != null ? Number(value) : undefined);
          return { next: list.length === max ? String(list.at(-1).id) : null, invoices: list.map((f) => ({ id: f.id,
            number: f.number, date: f.issue_date,
            customer: f.contact?.full_name || f.contact_name || fullName(f.first_name, f.last_name) || undefined,
            tax_id: f.tax_id || f.contact?.tax_id || undefined, country: f.country, total: amount(f.total_cents, f.total),
            currency: f.currency, status: f.state, pdf: f.pdf || f.permalink })) };
        } },
    ],
  },
  {
    id: "pennylane", name: "Pennylane", category: "finance",
    description: "Accounting: customer and supplier invoices, banks and ledger entries",
    website: "https://www.pennylane.com", docs: "https://pennylane.readme.io/docs/getting-started",
    logo: { favicon: "https://www.pennylane.com" },
    baseUrl: "https://app.pennylane.com/api/external/v2",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "Company API token", secret: true }],
    help: "1) With an administrator user, in Pennylane open “Paramètres” → “Connectivité” → “Développeurs” (in English, “Settings” → "
      + "“Connectivity” → “Developers”) and click “Générer un token API”. 2) Name it, set an expiration and select the permissions, as "
      + "read-only (“readonly”) or read and write (“all”): e.g. customer_invoices, supplier_invoices, customers, suppliers, "
      + "transactions, journals, ledger_accounts and ledger_entries. 3) Copy the token: it is shown only once. With an accounting firm token, "
      + "each request also needs the X-Company-Id header.",
    test: { path: "/me", account: (d) => d.company?.name || d.user?.email },
    examples: "Filters as JSON in filter (operators eq, not_eq, lt, lteq, gt, gteq, in, not_in) and ordering with sort (e.g. -date). "
      + "Examples: GET /customer_invoices?limit=50&sort=-date&filter=[{\"field\":\"date\",\"operator\":\"gteq\",\"value\":\"2026-10-01\"}] "
      + "(better with pennylane_invoices), GET /customer_invoices/{id}, GET /customers?limit=100, GET /supplier_invoices?limit=50, GET "
      + "/suppliers, GET /transactions (bank transactions), GET /bank_accounts, GET /journals, GET /ledger_accounts, GET "
      + "/ledger_entries?filter=[{\"field\":\"date\",\"operator\":\"gteq\",\"value\":\"2026-01-01\"}], GET "
      + "/trial_balance?period_start=2026-01-01&period_end=2026-09-30 (trial balance), GET /products, GET /me. Cursor "
      + "pagination: cursor=next_cursor while has_more is true (limit max. 100).",
    tools: [
      { name: "pennylane_invoices", title: "Pennylane: invoices", annotations: { readOnlyHint: true },
        description: "Customer invoices (issued) or supplier invoices (received), from the most recent to the oldest: id, number, "
          + "label, date, due date, amount, outstanding, status, contact and temporary PDF link. Filters by dates and by customer "
          + "or supplier.",
        schema: { type: z.enum(["customers", "suppliers"]).default("customers"),
                   from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("Invoice date from (YYYY-MM-DD)"),
                   to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("Invoice date to (YYYY-MM-DD)"),
                   contact: z.number().int().optional().describe("Customer or supplier ID"),
                   max: z.number().int().min(1).max(100).default(25),
                   next: z.string().optional().describe("The “next” value from the previous call") },
        async run({ type, from, to, contact, max, next }, p) {
          const filters = [...(from ? [{ field: "date", operator: "gteq", value: from }] : []),
            ...(to ? [{ field: "date", operator: "lteq", value: to }] : []),
            ...(contact ? [{ field: type === "customers" ? "customer_id" : "supplier_id", operator: "eq", value: String(contact) }] : [])];
          const filter = filters.length ? JSON.stringify(filters) : undefined;
          const d = ensureOk(await p({ path: type === "customers" ? "/customer_invoices" : "/supplier_invoices",
            query: { limit: max, cursor: next, sort: "-date", filter } }), "Pennylane");
          return { next: d.has_more ? d.next_cursor : null, invoices: (d.items || []).map((f) => ({ id: f.id, number: f.invoice_number,
            label: f.label, date: f.date, due: f.deadline, amount: f.amount, currency: f.currency,
            outstanding: f.remaining_amount_with_tax, status: f.status || f.payment_status, contact: (f.customer || f.supplier)?.id,
            pdf: f.public_file_url || undefined })) };
        } },
    ],
  },
  {
    id: "zohocrm", name: "Zoho CRM", category: "crm", description: "Leads, contacts, accounts, deals, notes and COQL queries",
    website: "https://www.zoho.com/crm/", docs: `https://www.zoho.com/crm/developer/docs/api/${ZOHO_VERSION}/`, logo: { favicon: "https://www.zoho.com/crm/" },
    baseUrl: `{api_domain}/crm/${ZOHO_VERSION}`,
    // Provider shared with the other Zoho connectors (src/oauth.js): a single client in the API console.
    auth: [{ type: "oauth", scopes: ZOHO_SCOPES, provider: "zoho" },
    // Zoho documents its own scheme in Authorization (“Zoho-oauthtoken …”). If it rejects the refresh, it responds 200 without a token.
    { type: "signature", sign: ({ headers: requestHeaders }) => {
      const token = /^Bearer (.*)$/.exec(requestHeaders.Authorization || "")?.[1];
      if (!token || token === "undefined") throw new Error("Zoho did not renew the access: connect Zoho again in the panel");
      requestHeaders.Authorization = `Zoho-oauthtoken ${token}`;
    } }],
    fields: [{ id: "server", label: "Data center", default: "accounts.zoho.eu", options: ZOHO_SERVERS },
             { id: "api_domain", label: "API domain", format: "url", hidden: true, example: "https://www.zohoapis.eu" }],
    help: "Read and write access to modules, COQL queries, and read access to settings, users and the organization are requested. Conector "
      + "acts with the permissions of the user who authorizes.",
    test: { path: "/users", query: { type: "CurrentUser" }, account: (d) => d?.users?.[0]?.email || d?.users?.[0]?.full_name },
    examples: `Paths relative to /crm/${ZOHO_VERSION} on the API domain of your data center. Examples: `
      + "GET /Leads?fields=Last_Name,Email,Company,Lead_Status&per_page=50 (fields is required when listing), GET /Contacts/{id}, "
      + "GET /Deals/search?criteria=(Stage:equals:Negotiation/Review), GET /Contacts/search?email=…, POST /coql {\"select_query\": "
      + "\"select Deal_Name, Amount, Stage from Deals where Amount > 1000 limit 50\"} (better with zohocrm_coql), POST /Leads {\"data\": "
      + "[{\"Last_Name\": \"…\", \"Company\": \"…\", \"Email\": \"…\"}]}, PUT /Deals/{id} {\"data\": [{\"Stage\": \"Closed Won\"}]}, "
      + "POST /Contacts/{id}/Notes {\"data\": [{\"Note_Title\": \"…\", \"Note_Content\": \"…\"}]}, GET /settings/modules, "
      + "GET /settings/fields?module=Deals, GET /users?type=ActiveUsers, GET /org. Pagination: page and per_page (max. 200); beyond "
      + "2000 records, page_token. A query with no results returns 204 (empty).",
    tools: [
      { name: "zohocrm_coql", title: "Zoho CRM: COQL query", annotations: { readOnlyHint: true },
        description: "Runs a COQL query (Zoho CRM's SQL: select fields from Module where … order by … limit n offset m) and "
          + "returns the records without metadata (for lookup fields, id and name), how many came back and whether there are more.",
        schema: { query: z.string().min(10)
          .describe("e.g. select Deal_Name, Amount, Stage, Closing_Date from Deals where Stage != 'Closed Lost' order by Closing_Date "
            + "limit 50") },
        async run({ query }, p) {
          const d = ensureOk(await p({ method: "POST", path: "/coql", body: { select_query: query } }), "Zoho CRM");
          return { returned: d?.info?.count ?? 0, has_more: Boolean(d?.info?.more_records), records: (d?.data || []).map(cleanZoho) };
        } },
      { name: "zohocrm_search", title: "Zoho CRM: search records", annotations: { readOnlyHint: true },
        description: "Searches the records of a module (Leads, Contacts, Accounts, Deals…) by criteria ((Field:operator:value), e.g. "
          + "(Stage:equals:Closed Won)), email, phone or word. Returns the records without metadata and whether there are more.",
        schema: { module: z.string().regex(/^[A-Za-z0-9_]+$/).describe("API name of the module: Leads, Contacts, Accounts, Deals…"),
                   criteria: z.string().optional().describe("e.g. ((Company:starts_with:Ac)and(Lead_Source:equals:Web))"),
                   email: z.string().optional(), phone: z.string().optional(),
                   text: z.string().optional().describe("Word to search in all fields"),
                   page: z.number().int().min(1).default(1), max: z.number().int().min(1).max(200).default(50) },
        async run({ module, criteria, email, phone, text, page, max }, p) {
          const search = criteria ? { criteria: criteria } : email ? { email } : phone ? { phone: phone }
            : text ? { word: text } : null;
          if (!search) throw new Error("Provide criteria, an email, a phone number or a text");
          const d = ensureOk(await p({ path: `/${module}/search`, query: { ...search, page: page, per_page: max } }), "Zoho CRM");
          return { has_more: Boolean(d?.info?.more_records), records: (d?.data || []).map(cleanZoho) };
        } },
    ],
  },
  {
    id: "canva", name: "Canva", category: "productivity", description: "Designs, folders, assets and export to PDF or image",
    website: "https://www.canva.com", docs: "https://www.canva.dev/docs/apps/rest-apis/",
    logo: { image: "https://static.canva.com/static/images/apple-touch-180x180-1.png" },
    baseUrl: "https://api.canva.com/rest/v1",
    auth: { type: "oauth", scopes: CANVA_SCOPES, provider: {
      name: "Canva", authorizeUrl: "https://www.canva.com/api/oauth/authorize", tokenUrl: "https://api.canva.com/rest/v1/oauth/token",
      clientAuth: "basic",
      help: "1) Enable two-step verification on your Canva account and open the Developer Portal (canva.com/developers) → “Your "
        + "integrations” → “Create an integration”; choose “Public” (private ones only exist for teams on the Enterprise plan). 2) In "
        + "“Configuration” name it, click “Generate secret” and copy the “Client ID” and the secret (it is shown only once). 3) In "
        + "“Scopes” select read access to design:meta, design:content, asset, folder and profile, and write access to design:content and asset. 4) In "
        + "“Redirect URLs” add the redirect URI shown below and click “Continue with Canva”. You do not need to submit it for review to use it "
        + "with your own account.",
    } },
    test: { path: "/users/me/profile", account: (d) => d.profile?.display_name },
    examples: "Examples: GET /designs?query=proposal&sort_by=modified_descending&limit=25 (pagination with continuation; better with "
      + "canva_designs), GET /designs/{designId}, GET /designs/{designId}/export-formats, POST /designs {\"design_type\": {\"type\": "
      + "\"preset\", \"name\": \"presentation\"}, \"title\": \"…\"} (also doc or whiteboard), POST /exports {\"design_id\": \"…\", "
      + "\"format\": {\"type\": \"pdf\"}} and GET /exports/{exportId} (better with canva_export), GET /folders/{folderId}/items, "
      + "GET /assets/{assetId}, POST /asset-uploads (body_base64 with the file, content_type application/octet-stream and header "
      + "Asset-Upload-Metadata {\"name_base64\": \"…\"}) and GET /asset-uploads/{jobId}, POST /imports (same, with header Import-Metadata "
      + "{\"title_base64\": \"…\"}; converts a PDF or PPTX into a design) and GET /imports/{jobId}, GET /users/me/profile.",
    tools: [
      { name: "canva_designs", title: "Canva: search designs", annotations: { readOnlyHint: true },
        description: "Your own designs and those shared with you: by relevance if you search for text and, otherwise, from the most recent to the oldest. "
          + "Returns id, title, type, pages, dates and links to edit and view (valid for 30 days, only for you), and “next” if there are "
          + "more.",
        schema: { text: z.string().max(255).optional(),
                   ownership: z.enum(["any", "owned", "shared"]).default("any")
                     .describe("any: all; owned: yours; shared: shared with you"),
                   max: z.number().int().min(1).max(100).default(25),
                   next: z.string().optional().describe("The “next” value from the previous call") },
        async run({ text, ownership, max, next }, p) {
          const d = ensureOk(await p({ path: "/designs", query: { query: text, ownership: ownership, limit: max, continuation: next,
            sort_by: text ? "relevance" : "modified_descending" } }), "Canva");
          const isoDate = (s) => (s ? new Date(s * 1000).toISOString() : undefined);
          return { next: d.continuation || null, designs: (d.items || []).map((x) => ({ id: x.id, title: x.title,
            type: x.design_types?.join(", ") || undefined, pages: x.page_count, created: isoDate(x.created_at),
            modified: isoDate(x.updated_at), edit_url: x.urls?.edit_url, view_url: x.urls?.view_url })) };
        } },
      { name: "canva_export", title: "Canva: export a design", annotations: { readOnlyHint: true },
        description: "Exports a design to PDF, PNG, JPG or PPTX and saves it on the server (Conector's downloads folder); for PNG and JPG, "
          + "one file per page. Takes a few seconds. Returns the file paths.",
        schema: { design: z.string().describe("Design ID (see canva_designs)"),
                   file_type: z.enum(["pdf", "png", "jpg", "pptx"]).default("pdf"),
                   pages: z.array(z.number().int().min(1)).optional().describe("Pages to export (starting at 1); default: all"),
                   quality: z.enum(["regular", "pro"]).default("regular").describe("pro: highest quality (may require Canva Pro)") },
        async run({ design, file_type, pages, quality }, p) {
          const format = { type: file_type, export_quality: quality, ...(file_type === "jpg" ? { quality: 90 } : {}),
            ...(pages?.length ? { pages: pages } : {}) };
          let job = ensureOk(await p({ method: "POST", path: "/exports", body: { design_id: design, format } }), "Canva").job;
          for (let i = 0; job?.status === "in_progress" && i < 45; i++) {
            await wait(2000);
            job = ensureOk(await p({ path: `/exports/${encodeURIComponent(job.id)}` }), "Canva").job;
          }
          if (job?.status !== "success") {
            throw new Error(`Canva: the export ${job?.status === "failed"
              ? `failed (${job.error?.message || job.error?.code || "no details"})` : "did not finish in time"}`);
          }
          const links = job.urls || [];
          const files = [];
          for (const [i, link] of links.entries()) {
            // Signed Canva links (valid for 24 hours): they are downloaded without the account token.
            const url = new URL(link);
            if (url.protocol !== "https:" || !/(^|\.)canva\.com$/.test(url.hostname)) {
              files.push({ link, warning: "unexpected download server: not downloaded" });
              continue;
            }
            const r = await fetch(url, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(120_000) });
            if (!r.ok) throw new Error(`Canva: could not download the file (${r.status})`);
            const name = `canva_${design}${links.length > 1 ? `_${i + 1}` : ""}.${file_type}`;
            files.push(saveDownload(name, Buffer.from(await r.arrayBuffer())));
          }
          return { file_type, files };
        } },
    ],
  },
  {
    id: "pinterest", name: "Pinterest", category: "marketing", description: "Pins, boards and analytics for your Pinterest account",
    website: "https://www.pinterest.com", docs: "https://developers.pinterest.com/docs/api/v5/introduction/",
    logo: { simpleIcons: "pinterest" },
    baseUrl: "https://api.pinterest.com/v5",
    auth: { type: "oauth", scopes: ["user_accounts:read", "boards:read", "boards:write", "pins:read", "pins:write"], provider: {
      name: "Pinterest", authorizeUrl: "https://www.pinterest.com/oauth/", tokenUrl: "https://api.pinterest.com/v5/oauth/token",
      clientAuth: "basic", scopeSeparator: ",", redirect: "localhost",
      help: "1) With a Pinterest business account, go to developers.pinterest.com → “My apps” → “Connect app”, fill in the "
        + "form and request trial access (“Trial access”): Pinterest reviews it and it can take a few days. 2) Once it is approved, "
        + "open the app, copy the “App ID” (client ID) and the “App secret key” and, under “Redirect URIs”, add the redirect URI shown "
        + "below. 3) Click “Continue with Pinterest” and authorize with the company's Pinterest account. With trial access, the pins and boards "
        + "you create are only visible to you; to publish them for real you must request standard access (“Upgrade”, with a video of the "
        + "authorization process). If Conector goes more than 60 days without being used, you must authorize again.",
    } },
    test: { path: "/user_account", account: (d) => d.business_name || d.username },
    examples: "Examples: GET /boards?page_size=50, GET /boards/{board_id}/pins?page_size=50, GET /pins/{pin_id}, POST /pins {\"board_id\": "
      + "\"…\", \"title\": \"…\", \"description\": \"…\", \"link\": \"https://…\", \"media_source\": {\"source_type\": \"image_url\", "
      + "\"url\": \"https://…\"}}, PATCH /pins/{pin_id} {\"title\": \"…\"}, POST /boards {\"name\": \"…\", \"description\": \"…\", "
      + "\"privacy\": \"PUBLIC\"}, GET /user_account/analytics?start_date=2026-09-15&end_date=2026-10-15&metric_types=IMPRESSION,SAVE,"
      + "PIN_CLICK,OUTBOUND_CLICK (better with pinterest_analytics), GET /user_account/analytics/top_pins?start_date=…&end_date=…"
      + "&sort_by=IMPRESSION, GET /pins/{pin_id}/analytics?start_date=…&end_date=…&metric_types=IMPRESSION,SAVE. "
      + "Pagination: bookmark.",
    tools: [
      { name: "pinterest_pins", title: "Pinterest: pins", annotations: { readOnlyHint: true },
        description: "Pins in the account or on a board: id, title, description, destination link, board, date and image. Returns "
          + "“next” if there are more.",
        schema: { board: z.string().optional().describe("Board ID (GET /boards); empty: all the account's pins"),
                   max: z.number().int().min(1).max(250).default(25),
                   next: z.string().optional().describe("The “next” value from the previous call") },
        async run({ board, max, next }, p) {
          const route = board ? `/boards/${encodeURIComponent(board)}/pins` : "/pins";
          const d = ensureOk(await p({ path: route, query: { page_size: max, bookmark: next } }), "Pinterest");
          return { next: d.bookmark || null, pins: (d.items || []).map((x) => ({ id: x.id, title: x.title || undefined,
            description: x.description || undefined, link: x.link || undefined, board: x.board_id, created: x.created_at,
            image: x.media?.images?.["600x"]?.url || x.media?.images?.["400x300"]?.url })) };
        } },
      { name: "pinterest_analytics", title: "Pinterest: account analytics", annotations: { readOnlyHint: true },
        description: "Account totals between two dates (default: the last 30 days; at most 90 days back): impressions, "
          + "saves, pin clicks, outbound clicks and engagement; optionally, the breakdown by day.",
        schema: { from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("YYYY-MM-DD (default: 30 days ago)"),
                   to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("YYYY-MM-DD (default: today)"),
                   daily: z.boolean().default(false).describe("Include the breakdown by day") },
        async run({ from, to, daily }, p) {
          const query = { start_date: from || daysAgo(30), end_date: to || daysAgo(0),
            metric_types: "IMPRESSION,SAVE,PIN_CLICK,OUTBOUND_CLICK,ENGAGEMENT" };
          const d = ensureOk(await p({ path: "/user_account/analytics", query }), "Pinterest");
          const all = d?.all || {};
          return { totals: all.summary_metrics || {},
            ...(daily ? { by_day: (all.daily_metrics || []).map((x) => ({ date: x.date, ...x.metrics })) } : {}) };
        } },
    ],
  },
];
