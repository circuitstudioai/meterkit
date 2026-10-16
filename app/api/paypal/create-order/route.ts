import { NextRequest, NextResponse } from "next/server";
import { paypalClient } from "@/lib/paypal/client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: "Invalid amount" },
        { status: 400 }
      );
    }

    const order = await paypalClient.createOrder(amount);

    const approveLink = order.links.find((link: any) => link.rel === "approve");

    return NextResponse.json({
      orderId: order.id,
      approveUrl: approveLink?.href,
    });
  } catch (error: any) {
    console.error("Error creating PayPal order:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create order" },
      { status: 500 }
    );
  }
}
