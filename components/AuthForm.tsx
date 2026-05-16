"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useId, useMemo, useState } from "react";
import { api, ApiClientError } from "@/lib/client/api";
import { cn } from "@/lib/client/cn";

type AuthMode = "login" | "register";

export function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const params = useSearchParams();
  const isRegister = mode === "register";
  const passwordInputId = useId();

  // Landing-hook handoff. The raw URL is carried through auth and confirmed
  // on /publications/new, where validation and workspace creation happen.
  const incomingPublicationUrl = useMemo(() => {
    const raw = params?.get("publicationUrl") ?? "";
    return raw.trim();
  }, [params]);
  const callbackUrl = useMemo(() => {
    const raw = params?.get("callbackUrl") ?? "";
    return raw.startsWith("/") && !raw.startsWith("//") ? raw : "";
  }, [params]);
  const initialEmail = useMemo(() => {
    const raw = params?.get("email") ?? "";
    return raw.trim();
  }, [params]);
  const emailJustVerified = params?.get("verified") === "1";
  const emailVerificationFailed = (params?.get("verified") ?? params?.get("emailVerified")) === "0";
  const accountDeleted = isRegister && params?.get("deleted") === "1";

  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verificationDelivery, setVerificationDelivery] = useState<"email" | "console" | null>(null);

  const [emailAlerting, setEmailAlerting] = useState(false);
  const [passwordAlerting, setPasswordAlerting] = useState(false);

  const triggerAlert = (which: "email" | "password") => {
    const setter = which === "email" ? setEmailAlerting : setPasswordAlerting;
    setter(false);
    requestAnimationFrame(() => {
      setter(true);
      window.setTimeout(() => setter(false), 450);
    });
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;

    let missing = false;
    if (!email.trim()) {
      triggerAlert("email");
      missing = true;
    }
    if (!password) {
      triggerAlert("password");
      missing = true;
    }
    if (missing) return;

    setError(null);
    setBusy(true);

    try {
      if (isRegister) {
        const result = await api.register({
          email,
          password,
          publicationUrl: incomingPublicationUrl || undefined,
        });
        setVerificationDelivery(result.delivery);
        setBusy(false);
        return;
      }

      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (res?.error) {
        setError(res.error === "Verify your email before signing in." ? res.error : "Email or password is incorrect.");
        setBusy(false);
        return;
      }

      // A carried publication URL goes to the confirm step. Otherwise, use
      // the requested callback or the account desk.
      const publicationDestination = incomingPublicationUrl
        ? `/publications/new?publicationUrl=${encodeURIComponent(incomingPublicationUrl)}`
        : "";
      router.push(publicationDestination || callbackUrl || "/account");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not continue.");
      setBusy(false);
    }
  };

  const ctaLabel = (() => {
    if (busy) return "Working...";
    if (isRegister) return "Continue";
    return "Sign in";
  })();

  if (isRegister && verificationDelivery) {
    return (
      <section className="panel relative overflow-hidden p-6">
        <span
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-positive-100/0 via-positive-500/45 to-positive-100/0"
        />
        <div className="flex flex-col gap-4">
          <div>
            <span className="type-eyebrow text-positive-700">Email</span>
            <h2 className="mt-2 font-serif text-[22px] leading-snug tracking-tightish text-ink-900">
              Verify your email.
            </h2>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-600">
              {verificationDelivery === "console"
                ? "Email delivery is not configured locally. The verification link was printed in the dev server terminal."
                : "Fresh link sent. Check your inbox or spam folder."}
            </p>
          </div>
          <button type="button" className="btn-secondary self-start" onClick={() => setVerificationDelivery(null)}>
            Use a different email
          </button>
        </div>
      </section>
    );
  }

  return (
    <form onSubmit={onSubmit} className="panel flex flex-col gap-5 p-6" noValidate>
      {accountDeleted && (
        <div className="-mt-1 rounded-md border border-ink-200 bg-ink-50 px-3 py-2 text-[13px] text-ink-700">
          Account deleted. You can start again here.
        </div>
      )}

      {!isRegister && emailJustVerified && (
        <div className="-mt-1 rounded-md border border-positive-100 bg-positive-100/40 px-3 py-2 text-[13px] text-positive-700">
          Email verified. Sign in to open your desk.
        </div>
      )}

      {!isRegister && emailVerificationFailed && (
        <div className="-mt-1 rounded-md border border-critical-100 bg-critical-100/35 px-3 py-2 text-[13px] leading-relaxed text-critical-700">
          That verification link is invalid, expired, or already used. Sign in below, or register again to send a fresh link.
        </div>
      )}

      <label className="flex flex-col gap-2">
        <span className="type-eyebrow text-ink-400">Email</span>
        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={cn("input", emailAlerting && "animate-editorial-nudge !border-ink-400")}
          placeholder="you@example.com"
          type="email"
          autoComplete="email"
          disabled={busy}
          aria-invalid={emailAlerting || undefined}
        />
      </label>

      <div className="flex flex-col gap-2">
        <label htmlFor={passwordInputId} className="type-eyebrow text-ink-400">
          Password
        </label>
        <span className="relative block">
          <input
            id={passwordInputId}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={cn("input pr-10", passwordAlerting && "animate-editorial-nudge !border-ink-400")}
            type={showPassword ? "text" : "password"}
            autoComplete={isRegister ? "new-password" : "current-password"}
            disabled={busy}
            aria-invalid={passwordAlerting || undefined}
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 inline-flex w-10 items-center justify-center rounded-r-md text-ink-400 transition-colors hover:text-ink-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-300 disabled:cursor-not-allowed disabled:opacity-45"
            onClick={() => setShowPassword((visible) => !visible)}
            disabled={busy}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
          >
            <PasswordEyeIcon crossed={showPassword} />
          </button>
        </span>
        {isRegister && (
          <span className="text-[11.5px] leading-snug text-ink-400">At least 8 characters.</span>
        )}
      </div>

      {error && (
        <div className="rounded-md border border-critical-100 bg-critical-100/40 px-3 py-2 text-[13px] text-critical-700">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between gap-3 pt-1">
        <Link
          href={
            isRegister
              ? `/login${incomingPublicationUrl ? `?publicationUrl=${encodeURIComponent(incomingPublicationUrl)}` : ""}`
              : `/forgot-password${email.trim() ? `?email=${encodeURIComponent(email.trim())}` : ""}`
          }
          className="btn-link"
        >
          {isRegister ? "Already have an account?" : "Forgot password?"}
        </Link>
        <button type="submit" className="btn-primary group" disabled={busy}>
          <span className="relative inline-flex items-center gap-2">
            {busy && (
              <span className="relative inline-flex h-2 w-2 shrink-0" aria-hidden="true">
                <span className="absolute inline-flex h-full w-full animate-editorial-pulse rounded-full bg-ink-50/50" />
                <span className="relative inline-flex h-2 w-2 animate-editorial-pulse rounded-full bg-ink-50" />
              </span>
            )}
            <span>{ctaLabel}</span>
            {!busy && (
              <span
                aria-hidden="true"
                className="text-ink-300 transition-transform duration-200 ease-editorial group-hover:translate-x-0.5 group-hover:text-ink-50"
              >
                →
              </span>
            )}
          </span>
        </button>
      </div>
    </form>
  );
}

function PasswordEyeIcon({ crossed }: { crossed: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    >
      <path d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="2.6" />
      {crossed && <path d="M4.5 4.5 19.5 19.5" />}
    </svg>
  );
}
