import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

export const companies = sqliteTable("companies", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  companyId: integer("company_id").notNull().references(() => companies.id),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  role: text("role").notNull(), // 'admin', 'employee', 'approver'
  department: text("department"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const budgetLedger = sqliteTable("budget_ledger", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  companyId: integer("company_id").notNull().references(() => companies.id),
  amount: real("amount").notNull(),
  type: text("type").notNull(), // 'topup', 'spend', 'refund'
  description: text("description").notNull(),
  balance: real("balance").notNull(),
  paypalTransactionId: text("paypal_transaction_id"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const purchaseRequests = sqliteTable("purchase_requests", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  companyId: integer("company_id").notNull().references(() => companies.id),
  requestedBy: integer("requested_by").notNull().references(() => users.id),
  toolName: text("tool_name").notNull(),
  toolCategory: text("tool_category"),
  amount: real("amount").notNull(),
  description: text("description").notNull(),
  department: text("department"),
  status: text("status").notNull(), // 'pending', 'approved', 'denied', 'completed'
  policyDecision: text("policy_decision"), // 'auto_approve', 'route_to_approver', 'deny'
  policyReason: text("policy_reason"),
  approvedBy: integer("approved_by").references(() => users.id),
  vendorEmail: text("vendor_email"),
  paypalPayoutId: text("paypal_payout_id"),
  isAgentRequest: integer("is_agent_request", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const budgetLimits = sqliteTable("budget_limits", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  companyId: integer("company_id").notNull().references(() => companies.id),
  department: text("department"),
  monthlyLimit: real("monthly_limit"),
  perRequestLimit: real("per_request_limit"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const policyRules = sqliteTable("policy_rules", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  companyId: integer("company_id").notNull().references(() => companies.id),
  ruleType: text("rule_type").notNull(), // 'allowlist', 'blocklist', 'duplicate_check'
  toolName: text("tool_name"),
  category: text("category"),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const auditLog = sqliteTable("audit_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  companyId: integer("company_id").notNull().references(() => companies.id),
  requestId: integer("request_id").references(() => purchaseRequests.id),
  userId: integer("user_id").references(() => users.id),
  action: text("action").notNull(),
  details: text("details").notNull(), // JSON string
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

// Relations
export const companiesRelations = relations(companies, ({ many }) => ({
  users: many(users),
  budgetLedger: many(budgetLedger),
  purchaseRequests: many(purchaseRequests),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  company: one(companies, {
    fields: [users.companyId],
    references: [companies.id],
  }),
  requestsMade: many(purchaseRequests, { relationName: "requestedBy" }),
  requestsApproved: many(purchaseRequests, { relationName: "approvedBy" }),
}));

export const purchaseRequestsRelations = relations(purchaseRequests, ({ one }) => ({
  company: one(companies, {
    fields: [purchaseRequests.companyId],
    references: [companies.id],
  }),
  requester: one(users, {
    fields: [purchaseRequests.requestedBy],
    references: [users.id],
    relationName: "requestedBy",
  }),
  approver: one(users, {
    fields: [purchaseRequests.approvedBy],
    references: [users.id],
    relationName: "approvedBy",
  }),
}));
