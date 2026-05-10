import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { verifyEmailToken } from "@/lib/server/auth/email-verification";
import { authOptions } from "@/lib/server/auth/options";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const email = url.searchParams.get("email") ?? "";
  const token = url.searchParams.get("token") ?? "";

  try {
    const result = await verifyEmailToken(email, token);
    if (result.kind === "registration") {
      const redirectUrl = new URL("/login", url.origin);
      redirectUrl.searchParams.set("verified", "1");
      redirectUrl.searchParams.set("email", result.email);
      if (result.publicationUrl) redirectUrl.searchParams.set("publicationUrl", result.publicationUrl);
      return NextResponse.redirect(redirectUrl);
    }

    const session = await getServerSession(authOptions);
    const redirectUrl = new URL(session ? "/account" : "/login", url.origin);
    redirectUrl.searchParams.set(session ? "emailVerified" : "verified", "1");
    if (!session) redirectUrl.searchParams.set("email", email);
    return NextResponse.redirect(redirectUrl);
  } catch {
    const redirectUrl = new URL("/login", url.origin);
    redirectUrl.searchParams.set("emailVerified", "0");
    return NextResponse.redirect(redirectUrl);
  }
}
