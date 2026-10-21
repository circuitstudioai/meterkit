# MeterKit product requirements

This document is the contribution brief for other AI agents. It restates only what the current code and docs already say. Do not treat it as permission to invent features, pricing, or integrations.

**Sources:** [README.md](../README.md), [AGENTS.md](../AGENTS.md), [PROJECT_STATUS.md](../PROJECT_STATUS.md), [docs/ARCHITECTURE.md](ARCHITECTURE.md), [docs/SETUP.md](SETUP.md), [docs/video-script.md](video-script.md), plus the packages, dashboard, CLI, and example apps they describe.

Canonical repo: [github.com/circuitstudioai/meterkit](https://github.com/circuitstudioai/meterkit). Product name is the constant `BRAND` in [`packages/config/src/index.ts`](../packages/config/src/index.ts) — change it only there.

Hackathon: [PayPal AI Hackathon](https://paypalaihackathon.devpost.com/), deadline **Thu Nov 12, 2026, 12:00 PM PT**. MIT licensed. PayPal **sandbox only**. Never commit secrets or `.env.local`.

---

## Problem

Subscriptions do not match bursty AI usage. Every Gemini (or other LLM) call on an unmetered chatbot hits the *builder’s* card. Rolling your own credits, top-ups, and low-balance UX is easy to get wrong.

MeterKit’s answer is a **deterministic TypeScript ledger** (authoritative balance, idempotency, concurrency), **PayPal/Venmo top-up**, and **`npx meterkit init`**. The LLM never decides prices and never moves money. PayPal holds the money; MeterKit keeps a credit ledger only.

Tagline: **Prepaid credits for your app features.**

---

## Target users

Indie builders and app developers who want **pay-as-you-go billing for AI features** (and other metered features) without taking custody of funds.

- **Builder** (demo: `maya@studio.demo`, app **Northwind Chat**) — owns the app, the feature catalog, and the PayPal merchant/sandbox account. Sees apps, prices, balances, top-ups, usage, revenue, payouts, and the audit log in `@meterkit/dashboard`.
- **End user** (demo wallets: `user_alex`, `user_jordan`, `user_sam`) — prepaid credits, top-up with PayPal or Venmo where eligible, gets a low-balance prompt when credits run out.

An **agent** (or the builder at a terminal) installs MeterKit as a **reviewable git branch**. It never edits `main`.

---

## Product

Free, open-source toolkit (MIT, Circuit Studio) that wires a **prepaid PayPal/Venmo wallet** into any app feature — **AI calls first** — delivered as a **PR/branch**, not a silent edit of `main`. Funds **settle to the builder’s PayPal**. MeterKit does not take custody.

| Path | Package | Role |
|---|---|---|
| `packages/sdk` | `@meterkit/sdk` | `meter()`, `withMeter()`, ledger, catalog, `wrapOpenAI` / `wrapGemini`, PayPal webhook verify |
| `packages/react` | `@meterkit/react` | `<WalletBalance/>`, `<TopUpButton/>` (PayPal + Venmo), `<LowBalanceModal/>`, `WalletProvider` |
| `packages/cli` | `meterkit` | `npx meterkit init` — AST scan, dry-run default, new git branch on `--apply` |
| `apps/dashboard` | `@meterkit/dashboard` | Builder console: apps, prices, balances, top-ups, usage, revenue, payouts, audit (AG Grid on usage) |
| `examples/chatbot` | before | Unmetered Gemini chat + Export PDF |
| `examples/chatbot-metered` | after | Same app after init: wallet widgets, debit per message and export |

`apps/dashboard/legacy` is old spend-approval code and is **not in nav**.

### How money works

1. End user tops up with PayPal **Orders v2** (JS SDK Smart Buttons / Venmo where eligible; redirect fallback if the script is missing).
2. Capture + `PAYMENT.CAPTURE.COMPLETED` webhook credit the ledger (**idempotent**). Also logged: `CHECKOUT.ORDER.APPROVED`, `PAYMENT.PAYOUTS-ITEM.SUCCEEDED`, `PAYMENT.PAYOUTS-ITEM.FAILED`. Signatures verified with `PAYPAL_WEBHOOK_ID` via `@meterkit/sdk` `verifyPaypalWebhook`.
3. `meter('chat.message', { userId, units: 1 })` (or `withMeter`) debits **catalog-priced** credits. No negatives.
4. Builder cashes out with the **Payouts API**. Funds already sat in **their** PayPal.

Demo FX: **$1 USD = 50 credits** (`CREDITS_PER_USD` in the dashboard). Catalog `creditsPerUnit` is editable in the dashboard without redeploying the app.

Seeded demo prices (Northwind Chat):

| Feature key | Name | Credits / unit |
|---|---|---|
| `chat.message` | Chat message | 5 / message |
| `pdf.export` | Export PDF | 25 / export |
| `gemini.tokens` | Gemini tokens | 0.01 / token |

---

## Goals

1. Let a builder add prepaid metering to AI calls and other features through a reviewable branch from `npx meterkit init`.
2. Keep money in the builder’s PayPal account; MeterKit stores credit rows only (`BRAND.settlementNote`).
3. Keep ledger math in code, not in an LLM: debit only if `balance >= amount`; same `idempotencyKey` returns the original entry; conflicting key + payload errors; per-user mutex; `low_balance` when balance crosses the threshold.
4. Ship a hackathon-ready **before → agent install → after → dashboard → payout** demo (see Success criteria).
5. Stay sandbox-only, secret-free in git, and MIT.

---

## Core user flows

### 1. Builder installs MeterKit (CLI / agent)

```bash
npx meterkit init examples/chatbot            # dry-run plan (default)
npx meterkit init examples/chatbot --apply    # new branch only; never writes main
npx meterkit init --gemini                    # optional assist; AST transforms still default
npx meterkit init --feature=pdf.export
```

- Scans the target tree for OpenAI / Gemini (`@google/genai`) / Anthropic call sites (`generateContent`, `completions.create`, `messages.create`) and optional `--feature=` keys.
- Prints a plan of files and a PR body. Dry-run is the default.
- `--apply` creates a work branch (`meterkit/init-<timestamp>` unless `--branch=` or already off `main`/`master`) and **refuses to edit `main`/`master`**.
- Writes `.env.example` only (no secrets). **Opens no PR** unless someone pushes the branch; optional `gh pr create` after apply is an open TODO, not implemented.
- SDK wrappers: `wrapOpenAI` (token usage) and `wrapGemini` (`usageMetadata`). Anthropic is **detected** by the CLI; there is no `wrapAnthropic` export.

### 2. End user uses a metered feature (example chatbot)

Local ports: dashboard **43123**, unmetered chatbot **43124**, metered chatbot **43125** (expects dashboard API on 43123).

1. Open unmetered chat (`examples/chatbot`): message + export PDF, no wallet.
2. Open metered chat (`examples/chatbot-metered`) as `user_alex`: `<WalletBalance/>`, send a message (**5 credits**), export PDF (**25 credits**).
3. On insufficient credits the API returns **402**; UI opens `<LowBalanceModal/>`.
4. Top up with PayPal sandbox (or inspect seeded top-ups if keys are missing). Venmo is enabled on the JS SDK (`enable-funding=venmo`) where eligible.

Metered example uses SDK **`mode: "api"`** against the dashboard (`METERKIT_API_URL` / `NEXT_PUBLIC_METERKIT_API_URL`). Dashboard ledger is **self-hosted** on SQLite (local) or Postgres (production).

`withMeter` **debits first**, then runs the wrapped work.

### 3. Builder operates the dashboard

Nav: Overview, Apps, Features & prices, Balances, Top-ups, Usage, Revenue, Payouts, Audit.

- Edit catalog credits/unit (no app redeploy).
- Inspect AG Grid usage, revenue (top-up cash in vs credits consumed).
- Cash out to the builder PayPal sandbox email via Payouts.
- Audit log shows top-ups, debits, payouts, and verified PayPal webhook IDs.

Session is the first seeded builder (`maya@studio.demo`), not a login product.

### 4. Settlement

PayPal captures USD into the builder merchant account. MeterKit stores credit rows only. Without credentials the UI still loads seeded ledger data; live capture/payout fails until keys exist.

---

## Functional requirements

**Ledger (`@meterkit/sdk` `CreditLedger`)**

- Debit only if `balance >= amount`; debit amount must be `>= 0`.
- No negative balances; per-user mutex for concurrent debits.
- Idempotent credits/debits: same key returns the original entry; conflicting key + payload → `IdempotencyConflictError`.
- Emit `low_balance` when `balanceAfter <=` the user’s threshold (store default **100**; React `WalletProvider` default threshold **50**; seed uses 50 or 100 per user).
- Entry types: `topup`, `debit`, `adjust`.
- Feature price comes from the catalog (`creditsPerUnit`), not from the LLM.

**SDK surface**

- `createMeterKit` / `meter` / `withMeter` / `setDefaultMeterKit`.
- Modes: **`self-hosted`** (in-process `MemoryLedgerStore` or dashboard SQLite/Postgres store) and **`api`** (HTTP client to `/api/meter/*` on the dashboard: balance, credit, debit, prices).
- Errors: `InsufficientCreditsError` (HTTP 402 on dashboard debit), `FeatureNotPricedError`, `IdempotencyConflictError`.
- `wrapOpenAI`, `wrapGemini`, `verifyPaypalWebhook`.

**React widgets**

- Must be wrapped in `WalletProvider` (`userId`, `apiUrl`).
- Balance refresh hits `/api/meter/balance`.
- Top-up creates an order at `/api/paypal/create-order` and captures at `/api/paypal/capture`.

**PayPal (sandbox)**

- Orders v2 create/capture, JS SDK buttons (PayPal + Venmo), webhook verification, Payouts (builder cash-out).
- Env: `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_MODE=sandbox`, `PAYPAL_WEBHOOK_ID`, `NEXT_PUBLIC_PAYPAL_CLIENT_ID`.
- Webhook URL: `https://<vercel>/api/paypal/webhook`.

**Gemini**

- Optional `GEMINI_API_KEY`; model default `gemini-2.5-flash` (`GEMINI_MODEL`).
- Missing key → demo/canned text in example chatbots.
- Used for: example chatbot replies; optional CLI `--gemini` assist (AST still default); README also lists optional dashboard explanations — the **current dashboard nav does not call Gemini**; leftover spend-policy Gemini code lives under `apps/dashboard/legacy` (not in nav).

**Data / hosting**

- Local: SQLite via `DATABASE_PATH` (`./data/wallet.db`). Production must use Postgres (`DATABASE_URL`; `prepare: false`; pooler URI is fine).
- Production schema: run `apps/dashboard/supabase/migrations/20261017000000_meterkit.sql`.
- Deploy `apps/dashboard` on Vercel; set every var from `.env.example`; point `NEXT_PUBLIC_APP_URL` and PayPal return/webhook URLs at the Vercel host.

**Invariants (agents must not violate)**

- LLM never moves money.
- CLI never writes `main`.
- Dry-run is the default.
- Idempotent ledger, no negative balances.
- PayPal captures to the builder; we store credits only.
- No Circuit Signal / extension / Companion / roll-call content.

---

## Non-goals / out of scope

- **Live PayPal** — docs require sandbox only for this hackathon build.
- **Custody / Stripe / other processors** — not in the product; settlement is PayPal-only as implemented.
- **MeterKit taking a cut in the demo** — Revenue page: platform fee is **0% in this demo**. The 1–2% fee is documented monetization (see below), not collected in this codebase.
- **Pro dashboard** — called out as later; not a current nav surface.
- **CLI opening GitHub PRs** — not implemented; human pushes the branch.
- **Agents submitting to Devpost** — `AGENTS.md` / `PROJECT_STATUS.md`: do not submit from this agent.
- **Committing secrets** or printing token values.
- **Rewriting history** or editing `main` from the CLI.
- **Third-party music** on the hackathon video.
- **Re-activating `apps/dashboard/legacy` spend-approval** as product — not in nav.
- **Invented features** beyond this repo (new providers, auth products, live fee collection, etc.).

---

## Success criteria

Including the PayPal hackathon demo (deadline **Nov 12, 2026, 12:00 PM PT**).

Local demo (from `docs/SETUP.md` / `docs/video-script.md`, target **&lt; 3 min**, ~2:40, no secrets on screen):

1. **Hook:** “You shipped a chatbot. Every Gemini call hits *your* card. Subscriptions do not match bursty usage.”
2. Unmetered chatbot (`:43124`): send a message and export PDF — no wallet.
3. `npx meterkit init` (and `--apply`): show the plan (Gemini + `pdf.export`); new branch, never `main`.
4. Metered chat (`:43125`): balance widget, message debit (**5** credits as `user_alex`), PDF debit (**25**), low-balance modal, PayPal/Venmo top-up.
5. Dashboard (`:43123`): apps, catalog edit, AG Grid usage, revenue, payout to builder sandbox; audit log PayPal IDs.
6. Close: LLM explains/scans, **code meters**. PayPal holds the money. Super: github + MeterKit + PayPal AI Hackathon 2026.

Engineering bar already in-repo:

- `npm test` (all workspaces), `npm run build` (dashboard + examples), `npm run db:seed`.
- UI loads seeded data without PayPal/Gemini keys; live capture/payout waits on human-held sandbox credentials.

Human leftover (not agent-submit): PayPal sandbox credentials, Gemini key, Supabase/Vercel hosting, video from `docs/video-script.md`, Devpost.

---

## Monetization

From `BRAND.feeNote` / README:

> Free to start. 1–2% platform fee on top-ups above about $1,000/month. Pro dashboard later.

The **open-source SDK, CLI, React widgets, and dashboard** are free (MIT). The documented platform fee is **not implemented** in ledger math; the Revenue screen states **0% platform fee in this demo**. “Pro dashboard later” is a stated follow-on, not a current module.

---

## Circuit Studio standard stack

Circuit Studio’s standard app stack is: **Gemini** via `GEMINI_API_KEY` in **Vercel** env, called **directly**; **Vercel** hosting; **Supabase** as DB/backend; **Supabase Auth**.

Where MeterKit matches or differs:

| Standard | MeterKit today |
|---|---|
| Gemini + `GEMINI_API_KEY`, called directly | **Matches** in example apps (`@google/genai`, default `gemini-2.5-flash`). Optional on CLI. Dashboard env reads the same key; live nav does not call Gemini. Missing key → canned/demo text. |
| Vercel | **Matches** for `apps/dashboard` (SETUP: deploy dashboard on Vercel, set `.env.example` vars, point app/PayPal URLs at the host). |
| Supabase DB/backend | **Partial match.** Production DB is **Supabase Postgres** (`DATABASE_URL` + `apps/dashboard/supabase/migrations/20261017000000_meterkit.sql`). Backend is **Next.js API routes** in the dashboard, not a separate Supabase functions app. Local-only **SQLite** (`DATABASE_PATH`) is the default without `DATABASE_URL`. |
| Supabase Auth | **Differs.** `.env.example` lists `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`, but application code does not use them. `/api/session` returns the first `builders` row (demo `maya@studio.demo`). |
| (not in the standard list) | **PayPal sandbox** Orders / Buttons / Venmo / Webhooks / Payouts is additional MeterKit surface. |

---

## Open questions

These are already called out in-repo as leftover human/agent work — not new product bets:

1. Real PayPal sandbox + Gemini keys (owner: Abhishek per `AGENTS.md`).
2. Hosted Vercel + Supabase (production `DATABASE_URL`, webhook URL, `NEXT_PUBLIC_APP_URL`).
3. Should `npx meterkit init --apply` optionally run `gh pr create`, or keep “push the branch yourself”?
4. Record the hackathon video from `docs/video-script.md`.
5. Devpost submission — humans only; agents must not submit.
6. When (if ever) to collect the documented 1–2% fee above ~$1,000/month, and what “Pro dashboard later” contains.
7. Whether dashboard Gemini “explanations” from the README become a live nav feature, or stay unused except in `legacy/`.
8. Working name is MeterKit; any rename goes only through `packages/config/src/index.ts`.

---

## Agent working agreement

```bash
npm install
npm test
npm run build
npm run db:seed
npm run dev                 # :43123
npx meterkit init           # dry-run
```

Do not submit to Devpost. Sandbox only. Never commit secrets. Do not invent features this PRD does not already ground in code or the listed docs.
