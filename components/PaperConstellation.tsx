"use client";

import { useMemo } from "react";
import type { SearchResult } from "@/types/ai";

const TOTAL_PAPERS = 16; // 4x4 grid

// Subtle per-paper rotations so the wall reads as a hand-arranged stack
// rather than a sterile grid. Deterministic by index for stability.
const ROTATIONS = [-1.5, 0.5, -1, 1.5, 0, -2, 1, -0.5, 1.5, -1, 0.5, 0, -0.5, 1.5, -1.5, 1];

// Visually-pleasing order for which slots light up first. First-N from this
// list gives well-distributed positions for any 1..16 match count, so a
// 3-result search lights three corners of the grid (not the top-left
// adjacent block, which would feel arbitrary).
const SCATTERED_ORDER = [5, 10, 3, 12, 0, 9, 6, 15, 1, 14, 8, 11, 2, 13, 4, 7];

const REVEAL_STAGGER_MS = 110;
const SHIMMER_STAGGER_MS = 70;
const NUMBER_BADGE_DELAY_MS = 220;
const TITLE_LIST_BASE_DELAY_MS = 700;

export type ConstellationState = "searching" | "showing";

export function PaperConstellation({
  state,
  matches,
}: {
  state: ConstellationState;
  matches: SearchResult[];
}) {
  // Map match index → grid slot via SCATTERED_ORDER. The first match goes
  // to slot 5 (center-ish), the second to slot 10 (diagonal opposite), etc.
  const litSlots = useMemo(() => {
    const count = Math.min(matches.length, TOTAL_PAPERS);
    return SCATTERED_ORDER.slice(0, count);
  }, [matches.length]);

  // Reverse lookup: gridSlot → litIndex (so the badge number matches the
  // ordered list below the grid).
  const slotToLitIndex = useMemo(() => {
    const map = new Map<number, number>();
    litSlots.forEach((slot, i) => map.set(slot, i));
    return map;
  }, [litSlots]);

  return (
    <div className="flex flex-col items-center gap-7">
      {/* The constellation itself */}
      <div className="grid grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: TOTAL_PAPERS }, (_, slot) => {
          const litIndex = slotToLitIndex.get(slot);
          const isLit = litIndex !== undefined;
          return (
            <Paper
              key={slot}
              slot={slot}
              state={state}
              lit={isLit}
              litIndex={litIndex ?? -1}
              number={isLit ? litIndex + 1 : null}
            />
          );
        })}
      </div>

      {/* Title list under the constellation. Numbers correspond to the
          badges on the lit papers above. Each entry is a deep link via
          Text Fragments to the first snippet's match. */}
      {state === "showing" && matches.length > 0 && (
        <ol className="flex w-full max-w-md flex-col gap-1.5">
          {matches.slice(0, TOTAL_PAPERS).map((match, i) => {
            const firstSnippet = match.snippets[0]?.match;
            const href = firstSnippet
              ? `${match.postUrl}#:~:text=${encodeURIComponent(firstSnippet)}`
              : match.postUrl;
            return (
              <li
                key={match.postId}
                className="animate-fade"
                style={{ animationDelay: `${TITLE_LIST_BASE_DELAY_MS + i * REVEAL_STAGGER_MS}ms` }}
              >
                <a
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex items-baseline gap-2.5 rounded-md px-2 py-1 transition-colors duration-150 ease-editorial hover:bg-accent-50/40"
                >
                  <span className="font-mono text-[11px] text-accent-700">{i + 1}.</span>
                  <span className="font-serif text-[15px] leading-snug text-ink-900 group-hover:text-accent-800">
                    {match.postTitle}
                  </span>
                </a>
              </li>
            );
          })}
          {matches.length > TOTAL_PAPERS && (
            <li
              className="animate-fade pl-6 pt-1 text-[12.5px] italic text-ink-500"
              style={{ animationDelay: `${TITLE_LIST_BASE_DELAY_MS + TOTAL_PAPERS * REVEAL_STAGGER_MS}ms` }}
            >
              + {matches.length - TOTAL_PAPERS} more across your archive.
            </li>
          )}
        </ol>
      )}
    </div>
  );
}

function Paper({
  slot,
  state,
  lit,
  litIndex,
  number,
}: {
  slot: number;
  state: ConstellationState;
  lit: boolean;
  litIndex: number;
  number: number | null;
}) {
  const rotation = ROTATIONS[slot % ROTATIONS.length];
  const showing = state === "showing";

  // While searching, every paper shimmers with a per-slot delay so the wave
  // moves across the grid. While showing, the lit papers reveal in order
  // and the unmatched ones recede simultaneously (no stagger on recede so
  // the eye lands on the lit ones).
  const revealDelay = showing && lit ? litIndex * REVEAL_STAGGER_MS : 0;
  const shimmerDelay = !showing ? slot * SHIMMER_STAGGER_MS : 0;

  return (
    <div
      className="relative transition-transform duration-700 ease-editorial"
      style={{
        transform: `rotate(${rotation}deg) ${showing && lit ? "scale(1.12)" : showing ? "scale(0.86)" : "scale(1)"}`,
        transitionDelay: `${revealDelay}ms`,
      }}
    >
      <svg
        viewBox="0 0 24 32"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`block h-12 w-9 transition-[color,opacity,filter] duration-700 ease-editorial sm:h-14 sm:w-10 ${
          showing
            ? lit
              ? "text-accent-600 opacity-100 drop-shadow-[0_3px_10px_rgba(180,94,44,0.28)]"
              : "text-ink-300 opacity-25"
            : "animate-paper-shimmer text-ink-400"
        }`}
        style={{
          transitionDelay: `${revealDelay}ms`,
          animationDelay: !showing ? `${shimmerDelay}ms` : undefined,
        }}
      >
        {/* Document outline with a folded top-right corner. */}
        <path d="M3.5 2.5h13l4 4v23h-17z" />
        <path d="M16.5 2.5v4h4" />
        {/* Three text-line marks. */}
        <line x1="6.5" y1="13" x2="17.5" y2="13" />
        <line x1="6.5" y1="17" x2="17.5" y2="17" />
        <line x1="6.5" y1="21" x2="13.5" y2="21" />
      </svg>
      {number !== null && showing && (
        <span
          className="animate-fade absolute -right-1.5 -top-1.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent-700 px-1 font-mono text-[9.5px] font-medium text-ink-50 shadow-soft"
          style={{ animationDelay: `${revealDelay + NUMBER_BADGE_DELAY_MS}ms` }}
        >
          {number}
        </span>
      )}
    </div>
  );
}
