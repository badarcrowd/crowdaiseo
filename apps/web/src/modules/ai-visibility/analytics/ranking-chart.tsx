import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AreaChart } from "@/components/charts/area-chart";
import type { AnalyticsData } from "./types";

type Props = Pick<AnalyticsData, "rankingTrend">;

export function RankingChart({ rankingTrend }: Readonly<Props>) {
  const labels = rankingTrend.map((p) =>
    new Date(p.date + "T12:00:00Z").toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    }),
  );

  // Only render non-zero days — days without mention data read as 0
  const hasData = rankingTrend.some((p) => p.value > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Ranking Trends</CardTitle>
        <CardDescription>
          Average brand position in AI responses — lower rank is better
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="text-muted-foreground flex h-44 items-center justify-center text-sm">
            No ranking data in this period
          </div>
        ) : (
          <AreaChart
            labels={labels}
            series={[
              {
                name: "Avg rank",
                color: "hsl(var(--chart-3))",
                data: rankingTrend.map((p) => p.value),
              },
            ]}
            height={200}
            yFormatter="rank"
          />
        )}
      </CardContent>
    </Card>
  );
}
