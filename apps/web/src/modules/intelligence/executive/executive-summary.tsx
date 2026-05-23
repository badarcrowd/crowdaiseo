import { CalendarDays, AlertCircle, Info, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { TrendIndicator } from "../components/trend-indicator";
import type { ExecutiveSummaryData } from "../queries";

type Props = {
  data: ExecutiveSummaryData;
};

export function ExecutiveSummary({ data }: Readonly<Props>) {
  return (
    <div className="space-y-4">
      {/* Score overview */}
      <div className="grid grid-cols-3 gap-3">
        <div className="border-border rounded-xl border p-3 text-center">
          <div className="text-destructive text-2xl font-bold tabular-nums">
            {data.criticalCount}
          </div>
          <div className="text-muted-foreground mt-0.5 flex items-center justify-center gap-1 text-[10px]">
            <AlertCircle className="h-3 w-3 text-destructive" />
            Critical
          </div>
        </div>
        <div className="border-border rounded-xl border p-3 text-center">
          <div className="text-warning text-2xl font-bold tabular-nums">
            {data.attentionCount}
          </div>
          <div className="text-muted-foreground mt-0.5 flex items-center justify-center gap-1 text-[10px]">
            <AlertCircle className="h-3 w-3 text-warning" />
            Attention
          </div>
        </div>
        <div className="border-border rounded-xl border p-3 text-center">
          <div className="text-info text-2xl font-bold tabular-nums">
            {data.infoCount}
          </div>
          <div className="text-muted-foreground mt-0.5 flex items-center justify-center gap-1 text-[10px]">
            <Info className="h-3 w-3 text-info" />
            Info
          </div>
        </div>
      </div>

      {/* Score snapshot */}
      {data.scoreSnapshot.latest !== null && (
        <div className="border-border bg-secondary/30 rounded-xl border p-3">
          <div className="text-muted-foreground mb-1 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider">
            <TrendingUp className="h-3 w-3" />
            Current AI Visibility Score
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold tabular-nums">
              {data.scoreSnapshot.latest}
            </span>
            <TrendIndicator
              delta={data.scoreSnapshot.delta}
              formatter={(v) => `+${v.toFixed(0)}`}
              size="md"
            />
          </div>
        </div>
      )}

      {/* Weekly summary */}
      {data.latestWeeklySummary && (
        <div className="space-y-2">
          <div className="text-muted-foreground flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider">
            <CalendarDays className="h-3 w-3" />
            Weekly Brief
            <span className="ml-auto normal-case">
              {new Date(data.latestWeeklySummary.forDay).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>
          <div className="border-border rounded-xl border p-3">
            <p className="text-foreground mb-1.5 text-sm font-semibold">
              {data.latestWeeklySummary.title}
            </p>
            <p className="text-muted-foreground text-xs leading-relaxed line-clamp-4">
              {data.latestWeeklySummary.body}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
