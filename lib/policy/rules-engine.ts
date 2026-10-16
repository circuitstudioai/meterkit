import { db } from "@/lib/db";
import { budgetLedger, budgetLimits, policyRules, purchaseRequests } from "@/db/schema";
import { eq, and, gte, sql } from "drizzle-orm";

export type PolicyCheckResult = {
  decision: "auto_approve" | "route_to_approver" | "deny";
  reason: string;
  checks: {
    walletBalance: { pass: boolean; current: number; required: number };
    departmentMonthly: { pass: boolean; used: number; limit: number | null };
    perRequestLimit: { pass: boolean; amount: number; limit: number | null };
    blocklist: { pass: boolean; blocked: boolean };
    allowlist: { pass: boolean; onList: boolean };
    duplicateTool: { pass: boolean; existing: string[] };
  };
};

export async function checkPolicyRules(
  companyId: number,
  department: string,
  toolName: string,
  toolCategory: string | null,
  amount: number
): Promise<PolicyCheckResult> {
  // Get current wallet balance
  const ledger = await db
    .select()
    .from(budgetLedger)
    .where(eq(budgetLedger.companyId, companyId))
    .orderBy(sql`${budgetLedger.createdAt} DESC`)
    .limit(1);

  const currentBalance = ledger[0]?.balance || 0;
  const walletCheck = {
    pass: currentBalance >= amount,
    current: currentBalance,
    required: amount,
  };

  // Get department limits
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

  // Calculate monthly spend for department
  const currentMonth = new Date();
  const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  
  const monthlySpend = await db
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

  const totalMonthlySpend = monthlySpend.reduce((sum, req) => sum + req.amount, 0);
  const projectedSpend = totalMonthlySpend + amount;

  const departmentMonthlyCheck = {
    pass: !departmentLimit?.monthlyLimit || projectedSpend <= departmentLimit.monthlyLimit,
    used: totalMonthlySpend,
    limit: departmentLimit?.monthlyLimit || null,
  };

  const perRequestCheck = {
    pass: !departmentLimit?.perRequestLimit || amount <= departmentLimit.perRequestLimit,
    amount,
    limit: departmentLimit?.perRequestLimit || null,
  };

  // Check blocklist
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

  const blocklistCheck = {
    pass: blocklist.length === 0,
    blocked: blocklist.length > 0,
  };

  // Check allowlist
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

  const allowlistCheck = {
    pass: true, // Allowlist is informative, not blocking
    onList: allowlist.length > 0,
  };

  // Check for duplicate/similar tools
  const existingTools = await db
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

  const duplicateCheck = {
    pass: true, // Informative for routing decision
    existing: existingTools.map((t) => t.toolName),
  };

  // Deterministic decision logic
  const checks = {
    walletBalance: walletCheck,
    departmentMonthly: departmentMonthlyCheck,
    perRequestLimit: perRequestCheck,
    blocklist: blocklistCheck,
    allowlist: allowlistCheck,
    duplicateTool: duplicateCheck,
  };

  // Hard denials (deterministic failures)
  if (!walletCheck.pass) {
    return {
      decision: "deny",
      reason: `Insufficient wallet balance. Current: $${currentBalance.toFixed(2)}, Required: $${amount.toFixed(2)}`,
      checks,
    };
  }

  if (blocklistCheck.blocked) {
    return {
      decision: "deny",
      reason: `Tool "${toolName}" is on the company blocklist and cannot be purchased.`,
      checks,
    };
  }

  if (!departmentMonthlyCheck.pass) {
    return {
      decision: "deny",
      reason: `Department monthly limit exceeded. Used: $${totalMonthlySpend.toFixed(2)} + $${amount.toFixed(2)} = $${projectedSpend.toFixed(2)}, Limit: $${departmentLimit?.monthlyLimit?.toFixed(2)}`,
      checks,
    };
  }

  // Route to approver if over per-request limit
  if (!perRequestCheck.pass) {
    return {
      decision: "route_to_approver",
      reason: `Amount $${amount.toFixed(2)} exceeds per-request limit of $${departmentLimit?.perRequestLimit?.toFixed(2)} for ${department}. Requires approval.`,
      checks,
    };
  }

  // Route to approver if not on allowlist (new tool)
  if (!allowlistCheck.onList) {
    return {
      decision: "route_to_approver",
      reason: `"${toolName}" is not on the pre-approved allowlist. Requires manual approval.`,
      checks,
    };
  }

  // Route to approver if potential duplicate in same category
  if (duplicateCheck.existing.length > 0 && toolCategory) {
    const similarTools = duplicateCheck.existing.filter((t) => t !== toolName);
    if (similarTools.length > 0) {
      return {
        decision: "route_to_approver",
        reason: `Potential duplicate: ${department} already uses similar tools (${similarTools.join(", ")}). Approval recommended to avoid redundancy.`,
        checks,
      };
    }
  }

  // Auto-approve: passes all checks
  return {
    decision: "auto_approve",
    reason: `Within budget limits and on allowlist. Auto-approved.`,
    checks,
  };
}
