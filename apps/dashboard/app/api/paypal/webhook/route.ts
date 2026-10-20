import { NextRequest, NextResponse } from "next/server";
import { verifyPaypalWebhook } from "@meterkit/sdk";
import { paypalApiBase, paypalClient } from "@/lib/paypal/client";
import { env } from "@/lib/env";
import { db, topups, auditLog } from "@/lib/db";
import { meterKit } from "@/lib/meter-kit";
import { usdToCredits } from "@/lib/credits";
import { eq } from "drizzle-orm";
import { errorMessage } from "@/lib/errors";

const HANDLED = new Set([
  "PAYMENT.CAPTURE.COMPLETED",
  "CHECKOUT.ORDER.APPROVED",
  "PAYMENT.PAYOUTS-ITEM.SUCCEEDED",
  "PAYMENT.PAYOUTS-ITEM.FAILED",
]);

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });

    if (env.paypalWebhookId) {
      const token = await paypalClient.getAccessToken();
      const valid = await verifyPaypalWebhook({
        webhookId: env.paypalWebhookId,
        headers,
        body,
        accessToken: token,
        apiBase: paypalApiBase(),
      });
      if (!valid) {
        return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
      }
    }

    const event = JSON.parse(body) as {
      event_type?: string;
      resource?: {
        id?: string;
        amount?: { value?: string };
        supplementary_data?: { related_ids?: { order_id?: string } };
      };
    };

    if (event.event_type && HANDLED.has(event.event_type)) {
      await db.insert(auditLog).values({
        appId: 1,
        action: `paypal_webhook:${event.event_type}`,
        details: body,
      });
    }

    if (event.event_type === "PAYMENT.CAPTURE.COMPLETED") {
      const orderId =
        event.resource?.supplementary_data?.related_ids?.order_id || event.resource?.id;
      const usd = parseFloat(event.resource?.amount?.value ?? "0");
      if (orderId && usd > 0) {
        const [existing] = await db
          .select()
          .from(topups)
          .where(eq(topups.paypalOrderId, orderId))
          .limit(1);
        if (existing && existing.status !== "completed") {
          await meterKit.credit({
            userId: existing.userId,
            amount: usdToCredits(usd),
            idempotencyKey: `paypal:${orderId}`,
            paypalTransactionId: orderId,
          });
          await db.update(topups).set({ status: "completed" }).where(eq(topups.id, existing.id));
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: errorMessage(error, "Webhook failed") }, { status: 500 });
  }
}
