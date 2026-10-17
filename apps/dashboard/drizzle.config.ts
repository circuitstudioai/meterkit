import { defineConfig } from "drizzle-kit";

// Use environment variable to determine which config to use
const isProduction = !!process.env.DATABASE_URL;

export default defineConfig(
  isProduction
    ? {
        schema: "./db/schema-postgres.ts",
        out: "./supabase/migrations",
        dialect: "postgresql",
        dbCredentials: {
          url: process.env.DATABASE_URL!,
        },
      }
    : {
        schema: "./db/schema.ts",
        out: "./db/migrations",
        dialect: "sqlite",
        dbCredentials: {
          url: process.env.DATABASE_PATH || "./data/wallet.db",
        },
      }
);
