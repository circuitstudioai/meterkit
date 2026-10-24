import postgres from "postgres";
import { BillingKernel } from "../../../../../../packages/billing/src/index";
import { publicChatHandler } from "../../../../../../packages/billing/src/public-chat";
export const runtime = "nodejs";
let handler: ReturnType<typeof publicChatHandler> | undefined;
function configured() {
  if (handler) return handler;
  const e = process.env;
  // Deliberately separate from the existing Command Center alpha switch/policy.
  if (e.METERKIT_CHAT_ENABLED !== "true" || e.METERKIT_CHAT_SANDBOX_POLICY_APPROVED !== "true" ||
      !e.DATABASE_URL || !e.METERKIT_CHAT_APP_ID || !e.METERKIT_CHAT_ORIGIN ||
      !e.METERKIT_CHAT_SUPABASE_URL || !e.METERKIT_CHAT_SUPABASE_ANON_KEY)
    throw new Error("chat_not_configured");
  const db = postgres(e.DATABASE_URL, { max: 4, prepare: false,
    ssl: ["localhost", "127.0.0.1"].includes(new URL(e.DATABASE_URL).hostname) ? undefined : "require" });
  handler = publicChatHandler({
    enabled: true, sandboxPolicyApproved: true,
    origin: e.METERKIT_CHAT_ORIGIN,
    identity: { url: e.METERKIT_CHAT_SUPABASE_URL, anonKey: e.METERKIT_CHAT_SUPABASE_ANON_KEY, appId: e.METERKIT_CHAT_APP_ID },
    kernel: new BillingKernel(db),
    paypal: { clientId: e.PAYPAL_CLIENT_ID ?? "", clientSecret: e.PAYPAL_CLIENT_SECRET ?? "",
      merchantId: e.PAYPAL_MERCHANT_ID ?? "", webhookId: e.PAYPAL_WEBHOOK_ID ?? "" },
    model: { key: e.GEMINI_API_KEY ?? "", model: e.GEMINI_MODEL ?? "gemini-2.5-flash",
      dataApproved: e.METERKIT_CHAT_DATA_APPROVED === "true" },
  });
  return handler;
}
async function dispatch(request: Request) {
  try { return await configured()(request); }
  catch { return Response.json({ error: "chat_not_configured" }, { status: 503, headers: { "Cache-Control": "no-store" } }); }
}
export const GET = dispatch;
export const POST = dispatch;
export const OPTIONS = dispatch;
