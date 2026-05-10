import { AccountPanel } from "@/components/AccountPanel";
import { PageHeader } from "@/components/PageHeader";

export default function AccountPage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-10">
      <PageHeader
        title="Account."
        meta="Manage your editor profile and the workspaces tied to your publications."
      />
      <AccountPanel />
    </div>
  );
}
