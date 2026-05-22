import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveSubscription } from "../lib/server/billing-order.ts";

const subscriptions = {
  old: { id: "old", created: 100, status: "canceled" },
  current: { id: "current", created: 200, status: "active" },
  next: { id: "next", created: 300, status: "trialing" },
};
const load = async (id: string) => subscriptions[id as keyof typeof subscriptions];

test("late Checkout completion cannot replace a newer subscription", async () => {
  assert.equal(await resolveSubscription("current", "old", true, load), null);
  assert.equal(await resolveSubscription("next", "current", true, load), null);
});

test("first Checkout, retry, and later re-subscription resolve current Stripe data", async () => {
  assert.equal(await resolveSubscription(null, "current", true, load), subscriptions.current);
  assert.equal(await resolveSubscription("current", "current", true, load), subscriptions.current);
  assert.equal(await resolveSubscription("old", "next", true, load), subscriptions.next);
});

test("subscription events cannot switch the subscription recorded by Checkout", async () => {
  let fetched = false;
  assert.equal(await resolveSubscription("current", "next", false, async () => {
    fetched = true;
    return subscriptions.next;
  }), null);
  assert.equal(fetched, false);
});

test("same-subscription events refresh state instead of applying the event snapshot", async () => {
  const canceled = { ...subscriptions.current, status: "canceled" };
  assert.equal(await resolveSubscription("current", "current", false, async () => canceled), canceled);
});

test("ambiguous same-second subscriptions preserve the recorded ID regardless of status", async () => {
  const loadSameSecond = async (id: string) => ({ ...await load(id), created: 100 });
  assert.equal(await resolveSubscription("old", "current", true, loadSameSecond), null);
  assert.equal(await resolveSubscription("current", "old", true, loadSameSecond), null);
  assert.equal(await resolveSubscription("current", "next", true, loadSameSecond), null);
});

test("Stripe failures and missing creation times fail without selecting a replacement", async () => {
  await assert.rejects(resolveSubscription("current", "next", true, async () => { throw new Error("Stripe unavailable"); }));
  await assert.rejects(resolveSubscription("current", "next", true, async (id) => ({ ...await load(id), created: NaN })), { status: 502 });
});
