import { execSync } from "node:child_process";
import { BRAND } from "@meterkit/config";

export function currentBranch(cwd: string): string {
  return execSync("git rev-parse --abbrev-ref HEAD", { cwd }).toString().trim();
}

export function assertNotWritingMain(cwd: string): void {
  const branch = currentBranch(cwd);
  if (branch === "main" || branch === "master") {
    throw new Error(
      `${BRAND.cliBin} refuses to edit ${branch}. Re-run with a new branch (the CLI creates one when you pass --apply).`
    );
  }
}

export function createWorkBranch(cwd: string, name?: string): string {
  const branch = name || `${BRAND.slug}/init-${Date.now()}`;
  execSync(`git checkout -b ${branch}`, { cwd, stdio: "inherit" });
  return branch;
}

export function printPrBody(calls: { file: string; featureKey: string }[]): string {
  const body = [
    `## ${BRAND.name} init`,
    "",
    BRAND.tagline,
    "",
    "This branch only. The CLI never writes to main.",
    "",
    "### Detected metered call sites",
    ...calls.map((c) => `- \`${c.file}\` → \`${c.featureKey}\``),
    "",
    "### Notes",
    "- Ledger math is deterministic. The model does not decide prices.",
    "- " + BRAND.settlementNote,
  ].join("\n");
  return body;
}
