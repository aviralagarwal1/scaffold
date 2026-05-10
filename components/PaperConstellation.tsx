"use client";

import { useMemo } from "react";
import type { SearchResult } from "@/types/ai";

// 16 wide × 3 tall = 48. Picked for noticeability:
//   < 24 papers → grid feels too small; "1 found" doesn't read as "in a sea".
//   24–60      → sweet spot; 1 lit ≈ 2–4% reads as picked-out, not lonely.
//   > 72       → density hurts both noticeability and the paper SVG itself.
// 16×3 keeps the canvas cinematic and short (~125px tall), so matches don't
// drown to the bottom of the screen. The "shelf of papers" silhouette also
// reads more archive-evocative than a square block.
const COLS = 16;
const ROWS = 3;
const TOTAL_PAPERS = COLS * ROWS;

// Subtle per-paper rotations so the wall reads as a hand-arranged stack
// rather than a sterile grid. 13 entries (prime, coprime with 16 and 48) so
// the rotation pattern doesn't align with columns or rows — every paper
// reads as individual.
const ROTATIONS = [-1.5, 0.8, -1.2, 1.5, 0.2, -1.8, 1, -0.5, 1.5, -1, 0.5, -0.3, -0.8];

// Stride-37 walk over 48 slots starting near center. gcd(37, 48) = 1, so the
// walk visits every slot exactly once. The first N entries give visually
// distributed positions for any 1..48 match count — a 3-result search lights
// three corners of the grid, not the top-left adjacent block.
const SCATTERED_ORDER: number[] = (() => {
  const out: number[] = [];
  let cur = Math.floor(TOTAL_PAPERS / 2); // 24, near center
  const stride = 37;
  for (let i = 0; i < TOTAL_PAPERS; i++) {
    out.push(cur);
    cur = (cur + stride) % TOTAL_PAPERS;
  }
  return out;
})();

// Caps so timing stays sane regardless of match count.
//   At 90ms per stagger × 48 lit, naive reveal would last 4.3s. We cap the
//   stagger at the first 12 papers; anything after that reveals at the cap.
const REVEAL_STAGGER_MS = 90;
const REVEAL_STAGGER_CAP = 12;
const SHIMMER_STAGGER_MS = 25;
const NUMBER_BADGE_DELAY_MS = 200;
const TITLE_LIST_BASE_DELAY_MS = 800;
const VISIBLE_TITLES = 8;

export type ConstellationState = "searching" | "showing";

export function PaperConstellation({
  state,
  matches,
}: {
  state: ConstellationState;
  matches: SearchResult[];
}) {
  // matchIndex → grid slot, via SCATTERED_ORDER.
  const litSlots = useMemo(() => {
    const count = Math.min(matches.length, TOTAL_PAPERS);
    return SCATTERED_ORDER.slice(0, count);
  }, [matches.length]);

  // Reverse lookup: grid slot → matchIndex (so the badge number matches the
  // ordered list below the grid).
  const slotToLitIndex = useMemo(() => {
    const map = new Map<number, number>();
    litSlots.forEach((slot, i) => map.set(slot, i));
    return map;
  }, [litSlots]);

  const visibleMatches = matches.slice(0, VISIBLE_TITLES);
  const hiddenInList = Math.min(matches.length, TOTAL_PAPERS) - visibleMatches.length;

  return (
    <div className="flex flex-col items-center gap-7">
      {/* The constellation itself.
          gridTemplateColumns is set inline so we can drive it from the COLS
          constant — Tailwind's default cols utilities only go to 12. */}
      <div
        className="grid gap-[3px] sm:gap-2"
        style={{ gridTemplateColumns: `repeat(${COLS}, auto)` }}
      >
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

      {/* Numbered title list. Numbers correspond to badges on the lit papers
          above. Each entry is a deep link via Text Fragments to the first
          snippet's match. Capped at VISIBLE_TITLES so 30+ matches don't push
          the snippet cards down a screen. */}
      {state === "showing" && matches.length > 0 && (
        <ol className="flex w-full max-w-md flex-col gap-1.5">
          {visibleMatches.map((match, i) => {
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
          {hiddenInList > 0 && (
            <li
              className="animate-fade pl-6 pt-1 text-[12.5px] italic text-ink-500"
              style={{ animationDelay: `${TITLE_LIST_BASE_DELAY_MS + visibleMatches.length * REVEAL_STAGGER_MS}ms` }}
            >
              + {hiddenInList} more — see snippets below.
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
  // moves across the grid. While showing, lit papers reveal in stagger
  // order (capped) and unmatched papers recede simultaneously — the eye
  // lands on the lit ones because the recede has no per-paper delay.
  const revealDelay = showing && lit
    ? Math.min(litIndex, REVEAL_STAGGER_CAP) * REVEAL_STAGGER_MS
    : 0;
  const shimmerDelay = !showing ? slot * SHIMMER_STAGGER_MS : 0;

  return (
    <div
      className="relative transition-transform duration-700 ease-editorial"
      style={{
        transform: `rotate(${rotation}deg) ${
          showing && lit ? "scale(1.18)" : showing ? "scale(0.86)" : "scale(1)"
        }`,
        transitionDelay: `${revealDelay}ms`,
      }}
    >
      <svg
        viewBox="0 0 24 32"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`block h-7 w-5 transition-[color,opacity,filter] duration-700 ease-editorial sm:h-10 sm:w-7 ${
          showing
            ? lit
              ? "text-accent-600 opacity-100 drop-shadow-[0_3px_10px_rgba(180,94,44,0.32)]"
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
          className="animate-fade absolute -right-1.5 -top-1.5 inline-flex h-[14px] min-w-[14px] items-center justify-center rounded-full bg-accent-700 px-1 font-mono text-[8.5px] font-medium text-ink-50 shadow-soft sm:h-[16px] sm:min-w-[16px] sm:text-[9px]"
          style={{ animationDelay: `${revealDelay + NUMBER_BADGE_DELAY_MS}ms` }}
        >
          {number}
        </span>
      )}
    </div>
  );
}
