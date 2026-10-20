import path from "path";
import fs from "fs";
import * as schemaSqlite from "@/db/schema";
import * as schemaPostgres from "@/db/schema-postgres";
import { env, usePostgres } from "@/lib/env";

export const schema = usePostgres ? schemaPostgres : schemaSqlite;

export const {
  builders,
  apps,
  features,
  endUsers,
  ledgerEntries,
  topups,
  payouts,
  auditLog,
} = schema;

function createDatabase() {
  if (usePostgres && env.databaseUrl) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const postgres = require("postgres") as typeof import("postgres");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { drizzle } = require("drizzle-orm/postgres-js") as typeof import("drizzle-orm/postgres-js");
    const ssl = env.databaseUrl.includes("supabase.co") ? "require" : undefined;
    const client = postgres(env.databaseUrl, { max: 1, prepare: false, ssl });
    return drizzle(client, { schema: schemaPostgres });
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Database = require("better-sqlite3") as typeof import("better-sqlite3");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { drizzle } = require("drizzle-orm/better-sqlite3") as typeof import("drizzle-orm/better-sqlite3");

  const dbPath = env.databasePath;
  const dataDir = path.dirname(path.resolve(dbPath));
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  const hasBuilders = sqlite
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='builders'")
    .get();
  if (!hasBuilders) {
    const sql = fs.readFileSync(path.join(process.cwd(), "db/bootstrap-sqlite.sql"), "utf8");
    sqlite.exec(sql);
  }
  return drizzle(sqlite, { schema: schemaSqlite });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db: any = createDatabase();
