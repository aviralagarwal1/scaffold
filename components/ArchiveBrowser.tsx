"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PostSummary } from "@/types/post";
import { PostCard } from "./PostCard";
import { EmptyState } from "./states";

export function ArchiveBrowser({ token, posts }: { token: string; posts: PostSummary[] }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest" | "longest">("newest");

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

  if (posts.length === 0) {
    return (
      <EmptyState
        eyebrow="Library"
        title="No posts in your library yet."
        description="Once your library finishes syncing, your posts will show up here. Browse, search, and use them as the basis for distribution drafts."
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

      <div className="grid gap-4 md:grid-cols-2">
        {filtered.map((p) => (
          <PostCard key={p.id} post={p} />
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
