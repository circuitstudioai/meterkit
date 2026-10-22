# Alpha delivery milestones

Each milestone requires executable evidence, not only implemented files. No production activation is included.

| Milestone | Deliverable | Exit evidence |
|---|---|---|
| A1 Transactional credit kernel | Scoped Postgres wallets, immutable entries, reserve/settle/release jobs | Independent-connection race, replay, invalid input, failure release, restart tests |
| A2 Verified PayPal sandbox | Bound catalog orders, capture reconciliation, fail-closed webhook | Tamper/replay/event fixtures plus separate live sandbox receipt |
| A3 Reviewed integration installer | Stack inspection, AI-assisted plan, explicit policy, source/plan fingerprint, safe branch apply | Dry-run unchanged, stale plan denial, no overwrite, external target compile |
| A4 Command Center alpha | Gated wallet + approved first paid action, deterministic evidence preserved | Isolated end-to-end auth, top-up, action, low-balance, retry and failure test; test instructions |

Status is tracked in GitHub milestones/issues and docs/ALPHA_TESTING.md. Runtime/provider access and unapproved product policy remain explicit gates. Existing launch gates stay unchanged.
