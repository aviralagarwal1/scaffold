"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { api, ApiClientError } from "@/lib/client/api";
import { cn } from "@/lib/client/cn";

export function ForgotPasswordForm() {
  const params = useSearchParams();
  const initialEmail = useMemo(() => (params?.get("email") ?? "").trim(), [params]);
  const [email, setEmail] = useState(initialEmail);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<"email" | "console" | "silent" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [alerting, setAlerting] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    if (!email.trim()) {
      setAlerting(false);
      requestAnimationFrame(() => {
        setAlerting(true);
        window.setTimeout(() => setAlerting(false), 450);
      });
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const result = await api.requestPasswordReset({ email });
      setSent(result.delivery ?? "silent");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not request password reset.");
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <section className="panel relative overflow-hidden p-6">
        <span
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-positive-100/0 via-positive-500/45 to-positive-100/0"
        />
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="font-serif text-[22px] leading-snug tracking-tightish text-ink-900">
              Check your email.
            </h2>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-600">
              {sent === "console"
                ? "Email delivery is not configured locally. The reset link was printed in the dev server terminal."
                : "If there is a verified account for that email, a reset link is on its way."}
            </p>
          </div>
          <Link href={`/login${email ? `?email=${encodeURIComponent(email)}` : ""}`} className="btn-secondary self-start">
            Return to sign in
          </Link>
        </div>
      </section>
    );
  }

  return (
    <form onSubmit={submit} className="panel flex flex-col gap-5 p-6" noValidate>
      <label className="flex flex-col gap-2">
        <span className="type-eyebrow text-ink-400">Email</span>
        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={cn("input", alerting && "animate-editorial-nudge !border-ink-400")}
          placeholder="you@example.com"
          type="email"
          autoComplete="email"
          disabled={busy}
          aria-invalid={alerting || undefined}
        />
      </label>

      {error && (
        <div className="rounded-md border border-critical-100 bg-critical-100/40 px-3 py-2 text-[13px] text-critical-700">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between gap-3 pt-1">
        <Link href={`/login${email ? `?email=${encodeURIComponent(email)}` : ""}`} className="btn-link">
          Return to sign in
        </Link>
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? "Sending..." : "Send reset link"}
        </button>
      </div>
    </form>
  );
}
