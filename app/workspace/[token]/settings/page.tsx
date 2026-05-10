"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useWorkspace } from "@/components/WorkspaceProvider";
import { PrivateLinkBanner } from "@/components/PrivateLinkBanner";
import { PageHeader } from "@/components/PageHeader";
import { formatDate, hostnameOf, pluralize } from "@/lib/client/format";

// Idle sparkle positions — same staggered delays as the LogoCTA so the
// settings logo breathes on the same rhythm as the closing-CTA mark.
const SPARKLES = [
  { top: "8%", right: "16%", fontSize: "10px", delay: "0s" },
  { top: "22%", left: "10%", fontSize: "8px", delay: "1.1s" },
  { bottom: "14%", right: "8%", fontSize: "9px", delay: "2.2s" },
  { bottom: "10%", left: "20%", fontSize: "7px", delay: "3.3s" },
  { top: "48%", right: "-2%", fontSize: "8px", delay: "1.7s" },
  { top: "38%", left: "-2%", fontSize: "6px", delay: "3.8s" },
];

export default function SettingsPage() {
  const { token, overview, reingest, reingesting } = useWorkspace();

  // Certification beat: when a sync transitions from running → done with no
  // fresh error, hold the button in a "Synced." state for ~2.2s so the user
  // gets clear visual confirmation that wasn't otherwise apparent.
  const [justSynced, setJustSynced] = useState(false);
  const wasReingesting = useRef(false);
  useEffect(() => {
    if (!reingesting && wasReingesting.current && !overview?.ingestionError) {
      setJustSynced(true);
      const t = setTimeout(() => setJustSynced(false), 2200);
      wasReingesting.current = reingesting;
      return () => clearTimeout(t);
    }
    wasReingesting.current = reingesting;
  }, [reingesting, overview?.ingestionError]);

  if (!overview) return null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Configure your workspace."
        meta="Refresh your library, find your private link, and see what we never read."
      />

      <PrivateLinkBanner token={token} />

      <section className="panel flex flex-col gap-3 p-5">
        <span className="type-eyebrow text-ink-400">Publication</span>
        <div className="font-serif text-[17px] leading-tight tracking-tightish text-ink-900">
          {overview.publicationName ?? hostnameOf(overview.publicationUrl)}
        </div>
        <dl className="mt-2 grid grid-cols-2 gap-y-2 text-[12.5px] text-ink-700">
          <dt className="text-ink-500">Status</dt>
          <dd className="capitalize">{overview.status}</dd>
          <dt className="text-ink-500">Number of posts</dt>
          <dd>{pluralize(overview.postCount, "post")}</dd>
          <dt className="text-ink-500">Last indexed</dt>
          <dd>{overview.lastIngestedAt ? formatDate(overview.lastIngestedAt, { withTime: true }) : "Not yet"}</dd>
        </dl>
      </section>

      <section className="panel flex flex-col gap-3 p-5">
        <h3 className="type-h3">Refresh library</h3>
        <p className="text-[14px] leading-relaxed text-ink-600">
          Pull your latest posts and refresh chunks. Existing chat history and saved drafts stay where they are.
        </p>
        <div>
          <button
            type="button"
            onClick={reingest}
            disabled={reingesting || justSynced}
            className={`group inline-flex h-10 items-center gap-2 self-start rounded-md border bg-white px-3.5 text-[13px] font-medium shadow-soft transition-colors duration-300 ease-editorial disabled:cursor-not-allowed ${
              justSynced
                ? "border-positive-100 text-positive-700"
                : "border-ink-200 text-ink-800 hover:border-accent-300 hover:bg-accent-50/40 disabled:opacity-60"
            }`}
          >
            {justSynced ? (
              <>
                <span className="relative inline-flex h-3 w-3 shrink-0 items-center justify-center" aria-hidden="true">
                  <span className="absolute inline-flex h-3 w-3 animate-editorial-bloom rounded-full bg-positive-500/40" />
                  <svg
                    viewBox="0 0 12 12"
                    className="relative h-[11px] w-[11px] animate-fade text-positive-700"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M2.5 6.4 L5 8.8 L9.6 3.6" />
                  </svg>
                </span>
                <span className="animate-fade font-serif italic text-positive-700">Synced.</span>
              </>
            ) : reingesting ? (
              <>
                <span className="relative inline-flex h-2 w-2 shrink-0" aria-hidden="true">
                  <span className="absolute inline-flex h-full w-full animate-editorial-pulse rounded-full bg-ink-400/40" />
                  <span className="relative inline-flex h-2 w-2 animate-editorial-pulse rounded-full bg-ink-400" />
                </span>
                <span className="font-serif italic text-ink-500">Syncing your workspace...</span>
              </>
            ) : (
              <>
                <span className="font-serif italic text-ink-500 group-hover:text-ink-700">Sync workspace</span>
                <span aria-hidden="true" className="text-ink-400 transition-transform duration-200 ease-editorial group-hover:translate-x-0.5 group-hover:text-accent-700">
                  →
                </span>
              </>
            )}
          </button>
        </div>
        {overview.ingestionError && (
          <div className="rounded-md border border-critical-100 bg-critical-100/40 px-3 py-2 text-[12.5px] text-critical-700">
            Last error. {overview.ingestionError}
          </div>
        )}
      </section>

      {/* The space the privacy section once held. The § wordmark, breathing
          and casting sparkles, becomes a quiet editorial signature at the
          bottom of the settings shelf — purely atmospheric, not interactive. */}
      <section className="flex justify-center py-12">
        <div className="relative inline-flex h-[6.5rem] w-[6.5rem] items-center justify-center" aria-hidden="true">
          <span className="logo-cta-glow" />
          <span className="logo-cta-mark">§</span>
          {SPARKLES.map((s, i) => (
            <span
              key={i}
              className="logo-cta-sparkle"
              style={{
                top: s.top,
                bottom: s.bottom,
                left: s.left,
                right: s.right,
                fontSize: s.fontSize,
                animationDelay: s.delay,
              }}
            >
              ✦
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
