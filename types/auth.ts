export interface RegisterRequest {
  email: string;
  password: string;
  /** Captured on /account after registration so the first account screen starts blank and focused. */
  creatorName?: string;
  /** The curator name. Optional at registration; /account captures the real value before setup completes. */
  editorName?: string;
  /** Optional raw landing-page handoff to preserve until /publications/new confirmation. */
  publicationUrl?: string;
}

export interface RegisterVerificationResponse {
  requiresEmailVerification: true;
  email: string;
  delivery: "email" | "console";
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetRequestResponse {
  ok: true;
  delivery?: "email" | "console";
}

export interface PasswordResetConfirmRequest {
  email: string;
  token: string;
  password: string;
}

export interface UserProfile {
  id: string;
  email: string | null;
  /** ISO timestamp when the account email was verified. */
  emailVerified: string | null;
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
