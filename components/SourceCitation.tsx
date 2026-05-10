import type { SourceCitation as Source } from "@/types/ai";
import { formatDate, truncate } from "@/lib/client/format";

export function SourceCitation({ source, index }: { source: Source; index?: number }) {
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noreferrer"
      className="group flex flex-col gap-1 rounded-md border border-ink-200/80 bg-white px-3 py-2.5 text-[12.5px] transition-colors duration-150 ease-editorial hover:border-accent-300 hover:bg-accent-50/40"
    >
      <div className="flex items-center gap-2 type-meta">
        {typeof index === "number" && (
          <span className="grid h-4 min-w-4 place-items-center rounded-sm bg-ink-100 px-1 font-mono text-[10px] font-medium text-ink-700 group-hover:bg-accent-100 group-hover:text-accent-700">
            {String(index + 1).padStart(2, "0")}
          </span>
        )}
        {source.publishedAt && <span>{formatDate(source.publishedAt)}</span>}
      </div>
      <div className="font-medium leading-snug text-ink-900 group-hover:text-ink-900">{source.title}</div>
      {source.snippet && (
        <p className="line-clamp-2 leading-snug text-ink-600">{truncate(source.snippet.replace(/\s+/g, " "), 200)}</p>
      )}
    </a>
  );
}

export function SourceCitationList({ sources }: { sources: Source[] }) {
  if (!sources.length) return null;
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2 type-eyebrow">
        <span className="accent-rule" />
        Cited from your library
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {sources.map((s, i) => (
          <SourceCitation key={`${s.url}-${i}`} source={s} index={i} />
        ))}
      </div>
    </div>
  );
}
