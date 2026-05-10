"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { PrivateLinkBanner } from "@/components/PrivateLinkBanner";
import { useWorkspace } from "@/components/WorkspaceProvider";
import { api, ApiClientError } from "@/lib/client/api";
import { cn } from "@/lib/client/cn";
import { formatDate, hostnameOf, pluralize } from "@/lib/client/format";
import type { UserProfile } from "@/types/auth";

const SPARKLES = [
  { top: "8%", right: "16%", fontSize: "10px", delay: "0s" },
  { top: "22%", left: "10%", fontSize: "8px", delay: "1.1s" },
  { bottom: "14%", right: "8%", fontSize: "9px", delay: "2.2s" },
  { bottom: "10%", left: "20%", fontSize: "7px", delay: "3.3s" },
  { top: "48%", right: "-2%", fontSize: "8px", delay: "1.7s" },
  { top: "38%", left: "-2%", fontSize: "6px", delay: "3.8s" },
];

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

  const [justSynced, setJustSynced] = useState(false);
  const wasReingesting = useRef(false);
  useEffect(() => {
    if (!reingesting && wasReingesting.current && !overview?.ingestionError) {
      setJustSynced(true);
      const t = setTimeout(() => setJustSynced(false), 3500);
      wasReingesting.current = reingesting;
      return () => clearTimeout(t);
    }
    wasReingesting.current = reingesting;
  }, [reingesting, overview?.ingestionError]);

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

      <PrivateLinkBanner token={token} />

      <section className="panel flex flex-col gap-4 p-5">
        <header>
          <h3 className="type-h3">Publication</h3>
          <p className="mt-1 text-[12.5px] leading-snug text-ink-500">
            Settings that belong only to this publication.
          </p>
        </header>

        <PublicationNameField
          initial={overview.publicationName ?? hostnameOf(overview.publicationUrl)}
          token={token}
          onSaved={refetch}
        />

        <dl className="grid grid-cols-[max-content_minmax(0,1fr)] gap-x-6 gap-y-1.5 border-t border-ink-200/60 pt-3 text-[12.5px] text-ink-700">
          <dt className="text-ink-500">URL</dt>
          <dd className="font-mono text-[12px] text-ink-600">{overview.publicationUrl}</dd>
          <dt className="text-ink-500">Status</dt>
          <dd className="capitalize">{overview.status}</dd>
          <dt className="text-ink-500">Posts</dt>
          <dd>{pluralize(overview.postCount, "post")}</dd>
          <dt className="text-ink-500">Last indexed</dt>
          <dd>{overview.lastIngestedAt ? formatDate(overview.lastIngestedAt, { withTime: true }) : "Not yet"}</dd>
        </dl>
      </section>

      <section className="panel flex flex-col gap-3 p-5">
        <h3 className="type-h3">Library</h3>
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
              *
            </span>
          ))}
        </div>
      </section>
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
          <span className="type-eyebrow text-accent-700">Profile</span>
          <h3 className="mt-1.5 font-serif text-[18px] leading-snug tracking-tightish text-ink-900">
            Account-wide identity.
          </h3>
        </div>
        <Link href="/account" className="btn-secondary shrink-0">
          Manage account
        </Link>
      </header>
      <div className="grid gap-2 sm:grid-cols-3">
        <ProfileRow label="Creator" value={creatorDisplay} />
        <ProfileRow label="Email" value={profile?.email ?? null} mono />
        <ProfileRow label="Curator" value={profile?.editorName ?? null} />
      </div>
    </section>
  );
}

function ProfileRow({ label, value, mono = false }: { label: string; value: string | null; mono?: boolean }) {
  return (
    <Link
      href="/account"
      className="group rounded-md border border-ink-200/70 bg-ink-50/40 px-3 py-2.5 transition-all duration-200 ease-editorial hover:border-accent-300 hover:bg-accent-50/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-300"
      title="Profile fields are managed in account settings."
    >
      <span className="type-eyebrow text-ink-400">{label}</span>
      <span className={cn("mt-1 block truncate text-[13px] text-ink-800", mono && "font-mono text-[12px]")}>
        <ProfileValue value={value} />
      </span>
      <span className="mt-1.5 block font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink-400 transition-colors group-hover:text-accent-700">
        Account setting
      </span>
    </Link>
  );
}

function PublicationNameField({
  initial,
  token,
  onSaved,
}: {
  initial: string;
  token: string;
  onSaved: () => Promise<void>;
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
      window.setTimeout(() => setSaved(false), 2400);
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
        </div>
      </div>
      {error && <p className="font-serif italic text-[12.5px] text-ink-500">{error}</p>}
    </form>
  );
}

function SavedPip() {
  return (
    <span className="animate-fade flex items-center gap-1.5 font-serif italic text-[13px] text-positive-700">
      <span className="relative inline-flex h-2 w-2 items-center justify-center" aria-hidden="true">
        <span className="absolute inline-flex h-2 w-2 animate-editorial-bloom rounded-full bg-positive-500/40" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-positive-500" />
      </span>
      Saved.
    </span>
  );
}

function ProfileValue({ value }: { value?: string | null }) {
  if (value && value.trim().length > 0) return <>{value}</>;
  return <span className="font-serif italic text-ink-400">Not set</span>;
}
