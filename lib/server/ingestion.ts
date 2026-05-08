import type { Post } from "@/types/post";
import type { Workspace } from "@/types/workspace";
import type { ParsedFeedPost } from "./rss";
import { syncAccountWorkspaceState } from "./account-workspaces";
import { fetchPublicationFeed, fetchSubstackFeed } from "./rss";
import {
  assertWorkspaceTokenBudget,
  getPost,
  getReusableArchiveThemes,
  recordWorkspaceTokenUsage,
  replaceWorkspacePost,
  replaceWorkspacePosts,
  setWorkspaceStatus,
  getWorkspaceByToken
} from "./store";
import { analyzeArchiveThemes } from "./themes";
import { AppError } from "./errors";
import { wordCount } from "./text";

const INGESTION_FAILURE =
  "We could not automatically read this publication. Check the URL, then try syncing again.";

export async function ingestWorkspace(token: string) {
  return ingestWorkspaceWithFeed(token);
}

export async function ingestWorkspaceWithFeed(
  token: string,
  preloadedFeed?: { publicationName: string | null; posts: Post[] }
) {
  const workspace = await getWorkspaceByToken(token);
  const previousStatus = workspace.status;
  const previousError = workspace.ingestionError;
  await assertWorkspaceTokenBudget(token, 20_000);
  await setWorkspaceStatus(token, "ingesting");

  try {
    const feed = preloadedFeed ?? await fetchSubstackFeed(workspace.publicationUrl, workspace.id);
    const reusableThemes = await getReusableArchiveThemes(token, feed.posts);
    const indexingTokens = 1200 + feed.posts.reduce((total, post) => total + Math.ceil(post.contentText.length / 6), 0);
    await assertWorkspaceTokenBudget(token, indexingTokens);
    await recordWorkspaceTokenUsage({
      token,
      feature: "sync",
      label: "feed fetch and chunk indexing",
      tokens: indexingTokens
    });
    const archiveThemes = reusableThemes ?? await analyzeArchiveThemes(feed.posts, feed.publicationName, { token });
    return await mirrorWorkspaceState(
      await replaceWorkspacePosts(token, feed.publicationName, feed.posts, archiveThemes)
    );
  } catch (error) {
    if (error instanceof AppError && error.status === 429) {
      await setWorkspaceStatus(token, previousStatus, previousError);
      throw error;
    }
    console.error("Workspace sync failed", error);
    return mirrorWorkspaceState(await setWorkspaceStatus(token, "failed", INGESTION_FAILURE));
  }
}

/**
 * Publish a finished sync to the `workspaces` row Desk reads.
 *
 * Here rather than in the routes so a new sync entry point cannot leave the
 * two halves disagreeing about when the publication was last read.
 */
async function mirrorWorkspaceState(workspace: Workspace): Promise<Workspace> {
  await syncAccountWorkspaceState(workspace.token, {
    publicationName: workspace.publicationName,
    status: workspace.status,
    lastIngestedAt: workspace.lastIngestedAt,
    ingestionError: workspace.ingestionError
  });
  return workspace;
}

export async function ingestWorkspacePost(token: string, postId: string) {
  const workspace = await getWorkspaceByToken(token);
  const currentPost = await getPost(token, postId);

  const feed = await fetchPublicationFeed(workspace.publicationUrl);
  const feedPost = findMatchingFeedPost(feed.posts, currentPost);
  if (!feedPost) {
    throw new AppError("Could not find this post in the publication feed. It may be too old to refresh individually.", 404);
  }

  const indexingTokens = 400 + Math.ceil(feedPost.contentText.length / 6);
  await assertWorkspaceTokenBudget(token, indexingTokens);
  await recordWorkspaceTokenUsage({
    token,
    feature: "sync",
    label: "single post fetch and chunk indexing",
    tokens: indexingTokens
  });

  const summary = await replaceWorkspacePost(token, postId, {
    id: currentPost.id,
    workspaceId: workspace.id,
    title: feedPost.title,
    subtitle: feedPost.subtitle,
    url: feedPost.url,
    publishedAt: feedPost.publishedAt,
    author: feedPost.author,
    contentText: feedPost.contentText,
    contentHtml: feedPost.contentHtml,
    wordCount: wordCount(feedPost.contentText),
    createdAt: currentPost.createdAt
  });
  await mirrorWorkspaceState(await getWorkspaceByToken(token));
  return summary;
}

function findMatchingFeedPost(posts: ParsedFeedPost[], currentPost: Post): ParsedFeedPost | null {
  const currentUrl = feedPostUrlKey(currentPost.url);
  const byUrl = posts.find((post) => feedPostUrlKey(post.url) === currentUrl);
  if (byUrl) return byUrl;

  const currentTitle = feedPostTitleKey(currentPost.title);
  return posts.find((post) => feedPostTitleKey(post.title) === currentTitle) ?? null;
}

/** Canonical URL identity for one feed entry: no hash, no query, no trailing slash. */
function feedPostUrlKey(value: string): string {
  try {
    const url = new URL(value);
    url.hash = "";
    url.search = "";
    return url.toString().replace(/\/$/, "").toLowerCase();
  } catch {
    return value.trim().replace(/\/$/, "").toLowerCase();
  }
}

/** Fallback match key when a post's URL changed but its title did not. */
function feedPostTitleKey(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}
