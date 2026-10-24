# Public chatbot API preparation — 2026-10-24

Status: code-only, disabled by default, PR8 remains draft. This is not a hosted Auth/payment receipt or a finished public chatbot.

## Composition and isolation

`examples/chatbot-metered/app/api/alpha/[...path]/route.ts` mounts the separate `publicChatHandler` from `packages/billing/src/public-chat.ts`. It does not change the dashboard's Command Center alpha route, workspace membership/role/Savings checks, or its feature policy.

The service passes its already bounded, parsed JSON to `prepare` as a fourth argument; adapters with the original three arguments remain compatible. A public chat job validates a nonempty prompt of at most4,000 characters before reserving credits. The immutable job fingerprint includes the message record ID and normalized prompt. Browser app/user selectors are ignored; a workspace selector is forbidden. The configured issuer verifies the token, and the server-owned app ID plus verified user UUID selects the wallet.

API paths under `/api/alpha`:

- `GET /balance`: bearer-authenticated app/user balance.
- `POST /jobs`: bearer auth; `{key, recordId, expectedCredits:5, prompt}`. Retain the same key and exact input to retrieve a prior result; a changed prompt under that key is a conflict. Do not automatically retry uncertain execution with a new key.
- `POST /paypal/orders`: bearer auth; `{packId:"sandbox-50", key}`.
- `POST /paypal/capture`: bearer auth; `{orderId}`. This is not buyer approval.
- `POST /paypal/webhook`: existing signed-webhook verification, not browser authentication.

The sandbox-only approval from PM7140 is USD1.00 for50credits and5credits per AI action. The catalog and action price are server-owned. The provider is always PayPal Sandbox. The API is not enabled by that approval alone, and no Production pricing is authorized.

The Gemini adapter uses one bounded-output request, no redirects or cache, a20-second signal and800-output-token limit. It accepts only a completed, nonempty response, at most8,000 characters, within a64KiB response body. There is no fake demo-answer fallback. Confirmed rejection/output failure releases a hold; uncertain transport/read outcomes retain it for operator reconciliation, never blind refund/rerun.

## Explicit configuration, not performed here

Separate server-only variables: `METERKIT_CHAT_ENABLED`, `METERKIT_CHAT_SANDBOX_POLICY_APPROVED`, `METERKIT_CHAT_APP_ID`, `METERKIT_CHAT_ORIGIN` (one exact origin), `METERKIT_CHAT_SUPABASE_URL`, `METERKIT_CHAT_SUPABASE_ANON_KEY`, `METERKIT_CHAT_DATA_APPROVED`; plus existing approved `DATABASE_URL`, Gemini and sandbox PayPal configuration. Both activation switches must explicitly equal `true`. Reuse the existing isolated database, never a new paid project or Signal customer data. Never expose database/provider secrets to browser code.

No hosted environment, database schema, webhook, credentials or deployment settings were changed. Merchant ID, public callback setup and separate buyer approval remain prerequisites for real payment acceptance. Do not activate merely to obtain a demo URL.

**The existing metered example homepage, `/api/chat`, `/api/export` and SDK wallet are historical and are not connected to this API.** Do not publicly deploy that historical surface as the authenticated alpha. The next slice must replace/retire those paths and wire real Auth session handling and an alpha-backed balance/job UI before public-target acceptance. Installer/dashboard integration is also pending. No login UI, signup/session lifecycle, checkout return flow, public endpoint, new deployment or judge-ready demo is claimed.

## Executed evidence

-52 workspace tests pass, including four new public-composition/model contracts with real disposable Postgres and fixture Auth, funding, PayPal/model data. Checks cover verified-user isolation, five-credit exactly-once completion, changed-prompt conflict, zero balance, bad prompt/price, absent session, foreign origin, disabled switches, confirmed failure release and uncertain outcome holds/replay.
-Existing six retired dashboard payment-route checks pass. Separate GET/POST/OPTIONS public-route checks refuse unconfigured activation without provider or database access.
-Strict billing types, scoped lint and all workspace builds pass, including the actual Next route. Root ESLint pages-directory notice is pre-existing.
-The changed-prompt assertion was separately rerun: initial attempt encountered a stopped local disposable database; restarting it within the same command yielded4/4 passing contracts, then the owned database was stopped cleanly. No hosted resources were involved.

These are executable local contracts, not actual hosted Supabase Auth, Gemini chat, buyer approval, PayPal capture or signed webhook proof.
