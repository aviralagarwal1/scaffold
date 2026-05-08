"use client";

import { useWorkspace } from "@/components/WorkspaceProvider";
import { IdeasPanel } from "@/components/IdeasPanel";
import { NotReadyNotice } from "@/components/NotReadyNotice";
import { PageHeader } from "@/components/PageHeader";

export default function IdeasPage() {
  const { token, overview } = useWorkspace();
  if (!overview) return null;

  const ready = overview.status === "ready" || overview.status === "partial";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="What to write next."
        meta={ready ? "Sequels, contrarian angles, underexplored themes, and essays worth revisiting." : undefined}
      />
      {!ready ? <NotReadyNotice status={overview.status} token={token} feature="Ideas" /> : <IdeasPanel token={token} />}
    </div>
  );
}
