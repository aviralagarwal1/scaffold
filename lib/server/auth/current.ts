import { getServerSession } from "next-auth";
import { AppError } from "@/lib/server/errors";
import { authOptions } from "./options";

export async function getCurrentUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return session?.user?.id ?? null;
}

export async function requireCurrentUserId(): Promise<string> {
  const userId = await getCurrentUserId();
  if (!userId) throw new AppError("Sign in to continue.", 401);
  return userId;
}
