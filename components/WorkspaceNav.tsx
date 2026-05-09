"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { WorkspaceOverview } from "@/types/workspace";
import { cn } from "@/lib/client/cn";
import { formatRelative, hostnameOf, pluralize } from "@/lib/client/format";

const TABS = [
  { slug: "", label: "Overview" },
  { slug: "ask", label: "Conversation" },
  { slug: "draft", label: "Feedback" },
  { slug: "grammar", label: "Proofreading" },
  { slug: "ideas", label: "Exploration" },
  { slug: "distribution", label: "Distribution" },
  { slug: "archive", label: "Archive" },
  { slug: "settings", label: "Settings" },
] as const;

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

  return (
    <div className="border-b border-ink-200/70 bg-white">
      <div className="mx-auto max-w-6xl px-6 pt-7">
        {/* Identity row */}
        <div className="flex flex-col gap-5 pb-5 md:flex-row md:items-start md:justify-between md:gap-8">
          <div className="flex min-w-0 flex-col gap-2">
            <h1 className="font-serif text-[26px] leading-none tracking-tightish text-ink-900 md:text-[30px]">
              {overview?.publicationName ?? "Your Substack"}
            </h1>

            {/* Stats line */}
            {overview && (
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px] text-ink-500">
                <a
                  href={overview.publicationUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-ink-600 transition-colors duration-150 ease-editorial hover:text-accent-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-300"
                >
                  {hostnameOf(overview.publicationUrl)}
                </a>
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
              </div>
            )}
          </div>

        </div>

        {/* Tabs — strip is shifted left by the first tab's px-3 so "Overview"
            sits flush with the H1 and metadata above. */}
        <nav className="-mb-px -ml-3 flex gap-0.5 overflow-x-auto" aria-label="Workspace sections">
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

function Dot() {
  return (
    <span className="text-ink-300" aria-hidden="true">
      ·
    </span>
  );
}
