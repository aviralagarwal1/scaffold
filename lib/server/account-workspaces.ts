import { and, desc, eq, isNull } from "drizzle-orm";
import type { AccountPlanSummary, AccountWorkspaceSummary, WorkspaceStatus } from "@/types/workspace";
import { getDb } from "@/lib/server/db";
import { tokenUsageEvents, users, workspaceMemberships, workspaces } from "@/lib/server/db/schema";
import { planConfig } from "@/lib/server/plans";
import { AppError } from "@/lib/server/errors";
import { getAccountTokenUsage, getWorkspaceTokenUsageMap } from "@/lib/server/store";

type OwnedWorkspaceInput = {
  token: string;
  publicationUrl: string;
  publicationName: string | null;
  status: WorkspaceStatus;
  lastIngestedAt: string | null;
  ingestionError: string | null;
};

export async function listAccountWorkspaces(userId: string): Promise<AccountWorkspaceSummary[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: workspaces.id,
      token: workspaces.token,
      publicationUrl: workspaces.publicationUrl,
      publicationName: workspaces.publicationName,
      status: workspaces.status,
      createdAt: workspaces.createdAt,
      updatedAt: workspaces.updatedAt,
      lastIngestedAt: workspaces.lastIngestedAt,
    })
    .from(workspaceMemberships)
    .innerJoin(workspaces, eq(workspaces.id, workspaceMemberships.workspaceId))
    .where(eq(workspaceMemberships.userId, userId))
    .orderBy(desc(workspaces.updatedAt));
  const usageByToken = await getWorkspaceTokenUsageMap(
    rows.map((row) => row.token).filter((token): token is string => Boolean(token))
  );

  return rows.map((row) => ({
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    lastIngestedAt: row.lastIngestedAt?.toISOString() ?? null,
    workspaceUrl: row.token ? `/workspace/${row.token}` : `/workspaces/${row.id}`,
    tokenUsage: row.token ? usageByToken.get(row.token) ?? null : null,
  }));
}

export async function getAccountPlanSummary(userId: string): Promise<AccountPlanSummary> {
  const db = getDb();
  const [user] = await db
    .select({ plan: users.plan })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const plan = planConfig(user?.plan);
  const activePublicationCount = await countOwnedWorkspaces(userId);
  return {
    id: plan.id,
    label: plan.label,
    monthlyTokenLimit: plan.monthlyTokenLimit,
    activePublicationLimit: plan.activePublicationLimit,
    priceCents: plan.priceCents,
    tokenUsage: await getAccountTokenUsage(userId),
    activePublicationCount,
  };
}

export async function assertCanCreateAccountWorkspace(userId: string, publicationUrl: string): Promise<void> {
  const db = getDb();
  const planSummary = await getAccountPlanSummary(userId);
  const [existing] = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(and(eq(workspaces.ownerUserId, userId), eq(workspaces.publicationUrl, publicationUrl)))
    .limit(1);
  if (existing) return;

  if (planSummary.activePublicationCount >= planSummary.activePublicationLimit) {
    throw new AppError(
      `${planSummary.label} accounts can have ${planSummary.activePublicationLimit} active publication${planSummary.activePublicationLimit === 1 ? "" : "s"}.`,
      402,
    );
  }
}

async function countOwnedWorkspaces(userId: string): Promise<number> {
  const db = getDb();
  const rows = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(eq(workspaces.ownerUserId, userId));
  return rows.length;
}

export async function recordOwnedWorkspace(userId: string, input: OwnedWorkspaceInput): Promise<AccountWorkspaceSummary> {
  const db = getDb();
  const now = new Date();

  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ id: workspaces.id })
      .from(workspaces)
      .where(and(eq(workspaces.ownerUserId, userId), eq(workspaces.publicationUrl, input.publicationUrl)))
      .limit(1);

    const workspace = existing
      ? (
          await tx
            .update(workspaces)
            .set({
              token: input.token,
              publicationName: input.publicationName,
              status: input.status,
              lastIngestedAt: input.lastIngestedAt ? new Date(input.lastIngestedAt) : null,
              ingestionError: input.ingestionError,
              updatedAt: now,
            })
            .where(eq(workspaces.id, existing.id))
            .returning()
        )[0]
      : (
          await tx
            .insert(workspaces)
            .values({
              ownerUserId: userId,
              token: input.token,
              publicationUrl: input.publicationUrl,
              publicationName: input.publicationName,
              status: input.status,
              lastIngestedAt: input.lastIngestedAt ? new Date(input.lastIngestedAt) : null,
              ingestionError: input.ingestionError,
            })
            .returning()
        )[0];

    await tx
      .insert(workspaceMemberships)
      .values({
        workspaceId: workspace.id,
        userId,
        role: "owner",
      })
      .onConflictDoNothing();

    return {
      id: workspace.id,
      token: workspace.token,
      publicationUrl: workspace.publicationUrl,
      publicationName: workspace.publicationName,
      status: workspace.status,
      createdAt: workspace.createdAt.toISOString(),
      updatedAt: workspace.updatedAt.toISOString(),
      lastIngestedAt: workspace.lastIngestedAt?.toISOString() ?? null,
      workspaceUrl: workspace.token ? `/workspace/${workspace.token}` : `/workspaces/${workspace.id}`,
      tokenUsage: workspace.token ? (await getWorkspaceTokenUsageMap([workspace.token])).get(workspace.token) ?? null : null,
    };
  });
}

/** The token of the workspace this account already keeps for a publication. */
export async function findOwnedWorkspaceToken(userId: string, publicationUrl: string): Promise<string | null> {
  const db = getDb();
  const [existing] = await db
    .select({ token: workspaces.token })
    .from(workspaces)
    .where(and(eq(workspaces.ownerUserId, userId), eq(workspaces.publicationUrl, publicationUrl)))
    .limit(1);
  return existing?.token ?? null;
}

/**
 * Carry a finished sync back to the `workspaces` row.
 *
 * Desk reads status and last sync from here, not from the corpus, so a sync
 * that only writes the corpus leaves Desk showing the day the publication was
 * added. Called from the sync path rather than from each route, because the
 * route that forgets is the one that makes Desk lie.
 */
export async function syncAccountWorkspaceState(
  token: string,
  state: { publicationName: string | null; status: WorkspaceStatus; lastIngestedAt: string | null; ingestionError: string | null },
): Promise<void> {
  const db = getDb();
  await db
    .update(workspaces)
    .set({
      publicationName: state.publicationName,
      status: state.status,
      lastIngestedAt: state.lastIngestedAt ? new Date(state.lastIngestedAt) : null,
      ingestionError: state.ingestionError,
      updatedAt: new Date(),
    })
    .where(eq(workspaces.token, token));
}

export async function canEditAccountWorkspace(userId: string, token: string): Promise<boolean> {
  const db = getDb();
  const [workspace] = await db
    .select({ id: workspaces.id, ownerUserId: workspaces.ownerUserId })
    .from(workspaces)
    .where(eq(workspaces.token, token))
    .limit(1);

  if (!workspace) return false;
  if (workspace.ownerUserId === userId) return true;

  const [membership] = await db
    .select({ role: workspaceMemberships.role })
    .from(workspaceMemberships)
    .where(and(eq(workspaceMemberships.userId, userId), eq(workspaceMemberships.workspaceId, workspace.id)))
    .limit(1);

  return Boolean(membership && membership.role !== "viewer");
}

export async function canViewAccountWorkspace(userId: string, token: string): Promise<boolean> {
  const db = getDb();
  const [workspace] = await db
    .select({ id: workspaces.id, ownerUserId: workspaces.ownerUserId })
    .from(workspaces)
    .where(eq(workspaces.token, token))
    .limit(1);

  if (!workspace) return false;
  if (workspace.ownerUserId === userId) return true;

  const [membership] = await db
    .select({ userId: workspaceMemberships.userId })
    .from(workspaceMemberships)
    .where(and(eq(workspaceMemberships.userId, userId), eq(workspaceMemberships.workspaceId, workspace.id)))
    .limit(1);

  return Boolean(membership);
}

export async function updateAccountWorkspacePublicationName(token: string, publicationName: string): Promise<void> {
  const db = getDb();
  await db
    .update(workspaces)
    .set({ publicationName, updatedAt: new Date() })
    .where(eq(workspaces.token, token));
}

export async function deleteOwnedAccountWorkspace(userId: string, token: string, db: import("./store").StoreTransaction): Promise<void> {
  const [target] = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(and(eq(workspaces.ownerUserId, userId), eq(workspaces.token, token)))
    .limit(1);
  if (!target) {
    throw new AppError("You can only delete publications you own.", 404);
  }

  // Deleting a publication frees the slot but must not refund the tokens it
  // already spent — the month's usage keeps counting against the account.
  // Usage rows are written with the owner stamped, and the workspace
  // reference sets null when the row goes, so the total survives. This claims
  // any row that somehow has no owner, and it has to happen while the
  // workspace id is still on those rows to identify them by.
  await db
    .update(tokenUsageEvents)
    .set({ userId })
    .where(and(eq(tokenUsageEvents.workspaceId, target.id), isNull(tokenUsageEvents.userId)));

  await db.delete(workspaces).where(eq(workspaces.id, target.id));
}
