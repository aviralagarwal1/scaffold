import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { AppError } from "./errors";
import { isBlockedAddress } from "./ip-rules";

// Guarded outbound fetch.
//
// Publication URLs come from whoever is signed in, and the server fetches
// them. Without a check on where that lands, an account can point Scaffold at
// anything the Cloud Run instance can reach and read the outcome back out of
// the error message — a scanner with a status oracle attached.
//
// Three things are enforced here, and all three matter:
//
//   1. The address, not the hostname. A name check is not enough, because
//      a hostname can resolve to a private address. Every name is resolved
//      and every resolved address is checked.
//   2. Every redirect hop. Validating once and then following redirects is
//      the classic bypass: a public URL that 302s to 169.254.169.254 passes
//      the front door and walks straight through. Redirects are handled by
//      hand so each hop is re-checked.
//   3. Size and time. The service runs at one instance, so an unbounded read
//      is an out-of-memory kill and a slow response is a hang. Both are
//      capped.

/**
 * Resolve a URL's host and reject it if any address it answers to is one we
 * will not talk to. Checking every answer rather than the first matters: a
 * host that returns both a public and a private address would otherwise pass
 * on a lucky ordering.
 */
async function assertPublicDestination(url: URL): Promise<void> {
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new AppError("Publication links must be http or https.", 400);
  }

  const host = url.hostname.replace(/^\[|\]$/g, "");

  if (isIP(host)) {
    if (isBlockedAddress(host)) {
      throw new AppError("That address is not reachable from Scaffold.", 400);
    }
    return;
  }

  let addresses: { address: string }[];
  try {
    addresses = await lookup(host, { all: true });
  } catch {
    throw new AppError("Could not resolve that publication domain.", 400);
  }

  if (!addresses.length || addresses.some((entry) => isBlockedAddress(entry.address))) {
    throw new AppError("That address is not reachable from Scaffold.", 400);
  }
}

export interface SafeFetchOptions {
  headers?: Record<string, string>;
  /** Give up on the whole exchange after this long. */
  timeoutMs?: number;
  /** Stop reading past this many bytes rather than buffering whatever arrives. */
  maxBytes?: number;
  /** How many redirects to follow, each one re-checked. */
  maxRedirects?: number;
}

export interface SafeFetchResult {
  ok: boolean;
  status: number;
  /** Where the response actually came from, after any redirects. */
  url: string;
  body: string;
  truncated: boolean;
}

const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_MAX_BYTES = 5 * 1024 * 1024;
const DEFAULT_MAX_REDIRECTS = 4;

/**
 * Fetch a URL that came from a user, following redirects by hand so every hop
 * is checked, and reading the body under a byte cap.
 */
export async function safeFetch(rawUrl: string, options: SafeFetchOptions = {}): Promise<SafeFetchResult> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
  const maxRedirects = options.maxRedirects ?? DEFAULT_MAX_REDIRECTS;

  let current: URL;
  try {
    current = new URL(rawUrl);
  } catch {
    throw new AppError("Enter a valid publication URL.", 400);
  }

  const deadline = AbortSignal.timeout(timeoutMs);

  for (let hop = 0; hop <= maxRedirects; hop += 1) {
    await assertPublicDestination(current);

    const response = await fetch(current, {
      headers: options.headers,
      redirect: "manual",
      signal: deadline,
      cache: "no-store",
    });

    const location = response.headers.get("location");
    if (response.status >= 300 && response.status < 400 && location) {
      if (hop === maxRedirects) {
        throw new AppError("That publication redirected too many times.", 400);
      }
      try {
        current = new URL(location, current);
      } catch {
        throw new AppError("That publication redirected somewhere invalid.", 400);
      }
      continue;
    }

    const { body, truncated } = await readCapped(response, maxBytes);
    return { ok: response.ok, status: response.status, url: current.toString(), body, truncated };
  }

  throw new AppError("That publication redirected too many times.", 400);
}

/**
 * Read a response body but stop at the cap. `response.text()` buffers whatever
 * arrives, and on a single-instance service that is an out-of-memory kill
 * rather than a slow page.
 */
async function readCapped(response: Response, maxBytes: number): Promise<{ body: string; truncated: boolean }> {
  if (!response.body) return { body: "", truncated: false };

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const chunks: string[] = [];
  let total = 0;
  let truncated = false;

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        chunks.push(decoder.decode(value.slice(0, value.byteLength - (total - maxBytes)), { stream: false }));
        truncated = true;
        break;
      }
      chunks.push(decoder.decode(value, { stream: true }));
    }
  } finally {
    await reader.cancel().catch(() => {});
  }

  return { body: chunks.join(""), truncated };
}
