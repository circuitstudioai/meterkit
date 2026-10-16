import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { purchaseRequests, auditLog } from "@/db/schema";
import { evaluatePurchaseRequest } from "@/lib/agent/policy-agent";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
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
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const companyId = 1; // For demo, using first company

    // Evaluate with policy agent
    const decision = await evaluatePurchaseRequest(
      companyId,
      department,
      toolName,
      toolCategory || null,
      amount,
      description
    );

    // Create purchase request
    const [request] = await db
      .insert(purchaseRequests)
      .values({
        companyId,
        requestedBy: userId,
        toolName,
        toolCategory: toolCategory || null,
        amount,
        description,
        department,
        status: decision.decision === "auto_approve" ? "approved" : decision.decision === "deny" ? "denied" : "pending",
        policyDecision: decision.decision,
        policyReason: decision.reason,
        vendorEmail: vendorEmail || null,
        isAgentRequest,
      })
      .returning();

    // Log to audit trail
    await db.insert(auditLog).values({
      companyId,
      requestId: request.id,
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
      request,
      decision: {
        decision: decision.decision,
        reason: decision.reason,
        explanation: decision.llmExplanation,
        checks: decision.policyChecks,
      },
    });
  } catch (error: any) {
    console.error("Error creating purchase request:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create request" },
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
      .where((table) => table.companyId === companyId)
      .orderBy((table) => table.createdAt);

    return NextResponse.json({ requests });
  } catch (error: any) {
    console.error("Error fetching requests:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch requests" },
      { status: 500 }
    );
  }
}
