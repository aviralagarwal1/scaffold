import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type PostgresClient = ReturnType<typeof postgres>;
type Database = ReturnType<typeof drizzle>;

const globalForDb = globalThis as typeof globalThis & {
  scaffoldPostgresClient?: PostgresClient;
  scaffoldDb?: Database;
};

export function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not configured.");
  }

  if (!globalForDb.scaffoldPostgresClient) {
    globalForDb.scaffoldPostgresClient = postgres(url, { prepare: false });
    globalForDb.scaffoldDb = drizzle(globalForDb.scaffoldPostgresClient, { schema });
  }

  return globalForDb.scaffoldDb!;
}
