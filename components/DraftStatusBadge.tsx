import type { RepurposeDraftStatus } from "@/types/ai";
import { cn } from "@/lib/client/cn";

const STYLES: Record<RepurposeDraftStatus, string> = {
  pending: "border-accent-200 bg-accent-50/70 text-accent-700",
  saved: "border-warn-100 bg-warn-100/60 text-warn-700",
  approved: "border-positive-100 bg-positive-100/70 text-positive-700",
  deleted: "border-critical-100 bg-critical-100/60 text-critical-700",
};

const LABELS: Record<RepurposeDraftStatus, string> = {
  pending: "Pending",
  saved: "Saved",
  approved: "Approved",
  deleted: "Deleted",
};

const DOT: Record<RepurposeDraftStatus, string> = {
  pending: "bg-accent-500",
  saved: "bg-warn-500",
  approved: "bg-positive-500",
  deleted: "bg-critical-500",
};

export function DraftStatusBadge({ status }: { status: RepurposeDraftStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10.5px] font-medium uppercase tracking-[0.08em]",
        STYLES[status],
      )}
    >
      <span aria-hidden="true" className={cn("h-1.5 w-1.5 rounded-full", DOT[status])} />
      {LABELS[status]}
    </span>
  );
}
