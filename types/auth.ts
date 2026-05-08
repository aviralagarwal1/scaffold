import type { AccountPlanSummary } from "./workspace";

export interface RegisterRequest {
  email: string;
  password: string;
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
  /** The account holder's name. The only personal detail the product collects. */
  fullName: string | null;
  plan: AccountPlanSummary;
}

/** PATCH /api/me payload. */
export interface UpdateProfileRequest {
  fullName: string;
}
