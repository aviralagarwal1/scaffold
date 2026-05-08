"use client";

import { useLayoutEffect, useRef, useState } from "react";
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
  const ref = useRef<HTMLTextAreaElement>(null);

  const wordCount = draft.trim() ? draft.trim().split(/\s+/).length : 0;

  // Auto-expand the textarea so it grows with the draft. CSS min-h sets the
  // floor (substantial enough to invite a real essay), max-h caps it at a
  // page-friendly height — past that the field scrolls internally.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [draft]);

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

  const clearDraft = () => {
    setDraft("");
    setError(null);
    ref.current?.focus();
  };

  const clearResult = () => {
    setResult(null);
    setError(null);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <label htmlFor="draft" className="type-h3">
            Paste your draft
          </label>
          <span className="type-meta">{wordCount.toLocaleString()} words</span>
        </div>
        <textarea
          ref={ref}
          id="draft"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Paste your draft to begin ..."
          disabled={disabled || busy}
          className="input block max-h-[680px] min-h-[320px] resize-none overflow-y-auto font-serif text-[15.5px] leading-relaxed transition-colors duration-200 ease-editorial hover:border-ink-300"
        />
        <div className="flex items-center justify-between gap-3 pt-1">
          {draft.trim().length > 0 && !busy ? (
            <button
              type="button"
              onClick={clearDraft}
              className="text-[12.5px] text-ink-400 transition-colors hover:text-ink-700"
            >
              Clear draft
            </button>
          ) : (
            <span aria-hidden="true" />
          )}
          <button
            type="submit"
            className="btn-primary group gap-1.5"
            disabled={disabled || busy || !draft.trim()}
          >
            {busy ? (
              <>
                <span aria-hidden="true" className="inline-block h-1.5 w-1.5 animate-editorial-pulse rounded-full bg-ink-50" />
                <span>Reading your draft</span>
              </>
            ) : (
              <>
                <span>Review draft</span>
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
          <article className="panel-feature animate-rise flex flex-col gap-5 p-6">
            <div>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 type-eyebrow-accent">
                  <span className="accent-rule" />
                  Editorial read
                </div>
                <button
                  type="button"
                  onClick={clearResult}
                  className="text-[12.5px] text-ink-400 transition-colors hover:text-ink-700"
                >
                  Clear read
                </button>
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
