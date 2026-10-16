import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { checkPolicyRules } from "@/lib/policy/rules-engine";
import { db } from "@/lib/db";
import {
  companies,
  users,
  budgetLedger,
  budgetLimits,
  policyRules,
  purchaseRequests,
} from "@/db/schema";

describe("Policy Rules Engine", () => {
  let testCompanyId: number;

  beforeEach(async () => {
    // Create test company
    const [company] = await db.insert(companies).values({
      name: "Test Company",
    }).returning();
    testCompanyId = company.id;

    // Set initial balance
    await db.insert(budgetLedger).values({
      companyId: testCompanyId,
      amount: 5000,
      type: "topup",
      description: "Test initial balance",
      balance: 5000,
    });

    // Set department limits
    await db.insert(budgetLimits).values({
      companyId: testCompanyId,
      department: "Engineering",
      monthlyLimit: 2000,
      perRequestLimit: 500,
    });

    // Add policy rules
    await db.insert(policyRules).values([
      {
        companyId: testCompanyId,
        ruleType: "blocklist",
        toolName: "Blocked Tool",
        enabled: true,
      },
      {
        companyId: testCompanyId,
        ruleType: "allowlist",
        toolName: "Approved Tool",
        enabled: true,
      },
    ]);
  });

  afterEach(async () => {
    // Clean up test data
    await db.delete(policyRules).where((t) => t.companyId === testCompanyId);
    await db.delete(budgetLimits).where((t) => t.companyId === testCompanyId);
    await db.delete(purchaseRequests).where((t) => t.companyId === testCompanyId);
    await db.delete(budgetLedger).where((t) => t.companyId === testCompanyId);
    await db.delete(companies).where((t) => t.id === testCompanyId);
  });

  it("should auto-approve request within all limits", async () => {
    const result = await checkPolicyRules(
      testCompanyId,
      "Engineering",
      "Approved Tool",
      "Developer Tools",
      100
    );

    expect(result.decision).toBe("auto_approve");
    expect(result.checks.walletBalance.pass).toBe(true);
    expect(result.checks.departmentMonthly.pass).toBe(true);
    expect(result.checks.perRequestLimit.pass).toBe(true);
    expect(result.checks.blocklist.pass).toBe(true);
    expect(result.checks.allowlist.onList).toBe(true);
  });

  it("should deny request with insufficient wallet balance", async () => {
    const result = await checkPolicyRules(
      testCompanyId,
      "Engineering",
      "Approved Tool",
      "Developer Tools",
      10000 // More than available balance
    );

    expect(result.decision).toBe("deny");
    expect(result.checks.walletBalance.pass).toBe(false);
    expect(result.reason).toContain("Insufficient wallet balance");
  });

  it("should deny blocked tool", async () => {
    const result = await checkPolicyRules(
      testCompanyId,
      "Engineering",
      "Blocked Tool",
      "Developer Tools",
      100
    );

    expect(result.decision).toBe("deny");
    expect(result.checks.blocklist.pass).toBe(false);
    expect(result.reason).toContain("blocklist");
  });

  it("should route to approver when per-request limit exceeded", async () => {
    const result = await checkPolicyRules(
      testCompanyId,
      "Engineering",
      "Approved Tool",
      "Developer Tools",
      600 // Exceeds per-request limit of 500
    );

    expect(result.decision).toBe("route_to_approver");
    expect(result.checks.perRequestLimit.pass).toBe(false);
    expect(result.reason).toContain("per-request limit");
  });

  it("should route to approver for tool not on allowlist", async () => {
    const result = await checkPolicyRules(
      testCompanyId,
      "Engineering",
      "New Unapproved Tool",
      "Developer Tools",
      100
    );

    expect(result.decision).toBe("route_to_approver");
    expect(result.checks.allowlist.onList).toBe(false);
    expect(result.reason).toContain("not on the pre-approved allowlist");
  });

  it("should track department monthly spending", async () => {
    // Create a user for the test
    const [user] = await db.insert(users).values({
      companyId: testCompanyId,
      email: "test@test.com",
      name: "Test User",
      role: "employee",
      department: "Engineering",
    }).returning();

    // Add existing approved requests for this month
    await db.insert(purchaseRequests).values([
      {
        companyId: testCompanyId,
        requestedBy: user.id,
        toolName: "Tool 1",
        amount: 1000,
        description: "Test",
        department: "Engineering",
        status: "completed",
        policyDecision: "auto_approve",
        isAgentRequest: false,
      },
      {
        companyId: testCompanyId,
        requestedBy: user.id,
        toolName: "Tool 2",
        amount: 800,
        description: "Test",
        department: "Engineering",
        status: "completed",
        policyDecision: "auto_approve",
        isAgentRequest: false,
      },
    ]);

    // This request would exceed monthly limit of 2000
    const result = await checkPolicyRules(
      testCompanyId,
      "Engineering",
      "Approved Tool",
      "Developer Tools",
      300 // 1000 + 800 + 300 = 2100 > 2000
    );

    expect(result.decision).toBe("deny");
    expect(result.checks.departmentMonthly.pass).toBe(false);
    expect(result.reason).toContain("monthly limit exceeded");
  });
});
