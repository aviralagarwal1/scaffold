import { redirect } from "next/navigation";
import { SubstackUrlForm } from "@/components/SubstackUrlForm";
import { getCurrentUserId } from "@/lib/server/auth/current";

export default async function NewPublicationPage() {
  const userId = await getCurrentUserId();
  if (!userId) {
    redirect("/register");
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
          Paste your publication link. We read the public library in the background and open a workspace
          on your desk.
        </p>
        <div className="animate-rise animate-delay-4 mt-10">
          <SubstackUrlForm autoFocus />
        </div>
      </div>
    </div>
  );
}
