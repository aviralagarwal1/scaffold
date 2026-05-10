import { randomBytes } from "crypto";
import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/server/db";
import { profiles, users, verificationTokens } from "@/lib/server/db/schema";
import { AppError } from "@/lib/server/errors";
import { escapeHtml, requireEmail } from "./email";

const TOKEN_BYTES = 32;
const TOKEN_TTL_MS = 1000 * 60 * 60 * 24;

export type VerificationEmailDelivery = "email" | "console";
export type VerificationResult =
  | { kind: "account" }
  | { kind: "registration"; email: string; publicationUrl: string | null };

type PendingRegistration = {
  passwordHash: string;
  publicationUrl: string | null;
};

export async function sendVerificationForEmail(
  email: string,
): Promise<{ delivery: VerificationEmailDelivery }> {
  const normalizedEmail = requireEmail(email);
  const token = randomBytes(TOKEN_BYTES).toString("base64url");
  const expires = new Date(Date.now() + TOKEN_TTL_MS);
  const db = getDb();

  await db
    .delete(verificationTokens)
    .where(eq(verificationTokens.identifier, verificationIdentifier(normalizedEmail)));

  await db.insert(verificationTokens).values({
    identifier: verificationIdentifier(normalizedEmail),
    token,
    expires,
  });

  return sendVerificationEmail(normalizedEmail, verificationUrl(normalizedEmail, token));
}

export async function sendRegistrationVerification({
  email,
  passwordHash,
  publicationUrl,
}: {
  email: string;
  passwordHash: string;
  publicationUrl?: string | null;
}): Promise<{ delivery: VerificationEmailDelivery }> {
  const normalizedEmail = requireEmail(email);
  const token = randomBytes(TOKEN_BYTES).toString("base64url");
  const expires = new Date(Date.now() + TOKEN_TTL_MS);
  const db = getDb();
  const payload: PendingRegistration = {
    passwordHash,
    publicationUrl: publicationUrl?.trim() || null,
  };

  await db
    .delete(verificationTokens)
    .where(sql`starts_with(${verificationTokens.identifier}, ${pendingRegistrationPrefix(normalizedEmail)})`);

  await db.insert(verificationTokens).values({
    identifier: pendingRegistrationIdentifier(normalizedEmail, payload),
    token,
    expires,
  });

  return sendVerificationEmail(normalizedEmail, verificationUrl(normalizedEmail, token));
}

export async function verifyEmailToken(email: string, token: string): Promise<VerificationResult> {
  const normalizedEmail = requireEmail(email);
  if (!token.trim()) throw new AppError("Verification link is missing a token.", 400);

  const pending = await verifyPendingRegistration(normalizedEmail, token);
  if (pending) return pending;

  const db = getDb();
  const identifier = verificationIdentifier(normalizedEmail);
  const [row] = await db
    .select({
      expires: verificationTokens.expires,
    })
    .from(verificationTokens)
    .where(and(eq(verificationTokens.identifier, identifier), eq(verificationTokens.token, token)))
    .limit(1);

  if (!row) throw new AppError("Verification link is invalid or has already been used.", 400);

  await db
    .delete(verificationTokens)
    .where(and(eq(verificationTokens.identifier, identifier), eq(verificationTokens.token, token)));

  if (row.expires.getTime() < Date.now()) {
    throw new AppError("Verification link has expired. Request a new one.", 400);
  }

  await db
    .update(users)
    .set({ emailVerified: new Date() })
    .where(eq(users.email, normalizedEmail));

  return { kind: "account" };
}
function verificationIdentifier(email: string): string {
  return `email:${email}`;
}

function pendingRegistrationPrefix(email: string): string {
  return `registration:${email}:`;
}

function pendingRegistrationIdentifier(email: string, payload: PendingRegistration): string {
  return `${pendingRegistrationPrefix(email)}${Buffer.from(JSON.stringify(payload)).toString("base64url")}`;
}

function decodePendingRegistrationIdentifier(email: string, identifier: string): PendingRegistration {
  const encoded = identifier.slice(pendingRegistrationPrefix(email).length);
  try {
    const parsed = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as Partial<PendingRegistration>;
    if (!parsed.passwordHash) throw new Error("missing fields");
    return {
      passwordHash: parsed.passwordHash,
      publicationUrl: typeof parsed.publicationUrl === "string" ? parsed.publicationUrl : null,
    };
  } catch {
    throw new AppError("Verification link is invalid or has already been used.", 400);
  }
}

async function verifyPendingRegistration(email: string, token: string): Promise<VerificationResult | null> {
  const db = getDb();
  const prefix = pendingRegistrationPrefix(email);
  const [row] = await db
    .select({
      identifier: verificationTokens.identifier,
      expires: verificationTokens.expires,
    })
    .from(verificationTokens)
    .where(and(sql`starts_with(${verificationTokens.identifier}, ${prefix})`, eq(verificationTokens.token, token)))
    .limit(1);

  if (!row) return null;

  await db
    .delete(verificationTokens)
    .where(and(eq(verificationTokens.identifier, row.identifier), eq(verificationTokens.token, token)));

  if (row.expires.getTime() < Date.now()) {
    throw new AppError("Verification link has expired. Request a new one.", 400);
  }

  const payload = decodePendingRegistrationIdentifier(email, row.identifier);
  await db.transaction(async (tx) => {
    const [existing] = await tx.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (existing) throw new AppError("An account already exists for that email.", 409);

    const [user] = await tx
      .insert(users)
      .values({
        email,
        passwordHash: payload.passwordHash,
        emailVerified: new Date(),
      })
      .returning({ id: users.id });

    await tx.insert(profiles).values({ userId: user.id });
  });

  return { kind: "registration", email, publicationUrl: payload.publicationUrl };
}

function verificationUrl(email: string, token: string): string {
  const baseUrl = process.env.APP_BASE_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
  const url = new URL("/api/auth/verify-email", baseUrl);
  url.searchParams.set("email", email);
  url.searchParams.set("token", token);
  return url.toString();
}

async function sendVerificationEmail(
  email: string,
  url: string,
): Promise<{ delivery: VerificationEmailDelivery }> {
  const from = process.env.EMAIL_FROM || "Scaffold <onboarding@resend.dev>";
  const resendApiKey = process.env.RESEND_API_KEY;

  if (!resendApiKey) {
    console.info(`Scaffold email verification link for ${email}: ${url}`);
    return { delivery: "console" };
  }

  const response = await fetch("https://api.resend.com/emails", {
    signal: AbortSignal.timeout(15_000),
    method: "POST",
    headers: {
      authorization: `Bearer ${resendApiKey}`,
      "content-type": "application/json",
      "user-agent": "Scaffold/0.1",
    },
    body: JSON.stringify({
      from,
      to: email,
      subject: "Verify your Scaffold account",
      headers: {
        "X-Entity-Ref-ID": randomBytes(16).toString("hex"),
      },
      text: [
        "Welcome to Scaffold.",
        "",
        "Confirm this email address to finish setting up your account and open your publication workspace.",
        "",
        url,
        "",
        "This link expires in 24 hours. If you did not request this, you can ignore this email.",
      ].join("\n"),
      html: [
        '<div style="font-family: Georgia, Cambria, serif; color: #22201d; line-height: 1.55;">',
        "<p>Welcome to Scaffold.</p>",
        "<p>Confirm this email address to finish setting up your account and open your publication workspace.</p>",
        `<p><a href="${escapeHtml(url)}" style="display: inline-block; background: #141311; color: #fbfaf6; padding: 10px 14px; border-radius: 6px; text-decoration: none;">Verify your email</a></p>`,
        '<p style="font-size: 13px; color: #777163;">This link expires in 24 hours. If you did not request this, you can ignore this email.</p>',
        "</div>",
      ].join(""),
    }),
  });

  if (!response.ok) {
    console.error("Resend verification email failed", await response.text());
    throw new AppError("Could not send verification email.", 502);
  }

  return { delivery: "email" };
}
