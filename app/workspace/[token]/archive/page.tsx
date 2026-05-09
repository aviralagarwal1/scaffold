"use client";

import { useEffect, useState } from "react";
import type { PostSummary } from "@/types/post";
import { useWorkspace } from "@/components/WorkspaceProvider";
import { ArchiveBrowser } from "@/components/ArchiveBrowser";
import { NotReadyNotice } from "@/components/NotReadyNotice";
import { LoadingState, ErrorState } from "@/components/states";
import { api, ApiClientError } from "@/lib/client/api";
import { PageHeader } from "@/components/PageHeader";

export default function ArchivePage() {
  const { token, overview } = useWorkspace();
  const [posts, setPosts] = useState<PostSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ready = overview?.status === "ready" || overview?.status === "partial";

  useEffect(() => {
    if (!ready) return;
    let active = true;
    api
      .listPosts(token)
      .then((list) => {
        if (active) setPosts(list);
      })
      .catch((err) => {
        if (active) setError(err instanceof ApiClientError ? err.message : "Could not load posts.");
      });
    return () => {
      active = false;
    };
  }, [ready, token]);

  if (!overview) return null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Browse your library."
        meta={
          posts
            ? `We're basking in the excellence of your ${posts.length.toLocaleString()} ${posts.length === 1 ? "post" : "posts"}.`
            : undefined
        }
      />
      {!ready ? (
        <NotReadyNotice status={overview.status} token={token} feature="Archive" />
      ) : error ? (
        <ErrorState description={error} />
      ) : posts === null ? (
        <LoadingState label="Loading posts" />
      ) : (
        <ArchiveBrowser posts={posts} />
      )}
    </div>
  );
}
