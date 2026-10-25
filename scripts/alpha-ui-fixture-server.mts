/** Local-only browser contract harness. NOT a deployable app or PayPal/AI receipt. */
import { createServer } from "node:http";
import postgres from "postgres";
import {
  BillingKernel,
  BillingError,
  migrate,
} from "../packages/billing/src/index";
import { SandboxPayPal } from "../packages/billing/src/paypal";
import {
  createHandler,
  ConfirmedWorkFailure,
} from "../packages/billing/src/service";
const url = process.env.METERKIT_TEST_DATABASE_URL;
if (
  !url ||
  new URL(url).pathname !== "/meterkit_ui_test" ||
  !["localhost", "127.0.0.1"].includes(new URL(url).hostname)
)
  throw new Error("Disposable local meterkit_ui_test database required.");
const sql = postgres(url, { onnotice: () => {} });
await migrate(sql);
await sql`truncate meterkit_alpha.entries,meterkit_alpha.jobs,meterkit_alpha.orders,meterkit_alpha.wallets,meterkit_alpha.events`;
const kernel = new BillingKernel(sql);
let customId = "";
let orderStatus = "APPROVED";
const paypal = new SandboxPayPal(kernel, {
  clientId: "fixture",
  clientSecret: "fixture",
  merchantId: "fixture",
  webhookId: "fixture",
  returnUrl: "http://127.0.0.1:43128/meterkit-alpha",
  packs: { demo: { credits: 5, amountMinor: 100 } },
  fetcher: async (input, options) => {
    const path = String(input);
    if (path.endsWith("/v1/oauth2/token"))
      return Response.json({ access_token: "fixture" });
    if (path.endsWith("/orders") && options?.method === "POST") {
      customId = JSON.parse(String(options.body)).purchase_units[0].custom_id;
      return Response.json({
        id: "fixture-order",
        links: [
          {
            rel: "approve",
            href: "https://www.sandbox.paypal.com/checkoutnow?token=fixture-order",
          },
        ],
      });
    }
    if (path.endsWith("/capture")) orderStatus = "COMPLETED";
    return Response.json({
      id: "fixture-order",
      status: orderStatus,
      purchase_units: [
        {
          custom_id: customId,
          payee: { merchant_id: "fixture" },
          amount: { value: "1.00", currency_code: "USD" },
          payments: {
            captures: [
              {
                id: "fixture-capture",
                status: orderStatus,
                final_capture: true,
                amount: { value: "1.00", currency_code: "USD" },
              },
            ],
          },
        },
      ],
    });
  },
});
const handler = createHandler({
  enabled: true,
  origin: "http://127.0.0.1:43128",
  feature: "savings.explanation",
  credits: 5,
  kernel,
  paypal,
  authenticate: async (req, workspaceId) => {
    if (req.headers.get("authorization") !== "Bearer fixture-session-token")
      throw new BillingError("unauthorized", 401);
    if (workspaceId !== "fixture-workspace")
      throw new BillingError("forbidden", 403);
    return { scope: { appId: "fixture", workspaceId }, userId: "fixture-user" };
  },
  prepare: async (_identity, recordId) => ({
    recordId,
    revision: 1,
    calculation: { netMinor: 100 },
  }),
  generate: async (input) => {
    const { recordId } = input as { recordId: string };
    if (recordId === "fixture-failure") throw new ConfirmedWorkFailure();
    return {
      summary:
        "Fixture explanation. The stored comparison is an estimate; no subscription was changed.",
      citationIds: [recordId],
    };
  },
});
createServer(async (req, res) => {
  try {
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 65000) {
        res.writeHead(413).end();
        return;
      }
      chunks.push(chunk);
    }
    const request = new Request(`http://127.0.0.1:43129${req.url}`, {
      method: req.method,
      headers: req.headers as Record<string, string>,
      ...(["GET", "HEAD"].includes(req.method ?? "GET")
        ? {}
        : { body: Buffer.concat(chunks) }),
    });
    const response = await handler(request);
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(await response.text());
  } catch {
    res.writeHead(503).end();
  }
}).listen(43129, "127.0.0.1", () =>
  console.log(
    "Fixture-only backend on 127.0.0.1:43129; real Postgres, simulated PayPal/model/auth.",
  ),
);
