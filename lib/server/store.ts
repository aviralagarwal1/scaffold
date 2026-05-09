import type { GrammarIssue, RepurposeDraft } from "@/types/ai";
import type { Post, PostChunk, PostSummary } from "@/types/post";
import type { Workspace, WorkspaceOverview, WorkspaceStatus } from "@/types/workspace";
import { randomBytes, randomUUID } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { AppError } from "./errors";
import { chunkText, excerpt } from "./text";

interface Database {
  workspaces: Workspace[];
  posts: Post[];
  chunks: PostChunk[];
  repurposeDrafts: RepurposeDraft[];
  grammarIssues: GrammarIssue[];
}

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "substack-ai.json");

const emptyDb = (): Database => ({
  workspaces: [],
  posts: [],
  chunks: [],
  repurposeDrafts: [],
  grammarIssues: []
});

async function readDb(): Promise<Database> {
  try {
    const raw = await readFile(DATA_FILE, "utf8");
    return { ...emptyDb(), ...JSON.parse(raw) };
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return emptyDb();
    }
    throw error;
  }
}

async function writeDb(db: Database): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify(db, null, 2), "utf8");
}

async function mutateDb<T>(mutator: (db: Database) => T | Promise<T>): Promise<T> {
  const db = await readDb();
  const result = await mutator(db);
  await writeDb(db);
  return result;
}

function newToken(): string {
  return randomBytes(24).toString("base64url");
}

export function summarizePost(post: Post): PostSummary {
  return {
    id: post.id,
    title: post.title,
    subtitle: post.subtitle,
    url: post.url,
    publishedAt: post.publishedAt,
    author: post.author,
    wordCount: post.wordCount,
    excerpt: excerpt(post.contentText)
  };
}

export async function createWorkspace(publicationUrl: string): Promise<Workspace> {
  return mutateDb((db) => {
    let token = newToken();
    while (db.workspaces.some((workspace) => workspace.token === token)) {
      token = newToken();
    }

    const now = new Date().toISOString();
    const workspace: Workspace = {
      id: randomUUID(),
      token,
      publicationUrl,
      publicationName: null,
      status: "pending",
      createdAt: now,
      updatedAt: now,
      lastIngestedAt: null,
      ingestionError: null,
      topThemes: []
    };
    db.workspaces.push(workspace);
    return workspace;
  });
}

export async function getWorkspaceByToken(token: string): Promise<Workspace> {
  const db = await readDb();
  const workspace = db.workspaces.find((item) => item.token === token);
  if (!workspace) throw new AppError("Workspace not found.", 404);
  return workspace;
}

export async function getWorkspaceOverview(token: string): Promise<WorkspaceOverview> {
  const db = await readDb();
  const workspace = db.workspaces.find((item) => item.token === token);
  if (!workspace) throw new AppError("Workspace not found.", 404);
  const posts = db.posts
    .filter((post) => post.workspaceId === workspace.id)
    .sort((a, b) => Date.parse(b.publishedAt ?? b.createdAt) - Date.parse(a.publishedAt ?? a.createdAt));

  return {
    token: workspace.token,
    publicationName: workspace.publicationName,
    publicationUrl: workspace.publicationUrl,
    status: workspace.status,
    postCount: posts.length,
    latestPost: posts[0] ? summarizePost(posts[0]) : null,
    topThemes: workspace.topThemes,
    lastIngestedAt: workspace.lastIngestedAt,
    ingestionError: workspace.ingestionError
  };
}

export async function setWorkspaceStatus(token: string, status: WorkspaceStatus, ingestionError: string | null = null) {
  return mutateDb((db) => {
    const workspace = db.workspaces.find((item) => item.token === token);
    if (!workspace) throw new AppError("Workspace not found.", 404);
    workspace.status = status;
    workspace.ingestionError = ingestionError;
    workspace.updatedAt = new Date().toISOString();
    return workspace;
  });
}

export async function replaceWorkspacePosts(token: string, publicationName: string | null, posts: Post[]) {
  return mutateDb((db) => {
    const workspace = db.workspaces.find((item) => item.token === token);
    if (!workspace) throw new AppError("Workspace not found.", 404);

    const existingByUrl = new Map(
      db.posts.filter((post) => post.workspaceId === workspace.id).map((post) => [post.url, post])
    );
    const mergedPosts = posts.map((post) => existingByUrl.get(post.url) ?? post);
    const postIds = new Set(mergedPosts.map((post) => post.id));

    db.posts = db.posts.filter((post) => post.workspaceId !== workspace.id || postIds.has(post.id));
    for (const post of mergedPosts) {
      if (!db.posts.some((existing) => existing.id === post.id)) {
        db.posts.push(post);
      }
    }

    db.chunks = db.chunks.filter((chunk) => chunk.workspaceId !== workspace.id);
    const now = new Date().toISOString();
    for (const post of mergedPosts) {
      chunkText(`${post.title}\n\n${post.contentText}`).forEach((content, chunkIndex) => {
        db.chunks.push({
          id: randomUUID(),
          workspaceId: workspace.id,
          postId: post.id,
          chunkIndex,
          content,
          createdAt: now
        });
      });
    }

    workspace.publicationName = publicationName ?? workspace.publicationName;
    workspace.topThemes = detectThemes(mergedPosts);
    workspace.status = mergedPosts.length > 0 ? "ready" : "partial";
    workspace.ingestionError = mergedPosts.length > 0 ? null : "No public posts were found in the feed.";
    workspace.lastIngestedAt = now;
    workspace.updatedAt = now;

    return workspace;
  });
}

export async function listPosts(token: string): Promise<PostSummary[]> {
  const db = await readDb();
  const workspace = db.workspaces.find((item) => item.token === token);
  if (!workspace) throw new AppError("Workspace not found.", 404);

  return db.posts
    .filter((post) => post.workspaceId === workspace.id)
    .sort((a, b) => Date.parse(b.publishedAt ?? b.createdAt) - Date.parse(a.publishedAt ?? a.createdAt))
    .map(summarizePost);
}

export async function getPost(token: string, postId: string): Promise<Post> {
  const db = await readDb();
  const workspace = db.workspaces.find((item) => item.token === token);
  if (!workspace) throw new AppError("Workspace not found.", 404);
  const post = db.posts.find((item) => item.workspaceId === workspace.id && item.id === postId);
  if (!post) throw new AppError("Post not found.", 404);
  return post;
}

export async function workspaceCorpus(token: string): Promise<{ workspace: Workspace; posts: Post[]; chunks: PostChunk[] }> {
  const db = await readDb();
  const workspace = db.workspaces.find((item) => item.token === token);
  if (!workspace) throw new AppError("Workspace not found.", 404);
  return {
    workspace,
    posts: db.posts.filter((post) => post.workspaceId === workspace.id),
    chunks: db.chunks.filter((chunk) => chunk.workspaceId === workspace.id)
  };
}

export async function addRepurposeDrafts(token: string, drafts: Omit<RepurposeDraft, "id" | "workspaceId" | "createdAt" | "updatedAt">[]) {
  return mutateDb((db) => {
    const workspace = db.workspaces.find((item) => item.token === token);
    if (!workspace) throw new AppError("Workspace not found.", 404);
    const now = new Date().toISOString();
    const saved = drafts.map((draft) => ({
      ...draft,
      id: randomUUID(),
      workspaceId: workspace.id,
      createdAt: now,
      updatedAt: now
    }));
    db.repurposeDrafts.push(...saved);
    return saved;
  });
}

// Pending drafts that haven't been saved or approved within this window get
// auto-deleted on the next read. Twenty-four hours matches the user's mental
// model — a writer who comes back the next day shouldn't see stale drafts.
const PENDING_LIFETIME_MS = 24 * 60 * 60 * 1000;

export async function listRepurposeDrafts(token: string): Promise<RepurposeDraft[]> {
  return mutateDb((db) => {
    const workspace = db.workspaces.find((item) => item.token === token);
    if (!workspace) throw new AppError("Workspace not found.", 404);

    const now = Date.now();
    const nowIso = new Date().toISOString();

    // Lazy migration: any "generated" status from the old taxonomy becomes
    // "pending" so the rest of the app sees a single consistent vocabulary.
    for (const draft of db.repurposeDrafts) {
      if ((draft.status as string) === "generated") {
        draft.status = "pending";
      }
    }

    // Expire pending drafts older than the lifetime. Soft-delete (status
    // becomes "deleted") so we never lose history mid-session.
    for (const draft of db.repurposeDrafts) {
      if (
        draft.workspaceId === workspace.id &&
        draft.status === "pending" &&
        now - Date.parse(draft.createdAt) > PENDING_LIFETIME_MS
      ) {
        draft.status = "deleted";
        draft.updatedAt = nowIso;
      }
    }

    return db.repurposeDrafts
      .filter((draft) => draft.workspaceId === workspace.id && draft.status !== "deleted")
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  });
}

export async function updateRepurposeDraft(token: string, draftId: string, patch: Partial<Pick<RepurposeDraft, "status" | "content" | "title">>) {
  return mutateDb((db) => {
    const workspace = db.workspaces.find((item) => item.token === token);
    if (!workspace) throw new AppError("Workspace not found.", 404);
    const draft = db.repurposeDrafts.find((item) => item.workspaceId === workspace.id && item.id === draftId);
    if (!draft) throw new AppError("Draft not found.", 404);
    if (patch.status !== undefined) draft.status = patch.status;
    if (patch.content !== undefined) draft.content = patch.content;
    if (patch.title !== undefined) draft.title = patch.title;
    draft.updatedAt = new Date().toISOString();
    return draft;
  });
}

export async function replaceGrammarIssues(token: string, issues: Omit<GrammarIssue, "id" | "workspaceId" | "createdAt">[]) {
  return mutateDb((db) => {
    const workspace = db.workspaces.find((item) => item.token === token);
    if (!workspace) throw new AppError("Workspace not found.", 404);
    db.grammarIssues = db.grammarIssues.filter((issue) => issue.workspaceId !== workspace.id);
    const now = new Date().toISOString();
    const saved = issues.map((issue) => ({
      ...issue,
      id: randomUUID(),
      workspaceId: workspace.id,
      createdAt: now
    }));
    db.grammarIssues.push(...saved);
    return saved;
  });
}

export async function listGrammarIssues(token: string): Promise<GrammarIssue[]> {
  const db = await readDb();
  const workspace = db.workspaces.find((item) => item.token === token);
  if (!workspace) throw new AppError("Workspace not found.", 404);
  return db.grammarIssues
    .filter((issue) => issue.workspaceId === workspace.id)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

function detectThemes(posts: Post[]): string[] {
  const stopWords = new Set([
    "about",
    "after",
    "again",
    "also",
    "because",
    "before",
    "being",
    "could",
    "every",
    "their",
    "there",
    "these",
    "thing",
    "those",
    "through",
    "where",
    "which",
    "while",
    "would",
    "with",
    "your",
    "https",
    "http",
    "www",
    "com",
    "substack",
    "from",
    "have",
    "this",
    "that",
    "into"
  ]);

  const counts = new Map<string, number>();
  for (const post of posts) {
    const text = `${post.title} ${post.contentText}`.toLowerCase().replace(/https?:\/\/\S+/g, " ");
    for (const word of text.match(/\b[a-z][a-z-]{4,}\b/g) ?? []) {
      if (!stopWords.has(word)) {
        counts.set(word, (counts.get(word) ?? 0) + 1);
      }
    }
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([word]) => word);
}
