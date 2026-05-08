"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { WorkspaceOverview } from "@/types/workspace";
import { cn } from "@/lib/client/cn";
import { formatRelative, hostnameOf, pluralize } from "@/lib/client/format";

const TABS = [
  { slug: "", label: "Overview" },
  { slug: "ask", label: "Ask AI" },
  { slug: "draft", label: "Draft feedback" },
  { slug: "grammar", label: "Grammar audit" },
  { slug: "ideas", label: "Ideas" },
  { slug: "distribution", label: "Distribution" },
  { slug: "archive", label: "Archive" },
  { slug: "settings", label: "Settings" },
] as const;

const STATUS_LABEL: Record<WorkspaceOverview["status"], { label: string; tone: "live" | "working" | "idle" | "down" }> = {
  ready: { label: "Live", tone: "live" },
  partial: { label: "Partial", tone: "live" },
  pending: { label: "Reading", tone: "working" },
  ingesting: { label: "Reading", tone: "working" },
  failed: { label: "Failed", tone: "down" },
};

export function WorkspaceNav({
  token,
  overview,
}: {
  token: string;
  overview: WorkspaceOverview | null;
}) {
  const pathname = usePathname() ?? "";
  const base = `/workspace/${token}`;
  const isActive = (slug: string) => {
    if (slug === "") return pathname === base || pathname === `${base}/`;
    return pathname === `${base}/${slug}` || pathname.startsWith(`${base}/${slug}/`);
  };

  const onAsk = isActive("ask");
  const status = overview ? STATUS_LABEL[overview.status] : null;

  return (
    <div className="border-b border-ink-200/70 bg-white">
      <div className="mx-auto max-w-6xl px-6 pt-7">
        {/* Identity row */}
        <div className="flex flex-col gap-5 pb-5 md:flex-row md:items-start md:justify-between md:gap-8">
          <div className="flex min-w-0 flex-col gap-2">
            {/* Status + name */}
            <div className="flex items-center gap-3">
              {status && <StatusDot tone={status.tone} />}
              <h1 className="font-serif text-[26px] leading-none tracking-tightish text-ink-900 md:text-[30px]">
                {overview?.publicationName ?? "Your Substack"}
              </h1>
            </div>

            {/* Stats line */}
            {overview && (
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px] text-ink-500">
                <span className="text-ink-600">{hostnameOf(overview.publicationUrl)}</span>
                <Dot />
                <span>{pluralize(overview.postCount, "post")}</span>
                {overview.lastIngestedAt && (
                  <>
                    <Dot />
                    <span>last read {formatRelative(overview.lastIngestedAt)}</span>
                  </>
                )}
                {overview.topThemes.length > 0 && (
                  <>
                    <Dot />
                    <span>{pluralize(overview.topThemes.length, "theme")} detected</span>
                  </>
                )}
                {status && (
                  <>
                    <Dot />
                    <span className={cn("uppercase tracking-[0.12em]", toneTextClass(status.tone))}>
                      {status.label}
                    </span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Quick action — only shown when ready and not already on Ask */}
          {overview && (overview.status === "ready" || overview.status === "partial") && !onAsk && (
            <Link
              href={`${base}/ask`}
              className="group inline-flex h-10 items-center gap-2 self-start rounded-md border border-ink-200 bg-white px-3.5 text-[13px] font-medium text-ink-800 shadow-soft transition-colors duration-150 ease-editorial hover:border-accent-300 hover:bg-accent-50/40"
            >
              <span className="font-serif italic text-ink-500 group-hover:text-ink-700">Ask anything</span>
              <span aria-hidden="true" className="text-ink-400 transition-transform group-hover:translate-x-0.5 group-hover:text-accent-700">
                →
              </span>
            </Link>
          )}
        </div>

        {/* Tabs */}
        <nav className="-mb-px flex gap-0.5 overflow-x-auto" aria-label="Workspace sections">
          {TABS.map((tab) => {
            const active = isActive(tab.slug);
            return (
              <Link
                key={tab.slug}
                href={tab.slug === "" ? base : `${base}/${tab.slug}`}
                className={cn(
                  "relative whitespace-nowrap px-3 py-2.5 text-[13px] font-medium tracking-tightish transition-colors duration-150 ease-editorial",
                  active ? "text-ink-900" : "text-ink-500 hover:text-ink-800",
                )}
              >
                {tab.label}
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute inset-x-2 -bottom-px h-[2px] rounded-full transition-colors duration-150",
                    active ? "bg-accent-500" : "bg-transparent",
                  )}
                />
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

function StatusDot({ tone }: { tone: "live" | "working" | "idle" | "down" }) {
  const dotClass =
    tone === "live"
      ? "bg-positive-500"
      : tone === "working"
        ? "bg-accent-500"
        : tone === "down"
          ? "bg-critical-500"
          : "bg-ink-400";
  const halo =
    tone === "live"
      ? "bg-positive-500/50"
      : tone === "working"
        ? "bg-accent-500/45"
        : tone === "down"
          ? "bg-critical-500/45"
          : "bg-ink-400/40";
  const animate = tone === "live" || tone === "working";

  return (
    <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
      {animate && <span className={cn("absolute inline-flex h-full w-full animate-editorial-pulse rounded-full", halo)} />}
      <span className={cn("relative inline-flex h-2 w-2 rounded-full", dotClass)} />
    </span>
  );
}

function Dot() {
  return (
    <span className="text-ink-300" aria-hidden="true">
      ·
    </span>
  );
}

function toneTextClass(tone: "live" | "working" | "idle" | "down"): string {
  switch (tone) {
    case "live":
      return "text-positive-700";
    case "working":
      return "text-accent-700";
    case "down":
      return "text-critical-700";
    default:
      return "text-ink-500";
  }
}
