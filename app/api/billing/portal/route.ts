import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireCurrentUserId } from "@/lib/server/auth/current";
import { appBaseUrl, stripeSecretKey } from "@/lib/server/billing";
import { getDb } from "@/lib/server/db";
import { users } from "@/lib/server/db/schema";
import { apiError, AppError } from "@/lib/server/errors";

export async function POST() {
  try {
    const userId = await requireCurrentUserId();
    const db = getDb();
    const [user] = await db
      .select({ stripeCustomerId: users.stripeCustomerId })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!user?.stripeCustomerId) {
      throw new AppError("Upgrade before managing billing.", 400);
    }

    const body = new URLSearchParams({
      customer: user.stripeCustomerId,
      return_url: `${appBaseUrl()}/account/plan`,
    });
    const response = await fetch("https://api.stripe.com/v1/billing_portal/sessions", {
      method: "POST",
      headers: {
        authorization: `Bearer ${stripeSecretKey()}`,
        "content-type": "application/x-www-form-urlencoded",
      },
      body,
    });
    const data = (await response.json()) as { url?: string; error?: { message?: string } };
    if (!response.ok || !data.url) {
      throw new AppError(data.error?.message ?? "Could not open billing portal.", 502);
    }

    return NextResponse.json({ url: data.url });
  } catch (error) {
    return apiError(error, "Could not open billing portal.");
  }
}
