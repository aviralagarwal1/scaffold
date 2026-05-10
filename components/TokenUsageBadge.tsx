"use client";

import type { TokenUsageSummary } from "@/types/workspace";
import { cn } from "@/lib/client/cn";

export function TokenUsageBadge({
  usage,
  compact = false,
  showBar = false,
  label = "Token usage",
  compactSuffix = "usage",
}: {
  usage: TokenUsageSummary | null | undefined;
  compact?: boolean;
  showBar?: boolean;
  label?: string;
  compactSuffix?: string;
}) {
  if (!usage) return null;

  const barClassName =
    usage.status === "exhausted"
      ? "bg-critical-500"
      : usage.status === "high"
        ? "bg-warn-500"
        : "bg-accent-500";
  const resetLabel = new Date(usage.resetsAt).toLocaleString(undefined, {
    timeZone: usage.resetTimeZone,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });

  return (
    <span
      title={`Token usage resets ${resetLabel}`}
      className={cn(
        "group inline-flex items-center gap-2 font-mono text-[11px] text-ink-500 transition-colors hover:text-ink-700",
        !compact && "text-[10.5px] uppercase tracking-[0.14em]",
      )}
    >
      <span>{compact ? `${usage.percent}% ${compactSuffix}` : `${label} ${usage.used.toLocaleString()} / ${usage.limit.toLocaleString()}`}</span>
      {compact && (
        <span
          className={cn(
            "hidden h-1 w-16 overflow-hidden rounded-full bg-ink-100 transition-opacity duration-150 sm:inline-flex",
            showBar ? "opacity-100" : "opacity-0 group-hover:opacity-100",
          )}
          aria-hidden="true"
        >
          <span className={cn("h-full rounded-full", barClassName)} style={{ width: `${usage.percent}%` }} />
        </span>
      )}
    </span>
  );
}
