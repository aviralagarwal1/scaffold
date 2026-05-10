import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { AppError } from "../app-error.ts";

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;

export async function hashPassword(password: string): Promise<string> {
  if (password.length < 8 || password.length > 1024) throw new AppError("Use a password between 8 and 1,024 characters.", 400);
  const salt = randomBytes(16).toString("hex");
  const derived = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
  return `scrypt:${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string | null): Promise<boolean> {
  if (!stored || password.length > 1024) return false;
  const [scheme, salt, hash] = stored.split(":");
  if (scheme !== "scrypt" || !/^[a-f0-9]{32}$/.test(salt ?? "") || !/^[a-f0-9]{128}$/.test(hash ?? "")) return false;

  const actual = Buffer.from(hash, "hex");
  const derived = (await scrypt(password, salt, actual.length)) as Buffer;
  return actual.length === derived.length && timingSafeEqual(actual, derived);
}
