import path from "path";
import fs from "fs";
import * as schemaSqlite from "@/db/schema";
import * as schemaPostgres from "@/db/schema-postgres";
import { env, usePostgres } from "@/lib/env";

export const schema = usePostgres ? schemaPostgres : schemaSqlite;

export const {
  companies,
  users,
  budgetLedger,
  purchaseRequests,
  budgetLimits,
  policyRules,
  auditLog,
} = schema;

/**
 * Drivers are required at runtime only. better-sqlite3 is a native addon
 * and must not load on Vercel when DATABASE_URL (Supabase) is set.
 */
function createDatabase() {
  if (usePostgres && env.databaseUrl) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const postgres = require("postgres") as typeof import("postgres");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { drizzle } = require("drizzle-orm/postgres-js") as typeof import("drizzle-orm/postgres-js");
    const ssl = env.databaseUrl.includes("supabase.co") ? "require" : undefined;
    const client = postgres(env.databaseUrl, {
      max: 1,
      prepare: false,
      ssl,
    });
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
  return drizzle(sqlite, { schema: schemaSqlite });
}

// Drizzle sqlite vs postgres clients differ; query sites use shared column names.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db: any = createDatabase();
