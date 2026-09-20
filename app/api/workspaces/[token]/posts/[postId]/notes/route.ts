import { NextResponse } from "next/server";
import { apiError } from "@/lib/server/errors";
import { readJson } from "@/lib/server/http";
import { addPostNote, listPostNotes } from "@/lib/server/notes";
import { requireWorkspaceAccess } from "@/lib/server/workspace-access";
import type { CreatePostNoteRequest } from "@/types/post";
import type { RouteContext } from "@/types/route";

export async function GET(_request: Request, context: RouteContext<{ token: string; postId: string }>) {
  try {
    const { token, postId } = await context.params;
    await requireWorkspaceAccess(token);
    return NextResponse.json(await listPostNotes(token, postId));
  } catch (error) {
    return apiError(error, "Could not load notes.");
  }
}

export async function POST(request: Request, context: RouteContext<{ token: string; postId: string }>) {
  try {
    const { token, postId } = await context.params;
    await requireWorkspaceAccess(token, "edit");
    const body = await readJson<CreatePostNoteRequest>(request);
    return NextResponse.json(await addPostNote(token, postId, body));
  } catch (error) {
    return apiError(error, "Could not save note.");
  }
}
