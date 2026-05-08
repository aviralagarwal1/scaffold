import { AppError } from "./errors";

export function normalizePublicationUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new AppError("Enter a publication URL.", 400);
  }

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  let url: URL;
  try {
    url = new URL(withProtocol);
  } catch {
    throw new AppError("Enter a valid publication URL.", 400);
  }

  rejectUnsupportedPublicationUrl(url);

  if (!url.hostname.includes(".")) {
    throw new AppError("Enter a full publication domain, like example.substack.com.", 400);
  }

  url.hash = "";
  url.search = "";
  url.pathname = "";
  return url.toString().replace(/\/$/, "");
}

export function feedUrlForPublication(publicationUrl: string): string {
  return `${publicationUrl.replace(/\/$/, "")}/feed`;
}

function rejectUnsupportedPublicationUrl(url: URL) {
  const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
  const pathname = url.pathname.replace(/\/+$/, "") || "/";

  if (hostname === "substack.com") {
    if (pathname === "/" || pathname.startsWith("/@") || pathname.startsWith("/profile")) {
      throw new AppError("Enter the publication homepage, like example.substack.com.", 400);
    }
    throw new AppError("Enter the publication homepage, like example.substack.com.", 400);
  }

  if (hostname === "linkedin.com" || hostname.endsWith(".linkedin.com")) {
    throw new AppError("LinkedIn imports are not supported yet. Add a public publication URL with an RSS feed.", 400);
  }

  if (
    hostname === "x.com" ||
    hostname.endsWith(".x.com") ||
    hostname === "twitter.com" ||
    hostname.endsWith(".twitter.com") ||
    hostname === "instagram.com" ||
    hostname.endsWith(".instagram.com")
  ) {
    throw new AppError("Social profile URLs are not supported yet. Add a public publication URL with an RSS feed.", 400);
  }
}
