## Read-only wallet dashboard — October 25

The dashboard app has an independently gated public-user alpha-wallet view, not the historical console ledger or a payment UI. See [ALPHA_WALLET_DASHBOARD.md](ALPHA_WALLET_DASHBOARD.md). It remains disabled; hosted Auth/payment acceptance is not inferred from local tests.

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

## Opt-in tab recovery groundwork — October 24

The transport now accepts an explicit `RecoveryStore`; `createTabRecoveryStore(window.sessionStorage, appId)` supplies a stable app-namespaced adapter. **Neither adapter nor client is wired into the page.** Memory-only remains the default. Before exposing actions, the UI must explicitly configure recovery, explain that the private pending prompt is retained in this tab, and handle recovery failures without falling back to memory-only operation.

With recovery configured, the exact owner/issuer/key/record/prompt/5-credit request is synchronously written and read back **before** any billable request. A recreated client restores only a canonical bounded record, remains signed out, and does not perform automatic network requests. The original account must explicitly sign in and reconcile the original key. No password, access/refresh token, answer or session is journaled. Malformed, foreign-issuer, extra-field, unreadable or silently unwritable records fail closed; do not delete them to bypass unknown-work recovery. Confirmed completed/released replies clear the journal; an unconfirmed clear retains in-memory pending work for exact reconciliation.

This is a tab-reload recovery primitive, not server-side operator recovery, encrypted storage, cross-tab locking or protection against same-origin JavaScript. Owner checks constrain this client, not a malicious browser; server subject verification remains authoritative. Clearing browser data, closing the tab or intentionally removing the record can lose recovery information. Unknown work then needs operator investigation; never promise a refund or blindly rerun it. Do not use localStorage, attach this to customer prompts without the intended data approval, or activate the server to test this primitive.

Seventeen fixture-only client contracts pass (seven recovery additions), including reconstruction, original-user privacy, exact-body replay, persistence failure before network, failed clear, canonical validation and app namespace isolation. Existing unconfigured and retired-route checks, TypeScript and scoped lint pass. The initial lint command guessed an obsolete config filename; the actual dashboard flat config passes with its pre-existing pages-directory notice. No actual browser reload, hosted Auth, model call or payment acceptance is claimed. UI wiring/browser lifecycle verification, live Auth/two-user proof, installer/dashboard and sandbox merchant/webhook/buyer gates remain outstanding.

## Opt-in Auth/balance/job UI and actual browser lifecycle — October 25

This checkpoint supersedes the earlier **not wired into the page** statements. The metered example now imports the client behind a new server-only `METERKIT_CHAT_UI_ENABLED=true` opt-in. It also requires the existing API, sandbox policy and data switches, database presence, a valid server-owned app namespace, Auth HTTPS issuer/public anon key and exact origin. Missing or malformed configuration renders an unavailable page with no action controls. Configuration is evaluated per request, not frozen at build time. Only issuer, public anon key, app namespace and exact origin cross to the browser; database, model, merchant and provider secrets do not. The browser refuses a mismatched origin. No deployment/environment setting has been changed.

Before creating the client, the page requires acknowledgment of private pending-prompt retention in this tab. Existing test-account password sign-in, memory-only session, verified balance/held credits, five-credit jobs and explicit pending reconciliation are wired. There is no signup/reset/refresh, purchase control or checkout. Local logout, 401 and idle expiry hide private input/results. A reload requires sign-in again; only the original account can review/reconcile the saved prompt. Another account cannot replace a pending job. Zero/unverified balance blocks new work. No automatic job retry, polling or refund is performed. A failed balance refresh after confirmed completion does not invent a new job.

Recovery initialization/write/clear errors fail closed, without memory-only fallback or deletion of malformed state. The app stores no password, access/refresh token or answer in browser storage. The explicit retention limits still apply: tab storage is not encrypted, same-origin scripts can access it, and closing/clearing the tab can lose recovery. Use approved synthetic test prompts only until hosted data acceptance is complete.

Executed checks:

- **20** fixture-only client/config contracts pass (17 existing client contracts plus three activation/allowlist/config-validation contracts), alongside unconfigured GET/POST/OPTIONS and retired-route refusal checks.
- **11** actual Playwright browser checks pass against the compiled local production build: default refusal, retention consent, real reload, no credential persistence, other-account privacy, byte-identical original-owner reconciliation, completion clear, local logout, zero balance, confirmed release, 401, idle expiry, storage-write refusal and corrupt-state refusal. Grouped check labels/results and labeled desktop/mobile screenshots are in [public-chat evidence](alpha-evidence/public-chat/README.md). At390px, no horizontal overflow was observed; no browser page errors occurred.
- Metered-example production build (including Next TypeScript), explicit scoped TypeScript and scoped ESLint pass. ESLint retains the pre-existing root pages-directory notice. `git diff --check` passes. No local full workspace/database suite rerun for this UI-only slice; exact-head CI is tracked separately.
- Initial browser run stopped on a test selector matching both the app alert and Next's route announcer. The test now selects the app alert; all11 checks pass. This was a harness assertion problem, not a hosted-provider failure.

These are actual browser lifecycle checks with **HTTP fixture Auth, balances and jobs**, not hosted Supabase Auth, real Postgres/job/payment/model acceptance. No API/hosting switch, merchant, webhook, buyer approval, Production billing or paid infrastructure was activated. Public deployment/two-user hosted acceptance, installer/dashboard integration and merchant/webhook/buyer receipts remain outstanding.


## Standalone reference installer — October 25

The exact before-example now has an additional deterministic, source/plan-bound installer adapter. The generated standalone app compiles and refuses unconfigured activation; both legacy routes remain retired. See [supported target, commands and local evidence](PUBLIC_CHAT_INSTALLER.md). This supersedes the blanket installer-not-implemented notes above, not the outstanding custom-stack, hosted Auth/payment/model, dashboard or live sandbox acceptance gates.
