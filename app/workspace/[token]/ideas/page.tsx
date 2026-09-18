"use client";

import { useWorkspace } from "@/components/workspace/WorkspaceProvider";
import { IdeasPanel } from "@/components/workspace/IdeasPanel";
import { NotReadyNotice } from "@/components/workspace/NotReadyNotice";
import { PageHeader } from "@/components/workspace/PageHeader";

export default function IdeasPage() {
  const { token, overview } = useWorkspace();
  if (!overview) return null;

  const ready = overview.status === "ready" || overview.status === "partial";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Explore your ideas."
        meta={ready ? "Ideas rise from gaps and recurring patterns in your library. Expect sequels, contrarian angles, and themes worth revisiting." : undefined}
      />
      {!ready ? <NotReadyNotice status={overview.status} token={token} feature="Exploration" /> : <IdeasPanel token={token} />}
    </div>
  );
}
