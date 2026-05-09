"use client";

import { useEffect, useState } from "react";
import type { WorkspaceStatus } from "@/types/workspace";
import { cn } from "@/lib/client/cn";

const PHRASES = [
  "Reading your archive...",
  "Finding recurring themes...",
  "Building your writing memory...",
  "Preparing your AI editor...",
];

export function IngestionProgress({
  status,
  postCount,
  error,
  onRetry,
}: {
  status: WorkspaceStatus;
  postCount: number;
  error?: string | null;
  onRetry?: () => void;
}) {
  const [phraseIndex, setPhraseIndex] = useState(0);

  useEffect(() => {
    if (status !== "pending" && status !== "ingesting") return;
    const id = setInterval(() => setPhraseIndex((i) => (i + 1) % PHRASES.length), 2400);
    return () => clearInterval(id);
  }, [status]);

  if (status === "failed") {
    return (
      <div className="panel flex flex-col gap-3 border-critical-100 bg-critical-100/30 p-5">
        <span className="type-eyebrow text-critical-700">Ingestion failed</span>
        <div className="type-h3">We couldn't read this Substack.</div>
        <p className="type-body text-ink-700">
          {error ?? "Try double-checking the URL. If the publication is brand new, it may not have a public RSS feed yet."}
        </p>
        {onRetry && (
          <div>
            <button onClick={onRetry} className="btn-secondary">
              Try ingestion again
            </button>
          </div>
        )}
      </div>
    );
  }

  const isWorking = status === "pending" || status === "ingesting";
  const dotClass = isWorking
    ? "bg-accent-500 animate-editorial-pulse"
    : status === "ready"
      ? "bg-positive-500"
      : "bg-warn-500";

  const headline = isWorking
    ? PHRASES[phraseIndex]
    : status === "ready"
      ? "Your archive is ready."
      : "Partial archive ingested.";

  return (
    <div className="panel flex flex-col gap-2.5 p-5">
      <div className="flex items-center gap-3">
        <span className={cn("inline-block h-2 w-2 rounded-full", dotClass)} aria-hidden="true" />
        <span className="font-serif text-[17px] tracking-tightish text-ink-900">{headline}</span>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 type-meta">
        {postCount > 0 && <span>{postCount.toLocaleString()} posts indexed so far</span>}
        {status === "partial" && <span>Some posts could not be parsed.</span>}
        {isWorking && postCount === 0 && <span>This usually takes under a minute.</span>}
      </div>
    </div>
  );
}
