# MeterKit alpha architecture

Human policy → inspected repository → reviewable installer plan → approved source-bound patch → independent acceptance runner.

Billing is a separate server-only boundary. Postgres owns wallet availability, held credits, immutable journal, idempotent jobs and completed-capture uniqueness. A transaction locks the wallet before any mutation. AI providers run outside transactions only after an atomic reservation. Result persistence and settlement are atomic; unknown outcomes remain held for recovery.

The PayPal adapter is sandbox-only. Server catalog and stored order intent determine scope, price, credit amount and merchant. Verified completed capture details must match before funding. Capture ID is the financial deduplication key; webhook event verification is mandatory, not optional.

The first adapter targets Command Center's Vite/React + Supabase architecture. Browser input never grants workspace access. Authentication and membership must be verified server-side. Existing free features and Savings math are independent of the paid explanation action.

`apps/dashboard`, original SDK/store and chatbots remain historical demo surfaces. They are not accepted alpha billing infrastructure. No production rollout, hosted customer service, Payouts or platform fee is in the alpha.
