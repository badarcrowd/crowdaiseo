"use client";

import { useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { retryReportAction } from "./actions";

export function RetryReportButton({
  reportId,
  workspaceId,
}: Readonly<{ reportId: string; workspaceId: string }>) {
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await retryReportAction({ reportId, workspaceId });
        })
      }
      className="text-muted-foreground hover:bg-secondary hover:text-foreground rounded-md p-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
      aria-label="Retry report"
    >
      <RefreshCw className={`h-3.5 w-3.5 ${pending ? "animate-spin" : ""}`} />
    </button>
  );
}
