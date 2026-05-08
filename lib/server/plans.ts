import type { PlanConfig, PlanId } from "@/types/workspace";

const DEFAULTS: Record<PlanId, PlanConfig> = {
  free: {
    id: "free",
    label: "Basic",
    monthlyTokenLimit: 500_000,
    activePublicationLimit: 1,
    priceCents: 0,
  },
  pro: {
    id: "pro",
    label: "Premium",
    monthlyTokenLimit: 2_000_000,
    activePublicationLimit: 3,
    priceCents: 800,
  },
};

export function planConfig(planId: string | null | undefined): PlanConfig {
  const id: PlanId = planId === "pro" ? "pro" : "free";
  const defaults = DEFAULTS[id];
  return {
    ...defaults,
    monthlyTokenLimit: readPositiveIntegerEnv(`${id.toUpperCase()}_MONTHLY_TOKEN_LIMIT`, defaults.monthlyTokenLimit),
    activePublicationLimit: readPositiveIntegerEnv(`${id.toUpperCase()}_ACTIVE_PUBLICATION_LIMIT`, defaults.activePublicationLimit),
    priceCents: readNonNegativeIntegerEnv(`${id.toUpperCase()}_PRICE_CENTS`, defaults.priceCents),
  };
}

function readPositiveIntegerEnv(key: string, fallback: number): number {
  const value = Number(process.env[key]);
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return Math.floor(value);
}

function readNonNegativeIntegerEnv(key: string, fallback: number): number {
  const value = Number(process.env[key]);
  if (!Number.isFinite(value) || value < 0) return fallback;
  return Math.floor(value);
}
