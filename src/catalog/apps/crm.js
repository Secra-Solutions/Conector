// CRM and sales: CRM, prospecting and B2B contact search.
import { z } from "zod";
import { ensureOk } from "../define.js";

const HUBSPOT_PROPERTIES = {
  contacts: ["email", "firstname", "lastname", "company", "jobtitle", "phone"],
  companies: ["name", "domain", "city", "industry"],
  deals: ["dealname", "amount", "dealstage", "pipeline", "closedate"],
  tickets: ["subject", "hs_pipeline_stage", "hs_ticket_priority"],
};

// Apollo takes the filters as query parameters, with lists repeated (person_titles[]=A&person_titles[]=B).
function apolloQuery(filters) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) for (const x of [].concat(v ?? [])) if (x !== "") q.append(k, String(x));
  return q.toString();
}

const APOLLO_SENIORITY = ["owner", "founder", "c_suite", "partner", "vp", "head", "director", "manager", "senior", "entry", "intern"];

export default [
  {
    id: "hubspot", name: "HubSpot", category: "crm", description: "CRM contacts, companies, deals and tickets",
    website: "https://www.hubspot.com", docs: "https://developers.hubspot.com/docs/api-reference/latest/overview",
    logo: { simpleIcons: "hubspot" },
    baseUrl: "https://api.hubapi.com",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "Service key (or private app token pat-…)", secret: true }],
    // One click: OAuth app in HubSpot. The authorization URL must request all of the app's “required” scopes.
    oauth: { scopes: ["crm.objects.contacts.read", "crm.objects.contacts.write", "crm.objects.companies.read",
                        "crm.objects.companies.write", "crm.objects.deals.read", "crm.objects.deals.write",
                        "crm.objects.owners.read", "crm.objects.tickets.read", "crm.objects.tickets.write"],
      provider: { name: "HubSpot", key: "hubspot", redirect: "localhost",
        authorizeUrl: "https://app.hubspot.com/oauth/authorize", tokenUrl: "https://api.hubapi.com/oauth/v3/token",
        help: "1) HubSpot no longer creates apps from the browser, only with its CLI: install it (npm install -g @hubspot/cli), "
          + "run “hs account auth” with the account where you will create the app and then “hs project create”: name it “Conector”, "
          + "choose “App” as the content and private distribution (specific accounts only). 2) In the app's app-hsmeta.json set "
          + "“auth” → “type”: “oauth”, the redirect URI shown below in “redirectUrls” and the permissions "
          + "(scopes) shown below in “requiredScopes”; leave the optional ones empty, because HubSpot requires requesting all the required ones in the URL. "
          + "3) Upload the project with “hs project upload”, open it with “hs project open”, go into the app → “Auth” tab and copy the "
          + "“Client ID” and the “Client secret”. 4) When connecting, a HubSpot super admin chooses the account and accepts the permissions "
          + "(if HubSpot asks you to allow that account in the app's distribution, add it). If you already have a public app created in a "
          + "developer account (previous model), that works too: add the URI to it and check those same permissions." },
      test: { path: "/crm/owners/2026-09", query: { limit: 1 }, message: "HubSpot account is authorized" } },
    help: "In HubSpot (super admin or with access to the developer tools): “Settings” → “Integrations” → "
      + "“Service keys” (in some accounts, “Development” → “Keys” → “Service keys”) → “Create service key”. "
      + "Give it a name, add the permissions crm.objects.contacts.read/write, crm.objects.companies.read/write, "
      + "crm.objects.deals.read/write and crm.objects.owners.read (and tickets if you use them), create it and copy it with “Show”. "
      + "The token of a legacy private app also works.",
    test: { path: "/account-info/2026-09/details", account: (d) => (d.portalName ? `${d.portalName} (${d.portalId})` : d.portalId) },
    examples: "Examples: GET /crm/objects/2026-09/contacts?limit=20&properties=email,firstname,lastname, "
      + "POST /crm/objects/2026-09/contacts/search {\"filterGroups\": [{\"filters\": [{\"propertyName\": \"email\", "
      + "\"operator\": \"EQ\", \"value\": \"…\"}]}]}, POST /crm/objects/2026-09/deals {\"properties\": {\"dealname\": \"…\", "
      + "\"amount\": \"…\"}}, PATCH /crm/objects/2026-09/companies/{id}, GET /crm/owners/2026-09, GET /crm/pipelines/2026-09/deals, "
      + "PUT /crm/objects/2026-09/contacts/{id}/associations/default/companies/{id}. The old paths (/crm/v3/…) still work, "
      + "but HubSpot drops support for them in September 2027.",
    tools: [
      { name: "hubspot_search", title: "HubSpot: search the CRM", annotations: { readOnlyHint: true },
        description: "Search contacts, companies, deals or tickets by text (name, email, domain, phone…). "
          + "Returns id and main properties.",
        schema: { type: z.enum(["contacts", "companies", "deals", "tickets"]).default("contacts"),
                   query: z.string().describe("Text to search for"),
                   properties: z.array(z.string()).optional().describe("Properties to return (by default, the main ones for the type)"),
                   max: z.number().int().min(1).max(200).default(20),
                   after: z.string().optional().describe("The “next” value from the previous search") },
        async run({ type, query, properties, max, after }, p) {
          const d = ensureOk(await p({ method: "POST", path: `/crm/objects/2026-09/${type}/search`,
            body: { query: query, limit: max, after: after, properties: properties || HUBSPOT_PROPERTIES[type] } }), "HubSpot");
          return { total: d.total,
                   results: d.results.map((r) => ({ id: r.id, ...r.properties, hs_object_id: undefined, updated: r.updatedAt })),
                   next: d.paging?.next?.after || null };
        } },
    ],
  },
  {
    id: "pipedrive", name: "Pipedrive", category: "crm", description: "Deals, people, organizations and activities",
    website: "https://www.pipedrive.com", docs: "https://developers.pipedrive.com/docs/api/v1", logo: { favicon: "https://www.pipedrive.com" },
    baseUrl: "https://api.pipedrive.com",
    auth: { type: "header", name: "x-api-token" },
    fields: [{ id: "token", label: "Personal API token", secret: true },
             { id: "api_domain", label: "Account domain", format: "url", hidden: true, example: "https://api.pipedrive.com" }],
    // With OAuth, Pipedrive returns the account domain in the token response (https://company.pipedrive.com): it is the API base.
    // Scopes are not sent in the URL: they are chosen when registering the app.
    oauth: { scopes: [], baseUrl: "{api_domain}", provider: { name: "Pipedrive", key: "pipedrive", redirect: "localhost",
      clientAuth: "basic", keep: ["api_domain"],
      authorizeUrl: "https://oauth.pipedrive.com/oauth/authorize", tokenUrl: "https://oauth.pipedrive.com/oauth/token",
      after: async (token, c) => {
        if (!/^https:\/\/[a-z0-9-]+\.pipedrive\.com\/?$/i.test(String(c.api_domain || ""))) {
          throw new Error("Pipedrive did not return a valid API domain");
        }
        return {};
      },
      help: "1) You need a free Pipedrive developer (sandbox) account, the only kind that shows the “Developer Hub”: request it "
        + "at developers.pipedrive.com. 2) From your profile menu open “Developer Hub”, click “Create an app” → “Create private "
        + "app” (the type cannot be changed later and it does not go through Pipedrive review). 3) Name it “Conector” and paste the redirect URI shown below into “OAuth Callback "
        + "URL” (Pipedrive accepts only one per app); save. 4) In the “OAuth & "
        + "access scopes” tab select full access to Deals, Contacts, Activities and Leads and read access to Users and Search: scopes "
        + "are chosen here, not when connecting. 5) In that same tab copy the “Client ID” and the “Client secret”. 6) If you will connect a "
        + "Pipedrive account other than the developer one, first click “Change to live”. When connecting, Pipedrive asks you to accept the "
        + "app's permissions." } },
    help: "In Pipedrive: your account menu (top right) → “Personal preferences” → “API” tab and copy your personal token. "
      + "If you do not see the “API” option, your permission set does not include it: ask an administrator.",
    test: { path: "/v1/users/me", account: (d) => [d.data?.email, d.data?.company_name].filter(Boolean).join(" · ") },
    examples: "API v2 is under /api/v2 and v1 under /v1. Examples: GET /api/v2/deals?status=open&limit=50, "
      + "GET /api/v2/persons/search?term=…, GET /api/v2/organizations/{id}, "
      + "POST /api/v2/deals {\"title\": \"…\", \"value\": 1000, \"currency\": \"EUR\"}, PATCH /api/v2/deals/{id}, "
      + "GET /api/v2/activities?done=false, GET /api/v2/pipelines, GET /v1/leads, "
      + "POST /v1/notes {\"content\": \"…\", \"deal_id\": 1}, GET /v1/users.",
    tools: [
      { name: "pipedrive_search", title: "Pipedrive: search", annotations: { readOnlyHint: true },
        description: "Search deals, people, organizations, products or leads by text (name, email, phone, notes…).",
        schema: { text: z.string().min(2).describe("Text to search for (minimum 2 characters)"),
                   types: z.array(z.enum(["deal", "person", "organization", "product", "lead"])).optional()
                     .describe("Types to search in (by default, all)"),
                   max: z.number().int().min(1).max(100).default(20),
                   cursor: z.string().optional().describe("The “next” value from the previous search") },
        async run({ text, types, max, cursor }, p) {
          const d = ensureOk(await p({ path: "/api/v2/itemSearch",
            query: { term: text, item_types: types?.join(","), limit: max, cursor } }), "Pipedrive");
          return { results: (d.data?.items || []).map(({ item: i }) => ({ type: i.type, id: i.id, name: i.title || i.name,
                     organization: i.organization?.name, person: i.person?.name, emails: i.emails, phones: i.phones,
                     status: i.status, value: i.value === undefined ? undefined : `${i.value} ${i.currency || ""}`.trim() })),
                   next: d.additional_data?.next_cursor || null };
        } },
    ],
  },
  {
    id: "apollo", name: "Apollo.io", category: "crm", description: "B2B contact and company search and enrichment",
    website: "https://www.apollo.io", docs: "https://docs.apollo.io/reference/apollo-api", logo: { favicon: "https://www.apollo.io" },
    baseUrl: "https://api.apollo.io/api/v1",
    auth: { type: "header", name: "x-api-key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    // Apollo's OAuth is for partners: app registration goes through an approval, so only the API key is offered.
    keyUrl: "https://app.apollo.io/#/settings/integrations/api",
    help: "In Apollo: “Settings” → “Integrations” → “API Keys” → “Create new key”. Give it a name and select the endpoints you will "
      + "use (e.g. mixed_people/api_search, people/match and contacts) or turn on “Set as master key” for all of them (some, such as the "
      + "user list, only work with a master key). Copy the key.",
    // /auth/health responds 200 even with a fake key: what matters is is_logged_in.
    test: { path: "/auth/health", message: "API key is valid",
              validate: (d) => { if (!d?.is_logged_in) throw new Error("Apollo does not recognize the API key"); } },
    examples: "Examples: POST /mixed_people/api_search?person_titles[]=CISO&q_organization_domains_list[]=example.com (free, "
      + "no emails), POST /people/match?email=… or ?first_name=…&last_name=…&domain=… (uses credits), "
      + "POST /mixed_companies/search?q_organization_name=… (1 credit per page), GET /organizations/enrich?domain=… (1 credit), "
      + "POST /contacts/search {\"q_keywords\": \"…\"}, POST /contacts {\"first_name\": \"…\", \"email\": \"…\"}, "
      + "GET /opportunities/search. Lists are passed by repeating the parameter in the path (person_titles[]=A&person_titles[]=B).",
    tools: [
      { name: "apollo_search_people", title: "Apollo: search people", annotations: { readOnlyHint: true },
        description: "Search profiles in Apollo's database by job title, company, location or seniority. Uses no credits "
          + "and returns no emails (for that, use apollo_enrich_person).",
        schema: { titles: z.array(z.string()).optional().describe("Job titles, e.g. [\"CISO\", \"IT Manager\"]"),
                   domains: z.array(z.string()).optional().describe("Company domains, e.g. [\"example.com\"]"),
                   locations: z.array(z.string()).optional().describe("Where the people live, e.g. [\"United States\"] or [\"Boston\"]"),
                   company_locations: z.array(z.string()).optional().describe("Company headquarters, e.g. [\"United States\"]"),
                   seniority: z.array(z.enum(APOLLO_SENIORITY)).optional(),
                   keywords: z.string().optional().describe("Keywords"),
                   page: z.number().int().min(1).max(500).default(1), max: z.number().int().min(1).max(100).default(25) },
        async run(a, p) {
          const query = apolloQuery({ "person_titles[]": a.titles, "q_organization_domains_list[]": a.domains,
            "person_locations[]": a.locations, "organization_locations[]": a.company_locations,
            "person_seniorities[]": a.seniority, q_keywords: a.keywords, page: a.page, per_page: a.max });
          const d = ensureOk(await p({ method: "POST", path: `/mixed_people/api_search?${query}`, body: {} }), "Apollo");
          return { total: d.total_entries, people: (d.people || []).map((x) => ({ id: x.id,
            name: [x.first_name, x.last_name_obfuscated].filter(Boolean).join(" "), title: x.title,
            company: x.organization?.name, has_email: x.has_email })) };
        } },
      { name: "apollo_enrich_person", title: "Apollo: a person's contact details", annotations: { readOnlyHint: true },
        description: "A person's work email, job title, LinkedIn and company, from their Apollo id, email, LinkedIn or "
          + "name with domain. Uses 1 credit if it finds data.",
        schema: { id: z.string().optional().describe("Apollo ID (from apollo_search_people)"), email: z.string().optional(),
                   linkedin: z.string().optional().describe("LinkedIn profile URL"), first_name: z.string().optional(),
                   last_name: z.string().optional(), domain: z.string().optional().describe("Company domain"),
                   company: z.string().optional().describe("Company name (if you do not know the domain)") },
        async run(a, p) {
          if (!a.id && !a.email && !a.linkedin && !(a.first_name && (a.domain || a.company))) {
            throw new Error("Provide the id, the email, the LinkedIn URL or the name together with the domain or the company");
          }
          const query = apolloQuery({ id: a.id, email: a.email, linkedin_url: a.linkedin, first_name: a.first_name,
            last_name: a.last_name, domain: a.domain, organization_name: a.company });
          const x = ensureOk(await p({ method: "POST", path: `/people/match?${query}`, body: {} }), "Apollo").person;
          if (!x) return { found: false };
          return { found: true, id: x.id, name: x.name, title: x.title, email: x.email, email_status: x.email_status,
                   linkedin: x.linkedin_url, company: x.organization?.name, website: x.organization?.website_url, city: x.city,
                   country: x.country, confidence: x.match_confidence };
        } },
    ],
  },
  {
    id: "hunter", name: "Hunter", category: "crm", description: "Find and verify professional emails by domain or person",
    website: "https://hunter.io", docs: "https://hunter.io/api-documentation/v2", logo: { favicon: "https://hunter.io" },
    baseUrl: "https://api.hunter.io/v2",
    auth: { type: "header", name: "X-API-KEY" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://hunter.io/api-keys",
    help: "At hunter.io/api-keys (your account menu → “API”) copy your API key or generate a new one. Searches and "
      + "verifications count against your plan's quota; checking the account is free.",
    test: { path: "/account", account: (d) => d.data && `${d.data.email} (${d.data.plan_name})` },
    examples: "Examples: GET /domain-search?domain=example.com&limit=10 (uses one search if there are results), "
      + "GET /email-finder?domain=…&first_name=…&last_name=… (only charged if it finds one), "
      + "GET /email-verifier?email=… (if it responds 202, repeat the call), GET /email-count?domain=…, "
      + "GET /domain-finder?company=… (free), GET /account (remaining quota, free).",
    tools: [
      { name: "hunter_search_domain", title: "Hunter: emails of a domain", annotations: { readOnlyHint: true },
        description: "Known professional emails of a company (name, job title, department, confidence and verification). "
          + "Uses one search from the quota if there are results.",
        schema: { domain: z.string().describe("Company domain, e.g. example.com"),
                   type: z.enum(["personal", "generic"]).optional().describe("personal (individuals) or generic (info@, sales@…)"),
                   department: z.string().optional().describe("e.g. executive, it, finance, sales, marketing, hr, legal"),
                   max: z.number().int().min(1).max(100).default(10),
                   offset: z.number().int().min(0).default(0).describe("Offset for pagination") },
        async run({ domain, type, department, max, offset }, p) {
          const d = ensureOk(await p({ path: "/domain-search",
            query: { domain: domain, type: type, department: department, limit: max, offset: offset } }), "Hunter");
          return { organization: d.data?.organization, pattern: d.data?.pattern, total: d.meta?.results,
                   emails: (d.data?.emails || []).map((e) => ({ email: e.value,
                     name: [e.first_name, e.last_name].filter(Boolean).join(" ") || undefined, position: e.position,
                     department: e.department, type: e.type, confidence: e.confidence, verification: e.verification?.status })) };
        } },
      { name: "hunter_find_email", title: "Hunter: find a person's email", annotations: { readOnlyHint: true },
        description: "Most likely professional email of a person, from their name and the domain (or company). "
          + "Uses a credit only if it finds one.",
        schema: { first_name: z.string(), last_name: z.string(),
                   domain: z.string().optional().describe("Company domain (gives better results than the name)"),
                   company: z.string().optional().describe("Company name, if you do not know the domain") },
        async run({ first_name, last_name, domain, company }, p) {
          if (!domain && !company) throw new Error("Provide the domain or the company");
          const d = ensureOk(await p({ path: "/email-finder",
            query: { first_name: first_name, last_name: last_name, domain: domain, company: company } }), "Hunter").data || {};
          return { email: d.email || null, score: d.score, position: d.position, company: d.company,
                   verification: d.verification?.status, linkedin: d.linkedin_url };
        } },
    ],
  },
  {
    id: "lemlist", name: "lemlist", category: "crm", description: "Prospecting campaigns, leads and statistics",
    website: "https://www.lemlist.com", docs: "https://developer.lemlist.com", logo: { favicon: "https://www.lemlist.com" },
    baseUrl: "https://api.lemlist.com/api",
    // Basic authentication with an empty username and the key as the password.
    auth: { type: "basic", fixedUsername: "", passwordField: "token" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://app.lemlist.com/settings/integrations",
    help: "In lemlist: your profile picture (bottom left) → “Settings” → “Integrations” tab → “Generate a new API key” "
      + "and copy it.",
    test: { path: "/team", account: (d) => d.name },
    examples: "Examples: GET /campaigns?version=v2&limit=20, GET /campaigns/{id}/leads/, "
      + "GET /v2/campaigns/{id}/stats?startDate=…&endDate=…, "
      + "POST /campaigns/{id}/leads/ {\"email\": \"…\", \"firstName\": \"…\", \"companyName\": \"…\"} (create only; to change "
      + "a lead, PATCH /campaigns/{id}/leads/{leadId}), GET /leads/{email}, GET /team/credits.",
  },
];
