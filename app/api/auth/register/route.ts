import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { users } from "@/lib/server/db/schema";
import { apiError, AppError } from "@/lib/server/errors";
import { readJson } from "@/lib/server/http";
import { requireEmail } from "@/lib/server/auth/email";
import { hashPassword } from "@/lib/server/auth/password";
import { sendRegistrationVerification, sendVerificationForEmail } from "@/lib/server/auth/email-verification";

type RegisterRequest = {
  email?: unknown;
  password?: unknown;
  publicationUrl?: unknown;
};

export async function POST(request: Request) {
  try {
    const body = await readJson<RegisterRequest>(request);
    const email = requireEmail(body.email);
    const password = requirePassword(body.password);
    const publicationUrl = normalizeOptionalPublicationUrl(body.publicationUrl);

    const db = getDb();
    const [existing] = await db
      .select({ id: users.id, emailVerified: users.emailVerified })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    if (existing?.emailVerified) throw new AppError("An account already exists for that email.", 409);
    if (existing && !existing.emailVerified) {
      const result = await sendVerificationForEmail(email);
      return NextResponse.json({
        requiresEmailVerification: true,
        email,
        delivery: result.delivery,
      });
    }

    const passwordHash = await hashPassword(password);
    const result = await sendRegistrationVerification({
      email,
      passwordHash,
      publicationUrl,
    });

    return NextResponse.json({
      requiresEmailVerification: true,
      email,
      delivery: result.delivery,
    });
  } catch (error) {
    return apiError(error, "Could not create account.");
  }
}
function requirePassword(value: unknown): string {
  if (typeof value !== "string" || value.length < 8) {
    throw new AppError("Password must be at least 8 characters.", 400);
  }
  return value;
}

function normalizeOptionalPublicationUrl(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new AppError("Enter a valid publication URL.", 400);
  const publicationUrl = value.trim();
  if (!publicationUrl) return null;
  if (publicationUrl.length > 2048) throw new AppError("Enter a shorter publication URL.", 400);
  return publicationUrl;
}
