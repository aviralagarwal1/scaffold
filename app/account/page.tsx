import { AccountPanel } from "@/components/AccountPanel";

export const metadata = {
  title: "Account · Scaffold",
};

export default function AccountPage() {
  return (
    <section className="relative overflow-hidden">
      {/* Continuity wash. Same warm bronze the marketing hero and auth pages
          use, so the user never feels they've stepped into a sterile dashboard. */}
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
            § / Account
          </span>
          <h1 className="animate-rise animate-delay-2 mt-3 font-serif text-[34px] leading-[1.08] tracking-tightish text-ink-900 md:text-[40px]">
            Your <em className="font-serif italic text-ink-700">desk.</em>
          </h1>
          <p className="animate-rise animate-delay-3 mt-4 font-serif text-[16.5px] leading-relaxed text-ink-600">
            One account, many publications. Each workspace becomes a private editorial memory of your writing.
          </p>
        </header>

        <div className="animate-rise animate-delay-4">
          <AccountPanel />
        </div>
      </div>
    </section>
  );
}
