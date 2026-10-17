import { pgTable, text, integer, real, serial, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const builders = pgTable("builders", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  paypalEmail: text("paypal_email"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const apps = pgTable("apps", {
  id: serial("id").primaryKey(),
  builderId: integer("builder_id").notNull().references(() => builders.id),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const features = pgTable("features", {
  id: serial("id").primaryKey(),
  appId: integer("app_id").notNull().references(() => apps.id),
  featureKey: text("feature_key").notNull(),
  name: text("name").notNull(),
  creditsPerUnit: real("credits_per_unit").notNull(),
  unitLabel: text("unit_label").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const endUsers = pgTable("end_users", {
  id: serial("id").primaryKey(),
  appId: integer("app_id").notNull().references(() => apps.id),
  externalUserId: text("external_user_id").notNull(),
  email: text("email"),
  name: text("name"),
  balance: real("balance").notNull().default(0),
  lowBalanceThreshold: real("low_balance_threshold").notNull().default(100),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const ledgerEntries = pgTable(
  "ledger_entries",
  {
    id: serial("id").primaryKey(),
    appId: integer("app_id").notNull().references(() => apps.id),
    userId: text("user_id").notNull(),
    type: text("type").notNull(),
    amount: real("amount").notNull(),
    balanceAfter: real("balance_after").notNull(),
    featureKey: text("feature_key"),
    units: real("units"),
    idempotencyKey: text("idempotency_key"),
    paypalTransactionId: text("paypal_transaction_id"),
    metadata: text("metadata"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("ledger_idempotency_idx").on(table.idempotencyKey)]
);

export const topups = pgTable("topups", {
  id: serial("id").primaryKey(),
  appId: integer("app_id").notNull().references(() => apps.id),
  userId: text("user_id").notNull(),
  usdAmount: real("usd_amount").notNull(),
  credits: real("credits").notNull(),
  paypalOrderId: text("paypal_order_id"),
  status: text("status").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const payouts = pgTable("payouts", {
  id: serial("id").primaryKey(),
  appId: integer("app_id").notNull().references(() => apps.id),
  usdAmount: real("usd_amount").notNull(),
  recipientEmail: text("recipient_email").notNull(),
  paypalPayoutId: text("paypal_payout_id"),
  status: text("status").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const auditLog = pgTable("audit_log", {
  id: serial("id").primaryKey(),
  appId: integer("app_id"),
  action: text("action").notNull(),
  details: text("details").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
