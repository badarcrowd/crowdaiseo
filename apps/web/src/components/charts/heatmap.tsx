"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";

export type HeatCell = {
  row: string;
  col: string;
  value: number; // 0..1
  count: number;
};

type Props = {
  rows: string[];
  cols: string[];
  cells: HeatCell[];
  rowLabel?: (r: string) => string;
  colLabel?: (c: string) => string;
  formatValue?: (v: number, count: number) => string;
  color?: string;
  emptyLabel?: string;
  className?: string;
};

export function Heatmap({
  rows,
  cols,
  cells,
  rowLabel = (r) => r,
  colLabel = (c) => c,
  formatValue = (v) => `${Math.round(v * 100)}%`,
  color = "hsl(var(--chart-1))",
  emptyLabel = "—",
  className,
}: Readonly<Props>) {
  const [hovered, setHovered] = useState<string | null>(null);

  const cellMap = new Map<string, HeatCell>();
  for (const cell of cells) cellMap.set(`${cell.row}__${cell.col}`, cell);

  return (
    <div className={cn("overflow-x-auto", className)}>
      <div
        className="grid gap-1 min-w-max"
        style={{
          gridTemplateColumns: `7rem repeat(${cols.length}, minmax(3.5rem, 1fr))`,
        }}
      >
        {/* Column headers */}
        <div />
        {cols.map((col) => (
          <div
            key={col}
            className="text-muted-foreground pb-1 text-center text-[10px] font-medium uppercase tracking-wider truncate px-1"
          >
            {colLabel(col)}
          </div>
        ))}

        {/* Rows */}
        {rows.map((row) => (
          <div key={row} className="contents">
            <div className="text-muted-foreground flex items-center pr-2 text-xs font-medium">
              {rowLabel(row)}
            </div>
            {cols.map((col) => {
              const key = `${row}__${col}`;
              const cell = cellMap.get(key);
              const v = cell?.value ?? 0;
              const hasData = cell !== undefined && cell.count > 0;
              const isHot = hovered === key;
              return (
                <div
                  key={key}
                  className={cn(
                    "relative h-10 rounded-md cursor-default transition-transform duration-150",
                    isHot && "scale-105",
                  )}
                  onMouseEnter={() => setHovered(key)}
                  onMouseLeave={() => setHovered(null)}
                >
                  {/* Variable-opacity background */}
                  <div
                    className="absolute inset-0 rounded-md"
                    style={{
                      backgroundColor: hasData
                        ? color
                        : "hsl(var(--muted))",
                      opacity: hasData
                        ? Math.max(0.08, v * 0.88 + 0.08)
                        : 0.5,
                    }}
                  />
                  <span className="relative flex h-full items-center justify-center text-[10px] font-semibold tabular-nums">
                    {hasData ? formatValue(v, cell.count) : emptyLabel}
                  </span>
                  {/* Hover tooltip */}
                  {isHot && hasData && (
                    <div className="bg-popover border-border text-popover-foreground pointer-events-none absolute bottom-full left-1/2 z-20 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-md border px-2.5 py-1.5 text-xs shadow-md">
                      <span className="font-medium">{formatValue(v, cell.count)}</span>
                      <span className="text-muted-foreground ml-1">
                        ({cell.count} run{cell.count !== 1 ? "s" : ""})
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-3 flex items-center justify-end gap-1.5">
        <span className="text-muted-foreground text-[10px]">0%</span>
        <div
          className="h-2 w-24 rounded-full"
          style={{
            background: `linear-gradient(to right, hsl(var(--muted)), ${color})`,
          }}
        />
        <span className="text-muted-foreground text-[10px]">100%</span>
      </div>
    </div>
  );
}
