import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireCurrentUserId } from "@/lib/server/auth/current";
import { getDb } from "@/lib/server/db";
import { profiles, users } from "@/lib/server/db/schema";
import { apiError, AppError } from "@/lib/server/errors";
import { readJson } from "@/lib/server/http";

type UpdateProfileRequest = {
  creatorName?: unknown;
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
    const db = getDb();

    const patch: {
      creatorName?: string;
      editorName?: string;
    } = {};

    if ("creatorName" in body) patch.creatorName = requireCreatorName(body.creatorName);
    if ("editorName" in body) patch.editorName = requireCuratorName(body.editorName);
    if (patch.creatorName === undefined && patch.editorName === undefined) {
      throw new AppError("Choose what to update.", 400);
    }

    if (patch.creatorName !== undefined) {
      await db.update(users).set({ name: patch.creatorName }).where(eq(users.id, userId));
    }
    if (patch.editorName !== undefined) {
      await db
        .update(profiles)
        .set({ editorName: patch.editorName, updatedAt: new Date() })
        .where(eq(profiles.userId, userId));
    }

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
      emailVerified: users.emailVerified,
      creatorName: users.name,
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
    emailVerified: row.emailVerified?.toISOString() ?? null,
    creatorName: row.creatorName ?? "",
    editorName: row.editorName ?? "Curator",
  };
}

function requireCreatorName(value: unknown): string {
  if (typeof value !== "string") throw new AppError("What should we call you?", 400);
  const creatorName = value.replace(/\s+/g, " ").trim();
  if (creatorName.length < 1) throw new AppError("What should we call you?", 400);
  if (creatorName.length > 60) throw new AppError("Keep your name under 60 characters.", 400);
  if (/[^\p{L}\s'-]/u.test(creatorName)) {
    throw new AppError("Use letters, spaces, hyphens, or apostrophes.", 400);
  }
  return creatorName;
}

function requireCuratorName(value: unknown): string {
  if (typeof value !== "string") throw new AppError("Choose a curator name.", 400);
  const editorName = value.trim();
  if (editorName.length < 2) throw new AppError("Choose a curator name.", 400);
  if (editorName.length > 24) throw new AppError("Keep your curator name to 24 letters.", 400);
  if (/[^\p{L}]/u.test(editorName)) {
    throw new AppError("Letters only - no numbers or symbols.", 400);
  }
  if (!/^\p{Lu}/u.test(editorName)) throw new AppError("Start with a capital letter.", 400);
  if (!/\p{Ll}$/u.test(editorName)) throw new AppError("End with a lowercase letter.", 400);
  return editorName;
}
