# MeterKit video script (< 3 min, target 2:40)

No third-party music. Sandbox only. No secrets on screen.

1. **0:00–0:20 Hook**  
   “You shipped a chatbot. Every Gemini call hits *your* card. Subscriptions do not match bursty usage.”

2. **0:20–0:45 Before**  
   `examples/chatbot` — send a message, export PDF. No wallet.

3. **0:45–1:15 Agent install**  
   Terminal: `npx meterkit init`. Show the plan (Gemini + pdf.export). `--apply` creates a branch, never `main`.

4. **1:15–1:50 After**  
   Metered chat: balance widget, send a message (debit), export PDF (debit), low-balance modal, PayPal/Venmo top-up.

5. **1:50–2:15 Dashboard**  
   Apps, catalog edit (credits/unit), AG Grid usage, revenue, payout to builder sandbox.

6. **2:15–2:40 Close**  
   Architecture: LLM explains/scans, code meters. PayPal holds the money. “Add pay-as-you-go in 60 seconds.”  
   Super: github + MeterKit + PayPal AI Hackathon 2026.
