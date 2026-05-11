import type { DistributionPlatform } from "@/types/ai";
import type { WorkspaceStatus } from "@/types/workspace";

export function formatDate(value: string | null | undefined, opts?: { withTime?: boolean }): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const date = d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  if (!opts?.withTime) return date;
  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${date} · ${time}`;
}

export function formatRelative(value: string | null | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const diff = Date.now() - d.getTime();
  const sec = Math.round(diff / 1000);
  if (sec < 60) return "just now";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day} day${day === 1 ? "" : "s"} ago`;
  if (day < 30) {
    const w = Math.round(day / 7);
    return `${w} wk${w === 1 ? "" : "s"} ago`;
  }
  const mo = Math.round(day / 30);
  if (mo < 12) return `${mo} mo ago`;
  const yr = Math.round(mo / 12);
  return `${yr} yr${yr === 1 ? "" : "s"} ago`;
}

export function pluralize(n: number, singular: string, plural?: string): string {
  return `${n.toLocaleString()} ${n === 1 ? singular : plural ?? singular + "s"}`;
}

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1).trimEnd() + "…";
}

export function platformLabel(platform: DistributionPlatform): string {
  switch (platform) {
    case "twitter":
      return "Twitter / X";
    case "linkedin":
      return "LinkedIn";
    case "reddit":
      return "Reddit";
    case "facebook":
      return "Facebook";
    case "instagram":
      return "Instagram";
  }
}

// Practical character ceilings per platform. Used to flag over-limit drafts
// in the UI without blocking the writer from editing past them. The limits
// vary by platform tier, so these are conservative defaults a writer can target.
export function platformCharLimit(platform: DistributionPlatform): number {
  switch (platform) {
    case "twitter":
      return 280;
    case "linkedin":
      return 3000;
    case "reddit":
      return 40000;
    case "facebook":
      return 5000;
    case "instagram":
      return 2200;
  }
}

export function statusLabel(status: WorkspaceStatus): string {
  switch (status) {
    case "ready":
      return "Live";
    case "pending":
    case "ingesting":
      return "Syncing";
    case "partial":
      return "Partial";
    case "failed":
      return "Failed";
  }
}

export function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
