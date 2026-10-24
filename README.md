# MeterKit

**Install PayPal credits. Verify the failure cases.**

MeterKit is an alpha integration toolkit for prepaid AI features. It produces a reviewable branch and checks billing failures independently of generated code. First supported adapter: Command Center’s Vite/React + Supabase stack. This is not yet a universal installer.

[PRD](docs/PRD.md) · [milestones](docs/ALPHA_MILESTONES.md) · [setup](docs/SETUP.md) · [acceptance evidence](docs/ALPHA_TESTING.md)

## Start

```sh
npm ci
# Use a disposable Postgres database named meterkit_test. Contracts truncate alpha tables there.
METERKIT_TEST_DATABASE_URL=postgres://USER:PASSWORD@localhost:5432/meterkit_test npm test
npm run typecheck -w @meterkit/billing
npm run build
```

Create an explicit demo policy using docs/SETUP.md. Inspect the entire plan before applying:

```sh
node packages/cli/bin/meterkit.mjs plan /path/to/command-center --policy=/tmp/policy.json --out=/tmp/plan.json
# Optional --ai calls Gemini with allowlisted metadata, never source bodies or secrets.
node packages/cli/bin/meterkit.mjs apply /path/to/command-center --plan=/tmp/plan.json --approve=EXACT_PLAN_HASH
```

Default dry-run. Apply requires a clean tree, an exact reviewed hash and unchanged source. It creates a new branch, preserves environment files and installs a disabled alpha route. Installation alone is not payment acceptance.

## Billing rules

- Postgres locks wallets across service instances; integer credits cannot go negative.
- Reserve before billable work; persist result and settle atomically. Confirmed failures release credits. Unknown outcomes remain held for recovery.
- The server binds a catalog pack to workspace, merchant, amount and currency. Completed PayPal capture must match. Capture/webhook retries cannot fund twice.
- Supabase verifies user, workspace membership, editing permission and the Savings module. Client prices must match the server before reservation.
- AI explains existing calculations; it cannot set prices, change access, write balances or make purchases.

## Current boundaries

PayPal **sandbox only**. Captures settle directly to the builder merchant; MeterKit stores app credits. No Payouts, custody, live money, platform fee or production activation. Commercial pricing is undecided.

Legacy dashboard, SDK and chatbot examples remain in the repository for historical comparison. Their old demo APIs are **not** the new authenticated alpha billing service. Use only `/api/alpha/*` for the alpha; it fails closed until configured.

MIT · Circuit Studio · [PayPal AI Hackathon](https://paypalaihackathon.devpost.com/). No automatic Devpost submission.
