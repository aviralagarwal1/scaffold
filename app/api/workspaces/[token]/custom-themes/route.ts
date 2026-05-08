import { NextResponse } from "next/server";
import { apiError, AppError } from "@/lib/server/errors";
import { readJson } from "@/lib/server/http";
import { updateCustomThemes } from "@/lib/server/store";
import { requireWorkspaceAccess } from "@/lib/server/workspace-access";
import type { RouteContext } from "@/types/route";

type CustomThemesRequest = { labels?: unknown };

export async function PUT(request: Request, context: RouteContext<{ token: string }>) {
  try {
    const { token } = await context.params;
    await requireWorkspaceAccess(token, "edit");
    const body = await readJson<CustomThemesRequest>(request);
    if (!Array.isArray(body.labels)) throw new AppError("Custom themes must be a list.", 400);
    return NextResponse.json({ customThemes: await updateCustomThemes(token, body.labels) });
  } catch (error) {
    return apiError(error, "Could not update custom themes.");
  }
}
