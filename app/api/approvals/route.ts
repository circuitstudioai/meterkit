import { NextRequest, NextResponse } from "next/server";
import { db, purchaseRequests, budgetLedger, auditLog } from "@/lib/db";
import { eq, desc } from "drizzle-orm";
import { paypalClient } from "@/lib/paypal/client";
import { errorMessage } from "@/lib/errors";

type ApprovalBody = {
  requestId?: number;
  action?: string;
  approverId?: number;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ApprovalBody;
    const { requestId, action, approverId } = body;

    if (!requestId || !action || !approverId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
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
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    if (purchaseRequest.status !== "pending") {
      return NextResponse.json({ error: "Request already processed" }, { status: 400 });
    }

    let payoutId: string | null = null;
    let updatedBalance: number | null = null;

    if (action === "approve") {
      if (purchaseRequest.vendorEmail) {
        try {
          const payout = await paypalClient.createPayout(
            purchaseRequest.vendorEmail,
            purchaseRequest.amount,
            "USD",
            `Payment for ${purchaseRequest.toolName}`
          );
          payoutId = payout.batch_header?.payout_batch_id ?? null;
        } catch (error: unknown) {
          console.error("Payout failed:", error);
        }
      }

      const lastEntry = await db
        .select()
        .from(budgetLedger)
        .where(eq(budgetLedger.companyId, purchaseRequest.companyId))
        .orderBy(desc(budgetLedger.createdAt))
        .limit(1);

      const currentBalance = Number(lastEntry[0]?.balance ?? 0);
      updatedBalance = currentBalance - Number(purchaseRequest.amount);

      await db.insert(budgetLedger).values({
        companyId: purchaseRequest.companyId,
        amount: -purchaseRequest.amount,
        type: "spend",
        description: `Purchase: ${purchaseRequest.toolName}`,
        balance: updatedBalance,
        paypalTransactionId: payoutId,
      });
    }

    await db
      .update(purchaseRequests)
      .set({
        status: action === "approve" ? "completed" : "denied",
        approvedBy: approverId,
        paypalPayoutId: payoutId,
        updatedAt: new Date(),
      })
      .where(eq(purchaseRequests.id, requestId));

    await db.insert(auditLog).values({
      companyId: purchaseRequest.companyId,
      requestId,
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
  } catch (error: unknown) {
    console.error("Error processing approval:", error);
    return NextResponse.json(
      { error: errorMessage(error, "Failed to process approval") },
      { status: 500 }
    );
  }
}
