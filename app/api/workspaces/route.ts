import type { CreateWorkspaceRequest } from "@/types/workspace";
import { NextResponse } from "next/server";
import { getCurrentUserId, requireCurrentUserId } from "@/lib/server/auth/current";
import { listAccountWorkspaces, recordOwnedWorkspace } from "@/lib/server/account-workspaces";
import { apiError } from "@/lib/server/errors";
import { readJson, requireString } from "@/lib/server/http";
import { ingestWorkspace } from "@/lib/server/ingestion";
import { createWorkspace, getWorkspaceOverview } from "@/lib/server/store";
import { normalizePublicationUrl } from "@/lib/server/url";

export async function GET() {
  try {
    const userId = await requireCurrentUserId();
    return NextResponse.json(await listAccountWorkspaces(userId));
  } catch (error) {
    return apiError(error, "Could not load workspaces.");
  }
}

export async function POST(request: Request) {
  try {
    const body = await readJson<CreateWorkspaceRequest>(request);
    const publicationUrl = normalizePublicationUrl(requireString(body.publicationUrl, "Enter a publication URL."));
    const workspace = await createWorkspace(publicationUrl);
    await ingestWorkspace(workspace.token);
    const overview = await getWorkspaceOverview(workspace.token);
    const userId = await getCurrentUserId();
    if (userId && process.env.DATABASE_URL) {
      await recordOwnedWorkspace(userId, {
        token: workspace.token,
        publicationUrl,
        publicationName: overview.publicationName,
        status: overview.status,
        lastIngestedAt: overview.lastIngestedAt,
        ingestionError: overview.ingestionError,
      });
    }

    return NextResponse.json({
      token: workspace.token,
      workspaceUrl: `/workspace/${workspace.token}`,
      status: overview.status
    });
  } catch (error) {
    return apiError(error, "Could not create workspace.");
  }
}
