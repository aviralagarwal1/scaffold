"use client";

import { useWorkspace } from "@/components/WorkspaceProvider";
import { ChatPanel } from "@/components/ChatPanel";
import { NotReadyNotice } from "@/components/NotReadyNotice";
import { PageHeader } from "@/components/PageHeader";

export default function AskPage() {
  const { token, overview } = useWorkspace();
  if (!overview) return null;

  const ready = overview.status === "ready" || overview.status === "partial";

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Ask your archive."
        meta={ready ? "Citations link to the posts each answer drew from." : undefined}
      />
      {!ready ? <NotReadyNotice status={overview.status} token={token} feature="Chat" /> : <ChatPanel token={token} />}
    </div>
  );
}
