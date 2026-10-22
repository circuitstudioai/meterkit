# MeterKit — agent notes

Canonical repo: [github.com/circuitstudioai/meterkit](https://github.com/circuitstudioai/meterkit)

Product spec for contributing agents: [docs/PRD.md](docs/PRD.md). Stay inside what that document and this repo already say.

Working name is **MeterKit**. Change it only in `packages/config/src/index.ts`.

Hackathon deadline: **Nov 12, 2026, 12:00 PM PT**. Do not submit to Devpost. Sandbox only. Never commit secrets. Command Center is permitted only as an isolated first alpha integration. Do not merge unrelated Signal features, activate production billing, or change free-core behavior.

## Commands

```bash
npm install
npm test                 # all workspaces
npm run build            # dashboard + examples
npm run dev              # :43123 dashboard
npm run db:seed          # Northwind Chat demo
npx meterkit init        # dry-run
```

## Layout

- `packages/sdk` — ledger, meter, wrappers, webhook verify
- `packages/react` — wallet widgets
- `packages/cli` — AST init
- `apps/dashboard` — builder console
- `apps/dashboard/legacy` — old spend-approval code (not in nav)
- `examples/chatbot` — before
- `examples/chatbot-metered` — after

## Invariants

- LLM never moves money
- CLI never writes `main`
- Dry-run is the default
- Idempotent ledger, no negative balances
- PayPal captures to the builder; we store credits only

## Alpha execution

The 2026-10-22 PRD supersedes original wallet-demo claims. Follow docs/ALPHA_MILESTONES.md. New billing code must use transactional Postgres and deterministic acceptance tests. Legacy demo APIs are not the alpha payment backend. Never call fixture evidence live PayPal/model acceptance.

## Historical demo TODOs

- Real PayPal + Gemini keys (Abhishek)
- Hosted Vercel + Supabase
- Optional `gh pr create` after CLI apply
- Video record from `docs/video-script.md`
