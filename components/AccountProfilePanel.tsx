"use client";

import { signOut } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { UserProfile } from "@/types/auth";
import { api, ApiClientError } from "@/lib/client/api";
import { cn } from "@/lib/client/cn";
import { DangerConfirmDialog } from "./DangerConfirmDialog";
import { LoadingState } from "./states";

const FULL_NAME_MAX = 100;

/**
 * Account surface: Profile, Usage, Danger Zone.
 *
 * Setup asks for one thing — the account holder's name. Everything the
 * product actually displays is derived from it, so there is nothing else to
 * collect before someone can add a publication and start working.
 */
export function AccountProfilePanel({
  setupMode = false,
  continueHref = "/account",
}: {
  setupMode?: boolean;
  continueHref?: string;
}) {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [fullName, setFullName] = useState("");
  const [loadBusy, setLoadBusy] = useState(true);
  const [saveBusy, setSaveBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [alerting, setAlerting] = useState(false);
  const fullNameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    api
      .me()
      .then((nextProfile) => {
        if (!active) return;
        setProfile(nextProfile);
        setFullName(nextProfile.fullName ?? "");
        // Someone who already has a name on file should never be held at the
        // setup gate — send them straight on to what they came to do.
        if (setupMode && nextProfile.fullName?.trim()) {
          router.push(continueHref);
        }
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof ApiClientError ? err.message : "Could not load account.");
      })
      .finally(() => {
        if (active) setLoadBusy(false);
      });
    return () => {
      active = false;
    };
  }, [setupMode, continueHref, router]);

  const triggerAlert = (message: string) => {
    setProfileError(message);
    setAlerting(false);
    requestAnimationFrame(() => {
      setAlerting(true);
      window.setTimeout(() => setAlerting(false), 450);
    });
    fullNameRef.current?.focus();
  };

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    setProfileError(null);

    const normalized = normalizeFullName(fullName);
    if (!normalized) {
      triggerAlert("Please save your full name.");
      return;
    }
    const message = validateFullName(normalized);
    if (message) {
      triggerAlert(message);
      return;
    }

    setSaveBusy(true);
    setSaved(false);
    setError(null);
    try {
      const nextProfile = await api.updateProfile({ fullName: normalized });
      setProfile(nextProfile);
      setFullName(nextProfile.fullName ?? "");
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1800);
      if (setupMode) router.push(continueHref);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not update account.");
    } finally {
      setSaveBusy(false);
    }
  };

  const deleteAccount = async () => {
    if (deleteBusy) return;
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      await api.deleteAccount();
      await signOut({ callbackUrl: "/register?deleted=1" });
    } catch (err) {
      setDeleteError(err instanceof ApiClientError ? err.message : "Could not delete account.");
      setDeleteBusy(false);
    }
  };

  if (loadBusy) {
    return (
      <div className="panel p-6">
        <LoadingState label="Loading account..." />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="panel flex flex-col gap-5 p-6">
        <header>
          <h2 className="font-serif text-[22px] leading-snug tracking-tightish text-ink-900">Profile</h2>
          <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-ink-600">
            {setupMode ? "Tell us what to call you." : "Complete your account profile."}
          </p>
        </header>

        <form onSubmit={saveProfile} className="grid gap-4 sm:grid-cols-2" noValidate>
          <label className="flex flex-col gap-2">
            <span className="type-eyebrow text-ink-400">Full name</span>
            <input
              ref={fullNameRef}
              name="name"
              value={fullName}
              onChange={(event) => {
                setFullName(event.target.value.slice(0, FULL_NAME_MAX));
                setAlerting(false);
                setProfileError(null);
              }}
              className={cn("input", alerting && "!border-ink-400 animate-editorial-nudge")}
              placeholder="First and last name"
              disabled={saveBusy}
              autoComplete="name"
              autoCapitalize="words"
              aria-invalid={alerting || undefined}
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="type-eyebrow text-ink-400">Email</span>
            <input
              value={profile?.email ?? ""}
              className="input bg-ink-50 text-ink-500"
              readOnly
              aria-readonly="true"
            />
          </label>

          {profileError && <p className="text-[12.5px] text-ink-500 sm:col-span-2">{profileError}</p>}

          <div className="sm:col-span-2 flex items-center justify-end gap-3 pt-1">
            {saved && <SavedCheck />}
            <button type="submit" className="btn-primary" disabled={saveBusy}>
              {saveBusy ? "Saving..." : setupMode ? "Continue" : "Save profile"}
            </button>
          </div>
        </form>
      </section>

      {profile?.plan && !setupMode && <AccountUsageCard profile={profile} />}

      {!setupMode && (
        <section className="panel flex flex-col gap-4 border-critical-100/70 p-6">
          <header>
            <span className="type-eyebrow text-critical-700">Danger Zone</span>
            <h2 className="mt-2 font-serif text-[20px] leading-snug tracking-tightish text-ink-900">Delete Account</h2>
            <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-ink-600">This action cannot be undone.</p>
          </header>
          <button
            type="button"
            onClick={() => {
              setDeleteError(null);
              setDeleteDialogOpen(true);
            }}
            disabled={deleteBusy}
            className="inline-flex h-9 items-center justify-center self-start rounded-md border border-critical-100 bg-white px-3.5 text-[13px] font-medium text-critical-700 shadow-soft transition-colors duration-150 ease-editorial hover:border-critical-500 hover:bg-critical-100/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-critical-500/40 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Delete account
          </button>
        </section>
      )}

      <DangerConfirmDialog
        open={deleteDialogOpen}
        title="Delete Account"
        description={
          <p>
            This permanently deletes your account, profile, owned workspaces, and publication data. This action cannot
            be undone.
          </p>
        }
        confirmationValue={profile?.email ?? "delete account"}
        confirmationLabel="Type this account email to confirm"
        actionLabel="Delete account"
        busyLabel="Deleting..."
        busy={deleteBusy}
        error={deleteError}
        onClose={() => {
          if (!deleteBusy) setDeleteDialogOpen(false);
        }}
        onConfirm={deleteAccount}
      />

      {error && (
        <div className="rounded-md border border-critical-100 bg-critical-100/40 px-3 py-2 text-[13px] text-critical-700">
          {error}
        </div>
      )}
    </div>
  );
}

function normalizeFullName(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function validateFullName(value: string): string | null {
  const letterCount = value.match(/\p{L}/gu)?.length ?? 0;
  if (letterCount < 2) return "Use at least two letters for your full name.";
  if (value.length > FULL_NAME_MAX) return `Keep your full name under ${FULL_NAME_MAX} characters.`;
  if (/[^\p{L}\s'.-]/u.test(value)) {
    return "Use letters, spaces, hyphens, apostrophes, or periods.";
  }
  return null;
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
  const resetLabel = `${resetMonth} ${ordinal(resetDay)} at ${resetHour}:${resetMinute}${resetPeriod ? ` ${resetPeriod}` : ""}`;

  return (
    <section className="panel flex flex-col gap-4 p-6">
      <header>
        <span className="type-eyebrow text-accent-700">{plan.label} plan</span>
        <h2 className="mt-2 font-serif text-[22px] leading-snug tracking-tightish text-ink-900">Usage</h2>
      </header>

      <p className="-mt-1 text-[13.5px] leading-relaxed text-ink-600">
        {plan.tokenUsage.used.toLocaleString()} of {plan.tokenUsage.limit.toLocaleString()} monthly tokens used. Limits
        reset {resetLabel}.
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
          <p>Need more room? Premium adds more monthly tokens and active workspaces.</p>
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

function SavedCheck() {
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
