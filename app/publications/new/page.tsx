import { redirect } from "next/navigation";
import { SubstackUrlForm } from "@/components/SubstackUrlForm";
import { getAccountSetupState } from "@/lib/server/account-setup";
import { getCurrentUserId } from "@/lib/server/auth/current";

export default async function NewPublicationPage({
  searchParams,
}: {
  searchParams?: Promise<{ publicationUrl?: string }>;
}) {
  const userId = await getCurrentUserId();
  const params = await searchParams;
  const initialPublicationUrl = typeof params?.publicationUrl === "string" ? params.publicationUrl.trim() : "";
  if (!userId) {
    redirect(
      initialPublicationUrl
        ? `/register?publicationUrl=${encodeURIComponent(initialPublicationUrl)}`
        : "/register",
    );
  }
  const setupState = await getAccountSetupState(userId);
  if (!setupState.complete) {
    const setupParams = new URLSearchParams({ setup: "1" });
    if (initialPublicationUrl) setupParams.set("publicationUrl", initialPublicationUrl);
    redirect(`/account/profile?${setupParams.toString()}`);
  }

  return (
    <div className="flex min-h-[calc(100svh-3.5rem)] items-center px-6 py-16">
      <div className="mx-auto w-full max-w-2xl">
        <span className="animate-rise animate-delay-1 font-mono text-[11px] uppercase tracking-[0.16em] text-accent-700">
          § / New publication
        </span>
        <h1 className="animate-rise animate-delay-2 mt-3 font-serif text-[36px] leading-[1.08] tracking-tightish text-ink-900 md:text-[44px]">
          Add a publication to your desk.
        </h1>
        <p className="animate-rise animate-delay-3 mt-5 max-w-prose font-serif text-[17px] leading-relaxed text-ink-600">
          Paste your publication link. We'll read the public posts and open your workspace when it's ready. Larger libraries can take a few minutes.
        </p>
        <div className="animate-rise animate-delay-4 mt-10">
          <SubstackUrlForm autoFocus initialUrl={initialPublicationUrl} />
        </div>
      </div>
    </div>
  );
}
