import { NextRequest, NextResponse } from "next/server";
import { paypalClient } from "@/lib/paypal/client";
import { db } from "@/lib/db";
import { budgetLedger, auditLog } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get("token"); // PayPal order ID

    if (!token) {
      return NextResponse.redirect(new URL("/wallet?error=missing_token", request.url));
    }

    const capture = await paypalClient.captureOrder(token);

    if (capture.status !== "COMPLETED") {
      return NextResponse.redirect(
        new URL(`/wallet?error=payment_failed&status=${capture.status}`, request.url)
      );
    }

    const amount = parseFloat(capture.purchase_units[0].amount.value);
    const transactionId = capture.id;

    // Update budget ledger
    const companyId = 1; // For demo, using first company

    // Get current balance
    const lastEntry = await db
      .select()
      .from(budgetLedger)
      .where(eq(budgetLedger.companyId, companyId))
      .orderBy(sql`${budgetLedger.createdAt} DESC`)
      .limit(1);

    const currentBalance = lastEntry[0]?.balance || 0;
    const newBalance = currentBalance + amount;

    await db.insert(budgetLedger).values({
      companyId,
      amount,
      type: "topup",
      description: `PayPal top-up via order ${transactionId}`,
      balance: newBalance,
      paypalTransactionId: transactionId,
    });

    await db.insert(auditLog).values({
      companyId,
      requestId: null,
      userId: null,
      action: "wallet_topup",
      details: JSON.stringify({
        amount,
        transactionId,
        newBalance,
      }),
    });

    return NextResponse.redirect(
      new URL(`/wallet?success=true&amount=${amount}`, request.url)
    );
  } catch (error: any) {
    console.error("Error capturing PayPal order:", error);
    return NextResponse.redirect(
      new URL(`/wallet?error=capture_failed&message=${encodeURIComponent(error.message)}`, request.url)
    );
  }
}
