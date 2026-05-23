import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type Props = {
  delta: number | null;
  formatter?: (v: number) => string;
  className?: string;
  size?: "sm" | "md";
  inverted?: boolean; // for metrics where lower is better (e.g. avgRank)
};

export function TrendIndicator({
  delta,
  formatter = (v) => `${v > 0 ? "+" : ""}${v.toFixed(1)}`,
  className,
  size = "sm",
  inverted = false,
}: Readonly<Props>) {
  if (delta === null) return null;

  const isPositive = inverted ? delta < 0 : delta > 0;
  const isNegative = inverted ? delta > 0 : delta < 0;
  const isFlat = delta === 0;

  const iconSize = size === "sm" ? "h-3 w-3" : "h-4 w-4";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 tabular-nums",
        size === "sm" ? "text-xs" : "text-sm",
        isPositive && "text-success",
        isNegative && "text-destructive",
        isFlat && "text-muted-foreground",
        className,
      )}
    >
      {isPositive && <TrendingUp className={iconSize} />}
      {isNegative && <TrendingDown className={iconSize} />}
      {isFlat && <Minus className={iconSize} />}
      {!isFlat && formatter(Math.abs(delta))}
    </span>
  );
}
