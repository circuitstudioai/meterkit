# AI Spend Wallet - Setup Guide

Complete step-by-step setup instructions for local development and production deployment.

---

## Table of Contents

1. [Local Development Setup](#local-development-setup)
2. [PayPal Sandbox Setup](#paypal-sandbox-setup)
3. [Google Gemini API Setup](#google-gemini-api-setup)
4. [Supabase Setup (Production Database)](#supabase-setup-production-database)
5. [Vercel Deployment](#vercel-deployment)
6. [Testing the Application](#testing-the-application)
7. [Troubleshooting](#troubleshooting)

---

## Local Development Setup

### Prerequisites
- **Node.js** 18.x or higher
- **npm** 9.x or higher
- **Git**

### Step 1: Clone and Install

```bash
# Clone the repository
git clone <your-repo-url>
cd ai-spend-wallet

# Install dependencies
npm install
```

### Step 2: Environment Variables

```bash
# Copy the example environment file
cp .env.example .env.local
```

Edit `.env.local`:

```env
# Database - Local SQLite (leave DATABASE_URL empty)
DATABASE_PATH=./data/wallet.db

# PayPal - Add your sandbox credentials (see section below)
PAYPAL_CLIENT_ID=your_sandbox_client_id_here
PAYPAL_CLIENT_SECRET=your_sandbox_secret_here
PAYPAL_MODE=sandbox

# Gemini API - Optional (see section below)
GEMINI_API_KEY=your_gemini_api_key_here

# App URL - Local development
NEXT_PUBLIC_APP_URL=http://localhost:43123
```

### Step 3: Database Setup

```bash
# Generate and apply SQLite migrations
npm run db:migrate

# Seed demo data
npm run db:seed
```

This creates:
- Northwind Labs demo company
- 5 demo users (admin, employee, approver, etc.)
- $10,000 initial wallet balance
- Sample budget limits and policy rules
- 3 historical transactions

### Step 4: Start Development Server

```bash
npm run dev
```

Visit [http://localhost:43123](http://localhost:43123)

**Demo Accounts** (switch in top-right dropdown):
- `admin@northwind.demo` - Finance admin
- `employee@northwind.demo` - Employee
- `approver@northwind.demo` - Approver

---

## PayPal Sandbox Setup

### Why PayPal?
PayPal provides the wallet top-up (Orders API) and vendor payout (Payouts API) functionality.

### Step 1: Create PayPal Developer Account

1. Go to [PayPal Developer Portal](https://developer.paypal.com/)
2. Sign in with your PayPal account (or create one)
3. Navigate to **Dashboard**

### Step 2: Create Sandbox App

1. Go to **Apps & Credentials** → **Sandbox**
2. Click **Create App** (or use the default app)
3. Enter app name: "AI Spend Wallet Sandbox"
4. Click **Create App**

### Step 3: Get Credentials

1. On the app details page, copy:
   - **Client ID**
   - **Secret** (click "Show" to reveal)

2. Add to `.env.local`:
   ```env
   PAYPAL_CLIENT_ID=your_actual_client_id
   PAYPAL_CLIENT_SECRET=your_actual_secret
   PAYPAL_MODE=sandbox
   ```

### Step 4: Create Sandbox Test Accounts

You need test accounts to simulate payments:

1. Go to **Sandbox** → **Accounts**
2. PayPal creates default accounts, or click **Create Account**
3. Create two accounts:
   - **Personal Account** (for making payments/top-ups)
   - **Business Account** (for receiving payouts as vendors)

4. Note the email addresses and passwords (click "..." → View/Edit account)

### Step 5: Test PayPal Integration

1. Start the app (`npm run dev`)
2. Switch to **Admin** role
3. Go to **Wallet** page
4. Enter amount (e.g., $100)
5. Click **Top Up with PayPal**
6. Log in with your **Personal sandbox account**
7. Approve the payment
8. You'll be redirected back with updated balance

### Step 6: Configure Webhooks (Optional)

For production async notifications:

1. In PayPal Dashboard, go to **Webhooks**
2. Click **Add Webhook**
3. Enter your webhook URL:
   ```
   https://your-domain.vercel.app/api/paypal/webhook
   ```
4. Select event types:
   - `PAYMENT.CAPTURE.COMPLETED`
   - `PAYMENT.PAYOUTS-ITEM.SUCCEEDED`
   - `PAYMENT.PAYOUTS-ITEM.FAILED`
5. Copy the **Webhook ID**
6. Add to environment variables:
   ```env
   PAYPAL_WEBHOOK_ID=your_webhook_id
   ```

---

## Google Gemini API Setup

### Why Gemini?
Gemini 2.0 Flash generates plain-English explanations of budget decisions (optional - app has fallback).

### Step 1: Get API Key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click **Create API Key**
4. Copy the key

### Step 2: Add to Environment

```env
GEMINI_API_KEY=your_gemini_api_key
```

### Cost Estimate
- Model: `gemini-2.5-flash` (official `@google/genai` SDK)
- Cost: ~$0.10 per million tokens
- Expected usage: <100K tokens for entire hackathon
- **Total cost**: <$0.10

### Without Gemini
If you skip this step, the app will use template-based explanations instead of AI-generated ones. Everything still works.

---

## Supabase Setup (Production Database)

### Why Supabase?
Supabase provides managed Postgres for production. SQLite is great for local dev but doesn't work on Vercel's serverless.

### Step 1: Create Supabase Project

1. Go to [Supabase](https://supabase.com/)
2. Sign in / Sign up
3. Click **New Project**
4. Fill in:
   - **Name**: ai-spend-wallet
   - **Database Password**: (generate strong password)
   - **Region**: (choose closest to your users)
5. Click **Create Project**
6. Wait 2-3 minutes for provisioning

### Step 2: Get Connection Details

1. Go to **Project Settings** → **Database**
2. Find **Connection string** → **URI**
3. Copy the URI (format: `postgresql://postgres:[password]@[ref].supabase.co:5432/postgres`)
4. Replace `[password]` with your database password

### Step 3: Run Migrations

#### Option A: Using Supabase SQL Editor (Recommended)

1. Go to **SQL Editor** in Supabase dashboard
2. Create new query
3. Copy contents of `supabase/migrations/20261016000000_initial_schema.sql`
4. Paste and run
5. Create another query
6. Copy contents of `supabase/migrations/20261016000001_seed_data.sql`
7. Paste and run

#### Option B: Using Drizzle Kit (Advanced)

```bash
# Set DATABASE_URL temporarily
export DATABASE_URL="postgresql://postgres:[password]@[ref].supabase.co:5432/postgres"

# Generate and push migrations
DATABASE_URL=$DATABASE_URL npm run db:generate
DATABASE_URL=$DATABASE_URL npx drizzle-kit push
```

### Step 4: Get API Keys

1. Go to **Project Settings** → **API**
2. Copy:
   - **Project URL** (e.g., `https://abcdefgh.supabase.co`)
   - **anon public** key (safe for frontend)
   - **service_role** key (secret, server-only)

### Step 5: Add to Environment

For local testing with Supabase:

```env
# .env.local
DATABASE_URL=postgresql://postgres:[password]@[ref].supabase.co:5432/postgres
NEXT_PUBLIC_SUPABASE_URL=https://[ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

**Note**: If `DATABASE_URL` is set, the app will use Postgres instead of SQLite.

---

## Vercel Deployment

### Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

### Step 2: Login

```bash
vercel login
```

### Step 3: Deploy

```bash
# From project root
vercel deploy --prod
```

Follow the prompts:
- **Set up and deploy?** Yes
- **Which scope?** (your account)
- **Link to existing project?** No
- **What's your project's name?** ai-spend-wallet
- **In which directory is your code located?** ./

### Step 4: Set Environment Variables

In Vercel dashboard:

1. Go to your project
2. **Settings** → **Environment Variables**
3. Add all variables from `.env.example`:

```
DATABASE_URL = postgresql://postgres:[password]@[ref].supabase.co:5432/postgres
PAYPAL_CLIENT_ID = your_sandbox_client_id
PAYPAL_CLIENT_SECRET = your_sandbox_secret
PAYPAL_MODE = sandbox
PAYPAL_WEBHOOK_ID = your_webhook_id
GEMINI_API_KEY = your_gemini_api_key
NEXT_PUBLIC_APP_URL = https://your-app.vercel.app
NEXT_PUBLIC_SUPABASE_URL = https://[ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = your_anon_key
```

### Step 5: Redeploy

```bash
vercel deploy --prod
```

Or push to your GitHub repo (Vercel auto-deploys).

### Step 6: Update PayPal Return URL

1. Go to PayPal sandbox app settings
2. Update return URL to:
   ```
   https://your-app.vercel.app/api/paypal/capture
   ```

### Step 7: Test Production

Visit your Vercel URL and test the full flow:
1. Top up wallet (redirects to PayPal)
2. Create purchase request
3. Approve and pay
4. Check spend table and audit log

---

## Testing the Application

### End-to-End Test Flow

#### 1. Admin: Top Up Wallet

1. Switch to `admin@northwind.demo`
2. Go to **Wallet** page
3. Enter $500
4. Click **Top Up with PayPal**
5. Log in with PayPal **Personal** sandbox account
6. Approve payment
7. Verify: Balance increased by $500

#### 2. Employee: Request Auto-Approved Purchase

1. Switch to `employee@northwind.demo`
2. Go to **Requests** page
3. Click **New Request**
4. Fill in:
   - Tool: "ChatGPT Plus"
   - Category: "AI Assistant"
   - Amount: $20
   - Description: "Monthly subscription"
5. Submit
6. Verify: Modal shows "AUTO-APPROVED" with policy explanation

#### 3. Employee: Request Requiring Approval

1. Still as employee
2. Create another request:
   - Tool: "New Expensive Tool"
   - Amount: $800
3. Submit
4. Verify: Modal shows "REQUIRES APPROVAL"

#### 4. Approver: Review and Approve

1. Switch to `approver@northwind.demo`
2. Go to **Approvals** page
3. See pending request
4. Click **Approve & Pay**
5. Verify: Payout initiated message

#### 5. View Spending Analytics

1. Go to **Spend Table** page
2. Test:
   - Filter by department
   - Sort by amount
   - Group by category
   - Export to CSV

#### 6. Review Audit Trail

1. Go to **Audit Log** page
2. Verify all actions logged:
   - Wallet top-up
   - Purchase requests
   - Approvals
   - PayPal transaction IDs

### API Testing (Agent Buyer)

```bash
# Get user session first
curl http://localhost:43123/api/session

# Create request as agent
curl -X POST http://localhost:43123/api/requests \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 2,
    "toolName": "OpenAI API Credits",
    "toolCategory": "AI API",
    "amount": 200,
    "description": "Monthly API credits for autonomous agent",
    "department": "Engineering",
    "vendorEmail": "vendor@openai.com",
    "isAgentRequest": true
  }'
```

---

## Troubleshooting

### Database Issues

**Problem**: `SQLITE_ERROR: no such table`

**Solution**:
```bash
rm -rf data/
npm run db:migrate
npm run db:seed
```

---

**Problem**: Postgres connection error

**Solution**:
1. Check `DATABASE_URL` is correct
2. Verify database password
3. Test connection:
   ```bash
   psql "postgresql://postgres:[password]@[ref].supabase.co:5432/postgres"
   ```

---

### PayPal Issues

**Problem**: "PayPal auth failed"

**Solution**:
1. Verify `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` are correct
2. Check they're for **sandbox** (not live)
3. Ensure no extra spaces in credentials

---

**Problem**: Payment redirect fails

**Solution**:
1. Check `NEXT_PUBLIC_APP_URL` matches your actual URL
2. For local dev: `http://localhost:43123` (not 127.0.0.1)
3. For production: `https://your-app.vercel.app` (HTTPS required)

---

### Gemini API Issues

**Problem**: "Gemini API error"

**Solution**:
1. App falls back to template explanations (this is expected)
2. If you want AI explanations, verify `GEMINI_API_KEY` is set
3. Check API key is valid at [Google AI Studio](https://aistudio.google.com/)

---

### Build Errors

**Problem**: Build fails on Vercel

**Solution**:
1. Check all environment variables are set
2. Run `npm run build` locally first
3. Check Vercel build logs for specific errors

---

**Problem**: "Cannot find module @/..."

**Solution**:
```bash
rm -rf .next node_modules
npm install
npm run dev
```

---

### Port Already in Use

**Problem**: `EADDRINUSE: address already in use :::43123`

**Solution**:
```bash
# Find and kill process
lsof -ti:43123 | xargs kill -9

# Or change port in package.json
# "dev": "next dev -p 3000"
```

---

## Environment Variables Checklist

Before deploying, ensure you have:

### Required
- [ ] `DATABASE_URL` (Supabase connection string)
- [ ] `PAYPAL_CLIENT_ID` (from PayPal sandbox)
- [ ] `PAYPAL_CLIENT_SECRET` (from PayPal sandbox)
- [ ] `NEXT_PUBLIC_APP_URL` (your Vercel URL)

### Recommended
- [ ] `GEMINI_API_KEY` (for AI explanations)
- [ ] `PAYPAL_WEBHOOK_ID` (for webhook verification)
- [ ] `NEXT_PUBLIC_SUPABASE_URL` (from Supabase)
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` (from Supabase)

### Optional
- [ ] `SUPABASE_SERVICE_ROLE_KEY` (for admin operations)

---

## Next Steps

After successful setup:

1. **Record Demo Video**: Follow [docs/video-script.md](video-script.md)
2. **Submit to Devpost**: Include GitHub repo + video + screenshots
3. **Test Thoroughly**: Go through all flows before submission
4. **Get Feedback**: Share with team/friends for testing

---

## Support

**For AI Agents**: See [AGENTS.md](../AGENTS.md) for conventions

**Issues**: Open a GitHub issue

**Hackathon Deadline**: November 12, 2026, 3:00 PM ET

---

**Good luck! 🚀**
