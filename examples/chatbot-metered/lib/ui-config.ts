/** Server-owned allowlist. Only these public values may cross into the browser. */
export type ChatUiConfig = { issuer: string; anonKey: string; appId: string; origin: string };
export function chatUiConfig(env: Record<string, string | undefined>): ChatUiConfig | null {
  if (env.METERKIT_CHAT_UI_ENABLED !== "true" || env.METERKIT_CHAT_ENABLED !== "true" ||
      env.METERKIT_CHAT_SANDBOX_POLICY_APPROVED !== "true" || env.METERKIT_CHAT_DATA_APPROVED !== "true" ||
      !env.DATABASE_URL || !env.METERKIT_CHAT_SUPABASE_ANON_KEY?.trim() ||
      !/^[a-zA-Z0-9_-]{1,128}$/.test(env.METERKIT_CHAT_APP_ID ?? "")) return null;
  try {
    const issuer = new URL(env.METERKIT_CHAT_SUPABASE_URL ?? "");
    const origin = new URL(env.METERKIT_CHAT_ORIGIN ?? "");
    if (issuer.protocol !== "https:" || issuer.username || issuer.password || issuer.port ||
        issuer.pathname !== "/" || issuer.search || issuer.hash ||
        origin.origin !== env.METERKIT_CHAT_ORIGIN ||
        !(origin.protocol === "https:" || (origin.protocol === "http:" && ["localhost", "127.0.0.1"].includes(origin.hostname)))) return null;
    return { issuer: issuer.origin, anonKey: env.METERKIT_CHAT_SUPABASE_ANON_KEY,
      appId: env.METERKIT_CHAT_APP_ID!, origin: origin.origin };
  } catch { return null; }
}
