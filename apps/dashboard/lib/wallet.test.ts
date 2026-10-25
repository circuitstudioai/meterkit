import { test } from 'node:test';
import assert from 'node:assert/strict';
import { walletConfig } from './wallet-config';
import { walletClient } from './wallet-client';
const env = { METERKIT_WALLET_READ_ENABLED: 'true', DATABASE_URL: 'postgres://fixture', METERKIT_CHAT_SUPABASE_URL: 'https://auth.example',
  METERKIT_CHAT_SUPABASE_ANON_KEY: 'public', METERKIT_CHAT_APP_ID: 'chat', METERKIT_WALLET_ORIGIN: 'https://dashboard.example',
  PAYPAL_CLIENT_SECRET: 'never-serialize', GEMINI_API_KEY: 'never-serialize' };
const config = { issuer: 'https://auth.example', anonKey: 'public', appId: 'chat', origin: 'https://dashboard.example' };
const auth = () => Response.json({ access_token: 'fixture-token', expires_in: 3600, refresh_token: 'never-store' });
test('separate read gate requires exact safe public configuration and exposes no private env values', () => {
  assert.equal(walletConfig({}), null); assert.deepEqual(walletConfig(env), config);
  for (const key of Object.keys(env).filter(k => !['PAYPAL_CLIENT_SECRET', 'GEMINI_API_KEY'].includes(k)))
    assert.equal(walletConfig({ ...env, [key]: undefined }), null, key);
  for (const origin of ['*', 'https://dashboard.example/', 'http://public.example', 'null'])
    assert.equal(walletConfig({ ...env, METERKIT_WALLET_ORIGIN: origin }), null);
  for (const issuer of ['http://auth.example', 'https://auth.example/path', 'https://auth.example:444'])
    assert.equal(walletConfig({ ...env, METERKIT_CHAT_SUPABASE_URL: issuer }), null);
});
test('memory-only client sends no wallet selector and reload/sign-out/expiry require new login', async () => {
  let clock = 0; const calls: { url: string; init?: RequestInit }[] = [];
  const network: typeof fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    return String(url).startsWith(config.issuer) ? auth() : Response.json({ available: 50, held: 5 });
  };
  const client = walletClient(config, network, () => clock);
  await assert.rejects(client.balance(), /sign_in_required/);
  await client.signIn('fixture@example.test', 'fixture-password');
  assert.deepEqual(await client.balance(), { available: 50, held: 5 });
  assert.equal(calls[1].url, '/api/wallet/balance'); assert.equal(calls[1].init?.cache, 'no-store');
  assert.equal(calls[1].init?.credentials, 'omit'); assert.equal(calls[1].init?.body, undefined);
  assert.equal(new Headers(calls[1].init?.headers).get('authorization'), 'Bearer fixture-token');
  clock = 3600001; await assert.rejects(client.balance(), /sign_in_required/);
  await client.signIn('fixture@example.test', 'fixture-password'); client.signOut();
  await assert.rejects(client.balance(), /sign_in_required/);
  await assert.rejects(walletClient(config, network).balance(), /sign_in_required/);
});
test('late balance after sign-out is discarded and unauthorized response clears session', async () => {
  let release!: (response: Response) => void;
  const network: typeof fetch = async url => String(url).startsWith(config.issuer) ? auth() : new Promise(resolve => { release = resolve; });
  const client = walletClient(config, network);
  await client.signIn('fixture@example.test', 'fixture-password');
  const result = client.balance(); client.signOut(); release(Response.json({ available: 50, held: 0 }));
  await assert.rejects(result, /session_changed/);
  let count = 0;
  const denied = walletClient(config, async url => { count++; return String(url).startsWith(config.issuer) ? auth() : Response.json({}, { status: 401 }); });
  await denied.signIn('fixture@example.test', 'fixture-password'); await assert.rejects(denied.balance(), /sign_in_required/);
  await assert.rejects(denied.balance(), /sign_in_required/); assert.equal(count, 2);
});
test('invalid balances and oversized responses are not displayed', async () => {
  for (const body of [{ available: -1, held: 0 }, { available: 0.5, held: 0 }, { available: 0, held: '0' }]) {
    const client = walletClient(config, async url => String(url).startsWith(config.issuer) ? auth() : Response.json(body));
    await client.signIn('fixture@example.test', 'fixture-password'); await assert.rejects(client.balance(), /wallet_unavailable/);
  }
  const client = walletClient(config, async () => new Response('x'.repeat(65537)));
  await assert.rejects(client.signIn('fixture@example.test', 'fixture-password'), /invalid_response/);
});
test('sign-out during login and expiry during a delayed read cannot restore or expose a session', async () => {
  let release!: (response: Response) => void;
  const client = walletClient(config, async () => new Promise(resolve => { release = resolve; }));
  const login = client.signIn('fixture@example.test', 'fixture-password'); client.signOut(); release(auth());
  await assert.rejects(login, /session_changed/); await assert.rejects(client.balance(), /sign_in_required/);
  let clock = 0;
  const expires = walletClient(config, async url => String(url).startsWith(config.issuer) ? auth() : new Promise(resolve => { release = resolve; }), () => clock);
  await expires.signIn('fixture@example.test', 'fixture-password');
  const balance = expires.balance(); clock = 3600001; release(Response.json({ available: 50, held: 0 }));
  await assert.rejects(balance, /sign_in_required/);
});
