import type { GrammarIssue } from "@/types/ai";
import { cn } from "@/lib/client/cn";

const SEV: Record<GrammarIssue["severity"], { ring: string; dot: string; label: string }> = {
  low: { ring: "border-ink-200 text-ink-600", dot: "bg-ink-400", label: "Low" },
  medium: { ring: "border-warn-100 text-warn-700", dot: "bg-warn-500", label: "Medium" },
  high: { ring: "border-critical-100 text-critical-700", dot: "bg-critical-500", label: "High" },
};

function humanizeIssueType(t: string): string {
  return t.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function GrammarIssueCard({ issue }: { issue: GrammarIssue }) {
  const sev = SEV[issue.severity];
  return (
    <article className="panel flex flex-col gap-3 p-5">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border bg-white px-2 py-0.5 text-[10.5px] font-medium uppercase tracking-[0.08em]",
              sev.ring,
            )}
          >
            <span aria-hidden="true" className={cn("h-1.5 w-1.5 rounded-full", sev.dot)} />
            {sev.label}
          </span>
          <span className="text-[12px] font-medium text-ink-700">{humanizeIssueType(issue.issueType)}</span>
        </div>
        {issue.postTitle && <div className="truncate type-meta">{issue.postTitle}</div>}
      </header>

      <div className="flex flex-col gap-2.5">
        <Quote eyebrow="Original" tone="neutral" text={issue.originalText} />
        {issue.suggestedText && <Quote eyebrow="Suggested" tone="positive" text={issue.suggestedText} />}
      </div>

      {issue.explanation && <p className="text-[13px] leading-relaxed text-ink-600">{issue.explanation}</p>}
    </article>
  );
}

function Quote({ eyebrow, tone, text }: { eyebrow: string; tone: "neutral" | "positive"; text: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div
        className={cn(
          "type-eyebrow",
          tone === "positive" && "text-positive-700",
        )}
      >
        {eyebrow}
      </div>
      <blockquote
        className={cn(
          "rounded-md border-l-2 py-2 pl-3 pr-3 font-serif text-[14.5px] leading-relaxed text-ink-800",
          tone === "neutral"
            ? "border-ink-300 bg-ink-50/80"
            : "border-positive-500 bg-positive-100/40",
        )}
      >
        {text}
      </blockquote>
    </div>
  );
}
