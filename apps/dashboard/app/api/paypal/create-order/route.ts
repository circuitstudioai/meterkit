import { NextRequest, NextResponse } from "next/server";
import { paypalClient } from "@/lib/paypal/client";
import { db, topups } from "@/lib/db";
import { usdToCredits } from "@/lib/credits";
import { errorMessage } from "@/lib/errors";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { amount?: number; userId?: string };
    const amount = body.amount;
    const userId = body.userId || "user_alex";
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    const order = await paypalClient.createOrder(amount);
    const approveLink = order.links?.find((link) => link.rel === "approve");

    await db.insert(topups).values({
      appId: 1,
      userId,
      usdAmount: amount,
      credits: usdToCredits(amount),
      paypalOrderId: order.id,
      status: "created",
    });

    return NextResponse.json({
      orderId: order.id,
      approveUrl: approveLink?.href,
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: errorMessage(error, "Failed to create order") }, { status: 500 });
  }
}
