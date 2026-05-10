import { NextResponse } from "next/server";
import type { PasswordResetConfirmRequest } from "@/types/auth";
import { resetPasswordWithToken } from "@/lib/server/auth/password-reset";
import { apiError } from "@/lib/server/errors";
import { readJson } from "@/lib/server/http";

export async function POST(request: Request) {
  try {
    const body = await readJson<PasswordResetConfirmRequest>(request);
    await resetPasswordWithToken(
      typeof body.email === "string" ? body.email : "",
      typeof body.token === "string" ? body.token : "",
      typeof body.password === "string" ? body.password : "",
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error, "Could not reset password.");
  }
}
