"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { acceptInviteAction } from "@/modules/workspaces/presentation/actions";

export function AcceptInviteButton({
  token,
  workspaceSlug,
}: Readonly<{ token: string; workspaceSlug: string }>) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <Button
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await acceptInviteAction({ token });
          if (res.ok) router.push(`/app/w/${workspaceSlug}/dashboard`);
          else alert(res.error.message);
        })
      }
    >
      {pending ? "Joining…" : "Accept invite"}
    </Button>
  );
}
