import { Suspense } from "react";
import { AuthForm } from "@/components/auth/AuthForm";
import { AuthSurface } from "@/components/auth/AuthSurface";
import { AuthedRedirect } from "@/components/auth/AuthedRedirect";

export const metadata = {
  title: "Sign in · Scaffold",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ verified?: string; emailVerified?: string }>;
}) {
  const params = await searchParams;
  const verificationState = params?.verified ?? params?.emailVerified;
  const emailJustVerified = verificationState === "1";
  const emailVerificationFailed = verificationState === "0";

  return (
    <AuthSurface
      eyebrow={emailJustVerified ? "§ / Verified" : emailVerificationFailed ? "§ / Verify" : "§ / Return"}
      headline={
        emailJustVerified ? (
          <>Open your desk.</>
        ) : emailVerificationFailed ? (
          <>Verify your email.</>
        ) : (
          <>Return to your desk.</>
        )
      }
      subhead={
        emailJustVerified
          ? "Sign in to open your desk and add publications."
          : emailVerificationFailed
            ? "That verification link is invalid, expired, or already used. Sign in below, or register again to send a fresh link."
            : "Your workspaces, your saved ideas, and your library — all where you left them."
      }
    >
      <Suspense fallback={null}>
        <AuthedRedirect />
        <AuthForm mode="login" />
      </Suspense>
    </AuthSurface>
  );
}
