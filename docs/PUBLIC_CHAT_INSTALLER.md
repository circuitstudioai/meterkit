# Public chatbot reference installer — October 25

Status: deterministic reference adapter and disposable standalone build/HTTP proof. PR8 remains draft. This is **not** a universal Next.js transform, real AI-planning receipt or hosted Auth/payment acceptance.

## Supported target and preparation

Start with a **separate disposable Git repository** containing the exact files from `examples/chatbot`, not the MeterKit monorepo itself. The adapter requires Next16.4.2, React/React DOM19.3.0, TypeScript, a build script and an explicitly installed `postgres:^3.4.9` dependency. Review/install dependencies and commit the resulting package/lockfile **before** planning. The installer never runs npm, installs packages, changes env files, migrates a database or activates hosting.

The exact reference page, layout and legacy chat/export handlers must match. Additional API routes, custom entry points and differing prices are blockers, not guessed transforms. Existing custom apps remain unsupported. Existing output files are never overwritten. The original unmetered example in this repository remains unchanged.

## Reviewed workflow

Keep the following policy and generated plan **outside** the target tree. This is the approved sandbox-only reference policy, not Production customer pricing:

```json
{"version":1,"mode":"sandbox","feature":"chat.reply","credits":5,"packs":[{"id":"sandbox-50","credits":50,"amountMinor":100,"currency":"USD"}]}
```

From the source MeterKit checkout:

```sh
node packages/cli/bin/meterkit.mjs plan /path/to/disposable-reference --policy=/tmp/public-policy.json --out=/tmp/public-plan.json
# Review ALL generated content, policy, limits, source fingerprint and approvalHash.
# Human approval of that exact plan is required for a non-fixture target.
node packages/cli/bin/meterkit.mjs apply /path/to/disposable-reference --plan=/tmp/public-plan.json --approve=EXACT_APPROVED_HASH
```

`--ai` remains an optional bounded advisory request using allowlisted metadata, never source/env files. No real AI planning request was executed for this checkpoint. Prices, trusted output and acceptance expectations remain deterministic. Apply rejects stale source/changed trusted output/tampering, requires a clean tree, and creates `meterkit/install-HASH` before writing; it never writes the current `main` branch.

## Generated integration

The diff replaces the reference UI with the opt-in Auth/balance/job surface and makes both old chat/export handlers return410 for every supported method. It adds the same tab-recovery client, server-owned UI gates and public alpha route. The audited billing engine, public identity/PayPal/service composition, additive schema and canonical branding are vendored as reviewable source; no unpublished MeterKit workspace packages are required. Vendored code is a snapshot, not automatic upstream updates. Existing model helper remains unused by the retired endpoints.

All API/UI gates remain disabled. No checkout is provided. Review [public API configuration](PUBLIC_CHAT_API.md) and [setup](SETUP.md) in the source checkout before any independently approved isolated activation. Do not run schema migration against Signal/customer data or create another paid project. Sandbox merchant/webhook and separate buyer approval plus actual two-user Auth/job/model/capture/event receipts remain required.

## Executed evidence

- Full `npm test` passes with the existing disposable loopback Postgres16 database: 33 billing contracts, nine installer contracts, two legacy transform contracts, ten SDK contracts, one dashboard contract,20 public client/config contracts, plus the separate disabled/retired-route checks. Database was stopped after testing.
- New installer cases cover standalone output, environment preservation, default refusal, exact sandbox price, unknown stack/source/API refusal, stale plans and ignored-file collision before branching. Existing source/hash/symlink safeguards remain in effect.
- `node scripts/verify-public-installer.mjs` creates a disposable standalone reference, explicitly prepares its dependencies, checks a no-edit plan, applies only to that fixture, builds with `npm run build -- --webpack` (including Next TypeScript), then verifies unavailable homepage,14 retired-route method responses and three disabled alpha method responses. It stops the local server and deletes the fixture. No credentials, hosted services, UI/API activation or model/payment requests are used.
- [Machine-readable local build/HTTP receipt](alpha-evidence/public-installer/results.json). It is not a live financial/Auth receipt. The immutable acceptance contracts remain in the original MeterKit suite, not generated or weakened by a model.

Initial new tests classified `app/globals.css` as an existing file, but the before-reference has none. Corrected it to an add-only output; all nine installer contracts now pass.

Remaining: hosted two-user Auth/job/model flow; real AI advisory/install receipt if required; merchant/webhook/buyer receipts; alpha-backed dashboard; isolated Command Center acceptance. No merge, Production activation or Devpost submission.
