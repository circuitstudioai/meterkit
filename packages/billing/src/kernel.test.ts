import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import postgres from "postgres";
import { BillingKernel, migrate } from "./index";
const url = process.env.METERKIT_TEST_DATABASE_URL;
if (url && new URL(url).pathname !== "/meterkit_test")
  throw new Error(
    "Use a dedicated meterkit_test database; contracts truncate alpha tables",
  );
if (!url)
  throw new Error(
    "METERKIT_TEST_DATABASE_URL required: tests never silently skip Postgres",
  );
const db = postgres(url, { max: 8 });
const scope = { appId: "test-app", workspaceId: "test-workspace" };
let kernel: BillingKernel;
before(async () => {
  await migrate(db);
});
beforeEach(async () => {
  await db`truncate meterkit_alpha.entries,meterkit_alpha.jobs,meterkit_alpha.orders,meterkit_alpha.wallets,meterkit_alpha.events`;
  kernel = new BillingKernel(db);
});
after(async () => {
  await db.end();
});
async function fund(credits = 10) {
  await kernel.createIntent(scope, {
    id: "intent1",
    packId: "demo",
    credits,
    amountMinor: 100,
    currency: "USD",
    merchantId: "merchant",
  });
  await kernel.attachOrder("intent1", "order1");
  await kernel.fulfill({
    orderId: "order1",
    captureId: "capture1",
    status: "COMPLETED",
    amountMinor: 100,
    currency: "USD",
    merchantId: "merchant",
  });
}
test("one completed capture funds once; mismatches and invalid numbers never fund", async () => {
  await fund();
  await kernel.fulfill({
    orderId: "order1",
    captureId: "capture1",
    status: "COMPLETED",
    amountMinor: 100,
    currency: "USD",
    merchantId: "merchant",
  });
  assert.equal((await kernel.balance(scope)).available, 10);
  await assert.rejects(() =>
    kernel.fulfill({
      orderId: "order1",
      captureId: "other",
      status: "COMPLETED",
      amountMinor: 100,
      currency: "USD",
      merchantId: "merchant",
    }),
  );
  for (const credits of [0, -1, NaN, Infinity, 1.5])
    await assert.rejects(() =>
      kernel.createIntent(scope, {
        id: "bad",
        packId: "demo",
        credits,
        amountMinor: 100,
        currency: "USD",
        merchantId: "merchant",
      }),
    );
});
test("last-credit race across service instances permits only one reservation", async () => {
  await fund(5);
  const second = new BillingKernel(db);
  const outcomes = await Promise.allSettled([
    kernel.reserve(scope, {
      key: "a",
      feature: "summary",
      credits: 5,
      input: {},
    }),
    second.reserve(scope, {
      key: "b",
      feature: "summary",
      credits: 5,
      input: {},
    }),
  ]);
  assert.equal(outcomes.filter((r) => r.status === "fulfilled").length, 1);
  assert.deepEqual(await kernel.balance(scope), { available: 0, held: 5 });
});
test("idempotent completed result is retained and conflicting reuse is denied", async () => {
  await fund();
  const job = {
    key: "job",
    feature: "summary",
    credits: 5,
    input: { evidence: "one" },
  };
  const reserved = await kernel.reserve(scope, job);
  assert.equal(reserved.created, true);
  assert.equal((await kernel.reserve(scope, job)).created, false);
  await kernel.complete(scope, "job", { summary: "stored" });
  await kernel.complete(scope, "job", { summary: "stored" });
  assert.deepEqual((await new BillingKernel(db).reserve(scope, job)).result, {
    summary: "stored",
  });
  assert.deepEqual(await kernel.balance(scope), { available: 5, held: 0 });
  await assert.rejects(() =>
    kernel.reserve(scope, { ...job, input: { evidence: "changed" } }),
  );
  await assert.rejects(() =>
    kernel.complete(scope, "job", { summary: "changed" }),
  );
});
test("confirmed failure releases exactly once; cannot settle released work", async () => {
  await fund();
  await kernel.reserve(scope, {
    key: "fail",
    feature: "summary",
    credits: 5,
    input: {},
  });
  await kernel.release(scope, "fail");
  await kernel.release(scope, "fail");
  assert.deepEqual(await kernel.balance(scope), { available: 10, held: 0 });
  await assert.rejects(() => kernel.complete(scope, "fail", {}));
});
test("workspace scope isolates balance, jobs, and order lookup", async () => {
  await fund();
  const other = { ...scope, workspaceId: "other" };
  assert.deepEqual(await kernel.balance(other), { available: 0, held: 0 });
  await assert.rejects(() => kernel.orderForScope(other, "order1"));
  await assert.rejects(() =>
    kernel.reserve(other, {
      key: "job",
      feature: "summary",
      credits: 1,
      input: {},
    }),
  );
});
test("wrong merchant, currency, amount or pending capture fails closed", async () => {
  await kernel.createIntent(scope, {
    id: "intent1",
    packId: "demo",
    credits: 10,
    amountMinor: 100,
    currency: "USD",
    merchantId: "merchant",
  });
  await kernel.attachOrder("intent1", "order1");
  const base = {
    orderId: "order1",
    captureId: "capture1",
    status: "COMPLETED",
    amountMinor: 100,
    currency: "USD",
    merchantId: "merchant",
  };
  for (const change of [
    { merchantId: "attacker" },
    { currency: "EUR" },
    { amountMinor: 1 },
    { status: "PENDING" },
  ])
    await assert.rejects(() => kernel.fulfill({ ...base, ...change }));
  assert.deepEqual(await kernel.balance(scope), { available: 0, held: 0 });
});
test("separate connection reopens held jobs; journal rejects edits", async () => {
  await fund();
  await kernel.reserve(scope, {
    key: "restart",
    feature: "summary",
    credits: 5,
    input: {},
  });
  const restarted = postgres(url!, { max: 1, onnotice: () => {} });
  try {
    const fresh = new BillingKernel(restarted);
    assert.deepEqual(await fresh.balance(scope), { available: 5, held: 5 });
    assert.equal(
      (
        await fresh.reserve(scope, {
          key: "restart",
          feature: "summary",
          credits: 5,
          input: {},
        })
      ).created,
      false,
    );
    await assert.rejects(
      () => restarted`update meterkit_alpha.entries set available_delta=999`,
    );
    await assert.rejects(() => restarted`delete from meterkit_alpha.entries`);
  } finally {
    await restarted.end();
  }
});
