"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { api, ApiClientError } from "@/lib/client/api";
import { cn } from "@/lib/client/cn";
import { hostnameOf, statusLabel } from "@/lib/client/format";
import type { UserProfile } from "@/types/auth";
import type { AccountWorkspaceSummary } from "@/types/workspace";

const INITIAL_GRADIENTS = [
  "border-red-200/70 bg-gradient-to-br from-red-50 to-red-100 text-red-700",
  "border-sky-200/70 bg-gradient-to-br from-sky-50 to-sky-100 text-sky-700",
  "border-emerald-200/70 bg-gradient-to-br from-emerald-50 to-emerald-100 text-emerald-700",
  "border-amber-200/70 bg-gradient-to-br from-amber-50 to-amber-100 text-amber-700",
  "border-violet-200/70 bg-gradient-to-br from-violet-50 to-violet-100 text-violet-700",
  "border-teal-200/70 bg-gradient-to-br from-teal-50 to-teal-100 text-teal-700",
  "border-rose-200/70 bg-gradient-to-br from-rose-50 to-rose-100 text-rose-700",
] as const;

function initialGradientClass(initial: string): string {
  const code = initial.toUpperCase().charCodeAt(0);
  if (!Number.isFinite(code) || code < 65 || code > 90) return INITIAL_GRADIENTS[0];
  return INITIAL_GRADIENTS[(code - 65) % INITIAL_GRADIENTS.length];
}

/**
 * Identity menu in the global nav for signed-in users.
 *
 * The chip carries the creator's first initial inside an accent disc (echoing
 * the § wordmark) followed by the creator's name. Click reveals a compact
 * menu with the email, a § Account link, and Sign out — the standard SaaS
 * shape, dressed in the product's restraint.
 *
 * We pull the creator name from /api/me (one fetch on mount, cached for the
 * session) so this surface doesn't reflect the curator name. Fallbacks: the
 * NextAuth session name, then the email prefix, then "you" — the menu is
 * never empty.
 */
export function UserMenu() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [workspaces, setWorkspaces] = useState<AccountWorkspaceSummary[]>([]);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Fetch the creator's identity once we know we're authenticated. If the
  // account row is gone but a JWT cookie remains, clear the stale session
  // instead of showing logged-in chrome.
  const loadProfile = useCallback(() => {
    if (status !== "authenticated") return;
    let active = true;
    Promise.all([api.me(), api.listWorkspaces()])
      .then(([p, nextWorkspaces]) => {
        if (active) setProfile(p);
        if (active) setWorkspaces(nextWorkspaces);
      })
      .catch((err) => {
        if (!active) return;
        if (err instanceof ApiClientError && (err.status === 401 || err.status === 404)) {
          void signOut({ callbackUrl: "/" });
        }
      });
    return () => {
      active = false;
    };
  }, [status]);

  useEffect(() => loadProfile(), [loadProfile, pathname]);

  useEffect(() => {
    if (!open) return;
    return loadProfile();
  }, [loadProfile, open]);

  // Close the menu whenever the user navigates — saves a click after picking
  // "Account" since the route push happens before this would otherwise fire.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!session?.user) return null;

  const email = profile?.email ?? session.user.email ?? "";
  // Display name resolution, in priority order: the account name from
  // /api/me, the session's name, then the email prefix, then a quiet fallback.
  const displayName =
    profile?.fullName?.trim() ||
    session.user.name?.trim() ||
    (email.includes("@") ? email.split("@")[0] : "") ||
    "you";
  const initial = (displayName[0] ?? "Y").toUpperCase();
  const initialClassName = initialGradientClass(initial);
  const activePage = pathname === "/account/profile"
    ? "account"
    : pathname === "/account"
      ? "desk"
      : pathname === "/account/plan"
        ? "plan"
        : pathname === "/support" || pathname === "/questions"
          ? "support"
          : null;

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Account menu"
        className="group inline-flex h-9 items-center gap-2 rounded-md border border-ink-200 bg-white py-0 pl-1 pr-2 text-[13px] font-medium text-ink-800 shadow-soft transition-colors duration-150 ease-editorial hover:border-ink-300 hover:bg-ink-75 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-300 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-50"
      >
        <span
          aria-hidden="true"
          className={cn(
            "grid h-7 w-7 place-items-center rounded-md border font-serif text-[14px] leading-none",
            initialClassName,
          )}
        >
          {initial}
        </span>
        <span className="hidden max-w-[160px] truncate sm:inline">{displayName}</span>
        <span
          aria-hidden="true"
          className={`text-ink-400 transition-transform duration-150 ease-editorial ${open ? "rotate-180" : ""}`}
        >
          ▾
        </span>
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Account"
          className="animate-fade absolute right-0 top-[calc(100%+6px)] z-40 w-80 origin-top-right overflow-hidden rounded-md border border-ink-200/80 bg-white shadow-lift"
        >
          {/* Header band — creator identity in roman text, email in quiet
              monospace beneath. The curator name doesn't surface here; this
              chip is about the human, not their companion. */}
          <div className="border-b border-ink-200/60 px-3.5 py-3">
            <div className="flex items-center gap-2.5">
              <span
                aria-hidden="true"
                className={cn(
                  "grid h-8 w-8 place-items-center rounded-md border font-serif text-[16px] leading-none",
                  initialClassName,
                )}
              >
                {initial}
              </span>
              <div className="min-w-0">
                <div className="truncate font-serif text-[14px] leading-tight text-ink-900">{displayName}</div>
                {email && (
                  <div className="mt-0.5 truncate font-mono text-[10.5px] tracking-tightish text-ink-500">
                    {email}
                  </div>
                )}
              </div>
            </div>
          </div>

          <WorkspaceMenuSection workspaces={workspaces} pathname={pathname ?? ""} />

          <ul className="flex flex-col py-1.5">
            <li>
              <MenuLink
                href="/account/profile"
                active={activePage === "account"}
              >
                Account
              </MenuLink>
            </li>
            <li>
              <MenuLink
                href="/account"
                active={activePage === "desk"}
              >
                Desk
              </MenuLink>
            </li>
            <li>
              <MenuLink
                href="/account/plan"
                active={activePage === "plan"}
              >
                Premium Plan
              </MenuLink>
            </li>
            <li>
              <MenuLink
                href="/support"
                active={activePage === "support"}
              >
                Support
              </MenuLink>
            </li>
            <li>
              <button
                type="button"
                role="menuitem"
                onClick={() => void signOut({ callbackUrl: "/" })}
                className="block w-full px-3.5 py-1.5 text-left text-[13px] text-ink-700 transition-colors hover:bg-critical-100/40 hover:text-critical-700"
              >
                Sign Out
              </button>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}

function MenuLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative block px-3.5 py-1.5 text-[13px] transition-colors",
        active
          ? "bg-accent-50/70 font-medium text-accent-700 before:absolute before:bottom-1.5 before:left-0 before:top-1.5 before:w-0.5 before:rounded-r-full before:bg-accent-500 hover:bg-accent-50 hover:text-accent-700"
          : "text-ink-700 hover:bg-ink-50 hover:text-ink-900",
      )}
    >
      {children}
    </Link>
  );
}

function WorkspaceMenuSection({
  workspaces,
  pathname,
}: {
  workspaces: AccountWorkspaceSummary[];
  pathname: string;
}) {
  const [switchOpen, setSwitchOpen] = useState(false);
  const [recentWorkspaceToken, setRecentWorkspaceToken] = useState<string | null>(null);

  useEffect(() => {
    const activeToken = workspaceTokenFromPath(pathname);
    if (activeToken) {
      window.localStorage.setItem("scaffold:lastWorkspaceToken", activeToken);
      setRecentWorkspaceToken(activeToken);
      return;
    }
    setRecentWorkspaceToken(window.localStorage.getItem("scaffold:lastWorkspaceToken"));
  }, [pathname]);

  if (workspaces.length === 0) {
    return null;
  }

  const activeToken = workspaceTokenFromPath(pathname);
  const activeWorkspace = activeToken
    ? workspaces.find((workspace) => workspace.token === activeToken)
    : null;
  const recentWorkspace = recentWorkspaceToken
    ? workspaces.find((workspace) => workspace.token === recentWorkspaceToken)
    : null;
  const primaryWorkspace = activeWorkspace ?? recentWorkspace ?? workspaces[0];
  const canSwitch = workspaces.length > 1;

  return (
    <div className="border-b border-ink-200/60 px-3.5 py-2">
      <div className="flex items-center gap-2">
        <WorkspaceLink workspace={primaryWorkspace} active={Boolean(activeWorkspace)} prominent />
        {canSwitch && (
          <button
            type="button"
            aria-label="Switch workspace"
            aria-expanded={switchOpen}
            onClick={() => setSwitchOpen((value) => !value)}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-ink-200 bg-ink-50 text-[10px] text-ink-500 transition-colors hover:border-ink-300 hover:bg-ink-100 hover:text-ink-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-300"
          >
            <span
              aria-hidden="true"
              className={cn("transition-transform duration-150 ease-editorial", switchOpen && "rotate-180")}
            >
              &#9662;
            </span>
          </button>
        )}
      </div>
      {switchOpen && (
        <div className="mt-2 flex flex-col gap-1 border-t border-ink-200/50 pt-2">
          {workspaces.map((workspace) => (
            <WorkspaceSwitchLink
              key={workspace.id}
              workspace={workspace}
              selected={workspace.id === primaryWorkspace.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function WorkspaceLink({
  workspace,
  active = false,
  prominent = false,
}: {
  workspace: AccountWorkspaceSummary;
  active?: boolean;
  prominent?: boolean;
}) {
  const label = workspace.publicationName ?? hostnameOf(workspace.publicationUrl);
  const host = hostnameOf(workspace.publicationUrl);
  const status = statusLabel(workspace.status);

  return (
    <Link
      href={workspace.workspaceUrl}
      role="menuitem"
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex min-w-0 flex-1 items-center justify-between gap-3 rounded-md bg-white px-3 py-2.5 transition-colors hover:bg-ink-50",
      )}
    >
      <span className="min-w-0">
        <span
          className={cn(
            "block truncate leading-snug text-ink-900",
            prominent ? "font-serif text-[14px]" : "text-[13px]",
          )}
        >
          {label}
        </span>
        <span className="mt-0.5 block truncate font-mono text-[10px] tracking-tightish text-ink-500">
          {host}
        </span>
      </span>
      <span
        className={cn(
          "shrink-0 rounded-full border px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.12em]",
          workspace.status === "ready"
            ? "border-positive-100 bg-positive-100/40 text-positive-700"
            : workspace.status === "failed"
              ? "border-critical-100 bg-critical-100/40 text-critical-700"
              : "border-accent-200 bg-accent-50 text-accent-700",
        )}
      >
        {status}
      </span>
    </Link>
  );
}

function WorkspaceSwitchLink({
  workspace,
  selected,
}: {
  workspace: AccountWorkspaceSummary;
  selected: boolean;
}) {
  const label = workspace.publicationName ?? hostnameOf(workspace.publicationUrl);
  const host = hostnameOf(workspace.publicationUrl);

  return (
    <Link
      href={workspace.workspaceUrl}
      role="menuitemradio"
      aria-checked={selected}
      className={cn(
        "flex min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-[13px] transition-colors",
        selected ? "bg-accent-50/70 text-accent-700" : "text-ink-700 hover:bg-ink-50 hover:text-ink-900",
      )}
    >
      <span className="grid h-4 w-4 shrink-0 place-items-center font-mono text-[10px]">
        {selected ? "\u2713" : ""}
      </span>
      <span className="min-w-0">
        <span className="block truncate">{label}</span>
        <span className="block truncate font-mono text-[10px] tracking-tightish text-ink-500">{host}</span>
      </span>
    </Link>
  );
}

function workspaceTokenFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/workspace\/([^/]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}
