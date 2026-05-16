import { Suspense } from "react";
import { AuthForm } from "@/components/AuthForm";
import { AuthSurface } from "@/components/AuthSurface";
import { AuthedRedirect } from "@/components/AuthedRedirect";

export const metadata = {
  title: "Sign in · Scaffold",
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
          <>
            Open <em className="font-serif italic text-ink-700">your desk.</em>
          </>
        ) : emailVerificationFailed ? (
          <>
            Verify your <em className="font-serif italic text-ink-700">email.</em>
          </>
        ) : (
          <>
            Return to <em className="font-serif italic text-ink-700">your desk.</em>
          </>
        )
      }
      subhead={
        emailJustVerified
          ? "Your email is verified. Sign in to open your workspace."
          : emailVerificationFailed
            ? "That verification link is invalid, expired, or already used. Sign in below, or register again to send a fresh link."
            : "Your workspaces, your saved ideas, and your curator — all where you left them."
      }
    >
      <Suspense fallback={null}>
        <AuthedRedirect />
        <AuthForm mode="login" />
      </Suspense>
    </AuthSurface>
  );
}
