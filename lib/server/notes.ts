import { and, desc, eq, sql as sqlExpr } from "drizzle-orm";
import { getDb } from "@/lib/server/db";
import { postNotes, workspaces } from "@/lib/server/db/schema";
import { AppError } from "@/lib/server/errors";
import { getPost, listPosts } from "@/lib/server/store";
import type { CreatePostNoteRequest, UpdatePostNoteRequest, PostNote, PostReader, WorkspaceNote } from "@/types/post";

const MIN_QUOTE = 1;
const MAX_QUOTE = 800;
const MAX_BODY = 2000;
const MAX_CONTEXT = 80;
const MAX_NOTES_PER_POST = 80;

export async function getPostReader(token: string, postId: string): Promise<PostReader> {
  const post = await getPost(token, postId);
  return { post, notes: await listPostNotes(token, postId) };
}

export async function listWorkspaceNotes(token: string): Promise<WorkspaceNote[]> {
  const workspaceId = await workspaceIdForToken(token);
  const [posts, rows] = await Promise.all([
    listPosts(token),
    getDb()
      .select()
      .from(postNotes)
      .where(eq(postNotes.workspaceId, workspaceId))
      .orderBy(desc(postNotes.createdAt)),
  ]);
  const titles = new Map(posts.map((post) => [post.id, post.title]));
  return rows.map((row) => ({
    ...noteFromRow(row),
    postTitle: titles.get(row.postId) ?? "Removed post",
  }));
}

export async function listPostNotes(token: string, postId: string): Promise<PostNote[]> {
  const workspaceId = await workspaceIdForToken(token);
  const database = getDb();
  const rows = await database
    .select()
    .from(postNotes)
    .where(and(eq(postNotes.workspaceId, workspaceId), eq(postNotes.postId, postId)))
    .orderBy(desc(postNotes.createdAt));
  return rows.map(noteFromRow);
}

export async function addPostNote(token: string, postId: string, input: CreatePostNoteRequest): Promise<PostNote> {
  if (!input || typeof input !== "object") throw new AppError("Write a note before saving.", 400);
  const post = await getPost(token, postId);
  if (typeof input.quote !== "string" || input.quote.trim().length > MAX_QUOTE) {
    throw new AppError("Select up to 800 characters for a note.", 400);
  }
  const quote = clipNoteText(input.quote, MAX_QUOTE);
  const body = cleanNoteBody(input.body);
  if (quote && !post.contentText.includes(quote)) {
    throw new AppError("This passage has changed. Reload the post and select it again.", 409);
  }
  if (quote.length < MIN_QUOTE) {
    throw new AppError("Select a longer line before leaving a note.", 400);
  }
  if (!body) {
    throw new AppError("Write a note before saving.", 400);
  }

  const workspaceId = await workspaceIdForToken(token);
  return getDb().transaction(async (database) => {
    // Lock the parent even when there are no notes yet. Every creator takes this
    // lock before counting; READ COMMITTED sees the preceding creator's commit.
    const [workspace] = await database.select({ id: workspaces.id }).from(workspaces)
      .where(eq(workspaces.id, workspaceId)).for("update");
    if (!workspace) throw new AppError("Workspace not found.", 404);
    const [{ count }] = await database
      .select({ count: sqlExpr<number>`count(*)::int` })
      .from(postNotes)
      .where(and(eq(postNotes.workspaceId, workspaceId), eq(postNotes.postId, postId)));
    if ((count ?? 0) >= MAX_NOTES_PER_POST) {
      throw new AppError("This post already has as many notes as it can hold.", 400);
    }

    const [saved] = await database
      .insert(postNotes)
      .values({
        workspaceId,
        postId,
        quote,
        prefix: typeof input.prefix === "string" ? input.prefix.slice(-MAX_CONTEXT) : "",
        suffix: typeof input.suffix === "string" ? input.suffix.slice(0, MAX_CONTEXT) : "",
        body,
      })
      .returning();
    return noteFromRow(saved);
  }, { isolationLevel: "read committed" });
}

export async function deletePostNote(token: string, postId: string, noteId: string): Promise<void> {
  const workspaceId = await workspaceIdForToken(token);
  const database = getDb();
  const deleted = await database
    .delete(postNotes)
    .where(
      and(eq(postNotes.workspaceId, workspaceId), eq(postNotes.postId, postId), eq(postNotes.id, noteId)),
    )
    .returning({ id: postNotes.id });
  if (deleted.length === 0) throw new AppError("Note not found.", 404);
}

export async function updatePostNote(token: string, postId: string, noteId: string, input: UpdatePostNoteRequest): Promise<PostNote> {
  if (!input || typeof input !== "object") throw new AppError("Write a note before saving.", 400);
  const body = cleanNoteBody(input.body);
  if (!body) throw new AppError("Write a note before saving.", 400);
  const workspaceId = await workspaceIdForToken(token);
  const [saved] = await getDb().update(postNotes).set({ body, updatedAt: new Date() })
    .where(and(eq(postNotes.workspaceId, workspaceId), eq(postNotes.postId, postId), eq(postNotes.id, noteId)))
    .returning();
  if (!saved) throw new AppError("Note not found.", 404);
  return noteFromRow(saved);
}

async function workspaceIdForToken(token: string): Promise<string> {
  const database = getDb();
  const [workspace] = await database
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(eq(workspaces.token, token))
    .limit(1);
  if (!workspace) throw new AppError("Workspace not found.", 404);
  return workspace.id;
}

function noteFromRow(row: typeof postNotes.$inferSelect): PostNote {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    postId: row.postId,
    quote: row.quote,
    prefix: row.prefix,
    suffix: row.suffix,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Trim ends only — collapsing whitespace would make the quote unfindable in the post. */
function clipNoteText(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function cleanNoteBody(value: unknown): string {
  if (typeof value !== "string") return "";
  if (value.trim().length > MAX_BODY) throw new AppError("Keep notes to 2,000 characters or fewer.", 400);
  return value.trim();
}
