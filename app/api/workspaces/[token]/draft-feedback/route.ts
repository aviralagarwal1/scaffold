import type { DraftFeedbackRequest } from "@/types/ai";
import { NextResponse } from "next/server";
import { generateDraftFeedback } from "@/lib/server/ai";
import { apiError } from "@/lib/server/errors";
import { readJson, requireString } from "@/lib/server/http";

type RouteContext = { params: Promise<{ token: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const { token } = await context.params;
    const body = await readJson<DraftFeedbackRequest>(request);
    const focus = Array.isArray(body.focus)
      ? body.focus.filter((value): value is string => typeof value === "string")
      : undefined;
    return NextResponse.json(
      await generateDraftFeedback(token, requireString(body.draft, "Paste a draft."), { focus }),
    );
  } catch (error) {
    return apiError(error, "Could not generate draft feedback.");
  }
}
