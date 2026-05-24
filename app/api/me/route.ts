import { eq, like, or } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireCurrentUserId } from "@/lib/server/auth/current";
import { getAccountPlanSummary } from "@/lib/server/account-workspaces";
import { getDb } from "@/lib/server/db";
import { profiles, users, verificationTokens, workspaces } from "@/lib/server/db/schema";
import { apiError, AppError } from "@/lib/server/errors";
import { readJson } from "@/lib/server/http";
import { deleteWorkspacesByTokens } from "@/lib/server/store";

type UpdateProfileRequest = {
  creatorName?: unknown;
  editorName?: unknown;
  fullName?: unknown;
  phoneNumber?: unknown;
  handle?: unknown;
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
      fullName?: string | null;
      phoneNumber?: string | null;
      handle?: string | null;
    } = {};

    if ("creatorName" in body) patch.creatorName = requireCreatorName(body.creatorName);
    if ("editorName" in body) patch.editorName = requireCuratorName(body.editorName);
    if ("fullName" in body) patch.fullName = normalizeFullName(body.fullName);
    if ("phoneNumber" in body) patch.phoneNumber = normalizePhoneNumber(body.phoneNumber);
    if ("handle" in body) patch.handle = await normalizeHandle(body.handle, userId);
    if (
      patch.creatorName === undefined &&
      patch.editorName === undefined &&
      patch.fullName === undefined &&
      patch.phoneNumber === undefined &&
      patch.handle === undefined
    ) {
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
    const profilePatch: {
      fullName?: string | null;
      phoneNumber?: string | null;
      handle?: string | null;
      updatedAt: Date;
    } = { updatedAt: new Date() };
    if (patch.fullName !== undefined) profilePatch.fullName = patch.fullName;
    if (patch.phoneNumber !== undefined) profilePatch.phoneNumber = patch.phoneNumber;
    if (patch.handle !== undefined) profilePatch.handle = patch.handle;

    if (
      profilePatch.fullName !== undefined ||
      profilePatch.phoneNumber !== undefined ||
      profilePatch.handle !== undefined
    ) {
      await db
        .update(profiles)
        .set(profilePatch)
        .where(eq(profiles.userId, userId));
    }

    return NextResponse.json(await loadProfile(userId));
  } catch (error) {
    return apiError(error, "Could not update profile.");
  }
}

export async function DELETE() {
  try {
    const userId = await requireCurrentUserId();
    const db = getDb();
    const [user] = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!user) throw new AppError("User not found.", 404);

    const ownedWorkspaces = await db
      .select({ token: workspaces.token })
      .from(workspaces)
      .where(eq(workspaces.ownerUserId, userId));
    await deleteWorkspacesByTokens(
      ownedWorkspaces.map((workspace) => workspace.token).filter((token): token is string => Boolean(token)),
      { deleteUsageEvents: true },
    );

    await db.transaction(async (tx) => {
      if (user.email) {
        await tx
          .delete(verificationTokens)
          .where(
            or(
              eq(verificationTokens.identifier, `email:${user.email}`),
              eq(verificationTokens.identifier, `password-reset:${user.email}`),
              like(verificationTokens.identifier, `registration:${user.email}:%`)
            )
          );
      }

      const [deleted] = await tx
        .delete(users)
        .where(eq(users.id, userId))
        .returning({ id: users.id });
      if (!deleted) throw new AppError("User not found.", 404);
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error, "Could not delete account.");
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
      fullName: profiles.fullName,
      phoneNumber: profiles.phoneNumber,
      handle: profiles.handle,
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
    fullName: row.fullName ?? null,
    phoneNumber: row.phoneNumber ?? null,
    handle: row.handle ?? null,
    plan: await getAccountPlanSummary(userId),
    creatorName: row.creatorName ?? "",
    editorName: row.editorName ?? "Curator",
  };
}

function requireCreatorName(value: unknown): string {
  if (typeof value !== "string") throw new AppError("What should we call you?", 400);
  const creatorName = value.trim();
  if (creatorName.length < 2) throw new AppError("Use at least two letters.", 400);
  if (creatorName.length > 24) throw new AppError("Keep your name to 24 letters.", 400);
  if (/[^\p{L}]/u.test(creatorName)) {
    throw new AppError("Use one word with letters only. No spaces, numbers, or symbols.", 400);
  }
  if (!/^\p{Lu}/u.test(creatorName)) throw new AppError("Start with a capital letter.", 400);
  if (!/\p{Ll}$/u.test(creatorName)) throw new AppError("End with a lowercase letter.", 400);
  return creatorName;
}

function requireCuratorName(value: unknown): string {
  if (typeof value !== "string") throw new AppError("Choose a curator name.", 400);
  const editorName = value.trim();
  if (editorName.length < 2) throw new AppError("Use at least two letters.", 400);
  if (editorName.length > 24) throw new AppError("Keep your curator name to 24 letters.", 400);
  if (/[^\p{L}]/u.test(editorName)) {
    throw new AppError("Use one word with letters only. No spaces, numbers, or symbols.", 400);
  }
  if (!/^\p{Lu}/u.test(editorName)) throw new AppError("Start with a capital letter.", 400);
  if (!/\p{Ll}$/u.test(editorName)) throw new AppError("End with a lowercase letter.", 400);
  return editorName;
}

function normalizeFullName(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new AppError("Enter a name.", 400);
  const fullName = value.replace(/\s+/g, " ").trim();
  if (!fullName) return null;
  if (fullName.length > 100) throw new AppError("Keep your name under 100 characters.", 400);
  if (/[\p{C}]/u.test(fullName)) throw new AppError("Enter a valid name.", 400);
  return fullName;
}

function normalizePhoneNumber(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new AppError("Enter a phone number.", 400);
  const digits = value.replace(/\D/g, "");
  const national = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  if (!national) return null;
  if (national.length !== 10) throw new AppError("Use a 10-digit US number.", 400);
  return `+1 (${national.slice(0, 3)}) ${national.slice(3, 6)}-${national.slice(6)}`;
}

async function normalizeHandle(value: unknown, userId: string): Promise<string | null> {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new AppError("Enter a handle.", 400);
  const handle = value.replace(/^@+/, "").trim().toLowerCase();
  if (!handle) return null;
  if (!/^[a-z0-9_]{3,24}$/.test(handle)) {
    throw new AppError("Use 3-24 letters, numbers, or underscores.", 400);
  }

  const db = getDb();
  const [existing] = await db
    .select({ userId: profiles.userId })
    .from(profiles)
    .where(eq(profiles.handle, handle))
    .limit(1);
  if (existing && existing.userId !== userId) {
    throw new AppError("That handle is already taken.", 409);
  }
  return handle;
}
