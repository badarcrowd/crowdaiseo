"use client";

import { useId } from "react";
import { cn } from "@/lib/utils/cn";

type Props = {
  data: number[];
  width?: number;
  height?: number;
  className?: string;
  color?: string; // CSS color value, e.g. "hsl(var(--chart-1))"
  strokeWidth?: number;
};

/**
 * Minimal sparkline. Pure SVG, no dependencies. Renders a smoothed
 * polyline + a faint area fill underneath using a gradient.
 */
export function Sparkline({
  data,
  width = 120,
  height = 36,
  className,
  color = "hsl(var(--chart-1))",
  strokeWidth = 1.5,
}: Readonly<Props>) {
  const id = useId();
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const stepX = width / (data.length - 1);

  const points = data.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return [x, y] as const;
  });

  const path = points
    .map(([x, y], i) => (i === 0 ? `M${x},${y}` : `L${x},${y}`))
    .join(" ");
  const areaPath = `${path} L${width},${height} L0,${height} Z`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn("overflow-visible", className)}
      aria-hidden
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${id})`} />
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
