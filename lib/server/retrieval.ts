import type { SourceCitation } from "@/types/ai";
import type { Post, PostChunk } from "@/types/post";
import { excerpt } from "./text";

// Library retrieval.
//
// Keyword scoring over stored chunks. Deliberately simple and local: no
// embedding service, no vector store, nothing to keep in sync with the
// corpus. It runs against whatever the workspace currently holds.

export interface RetrievedChunk {
  chunk: PostChunk;
  post: Post;
  score: number;
}

const BROAD_QUESTION_TERMS = ["what should", "write next", "themes", "most", "changed", "revisit", "ideas"];

function terms(value: string): string[] {
  const stop = new Set([
    "about",
    "again",
    "could",
    "should",
    "their",
    "there",
    "these",
    "those",
    "what",
    "when",
    "where",
    "which",
    "while",
    "would",
    "write",
    "your",
    "with",
    "from",
    "have",
    "this",
    "that"
  ]);

  return (value.toLowerCase().match(/\b[a-z][a-z0-9-]{2,}\b/g) ?? []).filter((term) => !stop.has(term));
}

export function retrieve(posts: Post[], chunks: PostChunk[], query: string, limit = 5): RetrievedChunk[] {
  const queryTerms = terms(query);
  const byPost = new Map(posts.map((post) => [post.id, post]));

  const scored = chunks
    .map((chunk) => {
      const post = byPost.get(chunk.postId);
      if (!post) return null;
      const text = `${post.title} ${chunk.content}`.toLowerCase();
      const score = queryTerms.reduce((total, term) => total + (text.includes(term) ? 1 : 0), 0);
      return { chunk, post, score };
    })
    .filter((item): item is RetrievedChunk => item !== null)
    .sort((a, b) => b.score - a.score);

  const broad = BROAD_QUESTION_TERMS.some((term) => query.toLowerCase().includes(term));
  const candidates = scored.filter((item) => item.score > 0);
  const latest = posts
    .slice()
    .sort((a, b) => Date.parse(b.publishedAt ?? b.createdAt) - Date.parse(a.publishedAt ?? a.createdAt))
    .slice(0, broad ? 8 : 3)
    .map((post) => {
      const chunk = chunks.find((item) => item.postId === post.id) ?? {
        id: post.id,
        workspaceId: post.workspaceId,
        postId: post.id,
        chunkIndex: 0,
        content: post.contentText,
        createdAt: post.createdAt
      };
      return { post, chunk, score: 0 };
    });

  return uniqueByPost([...candidates, ...latest]).slice(0, limit);
}

export function uniqueByPost(items: RetrievedChunk[]): RetrievedChunk[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.post.id)) return false;
    seen.add(item.post.id);
    return true;
  });
}

export function toSources(items: RetrievedChunk[]): SourceCitation[] {
  return items.map(({ post, chunk }) => ({
    title: post.title,
    url: post.url,
    publishedAt: post.publishedAt,
    snippet: excerpt(chunk.content, 260)
  }));
}
