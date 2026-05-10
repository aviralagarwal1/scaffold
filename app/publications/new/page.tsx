"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { SubstackUrlForm } from "@/components/SubstackUrlForm";

export default function NewPublicationPage() {
  const router = useRouter();
  const { status } = useSession();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/register");
    }
  }, [status, router]);

  if (status !== "authenticated") {
    return <div className="min-h-[calc(100svh-3.5rem)]" aria-hidden="true" />;
  }

  return (
    <div className="flex min-h-[calc(100svh-3.5rem)] items-center px-6 py-16">
      <div className="mx-auto w-full max-w-2xl">
        <span className="animate-rise animate-delay-1 font-mono text-[11px] uppercase tracking-[0.16em] text-accent-700">
          § / New publication
        </span>
        <h1 className="animate-rise animate-delay-2 mt-3 font-serif text-[36px] leading-[1.08] tracking-tightish text-ink-900 md:text-[44px]">
          Add a <em className="font-serif italic text-ink-700">publication</em> to your desk.
        </h1>
        <p className="animate-rise animate-delay-3 mt-5 max-w-prose font-serif text-[17px] leading-relaxed text-ink-600">
          Paste your publication URL. We read your public library in the background and open a private workspace
          tied to your account.
        </p>
        <div className="animate-rise animate-delay-4 mt-10">
          <SubstackUrlForm autoFocus />
        </div>
      </div>
    </div>
  );
}
