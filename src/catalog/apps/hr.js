// Human resources: employees, time off and attendance.

export default [
  {
    id: "factorial", name: "Factorial", category: "hr", description: "Employees, time off, attendance, teams and documents",
    website: "https://factorial.com", docs: "https://apidoc.factorialhr.com/docs/getting-started", logo: { favicon: "https://factorial.com" },
    baseUrl: "https://api.factorialhr.com/api/{version}",
    auth: { type: "header", name: "x-api-key" },
    fields: [{ id: "token", label: "API key", secret: true },
             { id: "version", label: "API version", default: "2026-10-01", optional: true,
               help: "Factorial publishes a version at the start of each quarter and keeps each one for a year." }],
    // One click: OAuth app registered in Factorial. It asks for a company token (like the API key); it expires after 1 h and renews itself.
    oauth: { scopes: ["employees", "time_off", "time_tracking", "documents", "company_legal_entities"], fields: ["version"],
      provider: { name: "Factorial", key: "factorial", redirect: "https", extraParams: { resource_owner_type: "company" },
        authorizeUrl: "https://id.factorialhr.com/oauth/authorize", tokenUrl: "https://id.factorialhr.com/api/oauth/token",
        help: "1) As an admin user, in Factorial go to “Settings” → “Advanced configuration” → “OAuth applications” "
          + "(app.factorialhr.com/settings/oauth-applications) and click “Create OAuth app”. 2) Name it “Conector”, choose a "
          + "confidential client (with a secret), paste the redirect URI shown below into the redirect URIs and select the scopes "
          + "listed below. 3) Save and copy the “Client ID” and the “Client secret” (if you lose it, use “Rotate client secret”). "
          + "4) When connecting, a Factorial admin signs in and authorizes: a company token is requested, like the API key, "
          + "limited to those scopes." },
      test: { path: "/resources/employees/employees", query: { limit: 1 }, message: "Authorized (employee read access)" } },
    keyUrl: "https://app.factorialhr.com/settings/api-keys",
    help: "1) As an admin user, in Factorial go to “Settings” and scroll down to the “Advanced” section → “API keys”. "
      + "2) Click “Create new API key”, give it a name and click “Get my API key”. 3) Copy it: it is shown only once. "
      + "It gives access to all company data and does not expire (it can be revoked).",
    test: { path: "/resources/api_public/credentials", account: (d) => d.data?.[0]?.name || d.data?.[0]?.legal_name },
    examples: "Examples: GET /resources/employees/employees?only_active=true&only_managers=false, "
      + "GET /resources/timeoff/leaves?from=2026-10-01&to=2026-10-31&include_deleted_leaves=false, GET /resources/timeoff/leave_types, "
      + "POST /resources/timeoff/leaves {\"employee_id\": …, \"leave_type_id\": …, \"start_on\": \"2026-11-02\", "
      + "\"finish_on\": \"2026-11-06\"}, GET /resources/attendance/shifts?employee_ids[]=…&start_on=2026-10-01&end_on=2026-10-31, "
      + "GET /resources/teams/teams, GET /resources/companies/legal_entities. "
      + "Pagination: limit (max 100) and after_id with the previous meta.end_cursor.",
  },
  {
    id: "personio", name: "Personio", category: "hr", description: "Employees, absences, attendance, projects and documents",
    website: "https://www.personio.com", docs: "https://developer.personio.de/reference/introduction", logo: { simpleIcons: "personio" },
    baseUrl: "https://api.personio.de/v2", headers: { "X-Personio-App-ID": "CONECTOR" },
    auth: { type: "client_credentials", url: "https://api.personio.de/v2/auth/token", credentialsIn: "body" },
    fields: [{ id: "client_id", label: "Client ID" }, { id: "client_secret", label: "Client secret", secret: true }],
    help: "1) As a user with API access rights, in Personio go to “Marketplace” → “Connected integrations” "
      + "and click “Create custom integration”. 2) Give it a name and select the permissions you need, read or write: "
      + "at least read access to persons (the connection test uses it) and whatever you plan to use (absences, attendance, documents…). "
      + "3) Choose the employee attributes it can read, save, and copy the Client ID and the Client secret.",
    test: { path: "/persons", query: { limit: 1 }, message: "Credentials are valid (persons can be read)" },
    examples: "Examples: GET /persons?limit=50, GET /persons/{id}, GET /persons/{id}/employments, "
      + "GET /absence-periods?person.id=…&starts_from.date_time.gte=2026-10-01T00:00:00, GET /absence-types, "
      + "GET /attendance-periods?person.id=…, POST /attendance-periods, GET /org-units?type=department, GET /legal-entities, GET /projects. "
      + "Cursor pagination: follow _meta.links.next.href.",
  },
];
