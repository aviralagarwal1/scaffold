import { NextResponse } from "next/server";
import type { PasswordResetRequest } from "@/types/auth";
import { sendPasswordResetForEmail } from "@/lib/server/auth/password-reset";
import { apiError } from "@/lib/server/errors";
import { readJson } from "@/lib/server/http";

export async function POST(request: Request) {
  try {
    const body = await readJson<PasswordResetRequest>(request);
    const email = typeof body.email === "string" ? body.email : "";
    const result = await sendPasswordResetForEmail(email);
    return NextResponse.json({ ok: true, delivery: result.delivery });
  } catch (error) {
    return apiError(error, "Could not request password reset.");
  }
}
