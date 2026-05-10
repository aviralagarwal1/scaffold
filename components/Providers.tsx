"use client";

import { SessionProvider } from "next-auth/react";
import type { Session } from "next-auth";
import type { ReactNode } from "react";

// We hydrate SessionProvider with the server-resolved session so the nav
// doesn't flash through "loading → unauthenticated → authenticated" on first
// paint. The user menu lands in the right state immediately.
export function Providers({ children, session }: { children: ReactNode; session: Session | null }) {
  return <SessionProvider session={session}>{children}</SessionProvider>;
}
