import { NextResponse } from "next/server";
import { apiError } from "@/lib/server/errors";
import { deleteGrammarIssues, listGrammarIssues } from "@/lib/server/store";
import { requireWorkspaceAccess } from "@/lib/server/workspace-access";
import type { RouteContext } from "@/types/route";

export async function GET(_request: Request, context: RouteContext<{ token: string }>) {
  try {
    const { token } = await context.params;
    await requireWorkspaceAccess(token);
    return NextResponse.json(await listGrammarIssues(token));
  } catch (error) {
    return apiError(error, "Could not load grammar issues.");
  }
}

export async function DELETE(_request: Request, context: RouteContext<{ token: string }>) {
  try {
    const { token } = await context.params;
    await requireWorkspaceAccess(token, "edit");
    await deleteGrammarIssues(token);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error, "Could not clear grammar audit.");
  }
}
