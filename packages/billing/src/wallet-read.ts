import { BillingError, type Scope, type Wallet } from './index';
import type { Identity } from './service';
/** Public-user read surface only. No wallet selectors, mutations, jobs or provider access. */
export function walletReadHandler(o: {
  origin: string; appId: string;
  authenticate(request: Request): Promise<Identity>;
  balance(scope: Scope): Promise<Wallet>;
}) {
  const origin = new URL(o.origin);
  if (origin.origin !== o.origin || !['http:', 'https:'].includes(origin.protocol) || !o.appId.trim())
    throw new Error('invalid_wallet_policy');
  return async (request: Request) => {
    const headers = { 'Cache-Control': 'no-store', Vary: 'Origin' };
    const reply = (data: unknown, status = 200) => Response.json(data, { status, headers });
    if (request.headers.has('origin') && request.headers.get('origin') !== o.origin)
      return reply({ error: 'origin_denied' }, 403);
    if (request.method !== 'GET') return reply({ error: 'method_not_allowed' }, 405);
    if (new URL(request.url).search) return reply({ error: 'wallet_selector_denied' }, 400);
    try {
      const identity = await o.authenticate(request);
      if (identity.scope.appId !== o.appId || identity.scope.workspaceId !== identity.userId)
        return reply({ error: 'wallet_scope_denied' }, 403);
      return reply(await o.balance(identity.scope));
    } catch (error) {
      return reply({ error: error instanceof BillingError ? error.code : 'wallet_unavailable' },
        error instanceof BillingError ? error.status : 503);
    }
  };
}
