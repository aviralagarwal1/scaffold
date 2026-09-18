import { Suspense } from "react";
import { AuthSurface } from "@/components/auth/AuthSurface";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export const metadata = {
  title: "Choose a new password - Scaffold",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ResetPasswordPage() {
  return (
    <AuthSurface
      eyebrow="Reset"
      headline={<>Choose a new password.</>}
      subhead="This link is single-use. Pick a new password, then sign in again."
    >
      <Suspense fallback={null}>
        <ResetPasswordForm />
      </Suspense>
    </AuthSurface>
  );
}
