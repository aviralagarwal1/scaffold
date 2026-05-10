"use client";

import { useEffect, useRef, useState } from "react";
import type { SearchResponse, SearchResult, SearchSnippet } from "@/types/ai";
import { api, ApiClientError } from "@/lib/client/api";
import { cn } from "@/lib/client/cn";
import { formatDate, hostnameOf, pluralize } from "@/lib/client/format";
import { PaperConstellation } from "./PaperConstellation";

export function SearchPanel({ token, disabled }: { token: string; disabled?: boolean }) {
  const [query, setQuery] = useState("");
  const [committedQuery, setCommittedQuery] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [alerting, setAlerting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Autofocus on mount — the user navigated to /search to type a query.
  // Native cursor + .input focus ring carry the invitation; same recipe
  // as Feedback's "Paste your draft" textarea.
  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true });
  }, []);

  const triggerAlert = () => {
    setAlerting(false);
    requestAnimationFrame(() => {
      setAlerting(true);
      window.setTimeout(() => setAlerting(false), 450);
    });
  };

  const onSubmit = async () => {
    if (busy) return;
    const trimmed = query.trim();
    if (!trimmed) {
      triggerAlert();
      return;
    }
    setBusy(true);
    setError(null);
    setCommittedQuery(trimmed);
    try {
      const res = await api.search(token, { query: trimmed });
      setResult(res);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Search failed.");
      setResult(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col">
      {/* === Compose zone ===
          Single utility input + black submit. Per CLAUDE.md pattern 5, the
          button stays clickable; an empty submit nudges the input. */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void onSubmit();
        }}
        className="flex flex-col gap-3"
      >
        <div className={cn(alerting && "animate-editorial-nudge")}>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search a phrase, line, or word..."
            disabled={disabled || busy}
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            className={cn(
              "input font-serif text-[15.5px] text-ink-900 placeholder:font-serif placeholder:italic placeholder:text-ink-400",
              alerting && "!border-ink-400",
            )}
          />
        </div>
        <div className="flex items-center justify-end pt-1">
          <button type="submit" className="btn-primary group gap-1.5" disabled={disabled || busy}>
            {busy ? (
              <>
                <span className="relative inline-flex h-2 w-2 shrink-0" aria-hidden="true">
                  <span className="absolute inline-flex h-full w-full animate-editorial-pulse rounded-full bg-ink-50/50" />
                  <span className="relative inline-flex h-2 w-2 animate-editorial-pulse rounded-full bg-ink-50" />
                </span>
                <span>Searching...</span>
              </>
            ) : (
              <>
                <span>Search</span>
                <span aria-hidden="true" className="btn-ask-arrow">→</span>
              </>
            )}
          </button>
        </div>
        {error && (
          <div className="rounded-md border border-critical-100 bg-critical-100/40 px-3 py-2 text-[13px] text-critical-700">
            {error}
          </div>
        )}
      </form>

      {/* === Result zone ===
          The constellation is the centerpiece. It mounts during search
          (papers shimmer) and stays after results return (matched papers
          light up + numbered title list under). The detailed snippet
          cards expand below for the actual matched text. */}
      <div className="mt-14 flex flex-col gap-10">
        {busy && <PaperConstellation state="searching" matches={[]} />}

        {!busy && result && committedQuery && result.results.length > 0 && (
          <>
            <PaperConstellation state="showing" matches={result.results} />
            <div className="flex items-center gap-3">
              <span className="type-eyebrow text-ink-400">
                {pluralize(result.totalMatches, "match", "matches")} across {pluralize(result.totalPosts, "post")}
              </span>
              <span className="h-px flex-1 bg-ink-200/60" />
            </div>
            <div className="flex flex-col gap-4">
              {result.results.map((r) => (
                <SearchResultCard key={r.postId} result={r} />
              ))}
            </div>
          </>
        )}

        {!busy && result && committedQuery && result.results.length === 0 && (
          <div className="panel flex flex-col gap-2 p-5">
            <span className="type-eyebrow text-ink-400">No matches</span>
            <p className="text-[14px] leading-relaxed text-ink-600">
              Nothing in your archive matches{" "}
              <span className="font-mono text-[12.5px] text-ink-700">&ldquo;{committedQuery}&rdquo;</span>. Try a shorter
              phrase or different spelling.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function SearchResultCard({ result }: { result: SearchResult }) {
  const moreCount = result.matchCount - result.snippets.length;
  return (
    <article className="panel flex flex-col gap-3 p-5">
      <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-ink-200/60 pb-3">
        <h3 className="font-serif text-[18px] leading-tight tracking-tightish text-ink-900">{result.postTitle}</h3>
        <div className="flex items-center gap-2 font-mono text-[11px] text-ink-500">
          {result.publishedAt && <span>{formatDate(result.publishedAt)}</span>}
          <span aria-hidden="true">·</span>
          <span>{hostnameOf(result.postUrl)}</span>
          <span aria-hidden="true">·</span>
          <span>
            {pluralize(result.matchCount, "match", "matches")}
          </span>
        </div>
      </header>
      <ul className="flex flex-col gap-2.5">
        {result.snippets.map((snippet, i) => (
          <li key={i}>
            <SnippetRow snippet={snippet} postUrl={result.postUrl} />
          </li>
        ))}
      </ul>
      {moreCount > 0 && (
        <div className="text-[12.5px] italic text-ink-500">
          + {pluralize(moreCount, "more match", "more matches")} in this post.
        </div>
      )}
    </article>
  );
}

function SnippetRow({ snippet, postUrl }: { snippet: SearchSnippet; postUrl: string }) {
  // Web Standard "Text Fragments" — appending #:~:text=ENCODED to a URL makes
  // Chrome / Firefox / Edge auto-scroll to and highlight the matching text on
  // the destination page. If the match crosses HTML formatting in Substack's
  // rendered article it may fail to highlight, but the URL still opens to the
  // right post.
  const fragment = `#:~:text=${encodeURIComponent(snippet.match)}`;
  return (
    <a
      href={`${postUrl}${fragment}`}
      target="_blank"
      rel="noreferrer"
      className="group flex items-start gap-3 rounded-md border border-transparent px-2 py-1.5 transition-colors duration-150 ease-editorial hover:border-ink-200 hover:bg-ink-50/60"
    >
      <p className="min-w-0 flex-1 font-serif text-[14.5px] leading-relaxed text-ink-700">
        {snippet.before && <span className="text-ink-500">…{snippet.before}</span>}
        <mark className="rounded-sm bg-accent-100 px-0.5 font-medium text-ink-900">{snippet.match}</mark>
        {snippet.after && <span className="text-ink-500">{snippet.after}…</span>}
      </p>
      <span
        aria-hidden="true"
        className="shrink-0 self-center text-[12.5px] text-ink-400 opacity-0 transition-all duration-200 ease-editorial group-hover:translate-x-0.5 group-hover:text-accent-700 group-hover:opacity-100"
      >
        Open →
      </span>
    </a>
  );
}
