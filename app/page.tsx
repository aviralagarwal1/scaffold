import Link from "next/link";
import { SubstackUrlForm } from "@/components/SubstackUrlForm";

const STEPS = [
  {
    title: "Start your workspace.",
    body: "Paste your Substack URL or custom domain. We only read public posts.",
  },
  {
    title: "We read your archive.",
    body: "Posts are parsed, indexed, and grounded in a private archive workspace.",
  },
  {
    title: "We surface patterns and insights.",
    body: "Ask questions, revisit old ideas, and refine new drafts in your voice.",
  },
];

const SAMPLE_INSIGHTS = [
  {
    quote:
      "Across your archive, your strongest pieces tend to open with a personal observation before moving into a broader product or culture argument.",
    source: "From Ask AI",
  },
  {
    quote:
      "Your last six essays all rely on the same three-act structure. The reader can feel the pattern. Try opening cold on a scene.",
    source: "From Draft feedback",
  },
  {
    quote:
      "Recurring pattern. Long opening sentences with multiple clauses before the main claim. Five posts in the last quarter do this.",
    source: "From Grammar audit",
  },
];

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-ink-200/60">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(900px 360px at 18% -10%, rgba(180, 94, 44, 0.07), transparent 60%), radial-gradient(800px 320px at 100% 0%, rgba(180, 94, 44, 0.04), transparent 55%)",
          }}
        />
        <div className="mx-auto grid max-w-6xl gap-12 px-6 py-20 md:grid-cols-12 md:items-start md:gap-x-10 md:py-28">
          <div className="md:col-span-7 md:pr-4 lg:col-span-6">
            <h1 className="animate-rise animate-delay-1 font-serif text-[44px] leading-[1.04] tracking-tighter2 text-ink-900 md:text-[60px] md:leading-[1.02]">
              Agents that know your{" "}
              <span className="relative whitespace-nowrap">
                <em className="font-serif font-normal italic">entire</em>
                <span
                  aria-hidden="true"
                  className="absolute -bottom-0.5 left-0 right-0 h-[7px] -skew-x-6 rounded-sm bg-accent-200/55"
                />
              </span>{" "}
              Substack archive.
            </h1>

            <p className="animate-rise animate-delay-2 mt-7 max-w-[46ch] font-serif text-[18px] leading-[1.55] text-ink-700 md:text-[19px]">
              A working memory of everything you've published. The patterns you stopped noticing become visible, the
              half-finished essays return, and every editorial note cites the work behind it.
            </p>

            <div className="animate-rise animate-delay-3 mt-10 max-w-xl">
              <SubstackUrlForm autoFocus />
            </div>
          </div>

          {/* Aside uses fade-only — it has its own translate-y for layout, so we
              avoid composing two transforms during the entrance animation. */}
          <aside className="animate-fade animate-delay-3 md:col-span-5 md:col-start-8 md:-translate-y-4 lg:col-start-8 lg:translate-x-2 lg:-translate-y-6">
            <SampleAnswerCard />
          </aside>
        </div>
      </section>

      {/* § 02 — How it works */}
      <section className="animate-rise animate-delay-4 border-b border-ink-200/60 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <header className="mb-14 grid gap-6 md:grid-cols-12 md:items-end">
            <div className="md:col-span-7">
              <SectionMarker number="02" title="How it works" />
              <h2 className="mt-4 font-serif text-[34px] leading-[1.1] tracking-tightish text-ink-900 md:text-[44px]">
                Three steps.{" "}
                <span className="italic text-ink-700">Less than a minute.</span>
              </h2>
            </div>
            <p className="text-[15.5px] leading-relaxed text-ink-600 md:col-span-4 md:col-start-9 md:text-right">
            </p>
          </header>

          <ol className="grid gap-x-10 gap-y-12 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <li
                key={s.title}
                className={`relative flex flex-col gap-3 ${
                  i > 0 ? "md:border-l md:border-ink-200/60 md:pl-8" : ""
                }`}
              >
                <div className="flex items-baseline gap-3">
                  <span className="font-serif text-[44px] leading-none text-accent-300/90">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="font-serif text-[19px] leading-snug tracking-tightish text-ink-900">{s.title}</h3>
                <p className="text-[14.5px] leading-relaxed text-ink-600">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* § 03 — Grounded answers */}
      <section className="animate-rise animate-delay-5 border-b border-ink-200/60">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <header className="mb-14 grid gap-6 md:grid-cols-12 md:items-end">
            <div className="md:col-span-8">
              <SectionMarker number="03" title="Grounded answers" />
              <h2 className="mt-4 font-serif text-[34px] leading-[1.1] tracking-tightish text-ink-900 md:whitespace-nowrap md:text-[44px]">
                Every answer is{" "}
                <span className="italic text-ink-700">tethered to a post.</span>
              </h2>
            </div>
            <p className="text-[15.5px] leading-relaxed text-ink-600 md:col-span-4 md:col-start-9 md:text-right">
            </p>
          </header>

          <div className="grid gap-6 md:grid-cols-12">
            {/* Featured insight — left, larger */}
            <FeatureInsight insight={SAMPLE_INSIGHTS[0]} />

            {/* Two supporting insights stacked on the right */}
            <div className="flex flex-col gap-6 md:col-span-5">
              <SupportingInsight insight={SAMPLE_INSIGHTS[1]} />
              <SupportingInsight insight={SAMPLE_INSIGHTS[2]} />
            </div>
          </div>
        </div>
      </section>

      {/* Closing — typographic statement, no eyebrow chrome */}
      <section className="animate-rise animate-delay-6 bg-white">
        <div className="mx-auto max-w-4xl px-6 py-28 text-center">
          <h2 className="font-serif text-[44px] leading-[1.04] tracking-tighter2 text-ink-900 md:text-[60px]">
            Stop pasting your posts
            <br />
            into ChatGPT.
          </h2>
          <p className="mx-auto mt-6 max-w-prose font-serif text-[18px] leading-relaxed text-ink-600 md:text-[19px]">
            Your archive turns into <em className="not-italic underline decoration-accent-300 decoration-1 underline-offset-[5px]">a memory that thinks back.</em>
          </p>
          <div className="mt-12 flex flex-col items-center gap-3">
            <Link href="/new" className="btn-primary btn-primary-lg px-7 text-[14px]">
              Analyze my Substack
            </Link>
            <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-ink-400">
            </span>
          </div>
        </div>
      </section>
    </>
  );
}

function SectionMarker({ number, title }: { number: string; title: string }) {
  return (
    <div className="section-marker">
      <span className="section-number">§ {number}</span>
      <span className="section-divider" aria-hidden="true">
        /
      </span>
      <span className="section-title">{title}</span>
    </div>
  );
}

function FeatureInsight({ insight }: { insight: { quote: string; source: string } }) {
  return (
    <figure className="md:col-span-7">
      <div className="relative rounded-md border border-ink-200/70 bg-white p-7 shadow-soft md:p-9">
        {/* Hairline accent on top edge */}
        <span
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-accent-200/0 via-accent-300 to-accent-200/0"
        />
        <span aria-hidden="true" className="font-serif text-[56px] leading-none text-accent-300">
          &ldquo;
        </span>
        <blockquote className="-mt-2 font-serif text-[22px] leading-[1.4] tracking-tightish text-ink-900 md:text-[24px]">
          {insight.quote}
        </blockquote>
        <figcaption className="mt-6 flex items-center gap-3">
          <span className="h-px w-8 bg-accent-400" aria-hidden="true" />
          <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-500">{insight.source}</span>
        </figcaption>
      </div>
    </figure>
  );
}

function SupportingInsight({ insight }: { insight: { quote: string; source: string } }) {
  return (
    <figure className="rounded-md border border-ink-200/70 bg-ink-50/40 p-6">
      <blockquote className="font-serif text-[15.5px] leading-relaxed text-ink-800">{insight.quote}</blockquote>
      <figcaption className="mt-4 font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-500">
        {insight.source}
      </figcaption>
    </figure>
  );
}

function SampleAnswerCard() {
  return (
    <div className="relative">
      {/* Stacked layer behind: hints at conversation history without clutter. */}
      <div
        aria-hidden="true"
        className="absolute -right-2 -top-2 hidden h-[calc(100%-16px)] w-[calc(100%-12px)] rounded-md border border-ink-200/70 bg-ink-75/70 md:block"
      />
      {/* A second, even quieter layer for depth. */}
      <div
        aria-hidden="true"
        className="absolute -right-3.5 -top-3.5 hidden h-[calc(100%-28px)] w-[calc(100%-22px)] rounded-md border border-ink-200/40 bg-ink-50/60 md:block"
      />

      <article
        className="relative flex flex-col overflow-hidden rounded-md border border-ink-200/80 bg-white shadow-lift"
        aria-label="Preview: ask your archive"
      >
        {/* Workspace chrome */}
        <header className="flex items-center justify-between gap-3 border-b border-ink-200/70 bg-ink-50/60 px-4 py-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <span className="relative flex h-1.5 w-1.5 shrink-0" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full animate-editorial-pulse rounded-full bg-positive-500/60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-positive-500" />
            </span>
            <span className="truncate font-mono text-[11px] text-ink-600">yourname.substack.com</span>
            <span className="text-ink-300" aria-hidden="true">
              ·
            </span>
            <span className="whitespace-nowrap text-[11px] text-ink-500">42 posts · 116k words</span>
          </div>
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-400">Ask</span>
        </header>

        {/* Earlier exchange (collapsed). Implies this is one moment in a longer session. */}
        <button
          type="button"
          tabIndex={-1}
          className="group flex items-center gap-2.5 border-b border-ink-200/60 bg-ink-50/30 px-4 py-2 text-left transition-colors hover:bg-ink-50/70"
          aria-label="Earlier exchange"
        >
          <span className="font-mono text-[10px] text-ink-400">01</span>
          <span className="truncate text-[11.5px] text-ink-500 group-hover:text-ink-700">
            What do I write about most?
          </span>
          <span className="ml-auto font-mono text-[10px] text-ink-400" aria-hidden="true">
            ⌄
          </span>
        </button>

        {/* Conversation */}
        <div className="flex flex-col gap-5 px-5 py-5">
          {/* User question */}
          <div className="flex justify-end">
            <div className="max-w-[88%] rounded-2xl rounded-tr-md bg-ink-900 px-3.5 py-2 text-[13.5px] leading-relaxed text-ink-50">
              What makes my best posts distinctive?
            </div>
          </div>

          {/* Editor response */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="accent-rule" />
              <span className="text-eyebrow font-medium uppercase text-accent-700">Editor</span>
              <span className="text-ink-300" aria-hidden="true">
                ·
              </span>
              <span className="text-[11px] normal-case tracking-normal text-ink-500">grounded in 3 posts</span>
              <span className="ml-auto text-[11px] normal-case tracking-normal text-ink-400">just now</span>
            </div>

            <div className="prose-editorial text-[14.5px] leading-[1.65]">
              <p>
                Across your archive, your strongest pieces open with a{" "}
                <mark className="rounded-sm bg-accent-100/80 px-0.5 text-ink-900">personal observation</mark>{" "}
                before moving into a broader product or culture argument.
              </p>
              <p>
                Your recent essays on AI tools use this structure less. They read more like commentary than your best
                work.
              </p>
            </div>

            {/* Cited posts */}
            <div className="mt-1.5 flex flex-col gap-2">
              <div className="flex items-center gap-2 type-eyebrow">
                <span className="accent-rule" />
                Cited from your archive
              </div>
              <ul className="flex flex-col gap-1.5">
                <CitationRow
                  num={1}
                  date="Mar 14"
                  title="The interface as ideology"
                  snippet="…begins with a small scene at a coffee shop before the argument widens out…"
                />
                <CitationRow num={2} date="Feb 9" title="Notes from a quiet rewrite" />
                <CitationRow num={3} date="Jan 5" title="Why I stopped writing reviews" />
              </ul>
            </div>
          </div>
        </div>

        {/* Suggested follow-ups */}
        <footer className="border-t border-ink-200/70 bg-ink-50/40 px-5 py-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="type-eyebrow">Follow-ups</span>
            <span className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-400">
              <kbd className="rounded border border-ink-200 bg-white px-1 py-px text-ink-500">⌘</kbd>
              <kbd className="rounded border border-ink-200 bg-white px-1 py-px text-ink-500">↵</kbd>
              <span className="ml-1 normal-case tracking-normal text-ink-400">to send</span>
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <FollowUpPill>Which ideas am I repeating?</FollowUpPill>
            <FollowUpPill>Older essays to revisit?</FollowUpPill>
          </div>
        </footer>
      </article>
    </div>
  );
}

function CitationRow({
  num,
  date,
  title,
  snippet,
}: {
  num: number;
  date: string;
  title: string;
  snippet?: string;
}) {
  return (
    <li className="group flex flex-col gap-1 rounded-md border border-ink-200/70 bg-white px-2.5 py-1.5 transition-colors duration-150 ease-editorial hover:border-accent-300 hover:bg-accent-50/40">
      <div className="flex items-center gap-2.5">
        <span className="grid h-4 w-5 shrink-0 place-items-center rounded-sm bg-ink-100 font-mono text-[10px] font-medium text-accent-700 group-hover:bg-accent-100">
          {String(num).padStart(2, "0")}
        </span>
        <span className="shrink-0 font-mono text-[10.5px] text-ink-500">{date}</span>
        <span className="truncate text-[12.5px] font-medium leading-tight text-ink-900">{title}</span>
      </div>
      {snippet && (
        <p className="ml-[2.6rem] line-clamp-1 text-[11.5px] italic leading-snug text-ink-500">{snippet}</p>
      )}
    </li>
  );
}

function FollowUpPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-ink-200 bg-white px-2.5 py-1 text-[12px] text-ink-700 transition-colors duration-150 ease-editorial hover:border-accent-300 hover:text-ink-900">
      <span className="text-ink-400" aria-hidden="true">
        ↳
      </span>
      {children}
    </span>
  );
}
