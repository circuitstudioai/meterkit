# Alpha delivery milestones

Each milestone requires executable evidence, not only implemented files. No production activation is included.

| Milestone | Deliverable | Exit evidence |
|---|---|---|
| A1 Transactional credit kernel | Scoped Postgres wallets, immutable entries, reserve/settle/release jobs | Independent-connection race, replay, invalid input, failure release, restart tests |
| A2 Verified PayPal sandbox | Bound catalog orders, capture reconciliation, fail-closed webhook | Tamper/replay/event fixtures plus separate live sandbox receipt |
| A3 Reviewed integration installer | Stack inspection, AI-assisted plan, explicit policy, source/plan fingerprint, safe branch apply | Dry-run unchanged, stale plan denial, no overwrite, external target compile |
| A4 Command Center alpha | Gated wallet + approved first paid action, deterministic evidence preserved | Isolated end-to-end auth, top-up, action, low-balance, retry and failure test; test instructions |

Status is tracked in GitHub milestones/issues and docs/ALPHA_TESTING.md. Runtime/provider access and unapproved product policy remain explicit gates. Existing launch gates stay unchanged.

## Execution checkpoint

- A1 accepted: [issue4](https://github.com/circuitstudioai/meterkit/issues/4), [CI receipt](https://github.com/circuitstudioai/meterkit/actions/runs/39829019393).
- A2 implementation/fixture contracts delivered; real sandbox receipt pending owner access.
- A3 deterministic installer/safety delivered; real AI advisory receipt pending valid credential location.
- A4 disposable-clone UI/build/tests delivered; policy approval, hosted backend and real authentication/provider flow pending.

[Draft review PR8](https://github.com/circuitstudioai/meterkit/pull/8). No merge or production activation.


## v4 reconciliation — 2026-10-23

See [review](V4_CHECKLIST_REVIEW.md). The public chatbot Auth adapter, installer target and hosted runnable proof are additional A3/A4 deliverables. Provider credentials now pass hosted probes; do not keep the earlier masked-local-key diagnosis as a blocker. A2 still needs merchant configuration, approved policy and a real sandbox receipt. The dedicated alpha schema is applied; no duplicate project or seed is needed.
