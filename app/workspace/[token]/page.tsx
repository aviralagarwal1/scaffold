"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useWorkspace } from "@/components/WorkspaceProvider";
import { PrivateLinkBanner } from "@/components/PrivateLinkBanner";
import { IngestionProgress } from "@/components/IngestionProgress";
import { InsightCard } from "@/components/InsightCard";
import { formatDate, pluralize } from "@/lib/client/format";
import type { ArchiveTheme } from "@/types/workspace";

export default function OverviewPage() {
  const { token, overview, reingest } = useWorkspace();
  if (!overview) return null;

  const ready = overview.status === "ready" || overview.status === "partial";
  const showIngestion = !ready;

  return (
    <div className="flex flex-col gap-8">
      {/* Top utility row: link + reingest */}
      <div className="animate-rise animate-delay-1">
        <PrivateLinkBanner token={token} />
      </div>

      {/* Ingestion status — only when not ready. Once ready, the nav header
          carries the live status, so we don't repeat it as a panel. */}
      {showIngestion && (
        <div className="animate-rise animate-delay-2">
          <IngestionProgress
            status={overview.status}
            postCount={overview.postCount}
            error={overview.ingestionError}
            onRetry={overview.status === "failed" ? reingest : undefined}
          />
        </div>
      )}

      {/* Asymmetric main composition */}
      <div className="grid gap-8 md:grid-cols-12 md:gap-x-10">
        {/* Left: where to start */}
        <section className="animate-rise animate-delay-3 flex flex-col gap-6 md:col-span-7">
          {ready && (
            <>
              <div className="flex items-baseline justify-between">
                <h3 className="font-serif text-[20px] tracking-tightish text-ink-900">Where to start</h3>
                <Link href={`/workspace/${token}/library`} className="btn-link">
                  Browse library <span aria-hidden="true">→</span>
                </Link>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <InsightCard
                  eyebrow="Conversation"
                  title="Ask your memory"
                  description="Ask your memory anything. Themes, patterns, and what to write next."
                  href={`/workspace/${token}/ask`}
                  cta="Start chat"
                />
                <InsightCard
                  eyebrow="Feedback"
                  title="Evaluate your draft"
                  description="Paste what you're working on. Get notes aligned with your voice and structure."
                  href={`/workspace/${token}/draft`}
                  cta="Get advice"
                />
                <InsightCard
                  eyebrow="Proofreading"
                  title="Proofread your posts"
                  description="It's never too late to catch a typo. Run an audit to find any grammar issues."
                  href={`/workspace/${token}/grammar`}
                  cta="Run audit"

                />
                <InsightCard
                  eyebrow="Distribution"
                  title="Repurpose your writing"
                  description="Generate posts for Facebook, Twitter, and more. You review and save."
                  href={`/workspace/${token}/distribution`}
                  cta="Open distribution"
                />
              </div>
            </>
          )}
        </section>

        {/* Right: archive rail — themes above, latest post below, one composed surface */}
        <aside className="animate-rise animate-delay-4 md:col-span-5">
          <ArchiveRail
            themes={overview.archiveThemes}
            latestPost={overview.latestPost}
          />
        </aside>
      </div>

    </div>
  );
}

function ArchiveRail({
  themes,
  latestPost,
}: {
  themes: ArchiveTheme[];
  latestPost: {
    title: string;
    subtitle: string | null;
    url: string;
    publishedAt: string | null;
    wordCount: number;
  } | null;
}) {
  const hasThemes = themes.length > 0;
  const hasLatest = !!latestPost;

  // Two layers of state on the chip strip:
  //   pinnedLabel — the chip the user has explicitly clicked to keep visible.
  //   hoveredLabel — transient preview while the cursor is on a chip.
  // Mount state: nothing pinned, no chip highlighted, no tagline showing. The
  // user has to actively hover or click to engage — no auto-default.
  const [pinnedLabel, setPinnedLabel] = useState<string | null>(null);
  const [hoveredLabel, setHoveredLabel] = useState<string | null>(null);

  const activeLabel = hoveredLabel ?? pinnedLabel;
  const activeTheme = activeLabel ? themes.find((theme) => theme.label === activeLabel) ?? null : null;

  const togglePin = (label: string) => {
    setPinnedLabel((prev) => (prev === label ? null : label));
  };

  // Hover intent. The first engagement waits HOVER_OPEN_MS so a quick mouse
  // flick across the chip strip doesn't flash the tagline. Once "warm,"
  // chip-to-chip switches are instant. Leaving a chip schedules a short
  // HOVER_CLOSE_MS grace so adjacent-chip transitions don't flicker.
  // Keyboard focus bypasses the delay — Tab is explicit intent.
  const HOVER_OPEN_MS = 160;
  const HOVER_CLOSE_MS = 90;
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warmRef = useRef(false);

  useEffect(
    () => () => {
      if (showTimerRef.current) clearTimeout(showTimerRef.current);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    },
    []
  );

  const handleChipHoverEnter = (label: string) => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    if (warmRef.current) {
      setHoveredLabel(label);
      return;
    }
    if (showTimerRef.current) clearTimeout(showTimerRef.current);
    showTimerRef.current = setTimeout(() => {
      warmRef.current = true;
      setHoveredLabel(label);
      showTimerRef.current = null;
    }, HOVER_OPEN_MS);
  };

  const handleChipHoverLeave = () => {
    if (showTimerRef.current) {
      clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      warmRef.current = false;
      setHoveredLabel(null);
      hideTimerRef.current = null;
    }, HOVER_CLOSE_MS);
  };

  if (!hasThemes && !hasLatest) {
    return (
      <div className="rounded-md border border-dashed border-ink-200 bg-white p-6 text-center">
        <span className="type-eyebrow text-ink-400">Library</span>
        <p className="mt-2 text-[14px] text-ink-500">
          Once we finish reading your library, themes and your latest essay will live here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {hasThemes && (
        <article className="relative flex flex-col overflow-hidden rounded-md border border-ink-200/80 bg-white shadow-soft">
          <span aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-accent-200/0 via-accent-300 to-accent-200/0" />
          <header className="flex items-center justify-between gap-3 border-b border-ink-200/60 bg-ink-50/40 px-5 py-2.5">
            <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-accent-700">Recurring themes</span>
            <span className="font-mono text-[10.5px] text-ink-500">
              {pluralize(themes.length, "theme")}
            </span>
          </header>
          <div className="flex flex-col gap-5 p-6">
            <div className="flex flex-wrap gap-1.5">
              {themes.map((theme) => (
                <button
                  key={theme.label}
                  type="button"
                  onMouseEnter={() => handleChipHoverEnter(theme.label)}
                  onMouseLeave={handleChipHoverLeave}
                  onFocus={() => setHoveredLabel(theme.label)}
                  onBlur={() => setHoveredLabel(null)}
                  onClick={() => togglePin(theme.label)}
                  aria-pressed={pinnedLabel === theme.label}
                  className={`theme-chip cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white ${
                    activeLabel === theme.label
                      ? "border-accent-200 bg-accent-50 text-accent-700 shadow-[0_0_0_3px_rgba(232,194,164,0.18)]"
                      : ""
                  }`}
                >
                  {theme.label}
                </button>
              ))}
            </div>
            {activeTheme && (
              <div key={activeTheme.label} className="animate-fade rounded-md border border-ink-200/60 bg-ink-50/60 px-3 py-2.5">
                <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-400">
                  {activeTheme.label}
                </div>
                <p className="mt-1 text-[13px] leading-relaxed text-ink-600">
                  {activeTheme.description}
                </p>
              </div>
            )}
          </div>
        </article>
      )}

      {hasLatest && <FeaturedLatestPost post={latestPost} />}
    </div>
  );
}

function FeaturedLatestPost({
  post,
}: {
  post: {
    title: string;
    subtitle: string | null;
    url: string;
    publishedAt: string | null;
    wordCount: number;
  };
}) {
  return (
    <article className="relative flex flex-col overflow-hidden rounded-md border border-ink-200/80 bg-white shadow-soft">
      <span aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-accent-200/0 via-accent-300 to-accent-200/0" />
      <header className="flex items-center justify-between gap-3 border-b border-ink-200/60 bg-ink-50/40 px-5 py-2.5">
        <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-accent-700">Latest post</span>
        {post.publishedAt && (
          <span className="font-mono text-[10.5px] text-ink-500">{formatDate(post.publishedAt)}</span>
        )}
      </header>
      <div className="flex flex-1 flex-col gap-3 p-6">
        <h3 className="font-serif text-[24px] leading-[1.15] tracking-tightish text-ink-900">{post.title}</h3>
        {post.subtitle && <p className="text-[15px] leading-relaxed text-ink-600">{post.subtitle}</p>}
        <div className="mt-auto flex items-center justify-between border-t border-ink-200/60 pt-3">
          <span className="font-mono text-[11px] text-ink-500">{pluralize(post.wordCount, "word")}</span>
          <a href={post.url} target="_blank" rel="noreferrer" className="btn-link">
            Read on Substack <span aria-hidden="true">→</span>
          </a>
        </div>
      </div>
    </article>
  );
}
