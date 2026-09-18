"use client";

import { useWorkspace } from "@/components/workspace/WorkspaceProvider";
import { SearchPanel } from "@/components/workspace/SearchPanel";
import { NotReadyNotice } from "@/components/workspace/NotReadyNotice";
import { PageHeader } from "@/components/workspace/PageHeader";

export default function SearchPage() {
  const { token, overview } = useWorkspace();
  if (!overview) return null;

  const ready = overview.status === "ready" || overview.status === "partial";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Search your library."
        meta={ready ? "No more digging through endless tabs for one line." : undefined}
      />
      {!ready ? <NotReadyNotice status={overview.status} token={token} feature="Search" /> : <SearchPanel token={token} />}
    </div>
  );
}
