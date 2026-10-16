# AI Spend Wallet

**By Circuit Studio**

An open-source wallet where companies fund their AI tool budget via PayPal, and an AI agent enforces budgets, policies, and approvals *before* any AI spend is paid.

Built for the [PayPal AI Hackathon](https://paypalaihackathon.devpost.com/).

## 🎯 What It Does

AI Spend Wallet solves the problem of uncontrolled AI tool spending in companies. It provides:

1. **PayPal Sandbox Top-ups**: Finance admins fund the wallet using PayPal Orders API
2. **Smart Request System**: Employees request AI tool purchases through a simple form
3. **AI Policy Agent**: Automatically evaluates requests against company policies
4. **Deterministic Budget Rules**: Code (not AI) makes the final money decisions
5. **Approval Workflows**: Routes requests to approvers when needed
6. **PayPal Payouts**: Automated vendor payments through PayPal sandbox
7. **Comprehensive Audit Trail**: Every decision logged with PayPal transaction IDs
8. **AG Grid Spend Table**: Interactive spending analysis with filtering and exports
9. **Agent-Buyer API**: AI agents can request purchases programmatically

## 🚀 Live Demo

**Demo URL**: [Will be added after deployment]

**Demo Accounts** (switch roles in the top-right dropdown):
- **Finance Admin**: `admin@northwind.demo` - Top up wallet, view all spending
- **Employee**: `employee@northwind.demo` - Request tool purchases
- **Approver**: `approver@northwind.demo` - Review and approve/deny requests

## 🏗️ Architecture

```
┌─────────────────┐
│   Employee      │
│  (or AI Agent)  │
└────────┬────────┘
         │ 1. Request Purchase
         ▼
┌─────────────────────────────┐
│   AI Policy Agent           │
│  ┌─────────────────────┐   │
│  │ LLM Explanation     │   │
│  │ (GPT-4o-mini)      │   │
│  └─────────────────────┘   │
│  ┌─────────────────────┐   │
│  │ Deterministic Rules │   │
│  │ • Budget checks     │   │
│  │ • Limit enforcement │   │
│  │ • Policy matching   │   │
│  └─────────────────────┘   │
└────────┬────────────────────┘
         │ 2. Decision
         ▼
    ┌────────────┐
    │ Auto-Approve│──────┐
    │ Route to    │      │
    │ Approver    │──┐   │
    │ Deny        │  │   │
    └─────────────┘  │   │
                     │   │
         ┌───────────┘   │
         ▼               ▼
    ┌──────────┐   ┌──────────┐
    │ Approver │   │ PayPal   │
    │ Reviews  │   │ Payout   │
    └────┬─────┘   └────┬─────┘
         │              │
         └──────┬───────┘
                ▼
         ┌─────────────┐
         │ Audit Log + │
         │ Budget      │
         │ Ledger      │
         └─────────────┘
```

**Key Design Principle**: The AI provides explanations and classifications, but deterministic code makes all money decisions. This ensures reliability and auditability.

## 📦 Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Database**: SQLite with Drizzle ORM
- **PayPal APIs**:
  - Orders v2 (top-up payments)
  - Payouts v1 (vendor payments)
  - Webhooks (payment confirmations)
- **LLM**: OpenAI-compatible API (GPT-4o-mini for cost efficiency)
- **Data Grid**: AG Grid Community Edition (MIT license)

## 🛠️ Setup Instructions

### Prerequisites

- Node.js 18+ and npm
- PayPal Developer Account ([sign up here](https://developer.paypal.com/))

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd ai-spend-wallet
npm install
```

### 2. PayPal Sandbox Setup

1. Go to [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/)
2. Navigate to **Apps & Credentials** → **Sandbox**
3. Create a new app or use the default
4. Copy your **Client ID** and **Secret**
5. Create sandbox test accounts:
   - One **Business** account (for receiving payouts)
   - One **Personal** account (for making payments)

### 3. Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your credentials:

```env
# Database
DATABASE_PATH=./data/wallet.db

# PayPal Sandbox Credentials
PAYPAL_CLIENT_ID=your_sandbox_client_id
PAYPAL_CLIENT_SECRET=your_sandbox_client_secret
PAYPAL_MODE=sandbox
PAYPAL_WEBHOOK_ID=your_webhook_id

# LLM API (for policy agent explanations)
LLM_API_KEY=your_openai_api_key
LLM_API_URL=https://api.openai.com/v1
LLM_MODEL=gpt-4o-mini

# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:43123
```

**Note**: For the LLM API, you can use:
- OpenAI directly
- OpenRouter ([openrouter.ai](https://openrouter.ai/)) for cheaper alternatives
- Together AI ([together.ai](https://together.ai/))
- Or set `LLM_API_KEY=mock_api_key` to use mock explanations (no API calls)

### 4. Database Setup

```bash
npm run db:generate  # Generate migrations
npm run db:migrate   # Apply migrations
npm run db:seed      # Seed demo data
```

This creates:
- **Northwind Labs** demo company
- 5 demo users with different roles
- $10,000 initial wallet balance
- Sample budget limits and policy rules
- 3 historical transactions

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:43123](http://localhost:43123) in your browser.

### 6. Testing PayPal Integration

1. **Top Up Wallet**:
   - Switch to Admin role
   - Go to Wallet page
   - Enter amount (e.g., $100)
   - Click "Top Up with PayPal"
   - Log in with your PayPal sandbox **Personal** account
   - Complete the payment

2. **Request Purchase**:
   - Switch to Employee role
   - Go to Requests page
   - Click "New Request"
   - Fill in tool details (e.g., "ChatGPT Plus", $20)
   - Submit and see the policy agent's decision

3. **Approve & Pay**:
   - Switch to Approver role (if request requires approval)
   - Go to Approvals page
   - Review request and click "Approve & Pay"
   - Payout will be sent to vendor's PayPal sandbox account

## 🤖 AI Tools Used

### 1. **GPT-4o-mini** (OpenAI)
- **Purpose**: Policy explanation generation
- **How Used**: After deterministic rules evaluate a purchase request, GPT-4o-mini generates human-readable explanations of the decision for stakeholders
- **Why**: Cost-efficient model (~$0.15 per million tokens) suitable for short explanations
- **Key Feature**: JSON-schema output for structured responses
- **Integration**: OpenAI-compatible REST API in `/lib/agent/policy-agent.ts`

### 2. **Deterministic Policy Engine** (Code-based)
- **Purpose**: Authoritative budget and policy decisions
- **How Used**: 
  - Checks wallet balance (hard requirement)
  - Enforces department monthly limits
  - Validates per-request limits
  - Matches against blocklists/allowlists
  - Detects duplicate tools in same category
- **Why**: Money decisions must be deterministic and auditable, not subject to LLM variability
- **Integration**: Pure TypeScript in `/lib/policy/rules-engine.ts`

**Decision Flow**:
1. Deterministic engine produces: `auto_approve` | `route_to_approver` | `deny`
2. LLM explains *why* that decision was made
3. Code executes the money movement (never the LLM)

This architecture ensures the AI enhances transparency without controlling funds.

## 🎬 Video Script Outline (3 minutes)

### Act 1: The Problem (0:00-0:20)
*Visual: Montage of AI tool websites, credit card payments, confused finance team*

**Narration**: "Every team is buying AI tools. ChatGPT subscriptions. Midjourney licenses. API credits. Now AI agents are making purchases too. Who's tracking this? Who's in control?"

### Act 2: Fund the Wallet (0:20-0:45)
*Visual: Screen recording - Admin logs in, tops up $500 via PayPal sandbox*

**Narration**: "Meet AI Spend Wallet. Finance sets the budget—directly through PayPal. Watch: $500 added to the company wallet. Instant, secure, tracked."

### Act 3: Smart Approvals (0:45-1:25)
*Visual: Screen recording - Three request scenarios*

**Narration**: "Jordan requests ChatGPT Plus. Policy agent checks: budget OK, tool on allowlist—auto-approved. Next, Jordan wants Midjourney, but Marketing already pays for DALL-E. Routed to Sam for approval. Now Jordan tries a $5,000 tool. Denied—exceeds department limit. Every decision: policy-based, auditable."

### Act 4: AI Buying AI (1:25-1:55)
*Visual: Terminal/API call, then screen showing agent request in approvals queue*

**Narration**: "Here's where it gets interesting. An AI agent requests $200 in API credits—via our API. Policy agent evaluates it like any purchase. Over limit? Sam approves. Boom—agents buying tools, with governance."

### Act 5: The Dashboard (1:55-2:20)
*Visual: AG Grid table - filtering, grouping, export to CSV*

**Narration**: "Track everything in real-time. Filter by department, tool, or date. Export to CSV. Every transaction stamped with a PayPal ID."

### Act 6: The Architecture & Close (2:20-2:40)
*Visual: Architecture diagram from README*

**Narration**: "How does it work? The AI explains decisions, but deterministic code controls the money. Budget checks, limit enforcement, policy matching—all in code. The LLM adds transparency, not risk. Open source. MIT licensed. Built on PayPal's platform. AI Spend Wallet: governance for the AI economy."

**Text on screen**: 
```
AI Spend Wallet
github.com/[your-repo]
Built for PayPal AI Hackathon
```

## 📋 PayPal APIs Used

### 1. Orders v2 API
- **Purpose**: Wallet top-ups
- **Endpoints**:
  - `POST /v2/checkout/orders` - Create order
  - `POST /v2/checkout/orders/{id}/capture` - Capture payment
- **Integration**: `/lib/paypal/client.ts` + `/app/api/paypal/*`

### 2. Payouts v1 API
- **Purpose**: Vendor payments
- **Endpoints**:
  - `POST /v1/payments/payouts` - Create payout batch
  - `GET /v1/payments/payouts/{id}` - Check payout status
- **Integration**: `/lib/paypal/client.ts` + `/app/api/approvals/route.ts`

### 3. OAuth 2.0
- **Purpose**: API authentication
- **Endpoint**: `POST /v1/oauth2/token`
- **Implementation**: Token caching with auto-refresh

### 4. Webhooks (Planned)
- **Purpose**: Async payment confirmations
- **Endpoint**: `POST /v1/notifications/verify-webhook-signature`
- **Status**: Structure ready in `/app/api/paypal/webhook/route.ts`

## 🧪 Testing

Run policy engine unit tests:

```bash
npm run test
```

Test suite includes:
- Budget limit enforcement
- Department monthly caps
- Per-request limit validation
- Blocklist/allowlist matching
- Duplicate tool detection

## 📁 Project Structure

```
ai-spend-wallet/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   │   ├── paypal/        # PayPal integration
│   │   ├── requests/      # Purchase requests
│   │   ├── approvals/     # Approval workflow
│   │   └── audit/         # Audit logs
│   ├── wallet/            # Wallet management page
│   ├── requests/          # Request history page
│   ├── approvals/         # Approvals queue page
│   ├── spend/             # AG Grid spend table
│   └── audit/             # Audit log viewer
├── components/            # Shared React components
│   ├── ui/               # shadcn/ui components
│   └── navigation.tsx    # Main navigation
├── lib/                   # Core business logic
│   ├── paypal/           # PayPal SDK client
│   ├── policy/           # Deterministic policy engine
│   ├── agent/            # AI agent logic
│   └── db.ts             # Database connection
├── db/                    # Database schema & migrations
│   ├── schema.ts         # Drizzle ORM schema
│   ├── seed.ts           # Demo data seeder
│   └── migrations/       # SQL migrations
├── tests/                 # Unit tests
└── docs/                  # Documentation
```

## 🎯 Hackathon Categories

This project targets:
- ✅ **Best Use of PayPal + AI** - Core integration of PayPal Orders & Payouts with AI policy agent
- ✅ **Best Use of Agentic Commerce** - Agent-buyer API for AI agents to request purchases
- ✅ **Best Use of AG Grid** - Interactive spend analytics with Community Edition

## 🔐 Security Notes

- All secrets stored in environment variables (never committed)
- PayPal credentials limited to sandbox scope
- LLM provides explanations only, never controls money flow
- All budget decisions validated in deterministic code
- Complete audit trail with PayPal transaction IDs

## 🌟 Future Enhancements

- [ ] Slack/Teams notifications for approvals
- [ ] Advanced budget forecasting with historical data
- [ ] Multi-company/tenant support
- [ ] Receipt/invoice upload for reconciliation
- [ ] Scheduled recurring payments
- [ ] Budget recommendation engine
- [ ] Integration with accounting software (QuickBooks, Xero)

## 📄 License

MIT License - see [LICENSE](LICENSE) file

## 🤝 Contributing

Contributions welcome! This is an open-source project built for the PayPal AI Hackathon.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📧 Contact

Built by **Circuit Studio** for the PayPal AI Hackathon.

Questions? Open an issue on GitHub.

---

**Note**: This project uses PayPal's sandbox environment for all transactions. No real money is processed.
