import { NextResponse } from "next/server";
import { apiError } from "@/lib/server/errors";
import { ingestWorkspace } from "@/lib/server/ingestion";
import { getWorkspaceOverview } from "@/lib/server/store";

type RouteContext = { params: Promise<{ token: string }> };

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { token } = await context.params;
    await ingestWorkspace(token);
    return NextResponse.json(await getWorkspaceOverview(token));
  } catch (error) {
    return apiError(error, "Could not ingest archive.");
  }
}
