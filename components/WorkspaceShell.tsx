"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { WorkspaceNav } from "./WorkspaceNav";
import { useWorkspace } from "./WorkspaceProvider";
import { LoadingState, ErrorState } from "./states";

export function WorkspaceShell({ children }: { children: ReactNode }) {
  const { overview, loading, error, token } = useWorkspace();
  // Re-key the content wrapper on tab change so the entrance animation
  // replays — gives each tab a subtle settle on navigation.
  const pathnameKey = usePathname() ?? "/";

  if (loading && !overview) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-12">
        <LoadingState label="Opening your workspace..." />
      </div>
    );
  }

  if (error && !overview) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-12">
        <ErrorState
          title="We couldn't open this workspace"
          description={error}
        />
      </div>
    );
  }

  return (
    <>
      <WorkspaceNav token={token} overview={overview} />
      <div key={pathnameKey} className="mx-auto max-w-6xl px-6 py-8 animate-rise">
        {children}
      </div>
    </>
  );
}
