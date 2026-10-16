import { NextResponse } from "next/server";
import { db, budgetLedger, purchaseRequests } from "@/lib/db";
import { eq, and, gte, desc } from "drizzle-orm";
import { errorMessage } from "@/lib/errors";

export async function GET() {
  try {
    const companyId = 1;

    const lastEntry = await db
      .select()
      .from(budgetLedger)
      .where(eq(budgetLedger.companyId, companyId))
      .orderBy(desc(budgetLedger.createdAt))
      .limit(1);

    const currentBalance = Number(lastEntry[0]?.balance ?? 0);

    const currentMonth = new Date();
    const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);

    const monthlySpends = (await db
      .select()
      .from(purchaseRequests)
      .where(
        and(
          eq(purchaseRequests.companyId, companyId),
          gte(purchaseRequests.createdAt, monthStart)
        )
      )) as { amount: number; status: string }[];

    const totalMonthlySpend = monthlySpends
      .filter((req) => req.status === "approved" || req.status === "completed")
      .reduce((sum, req) => sum + Number(req.amount), 0);

    const pendingRequests = (await db
      .select()
      .from(purchaseRequests)
      .where(and(eq(purchaseRequests.companyId, companyId), eq(purchaseRequests.status, "pending")))) as unknown[];

    return NextResponse.json({
      balance: currentBalance,
      monthlySpend: totalMonthlySpend,
      pendingApprovals: pendingRequests.length,
    });
  } catch (error: unknown) {
    console.error("Error fetching wallet stats:", error);
    return NextResponse.json(
      { error: errorMessage(error, "Failed to fetch stats") },
      { status: 500 }
    );
  }
}
