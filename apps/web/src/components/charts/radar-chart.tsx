"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils/cn";

export type RadarSeries = {
  name: string;
  color: string;
  data: number[]; // values 0..100 for each axis
};

type Props = {
  axes: string[];
  series: RadarSeries[];
  size?: number;
  className?: string;
};

export function RadarChart({ axes, series, size = 240, className }: Readonly<Props>) {
  const cx = size / 2;
  const cy = size / 2;
  const r = (size / 2) * 0.72;
  const levels = 4;

  const points = useMemo(() => {
    const n = axes.length;
    return Array.from({ length: n }, (_, i) => {
      const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
      return { cos: Math.cos(angle), sin: Math.sin(angle) };
    });
  }, [axes]);

  const toXY = (value: number, idx: number) => {
    const ratio = value / 100;
    return {
      x: cx + points[idx]!.cos * r * ratio,
      y: cy + points[idx]!.sin * r * ratio,
    };
  };

  const gridPolygon = (level: number) => {
    const ratio = level / levels;
    return points
      .map(({ cos, sin }, i) => {
        void i;
        return `${cx + cos * r * ratio},${cy + sin * r * ratio}`;
      })
      .join(" ");
  };

  const seriesPath = (data: number[]) => {
    const pts = data.map((v, i) => toXY(v, i));
    return pts.map(({ x, y }, i) => `${i === 0 ? "M" : "L"}${x},${y}`).join(" ") + "Z";
  };

  const labelOffset = 1.18;

  return (
    <div className={cn("flex items-center justify-center", className)}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Grid rings */}
        {Array.from({ length: levels }, (_, i) => i + 1).map((level) => (
          <polygon
            key={level}
            points={gridPolygon(level)}
            fill="none"
            stroke="hsl(var(--border))"
            strokeWidth={0.6}
          />
        ))}

        {/* Spokes */}
        {points.map(({ cos, sin }, i) => (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={cx + cos * r}
            y2={cy + sin * r}
            stroke="hsl(var(--border))"
            strokeWidth={0.6}
          />
        ))}

        {/* Series fills and strokes */}
        {series.map((s) => (
          <g key={s.name}>
            <path d={seriesPath(s.data)} fill={s.color} fillOpacity={0.15} stroke="none" />
            <path
              d={seriesPath(s.data)}
              fill="none"
              stroke={s.color}
              strokeWidth={1.5}
              strokeLinejoin="round"
            />
            {s.data.map((v, i) => {
              const { x, y } = toXY(v, i);
              return (
                <circle
                  key={i}
                  cx={x}
                  cy={y}
                  r={2.5}
                  fill={s.color}
                  stroke="hsl(var(--background))"
                  strokeWidth={1}
                />
              );
            })}
          </g>
        ))}

        {/* Axis labels */}
        {axes.map((label, i) => {
          const { cos, sin } = points[i]!;
          const lx = cx + cos * r * labelOffset;
          const ly = cy + sin * r * labelOffset;
          const anchor = cos > 0.1 ? "start" : cos < -0.1 ? "end" : "middle";
          return (
            <text
              key={label}
              x={lx}
              y={ly}
              textAnchor={anchor}
              dominantBaseline="central"
              fontSize={9}
              fill="hsl(var(--muted-foreground))"
              fontFamily="var(--font-sans)"
            >
              {label}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
