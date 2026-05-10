import { NextResponse } from "next/server";
import { requireCurrentUserId } from "@/lib/server/auth/current";
import { sendVerificationForEmail } from "@/lib/server/auth/email-verification";
import { getDb } from "@/lib/server/db";
import { users } from "@/lib/server/db/schema";
import { apiError, AppError } from "@/lib/server/errors";
import { eq } from "drizzle-orm";

export async function POST() {
  try {
    const userId = await requireCurrentUserId();
    const db = getDb();
    const [user] = await db
      .select({
        email: users.email,
        emailVerified: users.emailVerified,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user?.email) throw new AppError("Email address not found.", 404);
    if (user.emailVerified) return NextResponse.json({ ok: true, alreadyVerified: true });

    const result = await sendVerificationForEmail(user.email);
    return NextResponse.json({ ok: true, alreadyVerified: false, delivery: result.delivery });
  } catch (error) {
    return apiError(error, "Could not send verification email.");
  }
}
