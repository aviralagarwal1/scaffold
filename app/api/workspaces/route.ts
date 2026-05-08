import type { CreateWorkspaceRequest } from "@/types/workspace";
import { NextResponse } from "next/server";
import { apiError } from "@/lib/server/errors";
import { readJson, requireString } from "@/lib/server/http";
import { ingestWorkspace } from "@/lib/server/ingestion";
import { createWorkspace, getWorkspaceOverview } from "@/lib/server/store";
import { normalizePublicationUrl } from "@/lib/server/url";

export async function POST(request: Request) {
  try {
    const body = await readJson<CreateWorkspaceRequest>(request);
    const publicationUrl = normalizePublicationUrl(requireString(body.publicationUrl, "Enter a Substack URL."));
    const workspace = await createWorkspace(publicationUrl);
    await ingestWorkspace(workspace.token);
    const overview = await getWorkspaceOverview(workspace.token);

    return NextResponse.json({
      token: workspace.token,
      workspaceUrl: `/workspace/${workspace.token}`,
      status: overview.status
    });
  } catch (error) {
    return apiError(error, "Could not create workspace.");
  }
}
