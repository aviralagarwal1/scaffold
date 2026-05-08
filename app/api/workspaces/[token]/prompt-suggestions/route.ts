import type { PromptSuggestionsRequest } from "@/types/ai";
import { NextResponse } from "next/server";
import { generatePromptSuggestions } from "@/lib/server/ai";
import { apiError } from "@/lib/server/errors";
import { readJson } from "@/lib/server/http";
import { requireWorkspaceAccess } from "@/lib/server/workspace-access";
import type { RouteContext } from "@/types/route";

export async function POST(request: Request, context: RouteContext<{ token: string }>) {
  try {
    const { token } = await context.params;
    await requireWorkspaceAccess(token, "edit");
    const body = await readJson<PromptSuggestionsRequest>(request);
    const excludePrompts = Array.isArray(body.excludePrompts)
      ? body.excludePrompts.filter((value): value is string => typeof value === "string").slice(0, 30).map((value) => value.slice(0, 500))
      : undefined;
    const count = typeof body.count === "number" && Number.isFinite(body.count) ? body.count : undefined;
    return NextResponse.json(await generatePromptSuggestions(token, { excludePrompts, count }));
  } catch (error) {
    return apiError(error, "Could not surface more prompts.");
  }
}
