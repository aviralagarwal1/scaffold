import { Suspense } from "react";
import { AuthForm } from "@/components/AuthForm";
import { AuthSurface } from "@/components/AuthSurface";
import { AuthedRedirect } from "@/components/AuthedRedirect";

export const metadata = {
  title: "Sign in · Scaffold",
};

export default function LoginPage() {
  return (
    <AuthSurface
      eyebrow="§ / Return"
      headline={
        <>
          Return to <em className="font-serif italic text-ink-700">your desk.</em>
        </>
      }
      subhead="Your workspaces, your saved ideas, and your curator — all where you left them."
    >
      <Suspense fallback={null}>
        <AuthedRedirect />
        <AuthForm mode="login" />
      </Suspense>
    </AuthSurface>
  );
}
