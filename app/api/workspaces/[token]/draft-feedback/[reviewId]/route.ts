import { NextResponse } from "next/server";
import { apiError } from "@/lib/server/errors";
import { deleteSavedDraftFeedback } from "@/lib/server/history";
import { requireWorkspaceAccess } from "@/lib/server/workspace-access";

type RouteContext = { params: Promise<{ token: string; reviewId: string }> };

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { token, reviewId } = await context.params;
    await requireWorkspaceAccess(token, "edit");
    await deleteSavedDraftFeedback(token, reviewId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error, "Could not delete saved review.");
  }
}
