"use client";

import { useState } from "react";

function KeyMark() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true">
      <circle cx="5.5" cy="8" r="2.6" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M8.1 8h6.2M11.7 8v2.2M13.6 8v1.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function PrivateLinkBanner({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== "undefined" ? `${window.location.origin}/workspace/${token}` : `/workspace/${token}`;

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore
    }
  };

  return (
    <div className="panel flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-accent-200 bg-accent-50 text-accent-700">
          <KeyMark />
        </span>
        <div className="min-w-0">
          <div className="text-[13px] font-medium text-ink-900">This workspace is private to anyone with the link.</div>
          <div className="text-meta">Bookmark it if you want to return later.</div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <code className="hidden max-w-[300px] truncate rounded-md border border-ink-200 bg-ink-75 px-2 py-1 font-mono text-[11px] text-ink-700 sm:block">
          {url}
        </code>
        <button onClick={onCopy} className="btn-secondary">
          {copied ? "Copied" : "Copy link"}
        </button>
      </div>
    </div>
  );
}
