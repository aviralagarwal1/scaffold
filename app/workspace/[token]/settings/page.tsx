"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { DangerConfirmDialog } from "@/components/DangerConfirmDialog";
import { PageHeader } from "@/components/PageHeader";
import { useWorkspace } from "@/components/WorkspaceProvider";
import { api, ApiClientError } from "@/lib/client/api";
import { cn } from "@/lib/client/cn";
import { formatDate, hostnameOf, pluralize } from "@/lib/client/format";

const SPARKLES = [
  { top: "8%", right: "16%", fontSize: "10px", delay: "0s" },
  { top: "22%", left: "10%", fontSize: "8px", delay: "1.1s" },
  { bottom: "14%", right: "8%", fontSize: "9px", delay: "2.2s" },
  { bottom: "10%", left: "20%", fontSize: "7px", delay: "3.3s" },
  { top: "48%", right: "-2%", fontSize: "8px", delay: "1.7s" },
  { top: "38%", left: "-2%", fontSize: "6px", delay: "3.8s" },
];

export default function SettingsPage() {
  const router = useRouter();
  const { token, overview, refetch, reingest, reingesting } = useWorkspace();
  const [syncResult, setSyncResult] = useState<"success" | "failed" | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
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

  const deletePublication = async () => {
    if (deleteBusy) return;
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      await api.deleteWorkspace(token);
      router.push("/account");
      router.refresh();
    } catch (err) {
      setDeleteError(err instanceof ApiClientError ? err.message : "Could not delete publication.");
      setDeleteBusy(false);
    }
  };

  if (!overview) return null;

  const publicationDeleteName = overview.publicationName ?? hostnameOf(overview.publicationUrl);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="View your workspace."
        meta="Manage this publication's name, sync, and library settings."
      />

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
          <dt className="text-ink-500">Library</dt>
          <dd className="font-mono text-[12px] text-ink-600">{pluralize(overview.postCount, "post")}</dd>
          <dt className="text-ink-500">Themes</dt>
          <dd className="font-mono text-[12px] text-ink-600">{pluralize(overview.topThemes.length, "theme")}</dd>
          <dt className="text-ink-500">Synced</dt>
          <dd className="font-mono text-[12px] text-ink-600">
            {overview.lastIngestedAt ? formatDate(overview.lastIngestedAt, { withTime: true }) : "Not yet"}
          </dd>
        </dl>
        {overview.ingestionError && (
          <div className="rounded-md border border-critical-100 bg-critical-100/40 px-3 py-2 text-[12.5px] text-critical-700">
            Last error. {overview.ingestionError}
          </div>
        )}
      </section>

      <section className="panel flex flex-col gap-4 border-critical-100/70 p-5">
        <header>
          <span className="type-eyebrow text-critical-700">Danger Zone</span>
          <p className="mt-2 max-w-5xl text-[12.5px] leading-relaxed text-ink-500">
            Removes this workspace and frees the publication slot. Monthly tokens already used by this publication still count until the next reset.
          </p>
        </header>
        {deleteError && <p className="text-[12.5px] text-critical-700">{deleteError}</p>}
        <button
          type="button"
          onClick={() => {
            setDeleteError(null);
            setDeleteDialogOpen(true);
          }}
          disabled={deleteBusy}
          className="inline-flex h-9 items-center justify-center self-start rounded-md border border-critical-100 bg-white px-3.5 text-[13px] font-medium text-critical-700 shadow-soft transition-colors duration-150 ease-editorial hover:border-critical-500 hover:bg-critical-100/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-critical-500/40 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Delete publication
        </button>
      </section>

      <DangerConfirmDialog
        open={deleteDialogOpen}
        title="Delete Publication"
        description={
          <p>
            This removes the workspace and frees the publication slot. Monthly tokens already used by this publication
            still count until the next reset.
          </p>
        }
        confirmationValue={publicationDeleteName}
        confirmationLabel="Type this publication name to confirm"
        actionLabel="Delete publication"
        busyLabel="Deleting..."
        busy={deleteBusy}
        error={deleteError}
        onClose={() => {
          if (!deleteBusy) setDeleteDialogOpen(false);
        }}
        onConfirm={deletePublication}
      />

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
          <span className="animate-fade text-positive-700">Synced.</span>
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
          <span className="animate-fade text-critical-700">Could not be synced.</span>
        </>
      ) : reingesting ? (
        <>
          <span className="relative inline-flex h-2 w-2 shrink-0" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full animate-editorial-pulse rounded-full bg-ink-400/40" />
            <span className="relative inline-flex h-2 w-2 animate-editorial-pulse rounded-full bg-ink-400" />
          </span>
          <span className="text-ink-500">Syncing your workspace...</span>
        </>
      ) : (
        <>
          <span className="text-ink-500 group-hover:text-ink-700">Sync workspace</span>
          <span aria-hidden="true" className="btn-ask-arrow text-ink-400 group-hover:text-accent-700">→</span>
        </>
      )}
    </button>
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
      {error && <p className="text-[12.5px] text-ink-500">{error}</p>}
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

