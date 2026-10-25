import type { WalletConfig } from './wallet-config';
type Wallet = { available: number; held: number };
/** Memory-only session; no refresh, persistence, selectors or billable request methods. */
export function walletClient(config: WalletConfig, network: typeof fetch = fetch, now = Date.now) {
  let session: { token: string; expires: number } | undefined, version = 0;
  async function json(response: Response) {
    const reader = response.body?.getReader();
    if (!reader) throw Error('invalid_response');
    const chunks: Uint8Array[] = []; let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        size += value.byteLength;
        if (size > 65536) { await reader.cancel(); throw Error('invalid_response'); }
        chunks.push(value);
      }
    } finally { reader.releaseLock(); }
    const bytes = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return JSON.parse(new TextDecoder().decode(bytes));
  }
  return {
    signOut() { version++; session = undefined; },
    async signIn(email: string, password: string) {
      const current = ++version; session = undefined;
      const response = await network(`${config.issuer}/auth/v1/token?grant_type=password`, {
        method: 'POST', redirect: 'error', cache: 'no-store', credentials: 'omit',
        headers: { apikey: config.anonKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }), signal: AbortSignal.timeout(10000),
      });
      const data = await json(response);
      if (version !== current) throw Error('session_changed');
      if (!response.ok || !/^[A-Za-z0-9._~-]{1,8192}$/.test(data?.access_token ?? '') ||
          typeof data?.access_token !== 'string' || typeof data.expires_in !== 'number' ||
          !Number.isFinite(data.expires_in) || data.expires_in <= 0 || data.expires_in > 86400)
        throw Error('sign_in_failed');
      session = { token: data.access_token, expires: now() + data.expires_in * 1000 };
    },
    async balance(): Promise<Wallet> {
      if (!session || session.expires <= now()) { session = undefined; throw Error('sign_in_required'); }
      const current = version;
      const response = await network('/api/wallet/balance', { redirect: 'error', cache: 'no-store', credentials: 'omit',
        headers: { Authorization: `Bearer ${session.token}` }, signal: AbortSignal.timeout(10000) });
      const data = await json(response);
      if (version !== current) throw Error('session_changed');
      if (response.status === 401 || !session || session.expires <= now()) { session = undefined; throw Error('sign_in_required'); }
      if (!response.ok || ![data?.available, data?.held].every(n => Number.isSafeInteger(n) && n >= 0))
        throw Error('wallet_unavailable');
      return { available: data.available, held: data.held };
    },
  };
}
