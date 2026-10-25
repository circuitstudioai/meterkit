/** Actual local production-browser lifecycle; all Auth/balance replies are HTTP fixtures. */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
if (!process.env.METERKIT_PLAYWRIGHT_PATH) throw Error('METERKIT_PLAYWRIGHT_PATH required');
const { chromium, expect } = await import(pathToFileURL(process.env.METERKIT_PLAYWRIGHT_PATH));
const base = 'http://127.0.0.1:43130', issuer = 'https://wallet-auth.example';
const checks = []; let server, browser;
async function stop() {
  if (!server || server.exitCode !== null) return;
  const exit = once(server, 'exit'); server.kill('SIGTERM'); await exit;
}
async function start(enabled) {
  server = spawn(process.execPath, ['../../node_modules/next/dist/bin/next', 'start', '-H', '127.0.0.1', '-p', '43130'], {
    cwd: new URL('../apps/dashboard/', import.meta.url), stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, METERKIT_WALLET_READ_ENABLED: String(enabled), METERKIT_WALLET_ORIGIN: base,
      METERKIT_CHAT_SUPABASE_URL: issuer, METERKIT_CHAT_SUPABASE_ANON_KEY: 'fixture-public', METERKIT_CHAT_APP_ID: 'wallet-fixture',
      DATABASE_URL: 'postgres://fixture:fixture@127.0.0.1:1/never_connect', METERKIT_ALPHA_ENABLED: 'false' },
  });
  await new Promise((resolve, reject) => {
    let log = ''; const timer = setTimeout(() => reject(Error('Local server startup timed out')), 20000);
    const chunk = data => { log += data; if (log.includes('Ready in')) { clearTimeout(timer); resolve(); } };
    server.stdout.on('data', chunk); server.stderr.on('data', chunk);
    server.once('exit', () => { clearTimeout(timer); reject(Error('Local server exited')); });
  });
}
async function login(page, email = 'a@example.test') {
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill('fixture-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your sandbox credits' })).toBeVisible();
}
try {
  await start(false); browser = await chromium.launch({ headless: true });
  const page = await browser.newPage(); const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(base + '/wallet');
  await expect(page.getByRole('heading', { name: 'Alpha wallet is unavailable' })).toBeVisible();
  assert.equal(await page.locator('input,button').count(), 0);
  for (const method of ['GET', 'POST', 'OPTIONS']) {
    const response = await page.request.fetch(base + '/api/wallet/balance', { method });
    assert.equal(response.status(), 503); assert.equal(response.headers()['cache-control'], 'no-store');
  }
  checks.push('default runtime offers no sign-in controls; unconfigured GET/POST/OPTIONS refuse with no-store');
  await stop(); await start(true);
  // Actual enabled server refuses missing/invalid session and all mutations; no DB is contacted.
  assert.equal((await page.request.get(base + '/api/wallet/balance')).status(), 401);
  assert.equal((await page.request.post(base + '/api/wallet/balance')).status(), 405);
  assert.equal((await page.request.get(base + '/api/wallet/balance?workspaceId=other')).status(), 400);
  assert.equal((await page.request.get(base + '/api/wallet/balance', { headers: { origin: 'https://foreign.example' } })).status(), 403);
  checks.push('compiled enabled API rejects no session, mutations, wallet selector and foreign origin before database access');
  let who = 'a', deny = false, balanceCalls = 0;
  await page.route('**/*', route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin === issuer) {
      assert.equal(url.pathname, '/auth/v1/token'); who = JSON.parse(request.postData()).email.startsWith('b@') ? 'b' : 'a';
      return route.fulfill({ json: { access_token: 'fixture-token-' + who, expires_in: 3600, refresh_token: 'never-store' } });
    }
    if (url.origin !== base) throw Error('Unexpected external browser request');
    if (url.pathname === '/api/wallet/balance') {
      balanceCalls++; assert.equal(url.search, ''); assert.equal(request.method(), 'GET');
      assert.equal(request.headers().authorization, 'Bearer fixture-token-' + who);
      return route.fulfill({ status: deny ? 401 : 200, json: deny ? { error: 'unauthorized' } : { available: who === 'a' ? 50 : 0, held: who === 'a' ? 5 : 0 } });
    }
    return route.continue();
  });
  await page.goto(base + '/wallet'); await login(page);
  const balance = page.getByRole('region', { name: 'Verified wallet balance' });
  await expect(balance).toContainText('50'); await expect(balance).toContainText('5');
  const storage = await page.evaluate(() => JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } }));
  for (const secret of ['fixture-token', 'fixture-password', 'never-store']) assert.ok(!storage.includes(secret));
  assert.equal(await page.locator('input[type=password]').count(), 0);
  checks.push('fixture sign-in shows available/held alpha credits; no passwords/tokens/refresh tokens in browser storage or rendered form');
  const before = balanceCalls; await page.reload();
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();
  assert.equal(await balance.count(), 0); assert.equal(balanceCalls, before);
  await login(page, 'b@example.test'); await expect(balance).toContainText('0'); await expect(balance).not.toContainText('50');
  checks.push('actual reload signs out without automatic balance request; second account never sees previous balance');
  deny = true; await page.getByRole('button', { name: 'Refresh balance' }).click();
  await expect(page.getByRole('region', { name: 'Read-only alpha wallet' }).getByRole('alert')).toContainText('Sign in again'); assert.equal(await balance.count(), 0);
  checks.push('401 on refresh clears displayed balance and memory session');
  deny = false; await login(page); await page.getByRole('button', { name: 'Sign out locally' }).click();
  assert.equal(await balance.count(), 0);
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  assert.deepEqual(errors, []);
  checks.push('local sign-out clears view; mobile layout has no horizontal overflow; no browser exceptions');
  const evidence = { observedAt: new Date().toISOString(), evidence: 'Local production build + fixture-only Auth/balance browser replies; no hosted Auth, payment, model or deployment acceptance.', checks };
  await fs.mkdir(new URL('../docs/alpha-evidence/wallet/', import.meta.url), { recursive: true });
  await fs.writeFile(new URL('../docs/alpha-evidence/wallet/results.json', import.meta.url), JSON.stringify(evidence, null, 2) + '\n');
  console.log(JSON.stringify(evidence, null, 2));
} finally { await browser?.close(); await stop(); }
