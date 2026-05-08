import { NextResponse } from "next/server";
import { generateIdeas } from "@/lib/server/ai";
import { apiError } from "@/lib/server/errors";

type RouteContext = { params: Promise<{ token: string }> };

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { token } = await context.params;
    return NextResponse.json(await generateIdeas(token));
  } catch (error) {
    return apiError(error, "Could not generate ideas.");
  }
}
