"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiClientError } from "@/lib/client/api";
import type { UserProfile } from "@/types/auth";

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
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Fetch the creator's identity once we know we're authenticated. The 401
  // case is silently swallowed — the menu falls back to session data, which
  // is enough to render something sensible.
  const loadProfile = useCallback(() => {
    if (status !== "authenticated") return;
    let active = true;
    api
      .me()
      .then((p) => {
        if (active) setProfile(p);
      })
      .catch((err) => {
        if (!active) return;
        if (err instanceof ApiClientError && err.status === 401) return;
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
  // Display name resolution, in priority order: explicit creator name from
  // /api/me, the session's name, then the email prefix, then a quiet fallback.
  const displayName =
    profile?.creatorName?.trim() ||
    session.user.name?.trim() ||
    (email.includes("@") ? email.split("@")[0] : "") ||
    "you";
  const initial = (displayName[0] ?? "Y").toUpperCase();

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
          className="grid h-7 w-7 place-items-center rounded-md bg-accent-50 font-serif text-[14px] leading-none text-accent-700"
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
          className="animate-fade absolute right-0 top-[calc(100%+6px)] z-40 w-64 origin-top-right overflow-hidden rounded-md border border-ink-200/80 bg-white shadow-lift"
        >
          {/* Header band — creator identity in roman/italic, email in quiet
              monospace beneath. The curator name doesn't surface here; this
              chip is about the human, not their companion. */}
          <div className="border-b border-ink-200/60 px-3.5 py-3">
            <div className="flex items-center gap-2.5">
              <span
                aria-hidden="true"
                className="grid h-8 w-8 place-items-center rounded-md bg-accent-50 font-serif text-[16px] leading-none text-accent-700"
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

          <ul className="flex flex-col py-1.5">
            <li>
              <Link
                href="/account"
                role="menuitem"
                className="flex items-center gap-2 px-3.5 py-1.5 text-[13px] text-ink-700 transition-colors hover:bg-ink-50 hover:text-ink-900"
              >
                <span aria-hidden="true" className="font-serif text-[13px] leading-none text-accent-500">
                  §
                </span>
                Account
              </Link>
            </li>
            <li>
              <button
                type="button"
                role="menuitem"
                onClick={() => void signOut({ callbackUrl: "/" })}
                className="flex w-full items-center gap-2 px-3.5 py-1.5 text-left text-[13px] text-ink-700 transition-colors hover:bg-critical-100/40 hover:text-critical-700"
              >
                <span aria-hidden="true" className="text-ink-400">
                  ⏻
                </span>
                Sign out
              </button>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
