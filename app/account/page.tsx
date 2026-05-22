import { redirect } from "next/navigation";
import { AccountPanel } from "@/components/AccountPanel";
import { getCurrentUserId } from "@/lib/server/auth/current";

export const metadata = {
  title: "Desk - Scaffold",
};

type AccountPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AccountPage({ searchParams }: AccountPageProps) {
  const userId = await getCurrentUserId();
  if (!userId) {
    const params = await searchParams;
    const callbackParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params ?? {})) {
      if (typeof value === "string") callbackParams.set(key, value);
    }
    const callbackUrl = callbackParams.size > 0 ? `/account?${callbackParams.toString()}` : "/account";
    redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(900px 360px at 18% -10%, rgba(180, 94, 44, 0.06), transparent 60%), radial-gradient(800px 320px at 100% 0%, rgba(180, 94, 44, 0.04), transparent 55%)",
        }}
      />

      <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 py-16">
        <header className="max-w-4xl">
          <span className="animate-rise animate-delay-1 font-mono text-[11px] uppercase tracking-[0.16em] text-accent-700">
            &sect; / Desk
          </span>
          <h1 className="animate-rise animate-delay-2 mt-3 font-serif text-[34px] leading-[1.08] tracking-tightish text-ink-900 md:text-[40px]">
            Desk
          </h1>
          <p className="animate-rise animate-delay-3 mt-4 font-serif text-[16.5px] leading-relaxed text-ink-600">
            Manage your publications, usage, and workspace access.
          </p>
        </header>

        <div className="animate-rise animate-delay-4">
          <AccountPanel />
        </div>
      </div>
    </section>
  );
}
