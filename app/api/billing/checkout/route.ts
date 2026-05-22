import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireCurrentUserId } from "@/lib/server/auth/current";
import { getDb } from "@/lib/server/db";
import { users } from "@/lib/server/db/schema";
import { apiError, AppError } from "@/lib/server/errors";

export async function POST() {
  try {
    const userId = await requireCurrentUserId();
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const priceId = process.env.STRIPE_PRO_PRICE_ID;
    if (!stripeSecretKey || !priceId) {
      throw new AppError("Premium checkout is not connected yet.", 501);
    }

    const db = getDb();
    const [user] = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!user?.email) throw new AppError("Add an email before upgrading.", 400);

    const baseUrl = process.env.APP_BASE_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
    const body = new URLSearchParams({
      mode: "subscription",
      "line_items[0][price]": priceId,
      "line_items[0][quantity]": "1",
      success_url: `${baseUrl}/account/plan?upgraded=1`,
      cancel_url: `${baseUrl}/account/plan?canceled=1`,
      client_reference_id: userId,
      customer_email: user.email,
      "metadata[userId]": userId,
    });

    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        authorization: `Bearer ${stripeSecretKey}`,
        "content-type": "application/x-www-form-urlencoded",
      },
      body,
    });

    const data = (await response.json()) as { url?: string; error?: { message?: string } };
    if (!response.ok || !data.url) {
      throw new AppError(data.error?.message ?? "Could not start checkout.", 502);
    }

    return NextResponse.json({ url: data.url });
  } catch (error) {
    return apiError(error, "Could not start checkout.");
  }
}
