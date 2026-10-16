import { checkPolicyRules, PolicyCheckResult } from "@/lib/policy/rules-engine";

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
  // Step 1: Deterministic policy check (this is authoritative for money movement)
  const policyResult = await checkPolicyRules(
    companyId,
    department,
    toolName,
    toolCategory,
    amount
  );

  // Step 2: Generate LLM explanation (for transparency, not decision-making)
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
  const apiKey = process.env.LLM_API_KEY;
  const apiUrl = process.env.LLM_API_URL || "https://api.openai.com/v1";
  const model = process.env.LLM_MODEL || "gpt-4o-mini";

  // If no API key or using mock, return a simple explanation
  if (!apiKey || apiKey === "mock_api_key") {
    return generateMockExplanation(toolName, policyResult);
  }

  try {
    const prompt = `You are a financial policy assistant. Explain the following purchase request decision in plain English for stakeholders.

Purchase Request:
- Tool: ${toolName}
- Description: ${description}
- Amount: $${amount}
- Department: ${department}

Policy Decision: ${policyResult.decision.toUpperCase()}
Reason: ${policyResult.reason}

Policy Checks:
- Wallet Balance: ${policyResult.checks.walletBalance.pass ? "✓ Pass" : "✗ Fail"} (Current: $${policyResult.checks.walletBalance.current}, Required: $${policyResult.checks.walletBalance.required})
- Department Monthly: ${policyResult.checks.departmentMonthly.pass ? "✓ Pass" : "✗ Fail"} (Used: $${policyResult.checks.departmentMonthly.used}, Limit: ${policyResult.checks.departmentMonthly.limit ? "$" + policyResult.checks.departmentMonthly.limit : "None"})
- Per-Request Limit: ${policyResult.checks.perRequestLimit.pass ? "✓ Pass" : "✗ Fail"} (Amount: $${policyResult.checks.perRequestLimit.amount}, Limit: ${policyResult.checks.perRequestLimit.limit ? "$" + policyResult.checks.perRequestLimit.limit : "None"})
- Blocklist: ${policyResult.checks.blocklist.pass ? "✓ Pass" : "✗ Blocked"}
- Allowlist: ${policyResult.checks.allowlist.onList ? "✓ On List" : "Not on list"}
- Similar Tools: ${policyResult.checks.duplicateTool.existing.length > 0 ? policyResult.checks.duplicateTool.existing.join(", ") : "None"}

Provide a concise 2-3 sentence explanation that is professional and helpful.`;

    const response = await fetch(`${apiUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: "You are a helpful financial policy assistant. Provide clear, concise explanations.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      console.error("LLM API error:", response.statusText);
      return generateMockExplanation(toolName, policyResult);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || generateMockExplanation(toolName, policyResult);
  } catch (error) {
    console.error("Error generating LLM explanation:", error);
    return generateMockExplanation(toolName, policyResult);
  }
}

function generateMockExplanation(toolName: string, policyResult: PolicyCheckResult): string {
  switch (policyResult.decision) {
    case "auto_approve":
      return `The request for ${toolName} has been automatically approved. It meets all policy requirements: sufficient budget, within department limits, and on the approved tool list.`;
    case "route_to_approver":
      return `The request for ${toolName} requires manual approval. ${policyResult.reason} Please review the request details and approve if appropriate.`;
    case "deny":
      return `The request for ${toolName} has been denied. ${policyResult.reason} Please address the policy violation before resubmitting.`;
  }
}
