import { test } from 'node:test';
import assert from 'node:assert/strict';
import { walletReadHandler } from './wallet-read';
import { BillingError, type Scope } from './index';
import { supabaseUserIdentity } from './user-identity';
const users = ['11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222'];
function setup() {
  const reads: Scope[] = [];
  const identity = supabaseUserIdentity({ url: 'https://auth.example', anonKey: 'fixture', appId: 'chat',
    fetcher: async (_url, init) => {
      const token = new Headers(init?.headers).get('authorization');
      const index = ['Bearer a', 'Bearer b'].indexOf(token ?? '');
      return index < 0 ? Response.json({}, { status: 401 }) : Response.json({ id: users[index] });
    } });
  const options = { origin: 'https://dashboard.example', appId: 'chat', authenticate: identity.authenticate,
    balance: async (scope: Scope) => { reads.push(scope); return { available: scope.workspaceId === users[0] ? 50 : 0, held: 0 }; } };
  return { reads, options, handler: walletReadHandler(options) };
}
const request = (token?: string, suffix = '', method = 'GET', origin = 'https://dashboard.example') =>
  new Request('https://dashboard.example/api/wallet/balance' + suffix,
    { method, headers: { Origin: origin, ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
test('verified users read only their app-bound balance; absent/invalid sessions never reach kernel', async () => {
  const { handler, reads } = setup();
  assert.deepEqual(await (await handler(request('a'))).json(), { available: 50, held: 0 });
  assert.deepEqual(await (await handler(request('b'))).json(), { available: 0, held: 0 });
  for (const token of [undefined, 'invalid']) assert.equal((await handler(request(token))).status, 401);
  assert.deepEqual(reads, users.map(workspaceId => ({ appId: 'chat', workspaceId })));
});
test('origin, selectors and all non-GET requests refuse before reading any wallet', async () => {
  const { handler, reads } = setup();
  for (const query of ['?workspaceId=other', '?appId=other', '?userId=other']) assert.equal((await handler(request('a', query))).status, 400);
  for (const method of ['POST', 'PUT', 'DELETE', 'OPTIONS']) assert.equal((await handler(request('a', '', method))).status, 405);
  assert.equal((await handler(request('a', '', 'GET', 'https://evil.example'))).status, 403);
  assert.equal(reads.length, 0);
});
test('broken identity adapters cannot return another app or shared wallet; failures never leak provider details', async () => {
  const { options, reads } = setup();
  for (const scope of [{ appId: 'other', workspaceId: users[0] }, { appId: 'chat', workspaceId: users[1] }]) {
    const handler = walletReadHandler({ ...options, authenticate: async () => ({ scope, userId: users[0] }) });
    assert.equal((await handler(request('a'))).status, 403);
  }
  const handler = walletReadHandler({ ...options, authenticate: async () => { throw Error('private-provider-detail'); } });
  const response = await handler(request('a'));
  assert.equal(response.status, 503); assert.deepEqual(await response.json(), { error: 'wallet_unavailable' });
  assert.equal(response.headers.get('Cache-Control'), 'no-store'); assert.equal(reads.length, 0);
  const denied = walletReadHandler({ ...options, authenticate: async () => { throw new BillingError('unauthorized', 401); } });
  assert.equal((await denied(request('a'))).status, 401);
});
