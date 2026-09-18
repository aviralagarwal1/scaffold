import { Suspense } from "react";
import { AuthSurface } from "@/components/auth/AuthSurface";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export const metadata = {
  title: "Reset password - Scaffold",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ForgotPasswordPage() {
  return (
    <AuthSurface
      eyebrow="Reset"
      headline={<>Reset your password.</>}
      subhead="Enter your account email and we will send a link to choose a new password."
    >
      <Suspense fallback={null}>
        <ForgotPasswordForm />
      </Suspense>
    </AuthSurface>
  );
}
