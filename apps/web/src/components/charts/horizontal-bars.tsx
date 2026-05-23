"use client";

import { cn } from "@/lib/utils/cn";

type Row = { label: string; value: number; meta?: string; color?: string };

export function HorizontalBars({
  rows,
  max,
  formatValue = (v) => v.toLocaleString(),
  className,
}: Readonly<{
  rows: Row[];
  max?: number;
  formatValue?: (v: number) => string;
  className?: string;
}>) {
  const upper = max ?? Math.max(...rows.map((r) => r.value), 1);
  return (
    <div className={cn("space-y-3", className)}>
      {rows.map((r) => {
        const pct = (r.value / upper) * 100;
        return (
          <div key={r.label} className="space-y-1.5">
            <div className="flex items-baseline justify-between text-xs">
              <span className="text-foreground truncate font-medium">
                {r.label}
              </span>
              <span className="text-muted-foreground tabular-nums">
                {r.meta ?? formatValue(r.value)}
              </span>
            </div>
            <div className="bg-muted relative h-1.5 overflow-hidden rounded-full">
              <div
                className="h-full rounded-full transition-[width] duration-700 ease-out"
                style={{
                  width: `${pct}%`,
                  backgroundColor: r.color ?? "hsl(var(--chart-1))",
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
