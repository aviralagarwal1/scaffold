// Canonical product language.
//
// Every public surface reads its wording from here: page metadata, the
// landing page, About, Support, the OG and Twitter images, and the Stripe
// product listing. Before this module the repo shipped six different
// descriptions of Scaffold and none of them matched the one in Source.md.
//
// Stripe is the only surface this file cannot reach. When PRODUCT_DESCRIPTION
// changes, update the Stripe product description by hand to match.
//
// Three rules govern everything here:
//
//   1. Never sell on the model. No "AI", no "agents", no "powered by" in
//      marketing copy. Writers are the most model-sceptical audience there
//      is, and the pitch is the archive, not the machine reading it. Plain
//      disclosure belongs on Support and in the policies, where someone
//      looking for it will find it; it is a trust obligation, not a feature.
//
//   2. No claim the product cannot support. No analytics, no audience data,
//      no "stronger memory" or "deeper analysis" on Premium. Premium buys
//      tokens and workspace slots. Nothing else.
//
//   3. A library does not have to be the reader's own — ownership is never
//      verified — but the writer is who this is for. Copy stays neutral on
//      whose archive it is rather than advertising the difference.

export const PRODUCT_NAME = "Scaffold";

/**
 * The hero headline, as one sentence. Used for social image alt text.
 *
 * The landing page sets it as a two-line pyramid with the accent on "entire",
 * which needs bespoke markup, so those words are written there rather than
 * mapped from here. Change one, change the other — they are the same claim.
 *
 * It promises access, not preservation. An earlier draft said the work was
 * "still here", which answers a problem nobody has: the posts were never
 * lost, they are sitting on the publication right now. The difficulty is that
 * a body of published work is inert — you cannot get at it, so you never use
 * it.
 */
export const PRODUCT_PROMISE = "Write with your entire library.";

/**
 * One sentence, under 160 characters so it works as a meta description.
 * Used for page metadata, social image alt text, and the Stripe listing.
 */
export const PRODUCT_DESCRIPTION =
  "Scaffold turns a publication's public posts into a private library you can search, revisit and write against, with every answer citing the post behind it.";

/** Two or three sentences, for places with room to explain: About, Support, onboarding. */
export const PRODUCT_DESCRIPTION_LONG =
  "Scaffold reads the public posts of a publication and builds them into a private library. From there you can put a question to the whole library, get a reading on a draft, find the line you half-remember, and develop something new — with every answer pointing back to the posts it came from.";

/** Landing hero subhead. Atmosphere rather than definition. */
export const PRODUCT_SUBHEAD =
  "A working memory of everything you've written. The patterns you stopped noticing resurface, the half-finished essays reconnect, and every note cites the evidence behind it.";

/** How it works, in one line. */
export const PRODUCT_MECHANIC =
  "Paste a publication link. Scaffold reads the public posts, builds them into a library, and answers from the passages it finds there.";

// ---------------------------------------------------------------------------
// Vocabulary
//
// The product names five things, and using the wrong one for the wrong level
// is how copy stops making sense. These live here rather than in a document
// because `npm run copy:audit` reads them: the terms below are published into
// docs/copy-inventory.md and the AVOID list is what the checker enforces, so
// the rules and the enforcement cannot drift apart.
//
// Pairs rather than objects so the audit script can parse them without a
// TypeScript build step.
// ---------------------------------------------------------------------------

/** The levels, outermost first. Each owns the ones below it. */
export const VOCABULARY: Array<[term: string, meaning: string]> = [
  ["Account", "One person's sign-in, name, email, plan and destructive controls. The outermost level."],
  ["Desk", "The account-level working area: every workspace you have, how many you can keep, and the way in to adding another."],
  ["Workspace", "One publication's library plus the tools that read it and the work they produce. A workspace maps to exactly one publication."],
  ["Publication", "The public source read into a workspace. Ownership is never verified, so it need not be the reader's own."],
  ["Library", "The posts Scaffold has read from a publication. What answers are drawn from and what citations point back to."],
  ["Profile", "The account holder's name. The only personal detail collected."],
  ["Plan", "Account-level subscription and usage limits. Sold in workspaces, measured in tokens."],
  ["Sync", "Rereading a publication. Workspace sync rereads all of it; post sync refreshes one existing post."],
];

/** The workspace sections, in nav order. Use these names everywhere, including empty and error states. */
export const SECTIONS: Array<[section: string, does: string]> = [
  ["Overview", "Workspace status, recent activity, library themes."],
  ["Conversation", "Put a question to the library and get an answer that cites its posts."],
  ["Feedback", "A reading on a draft, against the rest of the library."],
  ["Proofreading", "Line-level notes across stored posts."],
  ["Distribution", "Turn a post into drafts for other platforms."],
  ["Exploration", "Generate directions from recurring themes."],
  ["Search", "Find a line you half-remember."],
  ["Library", "Browse, sort and export the posts that were read."],
  ["Settings", "Publication details, sync, and deletion."],
];

/**
 * Words the product does not use, and what to reach for instead. The audit
 * script flags these on public surfaces — add here, not to the script.
 */
export const AVOID: Array<[term: string, instead: string]> = [
  ["AI", "Do not sell on the model. Say what the product does. Disclose plainly on Support, never in the pitch."],
  ["agent", "Same. It dates fast and it is the crowded category the product is trying not to sound like."],
  ["archive", "Say library, for the thing Scaffold holds. Archive survives internally in type names only."],
  ["ingest", "Say read, or sync. Ingestion is a pipeline word and writers do not think that way."],
  ["editor", "The product has no editor persona. Answers are unattributed; the mark signs them."],
  ["curator", "Retired. There is no companion persona and no name to choose."],
  ["your Substack", "Say your publication. Substack is the best-supported source, not the product boundary."],
  ["publication", "For plan capacity only: a plan is sold in workspaces. Publication is right everywhere else."],
];

/**
 * Casing. Title Case names a thing; sentence case asks for an action. The
 * audit script flags Title Case it does not recognise as a heading.
 */
export const CASING: Array<[context: string, rule: string]> = [
  ["Route headlines", "Title Case, no trailing period. Account, Desk, Premium Plan."],
  ["Section and card headings", "Title Case. Usage, Danger Zone, Monthly Plans."],
  ["Dialog titles", "Title Case. Delete Account, Delete Publication."],
  ["Buttons, links, CTAs", "Sentence case. Sign in, Sign out, Manage billing, Open desk, Continue."],
  ["Statuses, helper text, validation", "Sentence case, ending in a period when it is a sentence."],
  ["Dropdown rows", "Destinations keep their page label casing; actions take sentence case."],
  ["Paired messages", "Keep them grammatically parallel — two prompts or two commands, never one of each."],
];

/** Brand facts that copy and UI both depend on. */
export const BRAND: Array<[item: string, value: string]> = [
  ["Mark", "The section sign, outlined vector paths from Book Antiqua. Never the character § set in a font — that renders differently on every platform."],
  ["Mark colour", "#b45e2c on light ground. #7d3d1a for tiles, with the mark reversed in #fbf3ec."],
  ["Lockup", "Mark, then the wordmark in the serif at matching optical size. The mark also signs an answer on its own."],
  ["Type", "Serif for headlines and the wordmark, sans for interface, mono for metadata and captions."],
  ["Accent", "Bronze punctuates, it does not dominate. Status colours mean something; the accent does not."],
  ["Voice", "Calm, editorial, literal. No exclamation marks, no growth-marketing verbs, no promises the product cannot keep."],
];

/**
 * Plan comparison rows.
 *
 * Premium differs from Basic in exactly two ways: monthly tokens, and how
 * many workspaces you can keep. An earlier version padded the cards with a
 * third "Scope" row that restated the workspace count as prose and used three
 * words — workspace, publication, library — for one idea. Two honest rows
 * compare better than three padded ones.
 */
export function planRows(plan: { monthlyTokenLimit: number; activePublicationLimit: number }) {
  return [
    { label: "Tokens", value: formatTokenAllowance(plan.monthlyTokenLimit) },
    { label: "Workspaces", value: String(plan.activePublicationLimit) },
  ];
}

// There is deliberately no prose beneath the plan cards. "Every tool is on
// both plans" was true and actively unhelpful: it tells someone on Basic that
// they are not missing anything, which is the opposite of what a pricing
// comparison is for. The two rows already say 4x the tokens and 3x the
// workspaces, and that is the whole argument. If a line goes back here it
// should name the trigger to upgrade, not reassure the person who has not hit
// it yet.

/** How the product discloses what it does, where someone goes looking. */
export const MODEL_DISCLOSURE =
  "Scaffold sends passages from your library to Anthropic's API to compose an answer, along with your question. Your posts are not used to train any model, and your library stays private to your account.";

/** `Free` or `$8/month`. Takes cents so client and server can both call it. */
export function formatPlanPrice(priceCents: number): string {
  if (priceCents === 0) return "Free";
  return `$${(priceCents / 100).toFixed(0)}/month`;
}

/** Monthly token allowance, e.g. `500,000/month`. */
export function formatTokenAllowance(monthlyTokenLimit: number): string {
  return `${monthlyTokenLimit.toLocaleString()}/month`;
}

/**
 * Plan capacity. Always workspace/workspaces — a publication is the public
 * source read into a workspace, not the unit a plan is sold in.
 */
export function formatWorkspaceCapacity(activePublicationLimit: number): string {
  return `${activePublicationLimit.toLocaleString()} ${activePublicationLimit === 1 ? "workspace" : "workspaces"}`;
}
