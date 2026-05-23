"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { inviteMemberAction } from "./actions";
import type { ActionResult } from "@/lib/actions/safe-action";

type State = ActionResult<{ id: string; acceptUrl: string }> | null;

export function InviteForm({ workspaceId }: Readonly<{ workspaceId: string }>) {
  const [state, formAction, pending] = useActionState<State, FormData>(
    async (_prev, fd) =>
      inviteMemberAction({
        workspaceId,
        email: fd.get("email"),
        role: fd.get("role"),
      }),
    null,
  );

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <label className="flex-1 space-y-1">
        <span className="text-sm font-medium">Email</span>
        <input
          name="email"
          type="email"
          required
          className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
          placeholder="teammate@company.com"
        />
      </label>
      <label className="space-y-1">
        <span className="text-sm font-medium">Role</span>
        <select
          name="role"
          defaultValue="EDITOR"
          className="border-input bg-background rounded-md border px-3 py-2 text-sm"
        >
          <option value="ADMIN">Admin</option>
          <option value="EDITOR">Editor</option>
          <option value="VIEWER">Viewer</option>
        </select>
      </label>
      <Button type="submit" disabled={pending}>
        {pending ? "Sending…" : "Send invite"}
      </Button>
      {state?.ok && (
        <p className="text-muted-foreground basis-full text-xs">
          Invite sent. Link:{" "}
          <code className="text-foreground">{state.data.acceptUrl}</code>
        </p>
      )}
      {state && !state.ok && (
        <p className="text-destructive basis-full text-sm">{state.error.message}</p>
      )}
    </form>
  );
}
