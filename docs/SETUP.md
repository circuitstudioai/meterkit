# Verified alpha setup

## Local contracts

1. Run `npm ci`.
2. Create a disposable Postgres 16 database named `meterkit_test`. Tests refuse other database names and truncate alpha tables.
3. Set `METERKIT_TEST_DATABASE_URL` privately.
4. Run `npm test`, `npm run typecheck -w @meterkit/billing`, and `npm run build`.

The GitHub Alpha contracts workflow starts a disposable Postgres service. It does not need PayPal or model secrets.

## Reviewable installer

Policy example for **automated fixtures only**, not approved customer pricing:

```json
{"version":1,"mode":"sandbox","feature":"savings.explanation","credits":5,"packs":[{"id":"demo","credits":50,"amountMinor":100,"currency":"USD"}]}
```

Keep policy/plan files outside the target working tree. Run:

```sh
node packages/cli/bin/meterkit.mjs plan /path/to/command-center --policy=/tmp/policy.json --out=/tmp/plan.json
# Read the complete plan, policy and patch; do not approve only the filename list.
node packages/cli/bin/meterkit.mjs apply /path/to/command-center --plan=/tmp/plan.json --approve=EXACT_PLAN_HASH
```

`--ai` performs a real Gemini advisory review of allowlisted stack metadata, policy, paths and acceptance requirements. It never sends repository source or env files. Missing/invalid credentials fail explicitly. The deterministic adapter owns edits; AI output cannot rewrite tests or prices.

Only the inspected Command Center entry point is supported initially. Unknown entry points/auth mappings require clarification. The generated route is disabled until `VITE_METERKIT_ALPHA_ENABLED=true`; set `VITE_METERKIT_ALPHA_API_URL` to the isolated backend origin. Existing Supabase session is reused.

## Isolated backend

Do not use a production Signal database. Set `DATABASE_URL` for a dedicated alpha Postgres database, then run `npm run db:alpha`. The additive `meterkit_alpha` schema never changes Signal tables. The schema is not exposed to Supabase public/anon clients.

Server variables:

- `METERKIT_ALPHA_ENABLED=true` only after policy and access approval.
- `METERKIT_ALPHA_ORIGIN`: exact isolated Command Center frontend origin.
- `SIGNAL_SUPABASE_URL`, `SIGNAL_SUPABASE_ANON_KEY`: approved isolated Signal auth/data project. The anon key is public; membership/role/module checks still apply server-side.
- `METERKIT_ALPHA_POLICY`: JSON containing `approved:true`, `appId`, `feature:"savings.explanation"`, integer `credits`, allowlisted `workspaceIds`, and `packs` mapping IDs to integer `credits`/`amountMinor`. Use the same reviewed prices as the installer.
- `METERKIT_ALPHA_DATA_APPROVED=true` only for approved data handling; the adapter sends record ID, revision, currency and deterministic comparison totals, not contracts or employee data.
- `GEMINI_API_KEY`, `GEMINI_MODEL` for real explanations/planning.
- `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_MERCHANT_ID`, `PAYPAL_WEBHOOK_ID`: sandbox credentials only.

No credentials belong in browser variables, plans, issues or logs. The backend remains HTTP503 when disabled/unconfigured.

## PayPal sandbox configuration

1. Create a sandbox Business merchant, Personal buyer and REST app.
2. Store client ID/secret and the receiving merchant ID server-side. No live mode is supported by the alpha adapter.
3. Once the isolated preview is deployed, register `https://EXACT_ALPHA_BACKEND/api/alpha/paypal/webhook` for `PAYMENT.CAPTURE.COMPLETED`. Store that webhook ID server-side. Do not register the legacy `/api/paypal/webhook`.
4. Verify a real buyer approval, capture, duplicate signed webhook and persisted credits. Record IDs/statuses only, not credentials.

Orders v2 and webhook verification follow [official PayPal Orders documentation](https://developer.paypal.com/api/orders/v2) and [webhook verification documentation](https://developer.paypal.com/api/webhooks/v1). Fixture tests do not prove live API acceptance.

## Browser fixture harness

The local-only `scripts/alpha-ui-fixture-server.mts` requires a disposable loopback database named `meterkit_ui_test`. It binds only to 127.0.0.1:43129. It uses real Postgres, but **simulated PayPal, AI and auth**. Do not deploy it.

`verify-alpha-ui.mjs` requires the generated target running on 127.0.0.1:43128 with explicitly fictional Supabase build variables. Set `METERKIT_PLAYWRIGHT_PATH` to an installed `@playwright/test/index.mjs`. Screenshots/results are labelled fixtures.

## Alpha exit gates

See [ALPHA_TESTING.md](ALPHA_TESTING.md). No production activation, fee collection or Devpost submission is authorized by these setup instructions.
