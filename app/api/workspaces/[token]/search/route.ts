import { NextResponse } from "next/server";
import type { SearchRequest } from "@/types/ai";
import { searchWorkspacePosts } from "@/lib/server/store";
import { apiError } from "@/lib/server/errors";
import { readJson } from "@/lib/server/http";
import { requireWorkspaceAccess } from "@/lib/server/workspace-access";
import type { RouteContext } from "@/types/route";

export async function POST(request: Request, context: RouteContext<{ token: string }>) {
  try {
    const { token } = await context.params;
    await requireWorkspaceAccess(token);
    const body = await readJson<SearchRequest>(request);
    const query = typeof body.query === "string" ? body.query : "";
    return NextResponse.json(await searchWorkspacePosts(token, query));
  } catch (error) {
    return apiError(error, "Search failed.");
  }
}
