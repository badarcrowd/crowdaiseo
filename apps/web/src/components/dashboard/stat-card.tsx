import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkline } from "@/components/charts/sparkline";
import { cn } from "@/lib/utils/cn";

type Props = {
  label: string;
  value: string | number;
  delta?: number;
  trend?: number[];
  icon?: LucideIcon;
  color?: string;
  hint?: string;
};

export function StatCard({
  label,
  value,
  delta,
  trend,
  icon: Icon,
  color = "hsl(var(--chart-1))",
  hint,
}: Readonly<Props>) {
  const positive = (delta ?? 0) >= 0;
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-center justify-between">
          <div className="text-muted-foreground text-[11px] font-medium uppercase tracking-wider">
            {label}
          </div>
          {Icon ? <Icon className="text-muted-foreground h-3.5 w-3.5" /> : null}
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-foreground text-2xl font-semibold tracking-tight tabular-nums">
            {value}
          </span>
          {delta !== undefined ? (
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
          ) : null}
        </div>
        {hint ? (
          <div className="text-muted-foreground mt-1 text-xs">{hint}</div>
        ) : null}
        {trend ? (
          <div className="mt-3 -ml-1">
            <Sparkline data={trend} width={220} height={32} color={color} />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
