# AI Spend Wallet

**By Circuit Studio**  
**Built for the [PayPal AI Hackathon 2026](https://paypalaihackathon.devpost.com/)**

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

An open-source wallet where companies fund their AI tool budget via PayPal, and an AI agent enforces budgets, policies, and approvals *before* any AI spend is paid.

🎥 **[Demo Video](#)** | 🚀 **[Live Demo](#)** | 📖 **[Documentation](docs/)**

---

## 🎯 What It Does

AI Spend Wallet solves the problem of uncontrolled AI tool spending in companies. Traditional expense tracking happens *after* purchases. We gate spending *before* it happens.

### The Problem
- Teams buy AI tools without oversight (ChatGPT, Midjourney, API credits)
- AI agents themselves make purchases autonomously
- Finance has no visibility or control until the bill arrives
- No way to enforce budgets or policies before money moves

### Our Solution
1. **Finance funds a wallet** via PayPal Orders API
2. **Employees/agents request purchases** through the app or API
3. **AI policy agent evaluates** against company rules in real-time
4. **Deterministic code decides** based on budget math (not AI guesses)
5. **Approved purchases paid** automatically via PayPal Payouts
6. **Complete audit trail** with PayPal transaction IDs

---

## ✨ Features

### 🤖 AI Policy Agent
- **Smart Evaluation**: Analyzes requests against budgets, limits, and policies
- **Powered by Google Gemini**: Generates plain-English explanations (`gemini-2.5-flash`)
- **Deterministic Enforcement**: Code controls money, AI explains decisions
- **Three Outcomes**: Auto-approve, route to approver, or deny with reason

### 💰 Budget Management
- **PayPal Integration**: Top-up wallet via PayPal sandbox Orders API
- **Real-time Balance**: Live wallet balance tracking
- **Department Limits**: Monthly caps per department
- **Per-Request Limits**: Maximum single purchase amounts
- **Vendor Payouts**: Automated payments via PayPal Payouts API

### 📊 Governance & Visibility
- **AG Grid Spend Table**: Filter, sort, group, and export spending data
- **Audit Log**: Immutable record of every decision and transaction
- **Policy Rules**: Allowlists, blocklists, duplicate detection
- **Role-Based Views**: Different interfaces for admins, employees, approvers

### 🤝 Agentic Commerce
- **Agent Buyer API**: AI agents request purchases programmatically
- **Same Policy Checks**: Agents follow the same rules as humans
- **Full Transparency**: Every agent purchase logged and auditable

---

## 🏗️ Architecture

```
┌─────────────────┐
│   Employee      │
│  (or AI Agent)  │
└────────┬────────┘
         │ Request Purchase
         ▼
┌─────────────────────────────┐
│   AI Policy Agent           │
│  ┌─────────────────────┐   │
│  │ Gemini 2.0 Flash    │   │  ← Explains WHY
│  │ (Explanation)       │   │
│  └─────────────────────┘   │
│  ┌─────────────────────┐   │
│  │ Deterministic Rules │   │  ← Decides WHAT
│  │ • Budget checks     │   │
│  │ • Limit enforcement │   │
│  │ • Policy matching   │   │
│  └─────────────────────┘   │
└────────┬────────────────────┘
         │ Decision
         ▼
    Auto-Approve / Route / Deny
         │
         ▼
    ┌──────────┐
    │ PayPal   │
    │ Payout   │
    └────┬─────┘
         │
         ▼
    ┌─────────────┐
    │ Audit Log   │
    └─────────────┘
```

**Key Design Principle**: AI provides explanations and classifications, but deterministic code makes all money decisions. This ensures reliability and auditability.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the technical design.

---

## 📦 Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Database**: 
  - Local: SQLite with better-sqlite3
  - Production: Supabase (Postgres)
  - ORM: Drizzle ORM
- **PayPal APIs**:
  - Orders v2 (wallet top-ups)
  - Payouts v1 (vendor payments)
  - Webhooks (payment confirmations)
- **AI**: Google Gemini 2.5 Flash (via the official `@google/genai` SDK)
- **Data Grid**: AG Grid Community Edition (MIT license)
- **Deployment**: Vercel (frontend + API) + Supabase (database)

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PayPal Developer account ([sign up](https://developer.paypal.com/))
- Google Gemini API key ([get one](https://aistudio.google.com/app/apikey)) - optional
- Supabase account for production ([sign up](https://supabase.com/)) - optional

### Local Development

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd ai-spend-wallet

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env.local
# Edit .env.local with your credentials (see docs/SETUP.md)

# 4. Set up database (SQLite for local)
npm run db:migrate
npm run db:seed

# 5. Run development server
npm run dev
```

Open [http://localhost:43123](http://localhost:43123)

**Demo Accounts** (switch roles in top-right):
- `admin@northwind.demo` - Finance admin (top up wallet)
- `employee@northwind.demo` - Employee (request purchases)
- `approver@northwind.demo` - Approver (review requests)

### Production Deployment

See **[docs/SETUP.md](docs/SETUP.md)** for complete Vercel + Supabase setup instructions.

---

## 🤖 AI Tools Used

### 1. Google Gemini 2.5 Flash
- **Purpose**: Policy explanation generation
- **Model**: `gemini-2.5-flash` (override with `GEMINI_MODEL`)
- **Usage**: Generates human-readable explanations of budget decisions
- **Why**: Fast, cheap, good enough for short stakeholder copy
- **Integration**: official `@google/genai` SDK in `/lib/agent/policy-agent.ts`
- **Graceful degradation**: canned explanations if `GEMINI_API_KEY` is missing or the call fails

### 2. Deterministic Policy Engine (Code-based)
- **Purpose**: Authoritative budget and policy decisions
- **How it Works**: 
  - Checks wallet balance (hard requirement)
  - Enforces department monthly limits
  - Validates per-request limits
  - Matches against blocklists/allowlists
  - Detects duplicate tools in same category
- **Why Code, Not AI**: Money decisions must be deterministic, auditable, and not subject to LLM variability
- **Integration**: Pure TypeScript in `/lib/policy/rules-engine.ts`

**Decision Flow**:
1. Deterministic engine produces: `auto_approve` | `route_to_approver` | `deny`
2. Gemini 2.5 Flash explains *why* that decision was made
3. Code executes the money movement (never the AI)

This hybrid approach ensures AI enhances transparency without controlling funds.

---

## 📋 PayPal APIs Used

### 1. Orders v2 API
- **Purpose**: Wallet top-ups
- **Flow**: Create order → User approves in PayPal → Capture funds → Credit ledger
- **Endpoints**:
  - `POST /v2/checkout/orders` - Create order
  - `POST /v2/checkout/orders/{id}/capture` - Capture payment

### 2. Payouts v1 API
- **Purpose**: Vendor payments for approved purchases
- **Flow**: Request approved → Create payout batch → PayPal processes → Debit ledger
- **Endpoints**:
  - `POST /v1/payments/payouts` - Create payout batch
  - `GET /v1/payments/payouts/{id}` - Check status

### 3. OAuth 2.0
- **Purpose**: API authentication
- **Implementation**: Automatic token refresh with 1-minute expiry buffer

### 4. Webhooks (Structure Ready)
- **Purpose**: Async payment confirmations
- **Status**: Verification logic implemented, awaiting webhook URL configuration

All PayPal operations use **sandbox mode only** - no real money processed.

---

## 🎯 Hackathon Alignment

### Judging Criteria

✅ **Technological Implementation**
- Full PayPal Orders + Payouts integration with real sandbox transactions
- AI policy agent with Gemini 2.0 Flash
- Deterministic money rules (audit-friendly and reliable)

✅ **Design**
- Complete product flow: fund → request → approve → pay → audit
- Modern UI with shadcn/ui
- Role-based interfaces
- Empty states, loading states, error handling

✅ **Potential Impact**
- Real problem: $billions in uncontrolled AI SaaS spending
- Clear target market: 20-500 employee companies (SMBs)
- Buyers: Finance directors, IT managers, CFOs

✅ **Innovation**
- Pre-spend enforcement (not just tracking)
- Agent-buyer capability (agents paying for tools under governance)
- Hybrid AI + deterministic approach (best of both worlds)

✅ **Presentation**
- Complete video script ([docs/video-script.md](docs/video-script.md))
- Clear architecture documentation
- Strong value proposition

### Prize Targets

1. 🏆 **Best Use of PayPal + AI** (Primary target)
2. 🤖 **Best Use of Agentic Commerce** (Agent buyer API)
3. 📊 **Best Use of AG Grid** (Spend analytics table)
4. 🎬 **Best Demo Delivery** (Professional video)

---

## 📁 Project Structure

```
ai-spend-wallet/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── paypal/        # PayPal Orders, Payouts, Webhooks
│   │   ├── requests/      # Purchase request CRUD
│   │   ├── approvals/     # Approval workflow
│   │   ├── wallet/        # Wallet stats
│   │   ├── session/       # Demo role switching
│   │   └── audit/         # Audit log
│   ├── wallet/            # Wallet management page
│   ├── requests/          # Request creation & history
│   ├── approvals/         # Approval queue
│   ├── spend/             # AG Grid spend table
│   └── audit/             # Audit log viewer
├── components/            # React components
│   ├── ui/               # shadcn/ui primitives
│   └── navigation.tsx    # Main nav with role switcher
├── lib/                   # Core business logic
│   ├── paypal/           # PayPal SDK client
│   ├── policy/           # Deterministic rules engine
│   ├── agent/            # AI policy agent (Gemini)
│   └── db.ts             # Database connection (SQLite/Postgres)
├── db/                    # SQLite schema & migrations
│   ├── schema.ts         # SQLite schema
│   ├── schema-postgres.ts# Postgres schema
│   ├── seed.ts           # Demo data seeder
│   └── migrations/       # SQLite migrations
├── supabase/              # Supabase (Postgres) setup
│   └── migrations/       # Postgres SQL migrations
├── tests/                 # Unit tests
├── docs/                  # Documentation
│   ├── SETUP.md          # Setup instructions
│   ├── ARCHITECTURE.md   # Technical design
│   └── video-script.md   # 3-min video script
├── AGENTS.md              # AI agent conventions
├── LICENSE                # MIT License
└── README.md              # This file
```

---

## 🧪 Development

### Available Scripts

```bash
npm run dev          # Start dev server (http://localhost:43123)
npm run build        # Build for production
npm run start        # Start production server
npm test             # Run unit tests
npm run lint         # Run ESLint

# Database (SQLite - local)
npm run db:generate  # Generate migrations
npm run db:migrate   # Apply migrations
npm run db:seed      # Seed demo data
npm run db:setup     # Generate + seed (one command)
```

### Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm test -- --watch
```

Tests cover:
- Policy engine budget enforcement
- Department monthly caps
- Per-request limit validation
- Blocklist/allowlist matching
- Duplicate tool detection

---

## 🔐 Security

- **Secrets Management**: All credentials in environment variables (never committed)
- **Sandbox Only**: PayPal operations limited to sandbox scope
- **AI Role**: LLM provides explanations only, never controls money flow
- **Deterministic Validation**: All budget decisions validated in code
- **Audit Trail**: Complete immutable log with PayPal transaction IDs
- **SQL Injection**: Protected by Drizzle ORM parameterized queries

---

## 🚧 Roadmap

### Post-Hackathon Enhancements
- [ ] Real authentication (Clerk or Auth0)
- [ ] Multi-company/tenant support
- [ ] Budget forecasting with historical data
- [ ] Scheduled recurring payments
- [ ] Slack/Teams approval notifications
- [ ] Receipt/invoice upload for reconciliation
- [ ] Integration with accounting software (QuickBooks, Xero)
- [ ] Advanced analytics dashboard
- [ ] Mobile app (React Native)

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file.

This project is fully open source and free to use, modify, and distribute.

---

## 🤝 Contributing

Contributions welcome! This project was built for the PayPal AI Hackathon but is designed for real-world use.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📧 Contact & Support

**Built by**: Circuit Studio for the PayPal AI Hackathon 2026

**Questions?** Open an issue on GitHub

**For AI Agents**: See [AGENTS.md](AGENTS.md) for development conventions and handoff protocol

---

## 🙏 Acknowledgments

- **PayPal** for the hackathon and excellent sandbox APIs
- **Google** for Gemini 2.0 Flash (fast and affordable AI)
- **AG Grid** for the community edition data grid
- **Vercel** for hosting and deployment platform
- **Supabase** for managed Postgres database
- **shadcn/ui** for beautiful React components

---

**Built with ❤️ using PayPal APIs, Google Gemini, and modern web tech**

---

**Note**: This project uses PayPal's sandbox environment for all transactions. No real money is processed. All demo data is fictional.
