import { NextResponse } from "next/server";
import { generateIdeas } from "@/lib/server/ai";
import { apiError } from "@/lib/server/errors";
import { readJson } from "@/lib/server/http";
import { requireWorkspaceAccess } from "@/lib/server/workspace-access";

type RouteContext = { params: Promise<{ token: string }> };
type IdeasRequest = { focus?: unknown };

export async function POST(request: Request, context: RouteContext) {
  try {
    const { token } = await context.params;
    await requireWorkspaceAccess(token, "edit");
    const body = await readJson<IdeasRequest>(request);
    return NextResponse.json(await generateIdeas(token, { focus: typeof body.focus === "string" ? body.focus : undefined }));
  } catch (error) {
    return apiError(error, "Could not generate ideas.");
  }
}
