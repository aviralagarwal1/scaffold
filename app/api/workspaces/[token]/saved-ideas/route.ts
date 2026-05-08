import { NextResponse } from "next/server";
import { apiError } from "@/lib/server/errors";
import { readJson } from "@/lib/server/http";
import { addSavedIdea, listSavedIdeas } from "@/lib/server/store";
import { requireWorkspaceAccess } from "@/lib/server/workspace-access";
import type { RouteContext } from "@/types/route";

type SaveIdeaRequest = { idea?: unknown };

export async function GET(_request: Request, context: RouteContext<{ token: string }>) {
  try {
    const { token } = await context.params;
    await requireWorkspaceAccess(token);
    return NextResponse.json(await listSavedIdeas(token));
  } catch (error) {
    return apiError(error, "Could not load saved ideas.");
  }
}

export async function POST(request: Request, context: RouteContext<{ token: string }>) {
  try {
    const { token } = await context.params;
    await requireWorkspaceAccess(token, "edit");
    const body = await readJson<SaveIdeaRequest>(request);
    return NextResponse.json(await addSavedIdea(token, body.idea));
  } catch (error) {
    return apiError(error, "Could not save idea.");
  }
}
