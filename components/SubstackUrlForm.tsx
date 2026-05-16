"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { api, ApiClientError } from "@/lib/client/api";
import { cn } from "@/lib/client/cn";

const READING_PHRASES = [
  "Reading your library...",
  "Indexing public posts...",
  "Finding recurring themes...",
  "Preparing your curator...",
  "Mapping your themes...",
  "Organizing your sources...",
] as const;

const SLOW_NOTICES = [
  { startsAt: 20000, lastsFor: 8000, message: "Still reading your library." },
  { startsAt: 45000, lastsFor: 12000, message: "Larger publications can take a few minutes." },
  { startsAt: 90000, lastsFor: 20000, message: "Still working through the public posts." },
  { startsAt: 150000, lastsFor: 30000, message: "This is taking longer than usual. Keep this tab open." },
] as const;

export function SubstackUrlForm({
  autoFocus = false,
  initialUrl = "",
  redirect = true,
  captureGlobalKeystrokes = false,
  routeToRegister = false,
  authenticatedFallback,
}: {
  autoFocus?: boolean;
  initialUrl?: string;
  redirect?: boolean;
  /** Capture printable keystrokes from anywhere on the page and route them
   *  into this input. Used on the landing hero so visitors can just start
   *  typing without clicking. Linear/Raycast-style. */
  captureGlobalKeystrokes?: boolean;
  /** Landing-hook mode. Instead of creating the workspace immediately, hand
   *  the URL off to /register so the visitor creates an account first; the
   *  URL is confirmed later on /publications/new. Used by the landing hero,
   *  where every workspace must be tied to an account. */
  routeToRegister?: boolean;
  /** What to render when the visitor is already signed in. The landing hero
   *  passes a quiet "Open my desk" CTA so a returning user isn't asked to
   *  paste a URL we already know how to find. */
  authenticatedFallback?: ReactNode;
}) {
  const router = useRouter();
  // Session-aware: routeToRegister is the visitor-mode hook. If the user is
  // already signed in, the caller can replace this form with a desk CTA.
  const { status } = useSession();
  const isAuthenticated = status === "authenticated";
  const [url, setUrl] = useState(initialUrl);
  const [focused, setFocused] = useState(false);
  const [busy, setBusy] = useState(false);
  const [readingPhraseIndex, setReadingPhraseIndex] = useState(0);
  const [slowNoticeIndex, setSlowNoticeIndex] = useState<number | null>(null);
  const [alerting, setAlerting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // The placeholder cue shows when the input is unfocused and empty. The
  // caret sits on the LEFT (where typing actually begins) with the ghost
  // text trailing — visual position now matches the real cursor's reality.
  const showCue = url.length === 0 && !focused;

  useEffect(() => {
    setUrl(initialUrl);
  }, [initialUrl]);

  useEffect(() => {
    if (!autoFocus || !initialUrl) return;
    const id = window.setTimeout(() => {
      const input = inputRef.current;
      if (!input) return;
      input.focus({ preventScroll: true });
      input.setSelectionRange(input.value.length, input.value.length);
    }, 0);
    return () => window.clearTimeout(id);
  }, [autoFocus, initialUrl]);

  useEffect(() => {
    if (!busy) {
      setReadingPhraseIndex(0);
      return;
    }
    const id = window.setInterval(
      () => setReadingPhraseIndex((index) => (index + 1) % READING_PHRASES.length),
      2800,
    );
    return () => window.clearInterval(id);
  }, [busy]);

  useEffect(() => {
    if (!busy) {
      setSlowNoticeIndex(null);
      return;
    }
    const timers: number[] = [];
    SLOW_NOTICES.forEach((notice, index) => {
      timers.push(window.setTimeout(() => setSlowNoticeIndex(index), notice.startsAt));
      timers.push(
        window.setTimeout(() => {
          setSlowNoticeIndex((current) => (current === index ? null : current));
        }, notice.startsAt + notice.lastsFor),
      );
    });
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [busy]);

  // Type-anywhere capture: when enabled, any printable keystroke on the page
  // (when not already inside a different input) gets routed into this field
  // and the input gains focus. The placeholder cue stays visible until the
  // first keystroke, then hands off to the native caret.
  useEffect(() => {
    if (!captureGlobalKeystrokes) return;

    const isTypeableTarget = (target: EventTarget | null): boolean => {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
      if (target.isContentEditable) return true;
      return false;
    };

    const onKeydown = (e: KeyboardEvent) => {
      if (busy) return;
      if (isTypeableTarget(e.target)) return;
      // Let modifier shortcuts (Cmd+R, Ctrl+F, etc.) pass through.
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      // Only capture single printable characters. Skip space (URLs don't
      // contain it, and spacebar normally scrolls the page).
      if (e.key.length !== 1 || e.key === " ") return;

      e.preventDefault();
      setUrl((prev) => prev + e.key);
      inputRef.current?.focus();
    };

    const onPaste = (e: ClipboardEvent) => {
      if (busy) return;
      if (isTypeableTarget(e.target)) return;
      const pasted = e.clipboardData?.getData("text") ?? "";
      if (!pasted) return;

      e.preventDefault();
      const cleaned = pasted.trim();
      setUrl((prev) => (prev ? prev + cleaned : cleaned));
      inputRef.current?.focus();
    };

    window.addEventListener("keydown", onKeydown);
    window.addEventListener("paste", onPaste);
    return () => {
      window.removeEventListener("keydown", onKeydown);
      window.removeEventListener("paste", onPaste);
    };
  }, [busy, captureGlobalKeystrokes]);

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
    const trimmed = url.trim();
    if (!trimmed) {
      triggerAlert();
      return;
    }
    setError(null);
    setBusy(true);

    // Landing-hook flow for visitors only. Logged-in users on the landing
    // page get the direct create-and-route path so they aren't bounced
    // through /register just to fill in a URL we already have.
    if (routeToRegister && !isAuthenticated) {
      router.push(`/register?publicationUrl=${encodeURIComponent(trimmed)}`);
      return;
    }

    try {
      const res = await api.createWorkspace({ publicationUrl: trimmed });
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

  // If the caller passed an authenticated fallback and the visitor is signed
  // in, hand off entirely. The landing hero uses this so we never show a
  // returning user the "paste your URL" composer they don't need.
  if (authenticatedFallback && isAuthenticated) {
    return <>{authenticatedFallback}</>;
  }

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
          aria-label="Publication URL"
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
          <span className="inline-block h-[17px] w-[1.5px] translate-y-[1px] bg-ink-900 animate-editorial-caret" />
          <span>yourname.substack.com</span>
        </div>
      </div>

      <div className="flex items-center justify-end gap-4">
        <button
          type="submit"
          className="btn-primary btn-primary-lg group relative px-6"
          disabled={busy}
        >
          <span className="relative inline-flex items-center gap-2">
            {busy ? (
              <>
                <span className="relative inline-flex h-2 w-2 shrink-0" aria-hidden="true">
                  <span className="absolute inline-flex h-full w-full animate-editorial-pulse rounded-full bg-ink-50/50" />
                  <span className="relative inline-flex h-2 w-2 animate-editorial-pulse rounded-full bg-ink-50" />
                </span>
                <span className="font-serif italic">{READING_PHRASES[readingPhraseIndex]}</span>
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

      {slowNoticeIndex !== null && (
        <p className="-mt-2 text-right text-[12.5px] leading-relaxed text-ink-500" role="status" aria-live="polite">
          {SLOW_NOTICES[slowNoticeIndex].message}
        </p>
      )}

      {/* Real API errors only. Empty-input validation is handled by the
          nudge above — no red-text shaming for forgetting to type. */}
      {error && <div className="text-right text-[13px] text-critical-700">{error}</div>}
    </form>
  );
}
