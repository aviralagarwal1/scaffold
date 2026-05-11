import { NextResponse } from "next/server";
import { apiError } from "@/lib/server/errors";
import { listRepurposeDrafts } from "@/lib/server/store";
import { requireWorkspaceAccess } from "@/lib/server/workspace-access";

type RouteContext = { params: Promise<{ token: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { token } = await context.params;
    await requireWorkspaceAccess(token);
    return NextResponse.json(await listRepurposeDrafts(token));
  } catch (error) {
    return apiError(error, "Could not load drafts.");
  }
}
