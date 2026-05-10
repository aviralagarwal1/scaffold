import type {
  CreateWorkspaceRequest,
  CreateWorkspaceResponse,
  WorkspaceOverview,
} from "@/types/workspace";
import type { PostSummary } from "@/types/post";
import type {
  AskRequest,
  AskResponse,
  DistributionPlatform,
  DistributionRequest,
  DraftFeedbackRequest,
  DraftFeedbackResponse,
  GrammarAuditResponse,
  GrammarIssue,
  IdeasResponse,
  PromptSuggestionsRequest,
  PromptSuggestionsResponse,
  RepurposeDraft,
  RepurposeDraftStatus,
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

export const api = {
  createWorkspace(body: CreateWorkspaceRequest) {
    return request<CreateWorkspaceResponse>("/api/workspaces", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
  getWorkspace(token: string) {
    return request<WorkspaceOverview>(`/api/workspaces/${encodeURIComponent(token)}`);
  },
  ingest(token: string) {
    return request<{ status: string }>(`/api/workspaces/${encodeURIComponent(token)}/ingest`, {
      method: "POST",
    });
  },
  listPosts(token: string) {
    return request<PostSummary[]>(`/api/workspaces/${encodeURIComponent(token)}/posts`);
  },
  ask(token: string, body: AskRequest) {
    return request<AskResponse>(`/api/workspaces/${encodeURIComponent(token)}/ask`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
  draftFeedback(token: string, body: DraftFeedbackRequest) {
    return request<DraftFeedbackResponse>(`/api/workspaces/${encodeURIComponent(token)}/draft-feedback`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
  ideas(token: string, body?: { focus?: string }) {
    return request<IdeasResponse>(`/api/workspaces/${encodeURIComponent(token)}/ideas`, {
      method: "POST",
      body: JSON.stringify(body ?? {}),
    });
  },
  promptSuggestions(token: string, body?: PromptSuggestionsRequest) {
    return request<PromptSuggestionsResponse>(
      `/api/workspaces/${encodeURIComponent(token)}/prompt-suggestions`,
      {
        method: "POST",
        body: JSON.stringify(body ?? {}),
      },
    );
  },
  generateDistribution(token: string, body: DistributionRequest) {
    return request<{ drafts: RepurposeDraft[] }>(
      `/api/workspaces/${encodeURIComponent(token)}/distribution`,
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
    return request<RepurposeDraft[]>(`/api/workspaces/${encodeURIComponent(token)}/repurpose-drafts${tail}`);
  },
  updateDraft(token: string, draftId: string, body: Partial<Pick<RepurposeDraft, "status" | "content" | "title">>) {
    return request<RepurposeDraft>(
      `/api/workspaces/${encodeURIComponent(token)}/repurpose-drafts/${encodeURIComponent(draftId)}`,
      {
        method: "PATCH",
        body: JSON.stringify(body),
      },
    );
  },
  deleteDraft(token: string, draftId: string) {
    return request<{ ok: true }>(
      `/api/workspaces/${encodeURIComponent(token)}/repurpose-drafts/${encodeURIComponent(draftId)}`,
      {
        method: "DELETE",
      },
    );
  },
  grammarAudit(token: string, body?: { postId?: string }) {
    return request<GrammarAuditResponse>(`/api/workspaces/${encodeURIComponent(token)}/grammar-audit`, {
      method: "POST",
      body: JSON.stringify(body ?? {}),
    });
  },
  grammarIssues(token: string) {
    return request<GrammarIssue[]>(`/api/workspaces/${encodeURIComponent(token)}/grammar-issues`);
  },
  search(token: string, body: SearchRequest) {
    return request<SearchResponse>(`/api/workspaces/${encodeURIComponent(token)}/search`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },
};
