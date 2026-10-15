// Public services without credentials (auth type "none", no fields): just click “Enable” in the panel.
import { z } from "zod";
import { ensureOk } from "../define.js";

const EU_COUNTRIES = new Set(["AT", "BE", "BG", "CY", "CZ", "DE", "DK", "EE", "EL", "ES", "FI", "FR", "HR", "HU", "IE", "IT", "LT", "LU", "LV",
  "MT", "NL", "PL", "PT", "RO", "SE", "SI", "SK", "XI"]);

// ECB SDMX-JSON → [{ currency, date, value }]
function ecbRates(d) {
  const series = d?.structure?.dimensions?.series || [];
  const dates = d?.structure?.dimensions?.observation?.[0]?.values || [];
  const currencyIndex = series.findIndex((x) => x.id === "CURRENCY");
  return Object.entries(d?.dataSets?.[0]?.series || {}).flatMap(([key, seriesData]) => {
    const currency = series[currencyIndex]?.values?.[Number(key.split(":")[currencyIndex])]?.id;
    return Object.entries(seriesData.observations || {}).map(([i, v]) => ({ currency, date: dates[Number(i)]?.id, value: v[0] }));
  });
}

export default [
  {
    id: "vies", name: "VIES (EU VAT numbers)", category: "finance", description: "Check EU VAT numbers in VIES",
    website: "https://ec.europa.eu/taxation_customs/vies/", docs: "https://ec.europa.eu/taxation_customs/vies/#/technical-information",
    logo: { favicon: "https://ec.europa.eu" },
    baseUrl: "https://ec.europa.eu/taxation_customs/vies/rest-api",
    auth: { type: "none" }, fields: [],
    help: "Public service of the European Commission: it needs no credentials. Click “Enable” so agents can query it. "
      + "Use it to check that a customer or supplier in another EU country is registered for intra-EU trade before invoicing them without VAT.",
    test: { path: "/check-status", message: (d) => `Service available: ${(d.countries || []).filter((p) => p.availability === "Available").length} `
      + `of ${(d.countries || []).length} countries respond` },
    examples: "Examples: GET /ms/{country}/vat/{number} (e.g. /ms/FR/vat/12345678901), POST /check-vat-number {\"countryCode\": \"DE\", "
      + "\"vatNumber\": \"123456789\"}, GET /check-status (availability per country). Greece uses the code EL.",
    tools: [
      { name: "vies_check", title: "VIES: check a VAT number", annotations: { readOnlyHint: true },
        description: "Checks whether an EU VAT number is valid in VIES (registered in the intra-EU operators register) and returns "
          + "the registered name and address when the country provides them.",
        schema: { vat_number: z.string().describe("VAT number with country prefix (DE123456789, FR12345678901…) or without it if you specify the country"),
                   country: z.string().length(2).optional().describe("Country code if the VAT number has no prefix (DE, FR, IT…; Greece: EL)") },
        async run({ vat_number, country }, p) {
          const normalized = vat_number.toUpperCase().replace(/[^A-Z0-9]/g, "");
          const prefix = EU_COUNTRIES.has(normalized.slice(0, 2)) ? normalized.slice(0, 2) : null;
          const cc = (country || prefix || "").toUpperCase();
          if (!EU_COUNTRIES.has(cc)) throw new Error(`VIES needs an EU country code (a prefix such as DE123456789, or the country parameter); got "${cc}"`);
          const number = prefix === cc ? normalized.slice(2) : normalized;
          const d = ensureOk(await p({ path: `/ms/${cc}/vat/${encodeURIComponent(number)}` }), "VIES");
          const clean = (v) => (v && v !== "---" ? v : null);
          return { vat_number: `${cc}${number}`, valid: Boolean(d.isValid), name: clean(d.name), address: clean(d.address),
                   request_date: d.requestDate, ...(d.userError && d.userError !== "VALID" ? { reason: d.userError } : {}) };
        } },
    ],
  },
  {
    id: "bce", name: "European Central Bank", category: "finance", description: "Official euro exchange rates (ECB)",
    website: "https://www.ecb.europa.eu", docs: "https://data.ecb.europa.eu/help/api/overview", logo: { favicon: "https://www.ecb.europa.eu" },
    baseUrl: "https://data-api.ecb.europa.eu/service",
    auth: { type: "none" }, fields: [], query: { format: "jsondata" },
    help: "Public data from the European Central Bank: it needs no credentials. Click “Enable”. The reference rates are published every "
      + "working day at around 16:00 CET.",
    test: { path: "/data/EXR/D.USD.EUR.SP00.A", query: { lastNObservations: 1 },
              message: (d) => ecbRates(d).map((t) => `1 EUR = ${t.value} USD (${t.date})`)[0] || "Service available" },
    examples: "Examples: GET /data/EXR/D.USD+GBP+CHF.EUR.SP00.A?lastNObservations=1 (latest daily rate), "
      + "GET /data/EXR/M.USD.EUR.SP00.A?startPeriod=2026-01 (monthly averages). Response in SDMX-JSON.",
    tools: [
      { name: "bce_exchange_rates", title: "ECB: euro exchange rates", annotations: { readOnlyHint: true },
        description: "Official euro exchange rate against other currencies: the latest published or the one for a specific date.",
        schema: { currencies: z.array(z.string().regex(/^[A-Za-z]{3}$/)).min(1).max(20).default(["USD", "GBP", "CHF"]),
                   date: z.string().optional().describe("YYYY-MM-DD; if nothing was published that day, no data is returned") },
        run: async ({ currencies, date }, p) => ecbRates(ensureOk(await p({
          path: `/data/EXR/D.${currencies.map((m) => m.toUpperCase()).join("+")}.EUR.SP00.A`,
          query: date ? { startPeriod: date, endPeriod: date } : { lastNObservations: 1 } }), "ECB")) },
    ],
  },
];
