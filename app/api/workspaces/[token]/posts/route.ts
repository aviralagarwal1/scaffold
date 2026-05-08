import { NextResponse } from "next/server";
import { apiError } from "@/lib/server/errors";
import { listPosts } from "@/lib/server/store";

type RouteContext = { params: Promise<{ token: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { token } = await context.params;
    return NextResponse.json(await listPosts(token));
  } catch (error) {
    return apiError(error, "Could not load posts.");
  }
}
