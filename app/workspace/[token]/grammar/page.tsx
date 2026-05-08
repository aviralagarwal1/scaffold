"use client";

import { useEffect, useState } from "react";
import type { PostSummary } from "@/types/post";
import { useWorkspace } from "@/components/WorkspaceProvider";
import { GrammarAuditPanel } from "@/components/GrammarAuditPanel";
import { NotReadyNotice } from "@/components/NotReadyNotice";
import { api } from "@/lib/client/api";
import { LoadingState } from "@/components/states";
import { PageHeader } from "@/components/PageHeader";

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
        title="An editor's pass over your archive."
        meta={ready ? "Recurring patterns, not generic spellcheck. Voice preserved." : undefined}
      />
      {!ready ? (
        <NotReadyNotice status={overview.status} token={token} feature="Grammar audit" />
      ) : posts === null ? (
        <LoadingState label="Loading posts" />
      ) : (
        <GrammarAuditPanel token={token} posts={posts} />
      )}
    </div>
  );
}
