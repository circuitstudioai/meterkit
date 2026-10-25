import { PageShell } from '@/components/page-shell';
import { walletConfig } from '@/lib/wallet-config';
import WalletView from './wallet-view';
import { connection } from 'next/server';
import { Suspense } from 'react';
async function WalletContent() {
  await connection();
  const config = walletConfig(process.env);
  return <>{config ? <WalletView config={config} /> : <section><h2>Alpha wallet is unavailable</h2>
      <p>Verified Auth and isolated deployment acceptance are required before enabling this read-only view.</p></section>}
    <p>No purchases, credit changes, AI actions or automatic refunds are available here. Production payments remain disabled.</p>
  </>;
}

export default function WalletPage() {
  return <PageShell title="Your alpha wallet" description="Read-only sandbox credits for your verified account. Not a builder-wide ledger.">
    <Suspense fallback={<p>Checking read-only wallet availability…</p>}><WalletContent /></Suspense>
  </PageShell>;
}
