"use client";

import { Clock, Zap } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import type { TrialStatus } from "../../domain/types";

type TrialBannerProps = {
  trial: TrialStatus;
  workspaceSlug: string;
  className?: string;
};

export function TrialBanner({ trial, workspaceSlug, className }: TrialBannerProps) {
  if (!trial.active) return null;

  const isUrgent = trial.daysRemaining <= 3;
  const upgradeHref = `/w/${workspaceSlug}/settings/billing`;

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 rounded-lg border px-4 py-3 text-sm",
        isUrgent
          ? "border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
          : "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <Clock className="size-4 shrink-0" />
        <span>
          {isUrgent ? (
            <>
              <strong>Trial ending soon</strong> —{" "}
              {trial.daysRemaining === 1
                ? "last day"
                : `${trial.daysRemaining} days remaining`}
            </>
          ) : (
            <>
              Free trial · <strong>{trial.daysRemaining} days remaining</strong>
            </>
          )}
        </span>
      </div>

      <Link
        href={upgradeHref}
        className={cn(
          "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
          isUrgent
            ? "bg-red-600 text-white hover:bg-red-700"
            : "bg-amber-600 text-white hover:bg-amber-700",
        )}
      >
        <Zap className="size-3" />
        Upgrade now
      </Link>
    </div>
  );
}
