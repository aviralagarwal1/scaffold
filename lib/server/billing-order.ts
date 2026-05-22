import { AppError } from "./app-error.ts";

export interface SubscriptionIdentity {
  id: string;
  created: number;
}

/** Call while holding the user's database row lock, including the Stripe reads. */
export async function resolveSubscription<T extends SubscriptionIdentity>(
  currentId: string | null,
  incomingId: string,
  allowReplacement: boolean,
  retrieve: (id: string) => Promise<T>,
): Promise<T | null> {
  if (currentId && currentId !== incomingId && !allowReplacement) return null;
  const incoming = await retrieve(incomingId);
  if (!currentId || currentId === incomingId) return incoming;
  const current = await retrieve(currentId);
  if (!Number.isSafeInteger(incoming.created) || !Number.isSafeInteger(current.created)) {
    throw new AppError("Could not determine subscription order.", 502);
  }
  // Event delivery time and status cannot establish which subscription is
  // newer. Preserve the current ID when different IDs share a creation second.
  return incoming.created > current.created ? incoming : null;
}
