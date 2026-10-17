// Home Assistant is self-hosted home automation: its REST API (on the same address as the web interface) uses a
// long-lived access token created in the user's profile.
import { z } from "zod";
import { ensureOk } from "../define.js";

const DOMAIN = z.string().regex(/^[a-z0-9_]+$/, "Lowercase letters, digits and _, e.g. light");
const ENTITY = z.string().regex(/^[a-z0-9_]+\.[a-z0-9_]+$/, "An entity ID, e.g. light.kitchen");
const entities = z.union([ENTITY, z.array(ENTITY).min(1)]);

// States are large (every attribute of every entity): the lists only keep what identifies each entity and its value.
const brief = (s) => ({ entity_id: s.entity_id, state: s.state, name: s.attributes?.friendly_name,
                        unit: s.attributes?.unit_of_measurement, last_changed: s.last_changed });

export default [
  {
    id: "homeassistant", name: "Home Assistant", category: "automation",
    description: "Entity states, history and actions of your Home Assistant",
    website: "https://www.home-assistant.io", docs: "https://contributors.home-assistant.io/core/internals/rest-api/",
    logo: { simpleIcons: "homeassistant" },
    baseUrl: "{url}/api",
    auth: { type: "bearer" },
    fields: [{ id: "url", label: "Home Assistant URL", format: "url", placeholder: "https://home.example.com",
               help: "The address you open Home Assistant at, with its port and without /api (e.g. https://home.example.com:8123 "
                 + "or your Home Assistant Cloud address, https://….ui.nabu.casa). It must start with https://, except "
                 + "http://localhost:8123 when Home Assistant runs on this same machine, or an http:// address on your "
                 + "local network (e.g. http://homeassistant.local:8123) when Conector runs with CONECTOR_ALLOW_PRIVATE_HTTP=1." },
             { id: "token", label: "Long-lived access token", secret: true }],
    // My Home Assistant asks for the address of your instance once and opens its “Security” tab.
    keyUrl: "https://my.home-assistant.io/redirect/profile_security/",
    help: "1) In Home Assistant click your name at the bottom of the sidebar to open your profile, then open the “Security” tab. "
      + "2) Under “Long-lived access tokens” click “Create token”, give it a name (e.g. Conector) and confirm. 3) Copy the token "
      + "(it is not shown again) and paste it here. The token acts as your user: agents can do what that user can, and a few "
      + "endpoints (templates, events, the error log) need an administrator.",
    // GET /api/ (with the trailing slash) is the API's health check: {"message": "API running."}.
    test: { path: "/", message: "Access token is valid",
            validate: (d) => {
              if (d?.message !== "API running.") throw new Error("Home Assistant: this URL does not answer like the Home Assistant API");
            } },
    examples: "Examples: GET /states, GET /states/{entity_id}, GET /services (every action and its fields: very long), "
      + "POST /services/light/turn_on {\"entity_id\": \"light.kitchen\", \"brightness_pct\": 50} (add ?return_response for "
      + "actions that return data, e.g. weather.get_forecasts), GET /history/period/{ISO start}?filter_entity_id=sensor.a,sensor.b"
      + "&minimal_response&no_attributes, GET /logbook/{ISO start}?entity=…, GET /calendars/{entity_id}?start=…&end=…, "
      + "POST /template {\"template\": \"{{ states('sensor.temperature') }}\"} (administrators; answers plain text), GET /config.",
    tools: [
      { name: "homeassistant_states", title: "Home Assistant: entity states", annotations: { readOnlyHint: true },
        description: "Lists entities with their current state, friendly name, unit and last change, sorted by entity ID. "
          + "Filter by domain or text to keep the list short; homeassistant_entity returns every attribute of one entity.",
        schema: { domain: z.string().optional().describe("Only these domains, e.g. light, or several separated by commas: "
                    + "light,switch,climate"),
                  search: z.string().optional().describe("Text that the entity ID or the friendly name must contain"),
                  max: z.number().int().min(1).max(1000).default(200) },
        async run({ domain, search, max }, p) {
          const domains = domain ? domain.split(",").map((d) => d.trim()).filter(Boolean) : [];
          const text = search?.trim().toLowerCase();
          const all = ensureOk(await p({ path: "/states" }), "Home Assistant");
          const found = all.filter((s) => !domains.length || domains.includes(s.entity_id.split(".")[0]))
            .filter((s) => !text || `${s.entity_id} ${s.attributes?.friendly_name || ""}`.toLowerCase().includes(text))
            .sort((a, b) => a.entity_id.localeCompare(b.entity_id));
          return { total: found.length, entities: found.slice(0, max).map(brief) };
        } },
      { name: "homeassistant_entity", title: "Home Assistant: one entity", annotations: { readOnlyHint: true },
        description: "Returns the current state of one entity with all its attributes (brightness, temperature, options, "
          + "supported features…).",
        schema: { entity_id: ENTITY.describe("Entity ID, e.g. light.kitchen or sensor.outdoor_temperature") },
        async run({ entity_id }, p) {
          const s = ensureOk(await p({ path: `/states/${encodeURIComponent(entity_id)}` }), "Home Assistant");
          return { entity_id: s.entity_id, state: s.state, attributes: s.attributes, last_changed: s.last_changed,
                   last_updated: s.last_updated };
        } },
      { name: "homeassistant_call_service", title: "Home Assistant: call an action",
        annotations: { destructiveHint: true, openWorldHint: true },
        description: "Calls an action (service), e.g. light.turn_on, switch.toggle, scene.turn_on, script.turn_on, "
          + "climate.set_temperature or notify.notify, and returns the states it changed. The attributes of the entity "
          + "(homeassistant_entity) show the modes and features it supports.",
        schema: { domain: DOMAIN.describe("Domain of the action, e.g. light"),
                  service: DOMAIN.describe("Action, e.g. turn_on"),
                  entity_id: entities.optional().describe("Target entity or entities, e.g. light.kitchen"),
                  data: z.record(z.string(), z.any()).optional().describe("Other fields of the action, e.g. "
                    + "{\"brightness_pct\": 50}, {\"temperature\": 21} or {\"area_id\": \"kitchen\"}"),
                  return_response: z.boolean().default(false).describe("Required by actions that return data (e.g. "
                    + "weather.get_forecasts, calendar.get_events, todo.get_items); the others reject it") },
        async run({ domain, service, entity_id, data, return_response }, p) {
          const d = ensureOk(await p({ method: "POST", path: `/services/${encodeURIComponent(domain)}/${encodeURIComponent(service)}`,
            query: return_response ? { return_response: 1 } : undefined,
            body: { ...data, ...(entity_id ? { entity_id } : {}) } }), "Home Assistant");
          const changed = (return_response ? d?.changed_states : d) || [];
          return { changed: changed.map(brief), ...(return_response ? { response: d?.service_response ?? null } : {}) };
        } },
      { name: "homeassistant_history", title: "Home Assistant: state history", annotations: { readOnlyHint: true },
        description: "State changes of one or more entities over a period (by default the last 24 hours), most recent "
          + "last. Each entity lists up to “max” changes and the total in the period.",
        schema: { entity_id: entities.describe("Entity or entities, e.g. sensor.outdoor_temperature"),
                  hours: z.number().int().min(1).max(744).default(24).describe("Length of the period, ending now"),
                  start: z.string().optional().describe("Start instead of “hours”, ISO 8601, e.g. 2026-10-01T00:00:00+02:00"),
                  end: z.string().optional().describe("End of the period (with “start”; by default one day after it)"),
                  max: z.number().int().min(1).max(1000).default(100).describe("Most recent changes kept per entity") },
        async run({ entity_id, hours, start, end, max }, p) {
          const from = start || new Date(Date.now() - hours * 3_600_000).toISOString();
          // minimal_response and no_attributes are flags: Home Assistant only checks that they are present.
          const d = ensureOk(await p({ path: `/history/period/${encodeURIComponent(from)}`, query: {
            filter_entity_id: [].concat(entity_id).join(","), end_time: start ? end : new Date().toISOString(),
            minimal_response: 1, no_attributes: 1 } }), "Home Assistant");
          // One list per entity; with minimal_response only the first item carries the entity ID.
          return (d || []).map((list) => ({ entity_id: list[0]?.entity_id, total: list.length,
            changes: list.slice(-max).map((s) => ({ state: s.state, at: s.last_changed })) }));
        } },
    ],
  },
];
