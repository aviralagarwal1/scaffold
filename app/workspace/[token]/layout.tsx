import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound, redirect } from "next/navigation";
import { WorkspaceProvider } from "@/components/workspace/WorkspaceProvider";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";
import { canViewAccountWorkspace } from "@/lib/server/account-workspaces";
import { getCurrentUserId } from "@/lib/server/auth/current";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const userId = await getCurrentUserId();

  if (!userId) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/workspace/${token}`)}`);
  }

  if (!(await canViewAccountWorkspace(userId, token))) {
    notFound();
  }

  return (
    <WorkspaceProvider token={token}>
      <WorkspaceShell>{children}</WorkspaceShell>
    </WorkspaceProvider>
  );
}
