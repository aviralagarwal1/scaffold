"use client";

import { useEffect, useMemo, useState } from "react";
import type { DistributionPlatform, RepurposeDraft, RepurposeDraftStatus } from "@/types/ai";
import type { PostSummary } from "@/types/post";
import { api, ApiClientError } from "@/lib/client/api";
import { RepurposeDraftCard } from "./RepurposeDraftCard";
import { PlatformIcon } from "./PlatformIcon";
import { EmptyState, LoadingState } from "./states";
import { cn } from "@/lib/client/cn";
import { platformLabel } from "@/lib/client/format";

const PLATFORMS: DistributionPlatform[] = ["twitter", "linkedin", "facebook", "reddit"];

const STATUS_TABS: { key: "all" | RepurposeDraftStatus; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "saved", label: "Saved" },
  { key: "approved", label: "Approved" },
];

export function DistributionPanel({
  token,
  posts,
  disabled,
}: {
  token: string;
  posts: PostSummary[];
  disabled?: boolean;
}) {
  const [drafts, setDrafts] = useState<RepurposeDraft[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<DistributionPlatform | null>(null);
  const [selectedPostId, setSelectedPostId] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"all" | RepurposeDraftStatus>("all");
  const [platformFilter, setPlatformFilter] = useState<"all" | DistributionPlatform>("all");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const list = await api.listDrafts(token);
        if (active) setDrafts(list);
      } catch (err) {
        if (active) setError(err instanceof ApiClientError ? err.message : "Could not load drafts.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [token]);

  useEffect(() => {
    if (!selectedPostId && posts[0]) setSelectedPostId(posts[0].id);
  }, [posts, selectedPostId]);

  const generate = async (platform: DistributionPlatform) => {
    if (!selectedPostId) {
      setError("Pick a post to repurpose first.");
      return;
    }
    setGenerating(platform);
    setError(null);
    try {
      const res = await api.generateDistribution(token, { postId: selectedPostId, platform });
      setDrafts((prev) => [...res.drafts, ...(prev ?? [])]);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Generation failed.");
    } finally {
      setGenerating(null);
    }
  };

  const visible = useMemo(() => {
    if (!drafts) return [];
    return drafts.filter((d) => {
      if (statusFilter !== "all" && d.status !== statusFilter) return false;
      if (platformFilter !== "all" && d.platform !== platformFilter) return false;
      return true;
    });
  }, [drafts, statusFilter, platformFilter]);

  const pendingCount = drafts?.filter((d) => d.status === "pending").length ?? 0;

  const onChange = (id: string, next: RepurposeDraft | null) => {
    setDrafts((prev) => {
      if (!prev) return prev;
      if (next === null) return prev.filter((d) => d.id !== id);
      return prev.map((d) => (d.id === id ? next : d));
    });
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Compose row — bare, not panel-wrapped, so it reads as a command bar
          rather than a heavy box. */}
      <section className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <label htmlFor="post-select" className="type-eyebrow text-ink-400">
            Source post
          </label>
          <select
            id="post-select"
            className="input"
            value={selectedPostId}
            onChange={(e) => setSelectedPostId(e.target.value)}
            disabled={disabled || posts.length === 0}
          >
            {posts.length === 0 && <option value="">No posts yet</option>}
            {posts.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <span className="type-eyebrow text-ink-400">Generate for</span>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {PLATFORMS.map((p) => (
              <PlatformGenerateButton
                key={p}
                platform={p}
                disabled={disabled || generating !== null || !selectedPostId}
                busy={generating === p}
                onClick={() => generate(p)}
              />
            ))}
          </div>
        </div>
        {error && (
          <div className="rounded-md border border-critical-100 bg-critical-100/40 px-3 py-2 text-[13px] text-critical-700">
            {error}
          </div>
        )}
      </section>

      {/* Library divider — pending count surfaces here so the writer knows
          there's something awaiting review the moment they land. */}
      <div className="flex items-center gap-3">
        <span className="type-eyebrow text-ink-400">Library</span>
        <span className="h-px flex-1 bg-ink-200/70" />
        {pendingCount > 0 && (
          <span className="font-mono text-[10.5px] text-accent-700">
            {pendingCount} pending
          </span>
        )}
        {drafts && drafts.length > 0 && (
          <span className="font-mono text-[10.5px] text-ink-400">
            {visible.length}/{drafts.length}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedControl
          options={STATUS_TABS.map((t) => ({ key: t.key, label: t.label }))}
          value={statusFilter}
          onChange={(v) => setStatusFilter(v as typeof statusFilter)}
        />
        <SegmentedControl
          options={[
            { key: "all", label: "All platforms" },
            ...PLATFORMS.map((p) => ({ key: p, label: platformLabel(p) })),
          ]}
          value={platformFilter}
          onChange={(v) => setPlatformFilter(v as typeof platformFilter)}
        />
      </div>

      {loading && <LoadingState label="Loading drafts" />}
      {!loading && visible.length === 0 && (
        <EmptyState
          eyebrow="No drafts yet"
          title="Nothing to repurpose."
          description="Pick a post above and generate drafts for any platform. Pending drafts expire after 24 hours unless you save or approve them."
        />
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {visible.map((d) => (
          <RepurposeDraftCard
            key={d.id}
            token={token}
            draft={d}
            onChange={(next) => onChange(d.id, next)}
            onRegenerate={() => generate(d.platform)}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Platform generate button. Editorial palette throughout — soft white surface
 * with ink-200 border at rest, accent warmth on hover. The platform identity
 * lives in the icon, not the button color, so a row of these reads as one
 * cohesive control panel rather than four competing brand colors.
 */
function PlatformGenerateButton({
  platform,
  busy,
  disabled,
  onClick,
}: {
  platform: DistributionPlatform;
  busy: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "group inline-flex items-center justify-center gap-2.5 rounded-md border border-ink-200 bg-white px-4 py-2.5 text-[13px] font-medium tracking-tightish text-ink-800 shadow-soft transition-all duration-200 ease-editorial",
        "hover:-translate-y-px hover:border-accent-300 hover:bg-accent-50/40 hover:text-ink-900 hover:shadow-lift",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-300 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-50",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:border-ink-200 disabled:hover:bg-white disabled:hover:shadow-soft",
      )}
    >
      {busy ? (
        <>
          <span className="relative inline-flex h-2 w-2 shrink-0" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full animate-editorial-pulse rounded-full bg-accent-400/50" />
            <span className="relative inline-flex h-2 w-2 animate-editorial-pulse rounded-full bg-accent-400" />
          </span>
          <span>Drafting</span>
        </>
      ) : (
        <>
          <PlatformIcon
            platform={platform}
            className="h-4 w-4 text-ink-500 transition-colors duration-200 ease-editorial group-hover:text-accent-700"
          />
          <span>{platformLabel(platform)}</span>
        </>
      )}
    </button>
  );
}

function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-md border border-ink-200 bg-white p-0.5 shadow-soft">
      {options.map((o) => (
        <button
          key={o.key}
          onClick={() => onChange(o.key)}
          className={cn(
            "rounded-[5px] px-3 py-1.5 text-[12.5px] font-medium tracking-tightish transition-colors duration-150 ease-editorial",
            value === o.key ? "bg-ink-900 text-ink-50" : "text-ink-600 hover:bg-ink-75",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
