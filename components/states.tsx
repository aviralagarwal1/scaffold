import type { ReactNode } from "react";
import { cn } from "@/lib/client/cn";

export function EmptyState({
  title,
  description,
  action,
  eyebrow,
  className,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  eyebrow?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-md border border-dashed border-ink-200 bg-white px-8 py-14 text-center",
        className,
      )}
    >
      {eyebrow && <span className="type-eyebrow text-ink-400">{eyebrow}</span>}
      <div className="type-h3">{title}</div>
      {description && <p className="max-w-prose text-[14px] leading-relaxed text-ink-500">{description}</p>}
      {action && <div className="mt-1.5">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = "Something went sideways",
  description,
  action,
  className,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-md border border-critical-100 bg-critical-100/40 px-5 py-4 text-[13px] text-critical-700",
        className,
      )}
    >
      <div className="font-medium text-critical-700">{title}</div>
      {description && <p className="text-critical-700/85">{description}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

export function LoadingState({ label = "Loading", className }: { label?: string; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5 text-[13px] text-ink-500", className)}>
      <span
        aria-hidden="true"
        className="inline-block h-3 w-3 animate-editorial-spin rounded-full border-[1.5px] border-ink-200 border-t-accent-500"
      />
      <span>{label}</span>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-ink-200/60", className)} />;
}
