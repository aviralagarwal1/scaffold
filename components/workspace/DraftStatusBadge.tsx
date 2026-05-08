import type { RepurposeDraftStatus } from "@/types/ai";
import { cn } from "@/lib/client/cn";

const STYLES: Record<RepurposeDraftStatus, string> = {
  pending: "border-warn-100 bg-warn-100/60 text-warn-700 shadow-[0_0_0_3px_rgba(234,179,8,0.10)]",
  saved: "border-positive-100 bg-positive-100/40 text-positive-700",
  deleted: "border-critical-100 bg-critical-100/60 text-critical-700",
};

const LABELS: Record<RepurposeDraftStatus, string> = {
  pending: "Pending",
  saved: "Saved",
  deleted: "Deleted",
};

const DOT: Record<RepurposeDraftStatus, string> = {
  pending: "bg-warn-500",
  saved: "bg-positive-500",
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
