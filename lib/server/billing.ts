import { createHmac, timingSafeEqual } from "crypto";
import { eq, or } from "drizzle-orm";
import { getDb } from "@/lib/server/db";
import { users } from "@/lib/server/db/schema";
import { AppError } from "@/lib/server/errors";

type StripeSubscriptionStatus =
  | "active"
  | "canceled"
  | "incomplete"
  | "incomplete_expired"
  | "past_due"
  | "paused"
  | "trialing"
  | "unpaid";

interface StripeSubscription {
  id: string;
  customer: string | { id?: string } | null;
  status: StripeSubscriptionStatus | string;
  current_period_end?: number | null;
}

interface StripeCheckoutSession {
  id: string;
  customer?: string | { id?: string } | null;
  subscription?: string | { id?: string } | null;
  client_reference_id?: string | null;
  metadata?: { userId?: string | null } | null;
}

interface StripeEvent {
  type: string;
  data: {
    object: unknown;
  };
}

export function stripeSecretKey(): string {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new AppError("Stripe is not configured.", 501);
  return key;
}

export function appBaseUrl(): string {
  return process.env.APP_BASE_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
}

export function stripeId(value: string | { id?: string } | null | undefined): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  return typeof value.id === "string" ? value.id : null;
}

export function planForStripeStatus(status: string | null | undefined): "free" | "pro" {
  return status === "active" || status === "trialing" ? "pro" : "free";
}

export function periodEndDate(value: number | null | undefined): Date | null {
  return typeof value === "number" && Number.isFinite(value) ? new Date(value * 1000) : null;
}

export async function retrieveStripeSubscription(subscriptionId: string): Promise<StripeSubscription> {
  const response = await fetch(`https://api.stripe.com/v1/subscriptions/${encodeURIComponent(subscriptionId)}`, {
    headers: { authorization: `Bearer ${stripeSecretKey()}` },
    cache: "no-store",
  });
  const data = (await response.json()) as StripeSubscription & { error?: { message?: string } };
  if (!response.ok || !data.id) {
    throw new AppError(data.error?.message ?? "Could not load Stripe subscription.", 502);
  }
  return data;
}

export async function retrieveStripeCheckoutSession(sessionId: string): Promise<StripeCheckoutSession> {
  const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
    headers: { authorization: `Bearer ${stripeSecretKey()}` },
    cache: "no-store",
  });
  const data = (await response.json()) as StripeCheckoutSession & { error?: { message?: string } };
  if (!response.ok || !data.id) {
    throw new AppError(data.error?.message ?? "Could not load Stripe checkout session.", 502);
  }
  return data;
}

export async function syncSubscriptionToUser(
  userId: string,
  subscription: StripeSubscription,
  customerIdOverride?: string | null,
) {
  const customerId = customerIdOverride ?? stripeId(subscription.customer);
  const status = subscription.status ?? null;
  const db = getDb();
  await db
    .update(users)
    .set({
      plan: planForStripeStatus(status),
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
      stripeSubscriptionStatus: status,
      stripeCurrentPeriodEnd: periodEndDate(subscription.current_period_end),
    })
    .where(eq(users.id, userId));
}

export async function syncSubscriptionByStripeObject(subscription: StripeSubscription) {
  const customerId = stripeId(subscription.customer);
  const db = getDb();
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(
      or(
        eq(users.stripeSubscriptionId, subscription.id),
        customerId ? eq(users.stripeCustomerId, customerId) : eq(users.stripeSubscriptionId, subscription.id),
      ),
    )
    .limit(1);
  if (!user) return;
  await syncSubscriptionToUser(user.id, subscription, customerId);
}

export async function handleCheckoutCompleted(session: StripeCheckoutSession) {
  const userId = session.metadata?.userId || session.client_reference_id;
  const subscriptionId = stripeId(session.subscription);
  if (!userId || !subscriptionId) return;
  const subscription = await retrieveStripeSubscription(subscriptionId);
  await syncSubscriptionToUser(userId, subscription, stripeId(session.customer));
}

export async function syncCheckoutSessionForUser(sessionId: string, userId: string) {
  const session = await retrieveStripeCheckoutSession(sessionId);
  const sessionUserId = session.metadata?.userId || session.client_reference_id;
  if (sessionUserId !== userId) {
    throw new AppError("Checkout session does not belong to this account.", 403);
  }
  await handleCheckoutCompleted(session);
}

export function verifyStripeWebhook(rawBody: string, signatureHeader: string | null): StripeEvent {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new AppError("Stripe webhook secret is not configured.", 501);
  if (!signatureHeader) throw new AppError("Missing Stripe signature.", 400);

  const parts = new Map(
    signatureHeader
      .split(",")
      .map((part) => part.split("=", 2))
      .filter((part): part is [string, string] => part.length === 2),
  );
  const timestamp = parts.get("t");
  const expected = parts.get("v1");
  if (!timestamp || !expected) throw new AppError("Invalid Stripe signature.", 400);

  const signedPayload = `${timestamp}.${rawBody}`;
  const actual = createHmac("sha256", secret).update(signedPayload).digest("hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  const actualBuffer = Buffer.from(actual, "hex");
  if (expectedBuffer.length !== actualBuffer.length || !timingSafeEqual(expectedBuffer, actualBuffer)) {
    throw new AppError("Invalid Stripe signature.", 400);
  }

  return JSON.parse(rawBody) as StripeEvent;
}

export function isStripeSubscription(value: unknown): value is StripeSubscription {
  return Boolean(
    value &&
      typeof value === "object" &&
      "id" in value &&
      typeof value.id === "string" &&
      "status" in value &&
      typeof value.status === "string",
  );
}

export function isStripeCheckoutSession(value: unknown): value is StripeCheckoutSession {
  return Boolean(value && typeof value === "object" && "id" in value && typeof value.id === "string");
}
