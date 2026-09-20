import { NextResponse } from "next/server";
import { apiError } from "@/lib/server/errors";
import { listWorkspaceNotes } from "@/lib/server/notes";
import { requireWorkspaceAccess } from "@/lib/server/workspace-access";
import type { RouteContext } from "@/types/route";

export async function GET(_request: Request, context: RouteContext<{ token: string }>) {
  try {
    const { token } = await context.params;
    await requireWorkspaceAccess(token);
    return NextResponse.json(await listWorkspaceNotes(token));
  } catch (error) {
    return apiError(error, "Could not load notes.");
  }
}
