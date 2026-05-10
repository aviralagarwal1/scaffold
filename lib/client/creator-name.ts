// Creator-name rules. Looser than the curator: real names are messy.
// Allow letters, spaces, hyphens, apostrophes; reject digits and other
// punctuation. 1–60 chars. No requirement on capitalization — let the
// user write their name however they write it.

export const CREATOR_NAME_MIN = 1;
export const CREATOR_NAME_MAX = 60;

export function sanitizeCreatorAsTyped(value: string): string {
  return value
    // Strip anything that isn't a letter, space, hyphen, or apostrophe.
    .replace(/[^\p{L}\s'\-]/gu, "")
    // Collapse runs of whitespace so "  Avi  " never makes it past the
    // input. The user can still hit space between names.
    .replace(/\s+/g, " ")
    .slice(0, CREATOR_NAME_MAX);
}

export type CreatorNameError = "empty" | "too-short" | "too-long";

export interface CreatorNameValidation {
  ok: boolean;
  error: CreatorNameError | null;
  message: string | null;
}

export function validateCreatorName(value: string): CreatorNameValidation {
  const trimmed = value.trim();
  if (trimmed.length === 0) return fail("empty", "What should we call you?");
  if (trimmed.length < CREATOR_NAME_MIN) return fail("too-short", "A bit more, please.");
  if (trimmed.length > CREATOR_NAME_MAX) return fail("too-long", `Keep it under ${CREATOR_NAME_MAX} characters.`);
  return { ok: true, error: null, message: null };
}

function fail(error: CreatorNameError, message: string): CreatorNameValidation {
  return { ok: false, error, message };
}
