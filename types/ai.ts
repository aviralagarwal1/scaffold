export interface SourceCitation {
  title: string;
  url: string;
  publishedAt: string | null;
  snippet: string;
}

export interface AskRequest {
  message: string;
}

export interface AskResponse {
  answer: string;
  sources: SourceCitation[];
}

export interface DraftFeedbackRequest {
  draft: string;
  focus?: string[];
}

export interface DraftFeedbackResponse {
  feedback: string;
  sources: SourceCitation[];
}

export interface Idea {
  title: string;
  thesis: string;
  lens: string;
  whyItFits: string;
  relatedPosts: SourceCitation[];
}

export interface IdeasResponse {
  sections: {
    name: string;
    ideas: Idea[];
  }[];
}

export interface PromptSuggestionsRequest {
  excludePrompts?: string[];
  count?: number;
}

export interface PromptSuggestionsResponse {
  prompts: string[];
  source: "model" | "fallback";
}

export type DistributionPlatform = "twitter" | "linkedin" | "reddit" | "facebook" | "instagram";
// "pending" replaces the older "generated" — same lifecycle slot, clearer intent.
export type RepurposeDraftStatus = "pending" | "saved" | "deleted";

export interface DistributionRequest {
  postId: string;
  platform: DistributionPlatform;
}

export interface RepurposeDraft {
  id: string;
  workspaceId: string;
  postId: string | null;
  platform: DistributionPlatform;
  status: RepurposeDraftStatus;
  title: string | null;
  content: string;
  sourcePostTitle: string | null;
  sourcePostUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GrammarIssue {
  id: string;
  workspaceId: string;
  postId: string | null;
  postTitle: string | null;
  issueType: string;
  severity: "low" | "medium" | "high";
  originalText: string;
  suggestedText: string | null;
  explanation: string;
  createdAt: string;
}

export interface GrammarAuditResponse {
  summary: string;
  issues: GrammarIssue[];
}

// Literal substring search across post content. Not vector / semantic —
// the user types a phrase, the backend does case-insensitive substring match
// across posts.content_text and returns snippets with surrounding context.
export interface SearchRequest {
  query: string;
}

export interface SearchSnippet {
  before: string; // plain text before the match (~60 chars)
  match: string;  // the matched text (cased as it appears in the post)
  after: string;  // plain text after the match (~60 chars)
}

export interface SearchResult {
  postId: string;
  postTitle: string;
  postUrl: string;
  publishedAt: string | null;
  matchCount: number;       // total matches in this post
  snippets: SearchSnippet[]; // up to N (e.g., 3) representative snippets
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
  totalMatches: number;
  totalPosts: number;
}

export interface ApiError {
  error: string;
}
