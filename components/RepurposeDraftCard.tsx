"use client";

import { useState } from "react";
import type { RepurposeDraft, RepurposeDraftStatus } from "@/types/ai";
import { api, ApiClientError } from "@/lib/client/api";
import { ConfirmButton } from "./ConfirmButton";
import { DraftStatusBadge } from "./DraftStatusBadge";
import { PlatformIcon } from "./PlatformIcon";
import { cn } from "@/lib/client/cn";
import { formatRelative, platformCharLimit, platformLabel } from "@/lib/client/format";

const emptyButtonClass = "btn-secondary";
const dismissButtonClass =
  "ml-auto inline-flex h-9 items-center justify-center rounded-md border border-ink-200 bg-white px-3 text-[13px] font-medium text-ink-700 transition-colors duration-150 ease-editorial hover:border-critical-200 hover:bg-critical-100/45 hover:text-critical-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-critical-500/30 disabled:cursor-not-allowed disabled:opacity-50";

export function RepurposeDraftCard({
  token,
  draft,
  onChange,
}: {
  token: string;
  draft: RepurposeDraft;
  onChange: (next: RepurposeDraft | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(draft.content);
  const [busy, setBusy] = useState<null | "save" | "delete" | "copy" | "edit">(null);
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
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

  const onDownload = () => {
    const platform = platformLabel(draft.platform);
    const body = [
      `${platform}${draft.title ? ` · ${draft.title}` : ""}`,
      draft.sourcePostTitle ? `Source: ${draft.sourcePostTitle}` : null,
      "",
      content,
    ]
      .filter((line): line is string => line !== null)
      .join("\n");
    const blob = new Blob([body], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${slugify([platform, draft.title ?? "draft"].join("-"))}.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setDownloaded(true);
    window.setTimeout(() => setDownloaded(false), 1800);
  };

  const charCount = content.length;
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const limit = platformCharLimit(draft.platform);
  const overLimit = charCount > limit;

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
              {busy === "edit" ? "Saving..." : "Save edits"}
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
            {draft.status === "pending" && (
              <button onClick={() => update({ status: "saved" }, "save")} className="btn-primary" disabled={busy !== null}>
                {busy === "save" ? "Saving..." : "Save"}
              </button>
            )}
            <button onClick={onCopy} className={emptyButtonClass} disabled={busy !== null}>
              {copied ? "Copied" : "Copy"}
            </button>
            <button onClick={onDownload} className={emptyButtonClass} disabled={busy !== null}>
              {downloaded ? "Downloaded" : "Download"}
            </button>
            <button onClick={() => setEditing(true)} className={emptyButtonClass} disabled={busy !== null}>
              Edit
            </button>
            {draft.status === "pending" ? (
              <button
                type="button"
                onClick={onDelete}
                className={dismissButtonClass}
                disabled={busy !== null}
              >
                {busy === "delete" ? "Removing..." : "Remove"}
              </button>
            ) : (
              <ConfirmButton
                onConfirm={onDelete}
                label={busy === "delete" ? "Removing..." : "Remove"}
                confirmLabel="Confirm"
                busy={busy === "delete"}
                disabled={busy !== null && busy !== "delete"}
                className={dismissButtonClass}
                armedClassName="animate-editorial-nudge border-critical-200 bg-critical-100 text-critical-700 ring-2 ring-critical-500/35"
              />
            )}
          </>
        )}
      </div>
    </article>
  );
}

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "draft";
}
