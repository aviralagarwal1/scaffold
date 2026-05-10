import type { PostSummary } from "./post";

export type WorkspaceStatus = "pending" | "ingesting" | "ready" | "failed" | "partial";

export interface ArchiveTheme {
  label: string;
  description: string;
  evidencePostIds: string[];
  confidence: number;
  level?: "field" | "subtheme" | "motif";
  parentLabel?: string | null;
  aliases?: string[];
  importance?: number;
  breadth?: number;
}

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
  archiveThemes?: ArchiveTheme[];
  customThemes?: string[];
}

export interface WorkspaceOverview {
  token: string;
  publicationName: string | null;
  publicationUrl: string;
  status: WorkspaceStatus;
  postCount: number;
  latestPost: PostSummary | null;
  topThemes: string[];
  archiveThemes: ArchiveTheme[];
  customThemes: string[];
  lastIngestedAt: string | null;
  ingestionError: string | null;
}

export type WorkspaceVerificationStatus = "unverified" | "pending" | "verified";
export type WorkspaceRole = "owner" | "editor" | "viewer";

export interface AccountWorkspaceSummary {
  id: string;
  token: string | null;
  publicationUrl: string;
  publicationName: string | null;
  status: WorkspaceStatus;
  verificationStatus: WorkspaceVerificationStatus;
  role: WorkspaceRole;
  createdAt: string;
  updatedAt: string;
  lastIngestedAt: string | null;
  workspaceUrl: string;
}

export interface CreateWorkspaceRequest {
  publicationUrl: string;
}

export interface CreateWorkspaceResponse {
  token: string;
  workspaceUrl: string;
  status: WorkspaceStatus;
}

export interface UpdateWorkspaceRequest {
  publicationName?: string;
}
