import { NextRequest, NextResponse } from "next/server";
import { paypalClient } from "@/lib/paypal/client";
import { env } from "@/lib/env";
import { errorMessage } from "@/lib/errors";

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });

    if (env.paypalWebhookId) {
      const valid = await paypalClient.verifyWebhookSignature(
        env.paypalWebhookId,
        headers,
        body
      );
      if (!valid) {
        return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
      }
    }

    const event = JSON.parse(body) as { event_type?: string; id?: string };
    console.log("PayPal webhook received", event.event_type, event.id);
    return NextResponse.json({ received: true });
  } catch (error: unknown) {
    console.error("PayPal webhook error:", error);
    return NextResponse.json(
      { error: errorMessage(error, "Webhook handler failed") },
      { status: 500 }
    );
  }
}
