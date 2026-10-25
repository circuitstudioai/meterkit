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
    "import { createClient } from '@supabase/supabase-js'; export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)",
  );
  fs.mkdirSync(path.join(root, "supabase/migrations"), { recursive: true });
  fs.writeFileSync(
    path.join(root, "supabase/migrations/fixture.sql"),
    "-- API-presence fixture only, not real auth proof: public.can_edit_workspace public.workspace_feature_access public.savings_cases public.workspace_members",
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
test("AI request contract sends only allowlisted metadata; absent key is an error", async () => {
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
test("unsupported auth and absent server permission contracts require clarification", async () => {
  const root = fixture();
  const auth = fs.readFileSync(path.join(root, "src/lib/supabase.ts"), "utf8");
  fs.writeFileSync(
    path.join(root, "src/lib/supabase.ts"),
    "export const supabase = null",
  );
  await assert.rejects(() => makePlan(root, policy), /auth mapping/);
  fs.writeFileSync(path.join(root, "src/lib/supabase.ts"), auth);
  fs.writeFileSync(
    path.join(root, "supabase/migrations/fixture.sql"),
    "-- unsupported schema",
  );
  await assert.rejects(() => makePlan(root, policy), /permission contracts/);
});

// Different invalid UTF-8 bytes decode identically. A source-bound installer
// must still reject a committed asset change after the plan was reviewed.
test("binary asset changes invalidate a reviewed plan even in a clean target", async () => {
  const root = fixture();
  try {
    const asset = path.join(root, "src/asset.bin");
    fs.writeFileSync(asset, Buffer.from([0x80]));
    const commit = () => {
      execFileSync("git", ["add", "."], { cwd: root });
      execFileSync(
        "git",
        ["-c", "user.name=Fixture", "-c", "user.email=fixture@example.test", "commit", "-m", "asset"],
        { cwd: root, stdio: "ignore" },
      );
    };
    commit();
    const plan = await makePlan(root, policy);
    fs.writeFileSync(asset, Buffer.from([0x81]));
    commit();
    assert.throws(() => applyPlan(root, plan, plan.approvalHash), /Source changed/);
    assert.equal(
      execFileSync("git", ["branch", "--show-current"], { cwd: root, encoding: "utf8" }).trim(),
      "main",
    );
    assert.equal(
      execFileSync("git", ["status", "--porcelain"], { cwd: root, encoding: "utf8" }),
      "",
    );
    assert.ok(!fs.existsSync(path.join(root, "src/meterkit-alpha")));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

// Ignored dangling links do not appear in git status or existsSync, but a write
// would follow them and create a file outside the reviewed target.
test("ignored dangling output symlink cannot escape the target", async () => {
  const root = fixture();
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), "meterkit-outside-"));
  try {
    fs.appendFileSync(path.join(root, ".git/info/exclude"), "\nsrc/meterkit-alpha/\n");
    fs.mkdirSync(path.join(root, "src/meterkit-alpha"));
    const escaped = path.join(outside, "not-approved.tsx");
    fs.symlinkSync(escaped, path.join(root, "src/meterkit-alpha/MeterKitAlpha.tsx"));
    const plan = await makePlan(root, policy);
    assert.throws(() => applyPlan(root, plan, plan.approvalHash), /Refusing overwrite/);
    assert.ok(!fs.existsSync(escaped));
    assert.equal(
      execFileSync("git", ["branch", "--show-current"], { cwd: root, encoding: "utf8" }).trim(),
      "main",
    );
    assert.equal(
      execFileSync("git", ["status", "--porcelain"], { cwd: root, encoding: "utf8" }),
      "",
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
    fs.rmSync(outside, { recursive: true, force: true });
  }
});

const publicPolicy = { ...policy, feature: 'chat.reply', packs: [{ ...policy.packs[0], id: 'sandbox-50' }] };
function publicFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'meterkit-public-installer-'));
  fs.cpSync(new URL('../../../examples/chatbot/', import.meta.url), root, { recursive: true,
    filter: source => !/(?:^|\/)(?:node_modules|\.next|\.git)(?:\/|$)|(?:^|\/)\.env(?:\.|$)|tsbuildinfo$/.test(source) });
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json')));
  pkg.dependencies.postgres = '^3.4.9';
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify(pkg, null, 2));
  fs.writeFileSync(path.join(root, '.gitignore'), 'node_modules\n.next\n*.tsbuildinfo\n.env*\n');
  fs.writeFileSync(path.join(root, '.env.example'), 'PRESERVE_THIS=\n');
  execFileSync('git', ['init', '-b', 'main'], { cwd: root, stdio: 'ignore' });
  execFileSync('git', ['add', '.'], { cwd: root });
  execFileSync('git', ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', 'commit', '-m', 'reference'], { cwd: root, stdio: 'ignore' });
  return root;
}
test('public reference dry-run/apply is source-bound, standalone and disabled', async () => {
  const root = publicFixture();
  try {
    const plan = await makePlan(root, publicPolicy);
    assert.equal(plan.adapter, 'reference-next-public-chat-v1');
    assert.equal(execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }), '');
    assert.ok(plan.files.every(file => !file.content.includes('../../../../../../packages/') && !file.content.includes('from "@meterkit/')));
    assert.throws(() => applyPlan(root, plan, 'wrong'), /exact plan/);
    applyPlan(root, plan, plan.approvalHash);
    assert.equal(fs.readFileSync(path.join(root, '.env.example'), 'utf8'), 'PRESERVE_THIS=\n');
    for (const endpoint of ['chat', 'export']) assert.match(fs.readFileSync(path.join(root, `app/api/${endpoint}/route.ts`), 'utf8'), /status: 410/);
    assert.match(fs.readFileSync(path.join(root, 'lib/ui-config.ts'), 'utf8'), /METERKIT_CHAT_UI_ENABLED !== "true"/);
    assert.ok(fs.existsSync(path.join(root, 'lib/meterkit-billing/schema.sql')));
    for (const file of ['index.ts', 'paypal.ts', 'service.ts', 'user-identity.ts', 'public-chat.ts', 'schema.sql'])
      assert.equal(fs.readFileSync(path.join(root, `lib/meterkit-billing/${file}`), 'utf8'), fs.readFileSync(new URL(`../../billing/src/${file}`, import.meta.url), 'utf8'));
    assert.equal(fs.readFileSync(path.join(root, 'lib/meterkit-billing/LICENSE'), 'utf8'), fs.readFileSync(new URL('../../../LICENSE', import.meta.url), 'utf8'));
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
test('public reference refuses guessed transforms, unknown routes and policy mismatch', async () => {
  const root = publicFixture();
  try {
    await assert.rejects(() => makePlan(root, { ...publicPolicy, credits: 6 }), /exact reviewed/);
    await assert.rejects(() => makePlan(root, { ...publicPolicy, packs: policy.packs }), /exact reviewed/);
    const pkg = fs.readFileSync(path.join(root, 'package.json'), 'utf8');
    fs.writeFileSync(path.join(root, 'package.json'), pkg.replace('^3.4.9', '^3.0.0'));
    await assert.rejects(() => makePlan(root, publicPolicy), /Unsupported public reference stack/);
    fs.writeFileSync(path.join(root, 'package.json'), pkg);
    fs.mkdirSync(path.join(root, 'app/api/unknown'), { recursive: true });
    fs.writeFileSync(path.join(root, 'app/api/unknown/route.ts'), 'unreviewed');
    await assert.rejects(() => makePlan(root, publicPolicy), /Unknown public API/);
    fs.rmSync(path.join(root, 'app/api/unknown'), { recursive: true });
    fs.appendFileSync(path.join(root, 'app/page.tsx'), '// custom app');
    await assert.rejects(() => makePlan(root, publicPolicy), /No guessed overwrite/);
    assert.equal(execFileSync('git', ['branch', '--show-current'], { cwd: root, encoding: 'utf8' }).trim(), 'main');
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
test('public reference stale plan and ignored output collision refuse before branching', async () => {
  const root = publicFixture();
  try {
    const plan = await makePlan(root, publicPolicy);
    fs.writeFileSync(path.join(root, 'new-source.txt'), 'changed');
    assert.throws(() => applyPlan(root, plan, plan.approvalHash), /Source changed/);
    fs.unlinkSync(path.join(root, 'new-source.txt'));
    fs.appendFileSync(path.join(root, '.git/info/exclude'), '\nlib/meterkit-billing/\n');
    fs.mkdirSync(path.join(root, 'lib/meterkit-billing'), { recursive: true });
    fs.writeFileSync(path.join(root, 'lib/meterkit-billing/index.ts'), 'preserve');
    assert.throws(() => applyPlan(root, plan, plan.approvalHash), /Refusing overwrite/);
    assert.equal(execFileSync('git', ['branch', '--show-current'], { cwd: root, encoding: 'utf8' }).trim(), 'main');
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
