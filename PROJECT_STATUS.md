# Current alpha execution — 2026-10-22

The [approved PRD](docs/PRD.md) supersedes the historical wallet demo below. Four milestones/issues track execution: [A1](https://github.com/circuitstudioai/meterkit/issues/4), [A2](https://github.com/circuitstudioai/meterkit/issues/5), [A3](https://github.com/circuitstudioai/meterkit/issues/6), [A4](https://github.com/circuitstudioai/meterkit/issues/7).

New transactional Postgres kernel, verified sandbox adapter, authenticated job service and source-bound installer are under acceptance. See [evidence and gates](docs/ALPHA_TESTING.md). No production activation, live PayPal receipt or real AI plan has passed. Existing Gemini key returns API_KEY_INVALID. Command Center action/demo policy awaits confirmation.

## Historical demo status (not alpha acceptance)

# MeterKit status

Canonical repo: [github.com/circuitstudioai/meterkit](https://github.com/circuitstudioai/meterkit)

Pivot from AI Spend Wallet approved. Monorepo is on `main`.

Done: SDK ledger + tests, dashboard reframe, React widgets, CLI, chatbot before/after, docs.

Left for humans: PayPal sandbox credentials, Gemini key, Supabase/Vercel hosting, video, Devpost (do not submit from this agent).

## Deployment

Infrastructure checkpoint: 2026-10-20. Hosting is online; sandbox payment acceptance is **not complete**.

- Production: https://meterkit.vercel.app
- Vercel project: `meterkit` in `circuitstudioais-projects`.
- Git integration: this repository, production branch `main`, root `apps/dashboard`, Next.js, Node.js 24. The deployment installs the repository's npm workspaces.
- Initial production deployment of `1e21a50e25e2801bf93298c81fc3488cd790c897` succeeded.
- Production and Preview environment names configured: `GEMINI_API_KEY`, `GEMINI_MODEL`, `PAYPAL_MODE`, `NEXT_PUBLIC_APP_URL`, `METERKIT_API_URL`, `NEXT_PUBLIC_METERKIT_API_URL`.
- Gemini uses the server-side key directly, not AI Gateway. Generation has not yet been verified.
- PayPal remains sandbox-only. No sandbox app, buyer/business accounts, webhook, top-up, or payout has been verified.
- Still required: `DATABASE_URL`, `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `NEXT_PUBLIC_PAYPAL_CLIENT_ID`, `PAYPAL_WEBHOOK_ID`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- `DATABASE_PATH` is intentionally not configured for production: the setup contract requires Postgres, not local SQLite.
- Supabase CLI has no access token and the available browser session requires sign-in. No Supabase project was created or reused, and no SQL migration was run.
- PayPal Developer requires sign-in. After access is available, create the sandbox app/accounts and the webhook at https://meterkit.vercel.app/api/paypal/webhook with the four events in `docs/SETUP.md`.

### Acceptance evidence

- PASS: Vercel production build and deployment.
- PASS: homepage, `GET /api/session`, and `GET /api/overview` each return HTTP 200.
- BLOCKED: durable Postgres ledger. HTTP success without `DATABASE_URL` only exercises the default local-database path; it does not establish production persistence.
- BLOCKED: sandbox buyer top-up, actual metered AI call, zero-balance rejection, verified webhook ledger update, and sandbox business payout.
- NOT RUN: Gemini generation.

Resume by authenticating Supabase and PayPal, checking that the database choice has no unapproved cost, applying `apps/dashboard/supabase/migrations/20261017000000_meterkit.sql`, setting the missing environment variables, and redeploying. Then complete every sandbox acceptance step. Do not reuse a customer database or run the destructive demo seed against an existing populated database.

No app code changed, real-money operation performed, paid plan enabled, or Devpost submission made. No code defect requiring an issue was established during this infrastructure checkpoint.
