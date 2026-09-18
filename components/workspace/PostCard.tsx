import type { PostSummary } from "@/types/post";
import { formatDate, pluralize } from "@/lib/client/format";

export function PostCard({
  post,
  onSelect,
  onSync,
  syncing = false,
}: {
  post: PostSummary;
  onSelect?: (post: PostSummary) => void;
  onSync?: (post: PostSummary) => void;
  syncing?: boolean;
}) {
  const inner = (
    <article className="group flex h-full flex-col gap-2.5 rounded-md border border-ink-200/80 bg-white p-5 text-left shadow-soft transition-all duration-150 ease-editorial hover:-translate-y-px hover:border-ink-300 hover:shadow-lift">
      <div className="flex items-center gap-2 type-meta">
        {post.publishedAt && <span>{formatDate(post.publishedAt)}</span>}
        <span className="text-ink-300">&middot;</span>
        <span>{pluralize(post.wordCount, "word")}</span>
      </div>
      <h3 className="type-h3 leading-snug">{post.title}</h3>
      {post.subtitle && <p className="text-[14px] leading-relaxed text-ink-600">{post.subtitle}</p>}
      {post.excerpt && !post.subtitle && (
        <p className="line-clamp-3 text-[14px] leading-relaxed text-ink-600">{post.excerpt}</p>
      )}
      <div className="mt-auto flex flex-wrap items-center gap-2 pt-1.5">
        <a
          href={post.url}
          target="_blank"
          rel="noreferrer"
          className="link-soft text-[12.5px]"
          onClick={(e) => e.stopPropagation()}
        >
          Read original &rarr;
        </a>
        {onSync && !onSelect && (
          <>
            <span className="text-ink-300" aria-hidden="true">
              &middot;
            </span>
            <button
              type="button"
              onClick={() => onSync(post)}
              disabled={syncing}
              className="link-soft text-[12.5px] disabled:cursor-wait disabled:text-ink-400 disabled:no-underline"
            >
              {syncing ? "Syncing..." : "Sync post"} {!syncing && <span aria-hidden="true">&rarr;</span>}
            </button>
          </>
        )}
      </div>
    </article>
  );

  if (onSelect) {
    return (
      <button type="button" onClick={() => onSelect(post)} className="block h-full w-full text-left">
        {inner}
      </button>
    );
  }
  return inner;
}
