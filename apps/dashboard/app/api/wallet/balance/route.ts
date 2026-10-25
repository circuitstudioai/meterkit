import postgres from 'postgres';
import { BillingKernel } from '../../../../../../packages/billing/src/index';
import { supabaseUserIdentity } from '../../../../../../packages/billing/src/user-identity';
import { walletReadHandler } from '../../../../../../packages/billing/src/wallet-read';
import { walletConfig } from '../../../../lib/wallet-config';
let handler: ReturnType<typeof walletReadHandler> | undefined;
async function dispatch(request: Request) {
  const config = walletConfig(process.env);
  if (!config) return Response.json({ error: 'wallet_not_configured' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  try {
    if (!handler) {
      const url = new URL(process.env.DATABASE_URL!);
      const kernel = new BillingKernel(postgres(url.href, { max: 2, prepare: false,
        ssl: ['localhost', '127.0.0.1'].includes(url.hostname) ? undefined : 'require' }));
      const identity = supabaseUserIdentity({ url: config.issuer, anonKey: config.anonKey, appId: config.appId });
      handler = walletReadHandler({ ...config, authenticate: identity.authenticate, balance: scope => kernel.balance(scope) });
    }
    return await handler(request);
  } catch { return Response.json({ error: 'wallet_unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } }); }
}
export const GET = dispatch;
// Explicit refusal even when this independent read gate is configured.
export const POST = dispatch;
export const OPTIONS = dispatch;
