import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export function expectedMigrations(directory) {
  const journal = JSON.parse(readFileSync(join(directory, "meta/_journal.json"), "utf8"));
  return journal.entries.map(({ tag, when }) => {
    // Historical migrations ran from Windows checkouts; GitHub checks out LF.
    // Accept either line ending, but never a change to the SQL itself.
    const sql = readFileSync(join(directory, `${tag}.sql`), "utf8").replaceAll("\r\n", "\n");
    const hashes = [sql, sql.replaceAll("\n", "\r\n")]
      .map((text) => createHash("sha256").update(text).digest("hex"));
    return { tag, when: String(when), hashes };
  });
}

export function assertMigrationHistory(expected, applied) {
  const rows = new Map();
  for (const row of applied) {
    const when = String(row.created_at);
    if (rows.has(when)) throw new Error("Migration history contains duplicate entries.");
    rows.set(when, row.hash);
  }
  for (const migration of expected) {
    if (!rows.has(migration.when)) throw new Error(`Unapplied migration: ${migration.tag}`);
    if (!migration.hashes.includes(rows.get(migration.when))) throw new Error(`Migration checksum differs: ${migration.tag}`);
  }
  if (rows.size !== expected.length) throw new Error("Migration history is ahead of this release.");
}
