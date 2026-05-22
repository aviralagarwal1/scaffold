import { and, asc, desc, eq, inArray } from "drizzle-orm";
import type { ChatSession, ChatTurn, SavedDraftFeedback, SourceCitation } from "@/types/ai";
import { getDb } from "@/lib/server/db";
import { chatMessages, chatSessions, savedReviews, workspaces } from "@/lib/server/db/schema";
import { AppError } from "@/lib/server/errors";

const HISTORY_LIMIT = 20;

function cleanTitle(value: string): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > 80 ? `${normalized.slice(0, 77).trimEnd()}...` : normalized || "Untitled";
}

function cleanSources(value: unknown): SourceCitation[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((source): SourceCitation | null => {
      if (!source || typeof source !== "object") return null;
      const item = source as Partial<SourceCitation>;
      if (typeof item.title !== "string" || typeof item.url !== "string") return null;
      return {
        title: item.title,
        url: item.url,
        publishedAt: typeof item.publishedAt === "string" ? item.publishedAt : null,
        snippet: typeof item.snippet === "string" ? item.snippet : "",
      };
    })
    .filter((source): source is SourceCitation => Boolean(source));
}

async function workspaceIdForToken(token: string): Promise<string> {
  const db = getDb();
  const [workspace] = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(eq(workspaces.token, token))
    .limit(1);
  if (!workspace) throw new AppError("Workspace not found.", 404);
  return workspace.id;
}

export async function listChatSessions(token: string, userId: string): Promise<ChatSession[]> {
  const db = getDb();
  const workspaceId = await workspaceIdForToken(token);
  const sessions = await db
    .select()
    .from(chatSessions)
    .where(and(eq(chatSessions.workspaceId, workspaceId), eq(chatSessions.userId, userId)))
    .orderBy(desc(chatSessions.updatedAt))
    .limit(HISTORY_LIMIT);
  if (sessions.length === 0) return [];

  const messages = await db
    .select()
    .from(chatMessages)
    .where(inArray(chatMessages.sessionId, sessions.map((session) => session.id)))
    .orderBy(asc(chatMessages.createdAt));
  const wanted = new Set(sessions.map((session) => session.id));
  const bySession = new Map<string, ChatTurn[]>();
  for (const message of messages) {
    if (!wanted.has(message.sessionId)) continue;
    const role = message.role === "assistant" ? "assistant" : "user";
    const turns = bySession.get(message.sessionId) ?? [];
    turns.push({
      id: message.id,
      role,
      content: message.content,
      sources: role === "assistant" ? cleanSources(message.sources) : [],
      createdAt: message.createdAt.toISOString(),
    });
    bySession.set(message.sessionId, turns);
  }

  return sessions.map((session) => ({
    id: session.id,
    workspaceId: session.workspaceId,
    title: session.title,
    turns: bySession.get(session.id) ?? [],
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
  }));
}

export async function getChatSessionTurns(
  token: string,
  userId: string,
  sessionId: string | null | undefined,
): Promise<ChatTurn[]> {
  if (!sessionId) return [];
  const db = getDb();
  const workspaceId = await workspaceIdForToken(token);
  const [session] = await db
    .select({ id: chatSessions.id })
    .from(chatSessions)
    .where(and(eq(chatSessions.id, sessionId), eq(chatSessions.workspaceId, workspaceId), eq(chatSessions.userId, userId)))
    .limit(1);
  if (!session) return [];

  const messages = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.sessionId, session.id))
    .orderBy(asc(chatMessages.createdAt));
  return messages.map((message) => {
    const role = message.role === "assistant" ? "assistant" : "user";
    return {
      id: message.id,
      role,
      content: message.content,
      sources: role === "assistant" ? cleanSources(message.sources) : [],
      createdAt: message.createdAt.toISOString(),
    };
  });
}

export async function appendChatExchange({
  token,
  userId,
  sessionId,
  message,
  answer,
  sources,
}: {
  token: string;
  userId: string;
  sessionId?: string | null;
  message: string;
  answer: string;
  sources: SourceCitation[];
}): Promise<string> {
  const db = getDb();
  const workspaceId = await workspaceIdForToken(token);
  const now = new Date();

  return db.transaction(async (tx) => {
    let activeSessionId = sessionId ?? null;
    if (activeSessionId) {
      const [existing] = await tx
        .select({ id: chatSessions.id })
        .from(chatSessions)
        .where(
          and(
            eq(chatSessions.id, activeSessionId),
            eq(chatSessions.workspaceId, workspaceId),
            eq(chatSessions.userId, userId),
          ),
        )
        .limit(1);
      if (!existing) activeSessionId = null;
    }

    if (!activeSessionId) {
      const [created] = await tx
        .insert(chatSessions)
        .values({
          workspaceId,
          userId,
          title: cleanTitle(message),
        })
        .returning({ id: chatSessions.id });
      activeSessionId = created.id;
    }

    await tx.insert(chatMessages).values([
      { sessionId: activeSessionId, role: "user", content: message, sources: [] },
      { sessionId: activeSessionId, role: "assistant", content: answer, sources },
    ]);
    await tx.update(chatSessions).set({ updatedAt: now }).where(eq(chatSessions.id, activeSessionId));
    return activeSessionId;
  });
}

export async function deleteChatSession(token: string, userId: string, sessionId: string): Promise<void> {
  const db = getDb();
  const workspaceId = await workspaceIdForToken(token);
  const [deleted] = await db
    .delete(chatSessions)
    .where(and(eq(chatSessions.id, sessionId), eq(chatSessions.workspaceId, workspaceId), eq(chatSessions.userId, userId)))
    .returning({ id: chatSessions.id });
  if (!deleted) throw new AppError("Conversation not found.", 404);
}

export async function listSavedDraftFeedback(token: string): Promise<SavedDraftFeedback[]> {
  const db = getDb();
  const workspaceId = await workspaceIdForToken(token);
  const rows = await db
    .select()
    .from(savedReviews)
    .where(eq(savedReviews.workspaceId, workspaceId))
    .orderBy(desc(savedReviews.updatedAt))
    .limit(HISTORY_LIMIT);
  return rows.map((row) => ({
    id: row.id,
    workspaceId: row.workspaceId,
    title: row.title,
    draft: row.draft,
    feedback: row.feedback,
    sources: cleanSources(row.sources),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }));
}

export async function saveDraftFeedback({
  token,
  draft,
  feedback,
  sources,
}: {
  token: string;
  draft: string;
  feedback: string;
  sources: SourceCitation[];
}): Promise<SavedDraftFeedback> {
  const db = getDb();
  const workspaceId = await workspaceIdForToken(token);
  const [row] = await db
    .insert(savedReviews)
    .values({
      workspaceId,
      title: cleanTitle(draft),
      draft,
      feedback,
      sources,
    })
    .returning();
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    title: row.title,
    draft: row.draft,
    feedback: row.feedback,
    sources: cleanSources(row.sources),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function deleteSavedDraftFeedback(token: string, reviewId: string): Promise<void> {
  const db = getDb();
  const workspaceId = await workspaceIdForToken(token);
  const [deleted] = await db
    .delete(savedReviews)
    .where(and(eq(savedReviews.id, reviewId), eq(savedReviews.workspaceId, workspaceId)))
    .returning({ id: savedReviews.id });
  if (!deleted) throw new AppError("Saved review not found.", 404);
}
