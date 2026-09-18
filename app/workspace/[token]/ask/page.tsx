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
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Ask your memory."
        meta={ready ? "Insights are drawn directly from your published work." : undefined}
      />
      {!ready ? (
        <NotReadyNotice status={overview.status} token={token} feature="Conversation" />
      ) : (
        <ChatPanel token={token} />
      )}
    </div>
  );
}
