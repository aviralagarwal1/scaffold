import { AppError } from "./app-error.ts";

const MAX_JSON_BYTES = 256 * 1024;

/** Bound streamed bodies as well as declared lengths; preserve webhook bytes. */
export async function readBody(request: Request, maxBytes = MAX_JSON_BYTES): Promise<string> {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) throw new AppError("Request is too large.", 413);
  if (!request.body) return "";
  const reader = request.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  const parts: string[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new AppError("Request is too large.", 413);
      }
      parts.push(decoder.decode(value, { stream: true }));
    }
    parts.push(decoder.decode());
    return parts.join("");
  } finally {
    reader.releaseLock();
  }
}

export async function readJson<T>(request: Request, maxBytes = MAX_JSON_BYTES): Promise<T> {
  try {
    const body: unknown = JSON.parse(await readBody(request, maxBytes));
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new AppError("Request body must be a JSON object.", 400);
    return body as T;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("Request body must be valid JSON.", 400);
  }
}

export function requireString(value: unknown, message: string, maxLength = 50_000): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new AppError(message, 400);
  }
  if (value.length > maxLength) throw new AppError(`Use no more than ${maxLength.toLocaleString("en-US")} characters.`, 400);
  return value.trim();
}
