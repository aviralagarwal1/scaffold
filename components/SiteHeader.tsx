"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import type { ReactNode } from "react";
import { UserMenu } from "./UserMenu";

export function SiteHeader() {
  const pathname = usePathname();
  const isLanding = pathname === "/";
  const { status } = useSession();
  const isAuthenticated = status === "authenticated";

  return (
    <header className="sticky top-0 z-30 border-b border-ink-200/60 bg-ink-50/85 backdrop-blur-md">
      <div className={`mx-auto flex max-w-6xl items-center justify-between px-6 ${isLanding ? "h-16 md:h-[72px]" : "h-14"}`}>
        <Link
          href="/"
          className="group flex items-center transition-opacity duration-200 ease-editorial hover:opacity-80"
          aria-label="Scaffold · home"
        >
          <Wordmark size={isLanding ? "lg" : "sm"} />
        </Link>
        <nav className="flex items-center gap-2">{renderNavItems(pathname, isAuthenticated)}</nav>
      </div>
    </header>
  );
}

// Nav is contextual. Order is: workspace context → marketing/auth context.
//
// - Workspace pages (non-settings): Sync Workspace is the workspace's own
//   verb; the UserMenu sits beside it as the global identity affordance.
// - About is a landing-page affordance only. Once someone is registering,
//   setting up, or working, the nav should stay task-focused.
// - Auth chips depend on session. Logged out → Log in + Register. Logged in
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
          <Link href={`/workspace/${token}/settings`} className="btn-secondary">
            Sync Workspace
          </Link>
        )}
        {isAuthenticated && <UserMenu />}
      </>
    );
  }

  return (
    <>
      {pathname === "/" && (
        <Link href="/about" className="btn-secondary">
          About
        </Link>
      )}
      {isAuthenticated ? (
        <UserMenu />
      ) : (
        <>
          {pathname !== "/login" && (
            <Link href="/login" className="btn-secondary">
              Log In
            </Link>
          )}
          {pathname !== "/register" && (
            <Link href="/register" className="btn-primary">
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
 * symbol carries the editorial accent that the old two-word mark split across
 * roman and italic text.
 */
function Wordmark({ size = "sm" }: { size?: "sm" | "lg" }) {
  const isLg = size === "lg";
  return (
    <span className={`flex items-baseline ${isLg ? "gap-2" : "gap-1.5"} leading-none`}>
      <span
        aria-hidden="true"
        className={`font-serif text-accent-500 ${isLg ? "text-[24px]" : "text-[16px]"}`}
        style={{ transform: "translateY(0.5px)" }}
      >
        §
      </span>
      <span
        className={`font-serif tracking-tightish text-ink-900 ${
          isLg ? "text-[26px]" : "text-[17px]"
        }`}
      >
        Scaffold
      </span>
    </span>
  );
}
