"use client";

import { signOut } from "next-auth/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { UserProfile } from "@/types/auth";
import type { AccountWorkspaceSummary } from "@/types/workspace";
import { api, ApiClientError } from "@/lib/client/api";
import { formatDate, pluralize } from "@/lib/client/format";
import { LoadingState } from "./states";

export function AccountPanel() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [editorName, setEditorName] = useState("");
  const [workspaces, setWorkspaces] = useState<AccountWorkspaceSummary[]>([]);
  const [busy, setBusy] = useState<"load" | "save" | null>("load");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([api.me(), api.listWorkspaces()])
      .then(([nextProfile, nextWorkspaces]) => {
        if (!active) return;
        setProfile(nextProfile);
        setEditorName(nextProfile.editorName);
        setWorkspaces(nextWorkspaces);
        setError(null);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof ApiClientError ? err.message : "Could not load account.");
      })
      .finally(() => {
        if (active) setBusy(null);
      });
    return () => {
      active = false;
    };
  }, []);

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy("save");
    setError(null);
    try {
      const nextProfile = await api.updateProfile({ editorName });
      setProfile(nextProfile);
      setEditorName(nextProfile.editorName);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not update profile.");
    } finally {
      setBusy(null);
    }
  };

  if (busy === "load") {
    return (
      <div className="panel p-5">
        <LoadingState label="Loading account..." />
      </div>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
      <section className="panel flex flex-col gap-5 p-5">
        <div>
          <span className="type-eyebrow text-ink-400">Profile</span>
          <h2 className="mt-2 type-h3">Your editor identity.</h2>
          {profile?.email && <p className="mt-1 text-[13px] text-ink-500">{profile.email}</p>}
        </div>

        <form onSubmit={saveProfile} className="flex flex-col gap-4">
          <label className="flex flex-col gap-2">
            <span className="type-eyebrow text-ink-400">Editor name</span>
            <input
              value={editorName}
              onChange={(event) => setEditorName(event.target.value)}
              className="input"
              disabled={busy === "save"}
            />
          </label>
          {error && (
            <div className="rounded-md border border-critical-100 bg-critical-100/40 px-3 py-2 text-[13px] text-critical-700">
              {error}
            </div>
          )}
          <div className="flex items-center justify-between gap-3">
            <button type="button" className="btn-secondary" onClick={() => void signOut({ callbackUrl: "/" })}>
              Sign out
            </button>
            <button type="submit" className="btn-primary" disabled={busy === "save"}>
              {busy === "save" ? "Saving..." : "Save profile"}
            </button>
          </div>
        </form>
      </section>

      <section className="panel flex flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="type-eyebrow text-ink-400">Workspaces</span>
            <h2 className="mt-2 type-h3">{pluralize(workspaces.length, "workspace")}</h2>
          </div>
          <Link href="/new" className="btn-secondary">
            Add workspace
          </Link>
        </div>

        {workspaces.length > 0 ? (
          <div className="flex flex-col divide-y divide-ink-200/70">
            {workspaces.map((workspace) => (
              <Link
                key={workspace.id}
                href={workspace.workspaceUrl}
                className="group flex items-center justify-between gap-4 py-3 transition-colors hover:text-accent-700"
              >
                <div className="min-w-0">
                  <div className="truncate font-medium text-ink-900 group-hover:text-accent-700">
                    {workspace.publicationName ?? workspace.publicationUrl}
                  </div>
                  <div className="mt-0.5 truncate text-[12.5px] text-ink-500">{workspace.publicationUrl}</div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="type-meta capitalize text-ink-500">{workspace.status}</div>
                  {workspace.lastIngestedAt && (
                    <div className="mt-0.5 type-meta text-ink-400">{formatDate(workspace.lastIngestedAt)}</div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-ink-200 bg-white px-5 py-8 text-[13px] leading-relaxed text-ink-500">
            Add a publication you own or manage. Your private workspace will appear here.
          </div>
        )}
      </section>
    </div>
  );
}
