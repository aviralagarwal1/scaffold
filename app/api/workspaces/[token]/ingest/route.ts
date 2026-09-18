import { NextResponse } from "next/server";
import { apiError } from "@/lib/server/errors";
import { ingestWorkspace } from "@/lib/server/ingestion";
import { getWorkspaceOverview } from "@/lib/server/store";
import { requireWorkspaceAccess } from "@/lib/server/workspace-access";
import type { RouteContext } from "@/types/route";

export async function POST(_request: Request, context: RouteContext<{ token: string }>) {
  try {
    const { token } = await context.params;
    await requireWorkspaceAccess(token, "edit");
    await ingestWorkspace(token);
    return NextResponse.json(await getWorkspaceOverview(token));
  } catch (error) {
    return apiError(error, "Could not sync your library.");
  }
}
