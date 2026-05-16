"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useWorkspace } from "@/components/WorkspaceProvider";
import { api, ApiClientError } from "@/lib/client/api";
import { cn } from "@/lib/client/cn";
import { formatDate, hostnameOf, pluralize, statusLabel } from "@/lib/client/format";
import type { UserProfile } from "@/types/auth";
import type { TokenUsageSummary } from "@/types/workspace";

const SPARKLES = [
  { top: "8%", right: "16%", fontSize: "10px", delay: "0s" },
  { top: "22%", left: "10%", fontSize: "8px", delay: "1.1s" },
  { bottom: "14%", right: "8%", fontSize: "9px", delay: "2.2s" },
  { bottom: "10%", left: "20%", fontSize: "7px", delay: "3.3s" },
  { top: "48%", right: "-2%", fontSize: "8px", delay: "1.7s" },
  { top: "38%", left: "-2%", fontSize: "6px", delay: "3.8s" },
];

const TOKEN_ACTIONS = [
  {
    label: "Build workspace",
    estimate: [30_000, 75_000],
    note: "Reads the feed, indexes chunks, and curates recurring themes.",
  },
  {
    label: "Ask questions",
    estimate: [12_000, 25_000],
    note: "Grounds a short conversation in retrieved library passages.",
  },
  {
    label: "Evaluate drafts",
    estimate: [6_000, 12_000],
    note: "Reviews one draft against nearby library context.",
  },
  {
    label: "Proofread posts",
    estimate: [5_000, 30_000],
    note: "Scans the library for style-preserving clarity edits.",
  },
  {
    label: "Explore ideas",
    estimate: [4_000, 8_000],
    note: "Generates article ideas from recurring themes.",
  },
  {
    label: "Draft distribution",
    estimate: [1_000, 4_000],
    note: "Turns one source post into one platform draft.",
  },
  {
    label: "Surface directions",
    estimate: [1_000, 2_000],
    note: "Suggests a small set of library-aware prompts.",
  },
  {
    label: "Search quotes",
    estimate: [0, 0],
    note: "Searches the library literally; no model call.",
  },
] as const;

export default function SettingsPage() {
  const { token, overview, refetch, reingest, reingesting } = useWorkspace();
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    let active = true;
    api
      .me()
      .then((p) => {
        if (active) setProfile(p);
      })
      .catch((err) => {
        if (!active) return;
        if (!(err instanceof ApiClientError) || err.status !== 401) {
          // Settings remain useful even if account context cannot load.
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const [syncResult, setSyncResult] = useState<"success" | "failed" | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    };
  }, []);

  const flashSyncResult = (result: "success" | "failed") => {
    setSyncResult(result);
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => {
      setSyncResult(null);
      setSyncError(null);
    }, result === "success" ? 3500 : 4500);
  };

  const syncWorkspace = async () => {
    setSyncResult(null);
    setSyncError(null);
    try {
      await reingest();
      flashSyncResult("success");
    } catch (err) {
      setSyncError(err instanceof ApiClientError ? err.message : "Could not sync workspace.");
      flashSyncResult("failed");
    }
  };

  if (!overview) return null;

  const creatorDisplay =
    profile?.creatorName?.trim() ||
    (profile?.email?.includes("@") ? profile.email.split("@")[0] : "") ||
    null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Configure your workspace."
        meta="Profile is account-wide. Publication and library settings belong to this workspace."
      />

      <ProfilePanel profile={profile} creatorDisplay={creatorDisplay} />

      <TokenUsagePanel usage={overview.tokenUsage} />

      <section id="sync" className="scroll-mt-28 panel flex flex-col gap-4 p-5">
        <header>
          <div>
            <h3 className="font-serif text-[18px] leading-snug tracking-tightish text-ink-900">Publication</h3>
            <p className="mt-1 text-[12.5px] leading-snug text-ink-500">
              Settings and library sync for this workspace.
            </p>
          </div>
        </header>

        <PublicationNameField
          initial={overview.publicationName ?? hostnameOf(overview.publicationUrl)}
          token={token}
          onSaved={refetch}
          syncAction={
            <SyncWorkspaceButton
              onSync={syncWorkspace}
              reingesting={reingesting}
              syncResult={syncResult}
              syncError={syncError}
            />
          }
        />

        <dl className="grid grid-cols-[max-content_minmax(0,1fr)] gap-x-6 gap-y-1.5 border-t border-ink-200/60 pt-3 text-[12.5px] text-ink-700">
          <dt className="text-ink-500">URL</dt>
          <dd className="font-mono text-[12px] text-ink-600">{overview.publicationUrl}</dd>
          <dt className="text-ink-500">Status</dt>
          <dd>{statusLabel(overview.status)}</dd>
          <dt className="text-ink-500">Posts</dt>
          <dd>{pluralize(overview.postCount, "post")}</dd>
          <dt className="text-ink-500">Last read</dt>
          <dd>{overview.lastIngestedAt ? formatDate(overview.lastIngestedAt, { withTime: true }) : "Not yet"}</dd>
        </dl>
        {overview.ingestionError && (
          <div className="rounded-md border border-critical-100 bg-critical-100/40 px-3 py-2 text-[12.5px] text-critical-700">
            Last error. {overview.ingestionError}
          </div>
        )}
      </section>

      <section className="flex justify-center py-12">
        <div className="relative inline-flex h-[6.5rem] w-[6.5rem] items-center justify-center" aria-hidden="true">
          <span className="logo-cta-glow" />
          <span className="site-wordmark-mark logo-cta-mark">§</span>
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
              *
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}

function SyncWorkspaceButton({
  onSync,
  reingesting,
  syncResult,
  syncError,
}: {
  onSync: () => Promise<void>;
  reingesting: boolean;
  syncResult: "success" | "failed" | null;
  syncError: string | null;
}) {
  const justSynced = syncResult === "success";
  const syncFailed = syncResult === "failed";

  return (
    <button
      type="button"
      onClick={onSync}
      disabled={reingesting || justSynced || syncFailed}
      title={syncFailed && syncError ? syncError : undefined}
      className={`group inline-flex h-9 items-center gap-2 self-start rounded-md border bg-white px-4 text-[13px] font-medium shadow-soft transition-colors duration-300 ease-editorial disabled:cursor-not-allowed ${
        justSynced
          ? "border-positive-100 text-positive-700"
          : syncFailed
            ? "border-critical-100 text-critical-700"
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
      ) : syncFailed ? (
        <>
          <span className="relative inline-flex h-3 w-3 shrink-0 items-center justify-center" aria-hidden="true">
            <span className="absolute inline-flex h-3 w-3 animate-editorial-bloom rounded-full bg-critical-500/30" />
            <svg
              viewBox="0 0 12 12"
              className="relative h-[11px] w-[11px] animate-fade text-critical-700"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            >
              <path d="M3.2 3.2 L8.8 8.8" />
              <path d="M8.8 3.2 L3.2 8.8" />
            </svg>
          </span>
          <span className="animate-fade font-serif italic text-critical-700">Could not be synced.</span>
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
          <span aria-hidden="true" className="btn-ask-arrow text-ink-400 group-hover:text-accent-700">→</span>
        </>
      )}
    </button>
  );
}

function TokenUsagePanel({ usage }: { usage: TokenUsageSummary }) {
  const today = new Date();
  const resetDate = new Date(usage.resetsAt);
  const resetParts = new Intl.DateTimeFormat(undefined, {
    timeZone: usage.resetTimeZone,
    month: "long",
    day: "numeric",
  }).formatToParts(resetDate);
  const resetMonth = resetParts.find((part) => part.type === "month")?.value ?? "";
  const resetDay = Number(resetParts.find((part) => part.type === "day")?.value ?? "0");
  const dayPrefix = isTomorrow(today, resetDate, usage.resetTimeZone) ? "tomorrow, " : "";
  const resetLabel = new Date(usage.resetsAt).toLocaleString(undefined, {
    timeZone: usage.resetTimeZone,
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });

  return (
    <section id="usage" className="scroll-mt-28 panel flex flex-col gap-4 p-5">
      <header>
        <div>
          <h3 className="font-serif text-[18px] leading-snug tracking-tightish text-ink-900">
            Usage
          </h3>
          <p className="mt-1 text-[12.5px] leading-relaxed text-ink-500">
            You&apos;ve used {usage.used.toLocaleString()} of {usage.limit.toLocaleString()} available tokens today.
            The cards below estimate usage per action. Limits reset {dayPrefix}{resetMonth} {ordinal(resetDay)} at {resetLabel}.
          </p>
        </div>
      </header>

      <div className="h-2 overflow-hidden rounded-full bg-ink-100" aria-hidden="true">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-300 ease-editorial",
            usage.status === "exhausted"
              ? "bg-critical-500"
              : usage.status === "high"
                ? "bg-warn-500"
                : "bg-accent-500",
          )}
          style={{ width: `${usage.percent}%` }}
        />
      </div>

      <div className="grid gap-2 border-t border-ink-200/60 pt-3 sm:grid-cols-2">
        {TOKEN_ACTIONS.map((action) => (
          <TokenActionRow key={action.label} action={action} limit={usage.limit} />
        ))}
      </div>
    </section>
  );
}

function ordinal(value: number): string {
  const suffix = value % 100 >= 11 && value % 100 <= 13
    ? "th"
    : value % 10 === 1
      ? "st"
      : value % 10 === 2
        ? "nd"
        : value % 10 === 3
          ? "rd"
          : "th";
  return `${value}${suffix}`;
}

function isTomorrow(now: Date, target: Date, timeZone: string): boolean {
  const partsFor = (date: Date) => {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "numeric",
      day: "numeric",
    }).formatToParts(date);
    const get = (type: string) => Number(parts.find((part) => part.type === type)?.value);
    return { year: get("year"), month: get("month"), day: get("day") };
  };
  const current = partsFor(now);
  const next = new Date(Date.UTC(current.year, current.month - 1, current.day + 1));
  const tomorrow = partsFor(next);
  const targetParts = partsFor(target);
  return tomorrow.year === targetParts.year && tomorrow.month === targetParts.month && tomorrow.day === targetParts.day;
}

function TokenActionRow({
  action,
  limit,
}: {
  action: (typeof TOKEN_ACTIONS)[number];
  limit: number;
}) {
  const [low, high] = action.estimate;
  const percentLow = Math.round((low / limit) * 100);
  const percentHigh = Math.round((high / limit) * 100);
  const percentLabel = high === 0
    ? "0%"
    : percentLow === percentHigh
      ? `~${Math.max(1, percentLow)}%`
      : `~${Math.max(1, percentLow)}-${Math.max(1, percentHigh)}%`;

  return (
    <div className="rounded-md border border-ink-200/70 bg-ink-50/40 px-3 py-2.5 transition-all duration-200 ease-editorial hover:-translate-y-px hover:border-accent-300 hover:bg-accent-50/40 hover:shadow-soft">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-medium text-[13px] text-ink-800">{action.label}</span>
        <span className="shrink-0 font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-500">
          {percentLabel}
        </span>
      </div>
      <p className="mt-1 text-[12px] leading-snug text-ink-500">{action.note}</p>
    </div>
  );
}

function ProfilePanel({
  profile,
  creatorDisplay,
}: {
  profile: UserProfile | null;
  creatorDisplay: string | null;
}) {
  return (
    <section className="panel flex flex-col gap-4 p-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-serif text-[18px] leading-snug tracking-tightish text-ink-900">Profile</h3>
          <p className="mt-1 text-[12.5px] leading-snug text-ink-500">Account-wide identity.</p>
        </div>
        <Link href="/account" className="btn-secondary shrink-0">
          Manage account
        </Link>
      </header>
      <div className="grid gap-2 sm:grid-cols-3">
        <ProfileRow label="Creator" value={creatorDisplay} />
        <ProfileRow label="Email" value={profile?.email ?? null} />
        <ProfileRow label="Curator" value={profile?.editorName ?? null} />
      </div>
    </section>
  );
}

function ProfileRow({ label, value }: { label: string; value: string | null }) {
  return (
    <Link
      href="/account"
      className="group rounded-md border border-ink-200/70 bg-ink-50/40 px-3 py-2.5 transition-all duration-200 ease-editorial hover:border-accent-300 hover:bg-accent-50/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-300"
      title="Profile fields are managed in account settings."
    >
      <span className="type-eyebrow text-ink-400">{label}</span>
      <span className="mt-1 block truncate text-[13px] text-ink-800">
        <ProfileValue value={value} />
      </span>
    </Link>
  );
}

function PublicationNameField({
  initial,
  token,
  onSaved,
  syncAction,
}: {
  initial: string;
  token: string;
  onSaved: () => Promise<void>;
  syncAction: React.ReactNode;
}) {
  const [name, setName] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [alerting, setAlerting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!busy) setName(initial);
  }, [busy, initial]);

  const triggerAlert = () => {
    setAlerting(false);
    requestAnimationFrame(() => {
      setAlerting(true);
      window.setTimeout(() => setAlerting(false), 450);
    });
    inputRef.current?.focus();
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const publicationName = name.replace(/\s+/g, " ").trim();
    if (!publicationName || publicationName.length > 120) {
      setError(publicationName ? "Keep the publication name under 120 characters." : "Enter a publication name.");
      triggerAlert();
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await api.updateWorkspace(token, { publicationName });
      await onSaved();
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1800);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not update publication.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={save} className="flex flex-col gap-2" noValidate>
      <span className="type-eyebrow text-ink-400">Publication name</span>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          ref={inputRef}
          value={name}
          onChange={(event) => setName(event.target.value)}
          className={cn("input sm:max-w-md", alerting && "animate-editorial-nudge !border-ink-400")}
          disabled={busy}
          aria-invalid={alerting || undefined}
        />
        <div className="flex items-center gap-3">
          {saved && <SavedPip />}
          <button type="submit" className="btn-primary" disabled={busy || name.trim() === initial.trim()}>
            {busy ? "Saving..." : "Save"}
          </button>
          {syncAction}
        </div>
      </div>
      {error && <p className="font-serif italic text-[12.5px] text-ink-500">{error}</p>}
    </form>
  );
}

function SavedPip() {
  return (
    <span
      className="animate-fade relative inline-flex h-5 w-5 items-center justify-center text-positive-700"
      role="status"
      aria-label="Saved"
    >
      <span className="absolute inline-flex h-4 w-4 animate-editorial-bloom rounded-full bg-positive-500/35" />
      <svg
        viewBox="0 0 12 12"
        className="relative h-3.5 w-3.5 animate-fade"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M2.5 6.4 L5 8.8 L9.6 3.6" />
      </svg>
    </span>
  );
}

function ProfileValue({ value }: { value?: string | null }) {
  if (value && value.trim().length > 0) return <>{value}</>;
  return <span className="font-serif italic text-ink-400">Not set</span>;
}
