"use client";

import { useEffect, useState } from "react";
import type { PostSummary } from "@/types/post";
import { useWorkspace } from "@/components/workspace/WorkspaceProvider";
import { GrammarAuditPanel } from "@/components/workspace/GrammarAuditPanel";
import { NotReadyNotice } from "@/components/workspace/NotReadyNotice";
import { api } from "@/lib/client/api";
import { LoadingState } from "@/components/ui/states";
import { PageHeader } from "@/components/workspace/PageHeader";

export default function GrammarPage() {
  const { token, overview } = useWorkspace();
  const [posts, setPosts] = useState<PostSummary[] | null>(null);
  const ready = overview?.status === "ready" || overview?.status === "partial";

  useEffect(() => {
    if (!ready) return;
    let active = true;
    api
      .listPosts(token)
      .then((list) => {
        if (active) setPosts(list);
      })
      .catch(() => {
        if (active) setPosts([]);
      });
    return () => {
      active = false;
    };
  }, [ready, token]);

  if (!overview) return null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Proofread your posts."
        meta={ready ? "Notes are surfaced from across your library, not from generic spellcheck. Your voice always stays intact." : undefined}
      />
      {!ready ? (
        <NotReadyNotice status={overview.status} token={token} feature="Proofreading" />
      ) : posts === null ? (
        <LoadingState label="Loading your posts..." />
      ) : (
        <GrammarAuditPanel token={token} posts={posts} />
      )}
    </div>
  );
}
