#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const require = createRequire(import.meta.url);
const tsx = require.resolve("tsx/cli");
const cli = path.join(path.dirname(fileURLToPath(import.meta.url)), "../src/cli.ts");
const result = spawnSync(process.execPath, [tsx, cli, ...process.argv.slice(2)], {
  stdio: "inherit",
});
process.exit(result.status ?? 1);
