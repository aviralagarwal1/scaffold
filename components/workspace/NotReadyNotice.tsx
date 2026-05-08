import Link from "next/link";
import type { WorkspaceStatus } from "@/types/workspace";
import { cn } from "@/lib/client/cn";
import { WORKSPACE_PAGE_COPY, type WorkspacePage } from "@/lib/copy";

export function NotReadyNotice({
  status,
  token,
  section,
  className,
}: {
  status: WorkspaceStatus;
  token: string;
  section: WorkspacePage;
  className?: string;
}) {
  const feature = WORKSPACE_PAGE_COPY[section].label;
  const isWorking = status === "pending" || status === "ingesting";
  const isFailed = status === "failed";

  return (
    <div className={cn("panel flex flex-col gap-3 p-5", className)}>
      <span className="type-eyebrow text-ink-400">Not yet available</span>
      <div className="type-h3">
        {isFailed ? `Sync your library to use ${feature.toLowerCase()}.` : `${feature} will be available once syncing finishes.`}
      </div>
      <p className="type-body">
        {isWorking
          ? "We're still reading your library in the background."
          : "Head back to the overview to retry the sync."}
      </p>
      <div className="pt-1">
        <Link href={`/workspace/${token}`} className="btn-secondary">
          Back to overview
        </Link>
      </div>
    </div>
  );
}
