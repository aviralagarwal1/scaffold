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
    // Postgres is not optional: auth checks the users table on every request,
    // so there is no reachable path through the app without it.
    throw new Error("DATABASE_URL is not configured. Set it in .env, then run `npm run db:migrate`.");
  }

  if (!globalForDb.scaffoldPostgresClient) {
    globalForDb.scaffoldPostgresClient = postgres(url, { prepare: false });
    globalForDb.scaffoldDb = drizzle(globalForDb.scaffoldPostgresClient, { schema });
  }

  return globalForDb.scaffoldDb!;
}
