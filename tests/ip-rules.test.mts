// Address rules for the outbound fetch guard.
//
// The rules import nothing but node:net, so Node's type stripping runs them
// directly under node:test.
//
// This exists because the first version of these rules leaked. `new URL()`
// normalises ::ffff:127.0.0.1 to its hex form ::ffff:7f00:1, the dotted-quad
// check never matched, and IPv4-mapped loopback sailed through. Nothing in
// the typechecker or the build would ever have said so. Add a case here
// whenever the rules change.

import assert from "node:assert/strict";
import { test } from "node:test";
import { isBlockedAddress } from "../lib/server/ip-rules.ts";

const BLOCKED = [
  ["127.0.0.1", "loopback"],
  ["0.0.0.0", "unspecified"],
  ["10.0.0.5", "private class A"],
  ["172.16.0.1", "private class B"],
  ["172.31.255.255", "private class B, top of range"],
  ["192.168.1.1", "private class C"],
  ["169.254.169.254", "link-local — cloud metadata"],
  ["100.64.0.1", "carrier-grade NAT"],
  ["192.0.0.1", "IETF protocol assignments"],
  ["198.18.0.1", "benchmarking"],
  ["224.0.0.1", "multicast"],
  ["255.255.255.255", "broadcast"],
  ["::1", "IPv6 loopback"],
  ["::", "IPv6 unspecified"],
  ["fd00::1", "unique local"],
  ["fe80::1", "link local"],
  ["ff02::1", "multicast"],
  ["::ffff:127.0.0.1", "IPv4-mapped loopback, dotted"],
  ["::ffff:7f00:1", "IPv4-mapped loopback, hex — the one that leaked"],
  ["::ffff:a9fe:a9fe", "IPv4-mapped metadata, hex"],
  ["::ffff:10.0.0.1", "IPv4-mapped private, dotted"],
  ["not-an-address", "unparseable"],
  ["", "empty"],
];

const ALLOWED = [
  ["93.184.216.34", "public IPv4"],
  ["1.1.1.1", "public resolver"],
  ["172.15.0.1", "just below the private class B range"],
  ["172.32.0.1", "just above the private class B range"],
  ["2606:2800:220:1:248:1893:25c8:1946", "public IPv6"],
  ["::ffff:93.184.216.34", "IPv4-mapped public"],
];

test("the fetch guard blocks private, reserved and mapped addresses", () => {
  const leaks = BLOCKED.filter(([ip]) => !isBlockedAddress(ip)).map(([ip, why]) => `${ip} (${why})`);
  assert.deepEqual(leaks, []);
});

test("the fetch guard allows public addresses next to blocked ranges", () => {
  const falsePositives = ALLOWED.filter(([ip]) => isBlockedAddress(ip)).map(([ip, why]) => `${ip} (${why})`);
  assert.deepEqual(falsePositives, []);
});
