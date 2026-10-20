-- MeterKit production schema (Supabase / Postgres)
-- PayPal holds funds; this database is only the credit ledger.

CREATE TABLE IF NOT EXISTS builders (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  paypal_email TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS apps (
  id SERIAL PRIMARY KEY,
  builder_id INTEGER NOT NULL REFERENCES builders(id),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS features (
  id SERIAL PRIMARY KEY,
  app_id INTEGER NOT NULL REFERENCES apps(id),
  feature_key TEXT NOT NULL,
  name TEXT NOT NULL,
  credits_per_unit REAL NOT NULL,
  unit_label TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS end_users (
  id SERIAL PRIMARY KEY,
  app_id INTEGER NOT NULL REFERENCES apps(id),
  external_user_id TEXT NOT NULL,
  email TEXT,
  name TEXT,
  balance REAL NOT NULL DEFAULT 0,
  low_balance_threshold REAL NOT NULL DEFAULT 100,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ledger_entries (
  id SERIAL PRIMARY KEY,
  app_id INTEGER NOT NULL REFERENCES apps(id),
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  amount REAL NOT NULL,
  balance_after REAL NOT NULL,
  feature_key TEXT,
  units REAL,
  idempotency_key TEXT UNIQUE,
  paypal_transaction_id TEXT,
  metadata TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS topups (
  id SERIAL PRIMARY KEY,
  app_id INTEGER NOT NULL REFERENCES apps(id),
  user_id TEXT NOT NULL,
  usd_amount REAL NOT NULL,
  credits REAL NOT NULL,
  paypal_order_id TEXT,
  status TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payouts (
  id SERIAL PRIMARY KEY,
  app_id INTEGER NOT NULL REFERENCES apps(id),
  usd_amount REAL NOT NULL,
  recipient_email TEXT NOT NULL,
  paypal_payout_id TEXT,
  status TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_log (
  id SERIAL PRIMARY KEY,
  app_id INTEGER,
  action TEXT NOT NULL,
  details TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
