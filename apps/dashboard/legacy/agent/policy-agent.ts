import { GoogleGenAI } from "@google/genai";
import { checkPolicyRules } from "@/lib/policy/rules-engine";
import type { PolicyCheckResult } from "@/lib/policy/decide";
import { cannedPolicyExplanation } from "@/lib/policy/explain";
import { env } from "@/lib/env";

export { cannedPolicyExplanation };

export type AgentDecision = {
  decision: "auto_approve" | "route_to_approver" | "deny";
  reason: string;
  llmExplanation: string;
  policyChecks: PolicyCheckResult["checks"];
};

export async function evaluatePurchaseRequest(
  companyId: number,
  department: string,
  toolName: string,
  toolCategory: string | null,
  amount: number,
  description: string
): Promise<AgentDecision> {
  const policyResult = await checkPolicyRules(
    companyId,
    department,
    toolName,
    toolCategory,
    amount
  );

  const llmExplanation = await generatePolicyExplanation(
    toolName,
    description,
    amount,
    department,
    policyResult
  );

  return {
    decision: policyResult.decision,
    reason: policyResult.reason,
    llmExplanation,
    policyChecks: policyResult.checks,
  };
}

async function generatePolicyExplanation(
  toolName: string,
  description: string,
  amount: number,
  department: string,
  policyResult: PolicyCheckResult
): Promise<string> {
  const apiKey = env.geminiApiKey.trim();
  if (!apiKey) {
    return cannedPolicyExplanation(toolName, policyResult);
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `You are a financial policy assistant. Explain the following purchase request decision in plain English for stakeholders.

Purchase Request:
- Tool: ${toolName}
- Description: ${description}
- Amount: $${amount}
- Department: ${department}

Policy Decision: ${policyResult.decision.toUpperCase()}
Reason: ${policyResult.reason}

Policy Checks:
- Wallet Balance: ${policyResult.checks.walletBalance.pass ? "Pass" : "Fail"} (Current: $${policyResult.checks.walletBalance.current}, Required: $${policyResult.checks.walletBalance.required})
- Department Monthly: ${policyResult.checks.departmentMonthly.pass ? "Pass" : "Fail"} (Used: $${policyResult.checks.departmentMonthly.used}, Limit: ${policyResult.checks.departmentMonthly.limit ? "$" + policyResult.checks.departmentMonthly.limit : "None"})
- Per-Request Limit: ${policyResult.checks.perRequestLimit.pass ? "Pass" : "Fail"} (Amount: $${policyResult.checks.perRequestLimit.amount}, Limit: ${policyResult.checks.perRequestLimit.limit ? "$" + policyResult.checks.perRequestLimit.limit : "None"})
- Blocklist: ${policyResult.checks.blocklist.pass ? "Pass" : "Blocked"}
- Allowlist: ${policyResult.checks.allowlist.onList ? "On list" : "Not on list"}
- Similar Tools: ${policyResult.checks.duplicateTool.existing.length > 0 ? policyResult.checks.duplicateTool.existing.join(", ") : "None"}

Provide a concise 2-3 sentence explanation that is professional and helpful.`;

    const response = await ai.models.generateContent({
      model: env.geminiModel,
      contents: prompt,
    });

    const text = response.text?.trim();
    return text || cannedPolicyExplanation(toolName, policyResult);
  } catch (error) {
    console.error("Error generating Gemini explanation:", error);
    return cannedPolicyExplanation(toolName, policyResult);
  }
}
