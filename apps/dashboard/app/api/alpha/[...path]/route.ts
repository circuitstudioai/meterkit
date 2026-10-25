import postgres from "postgres";
import { BillingKernel } from "../../../../../../packages/billing/src/index";
import { SandboxPayPal } from "../../../../../../packages/billing/src/paypal";
import { createHandler } from "../../../../../../packages/billing/src/service";
import { supabaseAdapter } from "../../../../../../packages/billing/src/supabase";
import { geminiExplanation } from "../../../../../../packages/billing/src/gemini";
let handler: ReturnType<typeof createHandler> | undefined;
function configured() {
  if (handler) return handler;
  const e = process.env;
  if (
    e.METERKIT_ALPHA_ENABLED !== "true" ||
    !e.DATABASE_URL ||
    !e.SIGNAL_SUPABASE_URL ||
    !e.SIGNAL_SUPABASE_ANON_KEY ||
    !e.METERKIT_ALPHA_ORIGIN ||
    !e.METERKIT_ALPHA_POLICY
  )
    throw new Error("alpha_disabled");
  const p = JSON.parse(e.METERKIT_ALPHA_POLICY);
  if (
    p.approved !== true ||
    typeof p.appId !== "string" ||
    p.feature !== "savings.explanation" ||
    !Number.isSafeInteger(p.credits) ||
    p.credits <= 0 ||
    !Array.isArray(p.workspaceIds) ||
    !p.workspaceIds.length ||
    !p.packs ||
    typeof p.packs !== "object"
  )
    throw new Error("invalid_policy");
  const kernel = new BillingKernel(
    postgres(e.DATABASE_URL, {
      max: 4,
      prepare: false,
      ssl: ["localhost", "127.0.0.1"].includes(new URL(e.DATABASE_URL).hostname)
        ? undefined
        : "require",
    }),
  );
  const adapter = supabaseAdapter({
    url: e.SIGNAL_SUPABASE_URL,
    anonKey: e.SIGNAL_SUPABASE_ANON_KEY,
    appId: p.appId,
    workspaceIds: p.workspaceIds,
  });
  const paypal = new SandboxPayPal(kernel, {
    clientId: e.PAYPAL_CLIENT_ID ?? "",
    clientSecret: e.PAYPAL_CLIENT_SECRET ?? "",
    merchantId: e.PAYPAL_MERCHANT_ID ?? "",
    webhookId: e.PAYPAL_WEBHOOK_ID ?? "",
    returnUrl: `${e.METERKIT_ALPHA_ORIGIN}/meterkit-alpha`,
    packs: p.packs,
  });
  handler = createHandler({
    enabled: true,
    origin: e.METERKIT_ALPHA_ORIGIN,
    feature: p.feature,
    credits: p.credits,
    kernel,
    paypal,
    ...adapter,
    generate: geminiExplanation({
      key: e.GEMINI_API_KEY ?? "",
      model: e.GEMINI_MODEL ?? "gemini-2.5-flash",
      dataApproved: e.METERKIT_ALPHA_DATA_APPROVED === "true",
    }),
  });
  return handler;
}
async function dispatch(request: Request) {
  try {
    return await configured()(request);
  } catch {
    return Response.json(
      { error: "alpha_not_configured" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
export const GET = dispatch;
export const POST = dispatch;
export const OPTIONS = dispatch;
