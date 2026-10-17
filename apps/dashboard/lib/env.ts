/**
 * Central env access for AI Spend Wallet.
 * Presence of DATABASE_URL switches the app from local SQLite to Supabase Postgres.
 */
function read(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}

export const env = {
  databaseUrl: read("DATABASE_URL"),
  databasePath: read("DATABASE_PATH", "./data/wallet.db"),

  paypalClientId: read("PAYPAL_CLIENT_ID"),
  paypalClientSecret: read("PAYPAL_CLIENT_SECRET"),
  paypalMode: read("PAYPAL_MODE", "sandbox"),
  paypalWebhookId: read("PAYPAL_WEBHOOK_ID"),

  geminiApiKey: read("GEMINI_API_KEY"),
  geminiModel: read("GEMINI_MODEL", "gemini-2.5-flash"),

  appUrl: read("NEXT_PUBLIC_APP_URL", "http://localhost:43123"),

  supabaseUrl: read("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: read("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  supabaseServiceRoleKey: read("SUPABASE_SERVICE_ROLE_KEY"),
};

export const usePostgres = Boolean(env.databaseUrl);
