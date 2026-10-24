# Public-app identity foundation — October 24

This is code preparation under the v4 review, not a deployed public chatbot, completed installer, live Auth receipt or payment acceptance. The existing Command Center alpha route remains disabled by default and uses its original workspace/membership/edit-role/Savings checks. No hosted identity, policy, credential, merchant, webhook or Production setting changes are included.

## Trust boundary

The new `packages/billing/src/user-identity.ts` adapter asks the server-configured Supabase project's `/auth/v1/user` endpoint to authenticate the bearer token. It never decodes a browser token and trusts its payload as authority. The configured app ID and authenticated subject determine the wallet scope: `{appId, workspaceId: user.id}`. Distinct apps must use distinct stable server-owned app IDs. No email/profile metadata is retained in the identity.

The issuer must be a root HTTPS origin without embedded credentials, a query, fragment or custom port. This supports a server-configured Supabase/custom Auth domain; request data cannot select the issuer, key or app. One request only, ten-second deadline plus caller cancellation, no redirects/cache, at most64KiB of response data. Provider errors and user metadata are not returned to the caller. A missing/invalid token, invalid subject, outage, redirect or oversized response never yields an authenticated wallet.

Supabase documents why a server-verified user request, rather than an unverified session payload, can underpin authorization: https://supabase.com/docs/reference/javascript/auth-getuser.

## Future handler wiring

A public-app handler must explicitly set `scopeMode: "authenticated-user"`, use the adapter's `authenticate`, configure its own exact origin string/list, and supply its separately approved feature/price, model-input validator and provider implementation. This document does not enable those policies or provide a public route.

- Public requests omit `workspaceId`. The adapter and handler both reject a client wallet selector; the handler independently requires the wallet ID to equal the authenticated user ID.
- Browser `userId`/`appId` data does not set scope. The server-owned adapter determines both values.
- `origin` accepts one exact origin or an exact list per handler. Empty, wildcard, opaque/null, path-bearing or noncanonical origins fail at construction. An unlisted request origin fails before authentication/work. An absent Origin is not authentication: a valid bearer token remains required by the adapter.
- `scopeMode` defaults to workspace behavior. Do not switch Command Center to public-user mode or remove its independent membership, edit-role and Savings-module checks.
- CORS is not authorization. Do not create a global wildcard or allow-all-workspaces switch.

## Executed evidence

Two service-boundary regressions were observed red then green: a legitimate verified-user wallet without a browser workspace selector, and a second explicitly configured origin. The new Auth boundary's valid-user test was observed rejecting before implementation and passing afterward.

Eleven focused Auth/scope/origin contracts cover two users, two app/issuer configurations, missing credentials, wallet override, bad identity data, provider failures, no redirect/cache, cancellation, response-size bounds, malformed configuration and unchanged workspace behavior. Auth and provider network results are fixtures.

A separate handler test uses real disposable Postgres `meterkit_test`: fixture funding belongs to only one app/user, the other user cannot spend it or override the owner, invalid sessions fail, one successful job settles once across replay and another app has no balance. This is real database/service evidence with fixture Auth/funding/model data, NOT real PayPal or hosted Supabase Auth acceptance.

Full local workspace tests:48 pass, plus six retired-route refusal checks. Strict billing typecheck, scoped ESLint and all workspace builds pass. The pre-existing root pages-directory ESLint notice is not a new source error.

## Still pending

Public Auth UI/session handling and actual hosted two-user acceptance; the public chatbot/model adapter; installer target/build acceptance; alpha-backed dashboard; approved sandbox pack/action policy and merchant ID; public callback/webhook plus buyer approval and actual capture/event/job receipts; isolated real Command Center flow. No price or payment activation follows merely from these tests passing.
