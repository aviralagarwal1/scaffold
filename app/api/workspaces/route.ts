import type { CreateWorkspaceRequest } from "@/types/workspace";
import { NextResponse } from "next/server";
import { requireCurrentUserId } from "@/lib/server/auth/current";
import {
  assertCanCreateAccountWorkspace,
  findOwnedWorkspaceToken,
  listAccountWorkspaces,
  recordOwnedWorkspace,
} from "@/lib/server/account-workspaces";
import { apiError, AppError } from "@/lib/server/errors";
import { readJson, requireString } from "@/lib/server/http";
import { ingestWorkspaceWithFeed } from "@/lib/server/ingestion";
import { fetchPublicationFeed, materializeFeedPosts } from "@/lib/server/rss";
import { createWorkspace, findWorkspaceByToken, getWorkspaceOverview } from "@/lib/server/store";
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
    await assertCanCreateAccountWorkspace(userId, publicationUrl);
    const feed = await readInitialPublicationFeed(publicationUrl);
    // Adding a publication twice re-opens the workspace it already has. Minting
    // a second one would hand the account a new token and strand the first
    // workspace's library, drafts and notes with no way back.
    const workspace = (await findExistingWorkspace(userId, publicationUrl)) ?? (await createWorkspace(publicationUrl));
    await recordOwnedWorkspace(userId, {
      token: workspace.token,
      publicationUrl,
      publicationName: workspace.publicationName,
      status: workspace.status,
      lastIngestedAt: workspace.lastIngestedAt,
      ingestionError: workspace.ingestionError,
    });
    await ingestWorkspaceWithFeed(workspace.token, {
      publicationName: feed.publicationName,
      posts: materializeFeedPosts(feed, workspace.id),
    });
    // The sync publishes its own result to the workspaces row, so there is no
    // second mirror write here.
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

/** The workspace this account already keeps for a publication, if it still has a corpus. */
async function findExistingWorkspace(userId: string, publicationUrl: string) {
  const token = await findOwnedWorkspaceToken(userId, publicationUrl);
  return token ? findWorkspaceByToken(token) : null;
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
