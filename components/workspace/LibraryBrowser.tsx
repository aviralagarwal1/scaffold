"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PostSummary } from "@/types/post";
import { api, ApiClientError } from "@/lib/client/api";
import { PostCard } from "@/components/workspace/PostCard";
import { EmptyState } from "@/components/ui/states";

export function LibraryBrowser({
  token,
  posts,
  onPostSynced,
}: {
  token: string;
  posts: PostSummary[];
  onPostSynced?: (post: PostSummary) => void;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest" | "longest">("newest");
  const [syncingPostId, setSyncingPostId] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = posts.slice();
    if (q) {
      out = out.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          (p.subtitle ?? "").toLowerCase().includes(q) ||
          p.excerpt.toLowerCase().includes(q),
      );
    }
    out.sort((a, b) => {
      if (sort === "longest") return b.wordCount - a.wordCount;
      const ad = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      const bd = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
      return sort === "newest" ? bd - ad : ad - bd;
    });
    return out;
  }, [posts, query, sort]);

  const syncPost = async (post: PostSummary) => {
    if (syncingPostId) return;
    setSyncingPostId(post.id);
    setSyncError(null);
    try {
      const synced = await api.syncPost(token, post.id);
      onPostSynced?.(synced);
    } catch (err) {
      setSyncError(err instanceof ApiClientError ? err.message : "Could not sync post.");
    } finally {
      setSyncingPostId(null);
    }
  };

  if (posts.length === 0) {
    return (
      <EmptyState
        eyebrow="Library"
        title="No posts in your library yet."
        description="Once your library finishes syncing, your posts will show up here. Browse, search, and use them as the basis for social posts."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search titles, subtitles, excerpts"
          className="input sm:max-w-md"
        />
        <div className="flex items-center gap-2 type-meta">
          <LibraryDownloadMenu token={token} />
          <select
            aria-label="Sort posts"
            id="sort"
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
            className="input max-w-[170px]"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="longest">Longest first</option>
          </select>
        </div>
      </div>

      <div className="type-meta">
        Showing {filtered.length.toLocaleString()} of {posts.length.toLocaleString()} posts
      </div>
      {syncError && (
        <div className="rounded-md border border-critical-100 bg-critical-100/40 px-3 py-2 text-[13px] text-critical-700">
          {syncError}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {filtered.map((p) => (
          <PostCard key={p.id} post={p} onSync={syncPost} syncing={syncingPostId === p.id} annotateHref={`/workspace/${token}/notes/${p.id}`} />
        ))}
      </div>
    </div>
  );
}

function LibraryDownloadMenu({ token }: { token: string }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const baseHref = `/api/workspaces/${encodeURIComponent(token)}/exports/library`;

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((prev) => !prev)}
        className="input select-control inline-flex !w-auto min-w-[170px] items-center text-left font-normal"
      >
        <span>Download</span>
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Download library"
          className="animate-fade absolute right-0 top-[calc(100%+6px)] z-20 w-56 overflow-hidden rounded-md border border-ink-200/80 bg-white py-1.5 shadow-lift"
        >
          <a
            role="menuitem"
            href={`${baseHref}?format=txt`}
            className="block px-3.5 py-1.5 text-[13px] text-ink-700 transition-colors hover:bg-ink-50 hover:text-ink-900"
            onClick={() => setOpen(false)}
          >
            One .txt file
          </a>
          <a
            role="menuitem"
            href={`${baseHref}?format=zip`}
            className="block px-3.5 py-1.5 text-[13px] text-ink-700 transition-colors hover:bg-ink-50 hover:text-ink-900"
            onClick={() => setOpen(false)}
          >
            Separate .txt files
          </a>
        </div>
      )}
    </div>
  );
}
