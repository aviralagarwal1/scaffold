import { eq } from "drizzle-orm";
import { getDb } from "@/lib/server/db";
import { profiles, users } from "@/lib/server/db/schema";

export interface AccountSetupState {
  creatorName: string;
  editorName: string;
  fullName: string;
  handle: string;
  phoneNumber: string;
  complete: boolean;
}

export async function getAccountSetupState(userId: string): Promise<AccountSetupState> {
  const db = getDb();
  const [row] = await db
    .select({
      creatorName: users.name,
      editorName: profiles.editorName,
      fullName: profiles.fullName,
      handle: profiles.handle,
      phoneNumber: profiles.phoneNumber,
    })
    .from(users)
    .leftJoin(profiles, eq(profiles.userId, users.id))
    .where(eq(users.id, userId))
    .limit(1);

  const state = {
    creatorName: row?.creatorName?.trim() ?? "",
    editorName: row?.editorName?.trim() ?? "",
    fullName: row?.fullName?.trim() ?? "",
    handle: row?.handle?.trim() ?? "",
    phoneNumber: row?.phoneNumber?.trim() ?? "",
  };

  return {
    ...state,
    complete: Object.values(state).every(Boolean),
  };
}
