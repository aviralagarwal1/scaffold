import assert from "node:assert/strict";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { assertMigrationHistory, expectedMigrations } from "../scripts/migration-state.mjs";

const expected = expectedMigrations(fileURLToPath(new URL("../drizzle", import.meta.url)));
const applied = expected.map((entry) => ({ created_at: Number(entry.when), hash: entry.hashes[0] }));

test("migration gate accepts matching SQL from LF and CRLF checkouts", () => {
  assertMigrationHistory(expected, applied);
  assertMigrationHistory(expected, expected.map((entry) => ({ created_at: entry.when, hash: entry.hashes[1] })));
});

test("migration gate blocks absent, modified, duplicate, and unexpected migrations", () => {
  assert.throws(() => assertMigrationHistory(expected, applied.slice(0, -1)), /Unapplied/);
  assert.throws(() => assertMigrationHistory(expected, applied.map((row, i) => i ? row : { ...row, hash: "modified" })), /checksum/);
  assert.throws(() => assertMigrationHistory(expected, [...applied, applied[0]]), /duplicate/);
  assert.throws(() => assertMigrationHistory(expected, [...applied, { created_at: 1, hash: "unknown" }]), /ahead/);
});
