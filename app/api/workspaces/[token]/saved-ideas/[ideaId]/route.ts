import { NextResponse } from "next/server";
import { apiError } from "@/lib/server/errors";
import { deleteSavedIdea } from "@/lib/server/store";
import { requireWorkspaceAccess } from "@/lib/server/workspace-access";
import type { RouteContext } from "@/types/route";

export async function DELETE(_request: Request, context: RouteContext<{ token: string; ideaId: string }>) {
  try {
    const { token, ideaId } = await context.params;
    await requireWorkspaceAccess(token, "edit");
    await deleteSavedIdea(token, ideaId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error, "Could not remove saved idea.");
  }
}
