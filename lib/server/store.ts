import type { GrammarIssue, RepurposeDraft, SearchResponse, SearchResult, SearchSnippet } from "@/types/ai";
import type { Post, PostChunk, PostSummary } from "@/types/post";
import type { ArchiveTheme, Workspace, WorkspaceOverview, WorkspaceStatus } from "@/types/workspace";
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

const SHORT_THEME_TERMS = new Set(["ai", "vc", "ml", "llm", "llms", "saas", "ipo", "ip"]);
const THEME_LABEL_CONNECTORS = new Set(["and", "as", "for", "in", "of", "the", "to"]);

const NON_THEME_TERMS = new Set([
  "able",
  "about",
  "above",
  "after",
  "again",
  "against",
  "almost",
  "along",
  "already",
  "also",
  "although",
  "always",
  "among",
  "another",
  "aren",
  "around",
  "because",
  "before",
  "being",
  "below",
  "between",
  "both",
  "cannot",
  "can",
  "could",
  "couldn",
  "does",
  "doesn",
  "don",
  "doing",
  "done",
  "down",
  "during",
  "each",
  "either",
  "else",
  "even",
  "ever",
  "every",
  "everything",
  "first",
  "from",
  "getting",
  "going",
  "good",
  "have",
  "hadn",
  "hasn",
  "haven",
  "having",
  "here",
  "hers",
  "himself",
  "https",
  "into",
  "itself",
  "isn",
  "just",
  "like",
  "made",
  "makes",
  "many",
  "more",
  "most",
  "much",
  "must",
  "never",
  "only",
  "other",
  "over",
  "people",
  "point",
  "really",
  "real",
  "same",
  "should",
  "shouldn",
  "since",
  "some",
  "something",
  "still",
  "such",
  "than",
  "that",
  "their",
  "them",
  "then",
  "there",
  "these",
  "they",
  "thing",
  "things",
  "this",
  "those",
  "through",
  "time",
  "under",
  "trying",
  "very",
  "want",
  "well",
  "were",
  "wasn",
  "weren",
  "what",
  "when",
  "where",
  "which",
  "while",
  "will",
  "won",
  "with",
  "work",
  "would",
  "wouldn",
  "your"
]);

const GENERIC_SINGLE_THEME_LABELS = new Set([
  "article",
  "articles",
  "culture",
  "essay",
  "essays",
  "industry",
  "piece",
  "pieces",
  "reader",
  "readers",
  "story",
  "stories",
  "theme",
  "themes",
  "writing"
]);

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
      topThemes: [],
      archiveThemes: []
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

  const archiveThemes = normalizeArchiveThemes(workspace, posts);

  return {
    token: workspace.token,
    publicationName: workspace.publicationName,
    publicationUrl: workspace.publicationUrl,
    status: workspace.status,
    postCount: posts.length,
    latestPost: posts[0] ? summarizePost(posts[0]) : null,
    topThemes: archiveThemes.map((theme) => theme.label),
    archiveThemes,
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

export async function getReusableArchiveThemes(token: string, incomingPosts: Post[]): Promise<ArchiveTheme[] | null> {
  const db = await readDb();
  const workspace = db.workspaces.find((item) => item.token === token);
  if (!workspace?.archiveThemes?.length) return null;

  const existingPosts = db.posts.filter((post) => post.workspaceId === workspace.id);
  if (existingPosts.length === 0 || incomingPosts.length === 0) return null;
  if (!isStableArchivePostSet(existingPosts, incomingPosts)) return null;

  const reusableThemes = normalizeArchiveThemes(workspace, existingPosts);
  if (!hasReusableThemeQuality(reusableThemes)) return null;
  return reusableThemes;
}

export async function replaceWorkspacePosts(
  token: string,
  publicationName: string | null,
  posts: Post[],
  archiveThemes?: ArchiveTheme[]
) {
  return mutateDb((db) => {
    const workspace = db.workspaces.find((item) => item.token === token);
    if (!workspace) throw new AppError("Workspace not found.", 404);

    const existingByUrl = new Map(
      db.posts.filter((post) => post.workspaceId === workspace.id).map((post) => [post.url, post])
    );
    const existingByTitle = uniquePostMap(
      db.posts.filter((post) => post.workspaceId === workspace.id),
      (post) => normalizePostTitle(post.title)
    );
    const mergedPosts = posts.map(
      (post) => existingByUrl.get(post.url) ?? existingByTitle.get(normalizePostTitle(post.title)) ?? post
    );
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

    const detectedThemes = archiveThemes?.length
      ? normalizeProvidedArchiveThemes(archiveThemes, mergedPosts)
      : detectArchiveThemes(mergedPosts);

    workspace.publicationName = publicationName ?? workspace.publicationName;
    workspace.archiveThemes = detectedThemes;
    workspace.topThemes = detectedThemes.map((theme) => theme.label);
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

export async function listRepurposeDrafts(token: string): Promise<RepurposeDraft[]> {
  return mutateDb((db) => {
    const workspace = db.workspaces.find((item) => item.token === token);
    if (!workspace) throw new AppError("Workspace not found.", 404);

    // Lazy migration: old lifecycle labels collapse into the current two-state
    // vocabulary: pending work and saved work.
    for (const draft of db.repurposeDrafts) {
      if ((draft.status as string) === "generated") {
        draft.status = "pending";
      }
      if ((draft.status as string) === "approved") {
        draft.status = "saved";
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

// Literal substring search across a workspace's post bodies. Case-insensitive,
// returns up to MAX_SNIPPETS_PER_POST snippets per post with SNIPPET_PADDING
// chars of surrounding context. The match string preserves the original
// casing as it appears in the post (so the deep-link Text Fragment lands).
const SEARCH_SNIPPET_PADDING = 60;
const SEARCH_MAX_SNIPPETS_PER_POST = 3;

export async function searchWorkspacePosts(token: string, rawQuery: string): Promise<SearchResponse> {
  const query = rawQuery.trim();
  if (!query) {
    return { query: "", results: [], totalMatches: 0, totalPosts: 0 };
  }

  const db = await readDb();
  const workspace = db.workspaces.find((item) => item.token === token);
  if (!workspace) throw new AppError("Workspace not found.", 404);

  const posts = db.posts
    .filter((post) => post.workspaceId === workspace.id)
    .sort((a, b) => Date.parse(b.publishedAt ?? b.createdAt) - Date.parse(a.publishedAt ?? a.createdAt));

  const lowerQuery = query.toLowerCase();
  const queryLength = query.length;
  const results: SearchResult[] = [];
  let totalMatches = 0;

  for (const post of posts) {
    const text = post.contentText;
    if (!text) continue;
    const lower = text.toLowerCase();

    const indices: number[] = [];
    let cursor = 0;
    while (cursor <= lower.length - queryLength) {
      const found = lower.indexOf(lowerQuery, cursor);
      if (found === -1) break;
      indices.push(found);
      cursor = found + queryLength;
    }
    if (indices.length === 0) continue;

    const snippets: SearchSnippet[] = indices.slice(0, SEARCH_MAX_SNIPPETS_PER_POST).map((idx) => {
      const start = Math.max(0, idx - SEARCH_SNIPPET_PADDING);
      const end = Math.min(text.length, idx + queryLength + SEARCH_SNIPPET_PADDING);
      // Collapse whitespace in context so a snippet doesn't break with stray
      // newlines from the original article body.
      const before = text.slice(start, idx).replace(/\s+/g, " ").trimStart();
      const after = text.slice(idx + queryLength, end).replace(/\s+/g, " ").trimEnd();
      return {
        before,
        match: text.slice(idx, idx + queryLength),
        after,
      };
    });

    totalMatches += indices.length;
    results.push({
      postId: post.id,
      postTitle: post.title,
      postUrl: post.url,
      publishedAt: post.publishedAt,
      matchCount: indices.length,
      snippets,
    });
  }

  return {
    query,
    results,
    totalMatches,
    totalPosts: results.length,
  };
}

export async function listGrammarIssues(token: string): Promise<GrammarIssue[]> {
  const db = await readDb();
  const workspace = db.workspaces.find((item) => item.token === token);
  if (!workspace) throw new AppError("Workspace not found.", 404);
  return db.grammarIssues
    .filter((issue) => issue.workspaceId === workspace.id)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

function normalizeArchiveThemes(workspace: Workspace, posts: Post[]): ArchiveTheme[] {
  const seen = new Set<string>();
  const storedThemes: ArchiveTheme[] = workspace.archiveThemes?.length ? workspace.archiveThemes : workspace.topThemes.map((label) => ({
    label,
    description: `A recurring archive pattern around ${label}.`,
    evidencePostIds: [],
    confidence: 0.45
  }));
  const themes = storedThemes
    .map((theme) => ({
      label: cleanThemeLabel(theme.label),
      description: normalizeThemeDescription(theme.description ?? "", cleanThemeLabel(theme.label)),
      evidencePostIds: Array.isArray(theme.evidencePostIds) ? theme.evidencePostIds.slice(0, 5) : [],
      confidence: clampConfidence(theme.confidence),
      level: theme.level === "field" || theme.level === "subtheme" || theme.level === "motif" ? theme.level : "subtheme",
      parentLabel: typeof theme.parentLabel === "string" && theme.parentLabel.trim() ? cleanThemeLabel(theme.parentLabel) : null,
      aliases: Array.isArray(theme.aliases) ? theme.aliases.map(cleanThemeLabel).filter(Boolean).slice(0, 8) : [],
      importance: clampConfidence(theme.importance ?? theme.confidence),
      breadth: clampConfidence(theme.breadth ?? (theme.level === "field" ? 0.75 : 0.45))
    }))
    .filter((theme) => {
      const key = theme.label.toLowerCase();
      if (!isUsefulThemeLabel(theme.label) || seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  return (themes.length ? themes : detectArchiveThemes(posts))
    .sort(compareArchiveThemes)
    .slice(0, 15);
}

function normalizeProvidedArchiveThemes(themes: ArchiveTheme[], posts: Post[]): ArchiveTheme[] {
  const workspace: Workspace = {
    id: "",
    token: "",
    publicationUrl: "",
    publicationName: null,
    status: "ready",
    createdAt: "",
    updatedAt: "",
    lastIngestedAt: null,
    ingestionError: null,
    topThemes: themes.map((theme) => theme.label),
    archiveThemes: themes
  };
  return normalizeArchiveThemes(workspace, posts);
}

function hasReusableThemeQuality(themes: ArchiveTheme[]): boolean {
  if (themes.length < 4) return false;
  return !themes.some((theme) => isGenericThemeDescription(theme.description));
}

function isGenericThemeDescription(description: string): boolean {
  return /^You return to .+ as a recurring lens in your archive\.$/i.test(description.trim());
}

function isStableArchivePostSet(existingPosts: Post[], incomingPosts: Post[]): boolean {
  const existingTitles = existingPosts.map((post) => normalizePostTitle(post.title)).filter(Boolean);
  const incomingTitles = incomingPosts.map((post) => normalizePostTitle(post.title)).filter(Boolean);
  const existingUrls = existingPosts.map((post) => normalizePostUrl(post.url)).filter(Boolean);
  const incomingUrls = incomingPosts.map((post) => normalizePostUrl(post.url)).filter(Boolean);

  const existingTitleSignature = signature(existingTitles);
  const incomingTitleSignature = signature(incomingTitles);
  const existingUrlSignature = signature(existingUrls);
  const incomingUrlSignature = signature(incomingUrls);

  if (existingTitleSignature.length > 0 && existingTitleSignature === incomingTitleSignature) return true;
  if (existingUrlSignature.length > 0 && existingUrlSignature === incomingUrlSignature) return true;

  return isMinorArchiveDelta(existingUrls, incomingUrls) || isMinorArchiveDelta(existingTitles, incomingTitles);
}

function isMinorArchiveDelta(existingValues: string[], incomingValues: string[]): boolean {
  if (existingValues.length === 0 || incomingValues.length === 0) return false;
  const existing = new Set(existingValues);
  const incoming = new Set(incomingValues);
  const overlap = [...existing].filter((value) => incoming.has(value)).length;
  const smallerSize = Math.min(existing.size, incoming.size);
  const countDelta = Math.abs(existing.size - incoming.size);
  const allowedDelta = Math.max(1, Math.floor(smallerSize * 0.08));

  return overlap / smallerSize >= 0.92 && countDelta <= allowedDelta;
}

function uniquePostMap(posts: Post[], keyForPost: (post: Post) => string): Map<string, Post> {
  const byKey = new Map<string, Post>();
  const duplicates = new Set<string>();
  for (const post of posts) {
    const key = keyForPost(post);
    if (!key) continue;
    if (byKey.has(key)) {
      duplicates.add(key);
      continue;
    }
    byKey.set(key, post);
  }
  for (const key of duplicates) {
    byKey.delete(key);
  }
  return byKey;
}

function signature(values: string[]): string {
  return values.filter(Boolean).sort().join("\n");
}

function normalizePostTitle(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^\w\s-]/g, "")
    .trim();
}

function normalizePostUrl(value: string): string {
  return value
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/$/, "")
    .trim();
}

function cleanThemeLabel(label: string): string {
  return label
    .replace(/\s+/g, " ")
    .replace(/^[\s"'`]+|[\s"'`.!?]+$/g, "")
    .trim();
}

function normalizeThemeDescription(description: string, label: string): string {
  const cleaned = description
    .replace(/\s+/g, " ")
    .replace(/^[\s"'`]+|[\s"'`.!?]+$/g, "")
    .trim();
  if (!isUsefulThemeDescription(cleaned)) {
    return `You return to ${label.toLowerCase()} as a recurring lens in your archive.`;
  }
  if (/^You\b/.test(cleaned)) return ensureSentence(cleaned);
  return ensureSentence(`You ${cleaned.charAt(0).toLowerCase()}${cleaned.slice(1)}`);
}

function isUsefulThemeDescription(description: string): boolean {
  const lower = description.toLowerCase();
  if (!lower) return false;
  if (/\b(candidate|label)\b/.test(lower)) return false;
  if (/\bappears?\s+in\s+(?:the\s+)?(?:title|subtitle|article|post)/.test(lower)) return false;
  if (/^this\s+(?:appears|shows up|recurs|is present|candidate)/.test(lower)) return false;
  if (/^a recurring archive pattern around\b/.test(lower)) return false;
  return true;
}

function ensureSentence(value: string): string {
  return /[.!?]$/.test(value) ? value : `${value}.`;
}

function clampConfidence(value: number): number {
  if (!Number.isFinite(value)) return 0.5;
  return Math.min(1, Math.max(0, value));
}

function detectArchiveThemes(posts: Post[]): ArchiveTheme[] {
  const postCounts = new Map<string, Set<string>>();
  const weightedCounts = new Map<string, number>();
  for (const post of posts) {
    const title = post.title.toLowerCase().replace(/https?:\/\/\S+/g, " ");
    const subtitle = (post.subtitle ?? "").toLowerCase().replace(/https?:\/\/\S+/g, " ");
    const body = post.contentText.toLowerCase().replace(/https?:\/\/\S+/g, " ");
    const titleTerms = extractThemeTerms(`${title} ${subtitle}`, 3, true);
    const bodyTerms = extractThemeTerms(body, 3, false);

    for (const term of [...titleTerms, ...bodyTerms]) {
      const seenInPosts = postCounts.get(term) ?? new Set<string>();
      seenInPosts.add(post.id);
      postCounts.set(term, seenInPosts);
    }
    for (const term of titleTerms) {
      weightedCounts.set(term, (weightedCounts.get(term) ?? 0) + 4);
    }
    for (const term of bodyTerms) {
      weightedCounts.set(term, (weightedCounts.get(term) ?? 0) + 1);
    }
  }

  const maxPosts = Math.max(posts.length, 1);
  const scoredThemes = [...weightedCounts.entries()]
    .map(([term, weight]) => {
      const evidencePostIds = [...(postCounts.get(term) ?? new Set<string>())];
      const archiveReach = evidencePostIds.length / maxPosts;
      return {
        label: term,
        description: `A recurring archive pattern around ${term}.`,
        evidencePostIds: evidencePostIds.slice(0, 5),
        confidence: Math.min(0.9, 0.35 + archiveReach * 0.45 + Math.min(weight / 120, 0.1)),
        level: term.includes(" ") ? "subtheme" as const : "field" as const,
        parentLabel: null,
        aliases: [],
        importance: Math.min(0.9, 0.35 + archiveReach * 0.45 + Math.min(weight / 120, 0.1)),
        breadth: term.includes(" ") ? 0.45 : 0.65,
        score: weight + evidencePostIds.length * 8
      };
    })
    .filter((theme) => isUsefulThemeLabel(theme.label))
    .sort((a, b) => b.score - a.score);
  const recurringThemes = scoredThemes.filter((theme) => theme.evidencePostIds.length > 1 || posts.length <= 2);

  return (recurringThemes.length ? recurringThemes : scoredThemes)
    .slice(0, 12)
    .map(({ score: _score, ...theme }) => theme);
}

function compareArchiveThemes(a: ArchiveTheme, b: ArchiveTheme): number {
  const levelRank = (theme: ArchiveTheme) => theme.level === "field" ? 0 : theme.level === "subtheme" ? 1 : 2;
  const byLevel = levelRank(a) - levelRank(b);
  if (byLevel !== 0) return byLevel;
  const byImportance = (b.importance ?? b.confidence) - (a.importance ?? a.confidence);
  if (byImportance !== 0) return byImportance;
  return (b.breadth ?? 0) - (a.breadth ?? 0);
}

function extractThemeTerms(text: string, maxWords: 2 | 3, includeSingleWords: boolean): string[] {
  const words = text.match(/\b[a-z][a-z-]{1,}\b/g) ?? [];
  const terms: string[] = [];

  if (includeSingleWords) {
    for (const word of words) {
      if (isUsefulThemeLabel(word)) terms.push(word);
    }
  }

  for (let size = 2; size <= maxWords; size += 1) {
    for (let i = 0; i <= words.length - size; i += 1) {
      const phraseWords = words.slice(i, i + size);
      const phrase = phraseWords.join(" ");
      if (!isUsefulThemeLabel(phrase)) continue;
      terms.push(phrase);
    }
  }

  return terms;
}

function isUsefulThemeLabel(label: string): boolean {
  const clean = cleanThemeLabel(label).toLowerCase();
  if (clean.length < 2 || /^\d+$/.test(clean)) return false;
  const words = clean.split(/\s+/);
  if (words.length === 1 && GENERIC_SINGLE_THEME_LABELS.has(clean)) return false;
  if (words[0] === "valley" || words[words.length - 1] === "wasn") return false;
  if (THEME_LABEL_CONNECTORS.has(words[0]) || THEME_LABEL_CONNECTORS.has(words[words.length - 1])) return false;
  if (words.some((word, index) => {
    const isConnector = index > 0 && index < words.length - 1 && THEME_LABEL_CONNECTORS.has(word);
    return !isConnector && (NON_THEME_TERMS.has(word) || (word.length < 4 && !SHORT_THEME_TERMS.has(word)));
  })) return false;
  if (words.length === 1 && NON_THEME_TERMS.has(clean)) return false;
  return true;
}
