// Mealie is a self-hosted recipe manager and meal planner. API uses Bearer token.
export default [
  {
    id: "mealie", name: "Mealie", category: "productivity",
    description: "Recipes, meal plans and shopping lists on your Mealie instance",
    website: "https://mealie.io", docs: "https://docs.mealie.io/documentation/getting-started/api-usage/",
    logo: { simpleIcons: "mealie" },
    baseUrl: "{url}/api",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "API key", secret: true },
             { id: "url", label: "Mealie URL", format: "url", default: "https://mealie.example.org",
               help: "The address of your Mealie instance. It must start with https://, except "
                 + "http://localhost:9000 when Mealie runs on this same machine, or an http:// address on your local "
                 + "network when Conector runs with CONECTOR_ALLOW_PRIVATE_HTTP=1." }],
    keyUrl: "https://docs.mealie.io/documentation/getting-started/api-usage/",
    help: "1) In Mealie click your avatar → “Profile”. 2) Scroll to “API Token” and click “Generate new token”. " +
      + "3) Copy the token: it is shown only once. If you use your own instance, the link below points " +
      + "to mealie.io: open the same menu on your server.",
    test: { path: "/users/self", account: (d) => d?.username ?? d?.email ?? d?.full_name },
    examples: "Examples: GET /users/self (your account), GET /recipes (your recipes), GET /recipes/search?q=pasta " +
      + "(search recipes), POST /recipes (add a recipe), GET /meal-plans (meal plans), GET /shopping-lists (shopping lists).",
  },
];