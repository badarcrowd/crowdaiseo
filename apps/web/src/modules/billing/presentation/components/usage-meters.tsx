"use client";

import { cn } from "@/lib/utils/cn";
import type { UsageSummary } from "../../domain/types";

type UsageMetersProps = {
  usage: UsageSummary;
  className?: string;
};

type Meter = {
  label: string;
  used: number;
  limit: number;
};

export function UsageMeters({ usage, className }: UsageMetersProps) {
  const meters: Meter[] = [
    { label: "Scans", used: usage.scans.used, limit: usage.scans.limit },
    { label: "Prompt runs", used: usage.promptRuns.used, limit: usage.promptRuns.limit },
    { label: "Reports", used: usage.reports.used, limit: usage.reports.limit },
    { label: "Projects", used: usage.projects.used, limit: usage.projects.limit },
    { label: "Seats", used: usage.seats.used, limit: usage.seats.limit },
  ];

  return (
    <div className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-3", className)}>
      {meters.map((meter) => (
        <MeterCard key={meter.label} {...meter} />
      ))}
    </div>
  );
}

function MeterCard({ label, used, limit }: Meter) {
  const isUnlimited = limit === -1;
  const pct = isUnlimited ? 0 : Math.min((used / limit) * 100, 100);
  const isWarning = pct >= 80 && pct < 100;
  const isOver = pct >= 100;

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className="text-xs text-muted-foreground">
          {isUnlimited ? (
            <span className="text-emerald-600">Unlimited</span>
          ) : (
            <>
              <span
                className={cn(
                  "font-semibold",
                  isOver && "text-red-600",
                  isWarning && "text-amber-600",
                )}
              >
                {used.toLocaleString()}
              </span>
              {" / "}
              {limit.toLocaleString()}
            </>
          )}
        </span>
      </div>

      {!isUnlimited && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              isOver ? "bg-red-500" : isWarning ? "bg-amber-500" : "bg-primary",
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}
