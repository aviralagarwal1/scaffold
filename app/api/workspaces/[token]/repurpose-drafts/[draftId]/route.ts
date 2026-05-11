import type { RepurposeDraftStatus } from "@/types/ai";
import { NextResponse } from "next/server";
import { AppError, apiError } from "@/lib/server/errors";
import { readJson } from "@/lib/server/http";
import { updateRepurposeDraft } from "@/lib/server/store";
import { requireWorkspaceAccess } from "@/lib/server/workspace-access";

type RouteContext = { params: Promise<{ token: string; draftId: string }> };

const statuses: RepurposeDraftStatus[] = ["pending", "saved", "deleted"];

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { token, draftId } = await context.params;
    await requireWorkspaceAccess(token, "edit");
    const body = await readJson<{
      status?: RepurposeDraftStatus;
      content?: string;
      title?: string | null;
    }>(request);

    if (body.status && !statuses.includes(body.status)) {
      throw new AppError("Invalid draft status.", 400);
    }

    return NextResponse.json(
      await updateRepurposeDraft(token, draftId, {
        status: body.status,
        content: body.content,
        title: body.title
      })
    );
  } catch (error) {
    return apiError(error, "Could not update draft.");
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { token, draftId } = await context.params;
    await requireWorkspaceAccess(token, "edit");
    await updateRepurposeDraft(token, draftId, { status: "deleted" });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error, "Could not delete draft.");
  }
}
