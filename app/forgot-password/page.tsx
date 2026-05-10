import { Suspense } from "react";
import { AuthSurface } from "@/components/AuthSurface";
import { ForgotPasswordForm } from "@/components/ForgotPasswordForm";

export const metadata = {
  title: "Reset password - Scaffold",
};

export default function ForgotPasswordPage() {
  return (
    <AuthSurface
      eyebrow="Reset"
      headline={
        <>
          Reset your <em className="font-serif italic text-ink-700">password.</em>
        </>
      }
      subhead="Enter your account email and we will send a link to choose a new password."
    >
      <Suspense fallback={null}>
        <ForgotPasswordForm />
      </Suspense>
    </AuthSurface>
  );
}
