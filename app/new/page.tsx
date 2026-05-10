import { SubstackUrlForm } from "@/components/SubstackUrlForm";

export default function NewWorkspacePage() {
  return (
    // Single-task page. min-h fills the viewport below the sticky header so
    // content sits centered in the visible area rather than hugging the top.
    <div className="flex min-h-[calc(100svh-3.5rem)] items-center px-6 py-16">
      <div className="mx-auto w-full max-w-2xl">
        <h1 className="animate-rise animate-delay-1 font-serif text-[36px] leading-[1.08] tracking-tightish text-ink-900 md:text-[44px]">
          Build your private writing workspace.
        </h1>
        <p className="animate-rise animate-delay-2 mt-5 max-w-prose font-serif text-[17px] leading-relaxed text-ink-600">
          Paste your Substack URL. We read your public library in the background and open a private workspace for you.
        </p>
        <div className="animate-rise animate-delay-3 mt-10">
          <SubstackUrlForm autoFocus />
        </div>
      </div>
    </div>
  );
}
