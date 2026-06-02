import Link from "next/link";
import type { ReactNode } from "react";
import { planConfig } from "@/lib/server/plans";

export const metadata = {
  title: "Support - Scaffold",
  description: "Common questions about Scaffold, plans, and how the product works.",
  alternates: {
    canonical: "/support",
  },
};

export default function SupportPage() {
  const basicPlan = planConfig("free");
  const premiumPlan = planConfig("pro");
  const questions = buildQuestions(basicPlan, premiumPlan);

  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(900px 360px at 18% -10%, rgba(180, 94, 44, 0.06), transparent 60%), radial-gradient(800px 320px at 100% 0%, rgba(180, 94, 44, 0.04), transparent 55%)",
        }}
      />

      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-16">
        <header className="max-w-4xl">
          <span className="animate-rise animate-delay-1 font-mono text-[11px] uppercase tracking-[0.16em] text-accent-700">
            &sect; / Support
          </span>
          <h1 className="animate-rise animate-delay-2 mt-3 font-serif text-[34px] leading-[1.08] tracking-tightish text-ink-900 md:text-[40px]">
            Frequently Asked Questions
          </h1>
        </header>

        <section className="animate-rise animate-delay-3 flex flex-col gap-3">
          {questions.map((item) => (
            <article key={item.question} className="panel p-5 transition-shadow duration-200 ease-editorial hover:shadow-lift">
              <h2 className="font-serif text-[19px] leading-snug tracking-tightish text-ink-900">
                {item.question}
              </h2>
              <p className="mt-2 text-[14px] leading-relaxed text-ink-600">{item.answer}</p>
            </article>
          ))}
        </section>
      </div>
    </section>
  );
}

function buildQuestions(
  basicPlan: ReturnType<typeof planConfig>,
  premiumPlan: ReturnType<typeof planConfig>,
): Array<{ question: string; answer: ReactNode }> {
  return [
    {
      question: "What is Scaffold?",
      answer:
        "Scaffold is a workspace for writers to revisit and develop their ideas. It reads your publications, organizes recurring themes, and gives you a private place to ask questions, evaluate drafts, search old lines, and explore new angles.",
    },
    {
      question: "How does Scaffold work?",
      answer:
        "Add a publication URL. Scaffold reads public posts, stores them as a workspace, and answers or drafts from retrieved passages in your library.",
    },
    {
      question: "What does it mean to sync a workspace or post?",
      answer:
        "Syncing refreshes a workspace after your publication has already been added. Use workspace sync when you have published new posts or want Scaffold to reread the whole publication. Use post sync when you only changed one existing post, like a title, small edit, or updated section.",
    },
    {
      question: "Is Scaffold free?",
      answer: (
        <>
          Yes. Scaffold has a {basicPlan.label} plan that is completely free. For extra features, you can sign up for
          the {premiumPlan.label} plan{" "}
          <Link href="/account/plan" className="btn-link">
            here
          </Link>{" "}
          at {formatPrice(premiumPlan)}.
        </>
      ),
    },
    {
      question: `What is the difference between ${basicPlan.label} and ${premiumPlan.label}?`,
      answer: `${basicPlan.label} includes ${formatTokens(basicPlan.monthlyTokenLimit)} monthly account tokens and ${pluralize(basicPlan.activePublicationLimit, "workspace")}. ${premiumPlan.label} includes ${formatTokens(premiumPlan.monthlyTokenLimit)} monthly account tokens and ${pluralize(premiumPlan.activePublicationLimit, "workspace")}.`,
    },
    {
      question: "How does usage work?",
      answer:
        "Scaffold features draw from Anthropic's API. Usage is measured in tokens, and tokens reset on the first day of every month at 12:00 AM.",
    },
    {
      question: "How can I save usage?",
      answer:
        "Sync one post when only that post changed. Choose only the draft feedback areas you care about. Ask specific questions when exploring your library.",
    },
    {
      question: `How much does ${premiumPlan.label} cost?`,
      answer: `${premiumPlan.label} costs ${formatPrice(premiumPlan)}.`,
    },
    {
      question: `How do I sign up for ${premiumPlan.label}?`,
      answer: (
        <>
          Click{" "}
          <Link href="/account/plan" className="btn-link">
            here
          </Link>{" "}
          or visit the Premium Plan page when you are ready to upgrade.
        </>
      ),
    },
    {
      question: "What happens if I delete a publication?",
      answer:
        "Deleting a publication frees that publication slot. Monthly account usage still counts until the next reset.",
    },
    {
      question: "If Scaffold uses AI, why should writers trust it?",
      answer:
        "Scaffold is not trying to replace the writer. It helps writers reconnect with their own voice, patterns, and ideas. Responses are grounded in your writing library, so Scaffold acts more like a curator of your work than a generator of generic content.",
    },
    {
      question: "How is Scaffold different from ChatGPT or Claude?",
      answer:
        "ChatGPT and Claude are general-purpose assistants built to answer almost anything. Scaffold is built for writers: one workspace with long-term context across your library, designed for reflection, retrieval, and editorial support instead of generic content generation.",
    },
    {
      question: "Who built Scaffold?",
      answer: (
        <>
          Scaffold was built by Aviral Agarwal. Click{" "}
          <Link href="/about" className="btn-link">
            here
          </Link>{" "}
          to learn more about his work.
        </>
      ),
    },
  ];
}

function formatPrice(plan: ReturnType<typeof planConfig>): string {
  return plan.priceCents === 0 ? "free" : `$${(plan.priceCents / 100).toFixed(0)}/month`;
}

function formatTokens(value: number): string {
  return value.toLocaleString();
}

function pluralize(count: number, noun: string): string {
  return `${count.toLocaleString()} ${noun}${count === 1 ? "" : "s"}`;
}
