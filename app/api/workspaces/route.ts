import type { CreateWorkspaceRequest } from "@/types/workspace";
import { NextResponse } from "next/server";
import { requireCurrentUserId } from "@/lib/server/auth/current";
import { listAccountWorkspaces, recordOwnedWorkspace } from "@/lib/server/account-workspaces";
import { apiError, AppError } from "@/lib/server/errors";
import { readJson, requireString } from "@/lib/server/http";
import { ingestWorkspaceWithFeed } from "@/lib/server/ingestion";
import { fetchPublicationFeed, materializeFeedPosts } from "@/lib/server/rss";
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
    const userId = await requireCurrentUserId();
    const body = await readJson<CreateWorkspaceRequest>(request);
    const publicationUrl = normalizePublicationUrl(requireString(body.publicationUrl, "Enter a publication URL."));
    const feed = await readInitialPublicationFeed(publicationUrl);
    const workspace = await createWorkspace(publicationUrl);
    await ingestWorkspaceWithFeed(workspace.token, {
      publicationName: feed.publicationName,
      posts: materializeFeedPosts(feed, workspace.id),
    });
    const overview = await getWorkspaceOverview(workspace.token);
    if (process.env.DATABASE_URL) {
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

async function readInitialPublicationFeed(publicationUrl: string) {
  let feed: Awaited<ReturnType<typeof fetchPublicationFeed>>;
  try {
    feed = await fetchPublicationFeed(publicationUrl);
  } catch {
    throw new AppError("We couldn't find a public publication feed at that URL. Try the publication homepage.", 400);
  }

  if (feed.posts.length === 0) {
    throw new AppError("We found the publication feed, but there are no public posts to read yet.", 400);
  }

  return feed;
}
