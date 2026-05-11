import { NextResponse } from "next/server";
import { apiError } from "@/lib/server/errors";
import { deleteSavedIdea } from "@/lib/server/store";
import { requireWorkspaceAccess } from "@/lib/server/workspace-access";

type RouteContext = { params: Promise<{ token: string; ideaId: string }> };

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { token, ideaId } = await context.params;
    await requireWorkspaceAccess(token, "edit");
    await deleteSavedIdea(token, ideaId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error, "Could not remove saved idea.");
  }
}
