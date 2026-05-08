"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { api, ApiClientError } from "@/lib/client/api";
import { cn } from "@/lib/client/cn";

export function SubstackUrlForm({
  autoFocus = false,
  redirect = true,
}: {
  autoFocus?: boolean;
  redirect?: boolean;
}) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [focused, setFocused] = useState(false);
  const [busy, setBusy] = useState(false);
  const [alerting, setAlerting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // The placeholder cue shows when the input is unfocused and empty. The
  // caret sits on the LEFT (where typing actually begins) with the ghost
  // text trailing — visual position now matches the real cursor's reality.
  const showCue = url.length === 0 && !focused;

  const triggerAlert = () => {
    // Reset, then re-trigger on the next frame so the animation replays
    // even when fired in rapid succession.
    setAlerting(false);
    requestAnimationFrame(() => {
      setAlerting(true);
      window.setTimeout(() => setAlerting(false), 450);
    });
    inputRef.current?.focus();
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      triggerAlert();
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const res = await api.createWorkspace({ publicationUrl: url.trim() });
      if (redirect) {
        router.push(res.workspaceUrl);
      }
    } catch (err) {
      const msg =
        err instanceof ApiClientError
          ? err.message
          : "We couldn't reach the server. Try again in a moment.";
      setError(msg);
      setBusy(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      {/* Writing surface. The wrapper carries the nudge animation; the input
          carries the soft border darken during alert. Both decay back after
          ~450ms. */}
      <div
        className={cn(
          "writing-surface relative",
          alerting && "animate-editorial-nudge",
        )}
      >
        <input
          ref={inputRef}
          type="text"
          autoFocus={autoFocus}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder=" "
          className={cn(
            "input-writing transition-[border-color,background-color] duration-300 ease-editorial",
            alerting && "!border-ink-400",
          )}
          disabled={busy}
          aria-label="Substack URL"
          aria-invalid={alerting || undefined}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
        />

        {/* Caret on the LEFT, ghost text trailing right. The caret sits where
            the user's real cursor will appear — so what you see is what you
            type. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-5 flex items-center font-serif text-[17px] italic text-ink-400 transition-opacity duration-200 ease-editorial"
          style={{ opacity: showCue ? 1 : 0 }}
        >
          <span className="inline-block h-[19px] w-[1.5px] -translate-y-[1px] bg-accent-500 animate-editorial-caret" />
          <span className="ml-[3px]">yourname.substack.com</span>
        </div>
      </div>

      {/* Asymmetric action row. The kbd cue surfaces only after the user has
          started typing, signaling the keyboard shortcut at the moment it
          becomes useful. */}
      <div className="flex items-center justify-end gap-4">
        {!busy && url.length > 0 && (
          <span className="hidden items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.16em] text-ink-400 sm:inline-flex">
            <kbd className="kbd">↵</kbd>
            <span>to begin</span>
          </span>
        )}
        <button
          type="submit"
          className="btn-primary btn-primary-lg group relative px-6"
          disabled={busy}
        >
          <span className="relative inline-flex items-center gap-2">
            {busy ? (
              <>
                <span
                  aria-hidden="true"
                  className="inline-block h-1.5 w-1.5 animate-editorial-pulse rounded-full bg-ink-50"
                />
                <span>Reading your archive</span>
              </>
            ) : (
              <>
                <span>Build my workspace</span>
                <span
                  aria-hidden="true"
                  className="text-ink-300 transition-transform duration-200 ease-editorial group-hover:translate-x-0.5 group-hover:text-ink-50"
                >
                  →
                </span>
              </>
            )}
          </span>
        </button>
      </div>

      {/* Real API errors only. Empty-input validation is handled by the
          nudge above — no red-text shaming for forgetting to type. */}
      {error && <div className="text-right text-[13px] text-critical-700">{error}</div>}
    </form>
  );
}
