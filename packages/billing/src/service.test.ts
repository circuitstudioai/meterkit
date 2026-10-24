import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import postgres from "postgres";
import { BillingKernel, BillingError, migrate } from "./index";
import { createHandler, ConfirmedWorkFailure } from "./service";
import { SandboxPayPal } from "./paypal";
const url = process.env.METERKIT_TEST_DATABASE_URL;
if (!url || new URL(url).pathname !== "/meterkit_test")
  throw new Error("dedicated meterkit_test required");
const sql = postgres(url, { onnotice: () => {} }),
  scope = { appId: "app", workspaceId: "workspace" };
let kernel: BillingKernel;
let runs = 0;
let mode = "success";
before(async () => migrate(sql));
beforeEach(async () => {
  await sql`truncate meterkit_alpha.entries,meterkit_alpha.jobs,meterkit_alpha.orders,meterkit_alpha.wallets,meterkit_alpha.events`;
  kernel = new BillingKernel(sql);
  runs = 0;
  mode = "success";
  await kernel.createIntent(scope, {
    id: "i",
    packId: "demo",
    credits: 5,
    amountMinor: 100,
    currency: "USD",
    merchantId: "m",
  });
  await kernel.attachOrder("i", "o");
  await kernel.fulfill({
    orderId: "o",
    captureId: "c",
    status: "COMPLETED",
    amountMinor: 100,
    currency: "USD",
    merchantId: "m",
  });
});
after(async () => sql.end());
function handler() {
  return createHandler({
    enabled: true,
    origin: "http://app.test",
    feature: "summary",
    credits: 5,
    kernel,
    paypal: new SandboxPayPal(kernel, {
      clientId: "",
      clientSecret: "",
      merchantId: "",
      webhookId: "",
      returnUrl: "",
      packs: {},
    }),
    authenticate: async (req, workspaceId) => {
      if (req.headers.get("authorization") !== "Bearer fixture")
        throw new BillingError("unauthorized", 401);
      if (workspaceId !== "workspace") throw new BillingError("forbidden", 403);
      return { scope, userId: "user" };
    },
    prepare: async () => ({ confirmed: "fixture evidence" }),
    generate: async () => {
      runs++;
      if (mode === "fail") throw new ConfirmedWorkFailure();
      if (mode === "unknown") throw new Error("timeout");
      return { summary: "fixture" };
    },
  });
}
function request(key = "job", workspaceId = "workspace", token = "fixture") {
  return new Request("http://api.test/api/alpha/jobs", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      Origin: "http://app.test",
    },
    body: JSON.stringify({
      workspaceId,
      key,
      recordId: "record",
      expectedCredits: 5,
    }),
  });
}
test("authenticated job charges once, returns persisted result; zero credit never invokes provider", async () => {
  const h = handler();
  assert.equal((await h(request())).status, 200);
  assert.equal((await h(request())).status, 200);
  assert.equal(runs, 1);
  assert.equal((await h(request("second"))).status, 402);
  assert.equal(runs, 1);
});
test("auth, workspace and origin fail before any work or debit", async () => {
  const h = handler();
  assert.equal((await h(request("j", "other"))).status, 403);
  assert.equal((await h(request("j", "workspace", "bad"))).status, 401);
  const bad = request();
  bad.headers.set("origin", "http://attacker.test");
  assert.equal((await h(bad)).status, 403);
  assert.equal(runs, 0);
  assert.equal((await kernel.balance(scope)).available, 5);
});
test("confirmed failure refunds; unknown result remains held and retry does not execute again", async () => {
  const h = handler();
  mode = "fail";
  assert.equal((await h(request())).status, 502);
  assert.equal((await kernel.balance(scope)).available, 5);
  mode = "unknown";
  assert.equal((await h(request("unknown"))).status, 202);
  assert.equal((await h(request("unknown"))).status, 202);
  assert.equal(runs, 2);
  assert.deepEqual(await kernel.balance(scope), { available: 0, held: 5 });
});
test("changed price requires review and spends nothing", async () => {
  const req = request();
  const body = await req.json();
  const changed = new Request(req.url, {
    method: "POST",
    headers: req.headers,
    body: JSON.stringify({ ...body, expectedCredits: 1 }),
  });
  assert.equal((await handler()(changed)).status, 409);
  assert.equal(runs, 0);
  assert.equal((await kernel.balance(scope)).available, 5);
});
