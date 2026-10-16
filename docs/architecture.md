# AI Spend Wallet - Architecture

## System Overview

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
│                     API Layer (Next.js)                       │
│  ┌─────────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐  │
│  │   PayPal    │  │ Purchase │  │Approvals │  │  Audit  │  │
│  │  Top-up/    │  │ Request  │  │          │  │   Log   │  │
│  │   Payout    │  │  Handler │  │  Handler │  │         │  │
│  └──────┬──────┘  └─────┬────┘  └────┬─────┘  └─────────┘  │
└─────────┼────────────────┼────────────┼─────────────────────┘
          │                │            │
          │                ▼            │
          │      ┌──────────────────────┐         │
          │      │   Policy Agent       │         │
          │      │  ┌───────────────┐   │         │
          │      │  │ LLM Explainer │   │         │
          │      │  │  (GPT-4o-mini)│   │         │
          │      │  └───────────────┘   │         │
          │      │  ┌───────────────┐   │         │
          │      │  │ Deterministic │   │         │
          │      │  │ Policy Engine │   │         │
          │      │  │  (TypeScript) │   │         │
          │      │  └───────────────┘   │         │
          │      └──────────┬───────────┘         │
          │                 │                     │
          ▼                 ▼                     ▼
┌──────────────────────────────────────────────────────────────┐
│                   Storage Layer                               │
│  ┌─────────────────┐          ┌──────────────────────────┐   │
│  │  PayPal Sandbox │          │   SQLite Database        │   │
│  │  • Orders API   │          │   • Companies            │   │
│  │  • Payouts API  │          │   • Users                │   │
│  │  • Webhooks     │          │   • Budget Ledger        │   │
│  │                 │          │   • Purchase Requests    │   │
│  │                 │          │   • Budget Limits        │   │
│  │                 │          │   • Policy Rules         │   │
│  │                 │          │   • Audit Log            │   │
│  └─────────────────┘          └──────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

## Decision Flow

### Request Evaluation

```
Employee/Agent Request
         │
         ▼
┌────────────────────────────┐
│  Deterministic Checks      │
│  (Authoritative)           │
├────────────────────────────┤
│ 1. Wallet Balance         │◄─── Hard Requirement
│ 2. Department Monthly Cap │◄─── Hard Limit
│ 3. Per-Request Limit      │◄─── Hard Limit
│ 4. Blocklist Check        │◄─── Hard Block
│ 5. Allowlist Check        │◄─── Routing Signal
│ 6. Duplicate Detection    │◄─── Routing Signal
└────────┬───────────────────┘
         │
         ▼
    Decision Point
         │
    ┌────┼────┐
    │    │    │
    ▼    ▼    ▼
  DENY ROUTE AUTO
        │   APPROVE
        │    │
        ▼    │
    ┌───────┴────┐
    │  Approver  │
    │  Reviews   │
    └──────┬─────┘
           │
           ▼
      ┌─────────┐
      │ LLM     │
      │ explains│◄─── Advisory Only
      │ decision│
      └─────────┘
           │
           ▼
    ┌──────────────┐
    │ PayPal       │
    │ Payout       │
    │ (if approved)│
    └──────────────┘
```

### Key Principles

1. **Code Decides Money**: All budget enforcement happens in TypeScript, not AI
2. **AI Explains**: LLM adds transparency by generating plain-English explanations
3. **Immutable Audit**: Every action logged with PayPal transaction IDs
4. **Fail-Safe**: System fails secure (deny) if checks cannot complete

## Data Model

```
companies
  ├── users (role: admin | employee | approver)
  ├── budget_ledger (balance tracking with PayPal IDs)
  ├── budget_limits (per-department caps)
  ├── policy_rules (allowlist/blocklist/duplicate_check)
  ├── purchase_requests (status workflow)
  └── audit_log (immutable event log)
```

## PayPal Integration Points

### Top-up Flow
1. User clicks "Top Up" → creates PayPal Order
2. Redirects to PayPal → user approves
3. Returns to app → captures order
4. Credits budget ledger with transaction ID

### Payout Flow
1. Request approved → creates PayPal Payout batch
2. Payout processed asynchronously
3. Debits budget ledger with payout batch ID
4. Logs to audit trail

### Webhook (Optional Enhancement)
- Receives async notifications from PayPal
- Verifies signature
- Updates request status

## Technology Choices

### Why SQLite?
- Simple deployment (no separate DB server)
- Sufficient for demo and small/medium deployments
- Easy to migrate to Postgres later if needed

### Why GPT-4o-mini?
- Cost-efficient: ~$0.15 per million tokens
- Fast response times for explanations
- Good enough for structured JSON output
- Easy to swap for cheaper alternatives (OpenRouter, etc.)

### Why AG Grid Community?
- MIT licensed (fully open source)
- Rich features: filtering, sorting, grouping, CSV export
- No runtime costs
- Professional data tables without custom code

### Why Next.js?
- Single codebase for frontend + API
- Server-side rendering for fast initial load
- Easy deployment to Vercel/Render
- Built-in API routes

## Security Considerations

1. **PayPal Credentials**: Sandbox-only, stored in env vars
2. **No Authentication**: Demo uses role-switching; production would add auth
3. **Input Validation**: Zod schemas on API routes (recommended addition)
4. **SQL Injection**: Protected by Drizzle ORM parameterized queries
5. **LLM Prompt Injection**: LLM only generates explanations, never controls money

## Scalability Path

### Current: Single SQLite File
- **Good for**: <100 users, <10K transactions
- **Deployment**: Single Node.js process

### Phase 2: Postgres + Redis
- **Good for**: <10K users, <1M transactions
- **Changes**: 
  - Migrate to Postgres (Drizzle supports it)
  - Add Redis for session management
  - Horizontal scale API servers

### Phase 3: Multi-tenant SaaS
- **Good for**: Unlimited companies
- **Changes**:
  - Row-level security in DB
  - Company isolation
  - Background job queue for payouts
  - Separate PayPal apps per company

## Testing Strategy

1. **Unit Tests**: Policy engine deterministic checks (Jest)
2. **Integration Tests**: API routes with test DB (Jest + Supertest)
3. **E2E Tests**: Full flows with PayPal sandbox (Playwright)
4. **Manual QA**: Video recording scenarios with screen capture

## Deployment

### Development
```bash
npm run dev
```
Runs on http://localhost:43123

### Production (Vercel)
```bash
vercel deploy
```
Requires:
- Environment variables set in Vercel dashboard
- SQLite in /tmp (or migrate to Vercel Postgres)

### Production (Render)
- Add `render.yaml` for web service + Postgres
- Connects to Render Postgres automatically
