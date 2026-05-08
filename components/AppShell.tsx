import Link from "next/link";
import type { ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-ink-50 text-ink-800 page-grain">
      <SiteHeader />
      <main>{children}</main>
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

function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-ink-200/50">
      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        {/* The mantra. Italic affirmation, roman negation — the editorial
            rhythm carries the emphasis without shouting. */}
        <p className="font-serif text-[20px] leading-[1.3] tracking-tightish md:text-[22px]">
          <span className="italic text-ink-700">Built for writers,</span>{" "}
          <span className="text-ink-900">not dashboards.</span>
        </p>

        {/* Hairline divider with § wordmark anchor — closes the page like a
            colophon closes a printed book. */}
        <div className="mx-auto mt-9 flex w-full max-w-[280px] items-center gap-3">
          <span aria-hidden="true" className="h-px flex-1 bg-ink-200" />
          <span aria-hidden="true" className="font-serif text-[15px] leading-none text-accent-500/80">
            §
          </span>
          <span aria-hidden="true" className="h-px flex-1 bg-ink-200" />
        </div>

        {/* Colophon credit. Quietly informational, mono caps, low contrast. */}
        <p className="mt-6 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 font-mono text-[10.5px] uppercase tracking-[0.18em] text-ink-400">
          <span>© 2026 Substack Agent</span>
          <span aria-hidden="true" className="text-ink-300">
            ·
          </span>
          <span>
            Built by <span className="text-ink-500">Aviral Agarwal</span>
          </span>
        </p>
      </div>
    </footer>
  );
}
