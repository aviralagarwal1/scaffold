"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { PageHeader } from "@/components/workspace/PageHeader";
import { api, ApiClientError } from "@/lib/client/api";
import { formatDate, formatRelative, pluralize } from "@/lib/client/format";
import { NOTES_COPY as copy } from "@/lib/copy";
import type { PostSummary, WorkspaceNote } from "@/types/post";

export function NotesLedger({ token }: { token: string }) {
  const [data, setData] = useState<{ posts: PostSummary[]; notes: WorkspaceNote[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "noted">("all");

  useEffect(() => {
    let active = true;
    setData(null);
    setError(null);
    Promise.all([api.listPosts(token), api.listNotes(token)])
      .then(([posts, notes]) => { if (active) setData({ posts, notes }); })
      .catch((err) => { if (active) setError(err instanceof ApiClientError ? err.message : copy.loadError); });
    return () => { active = false; };
  }, [token]);

  const { byPost, recentPost } = useMemo(() => {
    const byPost = new Map<string, WorkspaceNote[]>();
    const postIds = new Set(data?.posts.map((post) => post.id));
    let recentPost: WorkspaceNote | undefined;
    for (const note of data?.notes ?? []) {
      const group = byPost.get(note.postId);
      if (group) group.push(note);
      else byPost.set(note.postId, [note]);
      if (postIds.has(note.postId) && (!recentPost || note.updatedAt > recentPost.updatedAt)) recentPost = note;
    }
    return { byPost, recentPost };
  }, [data]);
  const needle = query.trim().toLowerCase();
  const posts = (data?.posts ?? []).filter((post) =>
    (filter === "all" || byPost.has(post.id)) &&
    (!needle || `${post.title} ${post.subtitle ?? ""} ${post.excerpt}`.toLowerCase().includes(needle)),
  ).sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader section="notes" />
      {error ? <ErrorState title={copy.loadError} description={error} /> : !data ? <LoadingState label={copy.loading} /> : (
        <>
          {recentPost && !needle && filter === "all" && (
            <Link href={`/workspace/${token}/notes/${recentPost.postId}#note-${recentPost.id}`}
              className="group flex items-center justify-between gap-6 rounded-md border border-ink-200 bg-white px-5 py-4 transition-colors hover:border-ink-400 focus-visible:outline-accent-500">
              <div className="min-w-0">
                <p className="type-eyebrow text-ink-500">{copy.continue}</p>
                <p className="mt-1.5 truncate font-serif text-xl text-ink-900">{recentPost.postTitle}</p>
                <p className="mt-1 text-xs text-ink-500">{copy.lastNote} {formatRelative(recentPost.updatedAt)}</p>
              </div>
              <span aria-hidden="true" className="text-xl text-ink-400 transition-transform group-hover:translate-x-1">→</span>
            </Link>
          )}
          <section aria-label={copy.posts}>
            <div className="flex flex-col justify-between gap-4 border-b border-ink-200 pb-4 sm:flex-row sm:items-center">
              <input type="search" aria-label={copy.search} placeholder={copy.search} value={query}
                onChange={(event) => setQuery(event.target.value)} className="input sm:max-w-md" />
              <select aria-label={copy.filter} value={filter}
                onChange={(event) => setFilter(event.target.value as 'all' | 'noted')} className="input sm:max-w-[170px]">
                <option value="all">{copy.allPosts}</option>
                <option value="noted">{copy.withNotes}</option>
              </select>
            </div>
            {posts.length ? (
              <ul className="divide-y divide-ink-200/70">
                {posts.map((post) => {
                  const count = byPost.get(post.id)?.length ?? 0;
                  return <li key={post.id}>
                    <Link href={`/workspace/${token}/notes/${post.id}`} className="group -mx-3 flex items-center gap-5 rounded-md px-3 py-5 transition-colors hover:bg-white focus-visible:outline-accent-500">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-500">
                          {post.publishedAt && <span>{formatDate(post.publishedAt)}</span>}
                          <span>{pluralize(post.wordCount, 'word')}</span>
                          {count > 0 && <span className="text-accent-700">{pluralize(count, 'note')}</span>}
                        </div>
                        <h3 className="mt-2 font-serif text-[21px] leading-snug text-ink-900">{post.title}</h3>
                        <p className="mt-1.5 line-clamp-1 text-[13px] leading-relaxed text-ink-500">{post.subtitle || post.excerpt}</p>
                      </div>
                      <span aria-hidden="true" className="text-ink-400 transition-transform group-hover:translate-x-1">→</span>
                    </Link>
                  </li>;
                })}
              </ul>
            ) : (
              <div className="py-14 text-center">
                <h3 className="font-serif text-xl text-ink-800">{needle ? copy.noMatches : filter === 'noted' ? copy.noNotes : copy.noPosts}</h3>
                {(needle || filter !== 'noted') && <p className="mt-2 text-sm text-ink-500">{needle ? copy.trySearch : copy.syncHelp}</p>}
                {filter === 'noted' && !needle && <button className="btn-secondary mt-5" onClick={() => setFilter('all')}>{copy.allPosts}</button>}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
