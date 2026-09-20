"use client";

import { useWorkspace } from "@/components/workspace/WorkspaceProvider";
import { NotesLedger } from "@/components/workspace/NotesLedger";
import { NotReadyNotice } from "@/components/workspace/NotReadyNotice";

export default function NotesPage() {
  const { token, overview } = useWorkspace();
  if (!overview) return null;

  const ready = overview.status === "ready" || overview.status === "partial";

  if (!ready) {
    return <NotReadyNotice status={overview.status} token={token} section="notes" />;
  }

  return <NotesLedger token={token} />;
}
