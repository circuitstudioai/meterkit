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

## Historical metered surface retired — 2026-10-24

The metered example's `/api/chat` and `/api/export` now return410 with `Cache-Control: no-store` for all seven supported HTTP verbs. They do not parse input, initialize the historical SDK wallet or call a model/provider. The fixed `user_alex` wallet provider, legacy top-up/chat/export UI, demo model fallback and SDK adapter have been removed from this example. The homepage is an honest unavailable-state page, not a functional alpha chatbot. The separate unmetered **before** example and shared SDK remain unchanged.

Targeted route contracts cover forged user input and malformed bodies with a fetch trap. A compiled local Next server passed14 HTTP method/path checks, returned the unavailable homepage without the legacy user/wallet configuration and kept unconfigured `/api/alpha/balance` at503. The metered example production build/TypeScript and scoped lint pass (the root pages-directory notice is pre-existing). The initial root lint invocation lacked a config; rerunning with the existing dashboard config passed. No full workspace regression rerun or live Auth/payment acceptance is claimed for this retirement-only change.

**Remaining:** wire real Auth session handling and an alpha-backed balance/job UI before public-target acceptance. Installer/dashboard integration is also pending. No login UI, signup/session lifecycle, checkout return flow, new public deployment or judge-ready demo is claimed. Do not activate the API merely because legacy routes are now retired.

## Executed evidence

-52 workspace tests pass, including four new public-composition/model contracts with real disposable Postgres and fixture Auth, funding, PayPal/model data. Checks cover verified-user isolation, five-credit exactly-once completion, changed-prompt conflict, zero balance, bad prompt/price, absent session, foreign origin, disabled switches, confirmed failure release and uncertain outcome holds/replay.
-Existing six retired dashboard payment-route checks pass. Separate GET/POST/OPTIONS public-route checks refuse unconfigured activation without provider or database access.
-Strict billing types, scoped lint and all workspace builds pass, including the actual Next route. Root ESLint pages-directory notice is pre-existing.
-The changed-prompt assertion was separately rerun: initial attempt encountered a stopped local disposable database; restarting it within the same command yielded4/4 passing contracts, then the owned database was stopped cleanly. No hosted resources were involved.

These are executable local contracts, not actual hosted Supabase Auth, Gemini chat, buyer approval, PayPal capture or signed webhook proof.

## Memory-only client groundwork — October 24

`examples/chatbot-metered/lib/alpha-client.ts` is a tested browser transport, **not yet imported by the unavailable-state page**. It accepts an explicitly configured HTTPS Auth issuer/public anon key, signs into an existing test account by password, retains only the access token/user/expiry in memory and sends bearer-authenticated balance/job requests exclusively to relative same-origin `/api/alpha` paths. No browser-selected app/workspace/user wallet identifiers, storage, cookies, refresh token retention, signup, checkout or automatic retries. The server continues to verify the subject independently; login response metadata is not wallet authority.

Expiry/401 requires explicit reauthentication. `signOut` is local token removal, not provider-wide revocation. Session generations discard late sign-in/balance/job responses after account changes. Unknown jobs retain a frozen exact prompt/record/key/5-credit request and block new jobs; explicit reconciliation reuses that exact request. Concurrent replay is refused. Pending content is visible/replayable only to the original signed-in user, including after local logout/reauthentication within the same client instance. Only confirmed completed/released outcomes clear the pending job. Other failures conservatively require reconciliation, even when they may represent a pre-reserve refusal.

**Limits before UI wiring:** this in-memory client does not survive navigation/reload or provide operator recovery. Design owner-bound, non-token recovery instructions/state before exposing action controls; never silently mint a replacement key after lost/unknown work. No persistent-session claim, public config injection, UI, signup/reset/refresh lifecycle, checkout return flow or real hosted Auth/payment acceptance is included. No server activation or hosted configuration changed.

Ten fixture-only client contracts cover exact-key replay, failure/oversized-response containment, release, missing/expired session, 401, stale responses, concurrency and cross-user pending-job privacy. They run in the metered example's normal `npm test` command alongside existing unconfigured/retired-route checks. Scoped TypeScript and lint pass; no live provider request is used by these contracts.
