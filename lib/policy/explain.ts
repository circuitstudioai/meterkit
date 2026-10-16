import type { PolicyCheckResult } from "@/lib/policy/decide";

export function cannedPolicyExplanation(
  toolName: string,
  policyResult: PolicyCheckResult
): string {
  switch (policyResult.decision) {
    case "auto_approve":
      return `The request for ${toolName} has been automatically approved. It meets all policy requirements: sufficient budget, within department limits, and on the approved tool list.`;
    case "route_to_approver":
      return `The request for ${toolName} requires manual approval. ${policyResult.reason} Please review the request details and approve if appropriate.`;
    case "deny":
      return `The request for ${toolName} has been denied. ${policyResult.reason} Please address the policy violation before resubmitting.`;
  }
}
