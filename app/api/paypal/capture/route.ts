import { connection, NextRequest, NextResponse } from "next/server";
import { paypalClient } from "@/lib/paypal/client";
import { db, budgetLedger, auditLog } from "@/lib/db";
import { eq, desc } from "drizzle-orm";
import { errorMessage } from "@/lib/errors";

export async function GET(request: NextRequest) {
  await connection();
  try {
    const token = request.nextUrl.searchParams.get("token");

    if (!token) {
      return NextResponse.redirect(new URL("/wallet?error=missing_token", request.url));
    }

    const capture = await paypalClient.captureOrder(token);

    if (capture.status !== "COMPLETED") {
      return NextResponse.redirect(
        new URL(`/wallet?error=payment_failed&status=${capture.status}`, request.url)
      );
    }

    const unit = capture.purchase_units?.[0];
    const amount = parseFloat(
      unit?.payments?.captures?.[0]?.amount?.value ?? unit?.amount?.value ?? "0"
    );
    const transactionId = capture.id;
    const companyId = 1;

    const lastEntry = await db
      .select()
      .from(budgetLedger)
      .where(eq(budgetLedger.companyId, companyId))
      .orderBy(desc(budgetLedger.createdAt))
      .limit(1);

    const currentBalance = Number(lastEntry[0]?.balance ?? 0);
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
  } catch (error: unknown) {
    console.error("Error capturing PayPal order:", error);
    return NextResponse.redirect(
      new URL(
        `/wallet?error=capture_failed&message=${encodeURIComponent(errorMessage(error))}`,
        request.url
      )
    );
  }
}
