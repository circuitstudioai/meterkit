import { NextRequest, NextResponse } from "next/server";
import { paypalClient } from "@/lib/paypal/client";
import { errorMessage } from "@/lib/errors";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { amount?: number };
    const { amount } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    const order = await paypalClient.createOrder(amount);
    const approveLink = order.links?.find((link) => link.rel === "approve");

    return NextResponse.json({
      orderId: order.id,
      approveUrl: approveLink?.href,
    });
  } catch (error: unknown) {
    console.error("Error creating PayPal order:", error);
    return NextResponse.json(
      { error: errorMessage(error, "Failed to create order") },
      { status: 500 }
    );
  }
}
