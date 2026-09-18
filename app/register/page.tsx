import { Suspense } from "react";
import { AuthForm } from "@/components/auth/AuthForm";
import { AuthSurface } from "@/components/auth/AuthSurface";
import { AuthedRedirect } from "@/components/auth/AuthedRedirect";

export const metadata = {
  title: "Create your account · Scaffold",
  robots: {
    index: false,
    follow: false,
  },
};

export default function RegisterPage() {
  return (
    <AuthSurface
      eyebrow="§ 01 / Begin"
      headline={<>Create your account.</>}
      subhead="Enter your email and password to start."
    >
      {/* AuthForm uses useSearchParams to pick up the landing-hook handoff;
          a Suspense boundary above it keeps the rest of the page statically
          rendered. AuthedRedirect bounces already-signed-in visitors to
          /account so they never see a stale "Create your account" form. */}
      <Suspense fallback={null}>
        <AuthedRedirect />
        <AuthForm mode="register" />
      </Suspense>
    </AuthSurface>
  );
}
