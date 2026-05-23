"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { switchWorkspaceAction } from "./actions";

type Item = { id: string; slug: string; name: string };

export function TeamSwitcher({
  current,
  workspaces,
}: Readonly<{ current: Item; workspaces: Item[] }>) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <select
      defaultValue={current.id}
      disabled={pending}
      onChange={(e) => {
        const next = workspaces.find((w) => w.id === e.target.value);
        if (!next || next.id === current.id) return;
        start(async () => {
          const res = await switchWorkspaceAction({ workspaceId: next.id });
          if (res.ok) router.push(`/app/w/${next.slug}/overview`);
        });
      }}
      className="border-input bg-background rounded-md border px-2 py-1 text-sm"
    >
      {workspaces.map((w) => (
        <option key={w.id} value={w.id}>
          {w.name}
        </option>
      ))}
    </select>
  );
}
