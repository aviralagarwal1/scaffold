import { isIP } from "node:net";

// Which addresses the server will not talk to.
//
// Kept separate from safe-fetch.ts on purpose: this file has no dependency on
// anything but node:net, so it can be exercised directly by
// `npm run test:guard` without a build step or a stubbed import. The I/O lives
// next door; the rules live here where they can be checked.

/** Loopback, private, link-local, carrier-grade NAT, multicast and reserved. */
export function isBlockedIpv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true;
  const [a, b] = parts;

  if (a === 0) return true;                          // 0.0.0.0/8 "this network"
  if (a === 10) return true;                         // private
  if (a === 127) return true;                        // loopback
  if (a === 169 && b === 254) return true;           // link-local, incl. cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true;  // private
  if (a === 192 && b === 168) return true;           // private
  if (a === 100 && b >= 64 && b <= 127) return true; // carrier-grade NAT
  if (a === 192 && b === 0) return true;             // IETF protocol assignments
  if (a === 198 && (b === 18 || b === 19)) return true; // benchmarking
  if (a >= 224) return true;                         // multicast, reserved, broadcast
  return false;
}

export function isBlockedIpv6(ip: string): boolean {
  const addr = ip.toLowerCase().replace(/^\[|\]$/g, "");

  // IPv4-mapped addresses hide a v4 address inside a v6 one, and they arrive
  // in two spellings. `new URL()` normalises ::ffff:127.0.0.1 to its hex form
  // ::ffff:7f00:1, so checking only the dotted spelling lets loopback through
  // — which is exactly what it did until a test tried it.
  const mappedDotted = addr.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mappedDotted) return isBlockedIpv4(mappedDotted[1]);

  const mappedHex = addr.match(/^::(?:ffff:)?([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (mappedHex) {
    const high = parseInt(mappedHex[1], 16);
    const low = parseInt(mappedHex[2], 16);
    return isBlockedIpv4(`${high >> 8}.${high & 0xff}.${low >> 8}.${low & 0xff}`);
  }

  if (addr === "::" || addr === "::1") return true; // unspecified, loopback
  if (/^f[cd]/.test(addr)) return true;             // fc00::/7 unique local
  if (/^fe[89ab]/.test(addr)) return true;          // fe80::/10 link local
  if (addr.startsWith("ff")) return true;           // multicast
  return false;
}

/** Anything we cannot positively identify as a public address is blocked. */
export function isBlockedAddress(ip: string): boolean {
  const family = isIP(ip.replace(/^\[|\]$/g, ""));
  const bare = ip.replace(/^\[|\]$/g, "");
  if (family === 4) return isBlockedIpv4(bare);
  if (family === 6) return isBlockedIpv6(bare);
  return true;
}
