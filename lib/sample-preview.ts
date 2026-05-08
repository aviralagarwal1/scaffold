/**
 * The demo library on the landing page.
 *
 * The hero card, the sources column beneath it, and the social preview all
 * read this module. The preview keeps its own layout — the image renderer
 * only supports a slice of CSS — but a change to the question, the answer,
 * or a cited post shows up in both places on the next deploy.
 */

export const SAMPLE_PUBLICATION = "yourname.substack.com";

export const SAMPLE_SECTION_LABEL = "Ask";

export const SAMPLE_EARLIER_QUESTION = "What do I write about most?";

export const SAMPLE_QUESTION = "What makes my best posts distinctive?";

export const SAMPLE_ANSWER_WHEN = "Just now";

/** Eyebrow above the cited rows. Surfaces that shout it apply their own capitals. */
export const SAMPLE_CITATION_LABEL = "Cited from your library";

export const SAMPLE_ANSWER_LEAD = {
  before: "Across your library, your strongest pieces open with a ",
  highlight: "personal observation",
  after: " before moving into a broader product or culture argument",
};

export const SAMPLE_ANSWER_FOLLOW =
  "Your recent essays on interface design use this structure less. They read more like commentary than your best work.";

export const SAMPLE_FOLLOW_UPS = ["Which ideas am I repeating?", "Older essays to revisit?"];

// Demo posts are dated relative to today, so "recent essays" stays true and
// the landing page never shows a library that stopped a year ago. Only server
// code reads these: the landing page gets them when the server starts, and
// the static share image at build.
const DAY_MS = 86_400_000;
function daysAgo(days: number): string {
  return new Date(Date.now() - days * DAY_MS).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

export const SAMPLE_CITED_POSTS = [
  {
    date: daysAgo(12),
    title: "The interface as ideology",
    excerpt:
      "begins with a small scene at a coffee shop before the argument widens out into product critique",
  },
  {
    date: daysAgo(45),
    title: "Notes from a quiet rewrite",
    excerpt: "opens on a memory of an old draft before the voice essay turns outward",
  },
  {
    date: daysAgo(80),
    title: "Why I stopped writing reviews",
    excerpt: "personal admission anchors the broader critique of contemporary review culture",
  },
];

export type SampleCitedPost = (typeof SAMPLE_CITED_POSTS)[number];
