import type { ReactNode } from "react";

/**
 * Shared visual scaffold for /login and /register.
 *
 * Mirrors the marketing hero's atmosphere — same bronze radial washes, same
 * rise-in delays — so the visitor crossing from / to an auth screen never
 * feels dropped onto a flat utility page. The eyebrow uses the editorial §
 * section marker rhythm; the headline stays direct so auth screens feel
 * operational rather than promotional.
 */
export function AuthSurface({
  eyebrow,
  headline,
  subhead,
  children,
}: {
  eyebrow: string;
  headline: ReactNode;
  subhead: string;
  children: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(900px 360px at 18% -10%, rgba(180, 94, 44, 0.07), transparent 60%), radial-gradient(800px 320px at 100% 0%, rgba(180, 94, 44, 0.04), transparent 55%)",
        }}
      />

      <div className="mx-auto flex w-full max-w-md flex-col px-6 py-20 md:py-24">
        <span className="animate-rise animate-delay-1 font-mono text-[11px] uppercase tracking-[0.16em] text-accent-700">
          {eyebrow}
        </span>
        <h1 className="animate-rise animate-delay-2 mt-3 font-serif text-[34px] leading-[1.08] tracking-tightish text-ink-900 md:text-[40px]">
          {headline}
        </h1>
        <p className="animate-rise animate-delay-3 mt-4 max-w-prose font-serif text-[16px] leading-relaxed text-ink-600">
          {subhead}
        </p>
        <div className="animate-rise animate-delay-4 mt-9">{children}</div>
      </div>
    </section>
  );
}
