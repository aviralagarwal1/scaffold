"use client";

import { useWorkspace } from "@/components/workspace/WorkspaceProvider";
import { ChatPanel } from "@/components/workspace/ChatPanel";
import { NotReadyNotice } from "@/components/workspace/NotReadyNotice";
import { PageHeader } from "@/components/workspace/PageHeader";

export default function AskPage() {
  const { token, overview } = useWorkspace();

  if (!overview) return null;

  const ready = overview.status === "ready" || overview.status === "partial";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader section="ask" />
      {!ready ? (
        <NotReadyNotice status={overview.status} token={token} section="ask" />
      ) : (
        <ChatPanel token={token} />
      )}
    </div>
  );
}
