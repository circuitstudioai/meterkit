import { describe, it, expect } from "@jest/globals";
import { decideFromChecks } from "../lib/policy/decide";
import { cannedPolicyExplanation } from "../lib/policy/explain";
import { paypalApiBase } from "../lib/paypal/client";

const baseInput = {
  toolName: "Approved Tool",
  toolCategory: "Developer Tools",
  department: "Engineering",
  amount: 100,
  currentBalance: 5000,
  monthlyUsed: 0,
  monthlyLimit: 2000,
  perRequestLimit: 500,
  blocked: false,
  onAllowlist: true,
  existingTools: [] as string[],
};

describe("Policy decision engine", () => {
  it("auto-approves a request within all limits", () => {
    const result = decideFromChecks(baseInput);
    expect(result.decision).toBe("auto_approve");
    expect(result.checks.walletBalance.pass).toBe(true);
    expect(result.checks.departmentMonthly.pass).toBe(true);
    expect(result.checks.perRequestLimit.pass).toBe(true);
    expect(result.checks.blocklist.pass).toBe(true);
    expect(result.checks.allowlist.onList).toBe(true);
  });

  it("denies when wallet balance is insufficient", () => {
    const result = decideFromChecks({ ...baseInput, amount: 10000 });
    expect(result.decision).toBe("deny");
    expect(result.checks.walletBalance.pass).toBe(false);
    expect(result.reason).toContain("Insufficient wallet balance");
  });

  it("denies a blocked tool", () => {
    const result = decideFromChecks({
      ...baseInput,
      toolName: "Blocked Tool",
      blocked: true,
    });
    expect(result.decision).toBe("deny");
    expect(result.checks.blocklist.pass).toBe(false);
    expect(result.reason).toContain("blocklist");
  });

  it("routes to approver when per-request limit is exceeded", () => {
    const result = decideFromChecks({ ...baseInput, amount: 600 });
    expect(result.decision).toBe("route_to_approver");
    expect(result.checks.perRequestLimit.pass).toBe(false);
    expect(result.reason).toContain("per-request limit");
  });

  it("routes to approver when the tool is not on the allowlist", () => {
    const result = decideFromChecks({
      ...baseInput,
      toolName: "New Unapproved Tool",
      onAllowlist: false,
    });
    expect(result.decision).toBe("route_to_approver");
    expect(result.checks.allowlist.onList).toBe(false);
    expect(result.reason).toContain("not on the pre-approved allowlist");
  });

  it("denies when department monthly spend would exceed the cap", () => {
    const result = decideFromChecks({
      ...baseInput,
      monthlyUsed: 1800,
      amount: 300,
    });
    expect(result.decision).toBe("deny");
    expect(result.checks.departmentMonthly.pass).toBe(false);
    expect(result.reason).toContain("monthly limit exceeded");
  });

  it("routes to approver on a similar tool in the same category", () => {
    const result = decideFromChecks({
      ...baseInput,
      existingTools: ["GitHub Copilot"],
    });
    expect(result.decision).toBe("route_to_approver");
    expect(result.reason).toContain("similar tools");
  });
});

describe("Gemini fallback explanations", () => {
  it("returns a canned explanation when no API key is used", () => {
    const result = decideFromChecks(baseInput);
    const text = cannedPolicyExplanation("Approved Tool", result);
    expect(text).toContain("automatically approved");
  });

  it("explains a denial without calling Gemini", () => {
    const result = decideFromChecks({ ...baseInput, blocked: true });
    const text = cannedPolicyExplanation("Blocked Tool", result);
    expect(text).toContain("denied");
  });
});

describe("PayPal sandbox default", () => {
  it("uses the sandbox API host unless mode is live", () => {
    expect(paypalApiBase("sandbox")).toContain("sandbox.paypal.com");
    expect(paypalApiBase("live")).toBe("https://api-m.paypal.com");
  });
});
