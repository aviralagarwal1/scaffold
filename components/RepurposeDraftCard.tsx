"use client";

import { useState } from "react";
import type { RepurposeDraft, RepurposeDraftStatus } from "@/types/ai";
import { api, ApiClientError } from "@/lib/client/api";
import { DraftStatusBadge } from "./DraftStatusBadge";
import { platformLabel } from "@/lib/client/format";

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

  return (
    <article className="panel flex flex-col gap-3 p-5">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 type-meta">
          <span className="text-[12px] font-medium uppercase tracking-[0.08em] text-ink-700">
            {platformLabel(draft.platform)}
          </span>
          {draft.title && <span className="truncate text-ink-500">· {draft.title}</span>}
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

      {draft.sourcePostTitle && (
        <div className="type-meta">
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
              <button onClick={() => update({ status: "approved" }, "approve")} className="btn-primary" disabled={busy !== null}>
                {busy === "approve" ? "Approving" : "Approve"}
              </button>
            )}
            {draft.status === "generated" && (
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
            <button onClick={onDelete} className="btn-danger-ghost ml-auto" disabled={busy !== null}>
              {busy === "delete" ? "Deleting" : "Delete"}
            </button>
          </>
        )}
      </div>
    </article>
  );
}
