import type { ReactNode } from "react";
import { WorkspaceProvider } from "@/components/WorkspaceProvider";
import { WorkspaceShell } from "@/components/WorkspaceShell";

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <WorkspaceProvider token={token}>
      <WorkspaceShell>{children}</WorkspaceShell>
    </WorkspaceProvider>
  );
}
