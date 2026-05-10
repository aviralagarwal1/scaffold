import type { AskRequest } from "@/types/ai";
import { NextResponse } from "next/server";
import { answerArchiveQuestion } from "@/lib/server/ai";
import { apiError } from "@/lib/server/errors";
import { readJson, requireString } from "@/lib/server/http";

type RouteContext = { params: Promise<{ token: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const { token } = await context.params;
    const body = await readJson<AskRequest>(request);
    return NextResponse.json(await answerArchiveQuestion(token, requireString(body.message, "Ask a question.")));
  } catch (error) {
    return apiError(error, "Could not answer from your library.");
  }
}
