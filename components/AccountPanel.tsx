"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { UserProfile } from "@/types/auth";
import type { AccountWorkspaceSummary, WorkspaceStatus } from "@/types/workspace";
import { api, ApiClientError } from "@/lib/client/api";
import { cn } from "@/lib/client/cn";
import { formatRelative, hostnameOf, statusLabel } from "@/lib/client/format";
import { LoadingState } from "./states";
import { TokenUsageBadge } from "./TokenUsageBadge";

export function AccountPanel() {
  const router = useRouter();
  const params = useSearchParams();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [workspaces, setWorkspaces] = useState<AccountWorkspaceSummary[]>([]);
  const [loadBusy, setLoadBusy] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pendingPublicationUrl, setPendingPublicationUrl] = useState<string | null>(null);

  useEffect(() => {
    const raw = params?.get("publicationUrl");
    if (raw) setPendingPublicationUrl(raw.trim());
  }, [params]);

  useEffect(() => {
    let active = true;
    Promise.all([api.me(), api.listWorkspaces()])
      .then(([nextProfile, nextWorkspaces]) => {
        if (!active) return;
        setProfile(nextProfile);
        setWorkspaces(nextWorkspaces);
        setLoadError(null);
      })
      .catch((err) => {
        if (!active) return;
        setLoadError(err instanceof ApiClientError ? err.message : "Could not load account.");
      })
      .finally(() => {
        if (active) setLoadBusy(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!pendingPublicationUrl) return;
    router.replace(`/publications/new?publicationUrl=${encodeURIComponent(pendingPublicationUrl)}`);
  }, [pendingPublicationUrl, router]);

  if (loadBusy) {
    return (
      <div className="panel p-6">
        <LoadingState label="Loading your desk..." />
      </div>
    );
  }

  if (loadError && !profile) {
    return <div className="panel p-6 text-[13px] text-critical-700">{loadError}</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <PublicationsRegion workspaces={workspaces} profile={profile} />
      {profile?.plan && <AccountUsageCard profile={profile} />}
    </div>
  );
}

function PublicationsRegion({
  workspaces,
  profile,
}: {
  workspaces: AccountWorkspaceSummary[];
  profile: UserProfile | null;
}) {
  if (workspaces.length === 0) {
    return (
      <section className="flex flex-col items-start gap-4 rounded-md border border-dashed border-ink-200 bg-white/70 px-6 py-8">
        <div>
          <h2 className="font-serif text-[22px] leading-snug tracking-tightish text-ink-900">
            Add your first publication.
          </h2>
          <p className="mt-1.5 max-w-prose text-[14px] leading-relaxed text-ink-600">
            One workspace per publication, with its own library, themes, and drafts.
          </p>
        </div>
        <Link href="/publications/new" className="btn-primary btn-primary-lg group">
          <span className="relative inline-flex items-center gap-2">
            <span>Add your publication</span>
            <span
              aria-hidden="true"
              className="text-ink-300 transition-transform duration-200 ease-editorial group-hover:translate-x-0.5 group-hover:text-ink-50"
            >
              &rarr;
            </span>
          </span>
        </Link>
      </section>
    );
  }

  return <WorkspacesCard workspaces={workspaces} profile={profile} />;
}

function AccountUsageCard({ profile }: { profile: UserProfile }) {
  const plan = profile.plan;
  const resetDate = new Date(plan.tokenUsage.resetsAt);
  const resetDateParts = new Intl.DateTimeFormat("en-US", {
    timeZone: plan.tokenUsage.resetTimeZone,
    month: "long",
    day: "numeric",
  }).formatToParts(resetDate);
  const resetMonth = resetDateParts.find((part) => part.type === "month")?.value ?? "";
  const resetDay = Number(resetDateParts.find((part) => part.type === "day")?.value ?? "0");
  const resetTimeParts = new Intl.DateTimeFormat("en-US", {
    timeZone: plan.tokenUsage.resetTimeZone,
    hour: "numeric",
    minute: "2-digit",
  }).formatToParts(resetDate);
  const resetHour = resetTimeParts.find((part) => part.type === "hour")?.value ?? "";
  const resetMinute = resetTimeParts.find((part) => part.type === "minute")?.value ?? "00";
  const resetPeriod = resetTimeParts.find((part) => part.type === "dayPeriod")?.value ?? "";
  const resetLabel = `${resetMonth} ${ordinal(resetDay)} at ${resetHour}:${resetMinute}${resetPeriod}`;

  return (
    <section className="panel flex flex-col gap-4 p-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <span className="type-eyebrow text-accent-700">{plan.label} plan</span>
          <h2 className="mt-2 font-serif text-[20px] leading-snug tracking-tightish text-ink-900">
            Account Usage
          </h2>
        </div>
        <div className="flex shrink-0 flex-col items-start gap-1.5 sm:items-end">
          <span className="whitespace-nowrap rounded-full border border-ink-200 bg-ink-50 px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-500">
            {plan.activePublicationCount.toLocaleString()} / {plan.activePublicationLimit.toLocaleString()} active publication{plan.activePublicationLimit === 1 ? "" : "s"}
          </span>
        </div>
      </header>
      <p className="-mt-2 text-[13.5px] leading-relaxed text-ink-600">
        {plan.tokenUsage.used.toLocaleString()} of {plan.tokenUsage.limit.toLocaleString()} monthly tokens used. Deleted publication usage remains counted until reset. Limits reset {resetLabel}.
      </p>
      <div className="h-2 overflow-hidden rounded-full bg-ink-100" aria-hidden="true">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-300 ease-editorial",
            plan.tokenUsage.status === "exhausted"
              ? "bg-critical-500"
              : plan.tokenUsage.status === "high"
                ? "bg-warn-500"
                : "bg-accent-500",
          )}
          style={{ width: `${plan.tokenUsage.percent}%` }}
        />
      </div>
      {plan.id === "free" && (
        <div className="flex flex-col gap-2 border-t border-ink-200/60 pt-4 text-[13.5px] leading-relaxed text-ink-600 sm:flex-row sm:items-center sm:justify-between">
          <p>Need more room? Premium adds more monthly tokens and active publications.</p>
          <Link href="/account/plan" className="btn-link shrink-0">
            Upgrade here
          </Link>
        </div>
      )}
    </section>
  );
}

function ordinal(value: number): string {
  const suffix =
    value % 100 >= 11 && value % 100 <= 13
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

function WorkspacesCard({ workspaces, profile }: { workspaces: AccountWorkspaceSummary[]; profile: UserProfile | null }) {
  const plan = profile?.plan;
  const publicationLimitReached = Boolean(plan && plan.activePublicationCount >= plan.activePublicationLimit);

  return (
    <section className="panel flex flex-col gap-5 p-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <span className="type-eyebrow text-accent-700">Workspaces</span>
          {plan && (
            <div className="mt-2">
              <TokenUsageBadge usage={plan.tokenUsage} label="Monthly token usage: " />
            </div>
          )}
        </div>
        {publicationLimitReached ? (
          <span
            className="inline-flex h-9 shrink-0 items-center rounded-md border border-ink-200 bg-ink-50 px-4 text-[13px] font-medium text-ink-400"
            title={`${plan?.label ?? "This"} plan allows ${plan?.activePublicationLimit ?? 0} active publication${plan?.activePublicationLimit === 1 ? "" : "s"}.`}
          >
            Publication limit reached
          </span>
        ) : (
          <Link href="/publications/new" className="btn-secondary group shrink-0" aria-label="Add workspace">
            <span aria-hidden="true" className="mr-1.5 text-[15px] leading-none text-accent-500 group-hover:text-accent-700">
              +
            </span>
            Add publication
          </Link>
        )}
      </header>

      <ul className="flex flex-col gap-3">
        {workspaces.map((workspace) => (
          <WorkspaceRow key={workspace.id} workspace={workspace} showUsage={workspaces.length === 1} />
        ))}
      </ul>
    </section>
  );
}

function WorkspaceRow({ workspace, showUsage }: { workspace: AccountWorkspaceSummary; showUsage: boolean }) {
  const displayName = workspace.publicationName ?? hostnameOf(workspace.publicationUrl);
  const host = hostnameOf(workspace.publicationUrl);

  return (
    <li>
      <Link
        href={workspace.workspaceUrl}
        className="group flex items-center justify-between gap-4 rounded-md border border-ink-200/70 bg-white px-4 py-3.5 transition-all duration-200 ease-editorial hover:-translate-y-px hover:border-accent-300 hover:shadow-soft"
      >
        <div className="flex min-w-0 items-center gap-3.5">
          <span
            aria-hidden="true"
            className="site-wordmark-mark grid h-9 w-9 shrink-0 place-items-center rounded-md border border-ink-200/60 bg-ink-50/60 font-serif text-[18px] leading-none text-accent-500 transition-colors duration-200 ease-editorial group-hover:border-accent-200 group-hover:bg-accent-50/40 group-hover:text-accent-700"
          >
            &sect;
          </span>
          <div className="min-w-0">
            <div className="truncate font-serif text-[16px] leading-snug text-ink-900 group-hover:text-ink-900">
              {displayName}
            </div>
            <div className="mt-0.5 flex items-center gap-2 truncate font-mono text-[11px] tracking-tightish text-ink-500">
              <span className="truncate">{host}</span>
              {workspace.role !== "owner" && (
                <>
                  <span className="text-ink-300" aria-hidden="true">&middot;</span>
                  <span className="capitalize">{workspace.role}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {showUsage && <TokenUsageBadge usage={workspace.tokenUsage} compact showBar compactSuffix="account usage" />}
          <StatusBadge status={workspace.status} />
          {workspace.lastIngestedAt && (
            <span className="hidden font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-400 sm:inline">
              {formatRelative(workspace.lastIngestedAt)}
            </span>
          )}
          <span
            aria-hidden="true"
            className="text-ink-300 transition-all duration-200 ease-editorial group-hover:translate-x-0.5 group-hover:text-accent-700"
          >
            &rarr;
          </span>
        </div>
      </Link>
    </li>
  );
}

function StatusBadge({ status }: { status: WorkspaceStatus }) {
  const config = (() => {
    switch (status) {
      case "ready":
        return { label: statusLabel(status), className: "border-positive-100 bg-positive-100/40 text-positive-700" };
      case "ingesting":
      case "pending":
        return { label: statusLabel(status), className: "border-accent-200 bg-accent-50 text-accent-700" };
      case "partial":
        return { label: statusLabel(status), className: "border-accent-200 bg-accent-50/60 text-accent-700" };
      case "failed":
        return { label: statusLabel(status), className: "border-critical-100 bg-critical-100/40 text-critical-700" };
    }
  })();

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] ${config.className}`}
    >
      {(status === "ingesting" || status === "pending") && (
        <span className="relative inline-flex h-1.5 w-1.5" aria-hidden="true">
          <span className="absolute inline-flex h-1.5 w-1.5 animate-editorial-pulse rounded-full bg-accent-400/60" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent-500" />
        </span>
      )}
      {config.label}
    </span>
  );
}
