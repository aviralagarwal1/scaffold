import { canEditAccountWorkspace, canViewAccountWorkspace } from "@/lib/server/account-workspaces";
import { requireCurrentUserId } from "@/lib/server/auth/current";
import { AppError } from "@/lib/server/errors";

export async function requireWorkspaceAccess(token: string, mode: "view" | "edit" = "view"): Promise<string> {
  const userId = await requireCurrentUserId();

  const allowed =
    mode === "edit"
      ? await canEditAccountWorkspace(userId, token)
      : await canViewAccountWorkspace(userId, token);

  if (!allowed) {
    throw new AppError("You do not have access to this workspace.", 404);
  }

  return userId;
}
