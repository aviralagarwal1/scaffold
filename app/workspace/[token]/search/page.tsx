"use client";

import { useWorkspace } from "@/components/WorkspaceProvider";
import { SearchPanel } from "@/components/SearchPanel";
import { NotReadyNotice } from "@/components/NotReadyNotice";
import { PageHeader } from "@/components/PageHeader";

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
