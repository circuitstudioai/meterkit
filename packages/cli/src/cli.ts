#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { BRAND } from "@meterkit/config";
import { scanRepo } from "./scan";
import { applyWrapHelpers, planTransforms } from "./transform";
import { assertNotWritingMain, createWorkBranch, currentBranch, printPrBody } from "./git";

export type CliOptions = {
  root: string;
  apply: boolean;
  gemini: boolean;
  features: string[];
  branch?: string;
};

export function parseArgs(argv: string[]): CliOptions {
  const apply = argv.includes("--apply");
  const gemini = argv.includes("--gemini");
  const branchFlag = argv.find((a) => a.startsWith("--branch="));
  const features = argv
    .filter((a) => a.startsWith("--feature="))
    .map((a) => a.slice("--feature=".length));
  const positional = argv.find((a) => !a.startsWith("-") && a !== "init");
  return {
    root: path.resolve(positional || process.cwd()),
    apply,
    gemini,
    features,
    branch: branchFlag?.split("=")[1],
  };
}

export function runInit(opts: CliOptions): {
  calls: ReturnType<typeof scanRepo>;
  changes: ReturnType<typeof planTransforms>;
  prBody: string;
  branch?: string;
} {
  const calls = scanRepo(opts.root, opts.features);
  const changes = planTransforms(opts.root, calls);

  for (const change of changes) {
    if (change.file.endsWith(".ts") || change.file.endsWith(".tsx")) {
      const first = calls.find((c) => c.file === change.file);
      if (first && change.after) {
        change.after = applyWrapHelpers(change.after || change.before, first.featureKey);
      }
    }
  }

  if (opts.gemini) {
    console.log(
      `${BRAND.name}: Gemini-assisted mode is optional. Deterministic AST transforms were used; review any leftover ambiguous sites in the plan.`
    );
  }

  console.log(`\n${BRAND.name} plan (${opts.apply ? "APPLY" : "dry-run"})\n`);
  if (calls.length === 0) {
    console.log("No OpenAI / Gemini / Anthropic call sites found.");
  }
  for (const call of calls) {
    console.log(`- ${call.file}:${call.line} [${call.provider}] ${call.featureKey}`);
  }
  console.log("\nFiles that would change:");
  for (const change of changes) {
    console.log(`- ${change.file}`);
  }

  const prBody = printPrBody(calls);
  let branch: string | undefined;

  if (opts.apply) {
    if (currentBranch(opts.root) === "main" || currentBranch(opts.root) === "master") {
      branch = createWorkBranch(opts.root, opts.branch);
    }
    assertNotWritingMain(opts.root);
    for (const change of changes) {
      const abs = path.join(opts.root, change.file);
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      const base = fs.existsSync(abs) ? fs.readFileSync(abs, "utf8") : change.before;
      const next =
        change.file.endsWith(".ts") || change.file.endsWith(".tsx")
          ? applyWrapHelpers(base || change.after, calls[0]?.featureKey || "chat.message")
          : change.after || base;
      fs.writeFileSync(abs, next.endsWith("\n") ? next : next + "\n");
    }
    console.log(`\nWrote ${changes.length} files on branch ${currentBranch(opts.root)}.`);
    console.log("\n--- PR body ---\n" + prBody);
  } else {
    console.log("\nDry-run only. Re-run with --apply to write a new branch (never main).");
  }

  return { calls, changes, prBody, branch };
}

if (process.argv[1] && process.argv[1].includes("cli")) {
  const cmd = process.argv[2];
  if (cmd !== "init") {
    console.log(`Usage: npx ${BRAND.cliBin} init [--apply] [--gemini] [--feature=key] [path]`);
    process.exit(cmd ? 1 : 0);
  }
  runInit(parseArgs(process.argv.slice(3)));
}
