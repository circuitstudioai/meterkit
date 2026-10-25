export type WalletConfig = { issuer: string; anonKey: string; appId: string; origin: string };
/** Separate read-only gate; never activates chat, payment, or Command Center routes. */
export function walletConfig(e: Record<string, string | undefined>): WalletConfig | null {
  if (e.METERKIT_WALLET_READ_ENABLED !== 'true' || !e.DATABASE_URL ||
      !e.METERKIT_CHAT_SUPABASE_ANON_KEY?.trim() || !/^[a-zA-Z0-9_-]{1,128}$/.test(e.METERKIT_CHAT_APP_ID ?? '')) return null;
  try {
    const issuer = new URL(e.METERKIT_CHAT_SUPABASE_URL ?? '');
    const origin = new URL(e.METERKIT_WALLET_ORIGIN ?? '');
    if (issuer.protocol !== 'https:' || issuer.username || issuer.password || issuer.port ||
        issuer.pathname !== '/' || issuer.search || issuer.hash || origin.origin !== e.METERKIT_WALLET_ORIGIN ||
        !(origin.protocol === 'https:' || (origin.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(origin.hostname)))) return null;
    return { issuer: issuer.origin, anonKey: e.METERKIT_CHAT_SUPABASE_ANON_KEY,
      appId: e.METERKIT_CHAT_APP_ID!, origin: origin.origin };
  } catch { return null; }
}
