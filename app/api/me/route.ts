import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireCurrentUserId } from "@/lib/server/auth/current";
import { getDb } from "@/lib/server/db";
import { profiles, users } from "@/lib/server/db/schema";
import { apiError, AppError } from "@/lib/server/errors";
import { readJson } from "@/lib/server/http";

type UpdateProfileRequest = {
  editorName?: unknown;
};

export async function GET() {
  try {
    const userId = await requireCurrentUserId();
    const profile = await loadProfile(userId);
    return NextResponse.json(profile);
  } catch (error) {
    return apiError(error, "Could not load profile.");
  }
}

export async function PATCH(request: Request) {
  try {
    const userId = await requireCurrentUserId();
    const body = await readJson<UpdateProfileRequest>(request);
    const editorName = requireEditorName(body.editorName);
    const db = getDb();

    await db
      .update(profiles)
      .set({ editorName, updatedAt: new Date() })
      .where(eq(profiles.userId, userId));
    await db.update(users).set({ name: editorName }).where(eq(users.id, userId));

    return NextResponse.json(await loadProfile(userId));
  } catch (error) {
    return apiError(error, "Could not update profile.");
  }
}

async function loadProfile(userId: string) {
  const db = getDb();
  const [row] = await db
    .select({
      id: users.id,
      email: users.email,
      editorName: profiles.editorName,
    })
    .from(users)
    .leftJoin(profiles, eq(profiles.userId, users.id))
    .where(eq(users.id, userId))
    .limit(1);

  if (!row) throw new AppError("User not found.", 404);
  return {
    id: row.id,
    email: row.email,
    editorName: row.editorName ?? row.email ?? "Editor",
  };
}

function requireEditorName(value: unknown): string {
  if (typeof value !== "string") throw new AppError("Choose an editor name.", 400);
  const editorName = value.replace(/\s+/g, " ").trim();
  if (editorName.length < 2) throw new AppError("Choose an editor name.", 400);
  return editorName.slice(0, 80);
}
