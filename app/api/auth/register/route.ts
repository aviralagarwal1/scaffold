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
  creatorName?: unknown;
  editorName?: unknown;
};

export async function POST(request: Request) {
  try {
    const body = await readJson<RegisterRequest>(request);
    const email = normalizeEmail(body.email);
    const password = requirePassword(body.password);
    const creatorName = normalizeCreatorName(body.creatorName);
    const editorName = normalizeCuratorName(body.editorName);

    const db = getDb();
    const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (existing.length > 0) throw new AppError("An account already exists for that email.", 409);

    const passwordHash = await hashPassword(password);
    const created = await db.transaction(async (tx) => {
      const [user] = await tx
        .insert(users)
        .values({
          email,
          name: creatorName,
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
      creatorName: created.name ?? "",
      editorName,
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

function normalizeCreatorName(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new AppError("What should we call you?", 400);
  const creatorName = value.replace(/\s+/g, " ").trim();
  if (creatorName.length === 0) return null;
  if (creatorName.length < 1) throw new AppError("What should we call you?", 400);
  if (creatorName.length > 60) throw new AppError("Keep your name under 60 characters.", 400);
  if (/[^\p{L}\s'-]/u.test(creatorName)) {
    throw new AppError("Use letters, spaces, hyphens, or apostrophes.", 400);
  }
  return creatorName;
}

function normalizeCuratorName(value: unknown): string {
  if (value === undefined || value === null || value === "") return "Curator";
  if (typeof value !== "string") throw new AppError("Choose a curator name.", 400);
  const editorName = value.trim();
  if (editorName.length < 2) throw new AppError("Choose a curator name.", 400);
  if (editorName.length > 24) throw new AppError("Keep your curator name to 24 letters.", 400);
  if (/[^\p{L}]/u.test(editorName)) {
    throw new AppError("Letters only - no numbers or symbols.", 400);
  }
  if (!/^\p{Lu}/u.test(editorName)) throw new AppError("Start with a capital letter.", 400);
  if (!/\p{Ll}$/u.test(editorName)) throw new AppError("End with a lowercase letter.", 400);
  return editorName;
}
