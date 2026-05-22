"use client";

import Link from "next/link";
import { useState } from "react";
import type { AccountPlanSummary } from "@/types/workspace";
import type { PlanConfig } from "@/lib/server/plans";
import { api, ApiClientError } from "@/lib/client/api";
import { cn } from "@/lib/client/cn";

export function PlanUpgradePanel({
  plan,
  basicPlan,
  premiumPlan,
}: {
  plan: AccountPlanSummary;
  basicPlan: PlanConfig;
  premiumPlan: PlanConfig;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<"free" | "pro">("pro");

  const upgrade = async () => {
    setBusy(true);
    setError(null);
    try {
      const session = await api.createCheckoutSession();
      window.location.href = session.url;
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not start checkout.");
      setBusy(false);
    }
  };

  const currentIsPremium = plan.id === "pro";
  const highlightedPlan = selectedPlan;
  const premiumHighlighted = highlightedPlan === "pro";
  const ctaIsUpgrade = premiumHighlighted && !currentIsPremium;

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-5">
        <div className="grid gap-4 md:grid-cols-2">
          <PlanCard
            title={basicPlan.label}
            price={formatPrice(basicPlan)}
            badge={currentIsPremium ? undefined : "Current"}
            badgeTone="neutral"
            highlighted={highlightedPlan === "free"}
            selected={selectedPlan === "free"}
            onSelect={() => setSelectedPlan("free")}
            features={[
              { label: "Tokens", value: `${formatTokens(basicPlan.monthlyTokenLimit)}/month` },
              { label: "Libraries", value: pluralize(basicPlan.activePublicationLimit, "publication") },
              { label: "Scope", value: "One library with conversation, search, and draft feedback." },
            ]}
          />
          <PlanCard
            title={premiumPlan.label}
            price={formatPrice(premiumPlan)}
            badge="Premium"
            highlighted={premiumHighlighted}
            selected={selectedPlan === "pro"}
            onSelect={() => setSelectedPlan("pro")}
            features={[
              { label: "Tokens", value: `${formatTokens(premiumPlan.monthlyTokenLimit)}/month` },
              { label: "Libraries", value: pluralize(premiumPlan.activePublicationLimit, "publication") },
              { label: "Scope", value: "Larger libraries, multiple publications, and deeper analysis." },
            ]}
          />
        </div>

        <div className="flex flex-col items-start gap-3 border-t border-ink-200/70 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-xl text-[13px] leading-relaxed text-ink-500">
            Checkout opens through Stripe. Your plan changes after the subscription webhook is connected.
          </p>
          {ctaIsUpgrade ? (
            <button type="button" onClick={upgrade} disabled={busy} className="btn-primary">
              {busy ? "Opening Checkout" : "Upgrade to Premium"}
            </button>
          ) : (
            <Link href="/account" className="btn-primary">
              Return to Desk
            </Link>
          )}
        </div>
      </section>

      {error && (
        <div className="rounded-md border border-critical-100 bg-critical-100/40 px-3 py-2 text-[13px] text-critical-700">
          {error}
        </div>
      )}
    </div>
  );
}

function formatPrice(plan: PlanConfig): string {
  return plan.priceCents === 0 ? "Free" : `$${(plan.priceCents / 100).toFixed(0)}/month`;
}

function formatTokens(value: number): string {
  return value.toLocaleString();
}

function pluralize(count: number, noun: string): string {
  return `${count.toLocaleString()} ${noun}${count === 1 ? "" : "s"}`;
}

function PlanCard({
  title,
  price,
  badge,
  badgeTone = "positive",
  highlighted = false,
  selected = false,
  onSelect,
  features,
}: {
  title: string;
  price: string;
  badge?: string;
  badgeTone?: "neutral" | "positive";
  highlighted?: boolean;
  selected?: boolean;
  onSelect?: () => void;
  features: Array<{ label: string; value: string }>;
}) {
  const className = cn(
    "rounded-md border bg-white p-6 text-left shadow-soft transition-all duration-200 ease-editorial",
    highlighted
      ? "border-accent-300 bg-accent-50/20 shadow-lift hover:-translate-y-px"
      : "border-ink-200/80 hover:-translate-y-px hover:border-ink-300 hover:bg-ink-50/50",
    "cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
  );

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={className}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-serif text-[24px] leading-tight tracking-tightish text-ink-900">{title}</h3>
          <div className="mt-1 font-serif text-[15px] leading-snug tracking-tightish text-ink-500">{price}</div>
        </div>
        {badge && (
          <span
            className={cn(
              "rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em]",
              badgeTone === "neutral"
                ? "border-ink-200 bg-ink-50 text-ink-500"
                : "border-positive-100 bg-positive-100/40 text-positive-700",
            )}
          >
            {badge}
          </span>
        )}
      </div>
      <ul className="mt-7 flex flex-col gap-3">
        {features.map((feature) => (
          <li key={feature.label} className="grid gap-1 border-t border-ink-200/60 pt-3 first:border-t-0 first:pt-0">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-400">{feature.label}</span>
            <span className="text-[14px] leading-relaxed text-ink-600">{feature.value}</span>
          </li>
        ))}
      </ul>
      <div
        aria-hidden={!highlighted && !selected}
        className={cn(
          "mt-6 font-mono text-[10.5px] uppercase tracking-[0.14em] text-accent-700 transition-opacity duration-200 ease-editorial",
          highlighted ? "opacity-100" : "opacity-0",
        )}
      >
        {title === "Premium" ? "Ready to Upgrade" : "Current Basic Plan"}
      </div>
    </button>
  );
}
