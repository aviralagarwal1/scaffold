/**
 * Dynamic route segments, which the App Router hands to a handler as a
 * promise. Every workspace route re-declared this shape locally.
 */
export type RouteContext<TParams> = { params: Promise<TParams> };
