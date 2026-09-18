import { Fragment, type ReactNode } from "react";

/**
 * Only render a link the browser should be willing to follow.
 *
 * The text here is model output composed from library posts, and a library is
 * built from whatever a public publication chose to publish. A post could
 * carry `[click me](javascript:…)` and it would arrive here as an ordinary
 * link. Anything that is not plainly http, https or mailto renders as text
 * instead of a link.
 */
function safeHref(raw: string): string | null {
  const href = raw.trim();
  if (href.startsWith("/") || href.startsWith("#")) return href;
  try {
    const { protocol } = new URL(href);
    return protocol === "http:" || protocol === "https:" || protocol === "mailto:" ? href : null;
  } catch {
    return null;
  }
}

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let remaining = text;
  let i = 0;
  const pattern = /\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\)/;
  while (remaining.length) {
    const m = pattern.exec(remaining);
    if (!m) {
      nodes.push(<Fragment key={`${keyPrefix}-t-${i++}`}>{remaining}</Fragment>);
      break;
    }
    if (m.index > 0) {
      nodes.push(<Fragment key={`${keyPrefix}-t-${i++}`}>{remaining.slice(0, m.index)}</Fragment>);
    }
    if (m[1]) {
      nodes.push(<strong key={`${keyPrefix}-b-${i++}`}>{m[1]}</strong>);
    } else if (m[2]) {
      nodes.push(<em key={`${keyPrefix}-i-${i++}`}>{m[2]}</em>);
    } else if (m[3]) {
      nodes.push(
        <code key={`${keyPrefix}-c-${i++}`} className="rounded bg-ink-100 px-1 py-0.5 font-mono text-[0.85em]">
          {m[3]}
        </code>,
      );
    } else if (m[4] && m[5]) {
      const href = safeHref(m[5]);
      nodes.push(
        href ? (
          <a key={`${keyPrefix}-a-${i++}`} href={href} target="_blank" rel="noreferrer" className="text-ink-900 underline underline-offset-2 hover:text-ink-700">
            {m[4]}
          </a>
        ) : (
          <Fragment key={`${keyPrefix}-a-${i++}`}>{m[4]}</Fragment>
        ),
      );
    }
    remaining = remaining.slice(m.index + m[0].length);
  }
  return nodes;
}

export function Markdown({ text }: { text: string }) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i++;
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const content = headingMatch[2];
      const Tag = (`h${Math.min(level + 2, 6)}`) as "h3" | "h4" | "h5" | "h6";
      blocks.push(
        <Tag key={key++} className="mt-4 font-serif text-base font-semibold text-ink-900 first:mt-0">
          {renderInline(content, `h${key}`)}
        </Tag>,
      );
      i++;
      continue;
    }

    const isBullet = /^\s*[-*]\s+/.test(line);
    if (isBullet) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ""));
        i++;
      }
      blocks.push(
        <ul key={key++} className="ml-5 list-disc space-y-1 text-ink-800">
          {items.map((it, idx) => (
            <li key={idx}>{renderInline(it, `li${key}-${idx}`)}</li>
          ))}
        </ul>,
      );
      continue;
    }

    const isOrdered = /^\s*\d+\.\s+/.test(line);
    if (isOrdered) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ""));
        i++;
      }
      blocks.push(
        <ol key={key++} className="ml-5 list-decimal space-y-1 text-ink-800">
          {items.map((it, idx) => (
            <li key={idx}>{renderInline(it, `oli${key}-${idx}`)}</li>
          ))}
        </ol>,
      );
      continue;
    }

    const para: string[] = [line];
    i++;
    while (i < lines.length && lines[i].trim() && !/^(#{1,6})\s+/.test(lines[i]) && !/^\s*[-*]\s+/.test(lines[i]) && !/^\s*\d+\.\s+/.test(lines[i])) {
      para.push(lines[i]);
      i++;
    }
    blocks.push(
      <p key={key++} className="leading-relaxed text-ink-800">
        {renderInline(para.join(" "), `p${key}`)}
      </p>,
    );
  }

  return <div className="space-y-3 text-sm">{blocks}</div>;
}
