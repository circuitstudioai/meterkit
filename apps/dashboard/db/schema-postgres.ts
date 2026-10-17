import { pgTable, text, integer, real, serial, timestamp, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  department: text("department"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const budgetLedger = pgTable("budget_ledger", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id),
  amount: real("amount").notNull(),
  type: text("type").notNull(),
  description: text("description").notNull(),
  balance: real("balance").notNull(),
  paypalTransactionId: text("paypal_transaction_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const purchaseRequests = pgTable("purchase_requests", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id),
  requestedBy: integer("requested_by").notNull().references(() => users.id),
  toolName: text("tool_name").notNull(),
  toolCategory: text("tool_category"),
  amount: real("amount").notNull(),
  description: text("description").notNull(),
  department: text("department"),
  status: text("status").notNull(),
  policyDecision: text("policy_decision"),
  policyReason: text("policy_reason"),
  approvedBy: integer("approved_by").references(() => users.id),
  vendorEmail: text("vendor_email"),
  paypalPayoutId: text("paypal_payout_id"),
  isAgentRequest: boolean("is_agent_request").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const budgetLimits = pgTable("budget_limits", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id),
  department: text("department"),
  monthlyLimit: real("monthly_limit"),
  perRequestLimit: real("per_request_limit"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const policyRules = pgTable("policy_rules", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id),
  ruleType: text("rule_type").notNull(),
  toolName: text("tool_name"),
  category: text("category"),
  enabled: boolean("enabled").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const auditLog = pgTable("audit_log", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id),
  requestId: integer("request_id").references(() => purchaseRequests.id),
  userId: integer("user_id").references(() => users.id),
  action: text("action").notNull(),
  details: text("details").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
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
