"use client";

import { usePathname } from "next/navigation";

export function SiteFooter() {
  const pathname = usePathname();
  // Computed, not written down. A hardcoded year is wrong every January and
  // nobody notices until someone screenshots the footer.
  const year = new Date().getFullYear();
  // The full editorial colophon belongs to the marketing surfaces — landing
  // and About. Every other page (workspace, account, auth, /publications/new) gets the
  // quieter minimal footer so the reading surface stays calm.
  const isMarketing = pathname === "/" || pathname === "/about";

  if (isMarketing) {
    return <LandingFooter year={year} />;
  }

  return <WorkspaceFooter year={year} />;
}

function LandingFooter({ year }: { year: number }) {
  return (
    <footer className="border-t border-ink-200/50">
      <div className="mx-auto max-w-3xl px-6 py-10 text-center">
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
          <span aria-hidden="true" className="site-wordmark-mark font-serif text-[15px] leading-none text-accent-500/80">
            §
          </span>
          <span aria-hidden="true" className="h-px flex-1 bg-ink-200" />
        </div>

        {/* Colophon credit. Quietly informational, mono caps, low contrast. */}
        <p className="mt-6 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 font-mono text-[10.5px] uppercase tracking-[0.18em] text-ink-400">
          <span suppressHydrationWarning>© {year} Scaffold</span>
          <span aria-hidden="true" className="text-ink-300">
            ·
          </span>
          <span>
            Built by{" "}
            <a href="https://aviralagarwal.com" target="_blank" rel="noopener noreferrer" className="colophon-link">
              Aviral Agarwal
            </a>
          </span>
          <span aria-hidden="true" className="text-ink-300">
            ·
          </span>
          <span>
            Open source on{" "}
            <a
              href="https://github.com/aviralagarwal1/scaffold"
              target="_blank"
              rel="noopener noreferrer"
              className="colophon-link"
            >
              GitHub
            </a>
          </span>
        </p>
      </div>
    </footer>
  );
}

function WorkspaceFooter({ year }: { year: number }) {
  return (
    <footer className="mt-8 border-t border-ink-200/40">
      <div className="mx-auto max-w-6xl px-6 py-4 text-right">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-300" suppressHydrationWarning>
          © {year} Aviral Agarwal
        </p>
      </div>
    </footer>
  );
}
