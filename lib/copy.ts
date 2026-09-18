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
 * Hero headline, laid out as a three-line pyramid that tapers to the warm
 * word. Exported as parts because the landing page sets each line as its own
 * block and accents the middle one.
 *
 * It promises access, not preservation. An earlier draft said the work was
 * "still here", which answers a problem nobody has — the posts were never
 * lost, they are sitting on the publication right now. The difficulty is that
 * an archive is inert: you cannot get at it, so you never use it.
 */
export const PRODUCT_PROMISE_LINES = ["Write with", "your entire", "library."] as const;
export const PRODUCT_PROMISE = "Write with your entire library.";

/**
 * One sentence, under 160 characters so it works as a meta description.
 * Used for page metadata, social image alt text, and the Stripe listing.
 */
export const PRODUCT_DESCRIPTION =
  "Scaffold turns a publication's public archive into a private library you can search, revisit and write against, with every answer citing the post behind it.";

/** Two or three sentences, for places with room to explain: About, Support, onboarding. */
export const PRODUCT_DESCRIPTION_LONG =
  "Scaffold reads the public posts of a publication and builds them into a private library. From there you can put a question to the whole archive, get a reading on a draft, find the line you half-remember, and develop something new — with every answer pointing back to the posts it came from.";

/** Landing hero subhead. Atmosphere rather than definition. */
export const PRODUCT_SUBHEAD =
  "A working memory of everything you've written. The patterns you stopped noticing resurface, the half-finished essays reconnect, and every note cites the evidence behind it.";

/** How it works, in one line. */
export const PRODUCT_MECHANIC =
  "Paste a publication link. Scaffold reads the public posts, builds them into a library, and answers from the passages it finds there.";

/** What the product is for, in the writer's terms rather than the tool's. */
export const PRODUCT_FOR_WRITERS =
  "Most writers lose their own work. Not the files — the thread. You cannot remember what you argued four years ago, so you argue it again, slightly worse. Scaffold keeps the whole body of work within reach while you write the next piece.";

/**
 * Plan comparison rows. A scope line describes what a plan can reach, never
 * the quality of the work — the model is identical on both.
 */
export const PLAN_SCOPE = {
  free: "One library with conversation, search, and draft feedback",
  pro: "Up to three libraries with the same tools",
} as const;

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
