import { fetchSubstackFeed } from "./rss";
import { replaceWorkspacePosts, setWorkspaceStatus, getWorkspaceByToken } from "./store";
import { analyzeArchiveThemes } from "./ai";

const INGESTION_FAILURE =
  "We could not automatically read this Substack. Try checking the URL or paste post links manually.";

export async function ingestWorkspace(token: string) {
  const workspace = await getWorkspaceByToken(token);
  await setWorkspaceStatus(token, "ingesting");

  try {
    const feed = await fetchSubstackFeed(workspace.publicationUrl, workspace.id);
    const archiveThemes = await analyzeArchiveThemes(feed.posts, feed.publicationName);
    return await replaceWorkspacePosts(token, feed.publicationName, feed.posts, archiveThemes);
  } catch (error) {
    console.error("Ingestion failed", error);
    return setWorkspaceStatus(token, "failed", INGESTION_FAILURE);
  }
}
