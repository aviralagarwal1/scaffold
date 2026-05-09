"use client";

import { useEffect, useState } from "react";
import type { RepurposeDraft, RepurposeDraftStatus } from "@/types/ai";
import { api, ApiClientError } from "@/lib/client/api";
import { ConfirmButton } from "./ConfirmButton";
import { DraftStatusBadge } from "./DraftStatusBadge";
import { PlatformIcon } from "./PlatformIcon";
import { cn } from "@/lib/client/cn";
import { formatRelative, platformCharLimit, platformLabel } from "@/lib/client/format";

const PENDING_LIFETIME_MS = 24 * 60 * 60 * 1000;

export function RepurposeDraftCard({
  token,
  draft,
  onChange,
  onRegenerate,
}: {
  token: string;
  draft: RepurposeDraft;
  onChange: (next: RepurposeDraft | null) => void;
  onRegenerate?: (draft: RepurposeDraft) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(draft.content);
  const [busy, setBusy] = useState<null | "save" | "approve" | "delete" | "copy" | "edit">(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tick once a minute so the "expires in X" countdown stays fresh on long sessions.
  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => {
    if (draft.status !== "pending") return;
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, [draft.status]);

  const update = async (patch: { status?: RepurposeDraftStatus; content?: string; title?: string | null }, kind: typeof busy) => {
    setBusy(kind);
    setError(null);
    try {
      const next = await api.updateDraft(
        token,
        draft.id,
        patch as Partial<Pick<RepurposeDraft, "status" | "content" | "title">>,
      );
      onChange(next);
      if (kind === "edit") setEditing(false);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Update failed.");
    } finally {
      setBusy(null);
    }
  };

  const onDelete = async () => {
    setBusy("delete");
    setError(null);
    try {
      await api.deleteDraft(token, draft.id);
      onChange(null);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Delete failed.");
    } finally {
      setBusy(null);
    }
  };

  const onCopy = async () => {
    setBusy("copy");
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Could not copy to clipboard.");
    } finally {
      setBusy(null);
    }
  };

  const charCount = content.length;
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const limit = platformCharLimit(draft.platform);
  const overLimit = charCount > limit;

  const expiresAt = Date.parse(draft.createdAt) + PENDING_LIFETIME_MS;
  const expiresIn = expiresAt - now;
  const hoursLeft = Math.max(0, Math.floor(expiresIn / (60 * 60 * 1000)));
  const minutesLeft = Math.max(0, Math.floor(expiresIn / (60 * 1000)));
  const expiryText =
    draft.status === "pending"
      ? hoursLeft >= 1
        ? `Expires in ${hoursLeft}h`
        : `Expires in ${minutesLeft}m`
      : null;

  return (
    <article className="panel animate-rise flex flex-col gap-3 p-5 transition-shadow duration-200 ease-editorial hover:shadow-lift">
      <header className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <PlatformIcon platform={draft.platform} className="h-4 w-4 text-ink-700" />
          <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-700">
            {platformLabel(draft.platform)}
          </span>
          {draft.title && (
            <>
              <span aria-hidden="true" className="text-ink-300">·</span>
              <span className="truncate text-[12px] text-ink-500">{draft.title}</span>
            </>
          )}
        </div>
        <DraftStatusBadge status={draft.status} />
      </header>

      {editing ? (
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={Math.max(4, Math.min(16, content.split("\n").length + 1))}
          className="input min-h-[120px] resize-y font-serif text-[14.5px] leading-relaxed"
        />
      ) : (
        <pre className="whitespace-pre-wrap break-words font-serif text-[14.5px] leading-relaxed text-ink-800">
          {content}
        </pre>
      )}

      {/* Meta line — generated timestamp, word/char count, platform limit */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10.5px] text-ink-400">
        <span>Generated {formatRelative(draft.createdAt)}</span>
        <span aria-hidden="true" className="text-ink-300">·</span>
        <span>{wordCount.toLocaleString()} words</span>
        <span aria-hidden="true" className="text-ink-300">·</span>
        <span className={cn(overLimit && "text-critical-700")}>
          {charCount.toLocaleString()}/{limit.toLocaleString()} chars
        </span>
        {expiryText && (
          <>
            <span aria-hidden="true" className="text-ink-300">·</span>
            <span className="text-accent-700">{expiryText}</span>
          </>
        )}
      </div>

      {draft.sourcePostTitle && (
        <div className="text-[12px] text-ink-500">
          From{" "}
          {draft.sourcePostUrl ? (
            <a href={draft.sourcePostUrl} target="_blank" rel="noreferrer" className="link-soft">
              {draft.sourcePostTitle}
            </a>
          ) : (
            <span className="text-ink-700">{draft.sourcePostTitle}</span>
          )}
        </div>
      )}

      {error && (
        <div className="rounded-md border border-critical-100 bg-critical-100/40 px-3 py-2 text-[12px] text-critical-700">
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 pt-1">
        {editing ? (
          <>
            <button onClick={() => update({ content }, "edit")} disabled={busy !== null} className="btn-primary">
              {busy === "edit" ? "Saving" : "Save edits"}
            </button>
            <button
              onClick={() => {
                setEditing(false);
                setContent(draft.content);
              }}
              className="btn-secondary"
              disabled={busy !== null}
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            {draft.status !== "approved" && (
              <button
                onClick={() => update({ status: "approved" }, "approve")}
                className="btn-primary"
                disabled={busy !== null}
              >
                {busy === "approve" ? "Approving" : "Approve"}
              </button>
            )}
            {draft.status === "pending" && (
              <button onClick={() => update({ status: "saved" }, "save")} className="btn-secondary" disabled={busy !== null}>
                {busy === "save" ? "Saving" : "Save"}
              </button>
            )}
            <button onClick={() => setEditing(true)} className="btn-secondary" disabled={busy !== null}>
              Edit
            </button>
            <button onClick={onCopy} className="btn-secondary" disabled={busy !== null}>
              {copied ? "Copied" : "Copy"}
            </button>
            {onRegenerate && (
              <button onClick={() => onRegenerate(draft)} className="btn-ghost" disabled={busy !== null}>
                Regenerate
              </button>
            )}
            <ConfirmButton
              onConfirm={onDelete}
              label={busy === "delete" ? "Deleting" : "Dismiss"}
              confirmLabel="Confirm dismiss"
              busy={busy === "delete"}
              disabled={busy !== null && busy !== "delete"}
              className="btn-danger-ghost ml-auto transition-colors"
            />
          </>
        )}
      </div>
    </article>
  );
}
