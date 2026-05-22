import { redirect } from "next/navigation";
import { PlanUpgradePanel } from "@/components/PlanUpgradePanel";
import { getAccountPlanSummary } from "@/lib/server/account-workspaces";
import { getCurrentUserId } from "@/lib/server/auth/current";
import { planConfig } from "@/lib/server/plans";

export const metadata = {
  title: "Premium Plan - Scaffold",
};

export default async function AccountPlanPage() {
  const userId = await getCurrentUserId();
  if (!userId) {
    redirect(`/login?callbackUrl=${encodeURIComponent("/account/plan")}`);
  }

  const plan = await getAccountPlanSummary(userId);
  const basicPlan = planConfig("free");
  const premiumPlan = planConfig("pro");

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
            &sect; / Premium Plan
          </span>
          <h1 className="animate-rise animate-delay-2 mt-3 font-serif text-[34px] leading-[1.08] tracking-tightish text-ink-900 md:text-[40px]">
            Premium Plan
          </h1>
          <p className="animate-rise animate-delay-3 mt-4 font-serif text-[16.5px] leading-relaxed text-ink-600">
            Compare our plans. Upgrade when one publication is no longer enough or your monthly account usage needs more room.
          </p>
        </header>

        <div className="animate-rise animate-delay-4">
          <PlanUpgradePanel plan={plan} basicPlan={basicPlan} premiumPlan={premiumPlan} />
        </div>
      </div>
    </section>
  );
}
