import { eq, sql, or } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireCurrentUserId } from "@/lib/server/auth/current";
import { getAccountPlanSummary } from "@/lib/server/account-workspaces";
import { getDb } from "@/lib/server/db";
import { profiles, users, verificationTokens, workspaces } from "@/lib/server/db/schema";
import { apiError, AppError } from "@/lib/server/errors";
import { readJson } from "@/lib/server/http";
import { deleteWorkspacesByTokens } from "@/lib/server/store";
import { hasUnfinishedSubscription } from "@/lib/server/stripe-signature";

type UpdateProfileRequest = {
  fullName?: unknown;
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
    if (!("fullName" in body)) throw new AppError("Choose what to update.", 400);

    const db = getDb();
    await db
      .update(profiles)
      .set({ fullName: normalizeFullName(body.fullName), updatedAt: new Date() })
      .where(eq(profiles.userId, userId));

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
    await deleteWorkspacesByTokens(ownedWorkspaces.map((workspace) => workspace.token).filter((token): token is string => Boolean(token)), async (tx) => {
      const [billing] = await tx.select({ id: users.stripeSubscriptionId, status: users.stripeSubscriptionStatus })
        .from(users).where(eq(users.id, userId)).for("update");
      if (!billing) throw new AppError("User not found.", 404);
      if (hasUnfinishedSubscription(billing.id, billing.status)) throw new AppError("Cancel your subscription in billing and wait for it to end before deleting your account.", 409);
      if (user.email) {
        await tx
          .delete(verificationTokens)
          .where(
            or(
              eq(verificationTokens.identifier, `email:${user.email}`),
              eq(verificationTokens.identifier, `password-reset:${user.email}`),
              sql`starts_with(${verificationTokens.identifier}, ${`registration:${user.email}:`})`
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
      fullName: profiles.fullName,
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
    plan: await getAccountPlanSummary(userId),
  };
}

function normalizeFullName(value: unknown): string {
  if (typeof value !== "string") throw new AppError("Please save your full name.", 400);
  const fullName = value.replace(/\s+/g, " ").trim();
  if (!fullName) throw new AppError("Please save your full name.", 400);
  const letterCount = fullName.match(/\p{L}/gu)?.length ?? 0;
  if (letterCount < 2) throw new AppError("Use at least two letters for your full name.", 400);
  if (fullName.length > 100) throw new AppError("Keep your full name under 100 characters.", 400);
  if (/[^\p{L}\s'.-]/u.test(fullName)) {
    throw new AppError("Use letters, spaces, hyphens, apostrophes, or periods.", 400);
  }
  return fullName;
}
