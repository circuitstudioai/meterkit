# MeterKit architecture

Canonical repo: [github.com/circuitstudioai/meterkit](https://github.com/circuitstudioai/meterkit)

Rename the product in `packages/config/src/index.ts` only.

```
Builder repo                    MeterKit
────────────                    ────────
npx meterkit init ──AST──► wrap OpenAI/Gemini/Anthropic
        │
        ▼
  @meterkit/sdk                 apps/dashboard
  meter / withMeter             catalog · ledger · AG Grid
        │                              │
        ▼                              ▼
  @meterkit/react               PayPal sandbox
  balance · top-up · modal      Orders · Buttons/Venmo · Webhooks · Payouts
```

## Ledger rules (code, not LLM)

- Debit only if `balance >= amount`
- Same `idempotencyKey` returns the original entry
- Conflicting key + payload → error
- Per-user mutex so concurrent debits cannot go negative
- `low_balance` event when balance crosses the threshold
- Feature price comes from the catalog (`creditsPerUnit`), editable in the dashboard without redeploy

## Modes

- **self-hosted:** in-process `MemoryLedgerStore` or the dashboard SQLite/Postgres store
- **api:** thin HTTP client to `/api/meter/*` on the dashboard

## Settlement

PayPal captures USD into the builder merchant account. MeterKit stores credit rows only. See `BRAND.settlementNote`.

## Monorepo

npm workspaces: `apps/*`, `packages/*`, `examples/*`. Dashboard port **43123**.
