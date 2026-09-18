import Link from "next/link";
import { LogoCTA } from "@/components/LogoCTA";
import { SubstackUrlForm } from "@/components/SubstackUrlForm";
import { planConfig } from "@/lib/server/plans";
import {
  formatPlanPrice,
  formatTokenAllowance,
  formatWorkspaceCapacity,
  PLAN_SCOPE,
  PRODUCT_SUBHEAD,
} from "@/lib/copy";

export const metadata = {
  alternates: {
    canonical: "/",
  },
};

const STEPS = [
  {
    title: "Start your workspace.",
    body: "Paste a publication link or custom domain. Only public posts are read.",
  },
  {
    title: "The archive is read.",
    body: "Every public post is pulled in, split into passages, and indexed.",
  },
  {
    title: "The work comes back.",
    body: "Put questions to it, find old lines, and write against what is already there.",
  },
];

// The §03 section reuses the SampleAnswerCard's library context — the three posts
// cited in the primary answer. Same titles, same dates as the hero
// preview, so the brand world stays internally consistent: this is a real
// library surface that cites the same evidence wherever you encounter it.
const CITED_POSTS = [
  {
    date: "Mar 14",
    title: "The interface as ideology",
    excerpt:
      "begins with a small scene at a coffee shop before the argument widens out into product critique",
  },
  {
    date: "Feb 9",
    title: "Notes from a quiet rewrite",
    excerpt:
      "opens on a memory of an old draft before the voice essay turns outward",
  },
  {
    date: "Jan 5",
    title: "Why I stopped writing reviews",
    excerpt:
      "personal admission anchors the broader critique of contemporary review culture",
  },
];

export default function HomePage() {
  const freePlan = planConfig("free");
  const premiumPlan = planConfig("pro");

  return (
    <>
      {/* Logged-in visitors stay on the landing — they may want to re-read
          the brand, share the link, or just look around. The nav UserMenu
          and the swapped hero CTA ("Open my desk →" via SubstackUrlForm's
          authenticatedFallback) make the logged-in state obvious without
          forcing a redirect. */}

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
            {/* Headline laid out as a 3-2-1 word pyramid via explicit block
                lines: "Write with" / "your entire" / "library." Each
                line is shorter than the last, tapering toward the warm
                punchline noun. The em with the underline accent sits on
                line two so the eye lands on it before the final word. */}
            <h1 className="animate-rise animate-delay-1 font-serif text-[40px] leading-[1.04] tracking-tighter2 text-ink-900 min-[390px]:text-[44px] md:text-[60px] md:leading-[1.02]">
              <span className="block">Write with</span>
              <span className="block">
                your {" "}
                <span className="relative inline-block whitespace-nowrap">
                  <em className="font-serif font-normal italic">entire</em>
                  <span
                    aria-hidden="true"
                    className="absolute -bottom-0.5 left-0 right-0 h-[7px] -skew-x-6 rounded-sm bg-accent-200/55"
                  />
                </span>
              </span>
              <span className="block">library.</span>
            </h1>

            <p className="animate-rise animate-delay-2 mt-7 max-w-[46ch] font-serif text-[18px] leading-[1.55] text-ink-700 md:text-[19px]">
              {PRODUCT_SUBHEAD}
            </p>

            <div className="animate-rise animate-delay-3 mt-10 max-w-xl">
              <SubstackUrlForm
                captureGlobalKeystrokes
                routeToRegister
                authenticatedFallback={<ReturningVisitorCTA />}
              />
            </div>
          </div>

          {/* Aside uses fade-only — it has its own translate-y for layout, so we
              avoid composing two transforms during the entrance animation. */}
          <aside className="animate-fade animate-delay-3 md:col-span-5 md:col-start-8 md:-translate-y-4 lg:col-start-8 lg:translate-x-2 lg:-translate-y-6">
            <SampleAnswerCard />
          </aside>
        </div>
      </section>

      {/* § — How it works */}
      <section className="animate-rise animate-delay-4 border-b border-ink-200/60 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <header className="mb-14">
            <SectionMarker title="How it works" />
            <h2 className="mt-4 font-serif text-[34px] leading-[1.1] tracking-tightish text-ink-900 md:text-[44px]">
              Three steps.{" "}
              {/* The italic phrase has a hairline accent rule that draws in
                  after the headline lands — restrained motion that signals
                  "this is the key promise of the section". */}
              <span className="relative inline-block italic text-ink-700">
                Less than a minute.
                <span
                  aria-hidden="true"
                  className="animate-editorial-draw absolute -bottom-0.5 left-0 right-3 h-[1.5px] bg-accent-300/70"
                  style={{ animationDelay: "0.7s" }}
                />
              </span>
            </h2>
          </header>

          <ol className="relative grid gap-x-10 gap-y-12 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="group relative flex flex-col gap-3">
                <span className="relative -mx-1 inline-block w-fit bg-white px-1 font-serif text-[44px] leading-none text-accent-500 transition-transform duration-300 ease-editorial group-hover:-translate-y-0.5">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="font-serif text-[19px] leading-snug tracking-tightish text-ink-900">
                  {s.title}
                </h3>
                <p className="text-[14.5px] leading-relaxed text-ink-600">
                  {s.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* § — Why it works
          The composition makes the editorial claim literal: a single
          answer (left, primary) carries inline citation markers, and the
          right column is the actual evidence — three numbered post-citations
          pulled from the library. The shared numbers tether the two sides
          without needing a literal connector line. */}
      <section className="animate-rise animate-delay-5 border-b border-ink-200/60">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <header className="mb-14">
            <SectionMarker title="Why it works" />
            <h2 className="mt-4 font-serif text-[34px] leading-[1.1] tracking-tightish text-ink-900 md:text-[44px]">
              Every answer is{" "}
              <span className="relative inline-block italic text-ink-700">
                tethered to a post.
                <span
                  aria-hidden="true"
                  className="animate-editorial-draw absolute -bottom-0.5 left-0 right-3 h-[1.5px] bg-accent-300/70"
                  style={{ animationDelay: "0.7s" }}
                />
              </span>
            </h2>
          </header>

          <div className="grid gap-x-8 gap-y-6 md:grid-cols-12">
            <PrimaryAnswerCard />
            <CitationColumn posts={CITED_POSTS} />
          </div>
        </div>
      </section>

      {/* Closing — the realization moment.
          The composition is a centered emotional anchor surrounded by
          floating library marginalia: small, low-contrast post fragments
          that read as memory traces from the writer's own work. They
          breathe in and out at slightly different rhythms via a subtle
          shimmer, suggesting a quiet system that's already paying
          attention. The CTA names what the user actually leaves with —
          a memory of their library — rather than a tool action. */}
      {/* Monthly plans */}
      <section className="animate-rise animate-delay-6 border-b border-ink-200/60 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <header className="mb-14">
            <SectionMarker title="Monthly Plans" />
            <h2 className="mt-4 font-serif text-[34px] leading-[1.1] tracking-tightish text-ink-900 md:text-[44px]">
              Start free.{" "}
              <span className="relative inline-block italic text-ink-700">
                Scale when ready.
                <span
                  aria-hidden="true"
                  className="animate-editorial-draw absolute -bottom-0.5 left-0 right-3 h-[1.5px] bg-accent-300/70"
                  style={{ animationDelay: "0.7s" }}
                />
              </span>
            </h2>
          </header>

          <div className="grid gap-4 md:grid-cols-2">
            <LandingPlanCard
              title={freePlan.label}
              price={formatPlanPrice(freePlan.priceCents)}
              features={[
                { label: "Tokens", value: formatTokenAllowance(freePlan.monthlyTokenLimit) },
                { label: "Workspaces", value: formatWorkspaceCapacity(freePlan.activePublicationLimit) },
                { label: "Scope", value: PLAN_SCOPE.free },
              ]}
            />
            <LandingPlanCard
              title={premiumPlan.label}
              price={formatPlanPrice(premiumPlan.priceCents)}
              features={[
                { label: "Tokens", value: formatTokenAllowance(premiumPlan.monthlyTokenLimit) },
                { label: "Workspaces", value: formatWorkspaceCapacity(premiumPlan.activePublicationLimit) },
                { label: "Scope", value: PLAN_SCOPE.pro },
              ]}
            />
          </div>
        </div>
      </section>

      <section className="animate-rise relative overflow-hidden bg-white">
        {/* Soft accent wash anchored top-center, echoing the hero's bronze
            warmth at the close. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(720px 280px at 50% 0%, rgba(180, 94, 44, 0.045), transparent 70%)",
          }}
        />

        <div className="relative mx-auto max-w-6xl px-6 py-32 md:py-40">
          {/* Marginalia — fragments of the library surrounding the moment.
              Hidden below lg to keep the centered content uncrowded on
              tablet/mobile. Each fragment shimmers on its own phase. */}
          <ArchiveFragment
            date="Mar 14"
            excerpt="the small scene at a coffee shop, before the argument widens out"
            className="left-[2%] top-12 lg:left-[4%]"
            shimmerDelay="0s"
          />
          <ArchiveFragment
            date="Feb 9"
            excerpt="an old draft I almost finished, in a quieter voice"
            className="right-[2%] top-20 lg:right-[5%]"
            shimmerDelay="3s"
          />
          <ArchiveFragment
            date="Jan 5"
            excerpt="the same question, asked four different ways, across a year"
            className="left-[3%] bottom-32 lg:left-[7%]"
            shimmerDelay="6s"
          />
          <ArchiveFragment
            date="Dec 22"
            excerpt="a smaller voice returning, after months of arguing"
            className="right-[3%] bottom-24 lg:right-[8%]"
            shimmerDelay="9s"
          />

          {/* Center content */}
          <div className="relative mx-auto max-w-2xl text-left md:text-center">
            <div className="md:hidden">
              <SectionMarker title="Start your workspace" />
              <h2 className="mt-4 font-serif text-[34px] leading-[1.1] tracking-tightish text-ink-900 min-[390px]:text-[38px]">
                Start from your library.{" "}
                <span className="relative inline-block italic text-ink-700">
                  Build with memory.
                  <span
                    aria-hidden="true"
                    className="animate-editorial-draw absolute -bottom-0.5 left-0 right-3 h-[1.5px] bg-accent-300/70"
                    style={{ animationDelay: "0.7s" }}
                  />
                </span>
              </h2>
              <p className="mt-5 font-serif text-[18px] leading-[1.55] text-ink-700">
                The patterns, voice, and unfinished ideas are already there.
              </p>
            </div>
            <div className="hidden md:block">
              <h2 className="font-serif text-[60px] leading-[1.04] tracking-tighter2 text-ink-900">
                Stop pasting your posts
                <br />
                into ChatGPT.
              </h2>
              <p className="mx-auto mt-7 max-w-prose font-serif text-[20px] leading-[1.55] text-ink-700">
                Everything is already in your library. The structure, the style, the substance.{" "}
                <span className="relative inline-block whitespace-nowrap">
                  <em className="italic text-ink-900">We just give it memory.</em>
                  <span
                    aria-hidden="true"
                    className="animate-editorial-draw absolute -bottom-0.5 left-0 right-0 h-[1.5px] bg-accent-300/70"
                    style={{ animationDelay: "1.1s" }}
                  />
                </span>
              </p>
            </div>

            <div className="mt-10 flex justify-center md:mt-12">
              <LogoCTA
                href="/register"
                label="Build my memory"
                authenticatedHref="/account"
                authenticatedLabel="Open my desk"
              />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

/**
 * Hero CTA for returning, signed-in visitors. The composer asks for a URL
 * we already have on file, so we replace it with one black button that
 * takes them back to their desk. Same animated arrow signature as the
 * SubstackUrlForm submit so the swap feels like a quieter version of the
 * same affordance, not a different surface.
 */
function ReturningVisitorCTA() {
  return (
    <Link href="/account" className="btn-primary btn-primary-lg group relative px-6">
      <span className="relative inline-flex items-center gap-2">
        <span>Open my desk</span>
        <span
          aria-hidden="true"
          className="text-ink-300 transition-transform duration-200 ease-editorial group-hover:translate-x-0.5 group-hover:text-ink-50"
        >
          →
        </span>
      </span>
    </Link>
  );
}

/**
 * Library marginalia. Floats around the closing section's centered moment as
 * fragments of the writer's own work — date in mono caps with an accent dot
 * before it, italic excerpt beneath. No card chrome, no border, no fill —
 * these read as notes drifting in the page margins, not UI surfaces.
 *
 * Each fragment receives a different `shimmerDelay` so the group breathes
 * out of phase. Hidden below lg to keep the centered content uncrowded.
 */
function ArchiveFragment({
  date,
  excerpt,
  className,
  shimmerDelay,
}: {
  date: string;
  excerpt: string;
  className?: string;
  shimmerDelay: string;
}) {
  return (
    <aside
      aria-hidden="true"
      className={`pointer-events-none absolute hidden max-w-[200px] animate-editorial-shimmer lg:block ${className ?? ""}`}
      style={{ animationDelay: shimmerDelay }}
    >
      <div className="flex items-center gap-2">
        <span className="h-1 w-1 rounded-full bg-accent-400/80" aria-hidden="true" />
        <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-ink-400">
          {date}
        </span>
      </div>
      <p className="mt-1.5 font-serif text-[13.5px] italic leading-snug text-ink-500/90">
        &ldquo;{excerpt}…&rdquo;
      </p>
    </aside>
  );
}

function SectionMarker({ title }: { title: string }) {
  return (
    <div className="section-marker">
      <span className="section-symbol site-wordmark-mark" aria-hidden="true">
        §
      </span>
      <span className="section-title">{title}</span>
    </div>
  );
}

function LandingPlanCard({
  title,
  price,
  features,
}: {
  title: string;
  price: string;
  features: Array<{ label: string; value: string }>;
}) {
  return (
    <article className="group relative overflow-hidden rounded-md border border-ink-200/80 bg-white p-6 shadow-soft transition-all duration-300 ease-editorial hover:-translate-y-1 hover:border-ink-300 hover:bg-ink-50/50 hover:shadow-lift">
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-accent-200/0 via-accent-300 to-accent-200/0 opacity-0 transition-opacity duration-300 ease-editorial group-hover:opacity-100"
      />
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-serif text-[24px] leading-tight tracking-tightish text-ink-900">{title}</h3>
          <p className="mt-1 font-serif text-[15px] leading-snug tracking-tightish text-ink-500">{price}</p>
        </div>
      </div>

      <ul className="mt-7 flex flex-col gap-3">
        {features.map((feature) => (
          <li key={feature.label} className="grid gap-1 border-t border-ink-200/60 pt-3 first:border-t-0 first:pt-0">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-400">{feature.label}</span>
            <span className="text-[14px] leading-relaxed text-ink-600">{feature.value}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

/**
 * Inline citation marker. Tiny mono superscript in accent color, sits next
 * to the phrase it supports. Numbers match the citation cards on the right
 * — this is the visual tether the section headline names.
 */
function Cite({ n }: { n: number }) {
  return (
    <sup
      aria-label={`Citation ${n}`}
      className="ml-[1px] inline-block translate-y-[-0.15em] font-mono text-[0.5em] font-medium tracking-[0.06em] text-accent-700"
    >
      {String(n).padStart(2, "0")}
    </sup>
  );
}

/**
 * Primary answer card — the answer's voice. Drop-cap quote mark, serif body,
 * inline citation markers, and a curator footer that explicitly names how
 * many posts grounded the response. The footer's "grounded in N posts"
 * cross-references the citation column.
 */
function PrimaryAnswerCard() {
  return (
    <figure className="md:col-span-7">
      <div className="group relative flex h-full flex-col rounded-md border border-ink-200/70 bg-white p-7 shadow-soft transition-shadow duration-300 ease-editorial hover:shadow-lift md:p-9">
        {/* Hairline accent on top edge — the same signature used on the
            hero's sample answer card. */}
        <span
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-accent-200/0 via-accent-300 to-accent-200/0"
        />
        <span aria-hidden="true" className="font-serif text-[56px] leading-none text-accent-300">
          &ldquo;
        </span>
        <blockquote className="-mt-2 font-serif text-[22px] leading-[1.45] tracking-tightish text-ink-900 md:text-[24px]">
          Across your library, your strongest pieces open with a{" "}
          <mark className="rounded-sm bg-accent-100/70 px-0.5 text-ink-900">personal observation</mark>
          <Cite n={1} /> before moving into a broader product or culture argument
          <Cite n={2} />. Your recent essays on interface design use this structure less
          <Cite n={3} />, which makes them feel more like commentary than your best work.
        </blockquote>
        <figcaption className="mt-7 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-ink-200/60 pt-4">
          <span className="flex items-center gap-2">
            <span className="accent-rule" />
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-accent-700">Scaffold</span>
          </span>
          <span className="text-ink-300" aria-hidden="true">
            ·
          </span>
          <span className="font-mono text-[11px] tracking-tightish text-ink-500">Analyzed 6 posts</span>
          <span className="text-ink-300" aria-hidden="true">
            ·
          </span>
          <span className="font-mono text-[11px] tracking-tightish text-ink-500">3 cited below</span>
        </figcaption>
      </div>
    </figure>
  );
}

/**
 * The evidence column. An eyebrow names the relationship explicitly, then
 * three numbered citation cards stack beneath. The numbers match the inline
 * markers in the answer; that shared numbering is the connector motif.
 */
function CitationColumn({ posts }: { posts: typeof CITED_POSTS }) {
  return (
    <aside className="flex flex-col gap-3 md:col-span-5">
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 type-eyebrow text-accent-700">
          <span className="accent-rule" />
          Cited from your library
        </span>
        <span className="font-mono text-[10.5px] text-ink-400"></span>
      </div>
      {posts.map((post, i) => (
        <CitationCard key={post.title} num={i + 1} post={post} />
      ))}
    </aside>
  );
}

/**
 * Single citation row. Numbered badge + date in monospace, post title in
 * serif, italic excerpt below. On hover the card lifts a hair, the border
 * shifts to accent, and the badge tone deepens — the visual rhyme with the
 * inline marker becomes momentarily explicit.
 */
function CitationCard({ num, post }: { num: number; post: (typeof CITED_POSTS)[number] }) {
  return (
    <article className="group flex flex-col gap-1.5 rounded-md border border-ink-200/70 bg-white p-4 transition-all duration-200 ease-editorial hover:-translate-y-px hover:border-accent-300 hover:shadow-soft">
      <div className="flex items-center gap-2.5">
        <span className="grid h-5 min-w-7 place-items-center rounded-sm bg-accent-50 px-1 font-mono text-[10.5px] font-medium text-accent-700 transition-colors duration-200 ease-editorial group-hover:bg-accent-100">
          {String(num).padStart(2, "0")}
        </span>
        <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-500">{post.date}</span>
      </div>
      <h4 className="font-serif text-[15.5px] leading-snug tracking-tightish text-ink-900">{post.title}</h4>
      {post.excerpt && (
        <p className="line-clamp-2 text-[12.5px] italic leading-snug text-ink-500">
          &ldquo;{post.excerpt}…&rdquo;
        </p>
      )}
    </article>
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
        aria-label="Preview: ask your library"
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
            </span>
            <span className="whitespace-nowrap text-[11px] text-ink-500"></span>
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

          {/* Answer */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="accent-rule" />
              <span className="text-eyebrow font-medium uppercase text-accent-700">Scaffold</span>
              <span className="text-ink-300" aria-hidden="true">
              </span>
              <span className="text-[11px] normal-case tracking-normal text-ink-500"></span>
              <span className="ml-auto text-[11px] normal-case tracking-normal text-ink-400">Just now</span>
            </div>

            <div className="prose-editorial text-[14.5px] leading-[1.65]">
              <p>
                Across your library, your strongest pieces open with a{" "}
                <mark className="rounded-sm bg-accent-100/80 px-0.5 text-ink-900">personal observation</mark>{" "}
                before moving into a broader product or culture argument.
              </p>
              <p>
                Your recent essays on interface design use this structure less. They read more like commentary than your best
                work.
              </p>
            </div>

            {/* Cited posts */}
            <div className="mt-1.5 flex flex-col gap-2">
              <div className="flex items-center gap-2 type-eyebrow">
                <span className="accent-rule" />
                Cited from your library
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
