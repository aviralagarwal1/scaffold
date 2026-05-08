import type {
  CreateWorkspaceRequest,
  CreateWorkspaceResponse,
  AccountWorkspaceSummary,
  WorkspaceOverview,
  UpdateWorkspaceRequest,
} from "@/types/workspace";
import type {
  PasswordResetConfirmRequest,
  PasswordResetRequest,
  PasswordResetRequestResponse,
  RegisterRequest,
  RegisterVerificationResponse,
  UpdateProfileRequest,
  UserProfile,
} from "@/types/auth";
import type { CreatePostNoteRequest, UpdatePostNoteRequest, PostNote, PostReader, PostSummary, WorkspaceNote } from "@/types/post";
import type {
  AskRequest,
  AskResponse,
  ChatSession,
  DistributionPlatform,
  DistributionRequest,
  DraftFeedbackRequest,
  DraftFeedbackResponse,
  Idea,
  IdeasResponse,
  PromptSuggestionsRequest,
  PromptSuggestionsResponse,
  RepurposeDraft,
  RepurposeDraftStatus,
  SavedDraftFeedback,
  SavedIdea,
  SearchRequest,
  SearchResponse,
  ApiError,
} from "@/types/ai";

export class ApiClientError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = "ApiClientError";
  }
}

async function request<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: text };
    }
  }
  if (!res.ok) {
    const message =
      data && typeof data === "object" && "error" in (data as ApiError) && typeof (data as ApiError).error === "string"
        ? (data as ApiError).error
        : `Request failed with status ${res.status}`;
    throw new ApiClientError(message, res.status);
  }
  return data as T;
}

/** Workspace-scoped endpoint path. Every workspace call is token-scoped. */
function ws(token: string, path = ""): string {
  return `/api/workspaces/${encodeURIComponent(token)}${path}`;
}

export const api = {
  register(body: RegisterRequest) {
    return request<RegisterVerificationResponse>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
  requestPasswordReset(body: PasswordResetRequest) {
    return request<PasswordResetRequestResponse>("/api/auth/password-reset/request", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
  confirmPasswordReset(body: PasswordResetConfirmRequest) {
    return request<{ ok: true }>("/api/auth/password-reset/confirm", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
  me() {
    return request<UserProfile>("/api/me");
  },
  updateProfile(body: UpdateProfileRequest) {
    return request<UserProfile>("/api/me", {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },
  deleteAccount() {
    return request<{ ok: true }>("/api/me", {
      method: "DELETE",
    });
  },
  createCheckoutSession() {
    return request<{ url: string }>("/api/billing/checkout", {
      method: "POST",
    });
  },
  createBillingPortalSession() {
    return request<{ url: string }>("/api/billing/portal", {
      method: "POST",
    });
  },
  createWorkspace(body: CreateWorkspaceRequest) {
    return request<CreateWorkspaceResponse>("/api/workspaces", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
  listWorkspaces() {
    return request<AccountWorkspaceSummary[]>("/api/workspaces");
  },
  getWorkspace(token: string) {
    return request<WorkspaceOverview>(ws(token));
  },
  updateWorkspace(token: string, body: UpdateWorkspaceRequest) {
    return request<WorkspaceOverview>(ws(token), {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },
  deleteWorkspace(token: string) {
    return request<{ ok: true }>(ws(token), {
      method: "DELETE",
    });
  },
  ingest(token: string) {
    return request<{ status: string }>(ws(token, "/ingest"), {
      method: "POST",
    });
  },
  listPosts(token: string) {
    return request<PostSummary[]>(ws(token, "/posts"));
  },
  listNotes(token: string) {
    return request<WorkspaceNote[]>(ws(token, "/notes"));
  },
  getPost(token: string, postId: string) {
    return request<PostReader>(ws(token, `/posts/${encodeURIComponent(postId)}`));
  },
  addPostNote(token: string, postId: string, body: CreatePostNoteRequest) {
    return request<PostNote>(ws(token, `/posts/${encodeURIComponent(postId)}/notes`), {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
  updatePostNote(token: string, postId: string, noteId: string, body: UpdatePostNoteRequest) {
    return request<PostNote>(ws(token, `/posts/${encodeURIComponent(postId)}/notes/${encodeURIComponent(noteId)}`), {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  },
  deletePostNote(token: string, postId: string, noteId: string) {
    return request<{ ok: true }>(
      ws(token, `/posts/${encodeURIComponent(postId)}/notes/${encodeURIComponent(noteId)}`),
      { method: "DELETE" },
    );
  },
  syncPost(token: string, postId: string) {
    return request<PostSummary>(
      ws(token, `/posts/${encodeURIComponent(postId)}/sync`),
      { method: "POST" },
    );
  },
  ask(token: string, body: AskRequest) {
    return request<AskResponse>(ws(token, "/ask"), {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
  listChatSessions(token: string) {
    return request<ChatSession[]>(ws(token, "/chat-sessions"));
  },
  deleteChatSession(token: string, sessionId: string) {
    return request<{ ok: true }>(
      ws(token, `/chat-sessions/${encodeURIComponent(sessionId)}`),
      { method: "DELETE" },
    );
  },
  draftFeedback(token: string, body: DraftFeedbackRequest) {
    return request<DraftFeedbackResponse>(ws(token, "/draft-feedback"), {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
  listDraftFeedback(token: string) {
    return request<SavedDraftFeedback[]>(ws(token, "/draft-feedback"));
  },
  deleteDraftFeedback(token: string, reviewId: string) {
    return request<{ ok: true }>(
      ws(token, `/draft-feedback/${encodeURIComponent(reviewId)}`),
      { method: "DELETE" },
    );
  },
  ideas(token: string, body?: { focus?: string }) {
    return request<IdeasResponse>(ws(token, "/ideas"), {
      method: "POST",
      body: JSON.stringify(body ?? {}),
    });
  },
  updateCustomThemes(token: string, labels: string[]) {
    return request<{ customThemes: string[] }>(ws(token, "/custom-themes"), {
      method: "PUT",
      body: JSON.stringify({ labels }),
    });
  },
  listSavedIdeas(token: string) {
    return request<SavedIdea[]>(ws(token, "/saved-ideas"));
  },
  saveIdea(token: string, idea: Idea) {
    return request<SavedIdea>(ws(token, "/saved-ideas"), {
      method: "POST",
      body: JSON.stringify({ idea }),
    });
  },
  deleteSavedIdea(token: string, ideaId: string) {
    return request<{ ok: true }>(ws(token, `/saved-ideas/${encodeURIComponent(ideaId)}`), {
      method: "DELETE",
    });
  },
  promptSuggestions(token: string, body?: PromptSuggestionsRequest) {
    return request<PromptSuggestionsResponse>(
      ws(token, "/prompt-suggestions"),
      {
        method: "POST",
        body: JSON.stringify(body ?? {}),
      },
    );
  },
  generateDistribution(token: string, body: DistributionRequest) {
    return request<{ drafts: RepurposeDraft[] }>(
      ws(token, "/distribution"),
      {
        method: "POST",
        body: JSON.stringify(body),
      },
    );
  },
  listDrafts(token: string, opts?: { platform?: DistributionPlatform; status?: RepurposeDraftStatus }) {
    const qs = new URLSearchParams();
    if (opts?.platform) qs.set("platform", opts.platform);
    if (opts?.status) qs.set("status", opts.status);
    const tail = qs.toString() ? `?${qs.toString()}` : "";
    return request<RepurposeDraft[]>(ws(token, `/repurpose-drafts${tail}`));
  },
  updateDraft(token: string, draftId: string, body: Partial<Pick<RepurposeDraft, "status" | "content" | "title">>) {
    return request<RepurposeDraft>(
      ws(token, `/repurpose-drafts/${encodeURIComponent(draftId)}`),
      {
        method: "PATCH",
        body: JSON.stringify(body),
      },
    );
  },
  deleteDraft(token: string, draftId: string) {
    return request<{ ok: true }>(
      ws(token, `/repurpose-drafts/${encodeURIComponent(draftId)}`),
      {
        method: "DELETE",
      },
    );
  },
  search(token: string, body: SearchRequest) {
    return request<SearchResponse>(ws(token, "/search"), {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
};
