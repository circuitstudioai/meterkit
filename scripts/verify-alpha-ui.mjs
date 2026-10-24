/** Browser proof: provider/auth fixtures, real local Postgres. Never a live sandbox receipt. */
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
const modulePath = process.env.METERKIT_PLAYWRIGHT_PATH;
if (!modulePath)
  throw new Error(
    "Set METERKIT_PLAYWRIGHT_PATH to installed @playwright/test/index.mjs",
  );
const { chromium } = await import(pathToFileURL(modulePath));
const browser = await chromium.launch({ headless: true });
const checks = [];
const out = path.resolve("docs/alpha-evidence");
await fs.mkdir(out, { recursive: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
await page.addInitScript(() => {
  localStorage.setItem(
    "sb-fixture-auth-token",
    JSON.stringify({
      access_token: "fixture-session-token",
      refresh_token: "fixture-refresh",
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      expires_in: 3600,
      token_type: "bearer",
      user: {
        id: "fixture-user",
        aud: "authenticated",
        role: "authenticated",
        email: "fixture@example.test",
      },
    }),
  );
});
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.route("https://fixture.supabase.co/**", (route) =>
  route.fulfill({
    json: { id: "fixture-user", aud: "authenticated", role: "authenticated" },
  }),
);
await page.route("https://www.sandbox.paypal.com/checkoutnow**", (route) =>
  route.fulfill({
    contentType: "text/html",
    body: '<!doctype html><title>SIMULATED approval</title><h1>PayPal HTTP fixture — not a real payment</h1><a href="http://127.0.0.1:43128/meterkit-alpha?token=fixture-order">Approve fixture</a>',
  }),
);
const assert = (condition, label) => {
  if (!condition) throw new Error(label);
  checks.push(label);
};
try {
  await page.goto("http://127.0.0.1:43128/meterkit-alpha");
  await page
    .getByRole("heading", {
      name: "A clear explanation. A visible credit trail.",
    })
    .waitFor();
  await page
    .getByLabel("Workspace ID", { exact: true })
    .fill("fixture-workspace");
  await page.getByLabel("Savings comparison ID").fill("fixture-failure");
  await page
    .getByRole("button", { name: "Check balance", exact: true })
    .click();
  await page
    .getByRole("status")
    .filter({ hasText: "Balance loaded" })
    .waitFor();
  assert(
    await page
      .getByRole("button", { name: "Generate or retrieve explanation" })
      .isDisabled(),
    "zero balance disables new generation",
  );
  await page
    .getByRole("button", { name: "Add credits with PayPal sandbox" })
    .click();
  await page.getByRole("link", { name: "Approve fixture" }).click();
  await page.getByRole("button", { name: "Confirm approved top-up" }).click();
  await page
    .getByRole("status")
    .filter({ hasText: "Sandbox payment verified" })
    .waitFor();
  assert(
    true,
    "simulated PayPal create/approval/capture funds real Postgres wallet",
  );
  await page
    .getByRole("button", { name: "Generate or retrieve explanation" })
    .click();
  await page.getByRole("status").filter({ hasText: "work_failed" }).waitFor();
  await page
    .getByRole("button", { name: "Check balance", exact: true })
    .click();
  await page
    .getByRole("status")
    .filter({ hasText: "Balance loaded" })
    .waitFor();
  assert(
    (await page.locator(".mk-balance strong").textContent()) === "5",
    "confirmed provider failure releases reservation",
  );
  await page.getByLabel("Savings comparison ID").fill("fixture-record");
  await page
    .getByRole("button", { name: "Generate or retrieve explanation" })
    .click();
  await page.getByRole("heading", { name: "Your saved explanation" }).waitFor();
  assert(
    (await page.locator(".mk-balance strong").textContent()) === "0",
    "completed explanation settles exactly five credits",
  );
  await page
    .getByRole("button", { name: "Generate or retrieve explanation" })
    .click();
  await page
    .getByRole("status")
    .filter({ hasText: "Repeating this request will not charge again" })
    .waitFor();
  assert(
    (await page.locator(".mk-balance strong").textContent()) === "0",
    "retry returns stored explanation without another debit",
  );
  await page.evaluate(() => {
    const note = document.createElement("p");
    note.textContent =
      "AUTOMATED TEST: auth, PayPal and AI fixtures · real local Postgres";
    note.style.cssText =
      "padding:12px;background:#ffebba;color:#302812;text-align:center";
    document.body.prepend(note);
  });
  await page.screenshot({
    path: path.join(out, "desktop-fixture.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    "mobile page has no horizontal overflow",
  );
  await page.screenshot({
    path: path.join(out, "mobile-fixture.png"),
    fullPage: true,
  });
  await page.getByLabel("Savings comparison ID").fill("another-record");
  await page
    .getByRole("button", { name: "Check balance", exact: true })
    .click();
  await page
    .getByRole("status")
    .filter({ hasText: "Balance loaded" })
    .waitFor();
  assert(
    await page
      .getByRole("button", { name: "Generate or retrieve explanation" })
      .isDisabled(),
    "new work blocked after balance reaches zero",
  );
  assert(errors.length === 0, "no browser page errors");
  await fs.writeFile(
    path.join(out, "browser-fixture-results.json"),
    JSON.stringify(
      {
        evidence: "Fixture-only PayPal/model/auth; real local Postgres",
        checks,
        errors,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(JSON.stringify({ passed: checks.length, checks }, null, 2));
} finally {
  await browser.close();
}
