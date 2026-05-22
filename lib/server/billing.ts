import { eq, or } from "drizzle-orm";
import { getDb } from "@/lib/server/db";
import { users } from "@/lib/server/db/schema";
import { AppError } from "@/lib/server/errors";
import { verifySignature } from "./stripe-signature";
import { resolveSubscription } from "./billing-order";

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
  created: number;
  customer: string | { id?: string } | null;
  status: StripeSubscriptionStatus | string;
  current_period_end?: number | null;
  items?: { data?: Array<{ price?: { id?: string }; current_period_end?: number | null }> };
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

function stripeId(value: string | { id?: string } | null | undefined): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  return typeof value.id === "string" ? value.id : null;
}

function planForStripeStatus(status: string | null | undefined): "free" | "pro" {
  return status === "active" || status === "trialing" ? "pro" : "free";
}

function periodEndDate(value: number | null | undefined): Date | null {
  return typeof value === "number" && Number.isFinite(value) ? new Date(value * 1000) : null;
}

async function retrieveStripeSubscription(subscriptionId: string): Promise<StripeSubscription> {
  const response = await fetch(`https://api.stripe.com/v1/subscriptions/${encodeURIComponent(subscriptionId)}`, {
    signal: AbortSignal.timeout(15_000),
    headers: { authorization: `Bearer ${stripeSecretKey()}` },
    cache: "no-store",
  });
  const data = (await response.json()) as StripeSubscription & { error?: { message?: string } };
  if (!response.ok || !data.id) {
    throw new AppError(data.error?.message ?? "Could not load Stripe subscription.", 502);
  }
  return data;
}

async function retrieveStripeCheckoutSession(sessionId: string): Promise<StripeCheckoutSession> {
  const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
    signal: AbortSignal.timeout(15_000),
    headers: { authorization: `Bearer ${stripeSecretKey()}` },
    cache: "no-store",
  });
  const data = (await response.json()) as StripeCheckoutSession & { error?: { message?: string } };
  if (!response.ok || !data.id) {
    throw new AppError(data.error?.message ?? "Could not load Stripe checkout session.", 502);
  }
  return data;
}

async function syncSubscriptionToUser(
  userId: string,
  subscriptionId: string,
  allowReplacement = false,
  checkoutCustomerId?: string | null,
) {
  await getDb().transaction(async (db) => {
    const [user] = await db.select({ subscriptionId: users.stripeSubscriptionId, customerId: users.stripeCustomerId })
      .from(users).where(eq(users.id, userId)).for("update");
    if (!user) return;
    // Fetch after locking so concurrent handlers cannot apply an older snapshot
    // after a newer handler has committed. Checkout and webhook paths share this.
    const subscription = await resolveSubscription(user.subscriptionId, subscriptionId, allowReplacement, retrieveStripeSubscription);
    if (!subscription) return;
    const customerId = stripeId(subscription.customer);
    if (!customerId || (user.customerId && user.customerId !== customerId)
      || (checkoutCustomerId && checkoutCustomerId !== customerId)) {
      throw new AppError("Subscription does not belong to this billing account.", 409);
    }
    const status = subscription.status ?? null;
    const eligiblePrice = subscription.items?.data?.some((item) => item.price?.id === process.env.STRIPE_PRO_PRICE_ID) ?? false;
    const periodEnd = subscription.items?.data?.find((item) => item.price?.id === process.env.STRIPE_PRO_PRICE_ID)?.current_period_end ?? subscription.current_period_end;
    await db
      .update(users)
      .set({
        plan: eligiblePrice ? planForStripeStatus(status) : "free",
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscription.id,
        stripeSubscriptionStatus: status,
        stripeCurrentPeriodEnd: periodEndDate(periodEnd),
      })
      .where(eq(users.id, userId));
  }, { isolationLevel: "read committed" });
}

export async function syncSubscriptionByStripeObject(subscription: StripeSubscription) {
  const customerId = stripeId(subscription.customer);
  const db = getDb();
  const [user] = await db
    .select({ id: users.id, subscriptionId: users.stripeSubscriptionId })
    .from(users)
    .where(
      or(
        eq(users.stripeSubscriptionId, subscription.id),
        customerId ? eq(users.stripeCustomerId, customerId) : eq(users.stripeSubscriptionId, subscription.id),
      ),
    )
    .limit(1);
  if (!user) return;
  // An old subscription event must not overwrite a newer subscription's state.
  if (user.subscriptionId && user.subscriptionId !== subscription.id) return;
  await syncSubscriptionToUser(user.id, subscription.id);
}

export async function handleCheckoutCompleted(session: StripeCheckoutSession) {
  const userId = session.metadata?.userId || session.client_reference_id;
  const subscriptionId = stripeId(session.subscription);
  if (!userId || !subscriptionId) return;
  await syncSubscriptionToUser(userId, subscriptionId, true, stripeId(session.customer));
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
  verifySignature(rawBody, signatureHeader, secret);
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
