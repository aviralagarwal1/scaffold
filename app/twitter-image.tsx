// Twitter shares the same composition and aspect ratio as the Open Graph
// image (1200×630 fits Twitter's "summary_large_image" card cleanly), so
// we re-export the OG handler verbatim. One source of truth for both.
export { default, alt, size, contentType } from "./opengraph-image";
