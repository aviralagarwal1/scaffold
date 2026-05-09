"use client";

import Link from "next/link";
import { useWorkspace } from "@/components/WorkspaceProvider";
import { PrivateLinkBanner } from "@/components/PrivateLinkBanner";
import { IngestionProgress } from "@/components/IngestionProgress";
import { InsightCard } from "@/components/InsightCard";
import { formatDate, pluralize } from "@/lib/client/format";

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
                <Link href={`/workspace/${token}/archive`} className="btn-link">
                  Browse archive <span aria-hidden="true">→</span>
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
                  description="Generate posts for Facebook, Twitter, and more. You review and approve."
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
            themes={overview.topThemes}
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
  themes: string[];
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

  if (!hasThemes && !hasLatest) {
    return (
      <div className="rounded-md border border-dashed border-ink-200 bg-white p-6 text-center">
        <span className="type-eyebrow text-ink-400">Archive</span>
        <p className="mt-2 text-[14px] text-ink-500">
          Once we finish reading your archive, themes and your latest essay will live here.
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
          <div className="p-6">
            <div className="flex flex-wrap gap-1.5">
              {themes.map((t) => (
                <span key={t} className="theme-chip">
                  {t}
                </span>
              ))}
            </div>
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
