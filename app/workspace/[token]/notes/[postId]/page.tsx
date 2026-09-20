"use client";

import { useParams } from "next/navigation";
import { useWorkspace } from "@/components/workspace/WorkspaceProvider";
import { NotesManuscript } from "@/components/workspace/NotesManuscript";
import { NotReadyNotice } from "@/components/workspace/NotReadyNotice";

export default function NotesPostPage() {
  const { token, overview } = useWorkspace();
  const params = useParams<{ postId: string }>();
  const postId = typeof params.postId === "string" ? params.postId : "";
  if (!overview || !postId) return null;

  const ready = overview.status === "ready" || overview.status === "partial";

  if (!ready) {
    return <NotReadyNotice status={overview.status} token={token} section="notes" />;
  }

  return <NotesManuscript token={token} postId={postId} />;
}
