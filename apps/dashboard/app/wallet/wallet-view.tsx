'use client';
import { useRef, useState } from 'react';
import type { WalletConfig } from '@/lib/wallet-config';
import { walletClient } from '@/lib/wallet-client';
export default function WalletView({ config }: { config: WalletConfig }) {
  const [client] = useState(() => walletClient(config));
  const [signedIn, setSignedIn] = useState(false), [busy, setBusy] = useState(false);
  const [wallet, setWallet] = useState<{ available: number; held: number } | null>(null);
  const [error, setError] = useState('');
  const revision = useRef(0);
  async function read() {
    const current = revision.current; setBusy(true); setError(''); setWallet(null);
    try { const balance = await client.balance(); if (current === revision.current) setWallet(balance); }
    catch { if (current === revision.current) {
      client.signOut(); setSignedIn(false); setError('Could not verify your balance. Sign in again.');
    } } finally { if (current === revision.current) setBusy(false); }
  }
  function signOut() { revision.current++; client.signOut(); setSignedIn(false); setWallet(null); setError(''); setBusy(false); }
  return <section className="meter-wallet" aria-label="Read-only alpha wallet">
    <p>Use an existing isolated test account. Credentials stay in memory; reload signs you out. No account creation or session refresh.</p>
    {!signedIn ? <form className="meter-wallet-form" onSubmit={async event => {
      event.preventDefault(); const form = event.currentTarget, data = new FormData(form);
      const current = ++revision.current; setBusy(true); setError(''); setWallet(null);
      const email = String(data.get('email') ?? ''), password = String(data.get('password') ?? ''); form.reset();
      try { await client.signIn(email, password); if (current !== revision.current) return;
        setSignedIn(true); await read();
      } catch { if (current === revision.current) { client.signOut(); setError('Sign-in failed. Check your test account and retry.'); } }
      finally { if (current === revision.current) setBusy(false); }
    }}>
      <label>Email<input name="email" type="email" autoComplete="off" required disabled={busy} /></label>
      <label>Password<input name="password" type="password" autoComplete="off" required disabled={busy} /></label>
      <button type="submit" disabled={busy}>Sign in</button>
    </form> : <>
      <button onClick={() => void read()} disabled={busy}>Refresh balance</button>
      <button onClick={signOut}>Sign out locally</button>
    </>}
    {busy && <p role="status">Verifying account and balance…</p>}
    {error && <p role="alert">{error}</p>}
    {wallet && <section aria-label="Verified wallet balance"><h2>Your sandbox credits</h2>
      <dl><dt>Available credits</dt><dd>{wallet.available}</dd><dt>Held credits</dt><dd>{wallet.held}</dd></dl>
      <p>Held credits may belong to unresolved work. This view cannot release them or retry jobs. A zero balance does not mean a payment was verified.</p>
    </section>}
  </section>;
}
