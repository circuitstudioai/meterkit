# AI Spend Wallet — Architecture

## System overview

```
┌──────────────────────────────────────────────────────────────┐
│                     User Interface (Next.js)                  │
│  ┌─────────┐  ┌─────────┐  ┌──────────┐  ┌────────┐         │
│  │ Wallet  │  │Requests │  │Approvals │  │ Spend  │         │
│  │  Page   │  │  Page   │  │   Page   │  │ Table  │         │
│  └────┬────┘  └────┬────┘  └────┬─────┘  └───┬────┘         │
└───────┼───────────┼────────────┼────────────┼───────────────┘
        │           │            │            │
        ▼           ▼            ▼            ▼
┌──────────────────────────────────────────────────────────────┐
│                     API Layer (Next.js Route Handlers)        │
│  /api/paypal/*   /api/requests   /api/approvals   /api/audit │
└─────────┼────────────────┼────────────┼─────────────────────┘
          │                │            │
          │                ▼            │
          │      ┌──────────────────────┐
          │      │   Policy Agent       │
          │      │  Gemini 2.5 Flash    │  ← explains WHY
          │      │  Deterministic rules │  ← decides WHAT
          │      └──────────┬───────────┘
          ▼                 ▼
┌──────────────────────────────────────────────────────────────┐
│  PayPal sandbox (Orders + Payouts + webhooks)                │
│  SQLite locally  |  Supabase Postgres in production          │
└──────────────────────────────────────────────────────────────┘
```

**Rule:** Gemini explains. TypeScript in `lib/policy/decide.ts` is the only thing that can approve, route, or deny money movement.

## Request evaluation

1. Wallet balance — hard deny if insufficient
2. Company blocklist — hard deny
3. Department monthly cap — hard deny if exceeded
4. Per-request limit — route to approver if exceeded
5. Allowlist — route if the tool is new
6. Duplicate category — route if a similar tool already exists
7. Otherwise auto-approve

Gemini (`gemini-2.5-flash` via `@google/genai`) then writes a 2–3 sentence explanation. If `GEMINI_API_KEY` is missing or the call fails, `lib/policy/explain.ts` returns a canned sentence.

## Data model

```
companies
  ├── users (role: admin | employee | approver)
  ├── budget_ledger (balance tracking with PayPal IDs)
  ├── budget_limits (per-department caps)
  ├── policy_rules (allowlist / blocklist / duplicate_check)
  ├── purchase_requests (status workflow)
  └── audit_log (immutable event log)
```

SQLite schema: `db/schema.ts`  
Postgres schema: `db/schema-postgres.ts`  
`lib/db.ts` picks Postgres when `DATABASE_URL` is set (Supabase / Vercel), otherwise SQLite.

## PayPal

- **Top-up:** Orders v2 create → buyer approves in sandbox → capture → credit ledger
- **Payout:** Approver OKs a request → Payouts v1 batch → debit ledger
- **Webhook:** `POST /api/paypal/webhook` verifies `PAYPAL_WEBHOOK_ID` when present

Sandbox only. `PAYPAL_MODE` must stay `sandbox` for the hackathon.

## Hosting

| Environment | App | Database |
|-------------|-----|----------|
| Local | `npm run dev` on port 43123 | SQLite at `DATABASE_PATH` |
| Production | Vercel | Supabase Postgres (`DATABASE_URL`) |

SQL for Supabase lives in `supabase/migrations/`. Another agent with Supabase access should run those files, then set the env vars in Vercel.

## Layout

| Path | Role |
|------|------|
| `app/` | Pages and API routes |
| `lib/paypal/` | Sandbox REST client |
| `lib/policy/` | Deterministic rules + canned explanations |
| `lib/agent/` | Gemini classifier/explanation wrapper |
| `lib/env.ts` | Single place that reads env vars |
| `components/` | Navigation + shadcn/ui |
| `tests/` | Policy engine unit tests (no live DB) |

## Security

- Secrets only in env vars; `.env.local` is gitignored
- LLM never moves money
- Drizzle parameterized queries
- PayPal webhook signature check when `PAYPAL_WEBHOOK_ID` is set
