"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { WorkspaceOverview } from "@/types/workspace";
import type { UserProfile } from "@/types/auth";
import { api, ApiClientError } from "@/lib/client/api";

interface WorkspaceContextValue {
  token: string;
  overview: WorkspaceOverview | null;
  loading: boolean;
  error: string | null;
  reingest: () => Promise<void>;
  refetch: () => Promise<void>;
  reingesting: boolean;
  profile: UserProfile | null;
  curatorName: string;
  creatorName: string;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

const POLL_MS = 10_000;

export function WorkspaceProvider({ token, children }: { token: string; children: ReactNode }) {
  const [overview, setOverview] = useState<WorkspaceOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reingesting, setReingesting] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchOnce = async () => {
    try {
      const o = await api.getWorkspace(token);
      setOverview(o);
      setError(null);
      return o;
    } catch (err) {
      const msg = err instanceof ApiClientError ? err.message : "Could not load workspace.";
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    api
      .me()
      .then((nextProfile) => {
        if (!cancelled) setProfile(nextProfile);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiClientError && err.status === 401) return;
      });
    const tick = async () => {
      const o = await fetchOnce();
      if (cancelled) return;
      if (o && (o.status === "pending" || o.status === "ingesting")) {
        pollRef.current = setTimeout(tick, POLL_MS);
      }
    };
    tick();
    return () => {
      cancelled = true;
      if (pollRef.current) clearTimeout(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const reingest = async () => {
    setReingesting(true);
    try {
      await api.ingest(token);
      const o = await fetchOnce();
      // resume polling if still working
      if (o && (o.status === "pending" || o.status === "ingesting")) {
        const tick = async () => {
          const r = await fetchOnce();
          if (r && (r.status === "pending" || r.status === "ingesting")) {
            pollRef.current = setTimeout(tick, POLL_MS);
          }
        };
        if (pollRef.current) clearTimeout(pollRef.current);
        pollRef.current = setTimeout(tick, POLL_MS);
      }
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Sync failed.");
      throw err;
    } finally {
      setReingesting(false);
    }
  };

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      token,
      overview,
      loading,
      error,
      reingest,
      refetch: async () => void (await fetchOnce()),
      reingesting,
      profile,
      curatorName: profile?.editorName?.trim() || "Curator",
      creatorName: profile?.creatorName?.trim() || "Creator",
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [token, overview, loading, error, reingesting, profile],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used inside <WorkspaceProvider>");
  return ctx;
}
