import { test } from "node:test";
import assert from "node:assert/strict";
import { createHandler } from "./service";
import type { BillingKernel, Scope } from "./index";
import type { SandboxPayPal } from "./paypal";
const user = "22222222-2222-4222-8222-222222222222";
// Service-boundary fixtures only; not live auth, Postgres or payment evidence.
function options() {
  const balances: Scope[] = [];
  return {
    balances,
    config: {
      enabled: true, origin: "https://chat.test", scopeMode: "authenticated-user" as const,
      feature: "chat.reply", credits: 5,
      kernel: { balance: async (scope: Scope) => { balances.push(scope); return { available: 0, held: 0 }; } } as unknown as BillingKernel,
      paypal: {} as SandboxPayPal,
      authenticate: async () => ({ scope: { appId: "chatbot", workspaceId: user }, userId: user }),
      prepare: async () => ({}), generate: async () => ({}),
    },
  };
}
test("authenticated-user wallet scope comes from verified identity without a browser workspace ID", async () => {
  const { config, balances } = options();
  const response = await createHandler(config)(new Request("https://billing.test/api/alpha/balance", { headers: { Origin: "https://chat.test", Authorization: "Bearer fixture" } }));
  assert.equal(response.status, 200);
  assert.deepEqual(balances, [{ appId: "chatbot", workspaceId: user }]);
});
test("each handler accepts only its exact configured app origins", async () => {
  const { config, balances } = options();
  const handler = createHandler({ ...config, origin: ["https://chat.test", "http://localhost:5173"] });
  for (const origin of ["https://chat.test", "http://localhost:5173"]) {
    const response = await handler(new Request("https://billing.test/api/alpha/balance", { headers: { Origin: origin } }));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("Access-Control-Allow-Origin"), origin);
  }
  for (const origin of ["https://chat.test.evil.test", "https://other-app.test", "null"]) {
    assert.equal((await handler(new Request("https://billing.test/api/alpha/balance", { headers: { Origin: origin } }))).status, 403);
  }
  assert.equal(balances.length, 2);
});
test("a browser cannot choose another wallet and a faulty adapter cannot return a shared wallet", async () => {
  const { config, balances } = options();
  const handler = createHandler(config);
  const forged = new Request("https://billing.test/api/alpha/balance?workspaceId=other", { headers: { Origin: "https://chat.test" } });
  assert.equal((await handler(forged)).status, 403);
  const shared = createHandler({ ...config, authenticate: async () => ({ scope: { appId: "chatbot", workspaceId: "shared" }, userId: user }) });
  assert.equal((await shared(new Request("https://billing.test/api/alpha/balance"))).status, 403);
  assert.equal(balances.length, 0);
});
test("workspace mode still requires its independently authorized workspace ID", async () => {
  const { config, balances } = options();
  const handler = createHandler({ ...config, scopeMode: "workspace" });
  assert.equal((await handler(new Request("https://billing.test/api/alpha/balance"))).status, 403);
  assert.equal((await handler(new Request(`https://billing.test/api/alpha/balance?workspaceId=${user}`))).status, 200);
  assert.equal(balances.length, 1);
});
test("empty, wildcard, path-bearing and null origin policies fail closed at construction", () => {
  const { config } = options();
  for (const origin of [[], ["*"], ["null"], ["https://chat.test/path"], ["https://chat.test/"]])
    assert.throws(() => createHandler({ ...config, origin }), { code: "invalid_origin_policy" });
});
