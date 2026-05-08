"use client";

import { useWorkspace } from "@/components/WorkspaceProvider";
import { DraftFeedbackPanel } from "@/components/DraftFeedbackPanel";
import { NotReadyNotice } from "@/components/NotReadyNotice";
import { PageHeader } from "@/components/PageHeader";

export default function DraftPage() {
  const { token, overview } = useWorkspace();
  if (!overview) return null;

  const ready = overview.status === "ready" || overview.status === "partial";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Editorial feedback on your draft."
        meta={ready ? "Grounded in the patterns already present in your writing." : undefined}
      />
      {!ready ? (
        <NotReadyNotice status={overview.status} token={token} feature="Draft feedback" />
      ) : (
        <DraftFeedbackPanel token={token} />
      )}
    </div>
  );
}
