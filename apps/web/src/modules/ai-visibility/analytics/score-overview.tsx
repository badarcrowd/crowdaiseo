import { DonutScore } from "@/components/charts/donut-score";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import { PROVIDER_LABEL } from "../presentation/labels";
import type { AnalyticsData } from "./types";
import type { ProviderId } from "@prisma/client";

type Props = Pick<
  AnalyticsData,
  "latestScore" | "prevScore" | "scoreBreakdown"
>;

export function ScoreOverview({
  latestScore,
  prevScore,
  scoreBreakdown,
}: Readonly<Props>) {
  const score = latestScore ?? 0;
  const delta = prevScore !== null && latestScore !== null ? score - prevScore : null;
  const bd = scoreBreakdown?.breakdown ?? null;
  const byProvider = scoreBreakdown?.byProvider ?? {};

  const scoreColor =
    score >= 70
      ? "hsl(var(--success))"
      : score >= 40
        ? "hsl(var(--chart-4))"
        : "hsl(var(--destructive))";

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">AI Visibility Score</CardTitle>
          {delta !== null && (
            <Badge variant={delta >= 0 ? "success" : "destructive"}>
              {delta >= 0 ? "+" : ""}
              {delta} pts
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Donut + breakdown */}
        <div className="flex items-center gap-5">
          <DonutScore
            value={score}
            size={108}
            strokeWidth={9}
            color={scoreColor}
            label="/ 100"
          />
          <div className="flex-1 space-y-2 min-w-0">
            {bd ? (
              <>
                <BreakdownRow
                  label="Citation rate"
                  value={`${Math.round(bd.citationRate * 100)}%`}
                  fill={bd.citationRate}
                  color="hsl(var(--chart-1))"
                />
                <BreakdownRow
                  label="Avg brand rank"
                  value={bd.avgRank !== null ? `#${bd.avgRank}` : "—"}
                  fill={
                    bd.avgRank !== null
                      ? 1 - Math.min(1, (bd.avgRank - 1) / 9)
                      : 0
                  }
                  color="hsl(var(--chart-2))"
                />
                <BreakdownRow
                  label="Sentiment"
                  value={`${bd.sentimentBonus >= 0 ? "+" : ""}${bd.sentimentBonus.toFixed(1)}`}
                  fill={Math.max(0, (bd.sentimentBonus + 15) / 30)}
                  color="hsl(var(--chart-3))"
                />
                <BreakdownRow
                  label="Citations"
                  value={bd.citationCount.toLocaleString()}
                  fill={Math.min(1, bd.citationCount / 100)}
                  color="hsl(var(--chart-4))"
                />
              </>
            ) : (
              <p className="text-muted-foreground text-xs">
                Run a scan to compute your score.
              </p>
            )}
          </div>
        </div>

        {/* Per-provider sub-scores */}
        {Object.keys(byProvider).length > 0 && (
          <div className="grid grid-cols-2 gap-1.5 border-t border-border pt-4">
            {(Object.entries(byProvider) as [ProviderId, number][]).map(
              ([provider, sub]) => (
                <div
                  key={provider}
                  className="bg-muted/40 flex items-center justify-between rounded-md px-2.5 py-1.5"
                >
                  <span className="text-muted-foreground truncate text-xs">
                    {PROVIDER_LABEL[provider]}
                  </span>
                  <span
                    className={cn(
                      "ml-2 shrink-0 tabular-nums text-xs font-semibold",
                      sub >= 70
                        ? "text-success"
                        : sub >= 40
                          ? "text-foreground"
                          : "text-destructive",
                    )}
                  >
                    {sub}
                  </span>
                </div>
              ),
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function BreakdownRow({
  label,
  value,
  fill,
  color,
}: Readonly<{
  label: string;
  value: string;
  fill: number;
  color: string;
}>) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular-nums font-medium">{value}</span>
      </div>
      <div className="bg-muted h-1 overflow-hidden rounded-full">
        <div
          className="h-full rounded-full transition-[width] duration-700 ease-out"
          style={{ width: `${Math.round(fill * 100)}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
