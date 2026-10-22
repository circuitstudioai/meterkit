import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { makePlan, applyPlan } from "./alpha.mjs";
const policy = {
  version: 1,
  mode: "sandbox",
  feature: "savings.explanation",
  credits: 5,
  packs: [{ id: "demo", credits: 50, amountMinor: 100, currency: "USD" }],
};
function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "meterkit-installer-"));
  fs.mkdirSync(path.join(root, "src/lib"), { recursive: true });
  fs.writeFileSync(
    path.join(root, "package.json"),
    JSON.stringify({
      dependencies: {
        vite: "fixture",
        react: "fixture",
        "@supabase/supabase-js": "fixture",
      },
    }),
  );
  fs.writeFileSync(
    path.join(root, "src/main.tsx"),
    "import VisibilityApp from './VisibilityApp'\nconst app = <VisibilityApp />\n",
  );
  fs.writeFileSync(
    path.join(root, "src/lib/supabase.ts"),
    "export const supabase = null",
  );
  fs.writeFileSync(path.join(root, ".env.example"), "PRESERVE_THIS=\n");
  execFileSync("git", ["init", "-b", "main"], { cwd: root, stdio: "ignore" });
  execFileSync("git", ["add", "."], { cwd: root });
  execFileSync(
    "git",
    [
      "-c",
      "user.name=Fixture",
      "-c",
      "user.email=fixture@example.test",
      "commit",
      "-m",
      "fixture",
    ],
    { cwd: root, stdio: "ignore" },
  );
  return root;
}
test("dry-run unchanged; exact approved plan creates branch and preserves env", async () => {
  const root = fixture();
  const p = await makePlan(root, policy);
  assert.equal(
    execFileSync("git", ["status", "--porcelain"], {
      cwd: root,
      encoding: "utf8",
    }),
    "",
  );
  assert.throws(() => applyPlan(root, p, "wrong"));
  const applied = applyPlan(root, p, p.approvalHash);
  assert.ok(applied.branch.startsWith("meterkit/"));
  assert.equal(
    fs.readFileSync(path.join(root, ".env.example"), "utf8"),
    "PRESERVE_THIS=\n",
  );
  assert.match(
    fs.readFileSync(path.join(root, "src/main.tsx"), "utf8"),
    /VITE_METERKIT_ALPHA_ENABLED/,
  );
});
test("stale or tampered plans and unknown stacks refuse edits", async () => {
  const root = fixture();
  const p = await makePlan(root, policy);
  fs.appendFileSync(path.join(root, "src/main.tsx"), "// changed");
  assert.throws(() => applyPlan(root, p, p.approvalHash), /Source changed/);
  p.files[1].content = "unreviewed";
  assert.throws(() => applyPlan(root, p, p.approvalHash), /exact plan/);
  await assert.rejects(() => makePlan(root, { ...policy, credits: NaN }));
});
test("real AI call receives allowlisted metadata only; absent key is an error", async () => {
  const root = fixture();
  await assert.rejects(
    () => makePlan(root, policy, { ai: true, key: "" }),
    /GEMINI_API_KEY/,
  );
  let sent;
  const p = await makePlan(root, policy, {
    ai: true,
    key: "fixture-secret",
    fetcher: async (_url, options) => {
      sent = JSON.parse(options.body);
      return Response.json({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    summary: "Review complete",
                    risks: ["Real sandbox proof pending"],
                  }),
                },
              ],
            },
          },
        ],
      });
    },
  });
  assert.equal(p.ai.provider, "gemini");
  assert.ok(!JSON.stringify(sent).includes("fixture-secret"));
  assert.ok(!JSON.stringify(sent).includes("PRESERVE_THIS"));
});
