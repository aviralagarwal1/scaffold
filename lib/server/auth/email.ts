import { AppError } from "@/lib/server/errors";

// Email handling shared by registration, verification, sign-in, and password
// reset. All four had their own normalizer, two of them byte-identical, and
// the sign-in copy silently returned null where the others threw.

/** Lenient parse for paths that treat a bad address as "no match", like sign-in. */
export function parseEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return email.includes("@") ? email : null;
}

/** Strict parse for paths that should tell the caller what went wrong. */
export function requireEmail(value: unknown): string {
  const email = parseEmail(value);
  if (!email) throw new AppError("Enter a valid email address.", 400);
  return email;
}

/** Escape interpolated values before they go into an HTML email body. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
