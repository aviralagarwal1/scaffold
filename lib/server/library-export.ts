import type { Post } from "@/types/post";
import type { Workspace } from "@/types/workspace";
import { workspaceCorpus } from "@/lib/server/store";

interface LibraryExport {
  body: string | Buffer;
  contentType: string;
  filename: string;
}

interface ZipEntry {
  filename: string;
  data: Buffer;
}

export async function buildLibraryExport(token: string, format: "txt" | "zip"): Promise<LibraryExport> {
  const { workspace, posts } = await workspaceCorpus(token);
  const sortedPosts = sortPosts(posts);
  const publicationName = publicationLabel(workspace);
  const slug = slugify(publicationName || "library");

  if (format === "zip") {
    return {
      body: buildZip(
        sortedPosts.map((post, index) => ({
          filename: `${String(index + 1).padStart(3, "0")}-${slugify(post.title || "untitled")}.txt`,
          data: Buffer.from(formatSinglePost(post), "utf8"),
        })),
      ),
      contentType: "application/zip",
      filename: `${slug}-posts.zip`,
    };
  }

  return {
    body: formatMegaText(workspace, sortedPosts),
    contentType: "text/plain; charset=utf-8",
    filename: `${slug}-library.txt`,
  };
}

function sortPosts(posts: Post[]): Post[] {
  return posts
    .slice()
    .sort((a, b) => Date.parse(b.publishedAt ?? b.createdAt) - Date.parse(a.publishedAt ?? a.createdAt));
}

function formatMegaText(workspace: Workspace, posts: Post[]): string {
  const publicationName = publicationLabel(workspace);
  const lines = [
    publicationName,
    `Publication URL: ${workspace.publicationUrl}`,
    `Posts: ${posts.length.toLocaleString("en-US")}`,
    `Exported: ${new Date().toISOString()}`,
    "",
    "=".repeat(80),
    "",
  ];

  for (const [index, post] of posts.entries()) {
    lines.push(formatSinglePost(post));
    if (index < posts.length - 1) {
      lines.push("", "=".repeat(80), "");
    }
  }

  return lines.join("\n");
}

function formatSinglePost(post: Post): string {
  return [
    post.title,
    post.subtitle ? `Subtitle: ${post.subtitle}` : null,
    post.publishedAt ? `Published: ${post.publishedAt}` : null,
    post.author ? `Author: ${post.author}` : null,
    `Words: ${post.wordCount.toLocaleString("en-US")}`,
    `URL: ${post.url}`,
    "",
    "-".repeat(80),
    "",
    normalizeText(post.contentText),
  ]
    .filter((line): line is string => line !== null)
    .join("\n");
}

function normalizeText(value: string): string {
  return value.replace(/\r\n?/g, "\n").trim();
}

function publicationLabel(workspace: Workspace): string {
  if (workspace.publicationName?.trim()) return workspace.publicationName.trim();
  try {
    return new URL(workspace.publicationUrl).hostname.replace(/^www\./, "");
  } catch {
    return workspace.publicationUrl;
  }
}

function slugify(value: string): string {
  const slug = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 80);
  return slug || "library";
}

function buildZip(entries: ZipEntry[]): Buffer {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const name = Buffer.from(entry.filename, "utf8");
    const crc = crc32(entry.data);
    const { time, date } = dosDateTime(new Date());

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0x0800, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(time, 10);
    localHeader.writeUInt16LE(date, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(entry.data.length, 18);
    localHeader.writeUInt32LE(entry.data.length, 22);
    localHeader.writeUInt16LE(name.length, 26);
    localHeader.writeUInt16LE(0, 28);

    localParts.push(localHeader, name, entry.data);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0x0800, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt16LE(time, 12);
    centralHeader.writeUInt16LE(date, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(entry.data.length, 20);
    centralHeader.writeUInt32LE(entry.data.length, 24);
    centralHeader.writeUInt16LE(name.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);
    centralParts.push(centralHeader, name);

    offset += localHeader.length + name.length + entry.data.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralDirectory, end]);
}

function dosDateTime(value: Date): { date: number; time: number } {
  const year = Math.max(1980, value.getFullYear());
  return {
    date: ((year - 1980) << 9) | ((value.getMonth() + 1) << 5) | value.getDate(),
    time: (value.getHours() << 11) | (value.getMinutes() << 5) | Math.floor(value.getSeconds() / 2),
  };
}

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const CRC_TABLE = Array.from({ length: 256 }, (_, index) => {
  let crc = index;
  for (let bit = 0; bit < 8; bit += 1) {
    crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  }
  return crc >>> 0;
});
