import type { Post } from "@/types/post";

// Post identity helpers.
//
// A publication feed is a rolling window: the same post can come back with a
// changed URL, a reworded title, or a new tracking suffix. Matching an
// incoming post to a stored one has to tolerate that, so both the sync path
// and the store compare posts through these normalizers rather than raw
// strings. They lived in two files with drifting copies before this module.

export function normalizePostTitle(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^\w\s-]/g, "")
    .trim();
}

export function normalizePostUrl(value: string): string {
  return value
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/$/, "")
    .trim();
}

/**
 * Index posts by a derived key, dropping any key that more than one post
 * claims. An ambiguous match is worse than no match: it would overwrite the
 * wrong stored post during a sync.
 */
export function uniquePostMap(posts: Post[], keyForPost: (post: Post) => string): Map<string, Post> {
  const byKey = new Map<string, Post>();
  const duplicates = new Set<string>();
  for (const post of posts) {
    const key = keyForPost(post);
    if (!key) continue;
    if (byKey.has(key)) {
      duplicates.add(key);
      continue;
    }
    byKey.set(key, post);
  }
  for (const key of duplicates) {
    byKey.delete(key);
  }
  return byKey;
}

/** Order-independent fingerprint of a set of values. */
export function signature(values: string[]): string {
  return values.filter(Boolean).sort().join("\n");
}
