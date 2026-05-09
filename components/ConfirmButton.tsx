"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/client/cn";

/**
 * Two-tap inline confirmation button. First click swaps the label to "Are you
 * sure?"; second click within 4 seconds executes. Cancels on blur or after the
 * timeout. Inline rather than modal so the rhythm of a card stays uninterrupted
 * and the gesture matches the rest of the product's editorial restraint.
 */
export function ConfirmButton({
  onConfirm,
  className,
  label,
  confirmLabel = "Are you sure?",
  busyLabel,
  disabled,
  busy,
}: {
  onConfirm: () => void | Promise<void>;
  className?: string;
  label: string;
  confirmLabel?: string;
  busyLabel?: string;
  disabled?: boolean;
  busy?: boolean;
}) {
  const [armed, setArmed] = useState(false);
  const timeoutRef = useRef<number | null>(null);
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  const reset = () => {
    setArmed(false);
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const handleClick = () => {
    if (disabled || busy) return;
    if (!armed) {
      setArmed(true);
      timeoutRef.current = window.setTimeout(reset, 4000);
      return;
    }
    reset();
    void onConfirm();
  };

  return (
    <button
      ref={ref}
      type="button"
      onClick={handleClick}
      onBlur={reset}
      disabled={disabled || busy}
      aria-pressed={armed || undefined}
      className={cn(
        className,
        armed && "ring-2 ring-critical-500/40 bg-critical-100/60 text-critical-700",
      )}
    >
      {busy && busyLabel ? busyLabel : armed ? confirmLabel : label}
    </button>
  );
}
