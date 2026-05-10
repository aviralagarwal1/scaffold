"use client";

import { useState } from "react";
import { api, ApiClientError } from "@/lib/client/api";
import { cn } from "@/lib/client/cn";

export function BillingPortalButton({
  className,
  idleLabel = "Manage billing",
  busyLabel = "Opening billing",
}: {
  className?: string;
  idleLabel?: string;
  busyLabel?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const manageBilling = async () => {
    setBusy(true);
    setError(null);
    try {
      const session = await api.createBillingPortalSession();
      window.location.href = session.url;
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not open billing.");
      setBusy(false);
    }
  };

  return (
    <span className="flex flex-col items-start gap-2">
      <button type="button" onClick={manageBilling} disabled={busy} className={cn("btn-primary gap-1.5", className)}>
        {busy && <ButtonLoadingDot />}
        {busy ? busyLabel : idleLabel}
      </button>
      {error && <span className="text-[12.5px] text-critical-700">{error}</span>}
    </span>
  );
}

export function ButtonLoadingDot() {
  return (
    <span className="relative inline-flex h-2 w-2 shrink-0" aria-hidden="true">
      <span className="absolute inline-flex h-full w-full animate-editorial-pulse rounded-full bg-ink-50/50" />
      <span className="relative inline-flex h-2 w-2 animate-editorial-pulse rounded-full bg-ink-50" />
    </span>
  );
}
