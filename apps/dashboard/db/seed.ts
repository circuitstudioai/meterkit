import { db, builders, apps, features, endUsers, ledgerEntries, topups, payouts, auditLog } from "@/lib/db";

async function seed() {
  console.log("Seeding MeterKit dashboard...");

  await db.delete(auditLog);
  await db.delete(payouts);
  await db.delete(topups);
  await db.delete(ledgerEntries);
  await db.delete(endUsers);
  await db.delete(features);
  await db.delete(apps);
  await db.delete(builders);

  const [builder] = await db
    .insert(builders)
    .values({
      name: "Maya Chen",
      email: "maya@studio.demo",
      paypalEmail: "builder-sandbox@paypal.com",
    })
    .returning();

  const [app] = await db
    .insert(apps)
    .values({
      builderId: builder.id,
      name: "Northwind Chat",
      slug: "northwind-chat",
    })
    .returning();

  await db.insert(features).values([
    {
      appId: app.id,
      featureKey: "chat.message",
      name: "Chat message",
      creditsPerUnit: 5,
      unitLabel: "message",
    },
    {
      appId: app.id,
      featureKey: "pdf.export",
      name: "Export PDF",
      creditsPerUnit: 25,
      unitLabel: "export",
    },
    {
      appId: app.id,
      featureKey: "gemini.tokens",
      name: "Gemini tokens",
      creditsPerUnit: 0.01,
      unitLabel: "token",
    },
  ]);

  await db.insert(endUsers).values([
    {
      appId: app.id,
      externalUserId: "user_alex",
      email: "alex@example.com",
      name: "Alex Rivera",
      balance: 420,
      lowBalanceThreshold: 50,
    },
    {
      appId: app.id,
      externalUserId: "user_jordan",
      email: "jordan@example.com",
      name: "Jordan Smith",
      balance: 35,
      lowBalanceThreshold: 50,
    },
    {
      appId: app.id,
      externalUserId: "user_sam",
      email: "sam@example.com",
      name: "Sam Okonkwo",
      balance: 880,
      lowBalanceThreshold: 100,
    },
  ]);

  await db.insert(ledgerEntries).values([
    {
      appId: app.id,
      userId: "user_alex",
      type: "topup",
      amount: 500,
      balanceAfter: 500,
      paypalTransactionId: "SANDBOX_CAPTURE_001",
      idempotencyKey: "seed-topup-alex",
    },
    {
      appId: app.id,
      userId: "user_alex",
      type: "debit",
      amount: -80,
      balanceAfter: 420,
      featureKey: "chat.message",
      units: 16,
      idempotencyKey: "seed-debit-alex",
    },
    {
      appId: app.id,
      userId: "user_jordan",
      type: "topup",
      amount: 100,
      balanceAfter: 100,
      paypalTransactionId: "SANDBOX_CAPTURE_002",
      idempotencyKey: "seed-topup-jordan",
    },
    {
      appId: app.id,
      userId: "user_jordan",
      type: "debit",
      amount: -65,
      balanceAfter: 35,
      featureKey: "pdf.export",
      units: 1,
      idempotencyKey: "seed-debit-jordan",
    },
    {
      appId: app.id,
      userId: "user_sam",
      type: "topup",
      amount: 1000,
      balanceAfter: 1000,
      paypalTransactionId: "SANDBOX_CAPTURE_003",
      idempotencyKey: "seed-topup-sam",
    },
    {
      appId: app.id,
      userId: "user_sam",
      type: "debit",
      amount: -120,
      balanceAfter: 880,
      featureKey: "gemini.tokens",
      units: 12000,
      idempotencyKey: "seed-debit-sam",
    },
  ]);

  await db.insert(topups).values([
    {
      appId: app.id,
      userId: "user_alex",
      usdAmount: 10,
      credits: 500,
      paypalOrderId: "SANDBOX_ORDER_001",
      status: "completed",
    },
    {
      appId: app.id,
      userId: "user_jordan",
      usdAmount: 2,
      credits: 100,
      paypalOrderId: "SANDBOX_ORDER_002",
      status: "completed",
    },
    {
      appId: app.id,
      userId: "user_sam",
      usdAmount: 20,
      credits: 1000,
      paypalOrderId: "SANDBOX_ORDER_003",
      status: "completed",
    },
  ]);

  await db.insert(payouts).values({
    appId: app.id,
    usdAmount: 18.5,
    recipientEmail: "builder-sandbox@paypal.com",
    paypalPayoutId: "SANDBOX_PAYOUT_001",
    status: "completed",
  });

  await db.insert(auditLog).values([
    {
      appId: app.id,
      action: "wallet_topup",
      details: JSON.stringify({ userId: "user_alex", credits: 500, paypalOrderId: "SANDBOX_ORDER_001" }),
    },
    {
      appId: app.id,
      action: "feature_debit",
      details: JSON.stringify({ userId: "user_alex", featureKey: "chat.message", credits: 80 }),
    },
    {
      appId: app.id,
      action: "builder_payout",
      details: JSON.stringify({ usdAmount: 18.5, paypalPayoutId: "SANDBOX_PAYOUT_001" }),
    },
  ]);

  console.log("Seeded builder maya@studio.demo / app Northwind Chat");
}

seed()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .then(() => process.exit(0));
