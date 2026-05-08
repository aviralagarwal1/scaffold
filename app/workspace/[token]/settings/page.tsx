"use client";

import Link from "next/link";
import { useWorkspace } from "@/components/WorkspaceProvider";
import { PrivateLinkBanner } from "@/components/PrivateLinkBanner";
import { PageHeader } from "@/components/PageHeader";
import { formatDate, hostnameOf, pluralize } from "@/lib/client/format";

export default function SettingsPage() {
  const { token, overview, reingest, reingesting } = useWorkspace();
  if (!overview) return null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Workspace settings."
        meta="Manage how your archive is read and how you return to this workspace."
      />

      <PrivateLinkBanner token={token} />

      <section className="panel flex flex-col gap-3 p-5">
        <span className="type-eyebrow text-ink-400">Publication</span>
        <div className="font-serif text-[17px] leading-tight tracking-tightish text-ink-900">
          {overview.publicationName ?? hostnameOf(overview.publicationUrl)}
        </div>
        <a
          href={overview.publicationUrl}
          target="_blank"
          rel="noreferrer"
          className="break-all text-[12px] text-ink-500 transition-colors hover:text-ink-800"
        >
          {overview.publicationUrl}
        </a>
        <dl className="mt-2 grid grid-cols-2 gap-y-2 text-[12.5px] text-ink-700">
          <dt className="text-ink-500">Status</dt>
          <dd className="capitalize">{overview.status}</dd>
          <dt className="text-ink-500">Posts indexed</dt>
          <dd>{pluralize(overview.postCount, "post")}</dd>
          <dt className="text-ink-500">Last ingested</dt>
          <dd>{overview.lastIngestedAt ? formatDate(overview.lastIngestedAt, { withTime: true }) : "Not yet"}</dd>
        </dl>
      </section>

      <section className="panel flex flex-col gap-3 p-5">
        <h3 className="type-h3">Re-ingest archive</h3>
        <p className="text-[14px] leading-relaxed text-ink-600">
          Pull your latest posts and refresh chunks. Existing chat history and saved drafts stay where they are.
        </p>
        <div>
          <button onClick={reingest} className="btn-primary" disabled={reingesting}>
            {reingesting ? "Re-ingesting" : "Re-ingest now"}
          </button>
        </div>
        {overview.ingestionError && (
          <div className="rounded-md border border-critical-100 bg-critical-100/40 px-3 py-2 text-[12.5px] text-critical-700">
            Last error. {overview.ingestionError}
          </div>
        )}
      </section>

      <section className="panel flex flex-col gap-3 p-5">
        <h3 className="type-h3">Privacy</h3>
        <p className="text-[14px] leading-relaxed text-ink-600">
          There is no login. Anyone with the workspace link can access this workspace. Don't share it publicly. We only
          read your public Substack archive. We never see private subscriber data, opens, clicks, or paid analytics.
        </p>
      </section>

      <div>
        <Link href={`/workspace/${token}`} className="btn-link">
          ← Back to overview
        </Link>
      </div>
    </div>
  );
}
