# Read-only public-user alpha wallet — October 25

The dashboard now has an independently gated `/wallet` view and `/api/wallet/balance` read endpoint. The signed-in public test user's wallet is read from `meterkit_alpha.wallets` through the transactional kernel. This is **not** a builder-wide administrative console, Command Center membership mode, purchase flow or hosted acceptance. Historical dashboard pages still use the legacy demo ledger and now carry an explicit notice; their data must not be cited as alpha payment evidence.

## Identity and controls

- The configured Supabase issuer verifies the bearer token server-side using the existing bounded user-identity adapter. The configured chatbot app ID plus verified subject select the wallet. No browser app/user/workspace selector is accepted; any query string is refused.
- Only GET is accepted. POST/OPTIONS and all other mutation methods refuse; there are no jobs, checkout, credit changes, release/refund controls or provider calls on this surface. Exact Origin is enforced when provided; bearer authentication is required even without Origin. No cross-origin browser API is exposed.
- Password sign-in uses existing isolated test accounts. Token/expiry live in memory only; no browser storage, refresh token use, account creation, auto-login or automatic retry. Refresh first hides the old balance. Failure/401, local sign-out or reload clears the view. In-flight results cannot restore a signed-out/expired session.
- Available and held credits are separate. Reads never create wallets or entries and cannot release an unknown job's hold. A zero balance is not a verified payment receipt.
- The public component receives only issuer, public anon key, app ID and exact dashboard origin. Database/payment/model secrets never cross this boundary. Responses use `Cache-Control: no-store`.

## Independent configuration (not enabled by this change)

Only after hosted Auth/test-account and isolated public-data/deployment gates are cleared, configure the existing authorized isolated target with:

- `METERKIT_WALLET_READ_ENABLED=true`
- `METERKIT_WALLET_ORIGIN`: exact HTTPS dashboard origin (HTTP loopback allowed for local fixtures)
- `METERKIT_CHAT_SUPABASE_URL`, `METERKIT_CHAT_SUPABASE_ANON_KEY`, `METERKIT_CHAT_APP_ID`: same server-owned public-chat identity/app binding, never a Command Center workspace ID
- `DATABASE_URL`: existing isolated alpha database

No `NEXT_PUBLIC` private settings, payment secrets, model keys, approved payment price or chat/action enable switch are required for this independent read surface. This gate does not turn on those other routes or waive their prerequisites. No hosted environment was changed. The page evaluates its gate at request time with Next `connection()` inside a Suspense boundary; a static build cannot silently activate the wallet.

## Executed local evidence

- Full `npm test` with disposable loopback Postgres16: 37 billing tests, 5 dashboard client/config contracts, 9 installer contracts, 2 legacy transform tests, 10 SDK tests, 1 existing dashboard test and 20 public-chat client/config tests. Existing retired/unconfigured route checks also pass. Fixture Auth/funding/model data remain fixtures.
- A real Postgres read contract funds user A through fixture capture data, reserves 5 credits, reads A as45 available/5 held, reads B and a different app as0/0, and verifies no extra wallet/journal/job mutation. It never calls real PayPal or hosted Auth.
- Six actual Chromium lifecycle/compiled-route checks against the local production build: default refusal, enabled missing-session/mutation/selector/origin refusal, fixture sign-in, memory-only credentials, reload/account-switch isolation,401 clearing, sign-out and mobile overflow. Receipt: [wallet/results.json](alpha-evidence/wallet/results.json). Auth/balance browser replies are HTTP fixtures, not hosted two-user acceptance.
- All workspace production builds including Next TypeScript, billing strict types, scoped ESLint and `git diff --check` pass. Existing root pages-directory ESLint notice is unchanged.

Initial browser testing caught a real grid-layout overlap from the new legacy notice; moving the notice inside the existing main grid cell fixed it. The harness also required an app-scoped alert selector to exclude Next's route announcer. The first full test attempt lost the disposable Postgres process between tool executions; starting/testing/stopping it within one execution scope passed all contracts.

## Still pending

Actual hosted two-user Auth/isolation proof and isolated deployment readiness; full builder/admin dashboard and job/history views; merchant identity, public signed webhook, separate approved sandbox buyer and actual capture/event receipts; actual AI advisory receipt; isolated Command Center flow. PR8 remains draft. Production billing/pricing, infrastructure spending and buyer-approval gates are unchanged.
