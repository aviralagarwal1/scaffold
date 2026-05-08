import type { PostSummary } from "@/types/post";
import { formatDate, pluralize } from "@/lib/client/format";

export function PostCard({ post, onSelect }: { post: PostSummary; onSelect?: (post: PostSummary) => void }) {
  const inner = (
    <article className="group flex h-full flex-col gap-2.5 rounded-md border border-ink-200/80 bg-white p-5 text-left shadow-soft transition-all duration-150 ease-editorial hover:-translate-y-px hover:border-ink-300 hover:shadow-lift">
      <div className="flex items-center gap-2 type-meta">
        {post.publishedAt && <span>{formatDate(post.publishedAt)}</span>}
        <span className="text-ink-300">·</span>
        <span>{pluralize(post.wordCount, "word")}</span>
      </div>
      <h3 className="type-h3 leading-snug">{post.title}</h3>
      {post.subtitle && <p className="text-[14px] leading-relaxed text-ink-600">{post.subtitle}</p>}
      {post.excerpt && !post.subtitle && (
        <p className="line-clamp-3 text-[14px] leading-relaxed text-ink-600">{post.excerpt}</p>
      )}
      <div className="mt-auto pt-1.5">
        <a
          href={post.url}
          target="_blank"
          rel="noreferrer"
          className="link-soft text-[12.5px]"
          onClick={(e) => e.stopPropagation()}
        >
          Read on Substack
        </a>
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
