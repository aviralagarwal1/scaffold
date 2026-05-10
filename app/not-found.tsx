import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-32 text-center">
      <p className="animate-fade animate-delay-1 font-mono text-[10.5px] uppercase tracking-[0.16em] text-accent-700">
        § 404
      </p>
      <h1 className="animate-rise animate-delay-2 mt-4 font-serif text-[40px] leading-[1.08] tracking-tightish text-ink-900">
        Nothing here.
      </h1>
      <p className="animate-rise animate-delay-3 mt-3 font-serif text-[16.5px] leading-relaxed text-ink-600">
        If you were looking for a workspace, double-check the private link you were given. Otherwise, start a new one.
      </p>
      <div className="animate-rise animate-delay-4 mt-10 flex justify-center gap-3">
        <Link href="/" className="btn-secondary">
          Home
        </Link>
        <Link href="/publications/new" className="btn-primary">
          Start a workspace
        </Link>
      </div>
    </div>
  );
}
