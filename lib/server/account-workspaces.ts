import { and, desc, eq } from "drizzle-orm";
import type { AccountWorkspaceSummary, WorkspaceStatus } from "@/types/workspace";
import { getDb } from "@/lib/server/db";
import { workspaceMemberships, workspaces } from "@/lib/server/db/schema";

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
      verificationStatus: workspaces.verificationStatus,
      role: workspaceMemberships.role,
      createdAt: workspaces.createdAt,
      updatedAt: workspaces.updatedAt,
      lastIngestedAt: workspaces.lastIngestedAt,
    })
    .from(workspaceMemberships)
    .innerJoin(workspaces, eq(workspaces.id, workspaceMemberships.workspaceId))
    .where(eq(workspaceMemberships.userId, userId))
    .orderBy(desc(workspaces.updatedAt));

  return rows.map((row) => ({
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    lastIngestedAt: row.lastIngestedAt?.toISOString() ?? null,
    workspaceUrl: row.token ? `/workspace/${row.token}` : `/workspaces/${row.id}`,
  }));
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
      verificationStatus: workspace.verificationStatus,
      role: "owner",
      createdAt: workspace.createdAt.toISOString(),
      updatedAt: workspace.updatedAt.toISOString(),
      lastIngestedAt: workspace.lastIngestedAt?.toISOString() ?? null,
      workspaceUrl: workspace.token ? `/workspace/${workspace.token}` : `/workspaces/${workspace.id}`,
    };
  });
}

export async function canEditAccountWorkspace(userId: string, token: string): Promise<boolean> {
  const db = getDb();
  const [membership] = await db
    .select({ role: workspaceMemberships.role })
    .from(workspaceMemberships)
    .innerJoin(workspaces, eq(workspaces.id, workspaceMemberships.workspaceId))
    .where(and(eq(workspaceMemberships.userId, userId), eq(workspaces.token, token)))
    .limit(1);

  return Boolean(membership && membership.role !== "viewer");
}

export async function updateAccountWorkspacePublicationName(token: string, publicationName: string): Promise<void> {
  const db = getDb();
  await db
    .update(workspaces)
    .set({ publicationName, updatedAt: new Date() })
    .where(eq(workspaces.token, token));
}
