/** Actual browser reload proof against a local production build.
 * ALL Auth, balance and job replies are HTTP fixtures. No database/payment/model proof.
 * Run build first, then set METERKIT_PLAYWRIGHT_PATH to an existing Playwright install.
 */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import fs from "node:fs/promises";
import { pathToFileURL } from "node:url";
const modulePath = process.env.METERKIT_PLAYWRIGHT_PATH;
if (!modulePath) throw new Error("Set METERKIT_PLAYWRIGHT_PATH to installed @playwright/test/index.mjs");
const { chromium, expect } = await import(pathToFileURL(modulePath));
const base = "http://127.0.0.1:43129", issuer = "https://chat-auth.example";
const out = new URL("../docs/alpha-evidence/public-chat/", import.meta.url);
const users = { a: "11111111-1111-4111-8111-111111111111", b: "22222222-2222-4222-8222-222222222222" };
const checks = [], errors = [];
let server, browser;
async function stop() {
  if (!server || server.exitCode !== null) return;
  const exited = once(server, "exit"); server.kill("SIGTERM"); await exited;
}
async function start(enabled) {
  const env = { ...process.env, METERKIT_CHAT_UI_ENABLED: String(enabled), METERKIT_CHAT_ENABLED: String(enabled),
    METERKIT_CHAT_SANDBOX_POLICY_APPROVED: "true", METERKIT_CHAT_DATA_APPROVED: "true",
    METERKIT_CHAT_APP_ID: "browser-fixture", METERKIT_CHAT_ORIGIN: base,
    METERKIT_CHAT_SUPABASE_URL: issuer, METERKIT_CHAT_SUPABASE_ANON_KEY: "fixture-public-anon",
    DATABASE_URL: "postgres://fixture:fixture@127.0.0.1:1/never_connect", GEMINI_API_KEY: "", PAYPAL_CLIENT_SECRET: "" };
  server = spawn(process.execPath, ["../../node_modules/next/dist/bin/next", "start", "-H", "127.0.0.1", "-p", "43129"],
    { cwd: new URL("../examples/chatbot-metered/", import.meta.url), env, stdio: ["ignore", "pipe", "pipe"] });
  let log = "";
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Server startup timed out: ${log}`)), 20000);
    const onData = chunk => { log += chunk; if (log.includes("Ready in")) { clearTimeout(timeout); resolve(); } };
    server.stdout.on("data", onData); server.stderr.on("data", onData);
    server.once("exit", code => { clearTimeout(timeout); reject(new Error(`Server exited ${code}: ${log}`)); });
  });
}
async function initialize(page) {
  await page.getByLabel("I understand pending-prompt retention in this tab.").check();
  await page.getByRole("button", { name: "Continue to sandbox sign-in" }).click();
}
async function login(page, who = "a") {
  await page.getByLabel("Email", { exact: true }).fill(`${who}@example.test`);
  await page.getByLabel("Password", { exact: true }).fill("fixture-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Your sandbox credits" })).toBeVisible();
}
try {
  await start(false);
  browser = await chromium.launch({ headless: true });
  const disabled = await browser.newPage();
  await disabled.goto(base);
  await expect(disabled.getByRole("heading", { name: "Sandbox chat is unavailable" })).toBeVisible();
  assert.equal(await disabled.locator("input, textarea, button").count(), 0);
  assert.equal((await disabled.request.get(`${base}/api/alpha/balance`)).status(), 503);
  checks.push("default production build exposes no sign-in/job controls; API refuses unconfigured activation");
  await disabled.close(); await stop(); await start(true);
  const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
  let calls = [], jobMode = "reserved", available = 50, rejectBalance = false, expiresIn = 3600;
  const fixture = async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin === issuer) {
      assert.equal(url.pathname, "/auth/v1/token");
      const who = JSON.parse(request.postData()).email.startsWith("b@") ? "b" : "a";
      return route.fulfill({ json: { access_token: `fixture-token-${who}`, expires_in: expiresIn,
        refresh_token: "fixture-refresh-never-store", user: { id: users[who] } } });
    }
    if (url.origin !== base) throw new Error(`Unexpected external network: ${url.origin}`);
    if (url.pathname === "/api/alpha/balance") return route.fulfill({ status: rejectBalance ? 401 : 200,
      json: rejectBalance ? { error: "invalid_session" } : { available, held: jobMode === "reserved" && calls.length ? 5 : 0 } });
    if (url.pathname === "/api/alpha/jobs") {
      calls.push({ body: request.postData(), authorization: request.headers().authorization });
      return route.fulfill(jobMode === "reserved" ? { status: 202, json: { status: "reserved" } } :
        jobMode === "released" ? { status: 502, json: { status: "released" } } :
        { json: { status: "completed", result: { text: "Fixture answer <script>never execute</script>" } } });
    }
    return route.continue();
  };
  await context.route("**/*", fixture);
  const page = await context.newPage(); page.on("pageerror", e => errors.push(e.message));
  await page.goto(base);
  await expect(page.getByRole("button", { name: "Continue to sandbox sign-in" })).toBeDisabled();
  await initialize(page); await login(page);
  assert.equal(await page.getByLabel("Password", { exact: true }).count(), 0);
  await page.getByLabel("Prompt", { exact: true }).fill("Synthetic pending prompt");
  await page.getByRole("button", { name: "Send for 5 credits" }).click();
  await expect(page.getByRole("button", { name: "Check pending request" })).toBeEnabled();
  assert.equal(calls.length, 1); const original = calls[0].body;
  const journal = await page.evaluate(() => JSON.stringify({ session: { ...sessionStorage }, local: { ...localStorage } }));
  assert.ok(journal.includes("Synthetic pending prompt"));
  for (const secret of ["fixture-token", "fixture-password", "fixture-refresh"]) assert.ok(!journal.includes(secret));
  checks.push("explicit retention consent; pending journal contains exact input but no credentials");
  await page.reload(); await initialize(page);
  await expect(page.getByRole("heading", { name: "Sign in to your test account" })).toBeVisible();
  assert.ok(!(await page.locator("body").innerText()).includes("Synthetic pending prompt"));
  assert.equal(calls.length, 1);
  await login(page, "b");
  assert.ok(!(await page.locator("body").innerText()).includes("Synthetic pending prompt"));
  assert.equal(await page.getByRole("button", { name: "Check pending request" }).count(), 0);
  assert.equal(await page.getByRole("button", { name: "Send for 5 credits" }).count(), 0);
  assert.equal(calls.length, 1);
  checks.push("real reload signs out; another account cannot see, replace or reconcile original pending input");
  await page.getByRole("button", { name: "Sign out locally" }).click(); await login(page);
  await page.getByText("Review your pending prompt and request").click();
  await expect(page.getByText("Synthetic pending prompt", { exact: true })).toBeVisible();
  jobMode = "completed"; available = 45;
  await page.getByRole("button", { name: "Check pending request" }).click();
  await expect(page.getByRole("heading", { name: "Your answer" })).toBeVisible();
  assert.equal(calls.length, 2); assert.equal(calls[1].body, original);
  assert.equal(calls[1].authorization, "Bearer fixture-token-a");
  const cleared = await page.evaluate(() => sessionStorage.getItem("meterkit:pending-job:v1:browser-fixture"));
  assert.equal(JSON.parse(cleared).pending, null);
  checks.push("original owner explicitly reconciles byte-identical request after reload; confirmed result clears journal");
  await page.getByRole("button", { name: "Sign out locally" }).click();
  assert.equal(await page.getByRole("heading", { name: "Your answer" }).count(), 0);
  available = 0; await login(page);
  await page.getByLabel("Prompt", { exact: true }).fill("No balance");
  await expect(page.getByRole("button", { name: "Send for 5 credits" })).toBeDisabled();
  checks.push("local logout clears answer; verified zero balance blocks new work");
  available = 50; await page.getByRole("button", { name: "Check balance", exact: true }).click();
  await expect(page.getByRole("button", { name: "Send for 5 credits" })).toBeEnabled();
  jobMode = "released";
  await page.getByRole("button", { name: "Send for 5 credits" }).click();
  await expect(page.getByRole("status").filter({ hasText: "confirmed failure" })).toBeVisible();
  assert.equal(await page.getByRole("heading", { name: "A request needs recovery" }).count(), 0);
  checks.push("confirmed failure release clears pending without claiming a completed answer");
  rejectBalance = true;
  await page.getByRole("button", { name: "Check balance", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Sign in to your test account" })).toBeVisible();
  await expect(page.locator("p[role=alert]")).toContainText("session has ended");
  checks.push("401 requires explicit sign-in and hides prior account state");
  rejectBalance = false; await login(page);
  await page.evaluate(() => { const note = document.createElement("p"); note.textContent = "AUTOMATED TEST — Auth, wallet and job HTTP fixtures. Not hosted acceptance."; note.style.cssText = "padding:12px;background:#ffebba;color:#302812;text-align:center"; document.body.prepend(note); });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await fs.mkdir(out, { recursive: true });
  await page.screenshot({ path: new URL("mobile-fixture.png", out).pathname, fullPage: true });
  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.screenshot({ path: new URL("desktop-fixture.png", out).pathname, fullPage: true });
  checks.push("390px mobile layout has no horizontal overflow; desktop/mobile fixture screenshots saved");
  expiresIn = 2; jobMode = "reserved";
  const expiring = await context.newPage();
  await expiring.goto(base); await initialize(expiring); await login(expiring);
  await expiring.getByLabel("Prompt", { exact: true }).fill("Expiry private prompt");
  await expiring.getByRole("button", { name: "Send for 5 credits" }).click();
  await expect(expiring.getByRole("button", { name: "Check pending request" })).toBeEnabled();
  await expect(expiring.getByRole("heading", { name: "Sign in to your test account" })).toBeVisible({ timeout: 6000 });
  assert.ok(!(await expiring.locator("body").innerText()).includes("Expiry private prompt"));
  assert.ok((await expiring.evaluate(() => sessionStorage.getItem("meterkit:pending-job:v1:browser-fixture"))).includes("Expiry private prompt"));
  checks.push("idle session expiry hides private pending content without discarding recoverable work");
  expiresIn = 3600;
  const broken = await context.newPage();
  await broken.addInitScript(() => { Storage.prototype.setItem = () => { throw new Error("fixture storage disabled"); }; });
  await broken.goto(base); await initialize(broken); await login(broken);
  await broken.getByLabel("Prompt", { exact: true }).fill("Must never reach API");
  const countBefore = calls.length;
  await broken.getByRole("button", { name: "Send for 5 credits" }).click();
  await expect(broken.locator("p[role=alert]")).toContainText("Tab recovery is unavailable");
  assert.equal(calls.length, countBefore);
  await expect(broken.getByRole("button", { name: "Check pending request" })).toBeDisabled();
  checks.push("unwritable tab recovery blocks before job network; no memory-only fallback");
  const corrupt = await context.newPage();
  await corrupt.addInitScript(() => sessionStorage.setItem("meterkit:pending-job:v1:browser-fixture", "malformed"));
  await corrupt.goto(base); await initialize(corrupt);
  await expect(corrupt.locator("p[role=alert]")).toContainText("Tab recovery is unavailable");
  assert.equal(await corrupt.getByRole("button", { name: "Sign in", exact: true }).count(), 0);
  assert.equal(await corrupt.evaluate(() => sessionStorage.getItem("meterkit:pending-job:v1:browser-fixture")), "malformed");
  checks.push("malformed recovery fails closed without discarding unknown work");
  assert.deepEqual(errors, []);
  await fs.writeFile(new URL("results.json", out), JSON.stringify({ evidence: "Actual local browser lifecycle; Auth/balance/jobs are HTTP fixtures, NOT hosted acceptance or payment/model evidence", checks, errors }, null, 2) + "\n");
  console.log(JSON.stringify({ passed: checks.length, checks }, null, 2));
} finally { await browser?.close(); await stop(); }
