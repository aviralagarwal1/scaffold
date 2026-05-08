"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import type { WorkspaceOverview } from "@/types/workspace";
import { cn } from "@/lib/client/cn";
import { formatRelative, hostnameOf, pluralize } from "@/lib/client/format";
import { WORKSPACE_TABS, WORKSPACE_UTILITY_TABS } from "@/lib/copy";

const PRIMARY_TABS = WORKSPACE_TABS.filter((tab) => !WORKSPACE_UTILITY_TABS.some((utility) => utility.slug === tab.slug));

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

  // On a phone only the first few tabs fit. Bring the active one into view so
  // a later section never opens with its own tab offscreen. Scroll the strip
  // itself rather than calling scrollIntoView, which would also move the page.
  const navRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const nav = navRef.current;
    const active = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!nav || !active || nav.scrollWidth <= nav.clientWidth) return;
    nav.scrollLeft = active.offsetLeft - (nav.clientWidth - active.offsetWidth) / 2;
  }, [pathname]);

  return (
    <div className="border-b border-ink-200/70 bg-white">
      <div className="mx-auto max-w-6xl px-6 pt-7">
        {/* Identity row */}
        <div className="flex flex-col gap-5 pb-5 md:flex-row md:items-start md:justify-between md:gap-8">
          <div className="flex min-w-0 flex-col gap-2">
            <h1 className="font-serif text-[26px] leading-none tracking-tightish text-ink-900 md:text-[30px]">
              {overview?.publicationName ?? "Your library"}
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
                <Link
                  href={`${base}/library`}
                  className="rounded-sm transition-colors hover:text-ink-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-300"
                >
                  {pluralize(overview.postCount, "post")}
                </Link>
                {overview.topThemes.length > 0 && (
                  <>
                    <Dot />
                    <Link
                      href={base}
                      className="rounded-sm transition-colors hover:text-ink-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-300"
                    >
                      {pluralize(overview.topThemes.length, "theme")}
                    </Link>
                  </>
                )}
                {overview.lastIngestedAt && (
                  <>
                    <Dot />
                    <span>last read {formatRelative(overview.lastIngestedAt)}</span>
                  </>
                )}
              </div>
            )}
          </div>

        </div>

        {/* Equal tracks share the content width; narrow screens scroll before labels crowd. */}
        {/* The edge fade on narrow screens signals that more tabs sit offscreen. */}
        <nav
          ref={navRef}
          className="-mb-px grid auto-cols-[minmax(7.5rem,1fr)] grid-flow-col overflow-x-auto overflow-y-hidden [mask-image:linear-gradient(to_right,transparent,black_1rem,black_calc(100%-2rem),transparent)] md:[mask-image:none]"
          aria-label="Workspace sections"
        >
          {PRIMARY_TABS.map((tab) => {
            const active = isActive(tab.slug);
            return (
              <Link
                key={tab.slug}
                href={tab.slug === "" ? base : `${base}/${tab.slug}`}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative whitespace-nowrap px-3 py-2.5 text-center text-[13px] font-medium tracking-tightish transition-colors duration-150 ease-editorial focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-300",
                  active ? "text-ink-900" : "text-ink-500 hover:text-ink-800",
                )}
              >
                {tab.label}
                {/* Keep the underline inside the link: even 1px below it creates a vertical scrollbar. */}
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute inset-x-2 bottom-0 h-[2px] rounded-full transition-colors duration-150",
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
