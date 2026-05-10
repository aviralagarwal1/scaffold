import { Suspense } from "react";
import { AuthSurface } from "@/components/AuthSurface";
import { ResetPasswordForm } from "@/components/ResetPasswordForm";

export const metadata = {
  title: "Choose a new password - Scaffold",
};

export default function ResetPasswordPage() {
  return (
    <AuthSurface
      eyebrow="Reset"
      headline={
        <>
          Choose a new <em className="font-serif italic text-ink-700">password.</em>
        </>
      }
      subhead="This link is single-use. Pick a new password, then sign in again."
    >
      <Suspense fallback={null}>
        <ResetPasswordForm />
      </Suspense>
    </AuthSurface>
  );
}
