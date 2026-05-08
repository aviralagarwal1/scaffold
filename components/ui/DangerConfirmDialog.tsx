"use client";

import type { ReactNode } from "react";
import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/client/cn";

export function DangerConfirmDialog({
  open,
  title,
  description,
  confirmationValue,
  confirmationLabel,
  actionLabel,
  busyLabel = "Deleting...",
  busy = false,
  error,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmationValue: string;
  confirmationLabel?: string;
  actionLabel: string;
  busyLabel?: string;
  busy?: boolean;
  error?: string | null;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const expected = confirmationValue.trim();
  const confirmed = normalizeConfirmationInput(value) === normalizeConfirmationInput(expected);

  useEffect(() => {
    if (!open) {
      setValue("");
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 50);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [busy, onClose, open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/30 px-4 py-6"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="w-full max-w-lg rounded-md border border-critical-100 bg-ink-50 p-5 shadow-lift"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="type-eyebrow text-critical-700">Danger Zone</span>
            <h2 id={titleId} className="mt-2 font-serif text-[24px] leading-tight tracking-tightish text-ink-900">
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-ink-200 bg-white font-mono text-[16px] leading-none text-ink-500 shadow-soft transition-colors duration-150 ease-editorial hover:border-ink-300 hover:text-ink-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            x
          </button>
        </div>

        <div id={descriptionId} className="mt-4 text-[13.5px] leading-relaxed text-ink-600">
          {description}
        </div>

        <label className="mt-5 flex flex-col gap-2">
          <span className="rounded-md border border-ink-200 bg-white px-3 py-2 font-mono text-[12.5px] text-ink-700">
            {expected}
          </span>
          <input
            ref={inputRef}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            disabled={busy}
            className="input"
            placeholder={confirmationLabel ?? "Type the text above to confirm"}
            spellCheck={false}
            autoCapitalize="none"
            autoCorrect="off"
            aria-invalid={value.length > 0 && !confirmed ? true : undefined}
          />
        </label>

        {error && (
          <div className="mt-4 rounded-md border border-critical-100 bg-critical-100/40 px-3 py-2 text-[13px] text-critical-700">
            {error}
          </div>
        )}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="inline-flex h-9 items-center justify-center rounded-md border border-ink-200 bg-white px-4 text-[13px] font-medium text-ink-700 shadow-soft transition-colors duration-150 ease-editorial hover:border-ink-300 hover:bg-ink-75 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              if (!confirmed || busy) return;
              void onConfirm();
            }}
            disabled={!confirmed || busy}
            className={cn(
              "inline-flex h-9 items-center justify-center rounded-md border px-4 text-[13px] font-medium shadow-soft transition-colors duration-150 ease-editorial focus:outline-none focus-visible:ring-2 focus-visible:ring-critical-500/40 disabled:cursor-not-allowed disabled:opacity-50",
              confirmed
                ? "border-critical-500 bg-critical-700 text-white hover:bg-critical-500"
                : "border-critical-100 bg-critical-100/35 text-critical-700",
            )}
          >
            {busy ? busyLabel : actionLabel}
          </button>
        </div>
      </section>
    </div>
  );
}

function normalizeConfirmationInput(value: string): string {
  return value
    .trim()
    .normalize("NFKC")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"');
}
