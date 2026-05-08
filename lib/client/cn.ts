export type ClassValue = string | number | null | false | undefined | ClassValue[] | { [key: string]: unknown };

export function cn(...values: ClassValue[]): string {
  const out: string[] = [];
  const walk = (v: ClassValue) => {
    if (!v) return;
    if (typeof v === "string" || typeof v === "number") {
      out.push(String(v));
      return;
    }
    if (Array.isArray(v)) {
      v.forEach(walk);
      return;
    }
    if (typeof v === "object") {
      for (const [key, val] of Object.entries(v)) {
        if (val) out.push(key);
      }
    }
  };
  values.forEach(walk);
  return out.join(" ");
}
