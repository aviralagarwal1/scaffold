import type { AccountPlanSummary } from "./workspace";

export interface RegisterRequest {
  email: string;
  password: string;
  /** Optional library identity captured on /account/profile. */
  creatorName?: string;
  /** Optional library identity captured on /account/profile. */
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
  /** The account holder's legal or personal name, separate from creator identity. */
  fullName: string | null;
  /** Optional account contact number. */
  phoneNumber: string | null;
  /** Optional public account handle, without the leading @. */
  handle: string | null;
  plan: AccountPlanSummary;
  /** The creator's real name. */
  creatorName: string;
  /** The account-wide curator name. */
  editorName: string;
}

/** PATCH /api/me payload. Both fields are optional so callers can update one at a time. */
export interface UpdateProfileRequest {
  creatorName?: string;
  editorName?: string;
  fullName?: string | null;
  phoneNumber?: string | null;
  handle?: string | null;
}
