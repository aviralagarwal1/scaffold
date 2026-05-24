// Creator-name rules. Reused by /onboarding, /account, and the workspace
// settings page so a name accepted in one place is accepted in all of them.
//
// Rules:
//   - one word with letters only
//   - first character must be an uppercase letter
//   - last character must be a lowercase letter
//   - 2-24 characters
//
// Mid-word capitals are intentionally allowed so names like "McKenna" and
// "DeAngela" pass. Diacritics pass too: regex uses Unicode property escapes.

export const CREATOR_NAME_MIN = 2;
export const CREATOR_NAME_MAX = 24;

/** Keep the keyboard permissive. Numbers, spaces, and symbols are allowed
 *  while typing, then caught by validation on save so the form can explain
 *  the one-word rule. */
export function sanitizeCreatorAsTyped(value: string): string {
  return value.slice(0, CREATOR_NAME_MAX);
}

export type CreatorNameError =
  | "empty"
  | "too-short"
  | "too-long"
  | "has-non-letters"
  | "needs-capital-first"
  | "needs-lowercase-last";

export interface CreatorNameValidation {
  ok: boolean;
  error: CreatorNameError | null;
  message: string | null;
}

export function validateCreatorName(value: string): CreatorNameValidation {
  const trimmed = value;
  if (trimmed.length === 0) return fail("empty", "What should we call you?");
  if (trimmed.length < CREATOR_NAME_MIN) return fail("too-short", "Use at least two letters.");
  if (trimmed.length > CREATOR_NAME_MAX) return fail("too-long", `Keep it to ${CREATOR_NAME_MAX} letters.`);

  // Non-letters are typeable but not allowed in the final name. Caught here
  // so the user gets a specific message instead of a generic capitalization
  // error when they typed "1Margot", "Mar got", or "Mar@got".
  if (/[^\p{L}]/u.test(trimmed)) {
    return fail("has-non-letters", "Use one word with letters only. No spaces, numbers, or symbols.");
  }

  const first = trimmed[0];
  if (!isUpper(first)) return fail("needs-capital-first", "Start with a capital letter.");

  const last = trimmed[trimmed.length - 1];
  if (!isLower(last)) return fail("needs-lowercase-last", "End with a lowercase letter.");

  return { ok: true, error: null, message: null };
}

function isUpper(ch: string): boolean {
  return /\p{Lu}/u.test(ch);
}
function isLower(ch: string): boolean {
  return /\p{Ll}/u.test(ch);
}
function fail(error: CreatorNameError, message: string): CreatorNameValidation {
  return { ok: false, error, message };
}
