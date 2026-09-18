import Link from "next/link";

export function InsightCard({
  title,
  description,
  href,
  cta,
  eyebrow,
}: {
  title: string;
  description: string;
  href: string;
  cta: string;
  eyebrow?: string;
}) {
  return (
    <Link
      href={href}
      className="group relative flex h-full flex-col justify-between overflow-hidden rounded-md border border-ink-200/80 bg-white p-5 shadow-soft transition-all duration-200 ease-editorial hover:-translate-y-0.5 hover:border-ink-300 hover:shadow-lift"
    >
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent-300 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100"
      />
      <div>
        {eyebrow && <div className="mb-3 type-eyebrow text-ink-400">{eyebrow}</div>}
        <h3 className="type-h3">{title}</h3>
        <p className="mt-1.5 text-[14px] leading-relaxed text-ink-600">{description}</p>
      </div>
      <div className="mt-5 inline-flex items-center gap-1 text-[13px] font-medium text-ink-900 transition-colors group-hover:text-accent-700">
        {cta}
        <span className="transition-transform duration-150 group-hover:translate-x-0.5">→</span>
      </div>
    </Link>
  );
}
