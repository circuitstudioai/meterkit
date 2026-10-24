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
- Correction (2026-10-23): earlier local Gemini failures used masked Vercel-download values, not verified deployed credentials. They do not establish that the saved key is invalid. Hosted provider verification is required.

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
- Local Preview/Production environment downloads are masked. Do not use those values to diagnose provider access; use the opt-in Vercel build-time checker, which logs pass/fail only.
- [Author self-review](alpha-evidence/review.md) records standards/spec scope. No independent reviewer is claimed.


## Resume receipt — 2026-10-23

- Provider-only Vercel build: `https://meterkit-owp179rvi-circuitstudioais-projects.vercel.app` (protected Preview). Build logs report PayPal sandbox OAuth PASS and Gemini generation PASS. No capture or signed webhook was executed. This is not the public demo.
- Dedicated Supabase `meterkit-alpha`: canonical schema applied, five alpha tables, zero funded wallets. `anon` and `authenticated` have no effective schema USAGE, wallet SELECT or immutable-entry EXECUTE access. Pooler connection with TLS passed. API exposed-schema settings remain a separate check.
- A regression first demonstrated that explicit API-role grants survived migration; the amended migration now removes them. A separate route regression first returned400 from the legacy manual-credit endpoint; all six retired payment handlers now return410.
- Branch-specific Preview `DATABASE_URL` saved encrypted. No production environment or production Command Center changes.
- Real payment receipt remains pending: policy confirmation, merchant ID, public callback endpoint and sandbox buyer approval. No order/capture/event IDs are invented.

## Installer source binding — 2026-10-24

The installer hashes tracked and non-ignored source files as raw bytes, including
binary assets; it still excludes `.meterkit/` and environment-file paths. Older
plans used UTF-8 decoding for source fingerprints and must be regenerated and
reviewed before apply. Output templates and policy remain independently checked.

Regression: changing a committed binary asset from byte `80` to `81` previously
preserved the decoded fingerprint and allowed the stale plan on a clean target.
The installer now rejects that apply before creating a branch or writing files.
This is local installer evidence only, not a live model or payment receipt.

### Installer output containment

Apply refuses pre-existing generated output paths, including ignored dangling symlinks, before creating its install branch. A dangling link must never let a generated write create a file outside the reviewed repository. This complements source byte binding and symlinked-parent rejection; it is not real payment or target-build acceptance.
