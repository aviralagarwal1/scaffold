import { NextResponse } from "next/server";
import { apiError } from "@/lib/server/errors";
import { deletePostNote, updatePostNote } from "@/lib/server/notes";
import { readJson } from "@/lib/server/http";
import { requireWorkspaceAccess } from "@/lib/server/workspace-access";
import type { RouteContext } from "@/types/route";
import type { UpdatePostNoteRequest } from "@/types/post";

export async function PATCH(request: Request, context: RouteContext<{ token: string; postId: string; noteId: string }>) {
  try {
    const { token, postId, noteId } = await context.params;
    await requireWorkspaceAccess(token, "edit");
    const body = await readJson<UpdatePostNoteRequest>(request);
    return NextResponse.json(await updatePostNote(token, postId, noteId, body));
  } catch (error) {
    return apiError(error, "Could not save note.");
  }
}

export async function DELETE(
  _request: Request,
  context: RouteContext<{ token: string; postId: string; noteId: string }>,
) {
  try {
    const { token, postId, noteId } = await context.params;
    await requireWorkspaceAccess(token, "edit");
    await deletePostNote(token, postId, noteId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error, "Could not remove note.");
  }
}
