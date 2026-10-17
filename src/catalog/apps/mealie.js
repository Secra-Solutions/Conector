// Mealie is a self-hosted recipe manager and meal planner: its REST API lives on the same address as the web interface
// under /api and authenticates with a long-lived API token created in the user profile, sent as a Bearer token.
// GET requests to unknown paths under /api answer 200 with the web app's HTML, so the connection test checks the body.
export default [
  {
    id: "mealie", name: "Mealie", category: "productivity",
    description: "Recipes, meal plans and shopping lists of your Mealie",
    website: "https://mealie.io", docs: "https://docs.mealie.io/documentation/getting-started/api-usage/",
    logo: { simpleIcons: "mealie" },
    baseUrl: "{url}/api",
    auth: { type: "bearer" },
    fields: [{ id: "url", label: "Mealie URL", format: "url", default: "http://localhost:9925", example: "https://example.invalid",
               help: "The address you open Mealie at, with its port and without /api (e.g. https://mealie.example.com). It "
                 + "must start with https://, except http://localhost:9925 when Mealie runs on this same machine, or an "
                 + "http:// address on your local network when Conector runs with CONECTOR_ALLOW_PRIVATE_HTTP=1." },
             { id: "token", label: "API token", secret: true }],
    keyUrl: "https://docs.mealie.io/documentation/getting-started/api-usage/",
    help: "1) In Mealie click your name at the top of the left menu to open your profile. 2) Click “Manage Your API "
      + "Tokens” in the “API Tokens” card. If there is no such card, open “Manage User Profile” and tick “Show advanced "
      + "features (API Keys, Webhooks, and Data Management)” first. 3) Type a “Token Name” (e.g. Conector) and click "
      + "“Generate”. 4) Copy the token: it is shown only once. 5) Paste it here, together with your Mealie address "
      + "(without /api). The token acts as your user: agents can read and change what you can. “Delete” next to the "
      + "token on the same page revokes it.",
    test: { path: "/users/self", account: (d) => d.email || d.username,
            // A wrong address (e.g. one ending in /api) gets the web app's HTML page with a 200.
            validate: (d) => {
              if (!d?.id || !d?.groupId) {
                throw new Error("Mealie: this URL does not answer like the Mealie API (use the address you open Mealie at, "
                  + "without /api)");
              }
            } },
    examples: "Mealie 2 or later. Lists are paginated (?page=1&perPage=50; the results are in “items”); a GET to a path "
      + "that does not exist answers with the HTML of the web app instead of a 404. Examples: "
      + "GET /users/self, GET /recipes?search=pasta&perPage=20, GET /recipes/{slug} (ingredients and steps), "
      + "POST /recipes {\"name\":\"…\"} (returns the new slug), PATCH /recipes/{slug} {\"description\":\"…\","
      + "\"recipeIngredient\":[{\"note\":\"200 g spaghetti\"}],\"recipeInstructions\":[{\"text\":\"…\"}]}, "
      + "POST /recipes/create/url {\"url\":\"https://…\"} (import a recipe from a website), "
      + "GET /households/mealplans?start_date=2026-01-01&end_date=2026-01-31, GET /households/mealplans/today, "
      + "POST /households/mealplans {\"date\":\"2026-01-15\",\"entryType\":\"dinner\",\"recipeId\":\"…\"} (entryType: "
      + "breakfast, lunch, dinner, side, snack, drink or dessert), GET /households/shopping/lists, "
      + "GET /households/shopping/lists/{id} (its “listItems”), POST /households/shopping/lists {\"name\":\"…\"}, "
      + "POST /households/shopping/items {\"shoppingListId\":\"…\",\"note\":\"onions\",\"quantity\":2}, "
      + "POST /households/shopping/lists/{id}/recipe/{recipeId} (add a recipe's ingredients to the list).",
  },
];
