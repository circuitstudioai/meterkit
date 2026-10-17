import { NextRequest, NextResponse } from "next/server";
import { db, payouts, auditLog, builders } from "@/lib/db";
import { paypalClient } from "@/lib/paypal/client";
import { errorMessage } from "@/lib/errors";
import { desc } from "drizzle-orm";

export async function GET() {
  try {
    const rows = await db.select().from(payouts).orderBy(desc(payouts.createdAt));
    return NextResponse.json({ payouts: rows });
  } catch (error: unknown) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { usdAmount?: number; recipientEmail?: string };
    if (!body.usdAmount || body.usdAmount <= 0) {
      return NextResponse.json({ error: "usdAmount required" }, { status: 400 });
    }
    const [builder] = await db.select().from(builders).limit(1);
    const email = body.recipientEmail || builder?.paypalEmail;
    if (!email) {
      return NextResponse.json({ error: "No builder PayPal email" }, { status: 400 });
    }

    let paypalPayoutId: string | null = null;
    let status = "pending";
    try {
      const payout = await paypalClient.createPayout(
        email,
        body.usdAmount,
        "USD",
        "MeterKit builder cash-out"
      );
      paypalPayoutId = payout.batch_header?.payout_batch_id ?? null;
      status = "completed";
    } catch (error: unknown) {
      console.error("Payout failed (sandbox credentials may be placeholders)", error);
      status = "failed";
    }

    const [row] = await db
      .insert(payouts)
      .values({
        appId: 1,
        usdAmount: body.usdAmount,
        recipientEmail: email,
        paypalPayoutId,
        status,
      })
      .returning();

    await db.insert(auditLog).values({
      appId: 1,
      action: "builder_payout",
      details: JSON.stringify({ usdAmount: body.usdAmount, paypalPayoutId, status }),
    });

    return NextResponse.json({ payout: row });
  } catch (error: unknown) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}
