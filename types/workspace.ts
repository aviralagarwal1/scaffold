import type { PostSummary } from "./post";

export type WorkspaceStatus = "pending" | "ingesting" | "ready" | "failed" | "partial";

export interface Workspace {
  id: string;
  token: string;
  publicationUrl: string;
  publicationName: string | null;
  status: WorkspaceStatus;
  createdAt: string;
  updatedAt: string;
  lastIngestedAt: string | null;
  ingestionError: string | null;
  topThemes: string[];
}

export interface WorkspaceOverview {
  token: string;
  publicationName: string | null;
  publicationUrl: string;
  status: WorkspaceStatus;
  postCount: number;
  latestPost: PostSummary | null;
  topThemes: string[];
  lastIngestedAt: string | null;
  ingestionError: string | null;
}

export interface CreateWorkspaceRequest {
  publicationUrl: string;
}

export interface CreateWorkspaceResponse {
  token: string;
  workspaceUrl: string;
  status: WorkspaceStatus;
}
