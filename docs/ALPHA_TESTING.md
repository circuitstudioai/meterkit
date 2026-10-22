# Alpha evidence — 2026-10-22

## Readiness

Local developer alpha / controlled fixture integration is testable. **Not live PayPal acceptance and not a customer-ready hosted alpha.** No production changes or real Signal workspace activation.

## Executed evidence

- Real local Postgres16: transactional wallet/reservation contracts, concurrent service instances, independent reopened connection, immutable journal, completed capture deduplication and mismatched capture rejection.
- HTTP/service fixtures: unsigned/failed webhook verification, wrong workspace, role/module/membership denial, model citation validation, preflight cost check, no provider execution at zero credits, confirmed failure release, unknown outcome hold and idempotent stored results.
- Installer: dry-run unchanged; exact approval hash; stale/tampered plan denial; preserved env; branch creation; explicit missing-model failure. Provider-call fixture checks that only allowlisted metadata leaves the CLI.
- Clean `npm ci`, Initial32 MeterKit tests (16 new billing/service, 3 installer, 13 existing), billing typecheck and all-workspace build passed locally. CI receipt remains separate.
- Generated adapter applied **only to a disposable clone** of Command Center main `216b21c2c3d341d789d508c61ad6d232b3ad6f11`, using synthetic test policy. Its build and183 existing tests passed. Actual Command Center checkout remains unchanged.
- Browser fixture:8/8 checks passed against generated UI + real local Postgres. Auth, PayPal and AI are simulated. See [results](alpha-evidence/browser-fixture-results.json), [desktop](alpha-evidence/desktop-fixture.png), [mobile](alpha-evidence/mobile-fixture.png). Mobile390px had no horizontal overflow; no browser page errors.
- First real Gemini attempt returned HTTP400 / `API_KEY_INVALID`. Owner has replaced the key; revalidation is underway. No source or secret was logged.

## Test the installer

Follow [SETUP.md](SETUP.md). Use a clean disposable Command Center clone and an explicitly selected fixture policy. Inspect the full plan; apply its exact hash. Build and run existing target tests before enabling the route in an isolated local environment.

## Remaining alpha gates

1. Owner confirms first action (proposed: explanation of confirmed Savings evidence) and synthetic demo pricing. No reply has approved those values yet.
2. Sandbox app/client secret/merchant ID and separate buyer configuration. Register the isolated `/api/alpha/paypal/webhook` endpoint after deployment, then set its webhook ID. Do not use the legacy webhook.
3. Run a real AI advisory plan and real explanation with approved data handling using the updated key.
4. Configure an isolated hosted Postgres + Signal auth/data test workspace with required role/module grants. Do not apply migrations or activate billing in production.
5. Execute real authenticated browser + PayPal sandbox capture/signed webhook/retry proof, preserving exact IDs/statuses without secrets. Only then call the hosted alpha payment-tested.

Do not infer a live provider receipt from fixture logs, an HTTP200, a generated patch, a build or a screenshot.

## Review and deployed boundary

- Initial kernel/integration commit46ffd63 passed [Postgres CI](https://github.com/circuitstudioai/meterkit/actions/runs/39829019393) and the [PR CI run](https://github.com/circuitstudioai/meterkit/actions/runs/39829095881): clean install,32 tests, strict billing types and all builds. A1 issue/milestone is closed; A2–A4 remain open.
- A further installer guard now rejects unknown Supabase initialization or absent permission/module/schema contracts. Its new regression was observed failing, then all4 installer contracts passed. These are static ABI-presence checks, not a replacement for actual authenticated backend acceptance.
- Preview `https://meterkit-p3zig240n-circuitstudioais-projects.vercel.app` built46ffd63. It is Vercel-protected. Authenticated CLI checked `/api/alpha/balance`: HTTP503 / `alpha_not_configured`, as intended. This is a disabled-backend boundary check, not a usable payment-tested alpha. PayPal cannot deliver through Vercel access protection; a publicly reachable isolated webhook endpoint remains a hosting gate.
- Both freshly pulled Preview and Production Gemini settings still failed the real advisory request after the owner reported replacement. Await location clarification; do not overwrite or repeatedly test unknown credentials.
- [Author self-review](alpha-evidence/review.md) records standards/spec scope. No independent reviewer is claimed.
