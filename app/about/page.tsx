import type { ReactNode } from "react";
import Image from "next/image";

export const metadata = {
  title: "About · Scaffold",
  description: "About the writer who built Scaffold.",
  alternates: {
    canonical: "/about",
  },
};

export default function AboutPage() {
  return (
    <div className="relative overflow-hidden px-6 pt-12 pb-20 md:pt-16 md:pb-28">
      {/* Soft accent wash anchored top, mirroring the landing hero so the
          About page feels like part of the same composition rather than a
          plain doc. Pointer-events-none and -z-10 keep it strictly visual. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(720px 280px at 50% 0%, rgba(180, 94, 44, 0.06), transparent 70%)",
        }}
      />

      <div className="relative mx-auto w-full max-w-2xl">
        {/* Identity block — portrait + name, centered. The portrait sits in
            its own animate-rise; the name + accent hairline rise just after,
            so the eye lands on the face first, then settles on the name. */}
        <div className="animate-rise animate-delay-1 flex flex-col items-center text-center">
          <Image
            src="/profile.png"
            alt="Aviral Agarwal"
            width={336}
            height={336}
            priority
            className="size-[168px] rounded-full border border-ink-200/80 object-cover shadow-soft"
          />
        </div>

        <div className="animate-rise animate-delay-2 mt-7 flex flex-col items-center text-center">
          <h1 className="font-serif text-[36px] leading-[1.08] tracking-tightish text-ink-900 md:text-[44px]">
            Aviral Agarwal
          </h1>
          {/* Italic byline below the name. The draw-in hairline lives
              under THIS phrase rather than under the name — same recipe
              the landing uses on its section heads ("Less than a minute.",
              "tethered to a post."). Animation now belongs to the italic
              phrase rather than competing with the name itself. */}
          <span className="relative mt-3 inline-block font-serif italic text-[15px] text-ink-600 md:text-[16px]">
            Writer · Builder · Observer
            <span
              aria-hidden="true"
              className="animate-editorial-draw absolute -bottom-0.5 left-0 right-0 h-[1.5px] bg-accent-300/70"
              style={{ animationDelay: "0.7s" }}
            />
          </span>
        </div>

        {/* Bio. Serif body, generous line-height, spaced paragraphs. Same
            warm-paper feel as the landing hero p tag. */}
        <div className="animate-rise animate-delay-3 mt-10 flex flex-col gap-5 font-serif text-[17px] leading-[1.6] text-ink-700 md:text-[18px]">
          <p>
            Hi! I&apos;m Aviral, a Business Honors and Information Systems student at UT Austin.
          </p>
          <p>
            I built Scaffold as a workspace for writers to revisit what they&apos;ve already written, uncover recurring ideas, and surface the half-finished thoughts that still have something left in them. The project grew out of running my own publication,{" "}
            <a
              href="https://aviralwrites.com"
              target="_blank"
              rel="noreferrer"
              className="link-soft"
            >
              aviralwrites.com
            </a>
            , and spending time inside my own library. Even as frontier models keep advancing, I don&apos;t believe AI can ever replace the voice of a writer. At its best, AI can be a quiet amplifier, motivator, and searcher across your own work. I hope Scaffold can create that experience for you.
          </p>
          <p>
            Through this project, I became deeply interested in product design and user behavior. While AI has lowered the barrier to building, I&apos;m focused on developing stronger product judgment: reducing friction, deciding what matters, and understanding when simplicity beats added functionality.
          </p>
          <p>
            If you have feedback or ideas, feel free to reach out via the links below. You can also follow my broader work at{" "}
            <a
              href="https://aviralagarwal.com"
              target="_blank"
              rel="noreferrer"
              className="link-soft"
            >
              aviralagarwal.com
            </a>
            .
          </p>
        </div>

        {/* Social row. Each link gets its own animate-delay so the four
            icons cascade in left-to-right rather than all at once — small
            kinetic detail that rewards attention without being noisy. */}
        <div className="mt-10 flex justify-center gap-4">
          <SocialLink
            href="https://linkedin.com/in/aviralagarwal05"
            label="LinkedIn"
            delayClass="animate-delay-3"
          >
            <LinkedInIcon />
          </SocialLink>
          <SocialLink
            href="https://x.com/AviralAgarwal0"
            label="X"
            delayClass="animate-delay-4"
          >
            <XIcon />
          </SocialLink>
          <SocialLink
            href="https://github.com/aviralagarwal1"
            label="GitHub"
            delayClass="animate-delay-5"
          >
            <GitHubIcon />
          </SocialLink>
          <SocialLink
            href="mailto:aviral.k.agarwal@gmail.com"
            label="Email"
            delayClass="animate-delay-6"
          >
            <MailIcon />
          </SocialLink>
        </div>
      </div>
    </div>
  );
}

function SocialLink({
  href,
  label,
  children,
  delayClass,
}: {
  href: string;
  label: string;
  children: ReactNode;
  delayClass: string;
}) {
  const isExternal = href.startsWith("http");
  return (
    <a
      href={href}
      {...(isExternal ? { target: "_blank", rel: "noreferrer" } : {})}
      aria-label={label}
      title={label}
      className={`animate-rise ${delayClass} inline-flex h-10 w-10 items-center justify-center rounded-full border border-ink-200 bg-white text-ink-600 transition-all duration-200 ease-editorial hover:-translate-y-px hover:border-accent-300 hover:bg-accent-50/40 hover:text-accent-700 hover:shadow-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-300 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-50`}
    >
      {children}
    </a>
  );
}

// Icons live inline as SVG. Sized to ~18px on a 40px round button, ~45%
// fill — feels editorial rather than dashboardy. Stroke-based mail icon
// matches the pencil-line style used elsewhere (Settings edit button,
// search papers); the brand glyphs use their canonical fills.

function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14zM8.34 18V9.86H5.67V18h2.67zM7 8.7a1.55 1.55 0 1 0 0-3.1 1.55 1.55 0 0 0 0 3.1zM18.34 18v-4.55c0-2.46-1.32-3.6-3.07-3.6-1.42 0-2.05.78-2.4 1.33V9.86h-2.67c.04.75 0 8.14 0 8.14h2.67v-4.55c0-.24.02-.48.09-.65.18-.48.62-.97 1.36-.97.96 0 1.34.73 1.34 1.79V18h2.68z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56v-2c-3.2.7-3.87-1.36-3.87-1.36-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.68 1.24 3.34.95.1-.74.4-1.24.72-1.53-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.06 11.06 0 0 1 5.79 0c2.21-1.49 3.17-1.18 3.17-1.18.63 1.59.24 2.76.12 3.05.74.81 1.18 1.84 1.18 3.1 0 4.42-2.69 5.4-5.26 5.68.41.36.78 1.06.78 2.13v3.16c0 .31.21.68.8.56C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5z" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="19"
      height="19"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}
