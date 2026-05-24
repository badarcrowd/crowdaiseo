"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteCrawlAction } from "./actions";

export function DeleteCrawlButton({
  workspaceId,
  crawlId,
}: Readonly<{
  workspaceId: string;
  crawlId: string;
}>) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      size="icon"
      variant="ghost"
      className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 w-8 transition-colors"
      disabled={pending}
      onClick={() => {
        if (!confirm("Are you sure you want to delete this crawl record and all its data?")) return;
        start(async () => {
          const res = await deleteCrawlAction({ workspaceId, crawlId });
          if (res.ok) router.refresh();
          else alert(res.error.message);
        });
      }}
    >
      <Trash2 className="h-4 w-4" />
      <span className="sr-only">Delete</span>
    </Button>
  );
}
