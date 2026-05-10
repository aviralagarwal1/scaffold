import Link from "next/link";
import type { WorkspaceStatus } from "@/types/workspace";
import { cn } from "@/lib/client/cn";

export function NotReadyNotice({
  status,
  token,
  feature,
  className,
}: {
  status: WorkspaceStatus;
  token: string;
  feature: string;
  className?: string;
}) {
  const isWorking = status === "pending" || status === "ingesting";
  const isFailed = status === "failed";

  return (
    <div className={cn("panel flex flex-col gap-3 p-5", className)}>
      <span className="type-eyebrow text-ink-400">Not yet available</span>
      <div className="type-h3">
        {isFailed ? `${feature} needs an ingested library.` : `${feature} unlocks once ingestion finishes.`}
      </div>
      <p className="type-body">
        {isWorking
          ? "We're still reading your library in the background."
          : "Head back to the overview to retry ingestion."}
      </p>
      <div className="pt-1">
        <Link href={`/workspace/${token}`} className="btn-secondary">
          Back to overview
        </Link>
      </div>
    </div>
  );
}
