"use client";

import { useState, useId, useMemo } from "react";
import { cn } from "@/lib/utils/cn";

export type BarSeries = {
  name: string;
  color: string;
  data: number[];
};

type FormatType = "default" | "locale" | "percent" | "rank";

type Props = {
  labels: string[];
  series: BarSeries[];
  height?: number;
  className?: string;
  yFormatter?: ((v: number) => string) | FormatType;
  stacked?: boolean;
};

const formatters: Record<FormatType, (v: number) => string> = {
  default: (v) => v.toString(),
  locale: (v) => v.toLocaleString(),
  percent: (v) => `${v.toFixed(1)}%`,
  rank: (v) => (v > 0 ? `#${v}` : "—"),
};

export function BarChart({
  labels,
  series,
  height = 200,
  className,
  yFormatter = "default",
  stacked = false,
}: Readonly<Props>) {
  const id = useId();
  const [hover, setHover] = useState<number | null>(null);
  const gap = 0.15;

  const formatter = typeof yFormatter === "function" 
    ? yFormatter 
    : formatters[yFormatter];

  const { bars, max } = useMemo(() => {
    const n = labels.length;
    if (stacked) {
      const totals = labels.map((_, i) =>
        series.reduce((sum, s) => sum + (s.data[i] ?? 0), 0),
      );
      const max = Math.max(...totals, 1);
      const barW = (100 / n) * (1 - gap);
      const bars = series.map((s) => ({
        ...s,
        rects: s.data.map((_, i) => {
          const stackBase = series
            .slice(0, series.indexOf(s))
            .reduce((sum, prev) => sum + (prev.data[i] ?? 0), 0);
          const val = s.data[i] ?? 0;
          const x = (i / n) * 100 + (((100 / n) * gap) / 2);
          const yBase = 100 - ((stackBase + val) / max) * 94 - 3;
          const h = (val / max) * 94;
          return { x, y: yBase, w: barW, h: Math.max(0, h), val, i };
        }),
      }));
      return { bars, max };
    }

    const groupW = 100 / n;
    const barW = (groupW * (1 - gap)) / series.length;
    const max = Math.max(...series.flatMap((s) => s.data), 1);
    const bars = series.map((s, si) => ({
      ...s,
      rects: s.data.map((val, i) => {
        const x = i * groupW + (groupW * gap) / 2 + si * barW;
        const h = (val / max) * 94;
        const y = 100 - h - 3;
        return { x, y, w: barW * 0.85, h: Math.max(0, h), val, i };
      }),
    }));
    return { bars, max };
  }, [labels, series, stacked, gap]);

  return (
    <div className={cn("w-full", className)}>
      <div className="relative" style={{ height }}>
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="h-full w-full"
          onMouseLeave={() => setHover(null)}
        >
          {/* Grid lines */}
          {[25, 50, 75].map((y) => (
            <line
              key={y}
              x1={0} x2={100} y1={y} y2={y}
              stroke="hsl(var(--border))"
              strokeWidth={0.2}
              strokeDasharray="0.6 0.8"
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {bars.map((s) =>
            s.rects.map(({ x, y, w, h, i }) => (
              <rect
                key={`${s.name}-${i}`}
                x={x} y={y} width={w} height={h}
                fill={s.color}
                fillOpacity={hover === i ? 1 : 0.85}
                rx={0.4}
                onMouseEnter={() => setHover(i)}
              />
            )),
          )}

          {/* Hover vertical highlight */}
          {hover !== null && (
            <rect
              x={(hover / labels.length) * 100}
              y={0}
              width={100 / labels.length}
              height={100}
              fill="hsl(var(--foreground))"
              fillOpacity={0.03}
              pointerEvents="none"
            />
          )}
        </svg>

        {/* Tooltip */}
        {hover !== null && (
          <div
            className="bg-popover text-popover-foreground border-border pointer-events-none absolute top-1 z-10 -translate-x-1/2 rounded-md border px-2.5 py-1.5 text-xs shadow-lg"
            style={{ left: `${((hover + 0.5) / labels.length) * 100}%` }}
          >
            <div className="text-muted-foreground mb-1 text-[10px] uppercase tracking-wider">
              {labels[hover]}
            </div>
            <div className="space-y-0.5">
              {series.map((s) => (
                <div key={s.name} className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-sm" style={{ background: s.color }} />
                  <span className="text-foreground">{s.name}</span>
                  <span className="ml-auto tabular-nums font-medium">
                    {formatter(s.data[hover] ?? 0)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="text-muted-foreground mt-2 flex justify-between text-[10px]">
        <span>{labels[0]}</span>
        <span>{labels[Math.floor(labels.length / 2)]}</span>
        <span>{labels[labels.length - 1]}</span>
      </div>

      {series.length > 1 && (
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          {series.map((s) => (
            <div key={s.name} className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm" style={{ background: s.color }} />
              <span className="text-muted-foreground">{s.name}</span>
            </div>
          ))}
        </div>
      )}

      {/* suppress unused id warning */}
      <span data-id={id} className="sr-only" />
    </div>
  );
}
