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
      <PageHeader section="ideas" />
      {!ready ? <NotReadyNotice status={overview.status} token={token} section="ideas" /> : <IdeasPanel token={token} />}
    </div>
  );
}
