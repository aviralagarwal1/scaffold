"use client";

import { useState } from "react";

/**
 * Horizontal strip of saved items above a tool: previous conversations,
 * previous drafts. Conversation and draft history were separate components
 * with the same markup, the same active-border rule, and the same
 * copy-pasted delete button.
 *
 * Items are generic so each tool keeps its own label and subtitle.
 */
export interface SavedHistoryItem {
  id: string;
  title: string;
  /** Optional second line, e.g. the date a draft was saved. */
  subtitle?: string;
}

export function SavedHistoryStrip({
  label,
  items,
  loading,
  activeId,
  disabled,
  removeLabel,
  onOpen,
  onRemove,
}: {
  label: string;
  items: SavedHistoryItem[];
  loading: boolean;
  activeId: string | null;
  disabled?: boolean;
  /** Accessible name for the remove control, e.g. "Remove conversation". */
  removeLabel: string;
  onOpen: (id: string) => void;
  onRemove: (id: string) => Promise<void>;
}) {
  const [removingId, setRemovingId] = useState<string | null>(null);
  if (loading || items.length === 0) return null;

  return (
    <section className="panel flex flex-col gap-3 p-4">
      <span className="type-eyebrow text-ink-400">{label}</span>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {items.map((item) => {
          const active = item.id === activeId;
          return (
            <div
              key={item.id}
              className={`inline-flex max-w-[360px] shrink-0 items-center gap-2.5 rounded-md border px-3 py-2.5 ${
                active ? "border-accent-300 bg-accent-50/40" : "border-ink-200 bg-white"
              }`}
            >
              <button
                type="button"
                onClick={() => onOpen(item.id)}
                disabled={disabled}
                className="min-w-0 text-left text-[13px] leading-snug text-ink-700 transition-colors hover:text-ink-950 disabled:cursor-not-allowed disabled:opacity-60"
                title={item.title}
              >
                <span className="block truncate">{item.title}</span>
                {item.subtitle && (
                  <span className="mt-0.5 block font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-400">
                    {item.subtitle}
                  </span>
                )}
              </button>
              <button
                type="button"
                aria-label={removeLabel}
                disabled={disabled || removingId === item.id}
                onClick={async () => {
                  setRemovingId(item.id);
                  try {
                    await onRemove(item.id);
                  } finally {
                    setRemovingId(null);
                  }
                }}
                className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[17px] leading-none text-ink-300 transition-colors duration-150 ease-editorial hover:bg-critical-100/45 hover:text-critical-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-critical-500/35 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
