import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkline } from "@/components/charts/sparkline";
import { DonutScore } from "@/components/charts/donut-score";
import { cn } from "@/lib/utils/cn";

type Props = {
  label: string;
  score: number;
  delta: number; // percentage change
  trend: number[];
  color?: string;
  description?: string;
};

export function ScoreCard({
  label,
  score,
  delta,
  trend,
  color = "hsl(var(--chart-1))",
  description,
}: Readonly<Props>) {
  const positive = delta >= 0;
  return (
    <Card>
      <CardContent className="flex items-center gap-4 pt-5">
        <DonutScore value={score} color={color} size={80} strokeWidth={6} />
        <div className="min-w-0 flex-1">
          <div className="text-muted-foreground text-[11px] font-medium uppercase tracking-wider">
            {label}
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-foreground text-xl font-semibold tracking-tight tabular-nums">
              {score}
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-0.5 text-xs font-medium",
                positive ? "text-success" : "text-destructive",
              )}
            >
              {positive ? (
                <ArrowUpRight className="h-3 w-3" />
              ) : (
                <ArrowDownRight className="h-3 w-3" />
              )}
              {Math.abs(delta).toFixed(1)}%
            </span>
          </div>
          {description ? (
            <div className="text-muted-foreground mt-1 truncate text-xs">
              {description}
            </div>
          ) : null}
          <div className="mt-2 -ml-1">
            <Sparkline data={trend} width={140} height={28} color={color} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
