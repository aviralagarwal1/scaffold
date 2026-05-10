import { AuthForm } from "@/components/AuthForm";

export default function RegisterPage() {
  return (
    <div className="mx-auto flex min-h-[calc(100svh-3.5rem)] w-full max-w-md flex-col justify-center px-6 py-16">
      <h1 className="font-serif text-[34px] leading-tight tracking-tightish text-ink-900">Create your account.</h1>
      <p className="mt-3 text-[14.5px] leading-relaxed text-ink-600">
        Choose the editor name Scaffold will use for your profile.
      </p>
      <div className="mt-8">
        <AuthForm mode="register" />
      </div>
    </div>
  );
}
