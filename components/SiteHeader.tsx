"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-ink-200/60 bg-ink-50/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Link
          href="/"
          className="group flex items-center transition-opacity duration-200 ease-editorial hover:opacity-80"
          aria-label="Substack Agent · home"
        >
          <Wordmark />
        </Link>
        <nav className="flex items-center gap-1">{renderNavItem(pathname)}</nav>
      </div>
    </header>
  );
}

// Nav button is contextual:
//   /workspace/[token]/(any non-settings page) → "Sync Workspace" → that workspace's settings.
//   anywhere else                              → no nav action.
// /new still exists as a route (the sparkly logo on the landing page links
// there) — we just don't surface it from the nav bar.
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

  return null;
}

/**
 * Wordmark.
 *
 * The mark is the section symbol §, used historically by editors,
 * archivists, and cataloguers to denote a discrete passage of text.
 * It signals indexed, sectioned, citable knowledge — the product's
 * core promise — without resorting to AI-cliché iconography.
 *
 * Typography: "Substack" set roman, "Agent" set italic. The italic
 * carries the editorial voice (authorial, signed) without adding a
 * second typeface.
 */
function Wordmark({ size = "sm" }: { size?: "sm" | "lg" }) {
  const isLg = size === "lg";
  return (
    <span className={`flex items-baseline ${isLg ? "gap-2" : "gap-1.5"} leading-none`}>
      <span
        aria-hidden="true"
        className={`font-serif text-accent-500 ${isLg ? "text-[20px]" : "text-[16px]"}`}
        style={{ transform: "translateY(0.5px)" }}
      >
        §
      </span>
      <span
        className={`font-serif tracking-tightish text-ink-900 ${
          isLg ? "text-[22px]" : "text-[17px]"
        }`}
      >
        Substack <span className="italic">Agent</span>
      </span>
    </span>
  );
}
