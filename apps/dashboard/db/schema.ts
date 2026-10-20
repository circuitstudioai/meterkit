import { sqliteTable, text, integer, real, uniqueIndex } from "drizzle-orm/sqlite-core";

export const builders = sqliteTable("builders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  paypalEmail: text("paypal_email"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const apps = sqliteTable("apps", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  builderId: integer("builder_id").notNull().references(() => builders.id),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const features = sqliteTable("features", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  appId: integer("app_id").notNull().references(() => apps.id),
  featureKey: text("feature_key").notNull(),
  name: text("name").notNull(),
  creditsPerUnit: real("credits_per_unit").notNull(),
  unitLabel: text("unit_label").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const endUsers = sqliteTable("end_users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  appId: integer("app_id").notNull().references(() => apps.id),
  externalUserId: text("external_user_id").notNull(),
  email: text("email"),
  name: text("name"),
  balance: real("balance").notNull().default(0),
  lowBalanceThreshold: real("low_balance_threshold").notNull().default(100),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const ledgerEntries = sqliteTable(
  "ledger_entries",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
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
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  },
  (table) => [uniqueIndex("ledger_idempotency_idx").on(table.idempotencyKey)]
);

export const topups = sqliteTable("topups", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  appId: integer("app_id").notNull().references(() => apps.id),
  userId: text("user_id").notNull(),
  usdAmount: real("usd_amount").notNull(),
  credits: real("credits").notNull(),
  paypalOrderId: text("paypal_order_id"),
  status: text("status").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const payouts = sqliteTable("payouts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  appId: integer("app_id").notNull().references(() => apps.id),
  usdAmount: real("usd_amount").notNull(),
  recipientEmail: text("recipient_email").notNull(),
  paypalPayoutId: text("paypal_payout_id"),
  status: text("status").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const auditLog = sqliteTable("audit_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  appId: integer("app_id"),
  action: text("action").notNull(),
  details: text("details").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});
