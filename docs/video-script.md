# AI Spend Wallet - 3-Minute Video Script

**Target Length**: 2:40 (160 seconds)  
**Format**: Screen recording + voiceover  
**Voice**: Professional, clear, energetic  
**Music**: Royalty-free background (low volume) or none

---

## ACT 1: THE PROBLEM (0:00 - 0:20)

**Visual**:
- Fast montage of AI tool logos (ChatGPT, Midjourney, GitHub Copilot, etc.)
- Browser tabs with pricing pages
- Credit card being swiped multiple times
- Confused person looking at spreadsheet
- Cut to: "WHO'S IN CONTROL?" text overlay

**Narration**:
> "Every team is buying AI tools. ChatGPT subscriptions. Midjourney licenses. API credits for their agents. Now AI agents themselves are making purchases. Who's tracking this spend? Who's in control?"

**Duration**: 20 seconds

---

## ACT 2: FUND THE WALLET (0:20 - 0:45)

**Visual**:
- Screen recording: AI Spend Wallet homepage
- Click "Wallet" tab
- Show dashboard with $0 balance
- Enter $500 in "Top Up" field
- Click "Top Up with PayPal"
- PayPal sandbox login appears
- Approve payment
- Return to app - balance now shows $500

**Narration**:
> "Meet AI Spend Wallet. Finance sets the budget—directly through PayPal. Watch as we add $500 to the company wallet. Instant, secure, and fully tracked."

**Duration**: 25 seconds

---

## ACT 3: SMART APPROVALS (0:45 - 1:25)

**Visual**: Screen recording of three scenarios in sequence

### Scenario 1: Auto-Approve (15 seconds)
- Switch to "Employee" role
- Click "New Request"
- Fill in:
  - Tool: "ChatGPT Plus"
  - Amount: $20
  - Description: "Monthly subscription for marketing content"
- Submit
- Modal shows: "AUTO-APPROVED ✓"
- Policy reason displays

### Scenario 2: Route to Approver (15 seconds)
- New request:
  - Tool: "Midjourney"
  - Amount: $30
  - Description: "Design assets"
- Submit
- Modal shows: "REQUIRES APPROVAL"
- Reason: "Marketing already uses DALL-E"
- Switch to "Approver" role
- Click "Approve & Pay"
- Success message

### Scenario 3: Denied (10 seconds)
- New request:
  - Tool: "Enterprise AI Tool"
  - Amount: $5,000
- Submit
- Modal shows: "DENIED ✗"
- Reason: "Exceeds department monthly limit of $3,000"

**Narration**:
> "Jordan requests ChatGPT Plus. The policy agent checks: budget OK, tool on the approved list—auto-approved. Next, Midjourney. But Marketing already pays for DALL-E, a similar tool. The agent routes it to Sam for approval. Now Jordan tries a five-thousand-dollar tool. Denied immediately—exceeds the department's monthly limit. Every decision: policy-based and fully auditable."

**Duration**: 40 seconds

---

## ACT 4: AI BUYING AI (1:25 - 1:55)

**Visual**:
- Split screen or picture-in-picture
- Left: Terminal showing API call
  ```bash
  curl -X POST /api/requests \
    -d '{"toolName":"OpenAI API Credits",
         "amount":200,"isAgentRequest":true}'
  ```
- Right: App showing new request appear in real-time
- Switch to Approver view
- Request is marked as "Agent Request 🤖"
- Shows policy check: "Over per-request limit"
- Click "Approve & Pay"
- Confirmation: "Payout initiated"

**Narration**:
> "Here's where it gets interesting. An AI agent requests two hundred dollars in API credits—via our API. The policy agent evaluates it just like any purchase. Over the limit? Sam reviews and approves. Boom—agents buying tools, but with full governance."

**Duration**: 30 seconds

---

## ACT 5: THE DASHBOARD (1:55 - 2:20)

**Visual**: Screen recording of Spend Table
- Click "Spend Table" tab
- AG Grid loads with transaction data
- Demo interactions:
  - Filter by department (show "Marketing" only)
  - Sort by amount (high to low)
  - Group by tool category
  - Hover to show PayPal transaction IDs
  - Click "Export CSV"
  - CSV downloads
- Show summary cards: Total Spend, Tools Purchased, Transactions

**Narration**:
> "Track everything in real-time with AG Grid. Filter by department, tool, or date. Sort and group however you need. Every transaction stamped with a PayPal ID. Export to CSV with one click. Complete visibility into AI spending."

**Duration**: 25 seconds

---

## ACT 6: ARCHITECTURE & CLOSE (2:20 - 2:40)

**Visual**:
- Cut to: Architecture diagram (from docs/ARCHITECTURE.md)
- Zoom into "LLM Explainer" and "Deterministic Policy Engine" boxes
- Highlight flow: Request → Code Checks → Decision → LLM Explains → PayPal Payout
- Fade to text screen:
  ```
  AI Spend Wallet
  Open Source • MIT Licensed
  Built on PayPal
  
  github.com/[your-repo]
  Built for PayPal AI Hackathon 2026
  ```

**Narration**:
> "How does it work? The AI explains decisions in plain English, but deterministic code controls the money. Budget checks, limit enforcement, policy matching—all in code. The LLM adds transparency, never risk. Open source, MIT licensed, built on PayPal's platform. AI Spend Wallet: governance for the AI economy."

**Duration**: 20 seconds

---

## PRODUCTION NOTES

### Recording Checklist
- [ ] Use 1920x1080 resolution
- [ ] Clear browser cache before recording
- [ ] Seed fresh demo data (`npm run db:seed`)
- [ ] Disable notifications/interruptions
- [ ] Use screen recording with cursor highlighting (e.g., ScreenFlow, Camtasia)
- [ ] Record voiceover separately for better audio quality
- [ ] Add subtle zoom-ins for key moments (form submissions, modals)

### Editing Notes
- Add 1-2 second fade-in at start
- Speed up repetitive UI interactions (e.g., filling forms) to 1.5x
- Add text overlays for key points:
  - "AUTO-APPROVED ✓"
  - "REQUIRES APPROVAL"
  - "DENIED ✗"
  - "Agent Request 🤖"
- Ensure smooth transitions between scenes
- Add subtle background music at 10-15% volume (if using)
- Export at 1080p, 30fps, H.264 codec
- Upload to YouTube as Unlisted

### Voice Recording Tips
- Record in quiet room with minimal echo
- Use good microphone (even a decent headset mic works)
- Speak clearly and at moderate pace
- Record 2-3 takes and pick the best
- Light compression and normalization in post

### Music Options (Royalty-Free)
- YouTube Audio Library: "Tech" or "Corporate" categories
- Epidemic Sound (if available)
- Artlist (if available)
- Or: No music (cleaner for technical demo)

### Thumbnail Ideas
- Screenshot of AG Grid table with "$10,000+ managed" overlay
- Split image: PayPal logo + AI robot icon
- Text: "AI Governance Meets PayPal"

---

## SCRIPT TIMING BREAKDOWN

| Act | Duration | Start | End   | Key Message |
|-----|----------|-------|-------|-------------|
| 1   | 20s      | 0:00  | 0:20  | The problem |
| 2   | 25s      | 0:20  | 0:45  | Easy funding |
| 3   | 40s      | 0:45  | 1:25  | Smart decisions |
| 4   | 30s      | 1:25  | 1:55  | Agent buyers |
| 5   | 25s      | 1:55  | 2:20  | Visibility |
| 6   | 20s      | 2:20  | 2:40  | How it works |
| **Total** | **2:40** | **0:00** | **2:40** | |

---

## FALLBACK PLAN (If Over Time)

If the video runs over 3:00, trim in this order:
1. Shorten Act 3, Scenario 2 to 10 seconds (show approval without full workflow)
2. Shorten Act 5 to 20 seconds (fewer AG Grid interactions)
3. Shorten Act 1 to 15 seconds (faster montage)

**DO NOT CUT**: Acts 4 (agent buyer) or 6 (architecture) - these are the unique value props.

---

## POST-PRODUCTION CHECKLIST

- [ ] Video is under 3:00
- [ ] Audio is clear and normalized
- [ ] No glitches or UI bugs visible
- [ ] Text overlays are readable
- [ ] No PayPal credentials visible
- [ ] GitHub repo link is correct
- [ ] YouTube title: "AI Spend Wallet - PayPal AI Hackathon 2026"
- [ ] YouTube description includes:
  - GitHub repo link
  - What it does (1 paragraph)
  - Tech stack
  - "Built for PayPal AI Hackathon 2026"
- [ ] Video set to Unlisted (not Private, so judges can view)
- [ ] Video link copied for Devpost submission
