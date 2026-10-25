// Local disposable reference installation only. Never reads credentials or activates gates.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import { makePlan, applyPlan } from '../packages/cli/src/alpha.mjs';
const repository = fs.realpathSync(new URL('../', import.meta.url));
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'meterkit-public-build-'));
const run = (command, args) => execFileSync(command, args, { cwd: root, stdio: 'inherit', env: cleanEnv });
const cleanEnv = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^(?:METERKIT_|DATABASE_URL$|PAYPAL_|GEMINI_|NEXT_PUBLIC_|SUPABASE_)/.test(key)));
let server;
try {
  fs.cpSync(path.join(repository, 'examples/chatbot'), root, { recursive: true,
    filter: source => !/(?:^|\/)(?:node_modules|\.next|\.git)(?:\/|$)|(?:^|\/)\.env(?:\.|$)|tsbuildinfo$/.test(source) });
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json')));
  pkg.dependencies.postgres = '^3.4.9';
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify(pkg, null, 2) + '\n');
  fs.writeFileSync(path.join(root, '.gitignore'), 'node_modules\n.next\n*.tsbuildinfo\n.env*\n');
  fs.writeFileSync(path.join(root, '.env.example'), 'PRESERVED_EXAMPLE=\n');
  // Explicit local fixture preparation, not an installer action. Registry/cache install runs no lifecycle scripts.
  run('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund']);
  run('git', ['init', '-b', 'main']);
  run('git', ['add', '.']);
  run('git', ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', 'commit', '-m', 'Disposable standalone reference']);
  const policy = { version: 1, mode: 'sandbox', feature: 'chat.reply', credits: 5,
    packs: [{ id: 'sandbox-50', credits: 50, amountMinor: 100, currency: 'USD' }] };
  const plan = await makePlan(root, policy, { ai: false });
  assert.equal(execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }), '');
  const applied = applyPlan(root, plan, plan.approvalHash);
  assert.equal(fs.readFileSync(path.join(root, '.env.example'), 'utf8'), 'PRESERVED_EXAMPLE=\n');
  // Webpack build is explicit to keep this verification independent of Turbopack workspace discovery.
  run('npm', ['run', 'build', '--', '--webpack']);
  server = spawn(process.execPath, [path.join(root, 'node_modules/next/dist/bin/next'), 'start', '-H', '127.0.0.1', '-p', '43127'], { cwd: root, env: cleanEnv, stdio: ['ignore', 'pipe', 'pipe'] });
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Local server readiness timeout')), 30000);
    server.once('error', error => { clearTimeout(timeout); reject(error); });
    server.once('exit', code => { clearTimeout(timeout); reject(new Error(`Local server exited: ${code}`)); });
    server.stdout.on('data', data => { if (data.toString().includes('Ready')) { clearTimeout(timeout); resolve(); } });
    server.stderr.on('data', data => process.stderr.write(data));
  });
  const base = 'http://127.0.0.1:43127';
  const home = await fetch(base);
  assert.equal(home.status, 200);
  assert.match(await home.text(), /Sandbox chat is unavailable/);
  let retiredChecks = 0;
  for (const endpoint of ['chat', 'export']) for (const method of ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD']) {
    const response = await fetch(`${base}/api/${endpoint}`, { method });
    assert.equal(response.status, 410, `${method} ${endpoint}`);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    retiredChecks++;
  }
  for (const method of ['GET', 'POST', 'OPTIONS']) {
    const response = await fetch(`${base}/api/alpha/balance`, { method });
    assert.equal(response.status, 503);
    assert.equal(response.headers.get('cache-control'), 'no-store');
  }
  const evidence = { label: 'Disposable standalone reference; no hosted Auth/payment/model acceptance',
    adapter: plan.adapter, approvalHash: plan.approvalHash, files: applied.files,
    build: 'PASS npm run build -- --webpack (Next TypeScript included)',
    http: { unavailableHome: true, retiredRoutes: retiredChecks, disabledAlphaMethods: 3 },
    realAIPlanning: false, environmentActivated: false, checkedAt: new Date().toISOString() };
  const evidenceDir = path.join(repository, 'docs/alpha-evidence/public-installer');
  fs.mkdirSync(evidenceDir, { recursive: true });
  fs.writeFileSync(path.join(evidenceDir, 'results.json'), JSON.stringify(evidence, null, 2) + '\n');
  console.log(JSON.stringify(evidence, null, 2));
} finally {
  if (server && server.exitCode === null) {
    const stopped = new Promise(resolve => server.once('exit', resolve));
    server.kill('SIGTERM');
    await stopped;
  }
  fs.rmSync(root, { recursive: true, force: true });
}
