## Latest public API checkpoint — October 24

The public chatbot server composition is now prepared but disabled by default. See [PUBLIC_CHAT_API.md](PUBLIC_CHAT_API.md) for endpoints, evidence, activation gates and remaining UI/legacy-route work. PM7140 approved **sandbox-only USD1.00 / 50credits / 5credits per AI action**; earlier pending-policy text below is historical. Merchant/webhook/buyer and Production gates remain. No hosted settings or live acceptance changed.

## Public identity preparation — 2026-10-24

The v4 public-app Auth/wallet boundary is now prepared in code: verified server-side Supabase subject -> app-bound user wallet, explicit authenticated-user handler mode and per-handler exact origin lists. Existing Command Center workspace/membership/role/Savings checks remain the default.48 local workspace tests plus six retired-route checks, strict billing types, scoped lint and all builds pass. A real disposable-Postgres two-user/job replay contract uses fixture Auth/payment/model data; no hosted Auth or live payment acceptance is claimed. Details, limits and next wiring: [PUBLIC_IDENTITY.md](PUBLIC_IDENTITY.md).

Public chatbot/UI/installer, live sandbox and isolated Command Center acceptance remain incomplete. PR8 stays draft; no policy, merchant, webhook, hosted configuration or Production activation in this slice. Earlier invalid-key/new-project blockers below are historical and superseded by the October23 provider/schema receipts.

# v4 checklist review — 2026-10-23

## Recommendation

Keep PR #8 and the verified installer/transactional kernel. Use Command Center as the isolated product integration story and a public chatbot as the independently runnable proof. Do not replace the kernel with the historical SDK wallet or restore unauthenticated payment routes.

This review is separate from completion of the new public-chatbot implementation. The existing alpha is not yet payment-tested or submission-ready.

## Corrections and decisions

1. **Infrastructure already exists.** `meterkit-alpha` was created after explicit Micro cost approval. Do not create another project or describe this project as free. Its five private alpha tables are now applied. No historical schema or seed is required.
2. **Provider access is working.** A fresh Vercel Preview build verified sandbox OAuth and Gemini generation. Local environment downloads were masked; prior invalid-key conclusions were not valid evidence about deployed credentials.
3. **Policy is still proposed.** Do not enable a $1 USD / 50-credit pack or 5-credit action until Abhishek confirms those values. Also obtain the sandbox merchant ID before order creation.
4. **Public URLs do not require main to be merged.** Keep production Command Center untouched. Use separately reachable test deployments or approved aliases for the alpha. A protected Vercel Preview is not a webhook destination or a judge-ready demo. Do not promote this PR to production merely to obtain a URL.
5. **Public user identity must be app-bound.** Resolve the Supabase Auth subject server-side using the configured issuer. Use that subject as the public chatbot wallet ID. The browser must not select another user's wallet. Command Center retains its independent membership, edit-role and Savings-module checks. Multiple exact origins must be explicit per app; no wildcard origin or global allow-all-workspaces switch.
6. **Installer acceptance must remain independent.** AI may propose a plan, not alter prices, the acceptance oracle, or approved output after diff approval. Require source/hash binding, no edits to main, target build, and actual tests of duplicate captures, retries, release and insufficient credits. Display unsupported-stack failures rather than claiming universal support.
7. **Recovery must not refund running work.** An operator recovery command needs authenticated/operator-only access, scoped identifiers, an audit record, and a confirmed failed/stopped execution or deliberate manual risk acknowledgement. Do not blindly expire holds or re-run unknown jobs.
8. **Security first.** Retire both manual legacy credit and debit routes, legacy checkout/capture/webhook and payouts before attaching new credentials. A new public authenticated dashboard must read the alpha kernel; the historical dashboard is not that implementation.
9. **Canonical SQL owns grants.** Include Supabase role revokes in `packages/billing/src/schema.sql`, not just an out-of-band editor snippet. Verify effective schema/table/function access and exposed API schemas. A null `pgrst.db_schemas` setting alone does not prove exposure configuration.
10. **Optional features remain optional.** Venmo follows the public core flow. Payouts, Agent Toolkit/MCP and sponsor grids must not delay a working installer/payment story. Merchant captures already receive payment; payouts are not necessary to demonstrate prepaid application credits.

## Execution order and acceptance

- **Foundation:** canonical migration, provider access, unsafe route retirement. Existing 33-test CI is the prior baseline; report new validation separately.
- **Identity + public target:** per-app issuer/origin/feature policy, Supabase Auth, verified-user wallets, chatbot model adapter, alpha-backed UI. Exit: two-user isolation and no-session/foreign-origin rejection.
- **Installer:** public before/after target and reviewed diff/branch flow. Exit: target compile plus fixed billing acceptance tests. Do not count a plan-generation fixture as real integration acceptance.
- **Live sandbox:** after price confirmation and merchant configuration, deploy a public alpha endpoint, list then register only the alpha webhook, and capture as a separate sandbox buyer. Exit: actual order/capture/event receipt, exactly one funding, failure/retry/zero-balance proof.
- **Command Center:** isolated throwaway user/workspace and approved Savings fixture only. Exit: real authenticated target flow with the same kernel. No production project or customer data.
- **Submission:** real demo links, runnable README, video and exact-head green checks; only then mark PR #8 ready. Do not merge or submit Devpost.

## Rules check

[Official rules](https://paypalaihackathon.devpost.com/rules), checked 2026-10-23: PayPal plus AI is required, the public repository must contain the necessary source/assets/instructions, and the demo must actually work. Public hosting is optional when complete setup/run instructions are supplied. A hosted public chatbot remains a useful deliberate delivery choice, not an additional rules requirement. The judges may score the supplied presentation without trying the demo.

No access token, private key, customer data or sandbox account password belongs in this document. Provide test access through controlled instructions, not publicly committed credentials.
