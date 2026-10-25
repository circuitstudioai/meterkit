# Sandbox configuration assessment — October 25

Status: provider access verified; payment/Auth acceptance blocked. PR8 stays draft.
Owner follow-up: PM7225. This assessment reused existing Vercel access and stored
sandbox credentials. No duplicate credentials, merchant/app or paid project created.

## Actual checks at 12:50 UTC

- Live GitHub head `fcb2a99aae6d9b6942caa3c0b1d4b24ae956b189`: both Alpha
  workflows and Vercel checks SUCCESS. This is the pre-diagnostic baseline.
- Vercel project `meterkit`, root `apps/dashboard`, Production branch `main`.
  Preview protection is `all_except_custom_domains`. An unauthenticated POST to
  `/api/alpha/paypal/webhook` on the baseline Preview returned HTTP401 from the
  deployment protection boundary. This is **not** application signature rejection.
- Vercel environment inventory: sandbox client ID/secret present in Preview;
  `DATABASE_URL` exists only on branch `feat/verified-paypal-alpha-20261022`.
  Sensitive values cannot be downloaded/decrypted through the management API;
  masked/downloaded placeholders must not be tested as credentials.
- Ran a new read-only opt-in check *inside* a temporary protected Preview:
  https://meterkit-jlvze6ak1-circuitstudioais-projects.vercel.app
  Vercel build receipt: https://vercel.com/circuitstudioais-projects/meterkit/EvL7tiPreLDd8VPecuJnaMFUkwx4
- Actual sandbox OAuth PASS; authenticated webhook list HTTP200, **zero registered
  webhooks** for these app credentials. No duplicate app/webhook created.
- Identity endpoint HTTP200 but **no payer_id** in its response. Successful identity
  access is not a verified receiving merchant ID. No ID derived from OAuth app ID.
- `PAYPAL_MERCHANT_ID`, `PAYPAL_WEBHOOK_ID`, isolated workspace Auth and public-chat
  Auth configuration are absent. The CLI diagnostic deployment did not receive the
  branch-only database variable; this does **not** mean the existing approved database
  or branch-scoped configuration is missing. Do not recreate the database.
- Browser access check: PayPal Developer sandbox applications redirects to PayPal
  sign-in in the available managed browser. Supabase dashboard also redirects to
  sign-in; this does not invalidate previously configured CLI/database access. The
  local linked project metadata names `meterkit-alpha`; it was preserved untouched.
  No new credential was requested or supplied.
- No Gemini generation was requested in this diagnostic. October23's hosted Gemini
  receipt remains prior evidence, not a newly executed model/job acceptance.

The diagnostic Preview built successfully. The initial hosted diagnostic preceded
streamed-body hardening and expanded tests; it is not evidence for the later exact
commit. Collect GitHub exact-head checks separately.

## Safe diagnostic seam

`scripts/check-sandbox-config.mjs` runs only when both
`METERKIT_VERIFY_SANDBOX_CONFIG=true` and `VERCEL_ENV=preview`. It issues only sandbox
OAuth and read-only webhook/identity metadata requests. It has fixed provider origins,
no redirects/cache, 15-second request signals and 64KiB streamed body limits. Reports
contain boolean configuration presence, status codes and webhook counts only; no raw
responses, credentials, buyer details, merchant IDs or webhook URLs. It never creates
orders/captures/webhooks, mutates configuration, connects a database or invokes a model.

Six fixture contracts cover opt-in/Production refusal, sandbox origin, status-only
redaction, OAuth denial, independent metadata failure, oversized bodies and refusal to
infer merchant identity. Added to the dashboard test command. Dashboard regression,
syntax, scoped ESLint and whitespace checks pass; ESLint has the existing pages-directory
notice. No local full-workspace/database rerun is claimed for this diagnostic slice.

## Remaining sequence until October26 02:46:35 UTC

1. Resolve receiving sandbox Business merchant ID from a trusted merchant account
   view or official provider evidence; existing app OAuth is not that evidence.
2. Select/authorize the exact isolated public callback and synthetic Auth/data target.
   Keep current project protection intact. Do not register a known inaccessible
   callback or use a Vercel protection-bypass secret as a webhook credential.
3. With target identity confirmed, configure branch-scoped merchant/Auth/policy
   values using existing resources. Register the exact alpha callback for
   `PAYMENT.CAPTURE.COMPLETED` and store its ID only after reachable target readiness.
4. A separate sandbox buyer must approve checkout. Then verify actual capture,
   signed webhook/replay, persisted credits, two-user Auth isolation, model job,
   zero balance and recovery. Provider probes alone do not satisfy these gates.
5. Command Center PR110 exact `1d22f28d53fbd274423f8a06b732bd6923dc1018` was
   reconciled green for database, recovery, Quality and Vercel. Next independent
   disabled slice: retained result coverage/current-review/freshness projection;
   then authenticated human/MANUAL boundary, app/owner summary and isolated QA.
   No live research endpoint/pilot exists. Billing reuse waits actual MeterKit
   sandbox acceptance. Separate monitor PR109 and human launch gates remain separate.

No Production change, paid service, price change, buyer-consent bypass, hosted
migration/seed, protection disablement or customer billing activation occurred.
