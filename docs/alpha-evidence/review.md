# Author self-review — alpha slice

This is author review, not an independent-agent review.

## Standards

- New billing boundary owns Postgres persistence/transactions and exposes small server-only APIs. Separate HTTP, provider and auth adapters avoid process-local financial locking.
- Sandbox endpoint is fixed in the PayPal adapter; no live-mode switch. Remote database connections require TLS. Browser state cannot establish access or price.
- New route remains disabled until explicit server config. Raw provider errors/credentials are not returned to clients.
- CLI uses argument-vector git execution, trusted output templates, exact source/plan fingerprints, clean-tree checks, branch-only apply and explicit overwrite/symlink refusal.
- During review, filename-only auth detection proved insufficient. Added an intentionally failing unknown-auth test, then guarded known Supabase initialization and server API presence. Runtime access checks still require separate acceptance.

## Spec

- Canonical billing acceptance covers real Postgres state; provider/auth boundaries use labelled fixtures.
- Agent advisory cannot modify math, price, roles, generated paths or acceptance tests. Missing/failed model calls do not become canned success.
- Command Center math/free features remain untouched. Only a disposable source clone received the gated patch.
- Stored Savings totals are explained at their cited revision. Current eligibility is not recomputed and no realized-savings/action claim is allowed.
- No statement that the alpha is payment-tested: real sandbox, real model, real authenticated workspace and approved demo policy are still gates.

## Limits

One known Command Center adapter; no npm-registry publishing or arbitrary app support. Hosted preview is protected and disabled. Existing historical demo services are not certified by this alpha. Manual review and external builder validation remain required before production.
