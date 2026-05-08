"use client";

import { useEffect, useRef, useState } from "react";
import type { AskResponse, SourceCitation } from "@/types/ai";
import { api, ApiClientError } from "@/lib/client/api";
import { Markdown } from "./Markdown";
import { SourceCitationList } from "./SourceCitation";

type Turn =
  | { id: string; role: "user"; content: string }
  | { id: string; role: "assistant"; content: string; sources: SourceCitation[] };

const SUGGESTIONS = [
  "What do I write about most?",
  "What should I write next?",
  "What makes my best posts distinctive?",
  "What ideas am I repeating?",
  "Which older essays should I revisit?",
  "How has my writing changed over time?",
];

export function ChatPanel({ token, disabled }: { token: string; disabled?: boolean }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

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
      const msg = err instanceof ApiClientError ? err.message : "We couldn't reach the AI editor. Try again.";
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex h-full min-h-[60vh] flex-col gap-4">
      <div
        ref={scrollRef}
        className="panel flex-1 overflow-y-auto p-6"
      >
        {turns.length === 0 && !busy ? (
          <div className="flex h-full flex-col items-start gap-5">
            <div>
              <div className="flex items-center gap-2 type-eyebrow">
                <span className="accent-rule" />
                Editor
              </div>
              <div className="mt-2 type-h3">Ask anything about your writing archive.</div>
              <p className="mt-1.5 text-[14px] text-ink-500">
                Try one of these to get started, or ask your own question.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  disabled={disabled || busy}
                  className="rounded-full border border-ink-200 bg-white px-3 py-1.5 text-[13px] text-ink-700 transition-colors duration-150 ease-editorial hover:border-accent-300 hover:bg-accent-50/50 hover:text-ink-900 disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-7">
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
                    Editor
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
                  Editor
                </div>
                <ThinkingDots />
              </div>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-md border border-critical-100 bg-critical-100/40 px-3 py-2 text-[13px] text-critical-700">
          {error}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(draft);
        }}
        className="panel flex items-end gap-2 p-2"
      >
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={disabled ? "Workspace still ingesting." : "Ask your archive anything"}
          disabled={disabled || busy}
          rows={2}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              send(draft);
            }
          }}
          className="min-h-[48px] w-full resize-none border-0 bg-transparent px-2.5 py-2 text-[14px] leading-relaxed text-ink-900 placeholder-ink-400 focus:outline-none"
        />
        <button type="submit" className="btn-primary self-stretch px-5" disabled={disabled || busy || !draft.trim()}>
          Ask
        </button>
      </form>
      <div className="text-[11.5px] text-ink-400">
        Press <kbd className="rounded border border-ink-200 bg-white px-1 font-mono text-[10px]">⌘</kbd>{" "}
        <kbd className="rounded border border-ink-200 bg-white px-1 font-mono text-[10px]">Enter</kbd> to send. Answers
        cite specific posts when relevant.
      </div>
    </div>
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
      <span>Reading the archive</span>
    </div>
  );
}
