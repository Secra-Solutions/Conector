// Batch 19 of the catalog: developer tools and utilities (Dock Certs … iLert). Almost all use an API key; Firebase (Google), Gist
// (GitHub) and Gitea also connect with one click.
import { z } from "zod";
import { ensureOk } from "../define.js";

// GitHub OAuth app: the same one the “github” connector uses (key "github"); Gist only asks for different permissions.
const GITHUB = {
  name: "GitHub", key: "github", redirect: "localhost",
  authorizeUrl: "https://github.com/login/oauth/authorize", tokenUrl: "https://github.com/login/oauth/access_token",
  help: "1) In GitHub open “Settings” → “Developer settings” → “OAuth Apps” → “New OAuth App” (or the same path in the "
    + "organization settings). 2) Name it “Conector”, set “Homepage URL” to https://www.example.com and “Authorization callback "
    + "URL” to the redirect URI shown below; click “Register application”. 3) Copy the “Client ID”, click “Generate a new "
    + "client secret” and copy the secret. If the organization restricts OAuth apps, an owner will have to approve it.",
};

// Google answers 400 “API key not valid” to a key that does not exist; any other 400 means the key was read correctly.
const checkGoogleKey = (service) => (d) => {
  const e = d?.error;
  if (e?.details?.some((x) => x.reason === "API_KEY_INVALID") || /API key (not valid|expired)/i.test(e?.message || "")) {
    throw new Error(`${service}: the API key is not valid or has expired`);
  }
};

// Harness carries the account ID inside the token itself: pat.<account>.<id>.<secret> (or sat.… for service accounts).
const harnessAccount = (token) => /^(?:pat|sat)\.([\w-]+)\./.exec(String(token || ""))?.[1];

export default [
  {
    id: "dockcerts", name: "Dock Certs (Truvera)", category: "developer",
    description: "Verifiable credentials, DIDs and issuer profiles",
    website: "https://truvera.io", docs: "https://docs.truvera.io/truvera-api", logo: { favicon: "https://truvera.io" },
    baseUrl: "https://{server}",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true },
             { id: "server", label: "Key environment", format: "domain", default: "api.truvera.io",
               options: [["api.truvera.io", "Production"], ["api-testnet.truvera.io", "Testing (testnet)"]],
               help: "Test keys only work in the testing environment, and production keys only in production." }],
    help: "1) Sign in to the Truvera workspace (formerly Dock Certs) at certs.dock.io as an administrator. 2) Open the "
      + "“Developer” → “API Keys” menu and click “Create API key” (optionally, restrict the IPs that can use it); the key is a "
      + "production key unless you first turn on test mode next to your avatar. 3) Copy the key, which is shown only once, and "
      + "choose below the environment where you created it.",
    test: { path: "/profiles", message: "API key is valid" },
    examples: "Examples: GET /profiles, GET /dids, GET /credentials?offset=0&limit=20, GET /schemas, GET /templates, GET /registries.",
  },
  {
    id: "droptocdn", name: "Drop to CDN", category: "developer",
    description: "Upload files and publish HTML at public CDN URLs",
    website: "https://droptocdn.com", docs: "https://droptocdn.com/docs", logo: { favicon: "https://droptocdn.com" },
    baseUrl: "https://api.droptocdn.com/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key (dtc_…)", secret: true }],
    keyUrl: "https://droptocdn.com/dashboard/settings",
    help: "1) Sign in to your Drop to CDN account (a default key is created when you sign up). 2) Open “Dashboard” → “Settings” "
      + "and copy the API key, which starts with dtc_ (or create another one). 3) Every uploaded file or published page uses "
      + "monthly plan quota, even if you delete it later.",
    test: { path: "/files", query: { limit: 1 }, message: "API key is valid" },
    examples: "Examples: GET /files?limit=20, GET /files/{id}, DELETE /files/{id}, "
      + "POST /pages {\"html\": \"<h1>Hello</h1>\", \"retention_days\": 7} (returns the public URL). POST /files uploads a file "
      + "as multipart/form-data (field “file”): send it with body_base64 and content_type “multipart/form-data; boundary=…”.",
  },
  {
    id: "e2b", name: "E2B", category: "developer", description: "Isolated sandboxes to run code safely",
    website: "https://e2b.dev", docs: "https://e2b.dev/docs/api-reference", logo: { image: "https://github.com/e2b-dev.png" },
    baseUrl: "https://api.e2b.app",
    auth: { type: "header", name: "X-API-Key" },
    fields: [{ id: "token", label: "API key (e2b_…)", secret: true }],
    keyUrl: "https://e2b.dev/dashboard?tab=keys",
    help: "1) Go to e2b.dev and sign in (or create an account). 2) Open the “Dashboard” → “Keys” tab and copy "
      + "the API key, which starts with e2b_ (or create a new one). 3) This API manages the sandboxes (create, list, pause, "
      + "destroy) and the templates; code runs inside each sandbox with the E2B SDK.",
    test: { path: "/v2/sandboxes", message: (d) => (Array.isArray(d) ? `Sandboxes in the team: ${d.length}` : "API key is valid") },
    examples: "Examples: GET /v2/sandboxes?state=running, GET /v2/templates, "
      + "POST /v2/sandboxes {\"templateID\": \"base\", \"timeout\": 300}, GET /sandboxes/{id}, POST /sandboxes/{id}/pause, "
      + "POST /sandboxes/{id}/timeout {\"timeout\": 600}, DELETE /sandboxes/{id}.",
  },
  {
    id: "emailable", name: "Emailable", category: "marketing",
    description: "Real-time and batch email verification",
    website: "https://emailable.com", docs: "https://emailable.com/docs/api", logo: { favicon: "https://emailable.com" },
    baseUrl: "https://api.emailable.com/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "Private API key", secret: true }],
    oauth: { scopes: [], provider: { name: "Emailable", key: "emailable", redirect: "https",
      authorizeUrl: "https://app.emailable.com/oauth/authorize", tokenUrl: "https://app.emailable.com/oauth/token",
      help: "1) In Emailable open “Developer” (app.emailable.com/developer/apps) and click “New”. 2) Name it “Conector”, set "
        + "“Website” to https://www.example.com, choose “Live App” (the test one returns made-up data) and, in “Redirect URI”, "
        + "paste the redirect URI shown below; click “Save”. 3) Copy the “Client ID” and the “Client Secret” of the "
        + "app. Emailable does not ask for permissions: the connection gives access to the whole account." } },
    keyUrl: "https://app.emailable.com/api",
    help: "1) Sign in to your Emailable account (app.emailable.com). 2) Open the “API” section and copy the private key (“Live”); "
      + "the test key (“Test”) uses no credits but returns simulated results. 3) Each verification uses credits; "
      + "checking the account does not.",
    test: { path: "/account",
              account: (d) => [d.owner_email, d.available_credits != null && `${d.available_credits} credits`]
                .filter(Boolean).join(" · ") },
    examples: "Examples: GET /account (available credits), GET /verify?email=you@example.com (uses one credit), "
      + "POST /batch (batch of emails) and GET /batch?id=… (batch status and results).",
  },
  {
    id: "emailvalidation", name: "Emailvalidation", category: "marketing",
    description: "Validate emails: deliverability, disposable addresses, quality",
    website: "https://emailvalidation.io", docs: "https://emailvalidation.io/docs", logo: { favicon: "https://emailvalidation.io" },
    baseUrl: "https://api.emailvalidation.io/v1",
    auth: { type: "header", name: "apikey" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://app.emailvalidation.io/dashboard",
    help: "1) Sign in to your Emailvalidation dashboard (app.emailvalidation.io). 2) Copy the API key shown on the "
      + "“Dashboard”. 3) Each validation uses monthly plan quota; checking the account status does not.",
    test: { path: "/status", message: (d) => (d?.quotas?.month
      ? `Monthly quota: ${d.quotas.month.remaining} of ${d.quotas.month.total} left` : "API key is valid") },
    examples: "Examples: GET /info?email=you@example.com (validates an email and uses quota), GET /status (remaining quota, free).",
  },
  {
    id: "exceptionless", name: "Exceptionless", category: "developer",
    description: "Errors and events of your apps, plus their configuration",
    website: "https://exceptionless.com", docs: "https://exceptionless.com/docs/api/", logo: { image: "https://github.com/exceptionless.png" },
    baseUrl: "{url}/api/v2",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "Project API key", secret: true },
             { id: "url", label: "Exceptionless server", format: "url", default: "https://api.exceptionless.io",
               help: "Change it only if you run Exceptionless on your own servers, e.g. "
                 + "https://exceptionless.example.com." }],
    help: "1) Sign in to your Exceptionless account (be.exceptionless.io) and open the project. 2) In “Project Settings” → “API Keys” "
      + "copy the project key (or create one). 3) It is a project key (“client” scope): it can send and read events and "
      + "read the project configuration; managing organizations and projects needs a user token.",
    test: { path: "/projects/config", message: "Project key is valid" },
    examples: "Examples: GET /projects/config (client configuration), GET /events?limit=10, "
      + "POST /events [{\"type\": \"log\", \"source\": \"app\", \"message\": \"…\"}] (send events). "
      + "With a user token: GET /organizations, GET /projects.",
  },
  {
    id: "firebase", name: "Firebase", category: "developer",
    description: "Auth users, projects, Firestore and push notifications",
    website: "https://firebase.google.com", docs: "https://firebase.google.com/docs/reference/rest/auth", logo: { simpleIcons: "firebase" },
    baseUrl: "https://identitytoolkit.googleapis.com",
    allowedOrigins: ["https://securetoken.googleapis.com", "https://firebase.googleapis.com", "https://firestore.googleapis.com",
               "https://fcm.googleapis.com", "https://firebaseremoteconfig.googleapis.com", "https://firebasehosting.googleapis.com",
               "^https://[a-z0-9-]+(\\.[a-z0-9-]+)?\\.(firebaseio\\.com|firebasedatabase\\.app)$"],
    auth: { type: "query", name: "key" },
    fields: [{ id: "token", label: "Web API key", secret: true }],
    oauth: { provider: "google", baseUrl: "https://firebase.googleapis.com",
             scopes: ["https://www.googleapis.com/auth/firebase", "https://www.googleapis.com/auth/datastore",
                        "https://www.googleapis.com/auth/firebase.messaging", "https://www.googleapis.com/auth/firebase.database",
                        "https://www.googleapis.com/auth/userinfo.email"],
             test: { path: "/v1beta1/projects", query: { pageSize: 1 }, message: "Connected with Google: Firebase is accessible" },
             help: "APIs to enable in the Google Cloud project of the app: “Firebase Management API” (and, depending on "
               + "what you will use, “Cloud Firestore API”, “Firebase Cloud Messaging API” and “Identity Toolkit API”). Your "
               + "Google account needs access to the Firebase project." },
    keyUrl: "https://console.firebase.google.com/",
    help: "1) In the Firebase console open your project → the gear icon → “Project settings” → “General” tab. "
      + "2) Copy the “Web API Key”. 3) The key only covers the user authentication API (sign-up, "
      + "sign-in, password recovery, looking up an account) and does not work if the key is restricted to websites; "
      + "for projects, Firestore, push messages or managing users use “Continue with Google”.",
    test: { method: "POST", path: "/v1/accounts:lookup", body: { idToken: "test" }, acceptStatus: [400], validate: checkGoogleKey("Firebase"),
              message: "API key accepted" },
    examples: "With the key (identitytoolkit): POST /v1/accounts:signInWithPassword "
      + "{\"email\": \"…\", \"password\": \"…\", \"returnSecureToken\": true}, POST /v1/accounts:lookup {\"idToken\": \"…\"}, "
      + "POST /v1/accounts:sendOobCode {\"requestType\": \"PASSWORD_RESET\", \"email\": \"…\"}. "
      + "With Google (base firebase.googleapis.com): GET /v1beta1/projects, GET /v1beta1/projects/{p}/webApps, "
      + "GET https://firestore.googleapis.com/v1/projects/{p}/databases/(default)/documents/{collection}, "
      + "POST https://fcm.googleapis.com/v1/projects/{p}/messages:send, "
      + "GET https://identitytoolkit.googleapis.com/v1/projects/{p}/accounts:batchGet?maxResults=20.",
  },
  {
    id: "formcarry", name: "Formcarry", category: "productivity",
    description: "Form backend: forms, submissions and webhooks",
    website: "https://formcarry.com", docs: "https://formcarry.com/docs/api", logo: { favicon: "https://formcarry.com" },
    baseUrl: "https://api.formcarry.com/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key (fc_live_…)", secret: true }],
    keyUrl: "https://app.formcarry.com/api-keys",
    help: "1) Sign in to your Formcarry dashboard and open “API Keys”. 2) Click “Create key” and select the permissions: forms:read and "
      + "submissions:read for read-only access; forms:write and submissions:write if you also need to make changes. 3) Copy the key "
      + "(fc_live_…): it is shown only once.",
    test: { path: "/me", account: (d) => [d.teams?.[0]?.name, d.key?.name].filter(Boolean).join(" · ") },
    examples: "Examples: GET /forms?limit=25, GET /forms/{form_id}/submissions?limit=25, GET /forms/{form_id}/submissions/summary, "
      + "GET /forms/{form_id}/fields, GET /forms/{form_id}/webhooks, GET /me (key permissions).",
  },
  {
    id: "geekflare", name: "Geekflare", category: "ecommerce", description: "Scraping, screenshots, DNS, TLS and website diagnostics",
    website: "https://geekflare.com/api/", docs: "https://docs.geekflare.com", logo: { favicon: "https://geekflare.com" },
    baseUrl: "https://api.geekflare.com",
    auth: { type: "header", name: "x-api-key" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://dash.geekflare.com/",
    help: "1) Sign up at geekflare.com/api (the free plan includes credits) and sign in at dash.geekflare.com. 2) Copy "
      + "your API key from the dashboard. 3) Each successful call uses 1 to 10 credits depending on the endpoint; invalid "
      + "or unauthorized requests usually do not use credits.",
    // Geekflare has no free read endpoint: an empty request is sent (400 = the key is valid, no credits used).
    test: { method: "POST", path: "/up", body: {}, acceptStatus: [400, 422], message: "API key accepted" },
    examples: "All are POST with a JSON body and use credits: /up {\"url\": \"https://…\"} (is the site up?), "
      + "/webscraping {\"url\": \"https://…\", \"format\": [\"markdown\"]}, /screenshot {\"url\": \"https://…\"}, "
      + "/dnsrecord {\"url\": \"example.com\", \"types\": [\"A\", \"MX\"]}, /tlsscan {\"url\": \"example.com\"}, "
      + "/lighthouse {\"url\": \"https://…\"}, /ping {\"url\": \"example.com\"}, /search {\"query\": \"…\"}.",
  },
  {
    id: "getform", name: "Getform (Forminit)", category: "productivity",
    description: "Form backend (now Forminit): received submissions",
    website: "https://forminit.com", docs: "https://forminit.com/docs/", logo: { favicon: "https://forminit.com" },
    baseUrl: "https://api.forminit.com",
    auth: { type: "header", name: "X-API-Key" },
    fields: [{ id: "token", label: "API token (fi_…)", secret: true },
             { id: "form", label: "ID of one of your forms", format: "segment", example: "AbC123xyz",
               help: "It is the code in its submission URL (forminit.com/f/CODE); it is used to check the token." }],
    help: "1) Sign in to your Forminit account (formerly Getform) and open “Account” → “API Tokens”. 2) Click “Create Token” with "
      + "form read permission (forms:read) and copy the token (fi_…): it is shown only once. 3) Also enter the ID "
      + "of one of your forms; the same token can read the submissions of all the others.",
    // The API has a single read endpoint (submissions of a form): a real ID is needed to check the token.
    test: { path: "/v1/forms/{form}", query: { size: 1 }, message: "Token and form are correct",
              validate: (d) => {
                if (!d || typeof d !== "object" || d.success === false) {
                  throw new Error("Forminit did not return the form: check the token and the form ID");
                }
              } },
    examples: "Examples: GET /v1/forms/{formId}?page=1&size=30 (submissions of the form, 1 to 100 per page), "
      + "GET /v1/forms/{formId}?query=text&files=true&timezone=America/New_York. "
      + "New submissions are made with POST https://forminit.com/f/{formId}.",
  },
  {
    id: "gist", name: "GitHub Gist", category: "developer", description: "Code snippets and notes: create, read and edit gists",
    website: "https://gist.github.com", docs: "https://docs.github.com/rest/gists/gists", logo: { simpleIcons: "github" },
    baseUrl: "https://api.github.com",
    headers: { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "Personal token (gist scope)", secret: true }],
    oauth: { provider: GITHUB, scopes: ["gist", "read:user"] },
    keyUrl: "https://github.com/settings/tokens/new?scopes=gist&description=Conector",
    help: "1) Open the link below (or “Settings” → “Developer settings” → “Personal access tokens” → “Tokens (classic)” → "
      + "“Generate new token (classic)”). 2) Check that the “gist” permission is selected, choose an expiration and click “Generate "
      + "token”. 3) Copy the token (ghp_…): it is shown only once.",
    test: { path: "/user", account: (d) => d.login },
    examples: "Examples: GET /gists?per_page=20 (your gists), GET /gists/{id}, GET /gists/public, "
      + "POST /gists {\"description\": \"…\", \"public\": false, \"files\": {\"note.md\": {\"content\": \"…\"}}}, "
      + "PATCH /gists/{id}, DELETE /gists/{id}.",
  },
  {
    id: "gitea", name: "Gitea", category: "developer", description: "Gitea repositories, issues, pull requests and organizations",
    website: "https://about.gitea.com", docs: "https://docs.gitea.com/development/api-usage", logo: { simpleIcons: "gitea" },
    baseUrl: "{url}/api/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "Access token", secret: true },
             { id: "url", label: "Gitea URL", format: "url", default: "https://gitea.com",
               help: "Change it only if you use your own instance, e.g. https://git.example.com." }],
    oauth: { scopes: [], fields: ["url"], provider: { name: "Gitea", key: "gitea", redirect: "localhost",
      authorizeUrl: "{url}/login/oauth/authorize", tokenUrl: "{url}/login/oauth/access_token",
      help: "1) In Gitea click your avatar → “Settings” → “Applications” and, under “Manage OAuth2 Applications”, enter “Conector” "
        + "as the “Application Name”. 2) In “Redirect URIs” paste the redirect URI shown below, leave checked "
        + "“Confidential Client” and click “Create Application”. 3) Copy the “Client ID” and the “Client Secret” (shown only "
        + "once). The application is registered on one specific instance (gitea.com or your own): this one only works for the URL "
        + "you enter in “Gitea URL” when connecting." } },
    keyUrl: "https://gitea.com/user/settings/applications",
    help: "1) In Gitea click your avatar → “Settings” → “Applications”. 2) Under “Manage Access Tokens” enter a name, choose the "
      + "permissions by category (e.g. repository, issue and user, read or read and write) and click “Generate Token”. "
      + "3) Copy the token: it is shown only once. If you use your own instance, the link below points to gitea.com: open the "
      + "same menu on your server.",
    test: { path: "/user", account: (d) => d.login },
    examples: "Examples: GET /user/repos, GET /repos/search?q=…, GET /repos/{owner}/{repo}/issues?state=open, "
      + "GET /repos/{owner}/{repo}/pulls, POST /repos/{owner}/{repo}/issues {\"title\": \"…\", \"body\": \"…\"}, GET /orgs/{org}/repos.",
  },
  {
    id: "globalping", name: "Globalping", category: "developer",
    description: "Ping, traceroute, DNS, HTTP and MTR from probes worldwide",
    website: "https://globalping.io", docs: "https://globalping.io/docs/api.globalping.io", logo: { favicon: "https://globalping.io" },
    baseUrl: "https://api.globalping.io/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API token", secret: true, optional: true,
               help: "Optional: without a token the API works with a per-IP limit; with a token the limit is that of your account." }],
    keyUrl: "https://dash.globalping.io/tokens",
    help: "The API works without a key (with a per-IP limit on measurements): you can leave the field empty and click “Connect”. "
      + "1) To raise the limit, sign in to dash.globalping.io with your account. 2) Open “Tokens” and create an API token. "
      + "3) Paste it here.",
    test: { path: "/limits", message: (d) => {
      const c = d?.rateLimit?.measurements?.create;
      const origin = c?.type === "user" ? "your account limit" : "per-IP limit";
      return c ? `${c.remaining} of ${c.limit} measurements left (${origin})` : "API available";
    } },
    examples: "Examples: POST /measurements {\"type\": \"ping\", \"target\": \"example.com\", \"locations\": [{\"magic\": \"Germany\"}], "
      + "\"limit\": 3} (types: ping, traceroute, dns, mtr, http; returns an id), GET /measurements/{id} (result; repeat until "
      + "status is “finished”), GET /probes (connected probes), GET /limits.",
  },
  {
    id: "googleaddressvalidation", name: "Google Address Validation", category: "data",
    description: "Validate, standardize and geocode postal addresses",
    website: "https://mapsplatform.google.com/maps-products/address-validation/",
    docs: "https://developers.google.com/maps/documentation/address-validation", logo: { simpleIcons: "googlemaps" },
    baseUrl: "https://addressvalidation.googleapis.com",
    auth: { type: "query", name: "key" },
    fields: [{ id: "token", label: "Google Maps Platform API key", secret: true }],
    keyUrl: "https://console.cloud.google.com/apis/credentials",
    help: "1) In Google Cloud Console choose or create a project with billing enabled. 2) Under “APIs & Services” → "
      + "“Library” enable “Address Validation API”. 3) Under “Credentials” → “Create credentials” → “API key” create the "
      + "key and restrict it to that API. Each validation is billed at the Google Maps Platform rate (there is a free monthly "
      + "allowance).",
    // Each validation is paid: an empty request is sent (400 = the key is valid and nothing is billed).
    test: { method: "POST", path: "/v1:validateAddress", body: {}, acceptStatus: [400], validate: checkGoogleKey("Google Address Validation"),
              message: "API key accepted" },
    examples: "Examples (each validation is billed): POST /v1:validateAddress {\"address\": {\"regionCode\": \"US\", "
      + "\"postalCode\": \"94043\", \"locality\": \"Mountain View\", \"addressLines\": [\"1600 Amphitheatre Pkwy\"]}}. The response "
      + "includes the verdict, the standardized address and the geocode.",
  },
  {
    id: "gtmetrix", name: "GTmetrix", category: "ecommerce", description: "Web speed and performance tests with reports",
    website: "https://gtmetrix.com", docs: "https://gtmetrix.com/api/docs/2.0/", logo: { favicon: "https://gtmetrix.com" },
    baseUrl: "https://gtmetrix.com/api/2.0",
    headers: { Accept: "application/vnd.api+json" },
    auth: { type: "basic", usernameField: "token", fixedPassword: "" },
    fields: [{ id: "token", label: "API key", secret: true }],
    keyUrl: "https://gtmetrix.com/api/",
    help: "1) Sign in at gtmetrix.com (an account is required; the free plan includes some API credits). 2) Open "
      + "gtmetrix.com/api and click “Generate API Key” (it is also under “Account” → “API”). 3) Copy the key. Each test uses "
      + "API credits; checking the account status does not.",
    test: { path: "/status", message: (d) => (d?.data?.attributes
      ? `Account ${d.data.attributes.account_type}: ${d.data.attributes.api_credits} API credits` : "API key is valid") },
    examples: "Examples: GET /status (credits), GET /locations, GET /browsers, "
      + "POST /tests {\"data\": {\"type\": \"test\", \"attributes\": {\"url\": \"https://…\"}}} (uses credits; add the header "
      + "Content-Type: application/vnd.api+json), GET /tests/{id} (status and report link), GET /reports/{id}.",
  },
  {
    id: "hackernews", name: "Hacker News", category: "media", description: "Hacker News stories, comments and users",
    website: "https://news.ycombinator.com", docs: "https://github.com/HackerNews/API", logo: { simpleIcons: "ycombinator" },
    baseUrl: "https://hacker-news.firebaseio.com/v0",
    allowedOrigins: ["https://hn.algolia.com"],
    auth: { type: "none" }, fields: [],
    help: "Public Hacker News (Y Combinator) API: it needs no credentials. Click “Enable” so agents can query it. "
      + "Paths carry the .json extension and lists return only IDs; the front page tool "
      + "already includes the titles.",
    test: { path: "/maxitem.json", message: (d) => `Service available (latest item: ${d})` },
    examples: "Examples: GET /topstories.json (also new, best, ask, show, job), GET /item/{id}.json, GET /user/{username}.json, "
      + "GET /maxitem.json, GET /updates.json; search with Algolia: GET https://hn.algolia.com/api/v1/search?query=…&tags=story.",
    tools: [
      { name: "hackernews_front_page", title: "Hacker News: front page stories", annotations: { readOnlyHint: true },
        description: "Returns the first stories of a Hacker News list with title, link, points, comments and author.",
        schema: { list: z.enum(["top", "new", "best", "ask", "show", "job"]).default("top"),
                   max: z.number().int().min(1).max(30).default(10) },
        async run({ list, max }, p) {
          const ids = ensureOk(await p({ path: `/${list}stories.json` }), "Hacker News").slice(0, max);
          return Promise.all(ids.map(async (id) => {
            const h = ensureOk(await p({ path: `/item/${id}.json` }), "Hacker News") || {};
            return { id, title: h.title, url: h.url || `https://news.ycombinator.com/item?id=${id}`, points: h.score,
                     comments: h.descendants, author: h.by, date: h.time ? new Date(h.time * 1000).toISOString() : null };
          }));
        } },
    ],
  },
  {
    id: "hackerrankwork", name: "HackerRank Work", category: "hr",
    description: "Technical assessments: tests, candidates, interviews, teams",
    website: "https://www.hackerrank.com/work", docs: "https://www.hackerrank.com/work/apidocs", logo: { simpleIcons: "hackerrank" },
    baseUrl: "https://www.hackerrank.com/x/api/v3",
    auth: { type: "basic", usernameField: "token", fixedPassword: "" },
    fields: [{ id: "token", label: "API token", secret: true }],
    help: "1) Sign in to HackerRank for Work (the API requires the Enterprise plan and a recruiter-type user with "
      + "administrator permissions). 2) Click your avatar → “Settings” → “API” (on some accounts “API Access”) → “New Token”. 3) Give it a "
      + "label, generate the token and copy it: it is shown only once. Do not use it for ATS integrations such as Greenhouse or Lever.",
    test: { path: "/tests", query: { limit: 1 }, message: "API token is valid" },
    examples: "Examples: GET /tests?limit=20&offset=0, GET /tests/{id}, GET /tests/{id}/candidates?limit=20, "
      + "POST /tests/{id}/candidates (invite a candidate), GET /users, GET /teams.",
  },
  {
    id: "harness", name: "Harness", category: "developer",
    description: "Continuous delivery: pipelines, executions, services, environments",
    website: "https://www.harness.io", docs: "https://apidocs.harness.io", logo: { image: "https://github.com/harness.png" },
    baseUrl: "{url}",
    // The account ID comes from the token itself and is added automatically (accountIdentifier in the query and Harness-Account in the header).
    auth: { type: "custom", apply: (cred) => {
      const account = harnessAccount(cred.token);
      return { headers: { "x-api-key": cred.token, ...(account ? { "Harness-Account": account } : {}) },
               query: account ? { accountIdentifier: account } : {} };
    } },
    fields: [{ id: "token", label: "Access token (pat.… or sat.…)", secret: true },
             { id: "url", label: "Harness address", format: "url", default: "https://app.harness.io",
               help: "Change it only if your account is on another cluster (e.g. https://app.harness.io/gratis) or if Harness is "
                 + "self-hosted." }],
    help: "1) In Harness open your profile (bottom left) → “My Profile” → “+ API Key” and create a key (or use a service account in "
      + "“Account Settings” → “Access Control” → “Service Accounts”). 2) Inside the key click “+ Token”, give it a "
      + "name and an expiration and copy the token (pat.… or sat.…): it is shown only once. 3) You do not need to enter the account ID: "
      + "it is read from the token itself.",
    test: { path: "/ng/api/projects", query: { pageSize: 1 },
              message: (d) => (d?.data?.totalItems != null ? `Accessible projects: ${d.data.totalItems}` : "Access token is valid") },
    examples: "Examples (accountIdentifier is added automatically): GET /ng/api/projects?pageSize=20, GET /ng/api/organizations, "
      + "POST /pipeline/api/pipelines/list?orgIdentifier=default&projectIdentifier=…&page=0&size=20 {\"filterType\": \"PipelineSetup\"}.",
  },
  {
    id: "hashnode", name: "Hashnode", category: "ecommerce", description: "Developer blog: publications, posts and comments",
    website: "https://hashnode.com", docs: "https://hashnode.com/announcements/graphql-api", logo: { simpleIcons: "hashnode" },
    baseUrl: "https://gql.hashnode.com", graphql: { path: "/" },
    auth: { type: "header", name: "Authorization" },
    fields: [{ id: "token", label: "Personal access token", secret: true }],
    keyUrl: "https://hashnode.com/settings/developer",
    help: "1) Sign in to Hashnode and open “Settings” → “Developer” (hashnode.com/settings/developer). 2) Click “Generate New Token” "
      + "and copy the personal token. 3) Since May 13, 2026 the Hashnode API requires the Pro plan on the publication: without it "
      + "requests are redirected to a notice instead of returning data.",
    test: { method: "POST", path: "/", body: { query: "{ me { id username name } }" }, account: (d) => d.data?.me?.username,
              validate: (d) => {
                if (!d?.data?.me) {
                  throw new Error("Hashnode did not return your account: check the token and that your publication has the Pro plan "
                    + "(the API has required a paid plan since May 2026)");
                }
              } },
    examples: "The API is GraphQL (POST /): use hashnode_graphql, e.g. "
      + "{ me { username publications(first: 5) { edges { node { id title url } } } } } or "
      + "{ publication(host: \"blog.example.com\") { posts(first: 10) { edges { node { title url publishedAt } } } } }.",
  },
  {
    id: "honeybadger", name: "Honeybadger", category: "developer",
    description: "Errors, faults, deploys and projects of your applications",
    website: "https://www.honeybadger.io", docs: "https://docs.honeybadger.io/api/", logo: { simpleIcons: "honeybadger" },
    baseUrl: "https://app.honeybadger.io/v2",
    auth: { type: "basic", usernameField: "token", fixedPassword: "" },
    fields: [{ id: "token", label: "Personal authentication token", secret: true }],
    keyUrl: "https://app.honeybadger.io/users/edit",
    help: "1) Sign in to Honeybadger and open your profile (app.honeybadger.io/users/edit). 2) On the “Authentication” tab copy your "
      + "“Personal Auth Token”. 3) It is not a project API key (that one only sends errors): the data API uses "
      + "the personal token, with the permissions of your user.",
    test: { path: "/projects", message: (d) => (Array.isArray(d?.results) ? `Visible projects: ${d.results.length}` : "Token is valid") },
    examples: "Examples: GET /projects, GET /projects/{id}/faults?limit=20, GET /projects/{id}/faults/{fault_id}/notices, "
      + "GET /projects/{id}/deploys. Lists are paginated: follow the “next” link in the response.",
  },
  {
    id: "hookdeck", name: "Hookdeck", category: "developer",
    description: "Webhooks and events: connections, sources, destinations, retries",
    website: "https://hookdeck.com", docs: "https://hookdeck.com/docs/api", logo: { image: "https://github.com/hookdeck.png" },
    baseUrl: "https://api.hookdeck.com/2025-07-01",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "Project API key", secret: true }],
    keyUrl: "https://dashboard.hookdeck.com/settings/project/secrets",
    help: "1) Sign in to the Hookdeck dashboard (dashboard.hookdeck.com) and choose the project. 2) Open “Settings” → “Secrets” and copy "
      + "the “API Key” of the project. 3) The key gives access to the connections, sources, destinations and events of that project.",
    test: { path: "/sources", query: { limit: 1 }, message: "API key is valid" },
    examples: "Examples: GET /connections?limit=25, GET /sources, GET /destinations, GET /requests?limit=10, GET /events?status=FAILED, "
      + "POST /events/{id}/retry. Cursor pagination: parameters limit, next and prev (maximum 250).",
  },
  {
    id: "hostinger", name: "Hostinger", category: "ecommerce", description: "Hostinger hosting, domains, DNS, VPS and billing",
    website: "https://www.hostinger.com", docs: "https://docs.hostinger.com/api-reference/overview", logo: { simpleIcons: "hostinger" },
    baseUrl: "https://developers.hostinger.com",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API token", secret: true }],
    keyUrl: "https://hpanel.hostinger.com/profile/api",
    help: "1) Sign in to hPanel (hpanel.hostinger.com) and open your profile → “API” (hpanel.hostinger.com/profile/api). 2) Create a "
      + "new token, set an expiration if you want and copy it: it is shown only once. 3) The token has the permissions of your user "
      + "(hosting, domains, DNS, VPS and billing). Limit: 90 requests per minute.",
    test: { path: "/api/billing/v1/subscriptions",
              message: (d) => (Array.isArray(d) ? `Subscriptions on the account: ${d.length}` : "API token is valid") },
    examples: "Examples: GET /api/vps/v1/virtual-machines, GET /api/domains/v1/portfolio, GET /api/dns/v1/zones/{domain}, "
      + "GET /api/hosting/v1/websites, GET /api/billing/v1/subscriptions, GET /api/billing/v1/catalog.",
  },
  {
    id: "ilert", name: "iLert", category: "developer", description: "Alerts, on-call, escalations, incidents and status pages",
    website: "https://www.ilert.com", docs: "https://docs.ilert.com/developer-docs/rest-api/api-reference/introduction",
    logo: { image: "https://github.com/iLert.png" },
    baseUrl: "https://api.ilert.com/api",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true }],
    help: "1) Sign in to your iLert account (example.ilert.com). 2) Open your profile (avatar) → “API keys” (on some accounts "
      + "it is under “Settings” → “API keys”) and create a new key. 3) Copy the key: it is shown only once and has the permissions "
      + "of your user.",
    test: { path: "/users/current", account: (d) => d.email },
    examples: "Examples: GET /users/current, GET /alerts?states=PENDING&max-results=20, GET /alerts/count, GET /alert-sources, "
      + "GET /on-calls, GET /schedules, GET /incidents, GET /status-pages. Pagination: start-index and max-results.",
  },
];
