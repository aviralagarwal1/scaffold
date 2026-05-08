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

/** A remark attached to a line in a stored post. The post itself is not edited. */
export interface PostNote {
  id: string;
  workspaceId: string;
  postId: string;
  quote: string;
  prefix: string;
  suffix: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

/** A note with its source title for workspace-wide navigation. */
export interface WorkspaceNote extends PostNote {
  postTitle: string;
}

export interface PostReader {
  post: Post;
  notes: PostNote[];
}

export interface CreatePostNoteRequest {
  quote: string;
  prefix?: string;
  suffix?: string;
  body: string;
}

export interface UpdatePostNoteRequest {
  body: string;
}

export interface PostChunk {
  id: string;
  workspaceId: string;
  postId: string;
  chunkIndex: number;
  content: string;
  createdAt: string;
}
