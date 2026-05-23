"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { revokeInviteAction } from "./actions";

type Invite = { id: string; email: string; role: string; expiresAt: string };

export function PendingInvitesTable({
  workspaceId,
  invites,
}: Readonly<{ workspaceId: string; invites: Invite[] }>) {
  const [pending, start] = useTransition();
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-muted-foreground text-left">
          <th className="py-2">Email</th>
          <th className="py-2">Role</th>
          <th className="py-2">Expires</th>
          <th className="py-2 text-right" />
        </tr>
      </thead>
      <tbody>
        {invites.map((i) => (
          <tr key={i.id} className="border-border border-t">
            <td className="py-3">{i.email}</td>
            <td className="py-3">{i.role}</td>
            <td className="text-muted-foreground py-3 text-xs">
              {new Date(i.expiresAt).toLocaleDateString()}
            </td>
            <td className="py-3 text-right">
              <Button
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    await revokeInviteAction({ workspaceId, inviteId: i.id });
                  })
                }
              >
                Revoke
              </Button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
