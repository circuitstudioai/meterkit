# Current alpha execution — 2026-10-23

PR #8 remains draft and unmerged. A1 is accepted; A2–A4 still require live integration evidence. The last committed CI baseline passed 33 tests.

## Resumed work

- Dedicated approved Micro project `meterkit-alpha` is healthy. Its five alpha tables are applied with no seed/funded wallets. Both Supabase API roles fail effective schema/table/function access checks. Transaction pooler TLS connection passed.
- `DATABASE_URL` is stored as an encrypted, branch-specific Preview variable only. Production settings and Command Center production remain untouched.
- Vercel-hosted checks: PayPal sandbox OAuth **PASS**, Gemini generation **PASS**. Earlier local key failures used masked downloaded values and do not diagnose the saved credentials.
- Six legacy payment endpoints now return HTTP410 without initializing the legacy database or provider. The historical dashboard/examples are not yet migrated to the alpha engine.
- Reviewed v4 in [V4_CHECKLIST_REVIEW.md](docs/V4_CHECKLIST_REVIEW.md). Public chatbot identity/installer/deployment, Venmo and the alpha-backed dashboard are additional implementation work, not delivered features.

## Remaining gates

- Owner confirmation: proposed $1 USD → 50 credits and 5 credits per action.
- Sandbox `PAYPAL_MERCHANT_ID`, separate buyer approval and a publicly reachable alpha webhook.
- Isolated Command Center Auth/Savings fixtures, live provider jobs and capture/signed-webhook receipt.
- Real AI-assisted installer acceptance is separate from the tiny hosted Gemini provider check.
- Do not mark ready until exact-head checks and both real flows pass. No merge, production activation, webhook deletion or Devpost submission.

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

Historical instructions below are not the alpha setup path. Follow docs/SETUP.md and the canonical private alpha migration; do not apply legacy migrations or seed the alpha database.

No app code changed, real-money operation performed, paid plan enabled, or Devpost submission made. No code defect requiring an issue was established during this infrastructure checkpoint.
