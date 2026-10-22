# MeterKit: verified PayPal credits installer

Approved direction: 2026-10-22. This supersedes the original wallet-demo brief.

## Promise and users

Describe your credit rules. MeterKit produces a reviewable integration branch and executes failure-case checks before customer use. Target: developers adding prepaid AI features to an existing authenticated app, starting with Vite/React + Supabase. Direct merchant PayPal integration is the first processor adapter, not a claim that competitors lack PayPal acceptance.

## Alpha boundaries

- PayPal sandbox only. Funds settle into the builder merchant account; MeterKit stores application credits, not transferable money.
- Command Center is the first isolated integration target, not a replacement hackathon product. Existing free inventory, governance, exports and deterministic Savings calculations remain unchanged.
- First proposed action: AI explanation of confirmed Savings evidence. Action and synthetic demo prices require owner confirmation. No production customer pricing is inferred.
- One supported stack first. Unsupported auth, tenancy or action sites must produce a blocker, not guessed code.
- An AI planning step may identify integration points and explain a patch. Human-authored, approved configuration owns prices, identity mapping, scope and permitted actions.
- Approved-plan hash and source fingerprint bind apply to reviewed inputs. New branch only, default dry-run, preserve existing files and env examples. No credentials sent to a model.
- Model output cannot authorize payments, balance changes or access. Billing math and acceptance expectations remain deterministic and independent of generated code.

## Required billing behavior

1. Workspace/app scope comes from authenticated server credentials or verified membership, never a browser-supplied trusted identity.
2. Integer credit units, finite positive top-ups/reservations and checked bounds; no balance below zero.
3. Postgres transactions and row locks enforce concurrency across independent service instances. A process mutex is not a financial control.
4. Reserve before executing a billable action. Store the result and settle exactly once in a transaction. A confirmed failure releases the reservation; an unknown/crashed job stays reserved for explicit recovery, never a timed automatic refund while work might continue.
5. Bind PayPal order to workspace, merchant, server catalog pack, amount and currency before fulfillment. Only authenticated PayPal completed capture data may fund the wallet. Deduplicate capture and event IDs across direct capture and webhook delivery.
6. Idempotency keys bind to scope and request content. Conflicting reuse fails. An in-progress retry must not execute work twice.
7. Return actionable low-balance, unauthorized, pending and failure states. Preserve an auditable journal and job result for retries.
8. Legacy unauthenticated demo routes are not the alpha backend and must never be exposed as a production payment service.

## Installer workflow

Inspect → report unsupported cases → obtain missing policy → produce plan → human approves exact plan → apply on isolated branch → execute fixed acceptance suite → report evidence and unresolved gates.

## Alpha acceptance

- Runnable from clean checkout with documented commands; migration is additive and does not touch existing Signal tables.
- Test real Postgres with independent connections: last-credit race, repeated job request, failed work release, cross-workspace denial, duplicate and mismatched completed captures, unsigned webhook denial, invalid numbers and restart durability.
- External API fixtures must be labelled fixtures. A live sandbox top-up and live model-assisted planning need separate receipts and cannot be inferred from mocked tests.
- Command Center integration remains behind an explicit alpha-only gate, with synthetic data until launch/privacy gates are cleared.
- Report installation limitations honestly. No universal plug-and-play or validated willingness-to-pay claims until external builder trials.

## Deferred

Live money, custody, subscriptions, auto-topup, Payouts, partial refunds, chargeback automation, arbitrary-stack transforms, automated customer cancellations/purchases, production activation, fee collection, automatic Devpost submission. Payouts are transfers to recipients, not a necessary withdrawal step after merchant capture.

## Commercial validation

No customer commitments are established. After internal alpha, test an external builder installation against a general coding agent plus official PayPal tooling. Measure completion, intervention count, failure detection and time; seek paid pilot interest before expanding adapters. Commercial pricing remains undecided.

## Delivery

See [ALPHA_MILESTONES.md](ALPHA_MILESTONES.md), [ARCHITECTURE.md](ARCHITECTURE.md) and [ALPHA_TESTING.md](ALPHA_TESTING.md). Existing dashboard/examples are legacy demonstration surfaces until explicitly migrated and tested.
