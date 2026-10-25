import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import postgres from "postgres";
import { BillingKernel, migrate } from "./index";
import { SandboxPayPal } from "./paypal";
const url = process.env.METERKIT_TEST_DATABASE_URL;
if (!url || new URL(url).pathname !== "/meterkit_test")
  throw new Error("Use a dedicated meterkit_test database");
const sql = postgres(url, { onnotice: () => {} });
const scope = { appId: "app", workspaceId: "workspace" };
let kernel: BillingKernel;
let calls: string[];
let status = "COMPLETED";
let verified = true;
let amount = "1.00";
let customId = "";
const fetcher: typeof fetch = async (input, init) => {
  const url = String(input);
  calls.push(`${init?.method ?? "GET"} ${url}`);
  if (url.endsWith("/v1/oauth2/token"))
    return Response.json({ access_token: "fixture", expires_in: 3600 });
  if (url.endsWith("verify-webhook-signature"))
    return Response.json({
      verification_status: verified ? "SUCCESS" : "FAILURE",
    });
  if (url.endsWith("/v2/checkout/orders") && init?.method === "POST") {
    customId = JSON.parse(String(init.body)).purchase_units[0].custom_id;
    return Response.json({
      id: "order1",
      links: [
        {
          rel: "approve",
          href: "https://www.sandbox.paypal.com/checkoutnow?token=order1",
        },
      ],
    });
  }
  return Response.json({
    id: "order1",
    status,
    purchase_units: [
      {
        custom_id: customId,
        payee: { merchant_id: "merchant" },
        amount: { currency_code: "USD", value: "1.00" },
        payments: {
          captures: [
            {
              id: "capture1",
              status,
              final_capture: true,
              amount: { currency_code: "USD", value: amount },
            },
          ],
        },
      },
    ],
  });
};
let paypal: SandboxPayPal;
before(async () => migrate(sql));
beforeEach(async () => {
  await sql`truncate meterkit_alpha.entries,meterkit_alpha.jobs,meterkit_alpha.orders,meterkit_alpha.wallets,meterkit_alpha.events`;
  kernel = new BillingKernel(sql);
  calls = [];
  verified = true;
  status = "COMPLETED";
  amount = "1.00";
  paypal = new SandboxPayPal(kernel, {
    clientId: "fixture",
    clientSecret: "fixture",
    merchantId: "merchant",
    webhookId: "webhook",
    returnUrl: "https://example.test/alpha",
    packs: { demo: { credits: 10, amountMinor: 100 } },
    fetcher,
  });
});
after(async () => sql.end());
test("server catalog creates bound order; capture and verified webhook fund once", async () => {
  await paypal.create(scope, "demo", "request1");
  await paypal.capture(scope, "order1");
  await paypal.webhook(headers(), event());
  await paypal.webhook(headers(), event());
  assert.deepEqual(await kernel.balance(scope), { available: 10, held: 0 });
  assert.equal((await sql`select * from meterkit_alpha.entries`).length, 1);
  assert.ok(calls.every((c) => c.includes("api-m.sandbox.paypal.com")));
});
test("unsigned, failed verification, pending or mismatched capture cannot fund", async () => {
  await paypal.create(scope, "demo", "request1");
  await assert.rejects(() => paypal.webhook({}, event()));
  verified = false;
  await assert.rejects(() => paypal.webhook(headers(), event()));
  verified = true;
  status = "PENDING";
  await assert.rejects(() => paypal.capture(scope, "order1"));
  status = "COMPLETED";
  amount = "2.00";
  await assert.rejects(() => paypal.capture(scope, "order1"));
  assert.equal((await kernel.balance(scope)).available, 0);
});
test("unknown pack and foreign workspace never reach PayPal capture", async () => {
  await assert.rejects(() => paypal.create(scope, "unknown", "key"));
  assert.equal(calls.length, 0);
  await paypal.create(scope, "demo", "request1");
  const previous = calls.length;
  await assert.rejects(() =>
    paypal.capture({ ...scope, workspaceId: "other" }, "order1"),
  );
  assert.equal(calls.length, previous);
});
function headers() {
  return {
    "paypal-auth-algo": "SHA256withRSA",
    "paypal-cert-url": "https://api.sandbox.paypal.com/cert",
    "paypal-transmission-id": "transmission",
    "paypal-transmission-sig": "sig",
    "paypal-transmission-time": "2026-10-22T12:00:00Z",
  };
}
function event() {
  return {
    id: "event1",
    event_type: "PAYMENT.CAPTURE.COMPLETED",
    resource: {
      id: "capture1",
      supplementary_data: { related_ids: { order_id: "order1" } },
    },
  };
}
