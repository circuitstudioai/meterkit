import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import postgres from "postgres";
import { BillingKernel, migrate } from "./index";
import { publicChatHandler, chatGeneration } from "./public-chat";
import { ConfirmedWorkFailure } from "./service";
const url = process.env.METERKIT_TEST_DATABASE_URL;
if (!url || new URL(url).pathname !== "/meterkit_test") throw new Error("dedicated meterkit_test required");
const db = postgres(url, { onnotice: () => {} });
const kernel = new BillingKernel(db);
const first = "22222222-2222-4222-8222-222222222222", second = "33333333-3333-4333-8333-333333333333";
const scope = { appId: "public-chat-fixture", workspaceId: first };
let calls = 0, authCalls = 0, mode = "success";
const config = () => ({
  enabled: true, sandboxPolicyApproved: true, origin: "https://chat.test", kernel,
  identity: { url: "https://fixture.supabase.co", anonKey: "fixture", appId: scope.appId,
    fetcher: (async (_input, init) => { authCalls++; return Response.json({ id: new Headers(init?.headers).get("authorization") === "Bearer second" ? second : first }); }) as typeof fetch },
  paypal: { clientId: "", clientSecret: "", merchantId: "", webhookId: "" },
  model: { key: "fixture", model: "gemini-fixture", dataApproved: true,
    fetcher: (async (_input, init) => {
      calls++;
      assert.equal(init?.redirect, "error");
      const sent = JSON.parse(String(init?.body));
      assert.equal(sent.contents[0].parts[0].text, "Hello");
      if (mode === "unknown") throw new Error("transport fixture");
      if (mode === "failed") return new Response("no", { status: 503 });
      return Response.json({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: "Fixture reply" }] } }] });
    }) as typeof fetch },
});
const request = (data: Record<string, unknown> = {}, token = "first", origin = "https://chat.test") => new Request("https://chat.test/api/alpha/jobs", {
  method: "POST", headers: { Authorization: `Bearer ${token}`, Origin: origin, "Content-Type": "application/json" },
  body: JSON.stringify({ key: "job-1", recordId: "message-1", expectedCredits: 5, prompt: "Hello", ...data }),
});
before(async () => migrate(db));
beforeEach(async () => {
  calls = 0; authCalls = 0; mode = "success";
  await db`truncate meterkit_alpha.entries,meterkit_alpha.jobs,meterkit_alpha.orders,meterkit_alpha.wallets,meterkit_alpha.events`;
  await kernel.createIntent(scope, { id: "fixture-intent", packId: "sandbox-50", credits: 50, amountMinor: 100, currency: "USD", merchantId: "fixture" });
  await kernel.attachOrder("fixture-intent", "fixture-order");
  await kernel.fulfill({ orderId: "fixture-order", captureId: "fixture-capture", status: "COMPLETED", amountMinor: 100, currency: "USD", merchantId: "fixture" });
});
after(async () => db.end());
test("public composition binds verified user, validated prompt and exactly-once five-credit settlement", async () => {
  const handler = publicChatHandler(config());
  const response = await handler(request({ userId: second, appId: "forged" }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: "completed", result: { text: "Fixture reply" } });
  assert.equal((await handler(request())).status, 200);
  assert.equal((await handler(request({ prompt: "Changed prompt" }))).status, 409);
  assert.equal(calls, 1);
  assert.deepEqual(await kernel.balance(scope), { available: 45, held: 0 });
  assert.equal((await handler(request({}, "second"))).status, 402);
  assert.equal((await handler(request({ workspaceId: first }, "second"))).status, 403);
  assert.equal(calls, 1);
});
test("disabled policy, missing session, foreign origin, bad prompt and changed price do no paid work", async () => {
  assert.equal((await publicChatHandler({ ...config(), sandboxPolicyApproved: false })(request())).status, 503);
  assert.equal((await publicChatHandler({ ...config(), enabled: false })(request())).status, 503);
  const handler = publicChatHandler(config());
  const missing = request(); missing.headers.delete("authorization");
  assert.equal((await handler(missing)).status, 401);
  assert.equal((await handler(request({}, "first", "https://foreign.test"))).status, 403);
  assert.equal(authCalls, 0);
  for (const prompt of ["", " ", 3, "x".repeat(4001)]) assert.equal((await handler(request({ prompt }))).status, 400);
  assert.equal((await handler(request({ expectedCredits: 1 }))).status, 409);
  assert.equal(calls, 0);
  assert.deepEqual(await kernel.balance(scope), { available: 50, held: 0 });
});
test("confirmed model rejection releases; unknown transport retains hold and never reruns", async () => {
  const handler = publicChatHandler(config());
  mode = "failed";
  assert.equal((await handler(request())).status, 502);
  assert.deepEqual(await kernel.balance(scope), { available: 50, held: 0 });
  mode = "unknown";
  assert.equal((await handler(request({ key: "job-2" }))).status, 202);
  assert.deepEqual(await kernel.balance(scope), { available: 45, held: 5 });
  assert.equal((await handler(request({ key: "job-2" }))).status, 202);
  assert.equal(calls, 2);
});
test("model adapter refuses unapproved configuration, oversized, malformed and incomplete replies", async () => {
  let network = 0;
  const base = { key: "fixture", model: "fixture", dataApproved: true };
  await assert.rejects(() => chatGeneration({ ...base, dataApproved: false, fetcher: async () => { network++; return new Response(); } })({ prompt: "Hello" }), ConfirmedWorkFailure);
  assert.equal(network, 0);
  for (const response of [new Response("x".repeat(65537)), new Response("not-json"), Response.json({ candidates: [{ finishReason: "MAX_TOKENS", content: { parts: [{ text: "partial" }] } }] }), Response.json({ candidates: [] })]) {
    await assert.rejects(() => chatGeneration({ ...base, fetcher: async () => response })({ prompt: "Hello" }), ConfirmedWorkFailure);
  }
});
