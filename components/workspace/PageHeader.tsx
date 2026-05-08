import type { ReactNode } from "react";
import { WORKSPACE_PAGE_COPY, type WorkspacePage } from "@/lib/copy";

/**
 * Compact page header for workspace tabs.
 *
 * The WorkspaceNav already establishes which section the user is on,
 * so the page itself shouldn't repeat that with a verbose eyebrow.
 * The key owns both lines, so individual pages cannot drift in grammar or tone.
 */
export function PageHeader({
  section,
  action,
}: {
  section: WorkspacePage;
  action?: ReactNode;
}) {
  const { title, description } = WORKSPACE_PAGE_COPY[section];
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h2 className="font-serif text-[24px] leading-snug tracking-tightish text-ink-900">{title}</h2>
        <p className="mt-1 text-[13.5px] leading-relaxed text-ink-500">{description}</p>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}
