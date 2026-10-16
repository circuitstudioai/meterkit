# AI SPEND WALLET - Agent Conventions & Handoff Protocol

This document is for AI agents (including you!) who need to understand, maintain, or extend this codebase.

---

## 📋 Project Overview

**Name**: AI Spend Wallet  
**Purpose**: PayPal AI Hackathon 2026 submission  
**Status**: ✅ Core application complete, ready for deployment  
**Deadline**: November 12, 2026, 3:00 PM ET  
**License**: MIT (fully open source)

**What it does**: Companies fund an AI tool budget via PayPal. An AI agent evaluates purchase requests against policies and budgets *before* money moves. Auto-approve, route to approver, or deny.

---

## 🏗️ Architecture at a Glance

```
Frontend (Next.js) → API Routes → Policy Agent (Gemini + Rules) → PayPal APIs
                                           ↓
                                    Database (SQLite local / Postgres prod)
```

**Key Principle**: AI explains decisions, code enforces money rules.

---

## 📂 Directory Structure

```
ai-spend-wallet/
├── app/                    # Next.js 16 App Router
│   ├── api/               # API routes (REST endpoints)
│   │   ├── paypal/        # PayPal Orders, Payouts, Webhooks
│   │   ├── requests/      # Purchase request CRUD
│   │   ├── approvals/     # Approval workflow
│   │   ├── wallet/        # Wallet stats
│   │   ├── session/       # Demo role switching
│   │   └── audit/         # Audit log
│   ├── wallet/            # Wallet page (top-ups)
│   ├── requests/          # Request creation & history
│   ├── approvals/         # Approval queue
│   ├── spend/             # AG Grid spend table
│   └── audit/             # Audit log viewer
│
├── components/            # React components
│   ├── ui/               # shadcn/ui primitives (Button, Card, etc.)
│   └── navigation.tsx    # Main nav + role switcher
│
├── lib/                   # Core business logic (PURE FUNCTIONS)
│   ├── paypal/           
│   │   └── client.ts     # PayPal SDK wrapper (Orders, Payouts, OAuth)
│   ├── policy/           
│   │   └── rules-engine.ts # Deterministic budget/policy checks
│   ├── agent/            
│   │   └── policy-agent.ts # AI explanation generator (Gemini)
│   └── db.ts             # Database connection (auto-detects SQLite/Postgres)
│
├── db/                    # Database schemas & migrations
│   ├── schema.ts         # Drizzle ORM schema (SQLite)
│   ├── schema-postgres.ts# Drizzle ORM schema (Postgres)
│   ├── seed.ts           # Demo data seeder
│   └── migrations/       # SQLite migrations
│
├── supabase/              # Production database setup
│   └── migrations/       # Postgres SQL migrations (run in Supabase)
│
├── tests/                 # Unit tests (Jest)
│   └── policy-engine.test.ts
│
├── docs/                  # Documentation
│   ├── SETUP.md          # Step-by-step setup guide
│   ├── ARCHITECTURE.md   # Technical design doc
│   └── video-script.md   # 3-minute video outline
│
├── .env.example           # Environment variables template
├── AGENTS.md              # This file
├── README.md              # Main documentation
└── LICENSE                # MIT License
```

---

## 🔧 Technology Stack

| Layer | Tech | Why |
|-------|------|-----|
| **Frontend** | Next.js 16, React 19, TypeScript | Modern full-stack framework |
| **Styling** | Tailwind CSS, shadcn/ui | Fast UI development |
| **Database** | SQLite (local) / Postgres (prod) | Simple local, scalable prod |
| **ORM** | Drizzle ORM | Type-safe, fast, no overhead |
| **AI** | Google Gemini 2.0 Flash | Fast, cheap explanations |
| **Payments** | PayPal Orders & Payouts APIs | Hackathon requirement |
| **Data Grid** | AG Grid Community | Professional tables, MIT license |
| **Deployment** | Vercel + Supabase | Serverless + managed DB |

---

## 🗄️ Database Schema

### Tables (7 total)

1. **companies** - Organizations using the wallet
2. **users** - Employees, admins, approvers
3. **budget_ledger** - All wallet transactions (balance tracking)
4. **budget_limits** - Per-department spending caps
5. **policy_rules** - Allowlist, blocklist, duplicate checks
6. **purchase_requests** - Tool purchase requests (core entity)
7. **audit_log** - Immutable event log

### Key Relationships

```
companies (1) → (many) users
companies (1) → (many) purchase_requests
users (1) → (many) purchase_requests (as requester)
users (1) → (many) purchase_requests (as approver)
purchase_requests (1) → (many) audit_log
```

### Schema Files

- **SQLite**: `db/schema.ts` (used locally)
- **Postgres**: `db/schema-postgres.ts` (used on Supabase)
- **Auto-detection**: `lib/db.ts` checks `DATABASE_URL` env var

---

## 🔐 Environment Variables

See `.env.example` for the complete list. Key ones:

### Required for Production
- `DATABASE_URL` - Postgres connection (Supabase)
- `PAYPAL_CLIENT_ID` - PayPal sandbox app ID
- `PAYPAL_CLIENT_SECRET` - PayPal sandbox secret
- `NEXT_PUBLIC_APP_URL` - Your deployed URL

### Optional but Recommended
- `GEMINI_API_KEY` - For AI explanations (graceful fallback if missing)
- `PAYPAL_WEBHOOK_ID` - For webhook signature verification

### Detection Logic
```typescript
// lib/db.ts
const isProduction = !!process.env.DATABASE_URL;
// If DATABASE_URL exists → Postgres
// If not → SQLite (local dev)
```

---

## 🎯 Core Business Logic

### 1. Policy Rules Engine (`lib/policy/rules-engine.ts`)

**Function**: `checkPolicyRules(companyId, department, toolName, toolCategory, amount)`

**Returns**: 
```typescript
{
  decision: "auto_approve" | "route_to_approver" | "deny",
  reason: string,
  checks: {
    walletBalance: { pass: boolean, current: number, required: number },
    departmentMonthly: { pass: boolean, used: number, limit: number | null },
    perRequestLimit: { pass: boolean, amount: number, limit: number | null },
    blocklist: { pass: boolean, blocked: boolean },
    allowlist: { pass: boolean, onList: boolean },
    duplicateTool: { pass: boolean, existing: string[] }
  }
}
```

**Decision Logic** (deterministic, no AI):
1. ❌ **Deny if**: Insufficient wallet balance
2. ❌ **Deny if**: Tool on blocklist
3. ❌ **Deny if**: Exceeds department monthly limit
4. ⚠️ **Route if**: Exceeds per-request limit
5. ⚠️ **Route if**: Not on allowlist (new tool)
6. ⚠️ **Route if**: Potential duplicate in category
7. ✅ **Auto-approve**: All checks pass

**Critical**: This function MUST be deterministic. Never add AI calls here.

### 2. Policy Agent (`lib/agent/policy-agent.ts`)

**Function**: `evaluatePurchaseRequest(...)`

**Workflow**:
1. Call `checkPolicyRules()` → get deterministic decision
2. Call `generatePolicyExplanation()` → get AI explanation (or fallback)
3. Return combined result

**AI Model**: Google Gemini 2.5 Flash (`gemini-2.5-flash` via `@google/genai`)
- **Purpose**: Generate human-readable explanations
- **Not used for**: Decision-making (that's the rules engine's job)
- **Fallback**: If `GEMINI_API_KEY` missing → uses `generateMockExplanation()`

### 3. PayPal Client (`lib/paypal/client.ts`)

**Methods**:
- `getAccessToken()` - OAuth with caching
- `createOrder(amount)` - Top-up flow
- `captureOrder(orderId)` - Complete top-up
- `createPayout(email, amount, note)` - Vendor payment
- `getPayoutStatus(payoutBatchId)` - Check payout
- `verifyWebhookSignature(...)` - Webhook validation

**Important**: All methods use `PAYPAL_MODE=sandbox` - never change to `live`.

---

## 🚀 Common Tasks

### Add a New API Route

1. Create file: `app/api/your-route/route.ts`
2. Export `GET`, `POST`, `PUT`, `DELETE` as async functions:
   ```typescript
   export async function POST(request: NextRequest) {
     const body = await request.json();
     // ... logic ...
     return NextResponse.json({ success: true });
   }
   ```
3. Use `db` from `@/lib/db`
4. Add error handling with try/catch
5. Update `AGENTS.md` with new route

### Add a New UI Page

1. Create directory: `app/your-page/`
2. Add `page.tsx`:
   ```typescript
   "use client";
   
   export default function YourPage() {
     return <div>Content</div>;
   }
   ```
3. Add nav link in `components/navigation.tsx`
4. Test on `http://localhost:43123/your-page`

### Add a Policy Rule Type

1. Update `db/schema.ts` (or `schema-postgres.ts`):
   ```typescript
   // Add to policyRules table or create new table
   ```
2. Update `lib/policy/rules-engine.ts`:
   ```typescript
   // Add check logic
   const newCheck = await db.select()...
   ```
3. Update test: `tests/policy-engine.test.ts`
4. Generate migration: `npm run db:generate`
5. Apply: `npm run db:migrate`

### Run Database Migrations

**Local (SQLite)**:
```bash
npm run db:generate  # Generate from schema.ts
npm run db:migrate   # Apply to SQLite
npm run db:seed      # Add demo data
```

**Production (Postgres)**:
1. Copy SQL from `supabase/migrations/` to Supabase SQL Editor
2. Or set `DATABASE_URL` and run `DATABASE_URL=... npx drizzle-kit push`

---

## 🧪 Testing

### Run Tests

```bash
npm test                 # Run all tests
npm test -- --watch      # Watch mode
npm test -- --coverage   # With coverage
```

### Test Structure

```typescript
// tests/policy-engine.test.ts
describe("Policy Rules Engine", () => {
  beforeEach(async () => {
    // Set up test data
  });

  afterEach(async () => {
    // Clean up
  });

  it("should auto-approve request within limits", async () => {
    const result = await checkPolicyRules(...);
    expect(result.decision).toBe("auto_approve");
  });
});
```

### Writing New Tests

1. Create file in `tests/` directory
2. Use Jest + `@jest/globals`
3. Test business logic in `lib/` (not UI components)
4. Mock external APIs (PayPal, Gemini)

---

## 🔄 Git Workflow

### Branch Naming
- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation
- `refactor/description` - Code refactoring

### Commit Messages
Follow conventional commits:
```
feat: add agent-buyer API endpoint
fix: correct budget balance calculation
docs: update SETUP.md with Supabase steps
refactor: extract PayPal client to lib/
```

### Before Pushing
```bash
npm run build     # Ensure build works
npm test          # Ensure tests pass
npm run lint      # Fix linting issues
```

---

## 🐛 Debugging

### Check Database Connection

```typescript
// Add to any API route
console.log("Database mode:", process.env.DATABASE_URL ? "Postgres" : "SQLite");
```

### Check PayPal Requests

```typescript
// lib/paypal/client.ts already logs errors
// Check server logs for "PayPal auth failed", "PayPal order creation failed", etc.
```

### Check Gemini API

```typescript
// lib/agent/policy-agent.ts
// Falls back silently - check for "Error generating Gemini explanation" in logs
```

### Inspect Database (Local)

```bash
sqlite3 data/wallet.db
sqlite> .tables
sqlite> SELECT * FROM users;
sqlite> .quit
```

---

## 📝 Code Conventions

### TypeScript
- **Strict mode**: Enabled in `tsconfig.json`
- **No `any`**: Use proper types or `unknown`
- **Export types**: From schema files for reuse

### React Components
- **"use client"**: Required for client-side interactivity
- **Naming**: PascalCase for components (`YourComponent.tsx`)
- **Props**: Define interface above component

### API Routes
- **Error handling**: Always wrap in try/catch
- **Status codes**: 200 (success), 400 (bad request), 404 (not found), 500 (server error)
- **Validation**: Check required fields before processing

### Database Queries
- **Use Drizzle ORM**: Never write raw SQL
- **Type-safe**: Import schema types
- **Transactions**: Wrap related operations

Example:
```typescript
import { db } from "@/lib/db";
import { purchaseRequests } from "@/db/schema";
import { eq } from "drizzle-orm";

const [request] = await db
  .select()
  .from(purchaseRequests)
  .where(eq(purchaseRequests.id, requestId))
  .limit(1);
```

---

## 🚨 Common Pitfalls

### ❌ Don't Add LLM Calls to Rules Engine
The policy engine (`lib/policy/rules-engine.ts`) MUST be deterministic. AI is only for explanations in `policy-agent.ts`.

### ❌ Don't Commit Secrets
`.env.local` is gitignored. Never commit API keys or passwords.

### ❌ Don't Use Real PayPal Credentials
Always use sandbox mode. Check `PAYPAL_MODE=sandbox` is set.

### ❌ Don't Skip Error Handling
Every API route needs try/catch. Every database query can fail.

### ❌ Don't Modify Schema Without Migrations
Always run `npm run db:generate` after schema changes.

---

## ✅ Current Status

### Completed ✓
- [x] Core application (5 pages, 7 API routes)
- [x] PayPal Orders & Payouts integration
- [x] Google Gemini AI agent
- [x] Deterministic policy engine
- [x] SQLite (local) + Postgres (prod) support
- [x] Supabase migrations ready
- [x] AG Grid spend table
- [x] Complete audit trail
- [x] Demo data seeder
- [x] Unit test structure
- [x] Comprehensive documentation

### Open TODOs 📋

#### Before Deployment
- [ ] Add PayPal sandbox credentials to `.env.local`
- [ ] Add Gemini API key to `.env.local` (optional)
- [ ] Test end-to-end with real PayPal sandbox
- [ ] Run full test suite and fix any failures
- [ ] Build check: `npm run build` passes

#### For Production
- [ ] Create Supabase project
- [ ] Run Postgres migrations in Supabase
- [ ] Deploy to Vercel
- [ ] Set all environment variables in Vercel
- [ ] Configure PayPal webhook URL
- [ ] Test production deployment

#### For Submission
- [ ] Record 3-minute demo video (follow `docs/video-script.md`)
- [ ] Upload video to YouTube (Unlisted)
- [ ] Create Devpost submission
- [ ] Add screenshots to Devpost
- [ ] Submit before Nov 12, 3:00 PM ET

---

## 🤝 Working with Other Agents

### If You're Deploying
1. Read `docs/SETUP.md` (has exact steps)
2. Set up Supabase first (get `DATABASE_URL`)
3. Then Vercel (needs all env vars)
4. Test each service independently before full integration

### If You're Adding Features
1. Read `docs/ARCHITECTURE.md` (understand design)
2. Follow conventions in this file
3. Update `AGENTS.md` with your changes
4. Write tests for new logic
5. Update `README.md` if user-facing

### If You're Debugging
1. Check logs (server console)
2. Verify env vars are set
3. Test database connection
4. Test external APIs (PayPal, Gemini) independently
5. Ask for help in comments if stuck

---

## 📞 Getting Help

### Documentation
- `README.md` - User-facing overview
- `docs/SETUP.md` - Detailed setup steps
- `docs/ARCHITECTURE.md` - Technical design
- `AGENTS.md` - This file (you're reading it!)

### External Docs
- [Next.js Docs](https://nextjs.org/docs)
- [Drizzle ORM](https://orm.drizzle.team/docs)
- [PayPal REST APIs](https://developer.paypal.com/docs/api/overview/)
- [Google Gemini API](https://ai.google.dev/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Vercel Docs](https://vercel.com/docs)

### Debugging Steps
1. Read error message carefully
2. Check relevant env var is set
3. Check file exists at import path
4. Check database connection
5. Check external API credentials
6. Search error in docs
7. Add detailed logging
8. Ask in GitHub issues if public

---

## 🎯 Success Criteria

### Deployment Success
- [ ] App loads at Vercel URL
- [ ] Top-up redirects to PayPal and returns
- [ ] Purchase requests create successfully
- [ ] Approvals trigger payouts
- [ ] Spend table shows data
- [ ] No console errors

### Code Quality
- [ ] TypeScript strict mode passes
- [ ] Build completes without errors
- [ ] Tests pass (when implemented)
- [ ] No secrets in code
- [ ] Code follows conventions

### Documentation
- [ ] README is accurate
- [ ] SETUP.md has working instructions
- [ ] AGENTS.md reflects current state
- [ ] All TODOs are documented

---

## 🔄 Updating This File

**When to update `AGENTS.md`**:
- Added a new page or API route
- Changed database schema
- Modified core business logic
- Added/removed environment variables
- Completed a TODO
- Discovered a new pitfall

**How to update**:
1. Find relevant section above
2. Add/modify content
3. Update "Current Status" section
4. Commit with: `docs: update AGENTS.md with [change]`

---

## 📊 Project Metrics

- **Total Files**: ~60 source files
- **Lines of Code**: ~3,500 (excluding node_modules)
- **Database Tables**: 7
- **API Endpoints**: 7
- **UI Pages**: 5
- **Tests**: 1 test suite (expandable)
- **Documentation**: 4 major docs

---

**Last Updated**: October 16, 2026  
**Status**: ✅ Ready for deployment setup  
**Next Agent**: Should focus on Supabase + Vercel deployment

---

**Questions? Add them as GitHub issues or comments in the code.**

**Good luck! 🚀**

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
