import type { Post } from "@/types/post";
import { execFile } from "child_process";
import { randomUUID } from "crypto";
import path from "path";
import { promisify } from "util";
import { feedUrlForPublication } from "./url";
import { assertFetchableUrl, safeFetch } from "./safe-fetch";
import { decodeEntities, stripHtml, wordCount } from "./text";

const execFileAsync = promisify(execFile);

const RSS_HEADERS = {
  accept: "application/rss+xml, application/xml;q=0.9, text/xml;q=0.8, */*;q=0.7",
  "accept-language": "en-US,en;q=0.9",
  "cache-control": "no-cache",
  pragma: "no-cache",
  priority: "u=0, i",
  "sec-ch-ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Windows"',
  "sec-fetch-dest": "document",
  "sec-fetch-mode": "navigate",
  "sec-fetch-site": "none",
  "sec-fetch-user": "?1",
  "upgrade-insecure-requests": "1",
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
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

function isBlockingStatus(status: number): boolean {
  return status === 401 || status === 403 || status === 429 || status === 503;
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
  try {
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

    if (isBlockingStatus(response.status) || (response.ok && !looksLikeXml(body))) {
      const fallback = await fetchFeedXmlWithCurlCffi(feedUrl);
      if (fallback) return { xml: fallback, feedUrl };
    }

    const reason = response.ok ? "RSS endpoint did not return XML." : `RSS endpoint returned ${response.status}.`;
    throw new FeedFetchError(`${reason} Feed URL: ${feedUrl}`);
  } catch (error) {
    if (error instanceof FeedFetchError) {
      throw error;
    }

    const fallback = await fetchFeedXmlWithCurlCffi(feedUrl);
    if (fallback) return { xml: fallback, feedUrl };

    throw error;
  }
}

class FeedFetchError extends Error {}

async function fetchFeedXmlWithCurlCffi(feedUrl: string): Promise<string | null> {
  // The guard cannot see inside curl_cffi, so the destination is checked here
  // and redirects are refused below — a redirect the guard never inspects is
  // exactly the hole this whole module exists to close. A feed that only
  // works via a redirect will fail rather than be followed blind.
  try {
    await assertFetchableUrl(feedUrl);
  } catch {
    return null;
  }

  const script = [
    "import json, sys",
    "from curl_cffi import requests",
    "url = sys.argv[1]",
    "headers = json.loads(sys.argv[2])",
    "response = requests.get(url, headers=headers, impersonate='chrome124', timeout=20, allow_redirects=False)",
    "sys.stdout.write(response.text)",
    "sys.exit(0 if response.status_code < 400 else response.status_code)"
  ].join("\n");

  for (const command of pythonCommands()) {
    try {
      const { stdout } = await execFileAsync(command, ["-c", script, feedUrl, JSON.stringify(RSS_HEADERS)], {
        env: withoutProxyEnvironment(),
        timeout: 25_000,
        maxBuffer: 8 * 1024 * 1024,
        windowsHide: true
      });

      if (looksLikeXml(stdout)) {
        return stdout;
      }
    } catch (error) {
      console.warn(`curl_cffi RSS fallback failed with ${command}.`, error);
    }
  }

  return null;
}

function pythonCommands(): string[] {
  return [
    ...new Set(
      [
        process.env.PYTHON,
        path.join(process.cwd(), ".venv", "Scripts", "python.exe"),
        path.join(process.cwd(), ".venv", "bin", "python"),
        "python",
        "python3",
        "py"
      ].filter((command): command is string => Boolean(command))
    )
  ];
}

function withoutProxyEnvironment(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  for (const key of ["HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "http_proxy", "https_proxy", "all_proxy"]) {
    delete env[key];
  }
  return env;
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
