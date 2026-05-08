"use client";

import { useLayoutEffect, useRef, useState } from "react";
import type { DraftFeedbackResponse } from "@/types/ai";
import { api, ApiClientError } from "@/lib/client/api";
import { cn } from "@/lib/client/cn";
import { Markdown } from "./Markdown";
import { SourceCitationList } from "./SourceCitation";
import { LoadingState } from "./states";

// Core dimensions stay first. Additional rows move from larger editorial
// mechanics toward more granular line/argument controls.
// Ids match the keys the backend's FOCUS_GUIDANCE table expects.
const FOCUS_DIMENSIONS = [
  { id: "hook", label: "Hook" },
  { id: "structure", label: "Structure" },
  { id: "ending", label: "Ending" },
  { id: "voice", label: "Voice" },
  { id: "clarity", label: "Clarity" },
  { id: "originality", label: "Originality" },
  { id: "argument", label: "Argument" },
  { id: "insight", label: "Insight" },
  { id: "evidence", label: "Evidence" },
  { id: "nuance", label: "Nuance" },
  { id: "framing", label: "Framing" },
  { id: "stakes", label: "Stakes" },
  { id: "narrative", label: "Narrative" },
  { id: "tension", label: "Tension" },
  { id: "pacing", label: "Pacing" },
  { id: "transitions", label: "Transitions" },
  { id: "rhythm", label: "Rhythm" },
  { id: "specificity", label: "Specificity" },
  { id: "cohesion", label: "Cohesion" },
  { id: "compression", label: "Compression" },
] as const;

const CORE_FOCUS_COUNT = 6;
const FOCUS_REVEAL_STEPS = [CORE_FOCUS_COUNT, 11, FOCUS_DIMENSIONS.length] as const;
const CORE_FOCUS_IDS = FOCUS_DIMENSIONS.slice(0, CORE_FOCUS_COUNT).map((dimension) => dimension.id);

export function DraftFeedbackPanel({ token, disabled }: { token: string; disabled?: boolean }) {
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<DraftFeedbackResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [focus, setFocus] = useState<string[]>([]);
  const [focusAlerting, setFocusAlerting] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  const wordCount = draft.trim() ? draft.trim().split(/\s+/).length : 0;
  const canReview = !disabled && !busy && draft.trim().length > 0;

  const toggleFocus = (id: string) => {
    setFocus((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const resetFocusExtras = () => {
    setFocus((prev) => prev.filter((id) => CORE_FOCUS_IDS.includes(id as (typeof CORE_FOCUS_IDS)[number])));
  };

  const clearFocus = () => {
    setFocus([]);
  };

  const triggerFocusAlert = () => {
    setFocusAlerting(false);
    requestAnimationFrame(() => {
      setFocusAlerting(true);
      window.setTimeout(() => setFocusAlerting(false), 450);
    });
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
    if (!canReview) return;
    if (focus.length === 0) {
      triggerFocusAlert();
      return;
    }
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
          <div className="flex items-center gap-2 type-meta">
            <span>{wordCount.toLocaleString()} words</span>
            {draft.trim().length > 0 && !busy && (
              <>
                <span aria-hidden="true" className="text-ink-300">
                  ·
                </span>
                <button
                  type="button"
                  onClick={clearDraft}
                  className="transition-colors hover:text-ink-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-300"
                >
                  Clear draft
                </button>
              </>
            )}
          </div>
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
        <div className="flex items-center justify-end gap-3 pt-1">
          <button
            type="submit"
            className="btn-primary group gap-1.5"
            disabled={!canReview}
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
          <FocusPanel
            focus={focus}
            toggleFocus={toggleFocus}
            clearFocus={clearFocus}
            resetFocusExtras={resetFocusExtras}
            alerting={focusAlerting}
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

function FocusPanel({
  focus,
  toggleFocus,
  clearFocus,
  resetFocusExtras,
  alerting,
}: {
  focus: string[];
  toggleFocus: (id: string) => void;
  clearFocus: () => void;
  resetFocusExtras: () => void;
  alerting: boolean;
}) {
  const [visibleCount, setVisibleCount] = useState(CORE_FOCUS_COUNT);
  const visibleDimensions = FOCUS_DIMENSIONS.slice(0, visibleCount);
  const hasMore = visibleCount < FOCUS_DIMENSIONS.length;
  const expanded = visibleCount > CORE_FOCUS_COUNT;
  const showMore = () => {
    setVisibleCount((count) => FOCUS_REVEAL_STEPS.find((step) => step > count) ?? FOCUS_DIMENSIONS.length);
  };
  const resetFocusRows = () => {
    setVisibleCount(CORE_FOCUS_COUNT);
    resetFocusExtras();
  };

  return (
    <article
      className={cn(
        "relative flex flex-col overflow-hidden rounded-md border border-ink-200/80 bg-white shadow-soft",
        alerting && "animate-editorial-nudge border-ink-300",
      )}
    >
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-accent-200/0 via-accent-300 to-accent-200/0"
      />
      <header className="flex items-center justify-between gap-3 border-b border-ink-200/60 bg-ink-50/40 px-5 py-2.5">
        <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-accent-700">
          Editorial focus
        </span>
        <div className="flex items-center gap-3">
          {focus.length > 0 && (
            <button
              type="button"
              onClick={clearFocus}
              className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-400 transition-colors hover:text-ink-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-300"
            >
              Unselect
            </button>
          )}
          {expanded && (
            <button
              type="button"
              onClick={resetFocusRows}
              className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-400 transition-colors hover:text-ink-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-300"
            >
              Reset
            </button>
          )}
          <span className="font-mono text-[10.5px] text-ink-500">
            {focus.length}/{visibleDimensions.length}
          </span>
        </div>
      </header>
      <div className="flex flex-col gap-5 p-6">
        <div>
          <h3 className="type-h3">Choose what to focus on.</h3>
          <p className="mt-1.5 text-[14px] text-ink-500">
            Select as many areas as you want your editor to prioritize.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {visibleDimensions.map((d) => {
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
          {hasMore && (
            <button
              type="button"
              onClick={showMore}
              aria-label="Show more editorial focus options"
              className="inline-flex h-[33px] w-[33px] items-center justify-center rounded-full border border-ink-200 bg-white font-serif text-[21px] leading-none text-accent-700 transition-all duration-200 ease-editorial hover:-translate-y-px hover:border-accent-300 hover:bg-accent-50/50 hover:text-accent-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
            >
              <span aria-hidden="true" className="-translate-y-px">
                +
              </span>
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
