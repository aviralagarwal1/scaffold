"use client";

import { useState } from "react";
import type { DraftFeedbackResponse } from "@/types/ai";
import { api, ApiClientError } from "@/lib/client/api";
import { Markdown } from "./Markdown";
import { SourceCitationList } from "./SourceCitation";
import { EmptyState, LoadingState } from "./states";

export function DraftFeedbackPanel({ token, disabled }: { token: string; disabled?: boolean }) {
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<DraftFeedbackResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const wordCount = draft.trim() ? draft.trim().split(/\s+/).length : 0;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api.draftFeedback(token, { draft });
      setResult(res);
    } catch (err) {
      const msg = err instanceof ApiClientError ? err.message : "We couldn't read this draft. Try again.";
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <label htmlFor="draft" className="type-h3">
            Paste a draft
          </label>
          <span className="type-meta">{wordCount.toLocaleString()} words</span>
        </div>
        <textarea
          id="draft"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={20}
          placeholder="Paste a draft here. Get feedback grounded in your existing voice, structure, and recurring themes."
          disabled={disabled || busy}
          className="input min-h-[440px] resize-y font-serif text-[15.5px] leading-relaxed"
        />
        <div className="flex items-center justify-between">
          <p className="type-meta">We compare against your archive: voice, structure, similarity, repeated arguments.</p>
          <button type="submit" className="btn-primary" disabled={disabled || busy || !draft.trim()}>
            {busy ? "Reading your draft" : "Get editorial feedback"}
          </button>
        </div>
        {error && (
          <div className="rounded-md border border-critical-100 bg-critical-100/40 px-3 py-2 text-[13px] text-critical-700">
            {error}
          </div>
        )}
      </form>

      <div className="flex flex-col gap-4">
        {!result && !busy && (
          <EmptyState
            eyebrow="Editorial feedback"
            title="No feedback yet."
            description="Paste a draft on the left. We'll evaluate hook strength, voice fit, structure, similar previous posts, and suggested edits."
          />
        )}
        {busy && (
          <div className="panel p-5">
            <LoadingState label="Comparing against your archive" />
          </div>
        )}
        {result && (
          <article className="panel-feature flex flex-col gap-5 p-6">
            <div>
              <div className="flex items-center gap-2 type-eyebrow-accent">
                <span className="accent-rule" />
                Editorial read
              </div>
              <div className="mt-3 prose-editorial">
                <Markdown text={result.feedback} />
              </div>
            </div>
            {result.sources?.length > 0 && (
              <div>
                <SourceCitationList sources={result.sources} />
              </div>
            )}
          </article>
        )}
      </div>
    </div>
  );
}
