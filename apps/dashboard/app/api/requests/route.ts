import { NextRequest, NextResponse } from "next/server";
import { db, purchaseRequests, auditLog } from "@/lib/db";
import { evaluatePurchaseRequest } from "@/lib/agent/policy-agent";
import { eq, desc } from "drizzle-orm";
import { errorMessage } from "@/lib/errors";

type CreateRequestBody = {
  userId?: number;
  toolName?: string;
  toolCategory?: string;
  amount?: number;
  description?: string;
  department?: string;
  vendorEmail?: string;
  isAgentRequest?: boolean;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateRequestBody;
    const {
      userId,
      toolName,
      toolCategory,
      amount,
      description,
      department,
      vendorEmail,
      isAgentRequest = false,
    } = body;

    if (!userId || !toolName || !amount || !description || !department) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const companyId = 1;

    const decision = await evaluatePurchaseRequest(
      companyId,
      department,
      toolName,
      toolCategory || null,
      amount,
      description
    );

    const [purchaseRequest] = await db
      .insert(purchaseRequests)
      .values({
        companyId,
        requestedBy: userId,
        toolName,
        toolCategory: toolCategory || null,
        amount,
        description,
        department,
        status:
          decision.decision === "auto_approve"
            ? "approved"
            : decision.decision === "deny"
              ? "denied"
              : "pending",
        policyDecision: decision.decision,
        policyReason: decision.reason,
        vendorEmail: vendorEmail || null,
        isAgentRequest,
      })
      .returning();

    await db.insert(auditLog).values({
      companyId,
      requestId: purchaseRequest.id,
      userId,
      action: "purchase_request_created",
      details: JSON.stringify({
        toolName,
        amount,
        decision: decision.decision,
        reason: decision.reason,
        llmExplanation: decision.llmExplanation,
      }),
    });

    return NextResponse.json({
      success: true,
      request: purchaseRequest,
      decision: {
        decision: decision.decision,
        reason: decision.reason,
        explanation: decision.llmExplanation,
        checks: decision.policyChecks,
      },
    });
  } catch (error: unknown) {
    console.error("Error creating purchase request:", error);
    return NextResponse.json(
      { error: errorMessage(error, "Failed to create request") },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const companyId = 1;

    const requests = await db
      .select()
      .from(purchaseRequests)
      .where(eq(purchaseRequests.companyId, companyId))
      .orderBy(desc(purchaseRequests.createdAt));

    return NextResponse.json({ requests });
  } catch (error: unknown) {
    console.error("Error fetching requests:", error);
    return NextResponse.json(
      { error: errorMessage(error, "Failed to fetch requests") },
      { status: 500 }
    );
  }
}
