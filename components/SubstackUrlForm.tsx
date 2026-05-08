"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, ApiClientError } from "@/lib/client/api";

export function SubstackUrlForm({ autoFocus = false, redirect = true }: { autoFocus?: boolean; redirect?: boolean }) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      setError("Paste a Substack URL to begin.");
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
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          autoFocus={autoFocus}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="yourname.substack.com"
          className="input input-lg sm:flex-1"
          disabled={busy}
          aria-label="Substack URL"
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
        />
        <button type="submit" className="btn-primary btn-primary-lg sm:px-6" disabled={busy}>
          {busy ? "Reading your archive" : "Build my workspace"}
        </button>
      </div>
      {error && <div className="text-[13px] text-critical-700">{error}</div>}
    </form>
  );
}
