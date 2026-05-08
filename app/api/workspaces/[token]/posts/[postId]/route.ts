import { NextResponse } from "next/server";
import { apiError } from "@/lib/server/errors";
import { getPostReader } from "@/lib/server/notes";
import { requireWorkspaceAccess } from "@/lib/server/workspace-access";
import type { RouteContext } from "@/types/route";

export async function GET(_request: Request, context: RouteContext<{ token: string; postId: string }>) {
  try {
    const { token, postId } = await context.params;
    await requireWorkspaceAccess(token);
    return NextResponse.json(await getPostReader(token, postId));
  } catch (error) {
    return apiError(error, "Could not load post.");
  }
}
