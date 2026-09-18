import type { GrammarIssue, Idea, RepurposeDraft, SavedIdea, SearchResponse, SearchResult, SearchSnippet, SourceCitation } from "@/types/ai";
import type { Post, PostChunk, PostSummary } from "@/types/post";
import type { ArchiveTheme, TokenUsageFeature, TokenUsageSummary, Workspace, WorkspaceOverview, WorkspaceStatus } from "@/types/workspace";
import { randomBytes, randomUUID } from "crypto";
import { and, desc, eq, gte, inArray, isNull, lt, or, sql as sqlExpr } from "drizzle-orm";
import { mkdir, readFile, rename, writeFile } from "fs/promises";
import path from "path";
import { getDb } from "@/lib/server/db";
import {
  appState,
  savedIdeas as savedIdeaRows,
  tokenUsageEvents as tokenUsageRows,
  users,
  workspaces as workspaceRows,
} from "@/lib/server/db/schema";
import { planConfig } from "@/lib/server/plans";
import { AppError } from "./errors";
import { normalizePostTitle, uniquePostMap } from "./post-identity";
import { chunkText, excerpt } from "./text";
import {
  detectArchiveThemes,
  hasReusableThemeQuality,
  isStableArchivePostSet,
  normalizeArchiveThemes,
  normalizeProvidedArchiveThemes,
} from "./themes";

interface Database {
  workspaces: Workspace[];
  posts: Post[];
  chunks: PostChunk[];
  repurposeDrafts: RepurposeDraft[];
  grammarIssues: GrammarIssue[];
  savedIdeas: SavedIdea[];
}

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "substack-ai.json");
const APP_STATE_KEY = "workspace-store";
let mutationQueue = Promise.resolve();
let dbCache: { value: Database; loadedAt: number } | null = null;
let dbReadInFlight: Promise<Database> | null = null;
const TOKEN_USAGE_RETENTION_MS = 1000 * 60 * 60 * 24 * 370;
const DEFAULT_TOKEN_USAGE_TIME_ZONE = "America/New_York";
const DB_CACHE_TTL_MS = 30_000;

const emptyDb = (): Database => ({
  workspaces: [],
  posts: [],
  chunks: [],
  repurposeDrafts: [],
  grammarIssues: [],
  savedIdeas: []
});

async function readDb(): Promise<Database> {
  if (process.env.DATABASE_URL) {
    if (dbCache && Date.now() - dbCache.loadedAt < DB_CACHE_TTL_MS) {
      return dbCache.value;
    }
    if (dbReadInFlight) return dbReadInFlight;

    dbReadInFlight = (async () => {
      const db = getDb();
      const [row] = await db
        .select({ value: appState.value })
        .from(appState)
        .where(eq(appState.key, APP_STATE_KEY))
        .limit(1);
      const value = { ...emptyDb(), ...((row?.value as Partial<Database> | undefined) ?? {}) };
      dbCache = { value, loadedAt: Date.now() };
      return value;
    })().finally(() => {
      dbReadInFlight = null;
    });
    return dbReadInFlight;
  }

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
  if (process.env.DATABASE_URL) {
    const database = getDb();
    await database
      .insert(appState)
      .values({ key: APP_STATE_KEY, value: db, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: appState.key,
        set: { value: db, updatedAt: new Date() },
      });
    dbCache = { value: db, loadedAt: Date.now() };
    dbReadInFlight = null;
    return;
  }

  await mkdir(DATA_DIR, { recursive: true });
  const tempFile = path.join(DATA_DIR, `substack-ai.${process.pid}.${Date.now()}.${randomUUID()}.tmp`);
  await writeFile(tempFile, JSON.stringify(db, null, 2), "utf8");
  await rename(tempFile, DATA_FILE);
}

async function mutateDb<T>(mutator: (db: Database) => T | Promise<T>): Promise<T> {
  const run = mutationQueue.then(async () => {
    const db = await readDb();
    const result = await mutator(db);
    await writeDb(db);
    return result;
  });
  mutationQueue = run.then(() => undefined, () => undefined);
  return run;
}

function newToken(): string {
  return randomBytes(24).toString("base64url");
}

function tokenUsageTimeZone(): string {
  const value = process.env.TOKEN_USAGE_TIME_ZONE?.trim();
  if (!value) return DEFAULT_TOKEN_USAGE_TIME_ZONE;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format(new Date());
    return value;
  } catch {
    return DEFAULT_TOKEN_USAGE_TIME_ZONE;
  }
}

function zonedParts(date: Date, timeZone: string): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return { year: get("year"), month: get("month"), day: get("day") };
}

function timeZoneOffsetMs(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - date.getTime();
}

function zonedMidnightUtc(year: number, month: number, day: number, timeZone: string): Date {
  const nominalUtc = Date.UTC(year, month - 1, day, 0, 0, 0);
  let utc = nominalUtc - timeZoneOffsetMs(new Date(nominalUtc), timeZone);
  utc = nominalUtc - timeZoneOffsetMs(new Date(utc), timeZone);
  return new Date(utc);
}

function tokenUsageMonthWindow(now: Date, timeZone: string): { start: Date; reset: Date; hours: number } {
  const today = zonedParts(now, timeZone);
  const nextMonthUtc = new Date(Date.UTC(today.year, today.month, 1));
  const start = zonedMidnightUtc(today.year, today.month, 1, timeZone);
  const reset = zonedMidnightUtc(nextMonthUtc.getUTCFullYear(), nextMonthUtc.getUTCMonth() + 1, 1, timeZone);
  return {
    start,
    reset,
    hours: Math.max(1, Math.round((reset.getTime() - start.getTime()) / (1000 * 60 * 60)))
  };
}

function usageSummaryFromTotal(used: number, limit: number, now = new Date()): TokenUsageSummary {
  const resetTimeZone = tokenUsageTimeZone();
  const window = tokenUsageMonthWindow(now, resetTimeZone);
  const remaining = Math.max(0, limit - used);
  const percent = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 100;

  return {
    used,
    limit,
    remaining,
    percent,
    windowHours: window.hours,
    period: "month",
    resetsAt: window.reset.toISOString(),
    resetTimeZone,
    status: used >= limit ? "exhausted" : percent >= 80 ? "high" : "normal"
  };
}

/** Tokens spent this month by one workspace. */
async function workspaceUsedThisMonth(workspaceId: string, now: Date): Promise<number> {
  const window = tokenUsageMonthWindow(now, tokenUsageTimeZone());
  const database = getDb();
  const [row] = await database
    .select({ used: sqlExpr<number>`coalesce(sum(${tokenUsageRows.tokens}), 0)::int` })
    .from(tokenUsageRows)
    .where(and(eq(tokenUsageRows.workspaceId, workspaceId), gte(tokenUsageRows.createdAt, window.start)));
  return row?.used ?? 0;
}

/**
 * Tokens spent this month by one account.
 *
 * Counts events stamped with the user, plus events on workspaces they own
 * that were never stamped. Usage from a deleted publication still counts:
 * its workspace_id goes null on delete while the user stamp remains, which
 * is how the month's total survives the publication being removed.
 */
async function accountUsedThisMonth(userId: string, ownedWorkspaceIds: string[], now: Date): Promise<number> {
  const window = tokenUsageMonthWindow(now, tokenUsageTimeZone());
  const database = getDb();
  const ownedClause = ownedWorkspaceIds.length
    ? and(isNull(tokenUsageRows.userId), inArray(tokenUsageRows.workspaceId, ownedWorkspaceIds))
    : undefined;
  const [row] = await database
    .select({ used: sqlExpr<number>`coalesce(sum(${tokenUsageRows.tokens}), 0)::int` })
    .from(tokenUsageRows)
    .where(
      and(
        gte(tokenUsageRows.createdAt, window.start),
        ownedClause ? or(eq(tokenUsageRows.userId, userId), ownedClause) : eq(tokenUsageRows.userId, userId)
      )
    );
  return row?.used ?? 0;
}

async function workspaceUsageSummary(workspaceId: string, now = new Date()): Promise<TokenUsageSummary> {
  const used = await workspaceUsedThisMonth(workspaceId, now);
  return usageSummaryFromTotal(used, planConfig("free").monthlyTokenLimit, now);
}

function formatResetTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    timeZone: tokenUsageTimeZone(),
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short"
  });
}

export async function getWorkspaceTokenUsage(token: string): Promise<TokenUsageSummary> {
  const db = await readDb();
  const workspace = db.workspaces.find((item) => item.token === token);
  if (!workspace) throw new AppError("Workspace not found.", 404);
  const ownerUserId = await resolveWorkspaceOwnerUserId(token);
  if (ownerUserId) return getAccountTokenUsageWithLimit(ownerUserId);
  return workspaceUsageSummary(workspace.id);
}

export async function getWorkspaceTokenUsageMap(tokens: string[]): Promise<Map<string, TokenUsageSummary>> {
  const wanted = new Set(tokens.filter(Boolean));
  const db = await readDb();
  const summaries = new Map<string, TokenUsageSummary>();
  for (const workspace of db.workspaces) {
    if (wanted.has(workspace.token)) {
      const ownerUserId = await resolveWorkspaceOwnerUserId(workspace.token);
      summaries.set(
        workspace.token,
        ownerUserId ? await getAccountTokenUsageWithLimit(ownerUserId) : await workspaceUsageSummary(workspace.id)
      );
    }
  }
  return summaries;
}

export async function getAccountTokenUsage(userId: string): Promise<TokenUsageSummary> {
  return getAccountTokenUsageWithLimit(userId);
}

async function accountUsageSummary(
  userId: string,
  limit: number,
  ownedWorkspaceIds: string[],
  now = new Date()
): Promise<TokenUsageSummary> {
  const used = await accountUsedThisMonth(userId, ownedWorkspaceIds, now);
  return usageSummaryFromTotal(used, limit, now);
}

async function accountPlanLimit(userId: string): Promise<number> {
  if (!process.env.DATABASE_URL) return planConfig("free").monthlyTokenLimit;
  const database = getDb();
  const [row] = await database
    .select({ plan: users.plan })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return planConfig(row?.plan).monthlyTokenLimit;
}

async function resolveWorkspaceOwnerUserId(token: string): Promise<string | null> {
  if (!process.env.DATABASE_URL) return null;
  const database = getDb();
  const [row] = await database
    .select({ ownerUserId: workspaceRows.ownerUserId })
    .from(workspaceRows)
    .where(eq(workspaceRows.token, token))
    .limit(1);
  return row?.ownerUserId ?? null;
}

export async function assertWorkspaceTokenBudget(
  token: string,
  estimatedTokens: number
): Promise<TokenUsageSummary> {
  const ownerUserId = await resolveWorkspaceOwnerUserId(token);
  const summary = ownerUserId ? await getAccountTokenUsageWithLimit(ownerUserId) : await getWorkspaceTokenUsage(token);
  const estimate = Math.max(0, Math.ceil(estimatedTokens));
  if (summary.used >= summary.limit || estimate > summary.remaining) {
    throw new AppError(
      `Monthly token usage limit reached for this account. It resets around ${formatResetTime(summary.resetsAt)}.`,
      429
    );
  }
  return summary;
}

async function getAccountTokenUsageWithLimit(userId: string): Promise<TokenUsageSummary> {
  const limit = await accountPlanLimit(userId);
  const ownedWorkspaceIds = await accountWorkspaceIds(userId);
  return accountUsageSummary(userId, limit, ownedWorkspaceIds);
}

/** Workspace ids, not URL tokens — usage rows reference the id. */
async function accountWorkspaceIds(userId: string): Promise<string[]> {
  const database = getDb();
  const rows = await database
    .select({ id: workspaceRows.id })
    .from(workspaceRows)
    .where(eq(workspaceRows.ownerUserId, userId));
  return rows.map((row) => row.id);
}

export async function recordWorkspaceTokenUsage({
  token,
  feature,
  label,
  tokens,
  inputTokens = null,
  outputTokens = null,
  costUsdMicros = null,
  provider = null,
  model = null,
  estimated = true
}: {
  token: string;
  feature: TokenUsageFeature;
  label: string;
  tokens: number;
  inputTokens?: number | null;
  outputTokens?: number | null;
  costUsdMicros?: number | null;
  provider?: string | null;
  model?: string | null;
  estimated?: boolean;
}): Promise<TokenUsageSummary> {
  const cleanTokens = Math.max(1, Math.ceil(tokens));
  const now = new Date();
  const database = getDb();

  const [workspace] = await database
    .select({ id: workspaceRows.id, ownerUserId: workspaceRows.ownerUserId })
    .from(workspaceRows)
    .where(eq(workspaceRows.token, token))
    .limit(1);
  if (!workspace) throw new AppError("Workspace not found.", 404);

  // One small insert. This runs after every model call, and it used to
  // rewrite the entire corpus blob to append a single row.
  await database.insert(tokenUsageRows).values({
    userId: workspace.ownerUserId ?? null,
    workspaceId: workspace.id,
    feature,
    label: label.slice(0, 80),
    tokens: cleanTokens,
    inputTokens,
    outputTokens,
    costUsdMicros,
    provider,
    model,
    estimated,
    createdAt: now
  });

  // Old rows cannot affect a summary, which only ever looks at the current
  // month, so retention is housekeeping rather than correctness. Pruning
  // occasionally keeps it off the hot path.
  if (Math.random() < 0.02) {
    await database
      .delete(tokenUsageRows)
      .where(lt(tokenUsageRows.createdAt, new Date(now.getTime() - TOKEN_USAGE_RETENTION_MS)));
  }

  if (workspace.ownerUserId) {
    const limit = await accountPlanLimit(workspace.ownerUserId);
    const ownedWorkspaceIds = await accountWorkspaceIds(workspace.ownerUserId);
    return accountUsageSummary(workspace.ownerUserId, limit, ownedWorkspaceIds, now);
  }
  return workspaceUsageSummary(workspace.id, now);
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
      archiveThemes: [],
      customThemes: []
    };
    db.workspaces.push(workspace);
    return workspace;
  });
}

/**
 * Remove corpus data for these workspaces from the blob.
 *
 * Usage is not handled here any more. It lives in token_usage_events, where
 * deleting a publication sets its workspace reference null and keeps the row
 * (the month still counts), and deleting an account cascades from the user
 * row (everything goes). Both are enforced by the schema rather than by
 * callers remembering to pass a flag.
 */
export async function deleteWorkspacesByTokens(tokens: string[]): Promise<void> {
  const wanted = new Set(tokens.filter(Boolean));
  if (wanted.size === 0) return;

  await mutateDb((db) => {
    const workspaceIds = new Set(
      db.workspaces
        .filter((workspace) => wanted.has(workspace.token))
        .map((workspace) => workspace.id)
    );
    if (workspaceIds.size === 0) return;

    db.workspaces = db.workspaces.filter((workspace) => !workspaceIds.has(workspace.id));
    db.posts = db.posts.filter((post) => !workspaceIds.has(post.workspaceId));
    db.chunks = db.chunks.filter((chunk) => !workspaceIds.has(chunk.workspaceId));
    db.repurposeDrafts = db.repurposeDrafts.filter((draft) => !workspaceIds.has(draft.workspaceId));
    db.grammarIssues = db.grammarIssues.filter((issue) => !workspaceIds.has(issue.workspaceId));
    db.savedIdeas = db.savedIdeas.filter((idea) => !workspaceIds.has(idea.workspaceId));
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
    customThemes: normalizeCustomThemeLabels(workspace.customThemes ?? []),
    lastIngestedAt: workspace.lastIngestedAt,
    ingestionError: workspace.ingestionError,
    tokenUsage: await workspaceUsageSummary(workspace.id)
  };
}

export async function updateWorkspacePublicationName(token: string, publicationName: string): Promise<WorkspaceOverview> {
  // Async mutator: the usage figure is a query now, not a slice of the blob.
  return mutateDb(async (db) => {
    const workspace = db.workspaces.find((item) => item.token === token);
    if (!workspace) throw new AppError("Workspace not found.", 404);
    workspace.publicationName = publicationName;
    workspace.updatedAt = new Date().toISOString();

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
      customThemes: normalizeCustomThemeLabels(workspace.customThemes ?? []),
      lastIngestedAt: workspace.lastIngestedAt,
      ingestionError: workspace.ingestionError,
      tokenUsage: await workspaceUsageSummary(workspace.id)
    };
  });
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
    const mergedPosts = posts.map((post) => {
      const existing = existingByUrl.get(post.url) ?? existingByTitle.get(normalizePostTitle(post.title));
      return existing
        ? {
            ...post,
            id: existing.id,
            workspaceId: existing.workspaceId,
            createdAt: existing.createdAt
          }
        : post;
    });

    db.posts = db.posts.filter((post) => post.workspaceId !== workspace.id);
    db.posts.push(...mergedPosts);

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

export async function replaceWorkspacePost(token: string, postId: string, nextPost: Post): Promise<PostSummary> {
  return mutateDb((db) => {
    const workspace = db.workspaces.find((item) => item.token === token);
    if (!workspace) throw new AppError("Workspace not found.", 404);

    const existingIndex = db.posts.findIndex((item) => item.workspaceId === workspace.id && item.id === postId);
    const existing = existingIndex >= 0 ? db.posts[existingIndex] : null;
    if (!existing) throw new AppError("Post not found.", 404);

    const now = new Date().toISOString();
    const post: Post = {
      ...nextPost,
      id: existing.id,
      workspaceId: workspace.id,
      createdAt: existing.createdAt
    };

    db.posts[existingIndex] = post;
    db.chunks = db.chunks.filter((chunk) => !(chunk.workspaceId === workspace.id && chunk.postId === post.id));
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

    workspace.status = "ready";
    workspace.ingestionError = null;
    workspace.lastIngestedAt = now;
    workspace.updatedAt = now;

    return summarizePost(post);
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
  const db = await readDb();
  const workspace = db.workspaces.find((item) => item.token === token);
  if (!workspace) throw new AppError("Workspace not found.", 404);

  const hasOldStatuses = db.repurposeDrafts.some(
    (draft) =>
      draft.workspaceId === workspace.id &&
      ((draft.status as string) === "generated" || (draft.status as string) === "approved")
  );
  if (hasOldStatuses) {
    return mutateDb((currentDb) => {
      const currentWorkspace = currentDb.workspaces.find((item) => item.token === token);
      if (!currentWorkspace) throw new AppError("Workspace not found.", 404);

      for (const draft of currentDb.repurposeDrafts) {
        if (draft.workspaceId !== currentWorkspace.id) continue;
        if ((draft.status as string) === "generated") draft.status = "pending";
        if ((draft.status as string) === "approved") draft.status = "saved";
      }

      return listWorkspaceDrafts(currentDb, currentWorkspace.id);
    });
  }

  return listWorkspaceDrafts(db, workspace.id);
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

function listWorkspaceDrafts(db: Database, workspaceId: string): RepurposeDraft[] {
  return db.repurposeDrafts
    .filter((draft) => draft.workspaceId === workspaceId && draft.status !== "deleted")
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

export async function updateCustomThemes(token: string, labels: unknown[]): Promise<string[]> {
  return mutateDb((db) => {
    const workspace = db.workspaces.find((item) => item.token === token);
    if (!workspace) throw new AppError("Workspace not found.", 404);
    const customThemes = normalizeCustomThemeLabels(labels);
    workspace.customThemes = customThemes;
    workspace.updatedAt = new Date().toISOString();
    return customThemes;
  });
}

export async function listSavedIdeas(token: string): Promise<SavedIdea[]> {
  if (process.env.DATABASE_URL) {
    const workspaceId = await getWorkspaceIdByToken(token);
    const database = getDb();
    const rows = await database
      .select()
      .from(savedIdeaRows)
      .where(eq(savedIdeaRows.workspaceId, workspaceId))
      .orderBy(desc(savedIdeaRows.createdAt));
    const directIdeas = rows.map(savedIdeaFromRow);
    const legacyDb = await readDb();
    const legacyWorkspace = legacyDb.workspaces.find((item) => item.token === token);
    const legacyIdeas = legacyWorkspace ? listWorkspaceSavedIdeas(legacyDb, legacyWorkspace.id) : [];
    return mergeSavedIdeas(directIdeas, legacyIdeas);
  }

  const db = await readDb();
  const workspace = db.workspaces.find((item) => item.token === token);
  if (!workspace) throw new AppError("Workspace not found.", 404);
  return listWorkspaceSavedIdeas(db, workspace.id);
}

export async function addSavedIdea(token: string, idea: unknown): Promise<SavedIdea> {
  const cleanIdea = sanitizeIdea(idea);

  if (process.env.DATABASE_URL) {
    const workspaceId = await getWorkspaceIdByToken(token);
    const database = getDb();
    const existing = await database
      .select()
      .from(savedIdeaRows)
      .where(eq(savedIdeaRows.workspaceId, workspaceId));
    const duplicate = existing.find(
      (item) =>
        item.title.toLowerCase() === cleanIdea.title.toLowerCase() &&
        item.thesis.toLowerCase() === cleanIdea.thesis.toLowerCase(),
    );
    if (duplicate) return savedIdeaFromRow(duplicate);

    const [saved] = await database
      .insert(savedIdeaRows)
      .values({
        workspaceId,
        title: cleanIdea.title,
        thesis: cleanIdea.thesis,
        lens: cleanIdea.lens,
        whyItFits: cleanIdea.whyItFits,
        relatedPosts: cleanIdea.relatedPosts,
      })
      .returning();
    return savedIdeaFromRow(saved);
  }

  return mutateDb((db) => {
    const workspace = db.workspaces.find((item) => item.token === token);
    if (!workspace) throw new AppError("Workspace not found.", 404);

    const existing = db.savedIdeas.find(
      (item) =>
        item.workspaceId === workspace.id &&
        item.title.toLowerCase() === cleanIdea.title.toLowerCase() &&
        item.thesis.toLowerCase() === cleanIdea.thesis.toLowerCase()
    );
    if (existing) return existing;

    const now = new Date().toISOString();
    const saved: SavedIdea = {
      ...cleanIdea,
      id: randomUUID(),
      workspaceId: workspace.id,
      createdAt: now,
      updatedAt: now
    };
    db.savedIdeas.push(saved);
    return saved;
  });
}

export async function deleteSavedIdea(token: string, ideaId: string): Promise<void> {
  if (process.env.DATABASE_URL) {
    const workspaceId = await getWorkspaceIdByToken(token);
    const database = getDb();
    const deleted = await database
      .delete(savedIdeaRows)
      .where(and(eq(savedIdeaRows.workspaceId, workspaceId), eq(savedIdeaRows.id, ideaId)))
      .returning({ id: savedIdeaRows.id });
    if (deleted.length === 0) {
      return mutateDb((db) => {
        const workspace = db.workspaces.find((item) => item.token === token);
        if (!workspace) throw new AppError("Workspace not found.", 404);
        const before = db.savedIdeas.length;
        db.savedIdeas = db.savedIdeas.filter((idea) => !(idea.workspaceId === workspace.id && idea.id === ideaId));
        if (db.savedIdeas.length === before) throw new AppError("Idea not found.", 404);
      });
    }
    return;
  }

  return mutateDb((db) => {
    const workspace = db.workspaces.find((item) => item.token === token);
    if (!workspace) throw new AppError("Workspace not found.", 404);
    const before = db.savedIdeas.length;
    db.savedIdeas = db.savedIdeas.filter((idea) => !(idea.workspaceId === workspace.id && idea.id === ideaId));
    if (db.savedIdeas.length === before) throw new AppError("Idea not found.", 404);
  });
}

function listWorkspaceSavedIdeas(db: Database, workspaceId: string): SavedIdea[] {
  return db.savedIdeas
    .filter((idea) => idea.workspaceId === workspaceId)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

function mergeSavedIdeas(primary: SavedIdea[], secondary: SavedIdea[]): SavedIdea[] {
  const seen = new Set<string>();
  const merged: SavedIdea[] = [];
  for (const idea of [...primary, ...secondary]) {
    const key = `${idea.title.trim().toLowerCase()}::${idea.thesis.trim().toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(idea);
  }
  return merged.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

type SavedIdeaRow = typeof savedIdeaRows.$inferSelect;

async function getWorkspaceIdByToken(token: string): Promise<string> {
  const database = getDb();
  const [workspace] = await database
    .select({ id: workspaceRows.id })
    .from(workspaceRows)
    .where(eq(workspaceRows.token, token))
    .limit(1);
  if (!workspace) throw new AppError("Workspace not found.", 404);
  return workspace.id;
}

function savedIdeaFromRow(row: SavedIdeaRow): SavedIdea {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    title: row.title,
    thesis: row.thesis,
    lens: row.lens,
    whyItFits: row.whyItFits,
    relatedPosts: Array.isArray(row.relatedPosts)
      ? row.relatedPosts.map(sanitizeSourceCitation).filter((source): source is SourceCitation => Boolean(source)).slice(0, 4)
      : [],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function normalizeCustomThemeLabels(labels: unknown[]): string[] {
  const seen = new Set<string>();
  const customThemes: string[] = [];
  for (const label of labels) {
    if (typeof label !== "string") continue;
    const cleaned = label.replace(/\s+/g, " ").trim().slice(0, 32);
    if (!cleaned) continue;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    customThemes.push(cleaned);
    if (customThemes.length >= 20) break;
  }
  return customThemes;
}

function sanitizeIdea(idea: unknown): Idea {
  if (!idea || typeof idea !== "object") {
    throw new AppError("Idea must include a title, thesis, and lens.", 400);
  }
  const value = idea as Partial<Idea>;
  const title = cleanIdeaText(value.title, 180);
  const thesis = cleanIdeaText(value.thesis, 420);
  const lens = cleanIdeaText(value.lens, 80);
  if (!title || !thesis || !lens) {
    throw new AppError("Idea must include a title, thesis, and lens.", 400);
  }
  return {
    title,
    thesis,
    lens,
    whyItFits: cleanIdeaText(value.whyItFits, 520),
    relatedPosts: Array.isArray(value.relatedPosts)
      ? value.relatedPosts.map(sanitizeSourceCitation).filter((source): source is SourceCitation => Boolean(source)).slice(0, 4)
      : []
  };
}

function sanitizeSourceCitation(source: unknown): SourceCitation | null {
  if (!source || typeof source !== "object") return null;
  const value = source as Partial<SourceCitation>;
  const title = cleanIdeaText(value.title, 180);
  const url = cleanIdeaText(value.url, 500);
  if (!title || !url) return null;
  return {
    title,
    url,
    publishedAt: typeof value.publishedAt === "string" ? value.publishedAt : null,
    snippet: cleanIdeaText(value.snippet, 300)
  };
}

function cleanIdeaText(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, maxLength) : "";
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

export async function deleteGrammarIssues(token: string): Promise<void> {
  await mutateDb((db) => {
    const workspace = db.workspaces.find((item) => item.token === token);
    if (!workspace) throw new AppError("Workspace not found.", 404);
    db.grammarIssues = db.grammarIssues.filter((issue) => issue.workspaceId !== workspace.id);
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
  const normalizedQuery = normalizeSearchText(query).text;
  if (!normalizedQuery) {
    return { query, results: [], totalMatches: 0, totalPosts: 0 };
  }

  const db = await readDb();
  const workspace = db.workspaces.find((item) => item.token === token);
  if (!workspace) throw new AppError("Workspace not found.", 404);

  const posts = db.posts
    .filter((post) => post.workspaceId === workspace.id)
    .sort((a, b) => Date.parse(b.publishedAt ?? b.createdAt) - Date.parse(a.publishedAt ?? a.createdAt));

  const results: SearchResult[] = [];
  let totalMatches = 0;

  for (const post of posts) {
    const text = post.contentText;
    if (!text) continue;
    const normalized = normalizeSearchText(text);

    const matches: { normalizedIndex: number; originalStart: number; originalEnd: number }[] = [];
    let cursor = 0;
    while (cursor <= normalized.text.length - normalizedQuery.length) {
      const found = normalized.text.indexOf(normalizedQuery, cursor);
      if (found === -1) break;
      const originalStart = normalized.indexMap[found] ?? 0;
      const originalLast = normalized.indexMap[found + normalizedQuery.length - 1] ?? originalStart;
      matches.push({ normalizedIndex: found, originalStart, originalEnd: originalLast + 1 });
      cursor = found + normalizedQuery.length;
    }
    if (matches.length === 0) continue;

    const snippets: SearchSnippet[] = matches.slice(0, SEARCH_MAX_SNIPPETS_PER_POST).map((match) => {
      const start = Math.max(0, match.originalStart - SEARCH_SNIPPET_PADDING);
      const end = Math.min(text.length, match.originalEnd + SEARCH_SNIPPET_PADDING);
      // Collapse whitespace in context so a snippet doesn't break with stray
      // newlines from the original article body.
      const before = text.slice(start, match.originalStart).replace(/\s+/g, " ").trimStart();
      const after = text.slice(match.originalEnd, end).replace(/\s+/g, " ").trimEnd();
      return {
        before,
        match: text.slice(match.originalStart, match.originalEnd),
        after,
      };
    });

    totalMatches += matches.length;
    results.push({
      postId: post.id,
      postTitle: post.title,
      postUrl: post.url,
      publishedAt: post.publishedAt,
      matchCount: matches.length,
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

function normalizeSearchText(value: string): { text: string; indexMap: number[] } {
  const chars: string[] = [];
  const indexMap: number[] = [];
  let previousWasSpace = false;

  for (let i = 0; i < value.length; i += 1) {
    const folded = foldSearchCharacter(value[i]);
    if (!folded) continue;

    for (const char of folded) {
      if (/\s/.test(char)) {
        if (previousWasSpace) continue;
        chars.push(" ");
        indexMap.push(i);
        previousWasSpace = true;
        continue;
      }

      chars.push(char.toLowerCase());
      indexMap.push(i);
      previousWasSpace = false;
    }
  }

  while (chars[0] === " ") {
    chars.shift();
    indexMap.shift();
  }
  while (chars[chars.length - 1] === " ") {
    chars.pop();
    indexMap.pop();
  }

  return { text: chars.join(""), indexMap };
}

function foldSearchCharacter(char: string): string {
  switch (char) {
    case "’":
    case "‘":
    case "‚":
    case "‛":
    case "`":
    case "´":
      return "'";
    case "“":
    case "”":
    case "„":
    case "‟":
      return "\"";
    case "—":
    case "–":
    case "−":
      return "-";
    case "\u00a0":
      return " ";
    default:
      return char.normalize("NFKC");
  }
}

export async function listGrammarIssues(token: string): Promise<GrammarIssue[]> {
  const db = await readDb();
  const workspace = db.workspaces.find((item) => item.token === token);
  if (!workspace) throw new AppError("Workspace not found.", 404);
  return db.grammarIssues
    .filter((issue) => issue.workspaceId === workspace.id)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}
