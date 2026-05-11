"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect } from "react";

/**
 * Bounce a logged-in visitor off of pages that don't make sense for them —
 * /login and /register, plus the marketing landing once they've signed in.
 *
 * The delay prop lets callers add a short hold so the page doesn't snap out
 * from under the visitor. On the landing page that brief beat lets the brand
 * register before the route changes; on /login and /register we redirect
 * immediately because there's no value in showing them a stale auth form.
 *
 * The publicationUrl param (carried from the landing hook through
 * /register → /onboarding) is preserved on the destination URL.
 */
export function AuthedRedirect({
  to = "/account",
  delayMs = 0,
}: {
  to?: string;
  delayMs?: number;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const { status } = useSession();

  useEffect(() => {
    if (status !== "authenticated") return;
    const url = params?.get("publicationUrl");
    const callbackUrl = params?.get("callbackUrl") ?? "";
    const safeCallbackUrl = callbackUrl.startsWith("/") && !callbackUrl.startsWith("//") ? callbackUrl : "";
    const tail = url ? `?publicationUrl=${encodeURIComponent(url)}` : "";
    const destination = safeCallbackUrl || `${to}${tail}`;
    if (delayMs <= 0) {
      router.replace(destination);
      return;
    }
    const timer = window.setTimeout(() => {
      router.replace(destination);
    }, delayMs);
    return () => window.clearTimeout(timer);
  }, [status, params, router, to, delayMs]);

  return null;
}
