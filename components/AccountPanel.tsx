"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { UserProfile } from "@/types/auth";
import type { AccountWorkspaceSummary, WorkspaceStatus } from "@/types/workspace";
import { api, ApiClientError } from "@/lib/client/api";
import { cn } from "@/lib/client/cn";
import { sanitizeAsTyped, validateCuratorName } from "@/lib/client/curator-name";
import { sanitizeCreatorAsTyped, validateCreatorName } from "@/lib/client/creator-name";
import { formatRelative, hostnameOf, pluralize } from "@/lib/client/format";
import { LoadingState } from "./states";

const CURATOR_PLACEHOLDER = "Curator";

function isUnsetCreator(value: string | undefined): boolean {
  return !value?.trim();
}
function isUnsetCurator(value: string | undefined): boolean {
  if (!value) return true;
  return value.trim() === CURATOR_PLACEHOLDER;
}

export function AccountPanel() {
  const router = useRouter();
  const params = useSearchParams();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [workspaces, setWorkspaces] = useState<AccountWorkspaceSummary[]>([]);
  const [loadBusy, setLoadBusy] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Landing-hook URL travels through register → /account so we can
  // auto-provision once the user finishes naming themselves and their
  // curator. We hold it in state so the consumer flow can clear it when
  // it's been used without trimming the rest of the URL bar.
  const [pendingPublicationUrl, setPendingPublicationUrl] = useState<string | null>(null);
  const [provisioning, setProvisioning] = useState(false);
  const [provisionError, setProvisionError] = useState<string | null>(null);
  const [creatorAlertSignal, setCreatorAlertSignal] = useState(0);
  const [curatorAlertSignal, setCuratorAlertSignal] = useState(0);
  const [creatorFocusSignal, setCreatorFocusSignal] = useState(0);
  const [curatorFocusSignal, setCuratorFocusSignal] = useState(0);

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

  const creatorReady = !isUnsetCreator(profile?.creatorName);
  const curatorReady = !isUnsetCurator(profile?.editorName);
  const gateOpen = creatorReady && curatorReady;

  const promptMissingNames = useCallback(() => {
    if (creatorReady && curatorReady) return;

    if (!creatorReady) setCreatorAlertSignal((signal) => signal + 1);
    if (!curatorReady) setCuratorAlertSignal((signal) => signal + 1);

    if (!creatorReady) {
      setCreatorFocusSignal((signal) => signal + 1);
      return;
    }
    setCuratorFocusSignal((signal) => signal + 1);
  }, [creatorReady, curatorReady]);

  const promptCreatorFirst = useCallback(() => {
    if (creatorReady) return;
    setCreatorAlertSignal((signal) => signal + 1);
    setCreatorFocusSignal((signal) => signal + 1);
  }, [creatorReady]);

  // Auto-provision: once both names are settled and there's a pending URL
  // from the landing hook, create the workspace. The user already opted in
  // by submitting the URL on the marketing surface; bouncing them through
  // /publications/new just to click submit again is friction.
  useEffect(() => {
    if (!gateOpen || !pendingPublicationUrl || provisioning) return;
    let active = true;
    setProvisioning(true);
    setProvisionError(null);
    api
      .createWorkspace({ publicationUrl: pendingPublicationUrl })
      .then(() => api.listWorkspaces())
      .then((next) => {
        if (!active) return;
        setWorkspaces(next);
        setPendingPublicationUrl(null);
        // Clear the query param so a refresh doesn't re-trigger.
        router.replace("/account");
      })
      .catch((err) => {
        if (!active) return;
        setProvisionError(
          err instanceof ApiClientError
            ? err.message
            : "Saved your names — but we couldn't read your publication. Add it manually below.",
        );
      })
      .finally(() => {
        if (active) setProvisioning(false);
      });
    return () => {
      active = false;
    };
  }, [gateOpen, pendingPublicationUrl, provisioning, router]);

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
      {/* Two-card identity gate. Side-by-side on lg+, stacked below.
          Creator on the left because that's where the eye starts; Curator
          on the right because the curator is the assistant the Creator
          chooses, in that order. */}
      <div className="grid gap-6 lg:grid-cols-2">
        <CreatorCard
          profile={profile}
          onProfileChange={setProfile}
          autoFocus={!creatorReady}
          isUnset={!creatorReady}
          alertSignal={creatorAlertSignal}
          focusSignal={creatorFocusSignal}
        />
        <CuratorCard
          profile={profile}
          onProfileChange={setProfile}
          autoFocus={creatorReady && !curatorReady}
          isUnset={!curatorReady}
          locked={!creatorReady}
          onLockedInteract={promptCreatorFirst}
          alertSignal={curatorAlertSignal}
          focusSignal={curatorFocusSignal}
        />
      </div>

      {/* Bottom row morphs based on state:
          1. Pending URL + still gated → "complete the gate" hint with URL chip.
          2. Pending URL + provisioning → quiet reading state.
          3. Gate closed (no URL waiting) → soft prompt to finish the gate.
          4. Gate open + no workspaces → big "Add your publication →" CTA.
          5. Gate open + workspaces exist → workspace list with header + button. */}
      <PublicationsRegion
        gateOpen={gateOpen}
        pendingPublicationUrl={pendingPublicationUrl}
        provisioning={provisioning}
        provisionError={provisionError}
        workspaces={workspaces}
        onGateContinue={promptMissingNames}
      />
    </div>
  );
}

// === Creator card (you) ============================================
function CreatorCard({
  profile,
  onProfileChange,
  autoFocus,
  isUnset,
  alertSignal,
  focusSignal,
}: {
  profile: UserProfile | null;
  onProfileChange: (p: UserProfile) => void;
  autoFocus: boolean;
  isUnset: boolean;
  alertSignal: number;
  focusSignal: number;
}) {
  // Initialize empty when the creator has not named themself yet so the
  // first account screen feels like a fresh slot waiting for input.
  const initial = isUnset ? "" : profile?.creatorName ?? "";
  const [name, setName] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alerting, setAlerting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const handledAlertSignalRef = useRef(0);

  useEffect(() => {
    if (!busy) setName(isUnset ? "" : profile?.creatorName ?? "");
  }, [profile?.creatorName, busy, isUnset]);

  useEffect(() => {
    if (!autoFocus || busy) return;
    const id = window.setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 0);
    return () => window.clearTimeout(id);
  }, [autoFocus, busy]);

  const triggerAlert = useCallback((message: string) => {
    setError(message);
    setAlerting(false);
    requestAnimationFrame(() => {
      setAlerting(true);
      window.setTimeout(() => setAlerting(false), 450);
    });
  }, []);

  useEffect(() => {
    if (alertSignal === 0 || !isUnset) return;
    if (handledAlertSignalRef.current === alertSignal) return;
    handledAlertSignalRef.current = alertSignal;
    const v = validateCreatorName(name);
    triggerAlert(name.trim() && v.ok ? "Save your name to continue." : v.message ?? "Try a different name.");
  }, [alertSignal, isUnset, name, triggerAlert]);

  useEffect(() => {
    if (focusSignal === 0 || !isUnset || busy) return;
    inputRef.current?.focus({ preventScroll: true });
  }, [busy, focusSignal, isUnset]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = validateCreatorName(name);
    if (!v.ok) {
      triggerAlert(v.message ?? "Try a different name.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const next = await api.updateProfile({ creatorName: name.trim() });
      onProfileChange(next);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not update profile.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="panel relative flex flex-col gap-5 p-6">
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-accent-200/0 via-accent-300 to-accent-200/0"
      />
      <header>
        <span className="type-eyebrow text-accent-700">Creator</span>
        <h2 className="mt-2 font-serif text-[22px] leading-snug tracking-tightish text-ink-900">You.</h2>
      </header>

      <form onSubmit={save} className="flex flex-col gap-5" noValidate>
        <label className="flex flex-col gap-2">
          <span className="type-eyebrow text-ink-400">Your name</span>
          <input
            ref={inputRef}
            value={name}
            onChange={(event) => setName(sanitizeCreatorAsTyped(event.target.value))}
            className={cn("input", alerting && "animate-editorial-nudge !border-ink-400")}
            placeholder="What should we call you?"
            disabled={busy}
            autoFocus={autoFocus}
            aria-invalid={alerting || undefined}
            spellCheck={false}
            autoCapitalize="words"
            autoCorrect="off"
          />
          <span className="text-[11.5px] leading-snug text-ink-400">
            Your name follows your writing across every library.
          </span>
        </label>
        {error && <p className="font-serif italic text-[12.5px] text-ink-500">{error}</p>}
        <div className="mt-1 flex items-center justify-end gap-3">
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </section>
  );
}

// === Curator card (your curator) =================================
function CuratorCard({
  profile,
  onProfileChange,
  autoFocus,
  isUnset,
  locked,
  onLockedInteract,
  alertSignal,
  focusSignal,
}: {
  profile: UserProfile | null;
  onProfileChange: (p: UserProfile) => void;
  autoFocus: boolean;
  isUnset: boolean;
  locked: boolean;
  onLockedInteract: () => void;
  alertSignal: number;
  focusSignal: number;
}) {
  const initial = isUnset ? "" : profile?.editorName ?? "";
  const [editorName, setEditorName] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alerting, setAlerting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const handledAlertSignalRef = useRef(0);

  useEffect(() => {
    if (!busy) setEditorName(isUnset ? "" : profile?.editorName ?? "");
  }, [profile?.editorName, busy, isUnset]);

  useEffect(() => {
    if (!autoFocus || busy) return;
    const id = window.setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 0);
    return () => window.clearTimeout(id);
  }, [autoFocus, busy]);

  const triggerAlert = useCallback((message: string) => {
    setError(message);
    setAlerting(false);
    requestAnimationFrame(() => {
      setAlerting(true);
      window.setTimeout(() => setAlerting(false), 450);
    });
  }, []);

  useEffect(() => {
    if (alertSignal === 0 || !isUnset) return;
    if (handledAlertSignalRef.current === alertSignal) return;
    handledAlertSignalRef.current = alertSignal;
    const v = validateCuratorName(editorName);
    triggerAlert(
      editorName.trim() && v.ok
        ? "Save your curator's name to continue."
        : v.message ?? "Try a different name.",
    );
  }, [alertSignal, editorName, isUnset, triggerAlert]);

  useEffect(() => {
    if (focusSignal === 0 || !isUnset || busy) return;
    inputRef.current?.focus({ preventScroll: true });
  }, [busy, focusSignal, isUnset]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (locked) {
      onLockedInteract();
      return;
    }
    const v = validateCuratorName(editorName);
    if (!v.ok) {
      triggerAlert(v.message ?? "Try a different name.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const next = await api.updateProfile({ editorName });
      onProfileChange(next);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not update profile.");
    } finally {
      setBusy(false);
    }
  };

  const blockUntilCreatorIsSaved = (event: React.SyntheticEvent) => {
    if (!locked) return;
    event.preventDefault();
    onLockedInteract();
  };

  return (
    <section className="panel relative flex flex-col gap-5 p-6">
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-accent-200/0 via-accent-300 to-accent-200/0"
      />
      <header>
        <span className="type-eyebrow text-accent-700">Curator</span>
        <h2 className="mt-2 font-serif text-[22px] leading-snug tracking-tightish text-ink-900">
          Your <em className="font-serif italic text-ink-700">curator.</em>
        </h2>
      </header>

      <form
        onSubmit={save}
        onMouseDownCapture={blockUntilCreatorIsSaved}
        onFocusCapture={blockUntilCreatorIsSaved}
        className={cn(
          "flex flex-col gap-5 transition-opacity duration-200 ease-editorial",
          locked && "opacity-70",
        )}
        noValidate
      >
        <label className="flex flex-col gap-2">
          <span className="type-eyebrow text-ink-400">Your curator's name</span>
          <input
            ref={inputRef}
            value={editorName}
            onChange={(event) => {
              if (locked) return;
              setEditorName(sanitizeAsTyped(event.target.value));
            }}
            className={cn("input", alerting && "animate-editorial-nudge !border-ink-400")}
            placeholder="Who's your most trusted reader?"
            disabled={busy}
            readOnly={locked}
            aria-invalid={alerting || undefined}
            aria-disabled={locked || undefined}
            spellCheck={false}
            autoCapitalize="words"
            autoCorrect="off"
          />
          <span className="text-[11.5px] leading-snug text-ink-400">
            Your curator's name follows each review and thread.
          </span>
        </label>
        {error && <p className="font-serif italic text-[12.5px] text-ink-500">{error}</p>}
        <div className="mt-1 flex items-center justify-end gap-3">
          <button type="submit" className="btn-primary" disabled={busy} aria-disabled={locked || undefined}>
            {busy ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </section>
  );
}

// === Bottom row — gate-aware publications region ===================
function PublicationsRegion({
  gateOpen,
  pendingPublicationUrl,
  provisioning,
  provisionError,
  workspaces,
  onGateContinue,
}: {
  gateOpen: boolean;
  pendingPublicationUrl: string | null;
  provisioning: boolean;
  provisionError: string | null;
  workspaces: AccountWorkspaceSummary[];
  onGateContinue: () => void;
}) {
  // 1 — pending URL while still provisioning (gate just opened).
  if (pendingPublicationUrl && provisioning) {
    return (
      <section className="panel-quiet flex items-center gap-3 px-5 py-5">
        <span className="relative inline-flex h-2 w-2 shrink-0" aria-hidden="true">
          <span className="absolute inline-flex h-2 w-2 animate-editorial-pulse rounded-full bg-accent-400/60" />
          <span className="relative inline-flex h-2 w-2 animate-editorial-pulse rounded-full bg-accent-500" />
        </span>
        <p className="font-serif italic text-[14px] text-ink-600">
          Reading <span className="not-italic font-mono text-[12.5px] text-ink-700">{pendingPublicationUrl}</span>...
        </p>
      </section>
    );
  }

  // 2 — gate still closed.
  if (!gateOpen) {
    return (
      <section className="flex justify-end">
        <button
          type="button"
          className="btn-primary btn-primary-lg group ml-auto px-6"
          onClick={onGateContinue}
        >
          <span className="relative inline-flex items-center gap-2">
            <span>Continue</span>
            <span
              aria-hidden="true"
              className="text-ink-300 transition-transform duration-200 ease-editorial group-hover:translate-x-0.5 group-hover:text-ink-50"
            >
              →
            </span>
          </span>
        </button>
      </section>
    );
  }

  // 3 — gate open, no workspaces yet → big primary CTA.
  if (workspaces.length === 0) {
    return (
      <section className="flex flex-col items-start gap-4 rounded-md border border-dashed border-ink-200 bg-white/70 px-6 py-8">
        <div>
          <span className="type-eyebrow text-accent-700">Next</span>
          <h2 className="mt-1.5 font-serif text-[22px] leading-snug tracking-tightish text-ink-900">
            Add your <em className="font-serif italic text-ink-700">first publication.</em>
          </h2>
          <p className="mt-1.5 max-w-prose text-[14px] leading-relaxed text-ink-600">
            One workspace per publication, with its own library, themes, and drafts.
          </p>
        </div>
        {provisionError && (
          <p className="font-serif italic text-[12.5px] text-ink-500">{provisionError}</p>
        )}
        <Link href="/publications/new" className="btn-primary btn-primary-lg group">
          <span className="relative inline-flex items-center gap-2">
            <span>Add your publication</span>
            <span
              aria-hidden="true"
              className="text-ink-300 transition-transform duration-200 ease-editorial group-hover:translate-x-0.5 group-hover:text-ink-50"
            >
              →
            </span>
          </span>
        </Link>
      </section>
    );
  }

  // 4 — gate open, workspaces exist → list with + Add button.
  return <WorkspacesCard workspaces={workspaces} />;
}

function WorkspacesCard({ workspaces }: { workspaces: AccountWorkspaceSummary[] }) {
  return (
    <section className="panel flex flex-col gap-5 p-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <span className="type-eyebrow text-accent-700">Workspaces</span>
          <h2 className="mt-2 font-serif text-[22px] leading-snug tracking-tightish text-ink-900">
            {pluralize(workspaces.length, "publication")} on{" "}
            <em className="font-serif italic text-ink-700">your desk.</em>
          </h2>
        </div>
        <Link href="/publications/new" className="btn-secondary group shrink-0" aria-label="Add workspace">
          <span aria-hidden="true" className="mr-1.5 text-[15px] leading-none text-accent-500 group-hover:text-accent-700">
            +
          </span>
          Add publication
        </Link>
      </header>

      <ul className="flex flex-col gap-3">
        {workspaces.map((workspace) => (
          <WorkspaceRow key={workspace.id} workspace={workspace} />
        ))}
      </ul>
    </section>
  );
}

function WorkspaceRow({ workspace }: { workspace: AccountWorkspaceSummary }) {
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
            className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-ink-200/60 bg-ink-50/60 font-serif text-[18px] leading-none text-accent-500 transition-colors duration-200 ease-editorial group-hover:border-accent-200 group-hover:bg-accent-50/40 group-hover:text-accent-700"
          >
            §
          </span>
          <div className="min-w-0">
            <div className="truncate font-serif text-[16px] leading-snug text-ink-900 group-hover:text-ink-900">
              {displayName}
            </div>
            <div className="mt-0.5 flex items-center gap-2 truncate font-mono text-[11px] tracking-tightish text-ink-500">
              <span className="truncate">{host}</span>
              {workspace.role !== "owner" && (
                <>
                  <span className="text-ink-300" aria-hidden="true">·</span>
                  <span className="capitalize">{workspace.role}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
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
            →
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
        return { label: "Ready", className: "border-positive-100 bg-positive-100/40 text-positive-700" };
      case "ingesting":
      case "pending":
        return { label: "Reading", className: "border-accent-200 bg-accent-50 text-accent-700" };
      case "partial":
        return { label: "Partial", className: "border-accent-200 bg-accent-50/60 text-accent-700" };
      case "failed":
        return { label: "Failed", className: "border-critical-100 bg-critical-100/40 text-critical-700" };
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
