"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState, type ReactNode } from "react";
import { api } from "@/lib/client/api";
import type { UserProfile } from "@/types/auth";
import { UserMenu } from "./UserMenu";
import { ScaffoldMark } from "./ScaffoldMark";

export function SiteHeader() {
  const pathname = usePathname();
  const isLanding = pathname === "/";
  const { status } = useSession();
  const isAuthenticated = status === "authenticated";
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    let active = true;
    if (!isAuthenticated) {
      setProfile(null);
      return;
    }
    api
      .me()
      .then((nextProfile) => {
        if (active) setProfile(nextProfile);
      })
      .catch(() => {
        if (active) setProfile(null);
      });
    return () => {
      active = false;
    };
  }, [isAuthenticated]);

  const isPremium = profile?.plan?.id === "pro";

  return (
    <header className="sticky top-0 z-30 border-b border-ink-200/60 bg-ink-50/85 backdrop-blur-md">
      <div className={`mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6 ${isLanding ? "h-16 md:h-[72px]" : "h-14"}`}>
        <Link
          href="/"
          className="group flex items-center transition-opacity duration-200 ease-editorial hover:opacity-80"
          aria-label="Scaffold · home"
        >
          <Wordmark size={isLanding ? "lg" : "sm"} premium={isPremium} />
        </Link>
        <nav className="flex shrink-0 items-center gap-2 sm:gap-3">{renderNavItems(pathname, isAuthenticated)}</nav>
      </div>
    </header>
  );
}

// Nav is contextual. Order is: workspace context → marketing/auth context.
//
// - Workspace pages (non-settings): Sync workspace is the workspace's own
//   verb; the UserMenu sits beside it as the global identity affordance.
// - About is a landing-page affordance only. Once someone is registering,
//   setting up, or working, the nav should stay task-focused.
// - Auth chips depend on session. Logged out → Sign in + Register. Logged in
//   → UserMenu (which reveals the email, an Account link, and Sign out).
//   Account is no longer a separate chip — it lives inside the menu so the
//   nav stays compact and there's exactly one identity surface to look at.
function renderNavItems(pathname: string | null, isAuthenticated: boolean): ReactNode {
  if (!pathname) return null;

  if (pathname.startsWith("/workspace/")) {
    const segments = pathname.split("/").filter(Boolean);
    const token = segments[1];
    const subpath = segments[2];
    if (!token) return null;
    return (
      <>
        {subpath !== "settings" && (
          <Link href={`/workspace/${token}/settings#sync`} className="btn-secondary">
            Sync workspace
          </Link>
        )}
        {isAuthenticated && <UserMenu />}
      </>
    );
  }

  return (
    <>
      {pathname === "/" && (
        <Link href="/about" className="btn-secondary hidden sm:inline-flex">
          About
        </Link>
      )}
      {isAuthenticated ? (
        <UserMenu />
      ) : (
        <>
          {pathname !== "/login" && (
            <Link href="/login" className="btn-secondary">
              Sign in
            </Link>
          )}
          {pathname !== "/register" && (
            <Link href="/register" className="btn-secondary">
              Register
            </Link>
          )}
        </>
      )}
    </>
  );
}

/**
 * Wordmark.
 *
 * The mark is the section symbol §, used historically by editors,
 * archivists, and cataloguers to denote a discrete passage of text.
 * It signals indexed, sectioned, citable knowledge — the product's
 * core promise — without resorting to AI-cliché iconography.
 *
 * Typography: the product name is a single roman serif wordmark. The section
 * symbol carries the editorial accent.
 */
function Wordmark({ size = "sm", premium = false }: { size?: "sm" | "lg"; premium?: boolean }) {
  const isLg = size === "lg";
  return (
    <span className={`flex items-baseline ${isLg ? "gap-2" : "gap-1.5"} leading-none`}>
      <ScaffoldMark
        className={`site-wordmark-mark shrink-0 text-accent-500 ${isLg ? "h-[21px] w-[21px] sm:h-[24px] sm:w-[24px]" : "h-[16px] w-[16px]"}`}
      />
      <span
        className={`font-serif tracking-tightish text-ink-900 ${
          isLg ? "text-[23px] sm:text-[26px]" : "text-[17px]"
        }`}
      >
        Scaffold
      </span>
      {premium && (
        <span
          className={`font-serif italic tracking-tightish text-accent-700 ${
            isLg ? "text-[23px] sm:text-[26px]" : "text-[17px]"
          }`}
        >
          Premium
        </span>
      )}
    </span>
  );
}
