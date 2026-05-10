import type { Idea } from "@/types/ai";
import { SourceCitation } from "./SourceCitation";

export function IdeaCard({ idea }: { idea: Idea }) {
  return (
    <article className="panel group flex flex-col gap-4 p-5 transition-all duration-200 ease-editorial hover:-translate-y-px hover:shadow-lift">
      <header>
        <div className="mb-2 type-eyebrow text-ink-400">Lens: {idea.lens}</div>
        <h3 className="type-h3 leading-snug">{idea.title}</h3>
        <p className="mt-2 text-[14.5px] leading-relaxed text-ink-700">{idea.thesis}</p>
      </header>
      {idea.whyItFits && (
        <div className="rounded-md border border-ink-200/60 bg-ink-50/80 px-3 py-2.5 text-[13px] leading-relaxed text-ink-700">
          <span className="font-medium text-ink-900">Why it fits you. </span>
          {idea.whyItFits}
        </div>
      )}
      {idea.relatedPosts.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="type-eyebrow text-ink-400">Related from your library</div>
          <div className="grid gap-2 sm:grid-cols-2">
            {idea.relatedPosts.slice(0, 4).map((p, i) => (
              <SourceCitation key={`${p.url}-${i}`} source={p} />
            ))}
          </div>
        </div>
      )}
    </article>
  );
}
