import Link from "next/link";
import { WORKSPACE_UTILITY_TABS } from "@/lib/copy";

/** Quiet workspace destinations in the site header, beside the account menu. */
export function WorkspaceUtilityLinks({ token, pathname }: { token: string; pathname: string }) {
  return WORKSPACE_UTILITY_TABS.map(({ slug, label }) => {
    const href = `/workspace/${token}/${slug}`;
    const active = pathname === href || pathname.startsWith(`${href}/`);
    return (
      <Link
        key={slug}
        href={href}
        aria-current={active ? "page" : undefined}
        className="btn-secondary aria-[current=page]:border-ink-300 aria-[current=page]:bg-ink-100"
      >
        {label}
      </Link>
    );
  });
}
