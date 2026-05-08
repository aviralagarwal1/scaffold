import { AppError } from "./errors";

export async function readJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new AppError("Request body must be valid JSON.", 400);
  }
}

export function requireString(value: unknown, message: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new AppError(message, 400);
  }
  return value.trim();
}
