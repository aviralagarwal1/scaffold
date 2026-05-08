import Link from "next/link";
import { overviewCta, WORKSPACE_PAGE_COPY, type OverviewSection } from "@/lib/copy";

export function InsightCard({
  section,
  token,
}: {
  section: OverviewSection;
  token: string;
}) {
  const { title, description } = WORKSPACE_PAGE_COPY[section];
  return (
    <Link
      href={`/workspace/${token}/${section}`}
      className="group relative flex h-full flex-col justify-between overflow-hidden rounded-md border border-ink-200/80 bg-white p-5 shadow-soft transition-all duration-200 ease-editorial hover:-translate-y-0.5 hover:border-ink-300 hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-300 focus-visible:ring-offset-2"
    >
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent-300 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100"
      />
      <div>
        <h3 className="type-h3">{title}</h3>
        <p className="mt-1.5 text-[14px] leading-relaxed text-ink-600">{description}</p>
      </div>
      <div className="mt-5 inline-flex items-center gap-1 text-[13px] font-medium text-ink-900 transition-colors group-hover:text-accent-700">
        {overviewCta(section)}
        <span aria-hidden="true" className="transition-transform duration-150 group-hover:translate-x-0.5">→</span>
      </div>
    </Link>
  );
}
