"use client";

import { signOut } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import type { UserProfile } from "@/types/auth";
import { api, ApiClientError } from "@/lib/client/api";
import { cn } from "@/lib/client/cn";
import { sanitizeAsTyped, validateCuratorName } from "@/lib/client/curator-name";
import { sanitizeCreatorAsTyped, validateCreatorName } from "@/lib/client/creator-name";
import { DangerConfirmDialog } from "./DangerConfirmDialog";
import { LoadingState } from "./states";

const HANDLE_MAX = 24;
const HANDLE_MIN = 3;
const FULL_NAME_MAX = 100;

export function AccountIdentityPanel() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [handle, setHandle] = useState("");
  const [creatorName, setCreatorName] = useState("");
  const [curatorName, setCuratorName] = useState("");
  const [loadBusy, setLoadBusy] = useState(true);
  const [saveBusy, setSaveBusy] = useState(false);
  const [identityBusy, setIdentityBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [identitySaved, setIdentitySaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileAlerting, setProfileAlerting] = useState<"fullName" | "handle" | "phone" | null>(null);
  const [identityError, setIdentityError] = useState<string | null>(null);
  const [identityAlerting, setIdentityAlerting] = useState<"creator" | "curator" | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const fullNameRef = useRef<HTMLInputElement>(null);
  const handleRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const creatorRef = useRef<HTMLInputElement>(null);
  const curatorRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    api
      .me()
      .then((nextProfile) => {
        if (!active) return;
        setProfile(nextProfile);
        setFullName(nextProfile.fullName ?? "");
        setPhoneNumber(formatUsPhone(nextProfile.phoneNumber ?? ""));
        setHandle(nextProfile.handle ?? "");
        setCreatorName(nextProfile.creatorName ?? "");
        setCuratorName(nextProfile.editorName ?? "");
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
  }, []);

  const saveIdentity = async (event: React.FormEvent) => {
    event.preventDefault();
    setPhoneError(null);
    setProfileError(null);

    const normalizedFullName = normalizeFullName(fullName);
    if (!normalizedFullName) {
      triggerProfileAlert("fullName", "Please save your full name.");
      return;
    }
    const fullNameMessage = validateFullName(normalizedFullName);
    if (fullNameMessage) {
      triggerProfileAlert("fullName", fullNameMessage);
      return;
    }

    const normalizedHandle = handle.replace(/^@+/, "").trim().toLowerCase();
    const handleMessage = validateHandle(normalizedHandle);
    if (handleMessage) {
      triggerProfileAlert("handle", handleMessage);
      return;
    }

    const normalizedPhone = normalizeUsPhone(phoneNumber);
    if (!phoneNumber.trim()) {
      triggerProfileAlert("phone", "Please save your phone number.");
      return;
    }
    if (!normalizedPhone) {
      triggerProfileAlert("phone", "Use a 10-digit US number.");
      return;
    }

    setSaveBusy(true);
    setSaved(false);
    setError(null);
    setProfileError(null);
    setPhoneError(null);
    try {
      const nextProfile = await api.updateProfile({
        fullName: normalizedFullName,
        phoneNumber: normalizedPhone,
        handle: normalizedHandle,
      });
      setProfile(nextProfile);
      setFullName(nextProfile.fullName ?? "");
      setPhoneNumber(formatUsPhone(nextProfile.phoneNumber ?? ""));
      setHandle(nextProfile.handle ?? "");
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1800);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not update account.");
    } finally {
      setSaveBusy(false);
    }
  };

  const triggerProfileAlert = (field: "fullName" | "handle" | "phone", message: string) => {
    setProfileError(message);
    if (field === "phone") setPhoneError(message);
    setProfileAlerting(null);
    requestAnimationFrame(() => {
      setProfileAlerting(field);
      window.setTimeout(() => setProfileAlerting(null), 450);
    });
    if (field === "fullName") fullNameRef.current?.focus();
    if (field === "handle") handleRef.current?.focus();
    if (field === "phone") phoneRef.current?.focus();
  };

  const triggerIdentityAlert = (field: "creator" | "curator", message: string) => {
    setIdentityError(message);
    setIdentityAlerting(null);
    requestAnimationFrame(() => {
      setIdentityAlerting(field);
      window.setTimeout(() => setIdentityAlerting(null), 450);
    });
    if (field === "creator") creatorRef.current?.focus();
    if (field === "curator") curatorRef.current?.focus();
  };

  const saveLibraryIdentity = async (event: React.FormEvent) => {
    event.preventDefault();
    const creatorValidation = validateCreatorName(creatorName);
    if (!creatorValidation.ok) {
      triggerIdentityAlert("creator", creatorValidation.message ?? "Try a different creator name.");
      return;
    }
    const curatorValidation = validateCuratorName(curatorName);
    if (!curatorValidation.ok) {
      triggerIdentityAlert("curator", curatorValidation.message ?? "Try a different curator name.");
      return;
    }

    setIdentityBusy(true);
    setIdentitySaved(false);
    setIdentityError(null);
    try {
      const nextProfile = await api.updateProfile({
        creatorName: creatorName.trim(),
        editorName: curatorName.trim(),
      });
      setProfile(nextProfile);
      setCreatorName(nextProfile.creatorName ?? "");
      setCuratorName(nextProfile.editorName ?? "");
      setIdentitySaved(true);
      window.setTimeout(() => setIdentitySaved(false), 1800);
    } catch (err) {
      setIdentityError(err instanceof ApiClientError ? err.message : "Could not update identity.");
    } finally {
      setIdentityBusy(false);
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
          <h2 className="font-serif text-[22px] leading-snug tracking-tightish text-ink-900">
            Profile
          </h2>
          <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-ink-600">
            Complete your account profile.
          </p>
        </header>

        <form onSubmit={saveIdentity} className="grid gap-4 sm:grid-cols-2" noValidate>
          <label className="flex flex-col gap-2">
            <span className="type-eyebrow text-ink-400">Full name</span>
            <input
              ref={fullNameRef}
              value={fullName}
              onChange={(event) => {
                setFullName(event.target.value.slice(0, FULL_NAME_MAX));
                if (profileAlerting === "fullName") setProfileAlerting(null);
                setProfileError(null);
              }}
              className={cn("input", profileAlerting === "fullName" && "!border-ink-400 animate-editorial-nudge")}
              placeholder="First and last name"
              disabled={saveBusy}
              autoCapitalize="words"
              aria-invalid={profileAlerting === "fullName" || undefined}
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="type-eyebrow text-ink-400">Handle</span>
            <div className="relative">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-[13px] text-ink-400"
              >
                @
              </span>
              <input
                ref={handleRef}
                value={handle}
                onChange={(event) => {
                  setHandle(event.target.value.replace(/^@+/, "").toLowerCase().slice(0, HANDLE_MAX));
                  if (profileAlerting === "handle") setProfileAlerting(null);
                  setProfileError(null);
                }}
                className={cn("input pl-7", profileAlerting === "handle" && "!border-ink-400 animate-editorial-nudge")}
                placeholder="aviral"
                disabled={saveBusy}
                spellCheck={false}
                autoCapitalize="off"
                autoCorrect="off"
                aria-invalid={profileAlerting === "handle" || undefined}
              />
            </div>
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

          <label className="flex flex-col gap-2">
            <span className="type-eyebrow text-ink-400">Phone</span>
            <input
              ref={phoneRef}
              value={phoneNumber}
              onChange={(event) => {
                const next = formatUsPhone(event.target.value);
                setPhoneNumber(next);
                if (profileAlerting === "phone") setProfileAlerting(null);
                if (!next || normalizeUsPhone(next)) {
                  setPhoneError(null);
                  setProfileError(null);
                }
              }}
              className={cn("input", profileAlerting === "phone" && "!border-ink-400 animate-editorial-nudge")}
              placeholder="+1 (555) 123-4567"
              disabled={saveBusy}
              inputMode="tel"
              aria-invalid={profileAlerting === "phone" || undefined}
            />
            {phoneError && <span className="text-[12.5px] text-ink-500">{phoneError}</span>}
          </label>

          {profileError && !phoneError && (
            <p className="text-[12.5px] text-ink-500 sm:col-span-2">{profileError}</p>
          )}

          <div className="sm:col-span-2 flex items-center justify-end gap-3 pt-1">
            {saved && <SavedCheck />}
            <button type="submit" className="btn-primary" disabled={saveBusy}>
              {saveBusy ? "Saving..." : "Save profile"}
            </button>
          </div>
        </form>
      </section>

      <section className="panel flex flex-col gap-5 p-6">
        <header>
          <h2 className="font-serif text-[22px] leading-snug tracking-tightish text-ink-900">
            Identity
          </h2>
          <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-ink-600">
            Establish your library's identity.
          </p>
        </header>

        <form onSubmit={saveLibraryIdentity} className="grid gap-4 sm:grid-cols-2" noValidate>
          <label className="flex flex-col gap-2">
            <span className="type-eyebrow text-ink-400">Creator</span>
            <input
              ref={creatorRef}
              value={creatorName}
              onChange={(event) => setCreatorName(sanitizeCreatorAsTyped(event.target.value))}
              className={cn("input", identityAlerting === "creator" && "!border-ink-400 animate-editorial-nudge")}
              placeholder="Aviral"
              disabled={identityBusy}
              spellCheck={false}
              autoCapitalize="words"
              autoCorrect="off"
              aria-invalid={identityAlerting === "creator" || undefined}
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="type-eyebrow text-ink-400">Curator</span>
            <input
              ref={curatorRef}
              value={curatorName}
              onChange={(event) => setCuratorName(sanitizeAsTyped(event.target.value))}
              className={cn("input", identityAlerting === "curator" && "!border-ink-400 animate-editorial-nudge")}
              placeholder="Curator"
              disabled={identityBusy}
              spellCheck={false}
              autoCapitalize="words"
              autoCorrect="off"
              aria-invalid={identityAlerting === "curator" || undefined}
            />
          </label>

          {identityError && (
            <p className="text-[12.5px] text-ink-500 sm:col-span-2">{identityError}</p>
          )}

          <div className="sm:col-span-2 flex items-center justify-end gap-3 pt-1">
            {identitySaved && <SavedCheck />}
            <button type="submit" className="btn-primary" disabled={identityBusy}>
              {identityBusy ? "Saving..." : "Save identity"}
            </button>
          </div>
        </form>
      </section>

      <section className="panel flex flex-col gap-4 border-critical-100/70 p-6">
        <header>
          <span className="type-eyebrow text-critical-700">Danger Zone</span>
          <h2 className="mt-2 font-serif text-[20px] leading-snug tracking-tightish text-ink-900">
            Delete Account
          </h2>
          <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-ink-600">
            This action cannot be undone.
          </p>
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

function phoneDigits(value: string): string {
  const digits = value.replace(/\D/g, "");
  return digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits.slice(0, 10);
}

function normalizeFullName(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function validateFullName(value: string): string | null {
  const letterCount = value.match(/\p{L}/gu)?.length ?? 0;
  if (letterCount < 2) return "Use at least two letters for your full name.";
  if (value.length > FULL_NAME_MAX) return `Keep your full name under ${FULL_NAME_MAX} characters.`;
  if (!/\p{L}/u.test(value)) return "Use letters in your full name.";
  if (/[^\p{L}\s'.-]/u.test(value)) {
    return "Use letters, spaces, hyphens, apostrophes, or periods.";
  }
  return null;
}

function validateHandle(value: string): string | null {
  if (!value) return "Please save your handle.";
  if (value.length < HANDLE_MIN) return `Use at least ${HANDLE_MIN} characters for your handle.`;
  if (value.length > HANDLE_MAX) return `Keep your handle to ${HANDLE_MAX} characters.`;
  if (!/^[a-z]/.test(value)) return "Start your handle with a letter.";
  if (!/^[a-z0-9_]+$/.test(value)) {
    return "Use lowercase letters, numbers, or underscores.";
  }
  return null;
}

function formatUsPhone(value: string): string {
  const digits = phoneDigits(value);
  if (!digits) return "";

  const area = digits.slice(0, 3);
  const prefix = digits.slice(3, 6);
  const line = digits.slice(6, 10);

  if (digits.length <= 3) return `+1 (${area}`;
  if (digits.length <= 6) return `+1 (${area}) ${prefix}`;
  return `+1 (${area}) ${prefix}-${line}`;
}

function normalizeUsPhone(value: string): string | null {
  const rawDigits = value.replace(/\D/g, "");
  const digits = rawDigits.length === 11 && rawDigits.startsWith("1") ? rawDigits.slice(1) : rawDigits;
  return digits.length === 10 ? formatUsPhone(digits) : null;
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
