import { test } from 'node:test';
import assert from 'node:assert/strict';
import postgres from 'postgres';
import { BillingKernel, migrate } from './index';
import { walletReadHandler } from './wallet-read';
import { supabaseUserIdentity } from './user-identity';
const url = process.env.METERKIT_TEST_DATABASE_URL;
if (!url || new URL(url).pathname !== '/meterkit_test') throw Error('dedicated meterkit_test required');
test('real Postgres read surface isolates users/apps and does not create wallets, entries or jobs', async () => {
  const db = postgres(url, { onnotice: () => {} });
  try {
    await migrate(db);
    await db`truncate meterkit_alpha.entries,meterkit_alpha.jobs,meterkit_alpha.orders,meterkit_alpha.wallets,meterkit_alpha.events`;
    const kernel = new BillingKernel(db), first = '11111111-1111-4111-8111-111111111111', second = '22222222-2222-4222-8222-222222222222';
    const scope = { appId: 'wallet-read-fixture', workspaceId: first };
    await kernel.createIntent(scope, { id: 'fixture-wallet-intent', packId: 'fixture', credits: 50, amountMinor: 100, currency: 'USD', merchantId: 'fixture-merchant' });
    await kernel.attachOrder('fixture-wallet-intent', 'fixture-wallet-order');
    await kernel.fulfill({ orderId: 'fixture-wallet-order', captureId: 'fixture-wallet-capture', status: 'COMPLETED', amountMinor: 100, currency: 'USD', merchantId: 'fixture-merchant' });
    await kernel.reserve(scope, { key: 'fixture-unknown-job', feature: 'fixture', credits: 5, input: {} });
    const handler = (appId: string) => {
      const identity = supabaseUserIdentity({ url: 'https://auth.example', anonKey: 'fixture', appId,
        fetcher: async (_url, init) => Response.json({ id: new Headers(init?.headers).get('authorization') === 'Bearer second' ? second : first }) });
      return walletReadHandler({ origin: 'https://dashboard.example', appId, authenticate: identity.authenticate, balance: s => kernel.balance(s) });
    };
    const request = (token: string) => new Request('https://dashboard.example/api/wallet/balance', { headers: { Authorization: `Bearer ${token}` } });
    assert.deepEqual(await (await handler(scope.appId)(request('first'))).json(), { available: 45, held: 5 });
    assert.deepEqual(await (await handler(scope.appId)(request('second'))).json(), { available: 0, held: 0 });
    assert.deepEqual(await (await handler('other-app')(request('first'))).json(), { available: 0, held: 0 });
    assert.equal(Number((await db`select count(*) n from meterkit_alpha.wallets`)[0].n), 1);
    assert.equal(Number((await db`select count(*) n from meterkit_alpha.entries`)[0].n), 2);
    assert.equal((await db`select status from meterkit_alpha.jobs`)[0].status, 'reserved');
  } finally { await db.end(); }
});
