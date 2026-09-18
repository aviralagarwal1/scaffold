import { NextResponse } from "next/server";
import { apiError, AppError } from "@/lib/server/errors";
import { buildLibraryExport } from "@/lib/server/library-export";
import { requireWorkspaceAccess } from "@/lib/server/workspace-access";
import type { RouteContext } from "@/types/route";

export const runtime = "nodejs";

export async function GET(request: Request, context: RouteContext<{ token: string }>) {
  try {
    const { token } = await context.params;
    await requireWorkspaceAccess(token);

    const url = new URL(request.url);
    const rawFormat = url.searchParams.get("format") ?? "txt";
    if (rawFormat !== "txt" && rawFormat !== "zip") {
      throw new AppError("Choose a supported export format.", 400);
    }

    const result = await buildLibraryExport(token, rawFormat);
    return new NextResponse(result.body, {
      headers: {
        "Content-Disposition": contentDisposition(result.filename),
        "Content-Type": result.contentType,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return apiError(error, "Could not export library.");
  }
}

function contentDisposition(filename: string): string {
  const fallback = filename.replace(/[^a-zA-Z0-9._-]/g, "_") || "library.txt";
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}
