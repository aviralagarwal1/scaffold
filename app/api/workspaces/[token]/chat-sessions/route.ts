import { NextResponse } from "next/server";
import { apiError } from "@/lib/server/errors";
import { listChatSessions } from "@/lib/server/history";
import { requireWorkspaceAccess } from "@/lib/server/workspace-access";

type RouteContext = { params: Promise<{ token: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { token } = await context.params;
    const userId = await requireWorkspaceAccess(token, "view");
    return NextResponse.json(await listChatSessions(token, userId));
  } catch (error) {
    return apiError(error, "Could not load conversation history.");
  }
}
