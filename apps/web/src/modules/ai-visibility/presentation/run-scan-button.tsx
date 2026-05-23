"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { startVisibilityScanAction } from "./actions";

export function RunScanButton({
  workspaceId,
  projectId,
  disabled,
}: Readonly<{
  workspaceId: string;
  projectId: string | null;
  disabled?: boolean;
}>) {
  const router = useRouter();
  const [pending, start] = useTransition();

  if (!projectId) {
    return (
      <Button size="sm" disabled>
        <Play className="h-3.5 w-3.5" /> Run scan
      </Button>
    );
  }

  return (
    <Button
      size="sm"
      disabled={disabled || pending}
      onClick={() =>
        start(async () => {
          const res = await startVisibilityScanAction({
            workspaceId,
            projectId,
          });
          if (res.ok) {
            router.refresh();
          } else {
            alert(res.error.message);
          }
        })
      }
    >
      <Play className="h-3.5 w-3.5" />
      {pending ? "Starting…" : "Run scan"}
    </Button>
  );
}
