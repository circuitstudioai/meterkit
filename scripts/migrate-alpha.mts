import postgres from "postgres";
import { migrate } from "../packages/billing/src/index";
if (!process.env.DATABASE_URL)
  throw new Error("DATABASE_URL required for the isolated alpha database.");
const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });
try {
  await migrate(sql);
  console.log("MeterKit alpha schema migrated. No application tables changed.");
} finally {
  await sql.end();
}
