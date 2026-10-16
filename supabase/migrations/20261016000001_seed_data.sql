-- AI Spend Wallet - Seed Data for Demo
-- Run this after the schema migration to populate demo data

-- Insert demo company
INSERT INTO companies (name, created_at) 
VALUES ('Northwind Labs', NOW())
ON CONFLICT DO NOTHING;

-- Get the company ID (assuming it's the first/only company)
DO $$
DECLARE
  company_id INTEGER;
  admin_id INTEGER;
  employee_id INTEGER;
  approver_id INTEGER;
BEGIN
  SELECT id INTO company_id FROM companies WHERE name = 'Northwind Labs' LIMIT 1;

  -- Insert demo users
  INSERT INTO users (company_id, email, name, role, department, created_at)
  VALUES 
    (company_id, 'admin@northwind.demo', 'Alex Chen', 'admin', 'Finance', NOW()),
    (company_id, 'employee@northwind.demo', 'Jordan Smith', 'employee', 'Marketing', NOW()),
    (company_id, 'approver@northwind.demo', 'Sam Williams', 'approver', 'Engineering', NOW()),
    (company_id, 'sarah.marketing@northwind.demo', 'Sarah Johnson', 'employee', 'Marketing', NOW()),
    (company_id, 'mike.eng@northwind.demo', 'Mike Rodriguez', 'employee', 'Engineering', NOW())
  ON CONFLICT (email) DO NOTHING;

  -- Get user IDs
  SELECT id INTO admin_id FROM users WHERE email = 'admin@northwind.demo';
  SELECT id INTO employee_id FROM users WHERE email = 'employee@northwind.demo';
  SELECT id INTO approver_id FROM users WHERE email = 'approver@northwind.demo';

  -- Insert initial budget
  INSERT INTO budget_ledger (company_id, amount, type, description, balance, paypal_transaction_id, created_at)
  VALUES (company_id, 10000, 'topup', 'Initial PayPal sandbox top-up', 10000, 'SEED_TXNID_001', NOW());

  -- Insert budget limits
  INSERT INTO budget_limits (company_id, department, monthly_limit, per_request_limit, created_at)
  VALUES 
    (company_id, 'Marketing', 3000, 1000, NOW()),
    (company_id, 'Engineering', 5000, 2000, NOW()),
    (company_id, 'Finance', 2000, 1500, NOW())
  ON CONFLICT DO NOTHING;

  -- Insert policy rules
  INSERT INTO policy_rules (company_id, rule_type, tool_name, category, enabled, created_at)
  VALUES 
    (company_id, 'blocklist', 'Unapproved AI Tool X', NULL, true, NOW()),
    (company_id, 'allowlist', 'ChatGPT Plus', NULL, true, NOW()),
    (company_id, 'allowlist', 'GitHub Copilot', NULL, true, NOW()),
    (company_id, 'duplicate_check', NULL, 'Design Tools', true, NOW())
  ON CONFLICT DO NOTHING;

  -- Insert sample purchase requests
  INSERT INTO purchase_requests (
    company_id, requested_by, tool_name, tool_category, amount, description, 
    department, status, policy_decision, policy_reason, approved_by, vendor_email, 
    paypal_payout_id, is_agent_request, created_at, updated_at
  )
  VALUES 
    (company_id, employee_id, 'ChatGPT Plus', 'AI Assistant', 20, 
     'Monthly subscription for marketing content creation', 'Marketing', 'completed',
     'auto_approve', 'Within budget limits and on allowlist', NULL, 'vendor@openai.com',
     'SEED_PAYOUT_001', false, NOW(), NOW()),
    (company_id, employee_id, 'Midjourney', 'Image Generation', 30,
     'Monthly subscription for design assets', 'Marketing', 'completed',
     'route_to_approver', 'New tool requiring approval', approver_id, 'vendor@midjourney.com',
     'SEED_PAYOUT_002', false, NOW(), NOW()),
    (company_id, employee_id, 'GitHub Copilot', 'Code Assistant', 19,
     'Monthly subscription for development team', 'Engineering', 'completed',
     'auto_approve', 'Within budget and on allowlist', NULL, 'vendor@github.com',
     'SEED_PAYOUT_003', false, NOW(), NOW());

  -- Update budget ledger with spends
  INSERT INTO budget_ledger (company_id, amount, type, description, balance, paypal_transaction_id, created_at)
  VALUES 
    (company_id, -20, 'spend', 'ChatGPT Plus subscription', 9980, 'SEED_PAYOUT_001', NOW()),
    (company_id, -30, 'spend', 'Midjourney subscription', 9950, 'SEED_PAYOUT_002', NOW()),
    (company_id, -19, 'spend', 'GitHub Copilot subscription', 9931, 'SEED_PAYOUT_003', NOW());

  -- Insert audit log entries
  INSERT INTO audit_log (company_id, request_id, user_id, action, details, created_at)
  SELECT 
    company_id,
    pr.id,
    employee_id,
    'purchase_request_created',
    json_build_object(
      'toolName', pr.tool_name,
      'amount', pr.amount,
      'decision', pr.policy_decision,
      'reason', pr.policy_reason
    )::text,
    NOW()
  FROM purchase_requests pr
  WHERE pr.company_id = company_id;

END $$;
