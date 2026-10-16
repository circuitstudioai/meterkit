import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { budgetLedger, purchaseRequests } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export async function GET() {
  try {
    const companyId = 1; // Demo company

    // Get current balance
    const lastEntry = await db
      .select()
      .from(budgetLedger)
      .where(eq(budgetLedger.companyId, companyId))
      .orderBy(sql`${budgetLedger.createdAt} DESC`)
      .limit(1);

    const currentBalance = lastEntry[0]?.balance || 0;

    // Get total spend this month
    const currentMonth = new Date();
    const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);

    const monthlySpends = await db
      .select()
      .from(purchaseRequests)
      .where(
        sql`${purchaseRequests.companyId} = ${companyId} 
            AND ${purchaseRequests.createdAt} >= ${monthStart.getTime() / 1000}
            AND ${purchaseRequests.status} IN ('approved', 'completed')`
      );

    const totalMonthlySpend = monthlySpends.reduce((sum, req) => sum + req.amount, 0);

    // Get pending approvals count
    const pendingRequests = await db
      .select()
      .from(purchaseRequests)
      .where(
        sql`${purchaseRequests.companyId} = ${companyId} 
            AND ${purchaseRequests.status} = 'pending'`
      );

    return NextResponse.json({
      balance: currentBalance,
      monthlySpend: totalMonthlySpend,
      pendingApprovals: pendingRequests.length,
    });
  } catch (error: any) {
    console.error("Error fetching wallet stats:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
