import { NextResponse } from "next/server";
import {
  handleCheckoutCompleted,
  isStripeCheckoutSession,
  isStripeSubscription,
  syncSubscriptionByStripeObject,
  verifyStripeWebhook,
} from "@/lib/server/billing";
import { apiError } from "@/lib/server/errors";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const event = verifyStripeWebhook(rawBody, request.headers.get("stripe-signature"));

    if (event.type === "checkout.session.completed" && isStripeCheckoutSession(event.data.object)) {
      await handleCheckoutCompleted(event.data.object);
    }

    if (
      (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") &&
      isStripeSubscription(event.data.object)
    ) {
      await syncSubscriptionByStripeObject(event.data.object);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    return apiError(error, "Could not process Stripe webhook.");
  }
}
