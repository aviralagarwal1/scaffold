import type { DraftFeedbackRequest } from "@/types/ai";
import { NextResponse } from "next/server";
import { generateDraftFeedback } from "@/lib/server/ai";
import { apiError } from "@/lib/server/errors";
import { listSavedDraftFeedback, saveDraftFeedback } from "@/lib/server/history";
import { readJson, requireString } from "@/lib/server/http";
import { requireWorkspaceAccess } from "@/lib/server/workspace-access";

type RouteContext = { params: Promise<{ token: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { token } = await context.params;
    await requireWorkspaceAccess(token, "view");
    return NextResponse.json(await listSavedDraftFeedback(token));
  } catch (error) {
    return apiError(error, "Could not load draft history.");
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { token } = await context.params;
    await requireWorkspaceAccess(token, "edit");
    const body = await readJson<DraftFeedbackRequest>(request);
    const focus = Array.isArray(body.focus)
      ? body.focus.filter((value): value is string => typeof value === "string")
      : undefined;
    const draft = requireString(body.draft, "Paste a draft.");
    const response = await generateDraftFeedback(token, draft, { focus });
    const saved = await saveDraftFeedback({
      token,
      draft,
      feedback: response.feedback,
      sources: response.sources ?? [],
    });
    return NextResponse.json({
      ...response,
      id: saved.id,
      createdAt: saved.createdAt,
    });
  } catch (error) {
    return apiError(error, "Could not generate draft feedback.");
  }
}
