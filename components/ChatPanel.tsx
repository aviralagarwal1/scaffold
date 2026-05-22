"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { AskResponse, SourceCitation } from "@/types/ai";
import { api, ApiClientError } from "@/lib/client/api";
import { Markdown } from "./Markdown";
import { SourceCitationList } from "./SourceCitation";

type Turn =
  | { id: string; role: "user"; content: string }
  | { id: string; role: "assistant"; content: string; sources: SourceCitation[] };

// Foundational prompts — always visible, framed as the steady starting points.
const CURATED_PROMPTS = [
  "What do I write about most?",
  "What should I write next?",
  "What makes my best posts distinctive?",
  "What ideas am I repeating?",
  "Which older essays should I revisit?",
  "How has my writing changed over time?",
];

// Client-side safety net used only if the backend prompt-suggestions endpoint
// is unreachable. Keeps the surface from breaking when the network or model is
// down; real generation runs server-side via api.promptSuggestions.
const FALLBACK_POOL = [
  "Where do my recent posts diverge from my early voice?",
  "What argument keeps surfacing across my pieces without being named?",
  "Which posts feel most like me, and why?",
  "What would a sequel to my best-received essay look like?",
  "Which themes do I keep circling without resolving?",
  "What's a contrarian take I've hinted at but never written?",
  "Which older essays would land differently today?",
  "What's the pattern in how I open my strongest posts?",
  "Where am I underwriting an idea that deserves a longer treatment?",
  "What would surprise a long-time reader of my library?",
  "Which one-liner from my library could anchor a new essay?",
  "What topic does my library suggest I've been quietly avoiding?",
];

const SURFACE_BATCH = 3;

const promptKey = (value: string) =>
  value
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[?.!"'`]+$/g, "")
    .trim();

export function ChatPanel({
  token,
  disabled,
  curatorName = "Curator",
}: {
  token: string;
  disabled?: boolean;
  curatorName?: string;
}) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Surfaced prompts in the order they were returned. Strings, not indices,
  // because the source is now the backend (with a client fallback for offline).
  const [surfaced, setSurfaced] = useState<string[]>([]);
  const [surfacing, setSurfacing] = useState(false);
  const [exhausted, setExhausted] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const canSurfaceMore = !exhausted;

  const surfaceMore = async () => {
    if (surfacing || exhausted) return;
    setSurfacing(true);
    const seen = [...CURATED_PROMPTS, ...surfaced];
    try {
      const res = await api.promptSuggestions(token, { excludePrompts: seen, count: SURFACE_BATCH });
      const seenKeys = new Set(seen.map(promptKey));
      const fresh = res.prompts.filter((p) => {
        const k = promptKey(p);
        if (seenKeys.has(k)) return false;
        seenKeys.add(k);
        return true;
      });
      if (fresh.length === 0) {
        setExhausted(true);
      } else {
        setSurfaced((prev) => [...prev, ...fresh]);
      }
    } catch {
      // Backend unreachable — fall back to client pool so the surface never
      // breaks. The fallback eventually exhausts and the trigger hides itself.
      const seenKeys = new Set(seen.map(promptKey));
      const remaining = FALLBACK_POOL.filter((p) => !seenKeys.has(promptKey(p)));
      if (remaining.length === 0) {
        setExhausted(true);
      } else {
        const shuffled = [...remaining].sort(() => Math.random() - 0.5);
        const next = shuffled.slice(0, Math.min(SURFACE_BATCH, remaining.length));
        setSurfaced((prev) => [...prev, ...next]);
        if (remaining.length <= SURFACE_BATCH) setExhausted(true);
      }
    } finally {
      setSurfacing(false);
    }
  };

  const clearSurfaced = () => {
    setSurfaced([]);
    setExhausted(false);
  };

  const resetThread = () => {
    setTurns([]);
    setDraft("");
    setError(null);
    setSurfaced([]);
    setExhausted(false);
  };

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, busy]);

  const send = async (text: string) => {
    const message = text.trim();
    if (!message || busy) return;
    setError(null);
    const userTurn: Turn = { id: `u-${Date.now()}`, role: "user", content: message };
    setTurns((t) => [...t, userTurn]);
    setDraft("");
    setBusy(true);
    try {
      const res: AskResponse = await api.ask(token, { message });
      setTurns((t) => [
        ...t,
        { id: `a-${Date.now()}`, role: "assistant", content: res.answer, sources: res.sources ?? [] },
      ]);
    } catch (err) {
      const msg = err instanceof ApiClientError ? err.message : "We couldn't reach your curator. Try again.";
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  const empty = turns.length === 0 && !busy;
  const showFooter = canSurfaceMore || surfaced.length > 0;
  // Stagger delays cap at 3 so a batch of 3 reads as a single quiet ripple.
  const staggerDelay = ["animate-delay-1", "animate-delay-2", "animate-delay-3"];

  return (
    <div className={`flex flex-col gap-4 ${empty ? "" : "h-full min-h-[60vh]"}`}>
      {empty ? (
        <div className="panel p-7 sm:p-8">
          <div className="flex flex-col gap-6">
            <div>
              <div className="flex items-center gap-2 type-eyebrow">
                <span className="accent-rule" />
                {curatorName}
              </div>
              <div className="mt-2 type-h3">Ask about anything from your writing history.</div>
              <p className="mt-1.5 text-[14px] text-ink-500">
                Try one of these to get started, or ask your own question.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {CURATED_PROMPTS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  disabled={disabled || busy}
                  className="rounded-full border border-ink-200 bg-white px-3 py-1.5 text-[13px] text-ink-700 transition-colors duration-150 ease-editorial hover:border-accent-300 hover:bg-accent-50/50 hover:text-ink-900 disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
              {surfaced.map((prompt, i) => (
                <button
                  key={`gen-${promptKey(prompt)}`}
                  onClick={() => send(prompt)}
                  disabled={disabled || busy}
                  className={`animate-rise ${staggerDelay[i % SURFACE_BATCH]} rounded-full border border-ink-200/60 bg-ink-50/60 px-3 py-1.5 text-[13px] text-ink-600 transition-colors duration-150 ease-editorial hover:border-accent-300 hover:bg-accent-50/50 hover:text-ink-900 disabled:opacity-50`}
                >
                  {prompt}
                </button>
              ))}
            </div>

            {showFooter && (
              <div className="flex items-center justify-between gap-3 border-t border-ink-200/40 pt-4">
                {canSurfaceMore ? (
                  <button
                    type="button"
                    onClick={surfaceMore}
                    disabled={disabled || busy || surfacing}
                    className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-700 transition-colors hover:text-accent-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {surfacing ? (
                      <>
                        <span className="relative inline-flex h-2 w-2 shrink-0" aria-hidden="true">
                          <span className="absolute inline-flex h-full w-full animate-editorial-pulse rounded-full bg-accent-400/50" />
                          <span className="relative inline-flex h-2 w-2 animate-editorial-pulse rounded-full bg-accent-400" />
                        </span>
                        Reading your library
                      </>
                    ) : (
                      <>
                        <span aria-hidden="true" className="text-accent-600">+</span>
                        Surface more directions
                      </>
                    )}
                  </button>
                ) : (
                  <span className="text-[12.5px] text-ink-400">No more directions to surface.</span>
                )}
                {surfaced.length > 0 && (
                  <button
                    type="button"
                    onClick={clearSurfaced}
                    disabled={surfacing}
                    className="text-[12.5px] text-ink-400 transition-colors hover:text-ink-700 disabled:opacity-50"
                  >
                    Clear
                  </button>
                )}
              </div>
            )}

            <div className="border-t border-ink-200/40 pt-5">
              <Composer
                draft={draft}
                setDraft={setDraft}
                onSubmit={() => send(draft)}
                disabled={disabled}
                busy={busy}
              />
            </div>
          </div>
        </div>
      ) : (
        <section className="panel flex max-h-[640px] min-h-[400px] flex-col overflow-hidden">
          <header className="flex items-center justify-between gap-3 border-b border-ink-200/60 bg-ink-50/30 px-6 py-2.5">
            <span className="type-eyebrow text-ink-400">Conversation</span>
            <button
              type="button"
              onClick={resetThread}
              disabled={busy}
              className="text-[12.5px] text-ink-400 transition-colors hover:text-ink-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Reset
            </button>
          </header>
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 pb-8 pt-6">
            <div className="flex flex-col gap-8">
              {turns.map((turn) =>
                turn.role === "user" ? (
                  <div key={turn.id} className="flex justify-end">
                    <div className="max-w-prose rounded-2xl rounded-tr-md bg-ink-900 px-4 py-2.5 text-[14px] leading-relaxed text-ink-50 shadow-soft">
                      {turn.content}
                    </div>
                  </div>
                ) : (
                  <div key={turn.id} className="flex flex-col gap-3">
                    <div className="flex items-center gap-2 type-eyebrow">
                      <span className="accent-rule" />
                      {curatorName}
                    </div>
                    <div className="prose-editorial">
                      <Markdown text={turn.content} />
                    </div>
                    {turn.sources.length > 0 && <SourceCitationList sources={turn.sources} />}
                  </div>
                ),
              )}
              {busy && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 type-eyebrow">
                    <span className="accent-rule" />
                    {curatorName}
                  </div>
                  <ThinkingDots />
                </div>
              )}
              {!busy && (
                <BubbleComposer
                  draft={draft}
                  setDraft={setDraft}
                  onSubmit={() => send(draft)}
                />
              )}
            </div>
          </div>
        </section>
      )}

      {error && (
        <div className="rounded-md border border-critical-100 bg-critical-100/40 px-3 py-2 text-[13px] text-critical-700">
          {error}
        </div>
      )}
    </div>
  );
}

function Composer({
  draft,
  setDraft,
  onSubmit,
  disabled,
  busy,
}: {
  draft: string;
  setDraft: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  busy: boolean;
}) {
  const ghostText = disabled ? "Library still syncing" : "Start exploring your writing...";
  const ref = useRef<HTMLTextAreaElement>(null);
  const canSend = !disabled && !busy && draft.trim().length > 0;

  // Auto-expand the textarea to fit content. CSS max-h-[160px] + overflow-y-auto
  // caps the visible height — past that, the field scrolls internally.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [draft]);

  // Autofocus on mount so the writer can start typing immediately on landing.
  // The native placeholder stays visible until the first keystroke, so the
  // affordance "Start exploring your writing..." is still legible while
  // focused — no custom caret overlay needed.
  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
  }, []);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (canSend) onSubmit();
      }}
      className="flex items-end gap-3"
    >
      <textarea
        ref={ref}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={ghostText}
        disabled={disabled || busy}
        rows={1}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (canSend) onSubmit();
          }
        }}
        aria-label={ghostText}
        className="block max-h-[160px] w-full flex-1 resize-none overflow-y-auto border-0 bg-transparent px-1 py-1.5 font-serif text-[15px] leading-relaxed text-ink-900 placeholder:font-serif placeholder:text-ink-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
      />
      <button
        type="submit"
        className="btn-primary group shrink-0 gap-1.5 self-end"
        disabled={!canSend}
      >
        <span>Send</span>
        <span aria-hidden="true" className="btn-ask-arrow">→</span>
      </button>
    </form>
  );
}

function BubbleComposer({
  draft,
  setDraft,
  onSubmit,
}: {
  draft: string;
  setDraft: (value: string) => void;
  onSubmit: () => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  // Auto-resize the textarea to fit its content. Bubble grows with the writer.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [draft]);

  // Autofocus on mount — chat convention. The writer can read the response
  // and start typing whenever they're ready, no click required. The native
  // text caret carries the invitation; no custom overlay needed.
  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
  }, []);

  const canSend = draft.trim().length > 0;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (canSend) onSubmit();
      }}
      className="flex animate-rise animate-delay-2 justify-end pt-1"
    >
      <div className="relative w-full max-w-prose rounded-2xl rounded-tr-md bg-ink-900 shadow-soft transition-all duration-200 ease-editorial hover:bg-ink-800 hover:shadow-lift focus-within:bg-ink-800 focus-within:shadow-lift">
        <textarea
          ref={ref}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={1}
          placeholder="Continue your conversation"
          aria-label="Continue your conversation"
          className="block w-full resize-none overflow-hidden border-0 bg-transparent px-4 py-2.5 pr-11 text-[14px] leading-relaxed text-ink-50 caret-ink-50 placeholder:font-serif placeholder:text-ink-50/55 focus:outline-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (canSend) onSubmit();
            }
          }}
        />
        <button
          type="submit"
          aria-label="Send"
          disabled={!canSend}
          className="absolute bottom-1.5 right-1.5 inline-flex h-7 w-7 items-center justify-center rounded-full text-ink-50/60 transition-all duration-200 ease-editorial hover:bg-ink-50/10 hover:text-ink-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-300 disabled:pointer-events-none disabled:opacity-0"
        >
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </form>
  );
}

function ThinkingDots() {
  return (
    <div className="flex items-center gap-2 text-[13px] text-ink-500" aria-label="Thinking">
      <div className="flex gap-1">
        <span className="h-1.5 w-1.5 animate-editorial-pulse rounded-full bg-accent-400 [animation-delay:0ms]" />
        <span className="h-1.5 w-1.5 animate-editorial-pulse rounded-full bg-accent-400 [animation-delay:180ms]" />
        <span className="h-1.5 w-1.5 animate-editorial-pulse rounded-full bg-accent-400 [animation-delay:360ms]" />
      </div>
      <span>Reading your library...</span>
    </div>
  );
}
