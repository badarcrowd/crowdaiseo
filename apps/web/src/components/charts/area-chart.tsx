"use client";

import { useId, useMemo, useState } from "react";
import { cn } from "@/lib/utils/cn";

export type Series = {
  name: string;
  color: string; // hsl(var(--chart-1)) etc.
  data: number[];
};

type FormatType = "default" | "locale" | "percent" | "rank";

type Props = {
  labels: string[];
  series: Series[];
  height?: number;
  className?: string;
  yFormatter?: ((v: number) => string) | FormatType;
};

const formatters: Record<FormatType, (v: number) => string> = {
  default: (v) => v.toString(),
  locale: (v) => v.toLocaleString(),
  percent: (v) => `${v.toFixed(1)}%`,
  rank: (v) => (v > 0 ? `#${v}` : "—"),
};

/**
 * Multi-series area chart, pure SVG. Tooltip on hover, grid lines,
 * theme-aware via CSS variables. No external deps.
 */
export function AreaChart({
  labels,
  series,
  height = 220,
  className,
  yFormatter = "default",
}: Readonly<Props>) {
  const id = useId();
  const [hover, setHover] = useState<number | null>(null);

  const formatter = typeof yFormatter === "function" 
    ? yFormatter 
    : formatters[yFormatter];

  const { paths, areas, max, min, points } = useMemo(() => {
    const all = series.flatMap((s) => s.data);
    const max = Math.max(...all);
    const min = Math.min(...all);
    const range = max - min || 1;
    const W = 100; // viewBox width
    const H = 100; // viewBox height
    const stepX = W / Math.max(1, labels.length - 1);
    const y = (v: number) => H - ((v - min) / range) * (H - 6) - 3;

    const points = series.map((s) =>
      s.data.map((v, i) => [i * stepX, y(v)] as const),
    );
    const paths = points.map((pts) =>
      pts.map(([x, py], i) => (i === 0 ? `M${x},${py}` : `L${x},${py}`)).join(" "),
    );
    const areas = paths.map((p) => `${p} L${W},${H} L0,${H} Z`);
    return { paths, areas, max, min, points };
  }, [labels.length, series]);

  return (
    <div className={cn("w-full", className)}>
      <div className="relative" style={{ height }}>
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="h-full w-full"
          onMouseLeave={() => setHover(null)}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const stepX = 100 / Math.max(1, labels.length - 1);
            const idx = Math.round(x / stepX);
            setHover(Math.max(0, Math.min(labels.length - 1, idx)));
          }}
        >
          <defs>
            {series.map((s, i) => (
              <linearGradient
                key={s.name}
                id={`${id}-${i}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor={s.color} stopOpacity="0.22" />
                <stop offset="100%" stopColor={s.color} stopOpacity="0" />
              </linearGradient>
            ))}
          </defs>

          {/* Grid lines */}
          {[25, 50, 75].map((y) => (
            <line
              key={y}
              x1={0}
              x2={100}
              y1={y}
              y2={y}
              stroke="hsl(var(--border))"
              strokeWidth={0.2}
              strokeDasharray="0.6 0.8"
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {areas.map((d, i) => (
            <path key={`a-${i}`} d={d} fill={`url(#${id}-${i})`} />
          ))}
          {paths.map((d, i) => (
            <path
              key={`p-${i}`}
              d={d}
              fill="none"
              stroke={series[i].color}
              strokeWidth={1.4}
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {hover !== null && (
            <line
              x1={(hover / Math.max(1, labels.length - 1)) * 100}
              x2={(hover / Math.max(1, labels.length - 1)) * 100}
              y1={0}
              y2={100}
              stroke="hsl(var(--foreground))"
              strokeWidth={0.4}
              vectorEffect="non-scaling-stroke"
            />
          )}
          {hover !== null &&
            points.map((pts, i) => {
              const [x, y] = pts[hover];
              return (
                <circle
                  key={`d-${i}`}
                  cx={x}
                  cy={y}
                  r={1.4}
                  fill={series[i].color}
                  stroke="hsl(var(--background))"
                  strokeWidth={0.6}
                  vectorEffect="non-scaling-stroke"
                />
              );
            })}
        </svg>

        {hover !== null && (
          <div
            className="bg-popover text-popover-foreground border-border pointer-events-none absolute top-2 z-10 -translate-x-1/2 rounded-md border px-2.5 py-1.5 text-xs shadow-md"
            style={{ left: `${(hover / Math.max(1, labels.length - 1)) * 100}%` }}
          >
            <div className="text-muted-foreground mb-1 text-[10px] uppercase tracking-wider">
              {labels[hover]}
            </div>
            <div className="space-y-1">
              {series.map((s) => (
                <div key={s.name} className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 rounded-sm"
                    style={{ background: s.color }}
                  />
                  <span className="text-foreground">{s.name}</span>
                  <span className="ml-auto tabular-nums font-medium">
                    {formatter(s.data[hover])}
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

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        {series.map((s) => (
          <div key={s.name} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm" style={{ background: s.color }} />
            <span className="text-muted-foreground">{s.name}</span>
          </div>
        ))}
        <span className="text-muted-foreground ml-auto tabular-nums">
          {formatter(min)} – {formatter(max)}
        </span>
      </div>
    </div>
  );
}
