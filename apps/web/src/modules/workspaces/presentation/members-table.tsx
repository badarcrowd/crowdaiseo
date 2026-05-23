"use client";

import { useTransition } from "react";
import type { WorkspaceRole } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { changeRoleAction, removeMemberAction } from "./actions";

type Member = {
  userId: string;
  email: string;
  fullName: string | null;
  role: WorkspaceRole;
};

const ASSIGNABLE: WorkspaceRole[] = ["ADMIN", "EDITOR", "VIEWER"];

export function MembersTable({
  workspaceId,
  members,
  currentUserId,
  currentUserRole,
}: Readonly<{
  workspaceId: string;
  members: Member[];
  currentUserId: string;
  currentUserRole: WorkspaceRole;
}>) {
  const canManage = currentUserRole === "OWNER" || currentUserRole === "ADMIN";
  const [pending, start] = useTransition();

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-muted-foreground text-left">
          <th className="py-2">User</th>
          <th className="py-2">Role</th>
          <th className="py-2 text-right" />
        </tr>
      </thead>
      <tbody>
        {members.map((m) => {
          const isSelf = m.userId === currentUserId;
          const editable =
            canManage &&
            !isSelf &&
            (m.role !== "OWNER" || currentUserRole === "OWNER");
          return (
            <tr key={m.userId} className="border-border border-t">
              <td className="py-3">
                <div className="font-medium">{m.fullName ?? m.email}</div>
                {m.fullName && (
                  <div className="text-muted-foreground text-xs">{m.email}</div>
                )}
              </td>
              <td className="py-3">
                {editable ? (
                  <select
                    defaultValue={m.role}
                    disabled={pending}
                    onChange={(e) =>
                      start(async () => {
                        await changeRoleAction({
                          workspaceId,
                          userId: m.userId,
                          role: e.target.value as WorkspaceRole,
                        });
                      })
                    }
                    className="border-input bg-background rounded-md border px-2 py-1 text-xs"
                  >
                    {ASSIGNABLE.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-muted-foreground text-xs">{m.role}</span>
                )}
              </td>
              <td className="py-3 text-right">
                {(canManage && !isSelf) || isSelf ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={pending}
                    onClick={() =>
                      start(async () => {
                        if (!confirm(isSelf ? "Leave workspace?" : "Remove member?")) return;
                        await removeMemberAction({ workspaceId, userId: m.userId });
                      })
                    }
                  >
                    {isSelf ? "Leave" : "Remove"}
                  </Button>
                ) : null}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
