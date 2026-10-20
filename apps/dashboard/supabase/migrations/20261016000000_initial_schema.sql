-- AI Spend Wallet - Initial Postgres Schema
-- Generated for Supabase deployment

-- Create companies table
CREATE TABLE IF NOT EXISTS companies (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id),
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  department TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create budget_ledger table
CREATE TABLE IF NOT EXISTS budget_ledger (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id),
  amount REAL NOT NULL,
  type TEXT NOT NULL,
  description TEXT NOT NULL,
  balance REAL NOT NULL,
  paypal_transaction_id TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create budget_limits table
CREATE TABLE IF NOT EXISTS budget_limits (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id),
  department TEXT,
  monthly_limit REAL,
  per_request_limit REAL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create policy_rules table
CREATE TABLE IF NOT EXISTS policy_rules (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id),
  rule_type TEXT NOT NULL,
  tool_name TEXT,
  category TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create purchase_requests table
CREATE TABLE IF NOT EXISTS purchase_requests (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id),
  requested_by INTEGER NOT NULL REFERENCES users(id),
  tool_name TEXT NOT NULL,
  tool_category TEXT,
  amount REAL NOT NULL,
  description TEXT NOT NULL,
  department TEXT,
  status TEXT NOT NULL,
  policy_decision TEXT,
  policy_reason TEXT,
  approved_by INTEGER REFERENCES users(id),
  vendor_email TEXT,
  paypal_payout_id TEXT,
  is_agent_request BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create audit_log table
CREATE TABLE IF NOT EXISTS audit_log (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id),
  request_id INTEGER REFERENCES purchase_requests(id),
  user_id INTEGER REFERENCES users(id),
  action TEXT NOT NULL,
  details TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_company ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_budget_ledger_company ON budget_ledger(company_id);
CREATE INDEX IF NOT EXISTS idx_budget_ledger_created ON budget_ledger(created_at);
CREATE INDEX IF NOT EXISTS idx_purchase_requests_company ON purchase_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_purchase_requests_status ON purchase_requests(status);
CREATE INDEX IF NOT EXISTS idx_purchase_requests_created ON purchase_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_company ON audit_log(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at);
