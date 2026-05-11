import { fetchSubstackFeed } from "./rss";
import {
  assertWorkspaceTokenBudget,
  getReusableArchiveThemes,
  recordWorkspaceTokenUsage,
  replaceWorkspacePosts,
  setWorkspaceStatus,
  getWorkspaceByToken
} from "./store";
import { analyzeArchiveThemes } from "./ai";
import { AppError } from "./errors";

const INGESTION_FAILURE =
  "We could not automatically read this publication. Try checking the URL or paste post links manually.";

export async function ingestWorkspace(token: string) {
  const workspace = await getWorkspaceByToken(token);
  const previousStatus = workspace.status;
  const previousError = workspace.ingestionError;
  await assertWorkspaceTokenBudget(token, 20_000, "sync");
  await setWorkspaceStatus(token, "ingesting");

  try {
    const feed = await fetchSubstackFeed(workspace.publicationUrl, workspace.id);
    const reusableThemes = await getReusableArchiveThemes(token, feed.posts);
    const indexingTokens = 1200 + feed.posts.reduce((total, post) => total + Math.ceil(post.contentText.length / 6), 0);
    await assertWorkspaceTokenBudget(token, indexingTokens, "sync");
    await recordWorkspaceTokenUsage({
      token,
      feature: "sync",
      label: "feed fetch and chunk indexing",
      tokens: indexingTokens
    });
    const archiveThemes = reusableThemes ?? await analyzeArchiveThemes(feed.posts, feed.publicationName, { token });
    return await replaceWorkspacePosts(token, feed.publicationName, feed.posts, archiveThemes);
  } catch (error) {
    if (error instanceof AppError && error.status === 429) {
      await setWorkspaceStatus(token, previousStatus, previousError);
      throw error;
    }
    console.error("Ingestion failed", error);
    return setWorkspaceStatus(token, "failed", INGESTION_FAILURE);
  }
}
