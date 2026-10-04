import type { Post } from "@/types/post";
import { randomUUID } from "crypto";
import { AppError } from "./errors";
import { feedUrlForPublication } from "./url";
import { safeFetch } from "./safe-fetch";
import { decodeEntities, stripHtml, wordCount } from "./text";

// Scaffold says what it is. A feed that refuses this request is not
// retried in disguise: an earlier version resent it with a browser's TLS
// fingerprint, which is getting past a site's bot protection, not reading a
// public feed.
const RSS_HEADERS = {
  accept: "application/rss+xml, application/xml;q=0.9, text/xml;q=0.8, */*;q=0.7",
  "user-agent": "Scaffold/0.1 (+https://github.com/aviralagarwal1/scaffold)"
};

export interface ParsedFeedPost {
  title: string;
  subtitle: string | null;
  url: string;
  publishedAt: string | null;
  author: string | null;
  contentText: string;
  contentHtml: string | null;
}

interface ParsedFeed {
  publicationName: string | null;
  posts: ParsedFeedPost[];
}

export interface PublicationFeed {
  publicationUrl: string;
  feedUrl: string;
  publicationName: string | null;
  posts: ParsedFeedPost[];
}

function tagValue(xml: string, tag: string): string | null {
  const pattern = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i");
  const match = xml.match(pattern);
  if (!match) return null;
  return decodeEntities(match[1].replace(/^<!\[CDATA\[([\s\S]*)\]\]>$/i, "$1").trim());
}

function itemBlocks(xml: string): string[] {
  return [...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)].map((match) => match[0]);
}

function parseFeed(xml: string): ParsedFeed {
  const publicationName = tagValue(xml, "title");

  const posts = itemBlocks(xml)
    .map((item) => {
      const title = tagValue(item, "title") ?? "Untitled post";
      const url = tagValue(item, "link") ?? tagValue(item, "guid") ?? "";
      const descriptionHtml = tagValue(item, "description");
      const contentHtml = tagValue(item, "content:encoded") ?? descriptionHtml;
      const contentText = stripHtml(contentHtml ?? "");
      const publishedRaw = tagValue(item, "pubDate") ?? tagValue(item, "dc:date");
      const publishedAt = parseDate(publishedRaw);
      const subtitle = tagValue(item, "subtitle") ?? tagValue(item, "itunes:subtitle") ?? descriptionHtml;

      return {
        title,
        subtitle: subtitle ? stripHtml(subtitle) : null,
        url,
        publishedAt,
        author: tagValue(item, "dc:creator") ?? tagValue(item, "author"),
        contentText,
        contentHtml
      };
    })
    .filter((post) => post.url && post.contentText.length > 80);

  return { publicationName, posts };
}

function parseDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function isRefusalStatus(status: number): boolean {
  return status === 401 || status === 403 || status === 429;
}

/** The feed exists but turned the request away, usually bot protection. */
export class FeedRefusedError extends AppError {
  constructor(status: number) {
    super(`This publication's feed refused the request (HTTP ${status}), so Scaffold can't read it.`, 502);
  }
}

function looksLikeXml(value: string): boolean {
  const trimmed = value.trimStart();
  return trimmed.startsWith("<?xml") || trimmed.startsWith("<rss") || trimmed.startsWith("<feed");
}

async function fetchFeedXml(feedUrl: string): Promise<{ xml: string; feedUrl: string }> {
  const attempted = new Set<string>();
  return fetchFeedXmlCandidate(feedUrl, attempted);
}

async function fetchFeedXmlCandidate(feedUrl: string, attempted: Set<string>): Promise<{ xml: string; feedUrl: string }> {
  attempted.add(feedUrl);
  // safeFetch resolves the host and checks every redirect hop, so a public
  // URL cannot bounce the request onto a private address.
  const response = await safeFetch(feedUrl, { headers: RSS_HEADERS });

  const body = response.body;
  if (response.ok && looksLikeXml(body)) {
    return { xml: body, feedUrl: response.url || feedUrl };
  }

  const redirectedFeedUrl = redirectedOriginFeedUrl(feedUrl, response.url);
  if (redirectedFeedUrl && !attempted.has(redirectedFeedUrl)) {
    return fetchFeedXmlCandidate(redirectedFeedUrl, attempted);
  }

  if (isRefusalStatus(response.status)) {
    throw new FeedRefusedError(response.status);
  }

  const reason = response.ok ? "RSS endpoint did not return XML." : `RSS endpoint returned ${response.status}.`;
  throw new Error(`${reason} Feed URL: ${feedUrl}`);
}

export async function fetchSubstackFeed(publicationUrl: string, workspaceId: string): Promise<{
  publicationName: string | null;
  posts: Post[];
}> {
  const feed = await fetchPublicationFeed(publicationUrl);

  return {
    publicationName: feed.publicationName,
    posts: materializeFeedPosts(feed, workspaceId)
  };
}

export async function fetchPublicationFeed(publicationUrl: string): Promise<PublicationFeed> {
  const fetched = await fetchFeedXml(feedUrlForPublication(publicationUrl));
  const parsed = parseFeed(fetched.xml);

  return {
    publicationUrl,
    feedUrl: fetched.feedUrl,
    publicationName: parsed.publicationName,
    posts: parsed.posts
  };
}

export function materializeFeedPosts(feed: PublicationFeed, workspaceId: string): Post[] {
  const now = new Date().toISOString();

  return feed.posts.map((post) => ({
    id: randomUUID(),
    workspaceId,
    title: post.title,
    subtitle: post.subtitle,
    url: post.url,
    publishedAt: post.publishedAt,
    author: post.author,
    contentText: post.contentText,
    contentHtml: post.contentHtml,
    wordCount: wordCount(post.contentText),
    createdAt: now
  }));
}

function redirectedOriginFeedUrl(requestedFeedUrl: string, responseUrl: string): string | null {
  if (!responseUrl) return null;

  try {
    const requested = new URL(requestedFeedUrl);
    const redirected = new URL(responseUrl);
    if (requested.origin === redirected.origin) return null;
    return feedUrlForPublication(redirected.origin);
  } catch {
    return null;
  }
}
