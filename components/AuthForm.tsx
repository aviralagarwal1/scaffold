"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, ApiClientError } from "@/lib/client/api";

type AuthMode = "login" | "register";

export function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [editorName, setEditorName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isRegister = mode === "register";

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);

    try {
      if (isRegister) {
        await api.register({ email, password, editorName });
      }

      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (res?.error) {
        setError(isRegister ? "Account created, but sign-in failed. Try signing in." : "Email or password is incorrect.");
        return;
      }

      router.push("/account");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not continue.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="panel flex flex-col gap-5 p-5" noValidate>
      {isRegister && (
        <label className="flex flex-col gap-2">
          <span className="type-eyebrow text-ink-400">Editor name</span>
          <input
            value={editorName}
            onChange={(event) => setEditorName(event.target.value)}
            className="input"
            placeholder="Avi"
            autoComplete="name"
            disabled={busy}
          />
        </label>
      )}

      <label className="flex flex-col gap-2">
        <span className="type-eyebrow text-ink-400">Email</span>
        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="input"
          placeholder="you@example.com"
          type="email"
          autoComplete="email"
          disabled={busy}
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="type-eyebrow text-ink-400">Password</span>
        <input
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="input"
          type="password"
          autoComplete={isRegister ? "new-password" : "current-password"}
          disabled={busy}
        />
      </label>

      {error && (
        <div className="rounded-md border border-critical-100 bg-critical-100/40 px-3 py-2 text-[13px] text-critical-700">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <Link href={isRegister ? "/login" : "/register"} className="btn-link">
          {isRegister ? "Already have an account?" : "Create an account"}
        </Link>
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? "Working..." : isRegister ? "Create account" : "Sign in"}
        </button>
      </div>
    </form>
  );
}
