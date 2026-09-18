import assert from "node:assert/strict";
import { test } from "node:test";
import { createHmac } from "node:crypto";
import { readBody, readJson } from "../lib/server/http.ts";
import { RateLimiter } from "../lib/server/rate-limit.ts";
import { hasUnfinishedSubscription, verifySignature } from "../lib/server/stripe-signature.ts";
import { hashPassword, verifyPassword } from "../lib/server/auth/password.ts";

function request(body: string, headers: Record<string, string> = {}) {
  return new Request("https://scaffold.test/api", { method: "POST", body, headers });
}

test("JSON bodies reject arrays, null, scalars and malformed content", async () => {
  for (const body of ["null", "[]", "42", '"text"', "{"]) await assert.rejects(readJson(request(body)), { status: 400 });
  assert.deepEqual(await readJson(request('{"body":"a note"}')), { body: "a note" });
});

test("body limits count actual UTF-8 bytes, including when content-length is absent or false", async () => {
  await assert.rejects(readBody(request("ééé"), 5), { status: 413 });
  await assert.rejects(readBody(request("123456", { "content-length": "1" }), 5), { status: 413 });
  await assert.rejects(readBody(request("x", { "content-length": "6" }), 5), { status: 413 });
  assert.equal(await readBody(request("éé"), 4), "éé");
});

test("body limits abort streamed uploads before buffering their full content", async () => {
  let canceled = false;
  const body = new ReadableStream({ pull(controller) { controller.enqueue(new Uint8Array(20)); }, cancel() { canceled = true; } });
  const streamed = new Request("https://scaffold.test/api", { method: "POST", body, duplex: "half" } as RequestInit);
  await assert.rejects(readBody(streamed, 30), { status: 413 });
  assert.equal(canceled, true);
});

test("cooldowns isolate keys, expire, and remain memory bounded", () => {
  const limiter = new RateLimiter(2);
  limiter.check("a", 1, 1000, 0);
  assert.throws(() => limiter.check("a", 1, 1000, 1), { status: 429 });
  limiter.check("b", 1, 1000, 1);
  assert.throws(() => limiter.check("c", 1, 1000, 2), { status: 429 });
  limiter.check("c", 1, 1000, 1001);
});

test("Stripe accepts a valid rotation signature but rejects changed bodies and replays", () => {
  const now = 1_800_000_000_000;
  const payload = '{"type":"customer.subscription.updated"}';
  const sign = (seconds: number) => createHmac("sha256", "test-secret").update(`${seconds}.${payload}`).digest("hex");
  const seconds = now / 1000;
  verifySignature(payload, `t=${seconds},v1=${"0".repeat(64)},v1=${sign(seconds)}`, "test-secret", now);
  assert.throws(() => verifySignature(payload + " ", `t=${seconds},v1=${sign(seconds)}`, "test-secret", now), { status: 400 });
  for (const offset of [-301, 301]) {
    assert.throws(() => verifySignature(payload, `t=${seconds + offset},v1=${sign(seconds + offset)}`, "test-secret", now), { status: 400 });
  }
  assert.throws(() => verifySignature(payload, `t=invalid,v1=${sign(seconds)}`, "test-secret", now), { status: 400 });
});

test("billing blocks deletion or new checkout until a subscription is terminal", () => {
  for (const status of ["active", "trialing", "past_due", "unpaid", "paused", "incomplete", null]) assert.equal(hasUnfinishedSubscription("sub_test", status), true);
  for (const status of ["canceled", "incomplete_expired"]) assert.equal(hasUnfinishedSubscription("sub_test", status), false);
  assert.equal(hasUnfinishedSubscription(null, null), false);
});

test("password verification rejects malformed hashes and oversized input", async () => {
  const hash = await hashPassword("a meaningful password");
  assert.equal(await verifyPassword("a meaningful password", hash), true);
  assert.equal(await verifyPassword("wrong password", hash), false);
  assert.equal(await verifyPassword("x".repeat(1025), hash), false);
  assert.equal(await verifyPassword("password", "scrypt:abc:00"), false);
  await assert.rejects(hashPassword("x".repeat(1025)), { status: 400 });
});
