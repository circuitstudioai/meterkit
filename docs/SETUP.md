# MeterKit setup

Deadline: **Thu Nov 12, 2026, 12:00 PM PT**. Sandbox only. Never commit `.env.local`.

## Local

```bash
npm install
cp .env.example apps/dashboard/.env.local   # add secrets there if you have them
npm run db:seed
npm run dev
```

Dashboard: http://localhost:43123  
Before chatbot: `npm run dev:chatbot` → :43124  
After chatbot: `npm run dev:chatbot-metered` → :43125 (expects dashboard API on :43123)

## PayPal sandbox

1. Create a sandbox app at https://developer.paypal.com/dashboard/applications/sandbox
2. Set `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `NEXT_PUBLIC_PAYPAL_CLIENT_ID`
3. Personal buyer account for top-ups; Business email for builder payouts
4. Webhook URL: `https://<vercel>/api/paypal/webhook`  
   Events: `PAYMENT.CAPTURE.COMPLETED`, `CHECKOUT.ORDER.APPROVED`, `PAYMENT.PAYOUTS-ITEM.SUCCEEDED`, `PAYMENT.PAYOUTS-ITEM.FAILED`
5. Set `PAYPAL_WEBHOOK_ID` so signatures are verified (`@meterkit/sdk` `verifyPaypalWebhook`)

Without credentials the UI still loads seeded ledger data; live capture/payout will fail until keys exist.

## Gemini

Optional `GEMINI_API_KEY` from https://aistudio.google.com/app/apikey  
Model default: `gemini-2.5-flash`. Missing key → demo/canned text.

## Supabase + Vercel

1. Create a Supabase project.
2. Run `apps/dashboard/supabase/migrations/20261017000000_meterkit.sql` in the SQL editor.
3. Set `DATABASE_URL` (pooler URI is fine; the app uses `prepare: false`).
4. Deploy `apps/dashboard` on Vercel. Set every var from `.env.example`.
5. Point `NEXT_PUBLIC_APP_URL` and PayPal return/webhook URLs at the Vercel host.

SQLite is local-only (`DATABASE_PATH`). Production must use Postgres.

## CLI

```bash
npx meterkit init                  # dry-run (default)
npx meterkit init --apply          # create a new branch; never writes main
npx meterkit init --gemini         # optional assist; AST transforms still default
npx meterkit init --feature=pdf.export
```

Writes `.env.example` only (no secrets). Opens no PR unless you push the branch yourself.

## Demo script

1. Open the unmetered chatbot (:43124). Send a message and export PDF — no wallet.
2. Run `npx meterkit init examples/chatbot` and show the plan.
3. Open the metered chatbot (:43125) and dashboard (:43123).
4. Send messages as `user_alex` — balance drops 5 credits each.
5. Export PDF — 25 credits.
6. Top up with PayPal sandbox (or inspect seeded top-ups if keys are missing).
7. Cash out on Payouts. Show audit log PayPal IDs.
