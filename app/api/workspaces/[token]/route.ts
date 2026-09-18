import { NextResponse } from "next/server";
import { deleteOwnedAccountWorkspace, updateAccountWorkspacePublicationName } from "@/lib/server/account-workspaces";
import { apiError, AppError } from "@/lib/server/errors";
import { readJson } from "@/lib/server/http";
import { deleteWorkspacesByTokens, getWorkspaceOverview, updateWorkspacePublicationName } from "@/lib/server/store";
import { requireWorkspaceAccess } from "@/lib/server/workspace-access";
import type { RouteContext } from "@/types/route";

type UpdateWorkspaceRequest = { publicationName?: unknown };

export async function GET(_request: Request, context: RouteContext<{ token: string }>) {
  try {
    const { token } = await context.params;
    await requireWorkspaceAccess(token);
    return NextResponse.json(await getWorkspaceOverview(token));
  } catch (error) {
    return apiError(error, "Could not load workspace.");
  }
}

export async function PATCH(request: Request, context: RouteContext<{ token: string }>) {
  try {
    const { token } = await context.params;
    await requireWorkspaceAccess(token, "edit");
    const body = await readJson<UpdateWorkspaceRequest>(request);
    const publicationName = requirePublicationName(body.publicationName);

    const overview = await updateWorkspacePublicationName(token, publicationName);
    if (process.env.DATABASE_URL) {
      await updateAccountWorkspacePublicationName(token, publicationName);
    }
    return NextResponse.json(overview);
  } catch (error) {
    return apiError(error, "Could not update publication.");
  }
}

export async function DELETE(_request: Request, context: RouteContext<{ token: string }>) {
  try {
    const { token } = await context.params;
    const userId = await requireWorkspaceAccess(token, "edit");
    if (process.env.DATABASE_URL) {
      await deleteOwnedAccountWorkspace(userId, token);
    }
    await deleteWorkspacesByTokens([token]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error, "Could not delete publication.");
  }
}

function requirePublicationName(value: unknown): string {
  if (typeof value !== "string") throw new AppError("Enter a publication name.", 400);
  const publicationName = value.replace(/\s+/g, " ").trim();
  if (!publicationName) throw new AppError("Enter a publication name.", 400);
  if (publicationName.length > 120) throw new AppError("Keep the publication name under 120 characters.", 400);
  return publicationName;
}
