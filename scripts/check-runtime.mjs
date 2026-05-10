// Read-only readiness checks. Never print connection strings or user content.
import postgres from "postgres";
import { fileURLToPath } from "node:url";
import { assertMigrationHistory, expectedMigrations } from "./migration-state.mjs";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
const sql = postgres(process.env.DATABASE_URL, { max: 1, connect_timeout: 10, prepare: false });
try {
  await sql.begin("read only", async (tx) => {
    const [state] = await tx`select pg_column_size(value)::bigint as bytes from app_state where key = 'workspace-store'`;
    const [tables] = await tx`select to_regclass('public.post_notes') as notes, to_regclass('drizzle.__drizzle_migrations') as migrations`;
    const bytes = Number(state?.bytes ?? 0);
    console.log(`Corpus: ${(bytes / 1024 / 1024).toFixed(2)} MiB (review threshold: 25 MiB).`);
    if (bytes >= 25 * 1024 * 1024) throw new Error("Corpus exceeds the measured growth gate.");
    if (!tables.notes || !tables.migrations) throw new Error("Required tables or migration journal are missing.");
    const applied = await tx`select created_at, hash from drizzle.__drizzle_migrations`;
    const expected = expectedMigrations(fileURLToPath(new URL("../drizzle", import.meta.url)));
    assertMigrationHistory(expected, applied);
    // A journal entry alone cannot prove the table was not subsequently changed.
    await tx`select id, workspace_id, post_id, quote, prefix, suffix, body, created_at, updated_at from post_notes limit 0`;
    console.log(`Database: Notes columns present; all ${expected.length} migration checksums verified.`);
  });
} catch (error) {
  // Driver errors may include connection details; keep operational output narrow.
  console.error(error instanceof Error && /^(Corpus exceeds|Required tables|Unapplied|Migration (checksum|history))/.test(error.message) ? error.message : "Database readiness check failed. Check connectivity and migration state.");
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 2 });
}
