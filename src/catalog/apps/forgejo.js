// Forgejo is a fork of Gitea: same API shape, so the definition mirrors the gitea app.
// Forgejo accepts both “Authorization: token <token>” and “Authorization: Bearer <token>”;
// bearer is used here because both work and it matches the gitea definition.
export default [
  {
    id: "forgejo", name: "Forgejo", category: "developer",
    description: "Forgejo repositories, issues, pull requests and organizations",
    website: "https://forgejo.org", docs: "https://forgejo.org/docs/latest/user/api-usage/",
    logo: { simpleIcons: "forgejo" },
    baseUrl: "{url}/api/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "Access token", secret: true },
             { id: "url", label: "Forgejo URL", format: "url", default: "https://codeberg.org",
               help: "The address of your Forgejo instance, e.g. https://codeberg.org. It must start with https://, except "
                 + "http://localhost:3000 when Forgejo runs on this same machine, or an http:// address on your local "
                 + "network when Conector runs with CONECTOR_ALLOW_PRIVATE_HTTP=1." }],
    keyUrl: "https://forgejo.org/user/settings/applications",
    help: "1) In Forgejo click your avatar → “Settings” → “Applications”. 2) Under “Manage Access Tokens” enter a name, choose "
      + "the permissions by category (e.g. repository, issue and user, read or read and write) and click “Generate Token”. "
      + "3) Copy the token: it is shown only once. If you use your own instance, the link below points to forgejo.org: open "
      + "the same menu on your server.",
    test: { path: "/user", account: (d) => d?.login ?? d?.username ?? d?.email },
    examples: "Examples: GET /user (your account), GET /user/repos (your repositories), GET /repos/{owner}/{repo} (a repo), "
      + "GET /issues (issues), GET /pulls (pull requests), GET /users/{username} (a user).",
  },
];