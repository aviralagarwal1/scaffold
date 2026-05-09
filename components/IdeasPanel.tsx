"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { IdeasResponse } from "@/types/ai";
import { api, ApiClientError } from "@/lib/client/api";
import { cn } from "@/lib/client/cn";
import { IdeaCard } from "./IdeaCard";
import { LoadingState } from "./states";

// Six curated lenses for the null state. Each one is a different angle the AI
// can take on the writer's archive. Clicking a chip pre-fills the focus input
// AND fires generate immediately — same one-tap pattern as the Conversation
// panel's curated prompts.
const IDEA_LENSES = [
  { id: "sequels", label: "Sequels", focus: "natural sequels to my recent posts" },
  { id: "contrarian", label: "Contrarian", focus: "contrarian angles that argue against my past takes" },
  { id: "themes", label: "Underexplored themes", focus: "underexplored themes hinted at in my archive" },
  { id: "revisit", label: "Revisit", focus: "older posts worth revisiting with new framing" },
  { id: "personal", label: "Personal", focus: "personal essay angles drawn from patterns in my voice" },
  { id: "timely", label: "Timely", focus: "timely extensions of arguments already in my work" },
] as const;

export function IdeasPanel({ token, disabled }: { token: string; disabled?: boolean }) {
  const [focus, setFocus] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<IdeasResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeLens, setActiveLens] = useState<string | null>(null);
  const ref = useRef<HTMLTextAreaElement>(null);

  // Auto-expand the textarea so it grows with the writer's focus, capped so
  // the result zone below stays in view. Same recipe as the chat composer.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [focus]);

  // Autofocus on mount — matches Feedback. The native cursor + focus ring
  // both appear immediately, and typing routes in naturally (no global
  // keystroke capture needed). Same pattern Feedback uses.
  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
  }, []);

  const generate = async (focusOverride?: string) => {
    if (busy) return;
    const focusValue = (focusOverride ?? focus).trim();
    setBusy(true);
    setError(null);
    try {
      const res = await api.ideas(token, focusValue ? { focus: focusValue } : undefined);
      setResult(res);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Couldn't generate ideas.");
    } finally {
      setBusy(false);
    }
  };

  const onLens = (lens: (typeof IDEA_LENSES)[number]) => {
    if (disabled || busy) return;
    setActiveLens(lens.id);
    setFocus(lens.focus);
    void generate(lens.focus);
  };

  return (
    <div className="flex flex-col">
      {/* === Compose zone ===
          Multi-line writing surface (italic placeholder + "..." per design
          theory). Enter submits, Shift+Enter inserts a newline — chat
          convention. Button sits flush right below the textarea so the act
          of writing and the act of submitting feel connected, not detached. */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void generate();
        }}
        className="flex flex-col gap-3"
      >
        <textarea
          ref={ref}
          value={focus}
          onChange={(e) => setFocus(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void generate();
            }
          }}
          placeholder="Optional focus, e.g. 'agents I haven't written about yet' or 'memoir essays drawing on my early career'..."
          rows={1}
          disabled={disabled || busy}
          className="input block max-h-[240px] min-h-[100px] resize-none overflow-y-auto font-serif text-[15.5px] leading-relaxed text-ink-900 placeholder:font-serif placeholder:italic placeholder:text-ink-400 transition-colors duration-200 ease-editorial hover:border-ink-300"
        />
        <div className="flex items-center justify-end pt-1">
          <button
            type="submit"
            className="btn-primary group gap-1.5"
            disabled={disabled || busy}
          >
            {busy ? (
              <>
                <span className="relative inline-flex h-2 w-2 shrink-0" aria-hidden="true">
                  <span className="absolute inline-flex h-full w-full animate-editorial-pulse rounded-full bg-ink-50/50" />
                  <span className="relative inline-flex h-2 w-2 animate-editorial-pulse rounded-full bg-ink-50" />
                </span>
                <span>Pulling threads...</span>
              </>
            ) : (
              <>
                <span>{result ? "Refresh ideas" : "Explore ideas"}</span>
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

      {/* === Result zone === */}
      <div className="mt-14 flex flex-col gap-8">
        {!result && !busy && (
          <LensPanel
            disabled={disabled}
            activeLens={activeLens}
            onLens={onLens}
          />
        )}

        {busy && (
          <div className="panel p-5">
            <LoadingState label="Reading your archive for ideas..." />
          </div>
        )}

        {result &&
          result.sections.map((section, sectionIdx) => (
            <section
              key={section.name}
              className="animate-rise flex flex-col gap-4"
              style={{ animationDelay: `${sectionIdx * 80}ms` }}
            >
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
    </div>
  );
}

/**
 * Null-state lens panel. Same chrome as Feedback's FocusPanel — accent
 * gradient hairline up top, header strip with eyebrow, body intro, then
 * chips. Clicking a lens chip is a one-tap commit: it pre-fills the focus
 * input and fires generation in one move.
 */
function LensPanel({
  disabled,
  activeLens,
  onLens,
}: {
  disabled?: boolean;
  activeLens: string | null;
  onLens: (lens: (typeof IDEA_LENSES)[number]) => void;
}) {
  return (
    <article className="relative flex flex-col overflow-hidden rounded-md border border-ink-200/80 bg-white shadow-soft">
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-accent-200/0 via-accent-300 to-accent-200/0"
      />
      <header className="flex items-center justify-between gap-3 border-b border-ink-200/60 bg-ink-50/40 px-5 py-2.5">
        <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-accent-700">
          Idea lenses
        </span>
        <span className="font-mono text-[10.5px] text-ink-500">{IDEA_LENSES.length} lenses</span>
      </header>
      <div className="flex flex-col gap-5 p-6">
        <div>
          <h3 className="type-h3">Pick a lens to start.</h3>
          <p className="mt-1.5 text-[14px] text-ink-500">
            Each lens explores your archive a different way. Or type your own focus above.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {IDEA_LENSES.map((lens) => {
            const selected = activeLens === lens.id;
            return (
              <button
                key={lens.id}
                type="button"
                onClick={() => onLens(lens)}
                disabled={disabled}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-[13px] transition-all duration-200 ease-editorial",
                  selected
                    ? "border-accent-300 bg-accent-50 text-accent-800 shadow-[0_0_0_3px_rgba(232,194,164,0.18)]"
                    : "border-ink-200 bg-white text-ink-700 hover:-translate-y-px hover:border-accent-300 hover:bg-accent-50/50 hover:text-ink-900",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                )}
              >
                {lens.label}
              </button>
            );
          })}
        </div>
      </div>
    </article>
  );
}
