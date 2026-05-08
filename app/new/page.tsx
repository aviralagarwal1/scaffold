import { SubstackUrlForm } from "@/components/SubstackUrlForm";

export default function NewWorkspacePage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-24">
      <h1 className="animate-rise animate-delay-1 font-serif text-[36px] leading-[1.08] tracking-tightish text-ink-900 md:text-[44px]">
        Build your private writing workspace.
      </h1>
      <p className="animate-rise animate-delay-2 mt-5 max-w-prose font-serif text-[17px] leading-relaxed text-ink-600">
        Paste your Substack URL. We read your public archive in the background and open a private workspace for you.
      </p>
      <div className="animate-rise animate-delay-3 mt-10">
        <SubstackUrlForm autoFocus />
      </div>

      <ul className="animate-rise animate-delay-4 mt-14 grid gap-4 border-t border-ink-200/60 pt-8 text-[14px] leading-relaxed text-ink-600">
        <li className="flex gap-4">
          <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-accent-700">No login</span>
          <span>Your workspace lives at a private link. Save it somewhere if you want to return.</span>
        </li>
        <li className="flex gap-4">
          <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-accent-700">No metrics</span>
          <span>We only read public posts. Subscriber counts, opens, and clicks belong to Substack, not us.</span>
        </li>
        <li className="flex gap-4">
          <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-accent-700">No autopost</span>
          <span>Distribution drafts are for you to review and copy.</span>
        </li>
      </ul>
    </div>
  );
}
