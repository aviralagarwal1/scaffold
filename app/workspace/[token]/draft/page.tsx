"use client";

import { useWorkspace } from "@/components/workspace/WorkspaceProvider";
import { DraftFeedbackPanel } from "@/components/workspace/DraftFeedbackPanel";
import { NotReadyNotice } from "@/components/workspace/NotReadyNotice";
import { PageHeader } from "@/components/workspace/PageHeader";

export default function DraftPage() {
  const { token, overview } = useWorkspace();
  if (!overview) return null;

  const ready = overview.status === "ready" || overview.status === "partial";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader section="draft" />
      {!ready ? (
        <NotReadyNotice status={overview.status} token={token} section="draft" />
      ) : (
        <DraftFeedbackPanel token={token} />
      )}
    </div>
  );
}
