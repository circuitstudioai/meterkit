import { db } from "@/lib/db";
import { companies, users, budgetLedger, budgetLimits, policyRules, purchaseRequests, auditLog } from "@/db/schema";
import { eq } from "drizzle-orm";

async function seed() {
  console.log("🌱 Seeding database...");

  // Clear existing data
  await db.delete(auditLog);
  await db.delete(purchaseRequests);
  await db.delete(policyRules);
  await db.delete(budgetLimits);
  await db.delete(budgetLedger);
  await db.delete(users);
  await db.delete(companies);

  // Create company
  const [company] = await db
    .insert(companies)
    .values({
      name: "Northwind Labs",
    })
    .returning();

  console.log("✓ Created company: Northwind Labs");

  // Create users
  const demoUsers = [
    {
      companyId: company.id,
      email: "admin@northwind.demo",
      name: "Alex Chen",
      role: "admin",
      department: "Finance",
    },
    {
      companyId: company.id,
      email: "employee@northwind.demo",
      name: "Jordan Smith",
      role: "employee",
      department: "Marketing",
    },
    {
      companyId: company.id,
      email: "approver@northwind.demo",
      name: "Sam Williams",
      role: "approver",
      department: "Engineering",
    },
    {
      companyId: company.id,
      email: "sarah.marketing@northwind.demo",
      name: "Sarah Johnson",
      role: "employee",
      department: "Marketing",
    },
    {
      companyId: company.id,
      email: "mike.eng@northwind.demo",
      name: "Mike Rodriguez",
      role: "employee",
      department: "Engineering",
    },
  ];

  const createdUsers = await db.insert(users).values(demoUsers).returning();
  console.log(`✓ Created ${createdUsers.length} demo users`);

  // Initial wallet balance (seeded as if topped up via PayPal)
  await db.insert(budgetLedger).values({
    companyId: company.id,
    amount: 10000,
    type: "topup",
    description: "Initial PayPal sandbox top-up",
    balance: 10000,
    paypalTransactionId: "SEED_TXNID_001",
  });

  console.log("✓ Created initial budget ledger with $10,000 balance");

  // Budget limits per department
  await db.insert(budgetLimits).values([
    {
      companyId: company.id,
      department: "Marketing",
      monthlyLimit: 3000,
      perRequestLimit: 1000,
    },
    {
      companyId: company.id,
      department: "Engineering",
      monthlyLimit: 5000,
      perRequestLimit: 2000,
    },
    {
      companyId: company.id,
      department: "Finance",
      monthlyLimit: 2000,
      perRequestLimit: 1500,
    },
  ]);

  console.log("✓ Created budget limits for departments");

  // Policy rules
  await db.insert(policyRules).values([
    {
      companyId: company.id,
      ruleType: "blocklist",
      toolName: "Unapproved AI Tool X",
      enabled: true,
    },
    {
      companyId: company.id,
      ruleType: "allowlist",
      toolName: "ChatGPT Plus",
      enabled: true,
    },
    {
      companyId: company.id,
      ruleType: "allowlist",
      toolName: "GitHub Copilot",
      enabled: true,
    },
    {
      companyId: company.id,
      ruleType: "duplicate_check",
      category: "Design Tools",
      enabled: true,
    },
  ]);

  console.log("✓ Created policy rules");

  // Seed some historical purchase requests
  const employeeUser = createdUsers.find((u) => u.role === "employee");
  const approverUser = createdUsers.find((u) => u.role === "approver");

  if (employeeUser && approverUser) {
    const seedRequests = [
      {
        companyId: company.id,
        requestedBy: employeeUser.id,
        toolName: "ChatGPT Plus",
        toolCategory: "AI Assistant",
        amount: 20,
        description: "Monthly subscription for marketing content creation",
        department: "Marketing",
        status: "completed",
        policyDecision: "auto_approve",
        policyReason: "Within budget limits and on allowlist",
        approvedBy: null,
        vendorEmail: "vendor@openai.com",
        paypalPayoutId: "SEED_PAYOUT_001",
        isAgentRequest: false,
      },
      {
        companyId: company.id,
        requestedBy: employeeUser.id,
        toolName: "Midjourney",
        toolCategory: "Image Generation",
        amount: 30,
        description: "Monthly subscription for design assets",
        department: "Marketing",
        status: "completed",
        policyDecision: "route_to_approver",
        policyReason: "New tool requiring approval",
        approvedBy: approverUser.id,
        vendorEmail: "vendor@midjourney.com",
        paypalPayoutId: "SEED_PAYOUT_002",
        isAgentRequest: false,
      },
      {
        companyId: company.id,
        requestedBy: employeeUser.id,
        toolName: "GitHub Copilot",
        toolCategory: "Code Assistant",
        amount: 19,
        description: "Monthly subscription for development team",
        department: "Engineering",
        status: "completed",
        policyDecision: "auto_approve",
        policyReason: "Within budget and on allowlist",
        approvedBy: null,
        vendorEmail: "vendor@github.com",
        paypalPayoutId: "SEED_PAYOUT_003",
        isAgentRequest: false,
      },
    ];

    await db.insert(purchaseRequests).values(seedRequests);
    console.log(`✓ Created ${seedRequests.length} historical purchase requests`);

    // Update budget ledger with these spends
    const currentBalance = 10000 - 20 - 30 - 19;
    await db.insert(budgetLedger).values([
      {
        companyId: company.id,
        amount: -20,
        type: "spend",
        description: "ChatGPT Plus subscription",
        balance: 9980,
        paypalTransactionId: "SEED_PAYOUT_001",
      },
      {
        companyId: company.id,
        amount: -30,
        type: "spend",
        description: "Midjourney subscription",
        balance: 9950,
        paypalTransactionId: "SEED_PAYOUT_002",
      },
      {
        companyId: company.id,
        amount: -19,
        type: "spend",
        description: "GitHub Copilot subscription",
        balance: 9931,
        paypalTransactionId: "SEED_PAYOUT_003",
      },
    ]);

    console.log(`✓ Updated budget ledger (current balance: $${currentBalance})`);
  }

  console.log("\n✅ Database seeded successfully!");
  console.log("\nDemo accounts:");
  console.log("  Finance Admin: admin@northwind.demo");
  console.log("  Employee:      employee@northwind.demo");
  console.log("  Approver:      approver@northwind.demo");
}

seed()
  .catch((error) => {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  })
  .then(() => {
    process.exit(0);
  });
