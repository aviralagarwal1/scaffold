"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { api, ApiClientError } from "@/lib/client/api";
import { cn } from "@/lib/client/cn";

type AuthMode = "login" | "register";

export function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const params = useSearchParams();
  const isRegister = mode === "register";

  // Landing-hook handoff. If the visitor came from the marketing hero with a
  // publication URL, we carry it through register → /account so the workspace
  // can be auto-provisioned once they finish naming themselves and their
  // curator on the side-by-side gate.
  const incomingPublicationUrl = useMemo(() => {
    const raw = params?.get("publicationUrl") ?? "";
    return raw.trim();
  }, [params]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        await api.register({
          email,
          password,
        });
      }

      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (res?.error) {
        setError(isRegister ? "Account created, but sign-in failed. Try signing in." : "Email or password is incorrect.");
        setBusy(false);
        return;
      }

      // Both flows land on /account. Register users see the gate (Creator +
      // Curator unset, publication CTA hidden); login users see whatever
      // state their account is already in. The publicationUrl from the
      // landing hook rides along on the URL so /account can auto-provision
      // once they finish naming.
      const tail = incomingPublicationUrl
        ? `?publicationUrl=${encodeURIComponent(incomingPublicationUrl)}`
        : "";
      router.push(`/account${tail}`);
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

  return (
    <form onSubmit={onSubmit} className="panel flex flex-col gap-5 p-6" noValidate>
      {isRegister && incomingPublicationUrl && (
        <div className="-mt-1 flex items-start gap-3 rounded-md border border-accent-200/70 bg-accent-50/50 px-3 py-2.5">
          <span className="mt-0.5 font-serif text-[14px] leading-none text-accent-500" aria-hidden="true">§</span>
          <div className="min-w-0">
            <p className="text-[12.5px] leading-snug text-ink-700">
              We&rsquo;ll wire <span className="font-medium text-ink-900">{incomingPublicationUrl}</span> in once
              you&rsquo;ve named yourself and your curator on the next page.
            </p>
          </div>
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

      <label className="flex flex-col gap-2">
        <span className="type-eyebrow text-ink-400">Password</span>
        <input
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className={cn("input", passwordAlerting && "animate-editorial-nudge !border-ink-400")}
          type="password"
          autoComplete={isRegister ? "new-password" : "current-password"}
          disabled={busy}
          aria-invalid={passwordAlerting || undefined}
        />
        {isRegister && (
          <span className="text-[11.5px] leading-snug text-ink-400">At least 8 characters.</span>
        )}
      </label>

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
              : `/register${incomingPublicationUrl ? `?publicationUrl=${encodeURIComponent(incomingPublicationUrl)}` : ""}`
          }
          className="btn-link"
        >
          {isRegister ? "Already have an account?" : "Create an account"}
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
