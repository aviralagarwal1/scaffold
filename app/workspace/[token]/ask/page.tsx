"use client";

import { useEffect, useState } from "react";
import { useWorkspace } from "@/components/WorkspaceProvider";
import { ChatPanel } from "@/components/ChatPanel";
import { NotReadyNotice } from "@/components/NotReadyNotice";
import { PageHeader } from "@/components/PageHeader";
import { api, ApiClientError } from "@/lib/client/api";

export default function AskPage() {
  const { token, overview } = useWorkspace();
  const [curatorName, setCuratorName] = useState("Curator");

  useEffect(() => {
    let active = true;
    api
      .me()
      .then((profile) => {
        if (active && profile.editorName?.trim()) setCuratorName(profile.editorName.trim());
      })
      .catch((err) => {
        if (!active) return;
        if (err instanceof ApiClientError && err.status === 401) return;
      });
    return () => {
      active = false;
    };
  }, []);

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
        <ChatPanel token={token} curatorName={curatorName} />
      )}
    </div>
  );
}
