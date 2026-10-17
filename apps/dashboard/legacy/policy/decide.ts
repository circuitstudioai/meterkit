export type PolicyChecks = {
  walletBalance: { pass: boolean; current: number; required: number };
  departmentMonthly: { pass: boolean; used: number; limit: number | null };
  perRequestLimit: { pass: boolean; amount: number; limit: number | null };
  blocklist: { pass: boolean; blocked: boolean };
  allowlist: { pass: boolean; onList: boolean };
  duplicateTool: { pass: boolean; existing: string[] };
};

export type PolicyDecision = "auto_approve" | "route_to_approver" | "deny";

export type PolicyCheckResult = {
  decision: PolicyDecision;
  reason: string;
  checks: PolicyChecks;
};

export type DecideInput = {
  toolName: string;
  toolCategory: string | null;
  department: string;
  amount: number;
  currentBalance: number;
  monthlyUsed: number;
  monthlyLimit: number | null;
  perRequestLimit: number | null;
  blocked: boolean;
  onAllowlist: boolean;
  existingTools: string[];
};

/**
 * Deterministic money-rule decisions. No I/O, no LLM.
 * Budget math lives here so tests do not need a database.
 */
export function decideFromChecks(input: DecideInput): PolicyCheckResult {
  const projectedSpend = input.monthlyUsed + input.amount;

  const checks: PolicyChecks = {
    walletBalance: {
      pass: input.currentBalance >= input.amount,
      current: input.currentBalance,
      required: input.amount,
    },
    departmentMonthly: {
      pass: input.monthlyLimit == null || projectedSpend <= input.monthlyLimit,
      used: input.monthlyUsed,
      limit: input.monthlyLimit,
    },
    perRequestLimit: {
      pass: input.perRequestLimit == null || input.amount <= input.perRequestLimit,
      amount: input.amount,
      limit: input.perRequestLimit,
    },
    blocklist: {
      pass: !input.blocked,
      blocked: input.blocked,
    },
    allowlist: {
      pass: true,
      onList: input.onAllowlist,
    },
    duplicateTool: {
      pass: true,
      existing: input.existingTools,
    },
  };

  if (!checks.walletBalance.pass) {
    return {
      decision: "deny",
      reason: `Insufficient wallet balance. Current: $${input.currentBalance.toFixed(2)}, Required: $${input.amount.toFixed(2)}`,
      checks,
    };
  }

  if (checks.blocklist.blocked) {
    return {
      decision: "deny",
      reason: `Tool "${input.toolName}" is on the company blocklist and cannot be purchased.`,
      checks,
    };
  }

  if (!checks.departmentMonthly.pass) {
    return {
      decision: "deny",
      reason: `Department monthly limit exceeded. Used: $${input.monthlyUsed.toFixed(2)} + $${input.amount.toFixed(2)} = $${projectedSpend.toFixed(2)}, Limit: $${input.monthlyLimit?.toFixed(2)}`,
      checks,
    };
  }

  if (!checks.perRequestLimit.pass) {
    return {
      decision: "route_to_approver",
      reason: `Amount $${input.amount.toFixed(2)} exceeds per-request limit of $${input.perRequestLimit?.toFixed(2)} for ${input.department}. Requires approval.`,
      checks,
    };
  }

  if (!checks.allowlist.onList) {
    return {
      decision: "route_to_approver",
      reason: `"${input.toolName}" is not on the pre-approved allowlist. Requires manual approval.`,
      checks,
    };
  }

  if (input.existingTools.length > 0 && input.toolCategory) {
    const similarTools = input.existingTools.filter((t) => t !== input.toolName);
    if (similarTools.length > 0) {
      return {
        decision: "route_to_approver",
        reason: `Potential duplicate: ${input.department} already uses similar tools (${similarTools.join(", ")}). Approval recommended to avoid redundancy.`,
        checks,
      };
    }
  }

  return {
    decision: "auto_approve",
    reason: `Within budget limits and on allowlist. Auto-approved.`,
    checks,
  };
}
