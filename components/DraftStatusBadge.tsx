import type { RepurposeDraftStatus } from "@/types/ai";
import { cn } from "@/lib/client/cn";

const STYLES: Record<RepurposeDraftStatus, string> = {
  generated: "border-ink-200 bg-ink-75 text-ink-700",
  saved: "border-warn-100 bg-warn-100/60 text-warn-700",
  approved: "border-positive-100 bg-positive-100/70 text-positive-700",
  deleted: "border-critical-100 bg-critical-100/60 text-critical-700",
};

const LABELS: Record<RepurposeDraftStatus, string> = {
  generated: "Generated",
  saved: "Saved",
  approved: "Approved",
  deleted: "Deleted",
};

export function DraftStatusBadge({ status }: { status: RepurposeDraftStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10.5px] font-medium uppercase tracking-[0.08em]",
        STYLES[status],
      )}
    >
      <span
        aria-hidden="true"
        className={cn("h-1.5 w-1.5 rounded-full", {
          "bg-ink-400": status === "generated",
          "bg-warn-500": status === "saved",
          "bg-positive-500": status === "approved",
          "bg-critical-500": status === "deleted",
        })}
      />
      {LABELS[status]}
    </span>
  );
}
