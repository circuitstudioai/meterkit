import { test } from "node:test";
import assert from "node:assert/strict";
import postgres from "postgres";
import { migrate } from "./index";

test("migration removes API-role access even when older defaults granted it", async () => {
  const url = process.env.METERKIT_TEST_DATABASE_URL;
  if (!url || new URL(url).pathname !== "/meterkit_test")
    throw new Error("dedicated meterkit_test required");
  const sql = postgres(url, { onnotice: () => {} });
  try {
    await sql.unsafe(`do $$ begin
      if not exists(select from pg_roles where rolname='anon') then create role anon; end if;
      if not exists(select from pg_roles where rolname='authenticated') then create role authenticated; end if;
    end $$;`);
    await migrate(sql);
    await sql.unsafe(
      "grant usage on schema meterkit_alpha to anon, authenticated; grant all on all tables in schema meterkit_alpha to anon, authenticated; grant execute on all functions in schema meterkit_alpha to anon, authenticated;",
    );
    await migrate(sql);
    const rows =
      await sql`select r.rolname, has_schema_privilege(r.rolname, 'meterkit_alpha', 'usage') as schema_access,
      has_table_privilege(r.rolname, 'meterkit_alpha.wallets', 'select') as table_access,
      has_function_privilege(r.rolname, 'meterkit_alpha.immutable_entry()', 'execute') as function_access
      from pg_roles r where r.rolname in ('anon','authenticated')`;
    assert.equal(rows.length, 2);
    for (const row of rows)
      assert.deepEqual(
        [row.schema_access, row.table_access, row.function_access],
        [false, false, false],
      );
  } finally {
    await sql.end();
  }
});
