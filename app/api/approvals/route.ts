import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { purchaseRequests, budgetLedger, auditLog } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { paypalClient } from "@/lib/paypal/client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { requestId, action, approverId } = body;

    if (!requestId || !action || !approverId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (action !== "approve" && action !== "deny") {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const [purchaseRequest] = await db
      .select()
      .from(purchaseRequests)
      .where(eq(purchaseRequests.id, requestId))
      .limit(1);

    if (!purchaseRequest) {
      return NextResponse.json(
        { error: "Request not found" },
        { status: 404 }
      );
    }

    if (purchaseRequest.status !== "pending") {
      return NextResponse.json(
        { error: "Request already processed" },
        { status: 400 }
      );
    }

    let payoutId = null;
    let updatedBalance = null;

    if (action === "approve") {
      // Process payout if vendor email is provided
      if (purchaseRequest.vendorEmail) {
        try {
          const payout = await paypalClient.createPayout(
            purchaseRequest.vendorEmail,
            purchaseRequest.amount,
            "USD",
            `Payment for ${purchaseRequest.toolName}`
          );
          payoutId = payout.batch_header.payout_batch_id;
        } catch (error) {
          console.error("Payout failed:", error);
          // Continue even if payout fails (can retry later)
        }
      }

      // Update budget ledger
      const lastEntry = await db
        .select()
        .from(budgetLedger)
        .where(eq(budgetLedger.companyId, purchaseRequest.companyId))
        .orderBy(sql`${budgetLedger.createdAt} DESC`)
        .limit(1);

      const currentBalance = lastEntry[0]?.balance || 0;
      updatedBalance = currentBalance - purchaseRequest.amount;

      await db.insert(budgetLedger).values({
        companyId: purchaseRequest.companyId,
        amount: -purchaseRequest.amount,
        type: "spend",
        description: `Purchase: ${purchaseRequest.toolName}`,
        balance: updatedBalance,
        paypalTransactionId: payoutId,
      });
    }

    // Update purchase request
    await db
      .update(purchaseRequests)
      .set({
        status: action === "approve" ? "completed" : "denied",
        approvedBy: approverId,
        paypalPayoutId: payoutId,
        updatedAt: new Date(),
      })
      .where(eq(purchaseRequests.id, requestId));

    // Log to audit trail
    await db.insert(auditLog).values({
      companyId: purchaseRequest.companyId,
      requestId: requestId,
      userId: approverId,
      action: action === "approve" ? "request_approved" : "request_denied",
      details: JSON.stringify({
        toolName: purchaseRequest.toolName,
        amount: purchaseRequest.amount,
        payoutId,
        newBalance: updatedBalance,
      }),
    });

    return NextResponse.json({
      success: true,
      action,
      payoutId,
      newBalance: updatedBalance,
    });
  } catch (error: any) {
    console.error("Error processing approval:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process approval" },
      { status: 500 }
    );
  }
}
