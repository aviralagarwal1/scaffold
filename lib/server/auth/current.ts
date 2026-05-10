import { eq } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { getDb } from "@/lib/server/db";
import { users } from "@/lib/server/db/schema";
import { AppError } from "@/lib/server/errors";
import { authOptions } from "./options";

export async function getCurrentUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return null;

  const [row] = await getDb()
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return row?.id ?? null;
}

export async function requireCurrentUserId(): Promise<string> {
  const userId = await getCurrentUserId();
  if (!userId) throw new AppError("Sign in to continue.", 401);
  return userId;
}
