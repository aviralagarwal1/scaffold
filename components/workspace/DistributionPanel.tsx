"use client";

import { useEffect, useMemo, useState } from "react";
import type { DistributionPlatform, RepurposeDraft, RepurposeDraftStatus } from "@/types/ai";
import type { PostSummary } from "@/types/post";
import { api, ApiClientError } from "@/lib/client/api";
import { RepurposeDraftCard } from "@/components/workspace/RepurposeDraftCard";
import { PlatformIcon } from "@/components/workspace/PlatformIcon";
import { EmptyState, LoadingState } from "@/components/ui/states";
import { cn } from "@/lib/client/cn";
import { platformLabel } from "@/lib/client/format";

const PLATFORMS: DistributionPlatform[] = ["twitter", "linkedin", "facebook", "instagram", "reddit"];

const STATUS_TABS: { key: "all" | RepurposeDraftStatus; label: string }[] = [
  { key: "all", label: "All" },
  { key: "saved", label: "Saved" },
  { key: "pending", label: "Pending" },
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
  const [sourceAlerting, setSourceAlerting] = useState(false);
  const [platformAlerting, setPlatformAlerting] = useState(false);

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

  const generate = async (platform: DistributionPlatform, postId = selectedPostId) => {
    if (!postId) {
      setError("Pick a post to repurpose first.");
      return;
    }
    setGenerating(platform);
    setError(null);
    try {
      const res = await api.generateDistribution(token, { postId, platform });
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

  const selectedPlatform = platformFilter === "all" ? null : platformFilter;
  const canClickGenerate = !disabled && generating === null;

  const triggerAlert = (kind: "source" | "platform") => {
    const setAlerting = kind === "source" ? setSourceAlerting : setPlatformAlerting;
    setAlerting(false);
    requestAnimationFrame(() => {
      setAlerting(true);
      window.setTimeout(() => setAlerting(false), 450);
    });
  };

  const onGenerate = () => {
    if (!canClickGenerate) return;
    setError(null);
    if (!selectedPostId) triggerAlert("source");
    if (!selectedPlatform) triggerAlert("platform");
    if (!selectedPostId || !selectedPlatform) return;
    void generate(selectedPlatform);
  };

  const onChange = (id: string, next: RepurposeDraft | null) => {
    setDrafts((prev) => {
      if (!prev) return prev;
      if (next === null) return prev.filter((d) => d.id !== id);
      return prev.map((d) => (d.id === id ? next : d));
    });
  };

  return (
    <div className="flex flex-col">
      {/* === Compose zone ===
          Bare (no panel wrap) so it reads as a command bar. Internal gaps
          stay tight so the three sub-groups feel grouped together. */}
      <section className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <label htmlFor="post-select" className="type-eyebrow text-ink-400">
            Source post
          </label>
          <div className={cn(sourceAlerting && "animate-editorial-nudge")}>
            <select
              id="post-select"
              className={cn("input", sourceAlerting && "!border-ink-400")}
              value={selectedPostId}
              onChange={(e) => setSelectedPostId(e.target.value)}
              disabled={disabled || posts.length === 0}
            >
              <option value="">{posts.length === 0 ? "No posts yet" : "Choose a source post"}</option>
              {posts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <span className="type-eyebrow text-ink-400">Platform</span>
          <div className={cn("grid gap-2 rounded-md sm:grid-cols-2 lg:grid-cols-5", platformAlerting && "animate-editorial-nudge")}>
            {PLATFORMS.map((p) => (
              <PlatformFolderButton
                key={p}
                platform={p}
                selected={platformFilter === p}
                disabled={disabled}
                onClick={() => setPlatformFilter((prev) => (prev === p ? "all" : p))}
              />
            ))}
          </div>
          <div className="flex justify-end pt-3">
            <button
              type="button"
              onClick={onGenerate}
              className="btn-primary group gap-1.5"
              disabled={!canClickGenerate}
            >
              {generating ? (
                <>
                  <span className="relative inline-flex h-2 w-2 shrink-0" aria-hidden="true">
                    <span className="absolute inline-flex h-full w-full animate-editorial-pulse rounded-full bg-ink-50/50" />
                    <span className="relative inline-flex h-2 w-2 animate-editorial-pulse rounded-full bg-ink-50" />
                  </span>
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <span>Generate</span>
                  <span aria-hidden="true" className="btn-ask-arrow">→</span>
                </>
              )}
            </button>
          </div>
        </div>
        {error && (
          <div className="rounded-md border border-critical-100 bg-critical-100/40 px-3 py-2 text-[13px] text-critical-700">
            {error}
          </div>
        )}
      </section>

      {/* === Outbox zone ===
          The big page break lives here. mt-14 (56px) is intentionally larger
          than any internal gap so the eye registers a zone change rather than
          another step. Inside the zone, header→filter→cards stay tightly grouped. */}
      <div className="mt-14 flex flex-col gap-6">
        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <span className="type-eyebrow text-ink-400">Outbox</span>
            <span className="h-px flex-1 bg-ink-200/70" />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <SegmentedControl
              options={STATUS_TABS.map((t) => ({ key: t.key, label: t.label }))}
              value={statusFilter}
              onChange={(v) => setStatusFilter(v as typeof statusFilter)}
            />
          </div>
        </section>

        {loading && <LoadingState label="Loading your drafts..." />}
        {!loading && visible.length === 0 && (
          <EmptyState
            eyebrow="No drafts yet"
            title="Your best posts deserve a second audience."
            description="Pick a post above and generate drafts for any platform."
          />
        )}

        {visible.length > 0 && (
          <div className="grid gap-4 lg:grid-cols-2">
            {visible.map((d) => (
              <RepurposeDraftCard
                key={d.id}
                token={token}
                draft={d}
                onChange={(next) => onChange(d.id, next)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Platform folder button. The same control chooses the outbox shelf and the
 * generation target, so the row reads like five quiet folders rather than five
 * immediate commands.
 */
function PlatformFolderButton({
  platform,
  selected,
  disabled,
  onClick,
}: {
  platform: DistributionPlatform;
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        // Base: structure only. Colors and borders live in the conditional
        // branches so the selected state cleanly wins (no tailwind-merge here,
        // so any color in the base would coexist with the selected color).
        "group inline-flex items-center justify-center gap-2.5 rounded-md border px-4 py-2.5 text-[13px] font-medium tracking-tightish shadow-soft transition-all duration-200 ease-editorial",
        selected
          ? "border-accent-400 bg-accent-100 text-ink-900 shadow-[inset_0_0_0_1px_rgba(180,94,44,0.18),0_0_0_3px_rgba(232,194,164,0.22)]"
          : "border-ink-200 bg-white text-ink-800 hover:-translate-y-px hover:border-accent-300 hover:bg-accent-50/40 hover:text-ink-900 hover:shadow-lift",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-300 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-50",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:border-ink-200 disabled:hover:bg-white disabled:hover:shadow-soft",
      )}
      aria-pressed={selected}
    >
      <PlatformIcon
        platform={platform}
        className={cn(
          "h-4 w-4 transition-colors duration-200 ease-editorial",
          selected ? "text-accent-700" : "text-ink-500 group-hover:text-accent-700",
        )}
      />
      <span>{platformLabel(platform)}</span>
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
