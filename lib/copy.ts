// Canonical product language.
//
// Every public surface reads its wording from here: page metadata, the
// landing page, About, Support, the OG and Twitter images, and the Stripe
// product listing. Before this module the repo shipped six different
// descriptions of Scaffold and none of them matched the documented one.
//
// Stripe is the only surface this file cannot reach. When PRODUCT_DESCRIPTION
// changes, update the Stripe product description by hand to match.
//
// Three rules govern everything here:
//
//   1. Lead with what writers can do with their library. Main descriptions,
//      metadata and pitches should not position Scaffold as an "AI product"
//      or "AI-powered workspace". This is a positioning rule, not a ban on
//      discussing AI: the founder's reflection on AI and a writer's voice on
//      About is appropriate in context. Plain model disclosure belongs on
//      Support and in policies; factual technical explanations are welcome.
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
 * Hero headline parts. The landing page and the social image both lay these
 * out as two lines, with the accent on "entire". The sentence below is those
 * parts in order, and the module refuses to load if they diverge.
 *
 * It promises access, not preservation. An earlier draft said the work was
 * "still here", which answers a problem nobody has: the posts were never
 * lost, they are sitting on the publication right now. The difficulty is that
 * a body of published work is inert — you cannot get at it, so you never use
 * it.
 */
export const HERO_HEADLINE_LEAD = "Write with your";
export const HERO_HEADLINE_ACCENT = "entire";
export const HERO_HEADLINE_REST = "library.";

/** The hero headline, as one sentence. Used for social image alt text. */
export const PRODUCT_PROMISE = "Write with your entire library.";

if (`${HERO_HEADLINE_LEAD} ${HERO_HEADLINE_ACCENT} ${HERO_HEADLINE_REST}` !== PRODUCT_PROMISE) {
  throw new Error("HERO_HEADLINE parts must compose PRODUCT_PROMISE");
}

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
// Distinguish workspace structure, source content, and generated work.
// These definitions live here rather than in a document so there is one copy
// of them. `npm run copy:audit` enforces the AVOID list against every scanned
// string; the other lists are the reference docs/design.md points to.
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
  ["Writing", "Published source material, including articles and essays. Use this in tool headlines to distinguish it from social posts."],
  ["Social post", "A draft adapted from source writing for a social platform. Promotion prepares these drafts; it does not publish them."],
  ["Profile", "The account holder's name. The only personal detail collected."],
  ["Plan", "Account-level subscription and usage limits. Sold in workspaces, measured in tokens."],
  ["Sync", "Rereading a publication. Workspace sync rereads all of it; post sync refreshes one existing post."],
  ["Note", "A remark you attach to a line in a stored post. The post itself is not edited."],
];

export const WORKSPACE_OVERVIEW = {
  label: "Overview",
  description: "Workspace status, recent activity, library themes.",
} as const;

/** Section registry in navigation order. Keys are stable routes; labels require owner approval to rename.
 * Field patterns belong to docs/design.md#workspace-copy-contract.
 * Omitting ctaVerb excludes a section from Overview cards.
 */
export const WORKSPACE_PAGE_COPY = {
  ask: {
    label: "Conversation",
    title: "Ask your memory.",
    description: "Answers are grounded in passages from your library.",
    ctaVerb: "Start",
  },
  draft: {
    label: "Feedback",
    title: "Evaluate your draft.",
    description: "Suggestions are informed by the voice and structure of your published writing.",
    ctaVerb: "Get",
  },
  notes: {
    label: "Notes",
    title: "Annotate your writing.",
    description: "Notes are attached to passages in your library.",
    ctaVerb: "Add",
  },
  distribution: {
    label: "Promotion",
    title: "Share your work.",
    description: "Drafts are adapted from your writing for social platforms.",
    ctaVerb: "Create",
  },
  ideas: {
    label: "Exploration",
    title: "Develop your ideas.",
    description: "Ideas are drawn from recurring themes in your library.",
    ctaVerb: "Guide",
  },
  search: {
    label: "Search",
    title: "Find your passages.",
    description: "Matches are passages from your writing containing the words you search for.",
    ctaVerb: "Open",
  },
  library: {
    label: "Library",
    title: "Browse your collection.",
    description: "Posts are collected from your publication’s public feed.",
  },
  settings: {
    label: "Settings",
    title: "Manage your workspace.",
    description: "Settings are specific to this workspace and its publication.",
  },
} as const;

export type WorkspacePage = keyof typeof WORKSPACE_PAGE_COPY;

export type OverviewSection = {
  [Key in WorkspacePage]: typeof WORKSPACE_PAGE_COPY[Key] extends { ctaVerb: string } ? Key : never;
}[WorkspacePage];

export const WORKSPACE_TABS = [
  { slug: "", label: WORKSPACE_OVERVIEW.label },
  ...Object.entries(WORKSPACE_PAGE_COPY).map(([slug, { label }]) => ({ slug, label })),
];

/** Header utilities are destinations, with labels still owned by the section registry. */
export const WORKSPACE_UTILITY_TABS = WORKSPACE_TABS.filter(({ slug }) => slug === "library" || slug === "settings");

export const OVERVIEW_SECTIONS = (Object.keys(WORKSPACE_PAGE_COPY) as WorkspacePage[])
  .filter((key): key is OverviewSection => "ctaVerb" in WORKSPACE_PAGE_COPY[key]);

export function overviewCta(section: OverviewSection): string {
  const { ctaVerb, label } = WORKSPACE_PAGE_COPY[section];
  return `${ctaVerb} ${label.toLowerCase()}`;
}

/**
 * Words the product does not use, and what to reach for instead. The audit
 * script flags these on public surfaces — add here, not to the script.
 */
export const AVOID: Array<[term: string, instead: string]> = [
  ["AI-powered", "Lead main descriptions, metadata and pitches with what writers can do with their library. Contextual discussion of AI, including the founder's About passage, and factual model disclosure are appropriate; AI itself is not a banned word."],
  ["AI product", "Avoid this category framing in main descriptions and metadata. Explain the writing tasks and library instead; contextual discussion of AI is welcome."],
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
  ["Account destination headings", "Title Case, no trailing period. Account, Desk, Premium Plan."],
  ["Auth and onboarding headlines", "Sentence-case action with a period. Open your desk. Create your account."],
  ["Workspace tool headlines and taglines", "Sentence case with a terminal period. Field grammar, uniqueness, and shared rendering follow docs/design.md#workspace-copy-contract."],
  ["Overview card headings and descriptors", "Inherit the section's casing and punctuation under the workspace copy contract."],
  ["Overview card CTAs", "Sentence case, no terminal period. Word count and tab-label derivation follow the workspace copy contract."],
  ["Other section and card headings", "Title Case for named groups. Usage, Danger Zone, Monthly Plans. Authored post titles retain their original casing."],
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

export const NOTES_COPY = {
  loading: "Opening your posts...",
  loadError: "Could not load notes.",
  continue: "Pick up where you left off",
  lastNote: "Last note",
  posts: "Posts to annotate",
  filter: "Filter posts",
  allPosts: "All posts",
  withNotes: "With notes",
  search: "Find a post...",
  noMatches: "No posts match your search.",
  trySearch: "Try another title or a shorter phrase.",
  noNotes: "No annotated posts yet.",
  noPosts: "No posts to annotate yet.",
  syncHelp: "Sync your publication in Settings to bring posts into your library.",
  opening: "Opening this post...",
  openError: "Could not open this post.",
  saveError: "Could not save note.",
  removeError: "Could not remove note.",
  original: "Read original",
  postText: "Post text",
  openNote: "Open passage note",
  notes: "Notes",
  selectionTooLong: "Select a shorter passage (800 characters maximum).",
  addNote: "Add note",
  editNote: "Edit note",
  noteLabel: "Note",
  placeholder: "What would you like to remember or change?",
  draftWarning: "Draft recovery is unavailable. Save your note before leaving.",
  discard: "Discard",
  confirmDiscard: "Discard note?",
  saving: "Saving...",
  save: "Save note",
  emptyMargin: "No notes yet.",
  moved: "This passage could not be located in the synced post.",
  edit: "Edit",
  remove: "Remove",
  removing: "Removing...",
  annotate: "Annotate",
} as const;
