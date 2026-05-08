import { eq } from "drizzle-orm";
import { getDb } from "@/lib/server/db";
import { profiles, users } from "@/lib/server/db/schema";

export interface AccountSetupState {
  fullName: string;
  complete: boolean;
}

export async function getAccountSetupState(userId: string): Promise<AccountSetupState> {
  const db = getDb();
  const [row] = await db
    .select({ fullName: profiles.fullName })
    .from(users)
    .leftJoin(profiles, eq(profiles.userId, users.id))
    .where(eq(users.id, userId))
    .limit(1);

  const fullName = row?.fullName?.trim() ?? "";
  return { fullName, complete: Boolean(fullName) };
}
