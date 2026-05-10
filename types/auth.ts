export interface RegisterRequest {
  email: string;
  password: string;
  /** Captured on /account after registration so the first account screen starts blank and focused. */
  creatorName?: string;
  /** The curator name. Optional at registration; /account captures the real value before setup completes. */
  editorName?: string;
}

export interface UserProfile {
  id: string;
  email: string | null;
  /** The creator's real name. */
  creatorName: string;
  /** The account-wide curator name. */
  editorName: string;
}

/** PATCH /api/me payload. Both fields are optional so callers can update one at a time. */
export interface UpdateProfileRequest {
  creatorName?: string;
  editorName?: string;
}
