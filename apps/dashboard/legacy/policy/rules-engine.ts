import { db, budgetLedger, budgetLimits, policyRules, purchaseRequests } from "@/lib/db";
import { eq, and, gte, sql, desc } from "drizzle-orm";
import { decideFromChecks, type PolicyCheckResult } from "@/lib/policy/decide";

export type { PolicyCheckResult };

export async function checkPolicyRules(
  companyId: number,
  department: string,
  toolName: string,
  toolCategory: string | null,
  amount: number
): Promise<PolicyCheckResult> {
  const ledger = await db
    .select()
    .from(budgetLedger)
    .where(eq(budgetLedger.companyId, companyId))
    .orderBy(desc(budgetLedger.createdAt))
    .limit(1);

  const currentBalance = Number(ledger[0]?.balance ?? 0);

  const limits = await db
    .select()
    .from(budgetLimits)
    .where(
      and(
        eq(budgetLimits.companyId, companyId),
        eq(budgetLimits.department, department)
      )
    )
    .limit(1);

  const departmentLimit = limits[0];

  const currentMonth = new Date();
  const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);

  const monthlySpendRows = await db
    .select()
    .from(purchaseRequests)
    .where(
      and(
        eq(purchaseRequests.companyId, companyId),
        eq(purchaseRequests.department, department),
        gte(purchaseRequests.createdAt, monthStart),
        sql`${purchaseRequests.status} IN ('approved', 'completed')`
      )
    );

  const totalMonthlySpend = (monthlySpendRows as { amount: number }[]).reduce(
    (sum, req) => sum + Number(req.amount),
    0
  );

  const blocklist = await db
    .select()
    .from(policyRules)
    .where(
      and(
        eq(policyRules.companyId, companyId),
        eq(policyRules.ruleType, "blocklist"),
        eq(policyRules.enabled, true),
        eq(policyRules.toolName, toolName)
      )
    );

  const allowlist = await db
    .select()
    .from(policyRules)
    .where(
      and(
        eq(policyRules.companyId, companyId),
        eq(policyRules.ruleType, "allowlist"),
        eq(policyRules.enabled, true),
        eq(policyRules.toolName, toolName)
      )
    );

  const existingToolsRows = await db
    .select()
    .from(purchaseRequests)
    .where(
      and(
        eq(purchaseRequests.companyId, companyId),
        eq(purchaseRequests.department, department),
        sql`${purchaseRequests.status} IN ('approved', 'completed')`,
        toolCategory ? eq(purchaseRequests.toolCategory, toolCategory) : sql`1=1`
      )
    );

  return decideFromChecks({
    toolName,
    toolCategory,
    department,
    amount,
    currentBalance,
    monthlyUsed: totalMonthlySpend,
    monthlyLimit: departmentLimit?.monthlyLimit ?? null,
    perRequestLimit: departmentLimit?.perRequestLimit ?? null,
    blocked: (blocklist as unknown[]).length > 0,
    onAllowlist: (allowlist as unknown[]).length > 0,
    existingTools: (existingToolsRows as { toolName: string }[]).map((t) => t.toolName),
  });
}
