// Payments, banking and accounting (Holded and Odoo have their own connectors).
import { z } from "zod";
import { ensureOk } from "../define.js";

// Wise API version (quarterly CalVer; it goes in the path and earlier ones stay active).
const WISE = "2026Q4";

const qontoDate = (v, end) => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? `${v}T${end ? "23:59:59.999" : "00:00:00.000"}Z` : v);

export default [
  {
    id: "stripe", name: "Stripe", category: "finance", description: "Payments, customers, invoices, subscriptions and balance",
    website: "https://stripe.com", docs: "https://docs.stripe.com/api", logo: { simpleIcons: "stripe" },
    baseUrl: "https://api.stripe.com/v1",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "Restricted key (rk_live_…) or secret key (sk_live_…)", secret: true }],
    // Key only: Stripe OAuth (Connect) is for platforms acting on third-party accounts, not for your own account.
    keyUrl: "https://dashboard.stripe.com/apikeys",
    help: "In the Stripe Dashboard: “Developers” → “API keys” → “Create restricted key”. Give each resource just the permission it needs "
      + "(None, Read or Write) and include read access to “Balance”, which the connection test uses. If Stripe asks about the intended "
      + "use, choose “Authorize agent access to your account”: sensitive actions will ask for approval. Copy the key: it is not "
      + "shown again. For testing, create the key in a test environment (rk_test_…).",
    test: { path: "/balance", message: (d) => `API key is valid (${d.livemode ? "live mode" : "test environment"})` },
    examples: "Writes go as a form (application/x-www-form-urlencoded), not JSON: use “form”, with nested keys "
      + "like metadata[order] or items[0][price]. Examples: GET /customers?email=…, GET /customers/search?query=email:'…', "
      + "GET /payment_intents?limit=10, GET /charges?limit=10, GET /invoices?status=open, GET /balance_transactions?limit=20, "
      + "POST /customers form {\"email\": \"…\", \"name\": \"…\", \"metadata[source]\": \"conector\"}, "
      + "POST /refunds form {\"payment_intent\": \"pi_…\"}.",
  },
  {
    id: "paypal", name: "PayPal", category: "finance", description: "Payments, orders, refunds, invoices and transactions",
    website: "https://www.paypal.com", docs: "https://developer.paypal.com/api/rest/", logo: { simpleIcons: "paypal" },
    baseUrl: "https://{environment}",
    auth: { type: "client_credentials", url: "https://{environment}/v1/oauth2/token" },
    fields: [{ id: "client_id", label: "Client ID" },
             { id: "client_secret", label: "Secret", secret: true },
             { id: "environment", label: "Environment", default: "api-m.paypal.com",
               options: [["api-m.paypal.com", "Real (live)"], ["api-m.sandbox.paypal.com", "Testing (sandbox)"]] }],
    keyUrl: "https://developer.paypal.com/dashboard/applications/live",
    help: "At developer.paypal.com sign in with your PayPal Business account and open “Apps & Credentials”. Choose “Live” at the top "
      + "(or “Sandbox” for testing), click “Create App” (or open an existing one) and copy the Client ID and the Secret. To query "
      + "transactions and balances (/v1/reporting/…), check “Transaction search” in the app options; it may take a few hours "
      + "to take effect.",
    test: { path: "/v1/notifications/webhooks", message: (d) => `App connected (${(d.webhooks || []).length} webhooks configured)` },
    examples: "Examples: GET /v1/reporting/transactions?start_date=2026-10-01T00:00:00Z&end_date=2026-10-15T23:59:59Z&fields=all "
      + "(max 31 days), GET /v1/reporting/balances, GET /v2/checkout/orders/{id}, POST /v2/checkout/orders {\"intent\": \"CAPTURE\", "
      + "\"purchase_units\": [{\"amount\": {\"currency_code\": \"EUR\", \"value\": \"10.00\"}}]}, GET /v2/payments/captures/{id}, "
      + "POST /v2/payments/captures/{id}/refund, GET /v2/invoicing/invoices?page_size=20, GET /v1/billing/subscriptions/{id}.",
  },
  {
    id: "wise", name: "Wise", category: "finance", description: "Multi-currency balances, exchange rates, recipients and transfers",
    website: "https://wise.com", docs: "https://docs.wise.com/api-reference", logo: { simpleIcons: "wise" },
    baseUrl: "https://{server}",
    auth: { type: "bearer" },
    fields: [{ id: "token", label: "Personal API token", secret: true },
             { id: "server", label: "Environment", default: "api.wise.com",
               options: [["api.wise.com", "Production"], ["api.wise-sandbox.com", "Sandbox (testing)"]] }],
    keyUrl: "https://wise.com/your-account/integrations-and-tools/api-tokens",
    help: "On wise.com, with your business account: “Your account” → “Connect and manage apps” → “API tokens” → “Add new token”; complete "
      + "the two-step verification and copy it (it is shown only once). Except in the US, Canada, Australia, New Zealand, Singapore and "
      + "Malaysia (in the EU and the UK, because of PSD2), the personal token cannot fund transfers or download statements: "
      + "you can prepare transfers through the API and fund them from the website or the app.",
    test: { path: `/${WISE}/me`, account: (d) => d.email || d.name },
    examples: `The version goes in the path (${WISE}). Examples: GET /${WISE}/profiles (profile ids), `
      + `GET /${WISE}/profiles/{profileId}/balances?types=STANDARD, GET /${WISE}/rates?source=EUR&target=USD, `
      + `GET /${WISE}/transfers?profile={profileId}&limit=10, GET /${WISE}/transfers/{id}, POST /${WISE}/profiles/{profileId}/quotes, `
      + `POST /${WISE}/transfers. The old paths (/v1/me, /v2/profiles…) still work.`,
  },
  {
    id: "qonto", name: "Qonto", category: "finance", description: "Accounts, balances, transactions, receipts and invoices",
    website: "https://qonto.com", docs: "https://docs.qonto.com/get-started/business-api/overview", logo: { favicon: "https://qonto.com" },
    baseUrl: "https://thirdparty.qonto.com/v2",
    // Qonto expects “login:key” as is in Authorization (it looks like Basic, but without base64).
    auth: { type: "custom", apply: (c) => ({ headers: { Authorization: `${c.login}:${c.key}` } }) },
    fields: [{ id: "login", label: "Organization identifier (login)" },
             { id: "key", label: "Secret key", secret: true }],
    help: "At app.qonto.com choose the organization and open “Integrations and Partnerships” → “API key”. Copy the identifier (login) "
      + "and the secret key (click “Generate” if you do not have one yet). It gives access to the data of the whole organization: keep it safe.",
    test: { path: "/organization", account: (d) => d.organization?.legal_name || d.organization?.slug },
    examples: "Examples: GET /organization (accounts, IBAN and balances), "
      + "GET /transactions?iban=…&settled_at_from=2026-10-01T00:00:00Z&per_page=100 (completed only unless you ask for status[]=pending), "
      + "GET /transactions/{id}?includes[]=attachments, GET /statements, GET /labels, GET /memberships, GET /client_invoices, "
      + "GET /supplier_invoices.",
    tools: [
      { name: "qonto_transactions", title: "Qonto: transactions of an account", annotations: { readOnlyHint: true },
        description: "Completed transactions of an account (the main one by default), newest first: date, amount "
          + "(negative if it is a debit), counterparty, type, note and whether the receipt is missing.",
        schema: { iban: z.string().optional().describe("Account IBAN (empty: the main account)"),
                   from: z.string().optional().describe("Settled from (YYYY-MM-DD)"),
                   to: z.string().optional().describe("Settled until (YYYY-MM-DD)"),
                   max: z.number().int().min(1).max(100).default(50) },
        async run({ iban, from, to, max }, p) {
          let account = iban?.replace(/\s/g, "");
          if (!account) {
            const accounts = ensureOk(await p({ path: "/organization" }), "Qonto").organization?.bank_accounts || [];
            account = (accounts.find((b) => b.main) || accounts[0])?.iban;
            if (!account) throw new Error("Qonto: the organization has no accounts");
          }
          const d = ensureOk(await p({ path: "/transactions", query: { iban: account, per_page: max,
            settled_at_from: from ? qontoDate(from) : undefined,
            settled_at_to: to ? qontoDate(to, true) : undefined } }), "Qonto");
          return (d.transactions || []).map((t) => ({ id: t.id, date: t.settled_at || t.emitted_at,
            amount: t.side === "debit" ? -t.amount : t.amount, currency: t.currency, counterparty: t.label, type: t.operation_type,
            note: t.note || undefined, receipt_missing: Boolean(t.attachment_required && !t.attachment_ids?.length) }));
        } },
    ],
  },
  {
    id: "akaunting", name: "Akaunting", category: "finance", description: "Invoices, expenses, customers, suppliers and bank accounts",
    website: "https://akaunting.com", docs: "https://akaunting.com/hc/docs/developers/restful-api/", logo: { simpleIcons: "akaunting" },
    baseUrl: "{url}/api",
    headers: (c) => {
      const company = String(c.company || "").replace(/\D/g, "");
      return company ? { "X-Company": company } : {};
    },
    auth: { type: "basic", usernameField: "email", passwordField: "password" },
    fields: [{ id: "url", label: "Akaunting address", format: "url", default: "https://app.akaunting.com",
               help: "Leave it as is if you use Akaunting Cloud; if you have it installed on your server, enter its address (https://…)." },
             { id: "email", label: "User email" },
             { id: "password", label: "User password", secret: true },
             { id: "company", label: "Company ID", optional: true,
               help: "The number that appears in the address after you sign in (…/123/dashboard). Empty: the user's first company." }],
    help: "The API uses the email and password of an Akaunting user with the “read-api” permission (the administrator role has it). "
      + "Better to use a dedicated one: profile icon → “Users” → “Invite user”, with the company and a role that only has the "
      + "required permissions (a custom role can be read-only).",
    test: { path: "/ping", account: (d, c) => c.email },
    examples: "Examples: GET /documents?search=type:invoice&limit=25 (issued invoices; type:bill for supplier bills), "
      + "GET /documents/{id}, GET /contacts?search=type:customer, GET /items, GET /accounts, GET /transactions?search=type:income, "
      + "GET /categories, POST /contacts {\"type\": \"customer\", \"name\": \"…\", \"email\": \"…\", \"currency_code\": \"EUR\"}.",
  },
];
