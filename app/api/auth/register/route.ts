import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/server/db";
import { profiles, users } from "@/lib/server/db/schema";
import { apiError, AppError } from "@/lib/server/errors";
import { readJson } from "@/lib/server/http";
import { hashPassword } from "@/lib/server/auth/password";

type RegisterRequest = {
  email?: unknown;
  password?: unknown;
  editorName?: unknown;
};

export async function POST(request: Request) {
  try {
    const body = await readJson<RegisterRequest>(request);
    const email = normalizeEmail(body.email);
    const password = requirePassword(body.password);
    const editorName = requireEditorName(body.editorName);

    const db = getDb();
    const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (existing.length > 0) throw new AppError("An account already exists for that email.", 409);

    const passwordHash = await hashPassword(password);
    const created = await db.transaction(async (tx) => {
      const [user] = await tx
        .insert(users)
        .values({
          email,
          name: editorName,
          passwordHash,
        })
        .returning({ id: users.id, email: users.email, name: users.name });

      await tx.insert(profiles).values({
        userId: user.id,
        editorName,
      });

      return user;
    });

    return NextResponse.json({
      id: created.id,
      email: created.email,
      editorName: created.name,
    });
  } catch (error) {
    return apiError(error, "Could not create account.");
  }
}

function normalizeEmail(value: unknown): string {
  if (typeof value !== "string") throw new AppError("Enter an email address.", 400);
  const email = value.trim().toLowerCase();
  if (!email || !email.includes("@")) throw new AppError("Enter a valid email address.", 400);
  return email;
}

function requirePassword(value: unknown): string {
  if (typeof value !== "string" || value.length < 8) {
    throw new AppError("Password must be at least 8 characters.", 400);
  }
  return value;
}

function requireEditorName(value: unknown): string {
  if (typeof value !== "string") throw new AppError("Choose an editor name.", 400);
  const editorName = value.replace(/\s+/g, " ").trim();
  if (editorName.length < 2) throw new AppError("Choose an editor name.", 400);
  return editorName.slice(0, 80);
}
