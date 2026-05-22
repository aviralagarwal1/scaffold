import { createHmac, timingSafeEqual } from "node:crypto";
import { AppError } from "./app-error.ts";

/** Verify the unmodified payload, all rotation signatures, and a five-minute replay window. */
export function verifySignature(rawBody: string, header: string | null, secret: string, now = Date.now()): void {
  if (!header) throw new AppError("Missing Stripe signature.", 400);
  const parts = header.split(",").map((part) => part.trim().split("=", 2));
  const timestamp = parts.find(([key]) => key === "t")?.[1];
  if (!timestamp || !/^\d+$/.test(timestamp) || Math.abs(now / 1000 - Number(timestamp)) > 300) {
    throw new AppError("Invalid or expired Stripe signature.", 400);
  }
  const actual = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest();
  const valid = parts.some(([key, value]) => key === "v1" && /^[a-f0-9]{64}$/i.test(value ?? "") && timingSafeEqual(Buffer.from(value, "hex"), actual));
  if (!valid) throw new AppError("Invalid Stripe signature.", 400);
}

export function hasUnfinishedSubscription(id: string | null, status: string | null): boolean {
  return Boolean(id && status !== "canceled" && status !== "incomplete_expired");
}
