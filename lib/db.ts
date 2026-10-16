import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "@/db/schema";
import path from "path";

const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), "data", "wallet.db");

// Ensure data directory exists
import fs from "fs";
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");

export const db = drizzle(sqlite, { schema });
