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

export interface ApiError {
  error: string;
}
