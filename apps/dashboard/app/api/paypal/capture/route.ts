import { connection, NextRequest, NextResponse } from "next/server";
import { paypalClient } from "@/lib/paypal/client";
import { db, topups, auditLog } from "@/lib/db";
import { meterKit } from "@/lib/meter-kit";
import { usdToCredits } from "@/lib/credits";
import { eq } from "drizzle-orm";
import { errorMessage } from "@/lib/errors";

async function applyCapture(orderId: string, usdAmount: number, userId: string) {
  const credits = usdToCredits(usdAmount);
  await meterKit.credit({
    userId,
    amount: credits,
    idempotencyKey: `paypal:${orderId}`,
    paypalTransactionId: orderId,
  });
  await db
    .update(topups)
    .set({ status: "completed" })
    .where(eq(topups.paypalOrderId, orderId));
  await db.insert(auditLog).values({
    appId: 1,
    action: "wallet_topup",
    details: JSON.stringify({ userId, credits, paypalOrderId: orderId, usdAmount }),
  });
  return credits;
}

export async function GET(request: NextRequest) {
  await connection();
  try {
    const token = request.nextUrl.searchParams.get("token");
    const userId = request.nextUrl.searchParams.get("userId") || "user_alex";
    if (!token) {
      return NextResponse.redirect(new URL("/top-ups?error=missing_token", request.url));
    }
    const capture = await paypalClient.captureOrder(token);
    if (capture.status !== "COMPLETED") {
      return NextResponse.redirect(
        new URL(`/top-ups?error=payment_failed&status=${capture.status}`, request.url)
      );
    }
    const unit = capture.purchase_units?.[0];
    const amount = parseFloat(
      unit?.payments?.captures?.[0]?.amount?.value ?? unit?.amount?.value ?? "0"
    );
    const credits = await applyCapture(capture.id, amount, userId);
    return NextResponse.redirect(
      new URL(`/top-ups?success=true&credits=${credits}`, request.url)
    );
  } catch (error: unknown) {
    return NextResponse.redirect(
      new URL(
        `/top-ups?error=capture_failed&message=${encodeURIComponent(errorMessage(error))}`,
        request.url
      )
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      orderId?: string;
      userId?: string;
      amount?: number;
    };
    if (!body.orderId) {
      return NextResponse.json({ error: "orderId required" }, { status: 400 });
    }
    const capture = await paypalClient.captureOrder(body.orderId);
    const unit = capture.purchase_units?.[0];
    const amount = parseFloat(
      unit?.payments?.captures?.[0]?.amount?.value ??
        unit?.amount?.value ??
        String(body.amount ?? 0)
    );
    const credits = await applyCapture(capture.id, amount, body.userId || "user_alex");
    return NextResponse.json({ ok: true, credits });
  } catch (error: unknown) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}
