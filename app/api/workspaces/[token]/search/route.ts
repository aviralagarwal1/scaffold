import { NextResponse } from "next/server";
import type { SearchRequest } from "@/types/ai";
import { searchWorkspacePosts } from "@/lib/server/store";
import { apiError } from "@/lib/server/errors";
import { readJson } from "@/lib/server/http";

type RouteContext = { params: Promise<{ token: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const { token } = await context.params;
    const body = await readJson<SearchRequest>(request);
    const query = typeof body.query === "string" ? body.query : "";
    return NextResponse.json(await searchWorkspacePosts(token, query));
  } catch (error) {
    return apiError(error, "Search failed.");
  }
}
