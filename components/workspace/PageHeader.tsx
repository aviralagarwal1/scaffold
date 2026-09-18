import type { ReactNode } from "react";

/**
 * Compact page header for workspace tabs.
 *
 * The WorkspaceNav already establishes which section the user is on,
 * so the page itself shouldn't repeat that with a verbose eyebrow.
 * This header is a tight one-line title plus optional meta + action.
 */
export function PageHeader({
  title,
  meta,
  action,
}: {
  title: string;
  meta?: string;
  action?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h2 className="font-serif text-[24px] leading-snug tracking-tightish text-ink-900">{title}</h2>
        {meta && <p className="mt-1 text-[13.5px] text-ink-500">{meta}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}
