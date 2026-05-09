import Link from "next/link";
import type { ReactNode } from "react";
import { SiteFooter } from "./SiteFooter";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-ink-50 text-ink-800 page-grain">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
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

function SiteHeader() {
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
        <nav className="flex items-center gap-1">
          <Link href="/new" className="btn-secondary">
            Start a workspace
          </Link>
        </nav>
      </div>
    </header>
  );
}
