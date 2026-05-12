import { randomBytes } from "crypto";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/server/db";
import { users, verificationTokens } from "@/lib/server/db/schema";
import { AppError } from "@/lib/server/errors";
import { hashPassword } from "./password";

const TOKEN_BYTES = 32;
const TOKEN_TTL_MS = 1000 * 60 * 30;

export type PasswordResetDelivery = "email" | "console";

export async function sendPasswordResetForEmail(email: string): Promise<{ delivery?: PasswordResetDelivery }> {
  const normalizedEmail = normalizeEmail(email);
  const db = getDb();
  const [user] = await db
    .select({ id: users.id, emailVerified: users.emailVerified })
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  if (!user?.emailVerified) return {};

  const token = randomBytes(TOKEN_BYTES).toString("base64url");
  const expires = new Date(Date.now() + TOKEN_TTL_MS);
  await db.delete(verificationTokens).where(eq(verificationTokens.identifier, resetIdentifier(normalizedEmail)));
  await db.insert(verificationTokens).values({
    identifier: resetIdentifier(normalizedEmail),
    token,
    expires,
  });

  return sendPasswordResetEmail(normalizedEmail, resetUrl(normalizedEmail, token));
}

export async function resetPasswordWithToken(email: string, token: string, password: string): Promise<void> {
  const normalizedEmail = normalizeEmail(email);
  const cleanToken = token.trim();
  if (!cleanToken) throw new AppError("Reset link is missing a token.", 400);
  if (password.length < 8) throw new AppError("Password must be at least 8 characters.", 400);

  const db = getDb();
  const identifier = resetIdentifier(normalizedEmail);
  const [row] = await db
    .select({ expires: verificationTokens.expires })
    .from(verificationTokens)
    .where(and(eq(verificationTokens.identifier, identifier), eq(verificationTokens.token, cleanToken)))
    .limit(1);

  if (!row) throw new AppError("Reset link is invalid or has already been used.", 400);

  await db
    .delete(verificationTokens)
    .where(and(eq(verificationTokens.identifier, identifier), eq(verificationTokens.token, cleanToken)));

  if (row.expires.getTime() < Date.now()) {
    throw new AppError("Reset link has expired. Request a new one.", 400);
  }

  const passwordHash = await hashPassword(password);
  const [updated] = await db
    .update(users)
    .set({ passwordHash })
    .where(eq(users.email, normalizedEmail))
    .returning({ id: users.id });
  if (!updated) throw new AppError("Reset link is invalid or has already been used.", 400);
}

function normalizeEmail(value: string): string {
  const email = value.trim().toLowerCase();
  if (!email || !email.includes("@")) throw new AppError("Enter a valid email address.", 400);
  return email;
}

function resetIdentifier(email: string): string {
  return `password-reset:${email}`;
}

function resetUrl(email: string, token: string): string {
  const baseUrl = process.env.APP_BASE_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
  const url = new URL("/reset-password", baseUrl);
  url.searchParams.set("email", email);
  url.searchParams.set("token", token);
  return url.toString();
}

async function sendPasswordResetEmail(
  email: string,
  url: string,
): Promise<{ delivery: PasswordResetDelivery }> {
  const from = process.env.EMAIL_FROM || "Scaffold <onboarding@resend.dev>";
  const resendApiKey = process.env.RESEND_API_KEY;

  if (!resendApiKey) {
    console.info(`Scaffold password reset link for ${email}: ${url}`);
    return { delivery: "console" };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${resendApiKey}`,
      "content-type": "application/json",
      "user-agent": "Scaffold/0.1",
    },
    body: JSON.stringify({
      from,
      to: email,
      subject: "Reset your Scaffold password",
      headers: {
        "X-Entity-Ref-ID": randomBytes(16).toString("hex"),
      },
      text: [
        "Reset your Scaffold password.",
        "",
        "Use this link to choose a new password:",
        "",
        url,
        "",
        "This link expires in 30 minutes. If you did not request this, you can ignore this email.",
      ].join("\n"),
      html: [
        '<div style="font-family: Georgia, Cambria, serif; color: #22201d; line-height: 1.55;">',
        "<p>Reset your Scaffold password.</p>",
        "<p>Use this link to choose a new password.</p>",
        `<p><a href="${escapeHtml(url)}" style="display: inline-block; background: #141311; color: #fbfaf6; padding: 10px 14px; border-radius: 6px; text-decoration: none;">Reset password</a></p>`,
        '<p style="font-size: 13px; color: #777163;">This link expires in 30 minutes. If you did not request this, you can ignore this email.</p>',
        "</div>",
      ].join(""),
    }),
  });

  if (!response.ok) {
    console.error("Resend password reset email failed", await response.text());
    throw new AppError("Could not send password reset email.", 502);
  }

  return { delivery: "email" };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
