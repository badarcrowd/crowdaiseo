import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, AlertCircle, Lightbulb } from "lucide-react";
import type { MarketMapData } from "../domain/types";

type Props = Pick<MarketMapData, "crossProviderInsights" | "dataWindow" | "totalRunsAnalyzed" | "computedAt">;

export function RecommendationDrivers({ crossProviderInsights, dataWindow, totalRunsAnalyzed, computedAt }: Readonly<Props>) {
  const formattedDate = new Date(computedAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4" />
          AI Recommendation Drivers
        </CardTitle>
        <CardDescription>
          Evidence-backed cross-provider insights derived from {totalRunsAnalyzed.toLocaleString()} prompt runs over the last {dataWindow} days
        </CardDescription>
      </CardHeader>
      <CardContent>
        {crossProviderInsights.length === 0 ? (
          <div className="flex items-start gap-3 rounded-lg border border-dashed p-4">
            <AlertCircle className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
            <p className="text-muted-foreground text-sm">
              Insights will appear once scan data has been collected. Run at least one scan across multiple providers.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {crossProviderInsights.map((insight, i) => (
              <div
                key={i}
                className="bg-secondary/40 flex items-start gap-3 rounded-lg p-3"
              >
                <TrendingUp className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
                <p className="text-foreground text-sm leading-relaxed">{insight}</p>
              </div>
            ))}
          </div>
        )}
        <div className="text-muted-foreground mt-4 text-[10px]">
          Computed {formattedDate} · Scores are deterministic — identical inputs produce identical results
        </div>
      </CardContent>
    </Card>
  );
}
