"use client";

import { useLayoutEffect, useRef, useState } from "react";
import type { DraftFeedbackResponse } from "@/types/ai";
import { api, ApiClientError } from "@/lib/client/api";
import { cn } from "@/lib/client/cn";
import { Markdown } from "./Markdown";
import { SourceCitationList } from "./SourceCitation";
import { LoadingState } from "./states";

// Six MECE editorial dimensions: three positional (where in the piece),
// two stylistic (how the prose reads), one substantive (what it says).
// Ids match the keys the backend's FOCUS_GUIDANCE table expects.
const FOCUS_DIMENSIONS = [
  { id: "hook", label: "Hook" },
  { id: "structure", label: "Structure" },
  { id: "ending", label: "Ending" },
  { id: "voice", label: "Voice" },
  { id: "clarity", label: "Clarity" },
  { id: "originality", label: "Originality" },
] as const;

export function DraftFeedbackPanel({ token, disabled }: { token: string; disabled?: boolean }) {
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<DraftFeedbackResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [focus, setFocus] = useState<string[]>([]);
  const ref = useRef<HTMLTextAreaElement>(null);

  const wordCount = draft.trim() ? draft.trim().split(/\s+/).length : 0;
  const canSubmit = !disabled && !busy && draft.trim().length > 0 && focus.length > 0;

  const toggleFocus = (id: string) => {
    setFocus((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

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
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api.draftFeedback(token, { draft, focus });
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
            disabled={!canSubmit}
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
          <FocusPanel focus={focus} toggleFocus={toggleFocus} />
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

function FocusPanel({
  focus,
  toggleFocus,
}: {
  focus: string[];
  toggleFocus: (id: string) => void;
}) {
  return (
    <article className="relative flex flex-col overflow-hidden rounded-md border border-ink-200/80 bg-white shadow-soft">
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-accent-200/0 via-accent-300 to-accent-200/0"
      />
      <header className="flex items-center justify-between gap-3 border-b border-ink-200/60 bg-ink-50/40 px-5 py-2.5">
        <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-accent-700">
          Editorial focus
        </span>
        <span className="font-mono text-[10.5px] text-ink-500">
          {focus.length}/{FOCUS_DIMENSIONS.length}
        </span>
      </header>
      <div className="flex flex-col gap-5 p-6">
        <div>
          <h3 className="type-h3">Choose what to focus on.</h3>
          <p className="mt-1.5 text-[14px] text-ink-500">
            Select as many areas as you want your editor to prioritize.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {FOCUS_DIMENSIONS.map((d) => {
            const selected = focus.includes(d.id);
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => toggleFocus(d.id)}
                aria-pressed={selected}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-[13px] transition-all duration-200 ease-editorial",
                  selected
                    ? "border-accent-300 bg-accent-50 text-accent-800 shadow-[0_0_0_3px_rgba(232,194,164,0.18)]"
                    : "border-ink-200 bg-white text-ink-700 hover:-translate-y-px hover:border-accent-300 hover:bg-accent-50/50 hover:text-ink-900",
                )}
              >
                {d.label}
              </button>
            );
          })}
        </div>
      </div>
    </article>
  );
}
