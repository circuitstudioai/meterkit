import fs from "node:fs";
import { publicChatAdapter, publicChatOutputs } from "./public-chat-target.mjs";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const templates = fileURLToPath(
  new URL("../templates/vite-supabase/", import.meta.url),
);
const hash = (value) =>
  createHash("sha256")
    .update(
      typeof value === "string" || Buffer.isBuffer(value)
        ? value
        : JSON.stringify(value),
    )
    .digest("hex");
const git = (root, ...args) =>
  execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
function policy(input) {
  if (
    !input ||
    input.version !== 1 ||
    input.mode !== "sandbox" ||
    !["savings.explanation", "chat.reply"].includes(input.feature) ||
    !Number.isSafeInteger(input.credits) ||
    input.credits <= 0 ||
    input.credits > 1_000_000 ||
    !Array.isArray(input.packs) ||
    !input.packs.length ||
    input.packs.length > 10
  )
    throw new Error(
      "Specify version=1, sandbox, savings.explanation or chat.reply, positive integer credits and explicit demo packs.",
    );
  for (const p of input.packs)
    if (
      !/^[a-z0-9_-]{1,60}$/.test(p.id) ||
      !Number.isSafeInteger(p.credits) ||
      p.credits <= 0 ||
      !Number.isSafeInteger(p.amountMinor) ||
      p.amountMinor <= 0 ||
      p.amountMinor > 1_000_000 ||
      p.currency !== "USD"
    )
      throw new Error(
        "Invalid pack: explicit positive integer credits/amountMinor, USD and a safe ID are required.",
      );
  if (new Set(input.packs.map((p) => p.id)).size !== input.packs.length)
    throw new Error("Pack IDs must be unique.");
  return {
    version: 1,
    mode: "sandbox",
    feature: input.feature,
    credits: input.credits,
    packs: input.packs.map(({ id, credits, amountMinor, currency }) => ({
      id,
      credits,
      amountMinor,
      currency,
    })),
  };
}
function safeRead(root, relative, encoding = "utf8") {
  const target = path.join(root, relative);
  if (fs.realpathSync(target) !== target)
    throw new Error(`Symlinked source is unsupported: ${relative}`);
  return fs.readFileSync(target, encoding);
}
function snapshot(root) {
  const files = execFileSync(
    "git",
    ["ls-files", "-z", "--cached", "--others", "--exclude-standard"],
    { cwd: root, encoding: "utf8" },
  )
    .split("\0")
    .filter(
      (p) =>
        p &&
        !p.startsWith(".meterkit/") &&
        !p.split("/").some((part) => part.startsWith(".env")),
    )
    .sort();
  return hash(
    files.map((file) => [
      file,
      fs.existsSync(path.join(root, file))
        ? hash(safeRead(root, file, null))
        : "deleted",
    ]),
  );
}
function outputs(root, p) {
  if (p.feature === "chat.reply") return publicChatOutputs(root, p, safeRead);
  const main = safeRead(root, "src/main.tsx");
  if (
    !/^import VisibilityApp from ['"]\.\/VisibilityApp['"]/m.test(main) ||
    main.split("<VisibilityApp />").length !== 2
  )
    throw new Error(
      "Unsupported entry point: alpha supports the inspected Command Center Vite/Supabase entry only. No guessed transform.",
    );
  const ui = fs
    .readFileSync(path.join(templates, "MeterKitAlpha.tsx"), "utf8")
    .replace("__CREDITS__", String(p.credits))
    .replace("__PACK_ID__", p.packs[0].id);
  return [
    {
      path: "src/main.tsx",
      before: hash(main),
      content:
        "import MeterKitAlpha from './meterkit-alpha/MeterKitAlpha'\n" +
        main.replace(
          "<VisibilityApp />",
          "{import.meta.env.VITE_METERKIT_ALPHA_ENABLED === 'true' && window.location.pathname === '/meterkit-alpha' ? <MeterKitAlpha /> : <VisibilityApp />}",
        ),
    },
    { path: "src/meterkit-alpha/MeterKitAlpha.tsx", before: null, content: ui },
    {
      path: "src/meterkit-alpha/meterkit-alpha.css",
      before: null,
      content: fs.readFileSync(
        path.join(templates, "meterkit-alpha.css"),
        "utf8",
      ),
    },
    {
      path: "docs/METERKIT_ALPHA_INTEGRATION.md",
      before: null,
      content:
        "# MeterKit isolated alpha\n\nGenerated from an explicitly reviewed sandbox policy. Disabled by default.\n\nSet VITE_METERKIT_ALPHA_ENABLED=true and VITE_METERKIT_ALPHA_API_URL to the isolated MeterKit server origin only after owner policy approval. Visit /meterkit-alpha. Existing Command Center behavior remains the fallback. Existing Supabase sign-in is reused; no API secrets belong in the browser.\n\nBackend requires a separately approved METERKIT_ALPHA_POLICY, allowlisted workspace, verified Supabase membership/module/role, real Postgres migration, PayPal sandbox app and Gemini data approval. UI installation alone is not end-to-end payment acceptance.\n\nRun npm run build and npm test. Run MeterKit fixed Postgres contracts independently. Do not weaken tests to accept a generated patch. Never activate production billing or alter deterministic Savings calculations.\n\nReviewed demo policy:\n```json\n" +
        JSON.stringify(p, null, 2) +
        "\n```\n",
    },
  ];
}
export async function makePlan(
  root,
  input,
  {
    ai = false,
    fetcher = fetch,
    key = process.env.GEMINI_API_KEY,
    model = process.env.GEMINI_MODEL || "gemini-2.5-flash",
  } = {},
) {
  root = fs.realpathSync(root);
  const p = policy(input);
  const pkg = JSON.parse(safeRead(root, "package.json"));
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  if (p.feature !== "chat.reply") {
    if (!deps.vite || !deps.react || !deps["@supabase/supabase-js"])
      throw new Error("Unsupported stack: Vite + React + Supabase required.");
    if (!fs.existsSync(path.join(root, "src/lib/supabase.ts")))
      throw new Error("Unknown auth mapping. Clarification required.");
    const authSource = safeRead(root, "src/lib/supabase.ts");
    if (
      ![
        "@supabase/supabase-js",
        "createClient",
        "VITE_SUPABASE_URL",
        "VITE_SUPABASE_ANON_KEY",
        "export const supabase",
      ].every((part) => authSource.includes(part))
    )
      throw new Error("Unknown auth mapping. Clarification required.");
    const migrationDir = path.join(root, "supabase/migrations");
    if (!fs.existsSync(migrationDir))
      throw new Error(
        "Missing server permission contracts. Clarification required.",
      );
    const sql = fs
      .readdirSync(migrationDir)
      .filter((file) => file.endsWith(".sql"))
      .map((file) => safeRead(root, `supabase/migrations/${file}`))
      .join("\n")
      .toLowerCase();
    if (
      ![
        "public.can_edit_workspace",
        "public.workspace_feature_access",
        "public.savings_cases",
        "public.workspace_members",
      ].every((name) => sql.includes(name))
    )
      throw new Error(
        "Missing server permission contracts. Clarification required.",
      );
  }
  const plan = {
    version: 1,
    adapter: p.feature === "chat.reply" ? publicChatAdapter : "command-center-vite-supabase-v1",
    source: snapshot(root),
    policy: p,
    files: outputs(root, p),
    acceptance: [
      "npm run build",
      p.feature === "chat.reply" ? "MeterKit public-chat client/config and retired-route contracts" : "npm test",
      "MeterKit real-Postgres fixed acceptance contracts",
    ],
    limits: [
      p.feature === "chat.reply" ? "Exact standalone Next reference only; API/UI disabled; no checkout or production activation" : "Disabled alpha route only; no production activation",
      "Backend credentials, workspace/module approval, real PayPal and AI receipts remain required",
    ],
    ai: null,
  };
  if (ai) {
    if (!key)
      throw new Error(
        "GEMINI_API_KEY required for --ai. No canned AI fallback.",
      );
    if (!/^[a-zA-Z0-9._-]+$/.test(model))
      throw new Error("Invalid Gemini model.");
    // Only allowlisted stack metadata and reviewed policy leave the machine, never source bodies or credentials.
    const response = await fetcher(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
        signal: AbortSignal.timeout(20000),
        body: JSON.stringify({
          systemInstruction: {
            parts: [
              {
                text: "Review this integration plan. Identify risks and missing validation. Do not invent features, prices or file edits. Return JSON with only summary:string and risks:string[].",
              },
            ],
          },
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: JSON.stringify({
                    adapter: plan.adapter,
                    policy: p,
                    paths: plan.files.map((f) => f.path),
                    limits: plan.limits,
                    acceptance: plan.acceptance,
                  }),
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0,
            responseMimeType: "application/json",
            maxOutputTokens: 1000,
          },
        }),
      },
    );
    if (!response.ok)
      throw new Error(
        "AI planning provider failed. No secrets or provider body logged.",
      );
    const data = await response.json();
    let advisory;
    try {
      advisory = JSON.parse(
        data.candidates[0].content.parts.map((p) => p.text || "").join(""),
      );
    } catch {
      throw new Error("AI planning returned malformed JSON.");
    }
    if (
      Object.keys(advisory).sort().join(",") !== "risks,summary" ||
      typeof advisory.summary !== "string" ||
      advisory.summary.length > 4000 ||
      !Array.isArray(advisory.risks) ||
      advisory.risks.length > 20 ||
      advisory.risks.some((r) => typeof r !== "string" || r.length > 1000)
    )
      throw new Error("Invalid AI planning response.");
    plan.ai = { provider: "gemini", model, advisory };
  }
  return { ...plan, approvalHash: hash(plan) };
}
export function applyPlan(root, plan, approvalHash) {
  root = fs.realpathSync(root);
  const { approvalHash: expected, ...content } = plan;
  if (!expected || expected !== approvalHash || hash(content) !== expected)
    throw new Error("Explicit approval of the exact plan hash required.");
  const expectedAdapter = plan.policy?.feature === "chat.reply" ? publicChatAdapter : "command-center-vite-supabase-v1";
  if (plan.adapter !== expectedAdapter || plan.version !== 1)
    throw new Error("Unsupported plan.");
  if (snapshot(root) !== plan.source)
    throw new Error("Source changed since planning. Regenerate and review.");
  const files = outputs(root, policy(plan.policy));
  if (JSON.stringify(files) !== JSON.stringify(plan.files))
    throw new Error("Plan outputs differ from trusted adapter.");
  if (git(root, "status", "--porcelain"))
    throw new Error(
      "Apply requires a clean working tree. Keep plans outside the target repository.",
    );
  for (const file of files) {
    const target = path.join(root, file.path);
    // lstat also sees dangling symlinks: existsSync would follow them and
    // report false, allowing writeFileSync to create an unreviewed outside file.
    if (file.before === null && fs.lstatSync(target, { throwIfNoEntry: false }))
      throw new Error(`Refusing overwrite: ${file.path}`);
    let parent = path.dirname(target);
    while (parent !== root) {
      if (fs.existsSync(parent) && fs.lstatSync(parent).isSymbolicLink())
        throw new Error("Symlinked output directory is unsupported.");
      parent = path.dirname(parent);
    }
  }
  const branch = `meterkit/install-${expected.slice(0, 12)}`;
  git(root, "switch", "-c", branch);
  const written = [];
  try {
    for (const file of files) {
      const target = path.join(root, file.path);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, file.content);
      written.push(file);
    }
  } catch (error) {
    for (const f of written) {
      if (f.before === null) fs.unlinkSync(path.join(root, f.path));
      else git(root, "restore", "--", f.path);
    }
    throw error;
  }
  return {
    branch,
    files: files.map((f) => f.path),
    acceptance: plan.acceptance,
  };
}
async function cli() {
  const args = process.argv.slice(2),
    command = args[0],
    pos = args.slice(1).find((a) => !a.startsWith("--")),
    root = path.resolve(pos || ".");
  const flag = (name) =>
    args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
  if (command === "plan" || command === "init") {
    if (args.includes("--apply"))
      throw new Error(
        "Review plan first, then use apply --plan=... --approve=HASH.",
      );
    const input = flag("policy");
    if (!input)
      throw new Error(
        "Usage: meterkit plan [repo] --policy=FILE --out=FILE [--ai]. Policy must specify demo pricing and packs.",
      );
    const plan = await makePlan(
      root,
      JSON.parse(fs.readFileSync(input, "utf8")),
      { ai: args.includes("--ai") },
    );
    const out = flag("out");
    if (out) {
      if (fs.existsSync(out))
        throw new Error("Plan output already exists; choose a new path.");
      fs.writeFileSync(out, JSON.stringify(plan, null, 2) + "\n");
    }
    process.stdout.write(
      JSON.stringify(
        {
          adapter: plan.adapter,
          files: plan.files.map((f) => f.path),
          limits: plan.limits,
          ai: plan.ai,
          approvalHash: plan.approvalHash,
        },
        null,
        2,
      ) + "\n",
    );
  } else if (command === "apply") {
    const file = flag("plan");
    if (!file) throw new Error("--plan=FILE required");
    process.stdout.write(
      JSON.stringify(
        applyPlan(
          root,
          JSON.parse(fs.readFileSync(file, "utf8")),
          flag("approve"),
        ),
        null,
        2,
      ) + "\n",
    );
  } else
    throw new Error("Usage: meterkit plan | apply. See docs/ALPHA_TESTING.md.");
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  cli().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
