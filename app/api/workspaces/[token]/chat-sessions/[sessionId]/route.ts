import { NextResponse } from "next/server";
import { apiError } from "@/lib/server/errors";
import { deleteChatSession } from "@/lib/server/history";
import { requireWorkspaceAccess } from "@/lib/server/workspace-access";
import type { RouteContext } from "@/types/route";

export async function DELETE(_request: Request, context: RouteContext<{ token: string; sessionId: string }>) {
  try {
    const { token, sessionId } = await context.params;
    const userId = await requireWorkspaceAccess(token, "edit");
    await deleteChatSession(token, userId, sessionId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error, "Could not delete conversation.");
  }
}
