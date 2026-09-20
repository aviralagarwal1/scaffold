"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ConfirmButton } from "@/components/ui/ConfirmButton";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { api, ApiClientError } from "@/lib/client/api";
import { cn } from "@/lib/client/cn";
import { formatDate, formatRelative, pluralize } from "@/lib/client/format";
import { findNoteIndex, selectionContext } from "@/lib/client/notes";
import { NOTES_COPY as copy } from "@/lib/copy";
import type { Post, PostNote } from "@/types/post";

interface DraftNote { quote: string; prefix: string; suffix: string; body: string; id?: string }
interface LocatedNote { note: PostNote; index: number }

export function NotesManuscript(props: { token: string; postId: string }) {
  return <Manuscript key={`${props.token}:${props.postId}`} {...props} />;
}

function Manuscript({ token, postId }: { token: string; postId: string }) {
  const [post, setPost] = useState<Post | null>(null);
  const [notes, setNotes] = useState<PostNote[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selection, setSelection] = useState<DraftNote | null>(null);
  const [selectionTooLong, setSelectionTooLong] = useState(false);
  const [draft, setDraft] = useState<DraftNote | null>(null);
  const [storageFailed, setStorageFailed] = useState(false);
  const articleRef = useRef<HTMLElement>(null);
  const marginRef = useRef<HTMLElement>(null);
  const storageKey = `scaffold:note-draft:${token}:${postId}`;

  // One unfinished note per post, retained in this tab across navigation/reload.
  const changeDraft = (next: DraftNote | null) => {
    setDraft(next);
    try {
      if (next) sessionStorage.setItem(storageKey, JSON.stringify(next));
      else sessionStorage.removeItem(storageKey);
      setStorageFailed(false);
    } catch { setStorageFailed(true); }
  };

  useEffect(() => {
    let active = true;
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (raw) {
        const value = JSON.parse(raw);
        if (typeof value.quote === 'string' && typeof value.body === 'string' && typeof value.prefix === 'string' && typeof value.suffix === 'string' && (value.id === undefined || typeof value.id === 'string')) setDraft(value);
      }
    } catch { setStorageFailed(true); }
    api.getPost(token, postId).then((reader) => {
      if (!active) return;
      setPost(reader.post);
      setNotes(reader.notes);
      setActiveId(window.location.hash.match(/^#note-(.+)$/)?.[1] ?? null);
    }).catch((err) => {
      if (active) setError(err instanceof ApiClientError ? err.message : copy.openError);
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token, postId, storageKey]);

  useEffect(() => {
    if (!draft) return;
    const guard = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, [draft]);

  useEffect(() => {
    if (loading) return;
    const id = window.location.hash.match(/^#note-(.+)$/)?.[1];
    if (id) document.getElementById(`passage-${id}`)?.scrollIntoView({ block: 'center' });
  }, [loading]);

  useEffect(() => {
    if (loading) return;
    const capture = () => {
      if (draft) return;
      setSelectionTooLong(false);
      const selected = window.getSelection();
      const root = articleRef.current;
      if (!selected || selected.isCollapsed || !root || !selected.rangeCount) { setSelection(null); return; }
      const range = selected.getRangeAt(0);
      if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) { setSelection(null); return; }
      const raw = range.toString().replace(/\r\n/g, '\n');
      const quote = raw.trim();
      if (!quote || quote.length > 800) { setSelection(null); setSelectionTooLong(quote.length > 800); return; }
      const prefixRange = document.createRange();
      prefixRange.selectNodeContents(root);
      prefixRange.setEnd(range.startContainer, range.startOffset);
      const start = prefixRange.toString().replace(/\r\n/g, '\n').length + raw.length - raw.trimStart().length;
      if (!post?.contentText.startsWith(quote, start)) { setSelection(null); return; }
      setSelection({ quote, ...selectionContext(post.contentText, start, quote), body: '' });
    };
    document.addEventListener('selectionchange', capture);
    return () => document.removeEventListener('selectionchange', capture);
  }, [draft, loading, post]);

  // Locate each note once per post/note update, never per sort comparison or keystroke.
  const orderedNotes = useMemo(() => notes
    .map((note) => ({ note, index: findNoteIndex(post?.contentText ?? '', note) }))
    .sort((a, b) => (a.index < 0 ? Infinity : a.index) - (b.index < 0 ? Infinity : b.index)), [notes, post]);
  const parts = useMemo(() => highlightParts(post?.contentText ?? '', orderedNotes, activeId), [post, orderedNotes, activeId]);

  const save = async () => {
    if (!draft || !draft.body.trim() || busy) return;
    setBusy('save'); setError(null);
    try {
      const note = draft.id
        ? await api.updatePostNote(token, postId, draft.id, { body: draft.body })
        : await api.addPostNote(token, postId, draft);
      setNotes((current) => [note, ...current.filter((item) => item.id !== note.id)]);
      changeDraft(null); setSelection(null); setActiveId(note.id);
      window.getSelection()?.removeAllRanges();
    } catch (err) { setError(err instanceof ApiClientError ? err.message : copy.saveError); }
    finally { setBusy(null); }
  };
  const remove = async (id: string) => {
    if (busy) return;
    setBusy(id); setError(null);
    try {
      await api.deletePostNote(token, postId, id);
      setNotes((current) => current.filter((note) => note.id !== id));
      if (activeId === id) setActiveId(null);
    } catch (err) { setError(err instanceof ApiClientError ? err.message : copy.removeError); }
    finally { setBusy(null); }
  };
  const startNote = () => {
    if (!selection || draft) return;
    changeDraft(selection); setSelection(null); setActiveId(null);
  };

  if (loading) return <LoadingState label={copy.opening} />;
  if (!post) return <ErrorState title={copy.openError} description={error ?? undefined} />;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4 border-b border-ink-200 pb-4">
        <Link href={`/workspace/${token}/notes`} className="btn-link">← {copy.allPosts}</Link>
        <a href={post.url} target="_blank" rel="noreferrer" className="link-soft text-xs">{copy.original} ↗</a>
      </div>
      <div className="flex justify-end lg:hidden">
        <button type="button" onClick={() => marginRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' })} className="btn-secondary">{copy.notes} ({notes.length})</button>
      </div>
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-10">
        <div className="min-w-0 rounded-md border border-ink-200/70 bg-white px-5 py-7 sm:px-10 sm:py-10">
          <header className="mb-8 border-b border-ink-100 pb-7">
            <p className="mb-4 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[11px] text-ink-500">
              {post.publishedAt && <span>{formatDate(post.publishedAt)}</span>}
              <span>{pluralize(post.wordCount, 'word')}</span>
            </p>
            <h2 className="font-serif text-[28px] leading-[1.2] tracking-tightish text-ink-900 sm:text-[34px]">{post.title}</h2>
            {post.subtitle && <p className="mt-3 text-base leading-relaxed text-ink-500">{post.subtitle}</p>}
          </header>
          <article ref={articleRef} tabIndex={0} aria-label={copy.postText}
            className="whitespace-pre-wrap break-words font-serif text-[17px] leading-[1.85] text-ink-800 selection:bg-accent-100 focus-visible:outline-accent-300">
            {parts.map((part, index) => part.noteId ? (
              <mark key={index} id={`passage-${part.noteId}`} role="button" tabIndex={0}
                aria-label={`${copy.openNote}: ${part.text.slice(0, 80)}`} className={cn('note-mark', activeId === part.noteId && 'note-mark-active')}
                onClick={() => { setActiveId(part.noteId!); marginRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }}
                onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setActiveId(part.noteId!); marginRef.current?.scrollIntoView({ block: 'nearest' }); } }}
              >{part.text}</mark>
            ) : <span key={index}>{part.text}</span>)}
          </article>
        </div>
        <aside ref={marginRef} aria-label={copy.notes} className="min-w-0 lg:sticky lg:top-6 lg:max-h-[calc(100dvh-3rem)] lg:overflow-y-auto lg:pr-1">
          <div className="mb-5 flex items-center justify-between border-b border-ink-200 pb-3">
            <h3 className="text-sm font-medium text-ink-900">{copy.notes}</h3>
            <span className="font-mono text-xs text-ink-400">{notes.length}</span>
          </div>
          {!draft && error && <ErrorState description={error} />}
          {selection && !draft && <div className="mb-5 hidden rounded-md border border-accent-200 bg-white p-4 lg:block">
            <blockquote className="mb-4 line-clamp-4 border-l-2 border-accent-300 pl-3 font-serif text-sm leading-relaxed text-ink-600">{selection.quote}</blockquote>
            <button type="button" onPointerDown={(event) => event.preventDefault()} onClick={startNote} className="btn-primary">{copy.addNote}</button>
          </div>}
          {draft && (
            <div className="fixed inset-x-0 bottom-0 z-30 max-h-[75dvh] overflow-y-auto rounded-t-md border border-ink-200 bg-white p-5 shadow-lift lg:static lg:mb-6 lg:max-h-none lg:rounded-md lg:p-4 lg:shadow-none">
              <form onSubmit={(event) => { event.preventDefault(); void save(); }}>
                <h4 className="text-sm font-medium text-ink-900">{draft.id ? copy.editNote : copy.addNote}</h4>
                <blockquote className="my-4 max-h-28 overflow-y-auto border-l-2 border-accent-300 pl-3 font-serif text-sm leading-relaxed text-ink-600">{draft.quote}</blockquote>
                <label className="sr-only" htmlFor="note-body">{copy.noteLabel}</label>
                <textarea id="note-body" autoFocus value={draft.body} maxLength={2000} disabled={busy === 'save'} rows={5}
                  placeholder={copy.placeholder} className="input text-base sm:text-[14px]"
                  onChange={(event) => changeDraft({ ...draft, body: event.target.value })}
                  onKeyDown={(event) => { if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) { event.preventDefault(); void save(); } }} />
                {storageFailed && <p role="status" className="mt-2 text-[11px] leading-relaxed text-ink-400">{copy.draftWarning}</p>}
                {error && <p role="alert" className="mt-3 text-sm text-critical-700">{error}</p>}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                  <ConfirmButton label={copy.discard} confirmLabel={copy.confirmDiscard} disabled={!!busy} onConfirm={() => { changeDraft(null); setError(null); }} className="btn-secondary btn-remove" />
                  <button type="submit" disabled={!!busy || !draft.body.trim()} className="btn-primary">{busy === 'save' ? copy.saving : copy.save}</button>
                </div>
              </form>
            </div>
          )}
          {!draft && !selection && !notes.length && <p className="py-3 text-[13px] text-ink-500">{copy.emptyMargin}</p>}
          <div className="mt-4 flex flex-col gap-3">
            {orderedNotes.map(({ note, index }) => <article key={note.id} className={cn('rounded-md border p-4 transition-colors', activeId === note.id ? 'border-accent-200 bg-accent-50/50' : 'border-ink-200/80 bg-white')}>
              <button type="button" onClick={() => { setActiveId(note.id); requestAnimationFrame(() => document.getElementById(`passage-${note.id}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' })); }} className="block w-full text-left">
                <blockquote className="line-clamp-3 border-l-2 border-ink-200 pl-3 font-serif text-[13px] leading-relaxed text-ink-500">{note.quote}</blockquote>
                <p className="mt-3 whitespace-pre-wrap break-words text-[14px] leading-relaxed text-ink-800">{note.body}</p>
              </button>
              {index < 0 && <p className="mt-2 text-xs text-ink-500">{copy.moved}</p>}
              <p className="mt-3 type-meta">{formatRelative(note.updatedAt)}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button type="button" disabled={!!draft || !!busy} onClick={() => { changeDraft({ ...note }); setActiveId(note.id); }} className="btn-secondary">{copy.edit}</button>
                <ConfirmButton label={copy.remove} busyLabel={copy.removing} busy={busy === note.id} disabled={!!busy || draft?.id === note.id} onConfirm={() => remove(note.id)} className="btn-secondary btn-remove" />
              </div>
            </article>)}
          </div>
        </aside>
      </div>
      {selection && !draft && <div className="fixed inset-x-0 bottom-5 z-20 flex justify-center px-5 pointer-events-none lg:hidden">
        <button type="button" onPointerDown={(event) => event.preventDefault()} onClick={startNote} className="btn-primary pointer-events-auto shadow-lift">{copy.addNote}</button>
      </div>}
      {selectionTooLong && !draft && <div role="status" className="fixed inset-x-5 bottom-5 z-20 mx-auto max-w-md rounded-md border border-ink-200 bg-white px-4 py-3 text-center text-[13px] text-ink-700 shadow-soft">{copy.selectionTooLong}</div>}
    </div>
  );
}

function highlightParts(text: string, notes: LocatedNote[], activeId: string | null): Array<{ text: string; noteId?: string }> {
  const located = notes.filter((hit) => hit.index >= 0);
  const active = located.find((hit) => hit.note.id === activeId);
  // Selecting an overlapping note in the margin reveals its whole passage.
  const hits = located.filter((hit) => !active || hit === active || hit.index >= active.index + active.note.quote.length || hit.index + hit.note.quote.length <= active.index).sort((a, b) => a.index - b.index);
  const parts: Array<{ text: string; noteId?: string }> = [];
  let cursor = 0;
  for (const hit of hits) {
    if (hit.index < cursor) continue;
    if (hit.index > cursor) parts.push({ text: text.slice(cursor, hit.index) });
    parts.push({ text: text.slice(hit.index, hit.index + hit.note.quote.length), noteId: hit.note.id });
    cursor = hit.index + hit.note.quote.length;
  }
  if (cursor < text.length) parts.push({ text: text.slice(cursor) });
  return parts;
}
