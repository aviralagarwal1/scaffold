"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { api, ApiClientError } from "@/lib/client/api";
import { cn } from "@/lib/client/cn";

export function ResetPasswordForm() {
  const params = useSearchParams();
  const email = useMemo(() => (params?.get("email") ?? "").trim(), [params]);
  const token = useMemo(() => (params?.get("token") ?? "").trim(), [params]);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alerting, setAlerting] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    if (password.length < 8) {
      setAlerting(false);
      requestAnimationFrame(() => {
        setAlerting(true);
        window.setTimeout(() => setAlerting(false), 450);
      });
      setError("Password must be at least 8 characters.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await api.confirmPasswordReset({ email, token, password });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not reset password.");
    } finally {
      setBusy(false);
    }
  };

  if (!email || !token) {
    return (
      <section className="panel p-6">
        <h2 className="font-serif text-[22px] leading-snug tracking-tightish text-ink-900">Reset link missing.</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-600">
          Request a fresh password reset link to continue.
        </p>
        <Link href="/forgot-password" className="btn-secondary mt-5">
          Request reset link
        </Link>
      </section>
    );
  }

  if (done) {
    return (
      <section className="panel relative max-w-sm overflow-hidden p-6">
        <span
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-positive-100/0 via-positive-500/45 to-positive-100/0"
        />
        <h2 className="font-serif text-[22px] leading-snug tracking-tightish text-ink-900">Password updated.</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-600">Sign in with your new password.</p>
        <Link href={`/login?email=${encodeURIComponent(email)}`} className="btn-primary mt-5">
          Sign in
        </Link>
      </section>
    );
  }

  return (
    <form onSubmit={submit} className="panel flex flex-col gap-5 p-6" noValidate>
      <div className="-mt-1 rounded-md border border-ink-200/70 bg-ink-50/40 px-3 py-2 text-[13px] text-ink-700">
        Resetting password for <span className="font-medium text-ink-900">{email}</span>
      </div>

      <label className="flex flex-col gap-2">
        <span className="type-eyebrow text-ink-400">New password</span>
        <input
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className={cn("input", alerting && "animate-editorial-nudge !border-ink-400")}
          type="password"
          autoComplete="new-password"
          disabled={busy}
          aria-invalid={alerting || undefined}
        />
        <span className="text-[11.5px] leading-snug text-ink-400">At least 8 characters.</span>
      </label>

      {error && (
        <div className="rounded-md border border-critical-100 bg-critical-100/40 px-3 py-2 text-[13px] text-critical-700">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between gap-3 pt-1">
        <Link href={`/forgot-password?email=${encodeURIComponent(email)}`} className="btn-link">
          Request new link
        </Link>
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? "Saving..." : "Reset password"}
        </button>
      </div>
    </form>
  );
}
