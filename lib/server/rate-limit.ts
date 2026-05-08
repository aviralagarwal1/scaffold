import { AppError } from "./app-error.ts";

/** Bounded, in-process cooldowns for the single-instance deployment. Resets on restart. */
export class RateLimiter {
  private readonly entries = new Map<string, { count: number; expires: number }>();

  private readonly capacity: number;

  constructor(capacity = 10_000) { this.capacity = capacity; }

  check(key: string, limit: number, windowMs: number, now = Date.now()): void {
    let entry = this.entries.get(key);
    if (!entry || entry.expires <= now) {
      if (this.entries.size >= this.capacity) {
        for (const [candidate, value] of this.entries) if (value.expires <= now) this.entries.delete(candidate);
      }
      if (!entry && this.entries.size >= this.capacity) throw new AppError("Too many requests. Try again later.", 429);
      entry = { count: 0, expires: now + windowMs };
      this.entries.set(key, entry);
    }
    if (entry.count >= limit) throw new AppError("Too many requests. Try again later.", 429);
    entry.count += 1;
  }
}

const globalState = globalThis as typeof globalThis & { scaffoldRateLimiter?: RateLimiter };
const limiter = globalState.scaffoldRateLimiter ??= new RateLimiter();

export function limitAuthAttempt(action: "login" | "register" | "reset" | "reset-confirm", email: string): void {
  limiter.check(`auth:${action}:total`, 100, 60_000);
  limiter.check(`auth:${action}:${email}`, action === "login" ? 15 : 5, 15 * 60_000);
}
