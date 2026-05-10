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
