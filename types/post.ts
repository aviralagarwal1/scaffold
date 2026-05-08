export interface Post {
  id: string;
  workspaceId: string;
  title: string;
  subtitle: string | null;
  url: string;
  publishedAt: string | null;
  author: string | null;
  contentText: string;
  contentHtml: string | null;
  wordCount: number;
  createdAt: string;
}

export interface PostSummary {
  id: string;
  title: string;
  subtitle: string | null;
  url: string;
  publishedAt: string | null;
  author: string | null;
  wordCount: number;
  excerpt: string;
}

export interface PostChunk {
  id: string;
  workspaceId: string;
  postId: string;
  chunkIndex: number;
  content: string;
  createdAt: string;
}
