"use client";

import { useEffect, useMemo, useState } from "react";
import type { GrammarAuditResponse, GrammarIssue } from "@/types/ai";
import type { PostSummary } from "@/types/post";
import { api, ApiClientError } from "@/lib/client/api";
import { GrammarIssueCard } from "./GrammarIssueCard";
import { EmptyState, ErrorState, LoadingState } from "./states";

export function GrammarAuditPanel({
  token,
  posts,
  disabled,
}: {
  token: string;
  posts: PostSummary[];
  disabled?: boolean;
}) {
  const [issues, setIssues] = useState<GrammarIssue[] | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [busy, setBusy] = useState<"audit" | "load" | "clear" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filterPostId, setFilterPostId] = useState<string>("all");
  const [filterSeverity, setFilterSeverity] = useState<"all" | GrammarIssue["severity"]>("all");

  useEffect(() => {
    let active = true;
    (async () => {
      setBusy("load");
      try {
        const list = await api.grammarIssues(token);
        if (active) setIssues(list);
      } catch {
        // first-time empty is fine
      } finally {
        if (active) setBusy(null);
      }
    })();
    return () => {
      active = false;
    };
  }, [token]);

  const runAudit = async (postId?: string) => {
    setBusy("audit");
    setError(null);
    try {
      const res: GrammarAuditResponse = await api.grammarAudit(token, postId ? { postId } : undefined);
      setSummary(res.summary);
      setIssues((prev) => {
        const existing = prev ?? [];
        const replacedIds = new Set(res.issues.map((i) => i.postId));
        const filtered = postId
          ? existing.filter((i) => i.postId !== postId)
          : existing.filter((i) => !replacedIds.has(i.postId));
        return [...res.issues, ...filtered];
      });
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Audit failed.");
    } finally {
      setBusy(null);
    }
  };

  const clearAudit = async () => {
    setBusy("clear");
    setError(null);
    try {
      await api.clearGrammarIssues(token);
      setIssues([]);
      setSummary(null);
      setFilterPostId("all");
      setFilterSeverity("all");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not clear audit.");
    } finally {
      setBusy(null);
    }
  };

  const filtered = useMemo(() => {
    if (!issues) return [];
    return issues.filter((i) => {
      if (filterPostId !== "all" && i.postId !== filterPostId) return false;
      if (filterSeverity !== "all" && i.severity !== filterSeverity) return false;
      return true;
    });
  }, [issues, filterPostId, filterSeverity]);

  return (
    <div className="flex flex-col">
      {/* === Compose zone === */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={() => runAudit()} className="btn-primary group gap-1.5" disabled={disabled || busy !== null}>
            {busy === "audit" ? (
              <>
                <span className="relative inline-flex h-2 w-2 shrink-0" aria-hidden="true">
                  <span className="absolute inline-flex h-full w-full animate-editorial-pulse rounded-full bg-ink-50/50" />
                  <span className="relative inline-flex h-2 w-2 animate-editorial-pulse rounded-full bg-ink-50" />
                </span>
                <span>Auditing your library...</span>
              </>
            ) : (
              <>
                <span>Run audit</span>
                <span aria-hidden="true" className="btn-ask-arrow">→</span>
              </>
            )}
          </button>
        </div>
        {summary && (
          <div className="animate-rise rounded-md border-l-2 border-accent-500 bg-accent-50/50 px-4 py-3 text-[14px] leading-relaxed text-ink-800">
            <div className="flex items-center gap-2">
              <span className="accent-rule" />
              <span className="text-eyebrow font-medium uppercase text-accent-700">Pattern detected</span>
            </div>
            <p className="mt-1.5">{summary}</p>
          </div>
        )}
        {error && <ErrorState description={error} />}
      </section>

      {/* === Library zone ===
          mt-14 same as Distribution and Exploration so the eye learns one
          rhythm across the whole product: Compose at the top, big break,
          Library below. */}
      <div className="mt-14 flex flex-col gap-6">
        {issues && issues.length > 0 && (
          <section className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <span className="type-eyebrow text-ink-400">Issues</span>
              <span className="h-px flex-1 bg-ink-200/70" />
              <span className="font-mono text-[10.5px] text-ink-400">
                {filtered.length}/{issues.length}
              </span>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <select
                  className="input sm:!w-[200px] transition-colors duration-150 ease-editorial hover:border-ink-300"
                  value={filterPostId}
                  onChange={(e) => setFilterPostId(e.target.value)}
                  disabled={busy !== null}
                >
                  <option value="all">All posts</option>
                  {posts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
                <select
                  className="input sm:!w-[160px] transition-colors duration-150 ease-editorial hover:border-ink-300"
                  value={filterSeverity}
                  onChange={(e) => setFilterSeverity(e.target.value as typeof filterSeverity)}
                  disabled={busy !== null}
                >
                  <option value="all">All severities</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <button
                type="button"
                onClick={clearAudit}
                disabled={disabled || busy !== null}
                className="btn-secondary self-start hover:border-critical-200 hover:bg-critical-100/35 hover:text-critical-700 sm:self-auto"
              >
                {busy === "clear" ? "Clearing..." : "Clear audit"}
              </button>
            </div>
          </section>
        )}

        {busy === "load" && <LoadingState label="Loading your notes..." />}

        {issues && issues.length === 0 && !busy && (
          <EmptyState
            eyebrow="No audits yet"
            title="Even the best drafts have stragglers."
            description={
              <>
                We'll surface recurring grammar and style patterns across your library.
                <br />
                Once results land, you can filter them by post or severity.
              </>
            }
          />
        )}

        {filtered.length > 0 && (
          <div className="grid gap-4">
            {filtered.map((issue) => (
              <GrammarIssueCard key={issue.id} issue={issue} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
