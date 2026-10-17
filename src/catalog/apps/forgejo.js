// Forgejo is a self-hosted Git forge (a fork of Gitea, with the same API shape) and the software Codeberg runs on: its
// REST API lives on the same address as the web interface under /api/v1 and authenticates with a personal access token,
// which it accepts as “Authorization: Bearer <token>” as well as the older “token <token>”.
export default [
  {
    id: "forgejo", name: "Forgejo", category: "developer",
    description: "Repositories, issues and pull requests on Codeberg or your Forgejo",
    website: "https://forgejo.org", docs: "https://forgejo.org/docs/latest/user/api/usage/",
    logo: { simpleIcons: "forgejo" },
    baseUrl: "{url}/api/v1",
    auth: { type: "bearer" },
    fields: [{ id: "url", label: "Forgejo URL", format: "url", default: "https://codeberg.org", example: "https://example.invalid",
               help: "Leave https://codeberg.org for Codeberg, or enter the address you open your Forgejo at, without /api/v1 "
                 + "(e.g. https://git.example.com). It must start with https://, except http://localhost:3000 when Forgejo "
                 + "runs on this same machine, or an http:// address on your local network when Conector runs with "
                 + "CONECTOR_ALLOW_PRIVATE_HTTP=1." },
             { id: "token", label: "Access token", secret: true }],
    // Codeberg is the default instance; on another instance the same page is <your address>/user/settings/applications.
    keyUrl: "https://codeberg.org/user/settings/applications",
    help: "1) In Forgejo click your avatar (top right) → “Settings” → “Applications”. 2) Under “Access tokens” click “New "
      + "access token” and enter a “Token name” (e.g. Conector). 3) Under “Repository and organization access” leave “All” "
      + "(or “Public only”); a token for “Specific repositories” can't read your account, which the connection test needs. "
      + "4) Under “Select permissions” choose “Read” or “Read and write” for what agents may use (e.g. repository, issue, "
      + "organization), with at least “Read” for “user”, and click “Generate token”. 5) Copy the token: it is shown only "
      + "once. The link below opens Codeberg: on your own instance open the same menu.",
    // A wrong address answers 404 (e.g. one ending in /api/v1 or a repository page) or 200 with a web page.
    test: { path: "/user", acceptStatus: [404], account: (d) => d.login,
            validate: (d) => {
              if (typeof d?.login !== "string" || typeof d?.id !== "number") {
                throw new Error("Forgejo: this URL does not answer like the Forgejo API (use the address you open Forgejo "
                  + "at, e.g. https://codeberg.org, without /api/v1)");
              }
            } },
    examples: "Examples: GET /user (your account), GET /user/repos, GET /repos/search?q=… (the list is in “data”), "
      + "GET /repos/{owner}/{repo}, GET /repos/{owner}/{repo}/issues?type=issues&state=open (without type=issues it also "
      + "lists pull requests), GET /repos/{owner}/{repo}/pulls?state=open, GET /repos/issues/search?type=issues&state=open"
      + "&created=true (issues you opened in any repository; assigned=true or mentioned=true for others, type=pulls for "
      + "pull requests; without these filters it searches every public repository of the instance), "
      + "POST /repos/{owner}/{repo}/issues {\"title\": \"…\", \"body\": \"…\"}, "
      + "POST /repos/{owner}/{repo}/issues/{index}/comments {\"body\": \"…\"}, GET /orgs/{org}/repos, GET /users/{username}.",
  },
];
