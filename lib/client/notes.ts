import type { PostNote } from "@/types/post";

const CONTEXT = 48;

export function selectionContext(text: string, start: number, quote: string): { prefix: string; suffix: string } {
  return {
    prefix: text.slice(Math.max(0, start - CONTEXT), start),
    suffix: text.slice(start + quote.length, start + quote.length + CONTEXT),
  };
}

/** Where this note's quote sits in the current post, or -1 if a sync moved it. */
export function findNoteIndex(text: string, note: Pick<PostNote, "quote" | "prefix" | "suffix">): number {
  if (!note.quote) return -1;
  const first = text.indexOf(note.quote);
  if (first === -1) return -1;
  const second = text.indexOf(note.quote, first + 1);
  if (second === -1) return first;

  const keyed = `${note.prefix}${note.quote}${note.suffix}`;
  if (note.prefix || note.suffix) {
    const at = text.indexOf(keyed);
    if (at !== -1 && text.indexOf(keyed, at + 1) === -1) return at + note.prefix.length;
  }
  // A sync may have changed the surrounding text. Never attach an ambiguous
  // quotation to an arbitrary occurrence; retain it as an unplaced note.
  return -1;
}
