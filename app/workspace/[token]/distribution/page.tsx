"use client";

import { useEffect, useState } from "react";
import type { PostSummary } from "@/types/post";
import { useWorkspace } from "@/components/workspace/WorkspaceProvider";
import { DistributionPanel } from "@/components/workspace/DistributionPanel";
import { NotReadyNotice } from "@/components/workspace/NotReadyNotice";
import { LoadingState } from "@/components/ui/states";
import { api } from "@/lib/client/api";
import { PageHeader } from "@/components/workspace/PageHeader";

export default function DistributionPage() {
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
        title="Repurpose your writing."
        meta={ready ? "Drafts are tuned for Twitter, LinkedIn, Facebook, Instagram, and Reddit. Each helps your work find the readers it deserves." : undefined}
      />
      {!ready ? (
        <NotReadyNotice status={overview.status} token={token} feature="Distribution" />
      ) : posts === null ? (
        <LoadingState label="Loading your posts..." />
      ) : (
        <DistributionPanel token={token} posts={posts} />
      )}
    </div>
  );
}
