"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Idea, IdeasResponse, SavedIdea } from "@/types/ai";
import { api, ApiClientError } from "@/lib/client/api";
import { cn } from "@/lib/client/cn";
import { formatRelative, pluralize } from "@/lib/client/format";
import { IdeaCard } from "@/components/workspace/IdeaCard";
import { LoadingState } from "@/components/ui/states";
import { useWorkspace } from "@/components/workspace/WorkspaceProvider";

const CUSTOM_THEME_MAX = 32;

// One inline input handles both adding a brand-new custom theme and editing
// an existing one in place. The shape carries the index when editing.
type CustomDraftMode = { type: "add" } | { type: "edit"; index: number };

export function IdeasPanel({ token, disabled }: { token: string; disabled?: boolean }) {
  const { overview, refetch } = useWorkspace();

  // Compose state.
  // - selectedLensLabel: the chip the user has committed to (single-select).
  // - customThemes: user-added theme labels. Persisted separately from the
  //   workspace's recurring themes (those only refresh on library sync).
  // - notes: required brainstorm/feeling text that grounds the theme.
  const [selectedLensLabel, setSelectedLensLabel] = useState<string | null>(null);
  const [customThemes, setCustomThemes] = useState<string[]>([]);
  const [customDraftMode, setCustomDraftMode] = useState<CustomDraftMode | null>(null);
  const [customDraft, setCustomDraft] = useState("");
  const [notes, setNotes] = useState("");

  // Validation alerts: the button stays clickable, and missing pieces shake
  // when the user submits incomplete input.
  const [lensAlerting, setLensAlerting] = useState(false);
  const [notesAlerting, setNotesAlerting] = useState(false);

  // Async + result.
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<IdeasResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedIdeas, setSavedIdeas] = useState<SavedIdea[]>([]);
  const [savedLoading, setSavedLoading] = useState(true);
  const [savedError, setSavedError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [removingIdeaId, setRemovingIdeaId] = useState<string | null>(null);

  const notesRef = useRef<HTMLTextAreaElement>(null);

  const archiveLenses = useMemo(
    () => overview?.archiveThemes.map((theme) => theme.label) ?? [],
    [overview?.archiveThemes],
  );
  const allLenses = useMemo(() => [...archiveLenses, ...customThemes], [archiveLenses, customThemes]);
  const hasAnyLens = allLenses.length > 0;
  const isAdding = customDraftMode?.type === "add";

  useLayoutEffect(() => {
    const el = notesRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [notes]);

  // Autofocus the notes box on mount — same pattern as Feedback's "Paste your
  // draft" textarea. Native cursor blinks at the placeholder, and the .input
  // class's focus ring (focus:ring-2 focus:ring-accent-200/70) lands the eye
  // on the box immediately. preventScroll keeps the chip strip in view above.
  useEffect(() => {
    notesRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    setCustomThemes(overview?.customThemes ?? []);
  }, [overview?.customThemes]);

  useEffect(() => {
    let active = true;
    setSavedLoading(true);
    api.listSavedIdeas(token)
      .then((ideas) => {
        if (!active) return;
        setSavedIdeas(ideas);
        setSavedError(null);
      })
      .catch((err) => {
        if (!active) return;
        setSavedError(err instanceof ApiClientError ? err.message : "Could not load saved ideas.");
      })
      .finally(() => {
        if (active) setSavedLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token]);

  const savedIdeaKeys = useMemo(() => new Set(savedIdeas.map(ideaKey)), [savedIdeas]);

  const triggerAlert = (kind: "lens" | "notes") => {
    const setAlerting = kind === "lens" ? setLensAlerting : setNotesAlerting;
    setAlerting(false);
    requestAnimationFrame(() => {
      setAlerting(true);
      window.setTimeout(() => setAlerting(false), 450);
    });
  };

  const onLensClick = (label: string) => {
    if (disabled || busy) return;
    setSelectedLensLabel((prev) => (prev === label ? null : label));
  };

  const startAddingCustom = () => {
    if (disabled || busy) return;
    setCustomDraft("");
    setCustomDraftMode({ type: "add" });
  };

  const startEditingCustom = (index: number) => {
    if (disabled || busy) return;
    setCustomDraft(customThemes[index] ?? "");
    setCustomDraftMode({ type: "edit", index });
  };

  const closeDraft = () => {
    setCustomDraftMode(null);
    setCustomDraft("");
  };

  const persistCustomThemes = async (next: string[]) => {
    const previous = customThemes;
    setCustomThemes(next);
    try {
      const res = await api.updateCustomThemes(token, next);
      setCustomThemes(res.customThemes);
      await refetch();
      setError(null);
    } catch (err) {
      setCustomThemes(previous);
      setError(err instanceof ApiClientError ? err.message : "Could not save custom themes.");
    }
  };

  const commitCustomDraft = () => {
    if (!customDraftMode) return;
    const trimmed = customDraft.trim();

    if (customDraftMode.type === "add") {
      if (!trimmed) {
        closeDraft();
        return;
      }
      const existing = allLenses.find((l) => l.toLowerCase() === trimmed.toLowerCase());
      if (existing) {
        setSelectedLensLabel(existing);
      } else {
        void persistCustomThemes([...customThemes, trimmed]);
        setSelectedLensLabel(trimmed);
      }
      closeDraft();
      return;
    }

    // Edit mode.
    const editIndex = customDraftMode.index;
    const oldLabel = customThemes[editIndex];
    if (!trimmed || !oldLabel || trimmed.toLowerCase() === oldLabel.toLowerCase()) {
      closeDraft();
      return;
    }
    // If the new label collides with another existing lens, drop this custom
    // chip and select the existing one instead of creating a duplicate.
    const collidesWithOther = allLenses.find((label, i) => {
      if (label.toLowerCase() !== trimmed.toLowerCase()) return false;
      const customIdx = i - archiveLenses.length;
      return !(customIdx === editIndex);
    });
    if (collidesWithOther) {
      void persistCustomThemes(customThemes.filter((_, i) => i !== editIndex));
      setSelectedLensLabel(collidesWithOther);
    } else {
      void persistCustomThemes(customThemes.map((l, i) => (i === editIndex ? trimmed : l)));
      if (selectedLensLabel === oldLabel) setSelectedLensLabel(trimmed);
    }
    closeDraft();
  };

  const removeCustomTheme = (index: number) => {
    if (disabled || busy) return;
    const label = customThemes[index];
    const next = customThemes.filter((_, i) => i !== index);
    if (selectedLensLabel === label) setSelectedLensLabel(null);
    void persistCustomThemes(next);
  };

  const cancelCustomDraft = () => {
    closeDraft();
  };

  const onSubmit = async () => {
    if (busy) return;
    const trimmedNotes = notes.trim();
    let missing = false;
    if (!selectedLensLabel) {
      triggerAlert("lens");
      missing = true;
    }
    if (!trimmedNotes) {
      triggerAlert("notes");
      missing = true;
    }
    if (missing) return;

    const themeDescription = overview?.archiveThemes.find((t) => t.label === selectedLensLabel)?.description;
    const themeContext = themeDescription
      ? `Theme "${selectedLensLabel}": ${themeDescription}`
      : `Theme "${selectedLensLabel}"`;
    const combinedFocus = `${themeContext}. Notes from the writer: ${trimmedNotes}`;

    setBusy(true);
    setError(null);
    try {
      const res = await api.ideas(token, { focus: combinedFocus });
      setResult(res);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Couldn't generate ideas.");
    } finally {
      setBusy(false);
    }
  };

  const flatIdeas = useMemo(
    () => (result ? result.sections.flatMap((s) => s.ideas) : []),
    [result],
  );

  const saveIdea = async (idea: Idea) => {
    const key = ideaKey(idea);
    if (savedIdeaKeys.has(key) || savingKey) return;
    setSavingKey(key);
    setSavedError(null);
    try {
      const saved = await api.saveIdea(token, idea);
      setSavedIdeas((prev) => (prev.some((item) => item.id === saved.id) ? prev : [saved, ...prev]));
    } catch (err) {
      setSavedError(err instanceof ApiClientError ? err.message : "Could not save idea.");
    } finally {
      setSavingKey(null);
    }
  };

  const removeSavedIdea = async (ideaId: string) => {
    if (removingIdeaId) return;
    setRemovingIdeaId(ideaId);
    setSavedError(null);
    try {
      await api.deleteSavedIdea(token, ideaId);
      setSavedIdeas((prev) => prev.filter((idea) => idea.id !== ideaId));
    } catch (err) {
      setSavedError(err instanceof ApiClientError ? err.message : "Could not remove saved idea.");
    } finally {
      setRemovingIdeaId(null);
    }
  };

  // Inline input shared by add and edit modes. Same pattern as Feedback's
  // "Paste your draft" textarea: autofocused, native caret, and the wrapper's
  // accent ring carries the "highlight" the eye lands on. No custom caret
  // overlay — that recipe is reserved for the hero, where global keystroke
  // capture justifies it.
  const renderCustomDraftInput = (mode: CustomDraftMode) => {
    const placeholder = mode.type === "edit" ? "Edit your theme..." : "Add your theme...";
    return (
      <span className="inline-flex items-center rounded-full border border-accent-300 bg-accent-50/40 px-3 py-1.5 shadow-[0_0_0_3px_rgba(232,194,164,0.18)]">
        <input
          autoFocus
          value={customDraft}
          onChange={(e) => setCustomDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitCustomDraft();
            } else if (e.key === "Escape") {
              e.preventDefault();
              cancelCustomDraft();
            }
          }}
          onBlur={commitCustomDraft}
          maxLength={CUSTOM_THEME_MAX}
          placeholder={placeholder}
          className="input-embedded w-44 text-[13px] text-ink-900 placeholder:font-serif placeholder:text-ink-400"
        />
      </span>
    );
  };

  return (
    <div className="flex flex-col">
      {/* === Compose zone ===
          Chip strip first, then notes textarea, then the single black submit.
          Theme + notes are both required; missing pieces shake on submit. */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void onSubmit();
        }}
        className="flex flex-col gap-6"
      >
        <div className="flex flex-col gap-3">
          <span className="type-eyebrow text-ink-400">Theme</span>
          <div className={cn("flex flex-wrap gap-1.5", lensAlerting && "animate-editorial-nudge")}>
            {allLenses.map((label, i) => {
              const selected = selectedLensLabel === label;
              const isCustom = i >= archiveLenses.length;
              const customIdx = isCustom ? i - archiveLenses.length : -1;

              // Editing this exact custom chip: replace it with the inline input.
              if (
                isCustom &&
                customDraftMode?.type === "edit" &&
                customDraftMode.index === customIdx
              ) {
                return (
                  <span key={`edit-${customIdx}`}>
                    {renderCustomDraftInput(customDraftMode)}
                  </span>
                );
              }

              if (isCustom) {
                return (
                  <span
                    key={`c-${label}`}
                    className={cn(
                      "group/theme inline-flex items-center overflow-hidden rounded-full border text-[13px] transition-all duration-200 ease-editorial",
                      selected
                        ? "border-accent-300 bg-accent-50 text-accent-800 shadow-[0_0_0_3px_rgba(232,194,164,0.18)]"
                        : "border-ink-200/60 bg-ink-50/60 text-ink-600 hover:-translate-y-px hover:border-accent-300 hover:bg-accent-50/50 hover:text-ink-900",
                      lensAlerting && !selected && "!border-ink-400",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => onLensClick(label)}
                      onDoubleClick={() => startEditingCustom(customIdx)}
                      disabled={disabled || busy}
                      aria-pressed={selected}
                      title="Double-click to edit"
                      className="px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {label}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeCustomTheme(customIdx)}
                      disabled={disabled || busy}
                      aria-label={`Remove ${label}`}
                      title="Remove custom theme"
                      className="grid self-stretch place-items-center pl-0 pr-2.5 text-ink-400 transition-colors hover:text-critical-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      &times;
                    </button>
                  </span>
                );
              }

              return (
                <button
                  key={`a-${label}`}
                  type="button"
                  onClick={() => onLensClick(label)}
                  disabled={disabled || busy}
                  aria-pressed={selected}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-[13px] transition-all duration-200 ease-editorial",
                    selected
                      ? "border-accent-300 bg-accent-50 text-accent-800 shadow-[0_0_0_3px_rgba(232,194,164,0.18)]"
                      : "border-ink-200 bg-white text-ink-700 hover:-translate-y-px hover:border-accent-300 hover:bg-accent-50/50 hover:text-ink-900",
                    lensAlerting && !selected && "!border-ink-400",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                  )}
                >
                  {label}
                </button>
              );
            })}
            {isAdding ? (
              renderCustomDraftInput({ type: "add" })
            ) : (
              <button
                type="button"
                onClick={startAddingCustom}
                disabled={disabled || busy}
                aria-label="Add a custom theme"
                title="Add a custom theme"
                className={cn(
                  "rounded-full border border-dashed border-ink-300 bg-white px-3 py-1.5 text-[13px] text-ink-500 transition-all duration-200 ease-editorial",
                  "hover:-translate-y-px hover:border-accent-400 hover:text-accent-700",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                )}
              >
                +
              </button>
            )}
          </div>
          {!hasAnyLens && !isAdding && (
            <p className="text-[13px] leading-relaxed text-ink-500">
              Once we&apos;ve read your library, themes will appear here. You can add your own with{" "}
              <span className="font-mono">+</span>.
            </p>
          )}
        </div>

        <div className={cn("flex flex-col gap-3", notesAlerting && "animate-editorial-nudge")}>
          <textarea
            ref={notesRef}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void onSubmit();
              }
            }}
            placeholder="Start with a feeling, a question, or a half-formed thought to ground this theme..."
            rows={1}
            disabled={disabled || busy}
            className={cn(
              "input block max-h-[240px] min-h-[100px] resize-none overflow-y-auto font-serif text-[15.5px] leading-relaxed text-ink-900 placeholder:font-serif placeholder:text-ink-400 transition-colors duration-200 ease-editorial hover:border-ink-300",
              notesAlerting && "!border-ink-400",
            )}
          />
        </div>

        <div className="flex items-center justify-end pt-1">
          <button
            type="submit"
            className="btn-primary group gap-1.5"
            disabled={disabled || busy}
          >
            {busy ? (
              <>
                <span className="relative inline-flex h-2 w-2 shrink-0" aria-hidden="true">
                  <span className="absolute inline-flex h-full w-full animate-editorial-pulse rounded-full bg-ink-50/50" />
                  <span className="relative inline-flex h-2 w-2 animate-editorial-pulse rounded-full bg-ink-50" />
                </span>
                <span>Pulling threads...</span>
              </>
            ) : (
              <>
                <span>{result ? "Refresh ideas" : "Explore ideas"}</span>
                <span aria-hidden="true" className="btn-ask-arrow">→</span>
              </>
            )}
          </button>
        </div>
        {error && (
          <div className="rounded-md border border-critical-100 bg-critical-100/40 px-3 py-2 text-[13px] text-critical-700">
            {error}
          </div>
        )}
      </form>

      {/* === Result zone ===
          Flat grid — no section grouping by lens-type. The per-card eyebrow
          on IdeaCard still carries the angle ("Natural sequel" / "Contrarian"
          / etc.) as a subtitle, which is the level of granularity that reads
          as useful editorial context rather than rigid taxonomy. */}
      <div className="mt-14 flex flex-col gap-8">
        {busy && (
          <div className="panel p-5">
            <LoadingState label="Reading your library for ideas..." />
          </div>
        )}

        {result && !busy && (
          <section className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <span className="type-eyebrow text-ink-400">Generated ideas</span>
              <span className="h-px flex-1 bg-ink-200/60" />
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {flatIdeas.map((idea, i) => {
                const key = ideaKey(idea);
                const saved = savedIdeaKeys.has(key);
                return (
                  <IdeaCard
                    key={`${idea.title}-${i}`}
                    idea={idea}
                    action={
                      <button
                        type="button"
                        onClick={() => void saveIdea(idea)}
                        disabled={disabled || saved || savingKey !== null}
                        className={cn(
                          "inline-flex h-7 shrink-0 items-center rounded-md border px-2.5 text-[12px] font-medium transition-colors duration-150 ease-editorial",
                          saved
                            ? "border-positive-100 bg-positive-100/70 text-positive-700"
                            : "border-ink-200 bg-white text-ink-700 hover:border-accent-300 hover:bg-accent-50/50 hover:text-accent-700",
                          "disabled:cursor-not-allowed disabled:opacity-70",
                        )}
                      >
                        {saved ? "Saved" : savingKey === key ? "Saving..." : "Save"}
                      </button>
                    }
                  />
                );
              })}
            </div>
          </section>
        )}

        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-baseline gap-2">
              <span className="type-eyebrow text-ink-400">Saved ideas</span>
              {savedIdeas.length > 0 && (
                <span className="type-meta text-ink-400">{pluralize(savedIdeas.length, "idea")}</span>
              )}
            </div>
            <span className="h-px flex-1 bg-ink-200/60" />
          </div>

          {savedError && (
            <div className="rounded-md border border-critical-100 bg-critical-100/40 px-3 py-2 text-[13px] text-critical-700">
              {savedError}
            </div>
          )}

          {savedLoading ? (
            <div className="panel p-5">
              <LoadingState label="Loading saved ideas..." />
            </div>
          ) : savedIdeas.length > 0 ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {savedIdeas.map((idea) => (
                <IdeaCard
                  key={idea.id}
                  idea={idea}
                  meta={`Saved ${formatRelative(idea.createdAt)}`}
                  action={
                    <div className="flex shrink-0 items-center gap-1">
                      <Link
                        href={`/workspace/${encodeURIComponent(token)}/ask?message=${encodeURIComponent(ideaConversationPrompt(idea))}`}
                        className="inline-flex h-7 items-center rounded-md px-2.5 text-[12px] font-medium text-ink-500 transition-colors duration-150 ease-editorial hover:bg-accent-50/50 hover:text-accent-700"
                      >
                        Discuss
                      </Link>
                      <button
                        type="button"
                        onClick={() => void removeSavedIdea(idea.id)}
                        disabled={disabled || removingIdeaId !== null}
                        className="inline-flex h-7 items-center rounded-md px-2.5 text-[12px] font-medium text-ink-500 transition-colors duration-150 ease-editorial hover:bg-critical-100/50 hover:text-critical-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {removingIdeaId === idea.id ? "Removing..." : "Remove"}
                      </button>
                    </div>
                  }
                />
              ))}
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-ink-200 bg-white px-5 py-6 text-[13px] leading-relaxed text-ink-500">
              No saved ideas yet. Let’s find something worth revisiting.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function ideaKey(idea: Pick<Idea, "title" | "thesis">): string {
  return `${idea.title.trim().toLowerCase()}::${idea.thesis.trim().toLowerCase()}`;
}

function ideaConversationPrompt(idea: Idea): string {
  return [
    `Let's develop this saved idea: ${idea.title}`,
    "",
    `Thesis: ${idea.thesis}`,
    `Lens: ${idea.lens}`,
    idea.whyItFits ? `Why it fits: ${idea.whyItFits}` : null,
  ]
    .filter((line): line is string => line !== null)
    .join("\n");
}
