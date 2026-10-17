# MeterKit

**Add pay-as-you-go to any feature in 60 seconds.**

An open-source toolkit for the [PayPal AI Hackathon](https://paypalaihackathon.devpost.com/) (deadline **Thu Nov 12, 2026, 12:00 PM PT**). Builders drop a prepaid wallet onto AI calls or any metered feature. An agent installs it as a reviewable branch — never by editing `main`.

The product name lives in one constant: [`packages/config/src/index.ts`](packages/config/src/index.ts).

MIT licensed. PayPal **sandbox only**. No custody: PayPal captures into the **builder's** account; MeterKit only keeps the credit ledger.

## Why

Subscriptions do not match bursty AI usage. Rolling your own credits, top-ups, and low-balance UX is easy to get wrong. MeterKit gives you a deterministic ledger, PayPal/Venmo top-up, and `npx meterkit init`.

**Pricing:** free to start. 1–2% fee on top-ups above about $1,000/month. Pro dashboard later.

## What's in the monorepo

| Path | Package | Role |
|---|---|---|
| `packages/sdk` | `@meterkit/sdk` | `meter()`, `withMeter()`, ledger, catalog, OpenAI/Gemini wrappers |
| `packages/react` | `@meterkit/react` | `<WalletBalance/>`, `<TopUpButton/>` (PayPal + Venmo), `<LowBalanceModal/>` |
| `packages/cli` | `meterkit` | `npx meterkit init` — AST scan, dry-run, new git branch |
| `apps/dashboard` | `@meterkit/dashboard` | Builder console: apps, prices, balances, top-ups, usage, payouts |
| `examples/chatbot` | before | Unmetered Gemini chat + Export PDF |
| `examples/chatbot-metered` | after | Same app after init: top-up prompt, debit per message and export |

## Quick start

```bash
npm install
npm run db:seed
npm run dev                 # dashboard  http://localhost:43123
npm run dev:chatbot         # before     http://localhost:43124
npm run dev:chatbot-metered # after      http://localhost:43125
```

Demo builder: `maya@studio.demo` (Northwind Chat). End-user wallets: `user_alex`, `user_jordan`, `user_sam`.

```bash
npx meterkit init examples/chatbot            # dry-run plan
npx meterkit init examples/chatbot --apply    # new branch only
```

## How money works

1. End user tops up with PayPal Orders v2 (Smart Buttons / Venmo where eligible).
2. Capture + `PAYMENT.CAPTURE.COMPLETED` webhook credit the ledger (idempotent).
3. `meter('chat.message', { userId, units: 1 })` debits catalog-priced credits. No negatives.
4. Builder cashes out with the Payouts API. Funds already sat in **their** PayPal.

The LLM never decides prices. Catalog credits-per-unit can change without redeploying the app.

## AI tools used

| Tool | How |
|---|---|
| **Google Gemini 2.5 Flash** (`@google/genai`) | Dashboard explanations (optional); example chatbot replies; optional CLI assist for ambiguous call sites |
| **OpenAI / Anthropic SDKs** | Detected and wrappable by the CLI; not required at runtime |
| **Deterministic TypeScript ledger** | Authoritative balance, idempotency, concurrency |

## PayPal products

Orders v2 create/capture, JS SDK buttons (PayPal + Venmo), webhook verification, Payouts (builder cash-out). Sandbox only.

## Docs

- [docs/SETUP.md](docs/SETUP.md)
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- [docs/video-script.md](docs/video-script.md)
- [AGENTS.md](AGENTS.md)

## License

MIT — see [LICENSE](LICENSE).
