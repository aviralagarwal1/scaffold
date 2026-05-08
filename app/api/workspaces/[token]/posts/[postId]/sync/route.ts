import { NextResponse } from "next/server";
import { apiError } from "@/lib/server/errors";
import { ingestWorkspacePost } from "@/lib/server/ingestion";
import { requireWorkspaceAccess } from "@/lib/server/workspace-access";
import type { RouteContext } from "@/types/route";

export async function POST(_request: Request, context: RouteContext<{ token: string; postId: string }>) {
  try {
    const { token, postId } = await context.params;
    await requireWorkspaceAccess(token, "edit");
    return NextResponse.json(await ingestWorkspacePost(token, postId));
  } catch (error) {
    return apiError(error, "Could not sync post.");
  }
}
