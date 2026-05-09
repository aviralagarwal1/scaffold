"use client";

import { useState } from "react";
import type { IdeasResponse } from "@/types/ai";
import { api, ApiClientError } from "@/lib/client/api";
import { IdeaCard } from "./IdeaCard";
import { EmptyState, LoadingState } from "./states";

export function IdeasPanel({ token, disabled }: { token: string; disabled?: boolean }) {
  const [focus, setFocus] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<IdeasResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await api.ideas(token, focus.trim() ? { focus: focus.trim() } : undefined);
      setResult(res);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Couldn't generate ideas.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Compose row */}
      <section className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={focus}
            onChange={(e) => setFocus(e.target.value)}
            placeholder="Optional focus, e.g. 'agents' or 'memoir essays'"
            className="input transition-colors duration-150 ease-editorial hover:border-ink-300 sm:flex-1"
            disabled={disabled || busy}
          />
          <button
            onClick={generate}
            className="btn-primary group gap-1.5 sm:px-5"
            disabled={disabled || busy}
          >
            {busy ? (
              <>
                <span className="relative inline-flex h-2 w-2 shrink-0" aria-hidden="true">
                  <span className="absolute inline-flex h-full w-full animate-editorial-pulse rounded-full bg-ink-50/50" />
                  <span className="relative inline-flex h-2 w-2 animate-editorial-pulse rounded-full bg-ink-50" />
                </span>
                <span>Pulling threads</span>
              </>
            ) : (
              <>
                <span>{result ? "Refresh ideas" : "Generate ideas"}</span>
                <span aria-hidden="true" className="btn-ask-arrow">→</span>
              </>
            )}
          </button>
        </div>
        {error && (
          <div className="rounded-md border border-critical-100 bg-critical-100/40 px-3 py-2 text-[13px] text-critical-700">
            {error}
          </div>
        )}
      </section>

      {!result && !busy && (
        <EmptyState
          eyebrow="Awaiting prompts"
          title="No ideas generated yet."
          description="Generate a fresh batch of ideas grounded in your past work. Add an optional focus area to steer toward a topic."
        />
      )}

      {busy && (
        <div className="panel p-5">
          <LoadingState label="Reading your archive for ideas" />
        </div>
      )}

      {result &&
        result.sections.map((section, sectionIdx) => (
          <section key={section.name} className="animate-rise flex flex-col gap-3" style={{ animationDelay: `${sectionIdx * 80}ms` }}>
            <div className="flex items-center gap-3">
              <span className="type-eyebrow text-ink-400">{section.name}</span>
              <span className="h-px flex-1 bg-ink-200/60" />
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {section.ideas.map((idea, i) => (
                <IdeaCard key={`${section.name}-${i}`} idea={idea} />
              ))}
            </div>
          </section>
        ))}
    </div>
  );
}
