"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function SiteHeader() {
  const pathname = usePathname();
  const isLanding = pathname === "/";

  return (
    <header className="sticky top-0 z-30 border-b border-ink-200/60 bg-ink-50/85 backdrop-blur-md">
      <div className={`mx-auto flex max-w-6xl items-center justify-between px-6 ${isLanding ? "h-16 md:h-[72px]" : "h-14"}`}>
        <Link
          href="/"
          className="group flex items-center transition-opacity duration-200 ease-editorial hover:opacity-80"
          aria-label="Scaffold · home"
        >
          <Wordmark size={isLanding ? "lg" : "sm"} />
        </Link>
        <nav className="flex items-center gap-1">{renderNavItem(pathname)}</nav>
      </div>
    </header>
  );
}

// Nav item is contextual:
//   /workspace/[token]/(any non-settings page) → "Sync Workspace" → settings.
//   /about                                      → no nav item (already there).
//   anywhere else on the landing side (/, /new) → "About" link.
// /new still exists as a route (the sparkly logo on the landing page links
// there) — we just don't surface a button for it from the nav bar.
function renderNavItem(pathname: string | null): ReactNode {
  if (!pathname) return null;

  if (pathname.startsWith("/workspace/")) {
    const segments = pathname.split("/").filter(Boolean); // ["workspace", token, ...]
    const token = segments[1];
    const subpath = segments[2];
    if (!token) return null;
    if (subpath === "settings") return null;
    return (
      <Link href={`/workspace/${token}/settings`} className="btn-secondary">
        Sync Workspace
      </Link>
    );
  }

  if (pathname === "/about") return null;

  return (
    <Link
      href="/about"
      className="text-[13px] font-medium text-ink-700 transition-colors duration-150 ease-editorial hover:text-accent-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-300 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-50"
    >
      About
    </Link>
  );
}

/**
 * Wordmark.
 *
 * The mark is the section symbol §, used historically by editors,
 * archivists, and cataloguers to denote a discrete passage of text.
 * It signals indexed, sectioned, citable knowledge — the product's
 * core promise — without resorting to AI-cliché iconography.
 *
 * Typography: the product name is a single roman serif wordmark. The section
 * symbol carries the editorial accent that the old two-word mark split across
 * roman and italic text.
 */
function Wordmark({ size = "sm" }: { size?: "sm" | "lg" }) {
  const isLg = size === "lg";
  return (
    <span className={`flex items-baseline ${isLg ? "gap-2" : "gap-1.5"} leading-none`}>
      <span
        aria-hidden="true"
        className={`font-serif text-accent-500 ${isLg ? "text-[24px]" : "text-[16px]"}`}
        style={{ transform: "translateY(0.5px)" }}
      >
        §
      </span>
      <span
        className={`font-serif tracking-tightish text-ink-900 ${
          isLg ? "text-[26px]" : "text-[17px]"
        }`}
      >
        Scaffold
      </span>
    </span>
  );
}
