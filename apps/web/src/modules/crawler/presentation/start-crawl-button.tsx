"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Spline } from "lucide-react";
import { Button } from "@/components/ui/button";
import { startCrawlAction } from "./actions";

export function StartCrawlButton({
  workspaceId,
  projectId,
  size = "sm",
  variant = "ghost",
}: Readonly<{
  workspaceId: string;
  projectId: string;
  size?: "sm" | "default";
  variant?: "default" | "ghost" | "outline";
}>) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      size={size}
      variant={variant}
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await startCrawlAction({ workspaceId, projectId });
          if (res.ok) router.refresh();
          else alert(res.error.message);
        })
      }
    >
      <Spline className="h-3.5 w-3.5" />
      {pending ? "Queuing…" : "Crawl"}
    </Button>
  );
}
