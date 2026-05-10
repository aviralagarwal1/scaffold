import { NextResponse } from "next/server";
import { apiError, AppError } from "@/lib/server/errors";
import { readJson } from "@/lib/server/http";
import { updateCustomThemes } from "@/lib/server/store";

type RouteContext = { params: Promise<{ token: string }> };
type CustomThemesRequest = { labels?: unknown };

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { token } = await context.params;
    const body = await readJson<CustomThemesRequest>(request);
    if (!Array.isArray(body.labels)) throw new AppError("Custom themes must be a list.", 400);
    return NextResponse.json({ customThemes: await updateCustomThemes(token, body.labels) });
  } catch (error) {
    return apiError(error, "Could not update custom themes.");
  }
}
