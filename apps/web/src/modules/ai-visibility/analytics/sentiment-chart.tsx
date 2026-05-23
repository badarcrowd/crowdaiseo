import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AreaChart } from "@/components/charts/area-chart";
import type { AnalyticsData } from "./types";

type Props = Pick<AnalyticsData, "sentimentTrend">;

export function SentimentChart({ sentimentTrend }: Readonly<Props>) {
  const labels = sentimentTrend.map((p) =>
    new Date(p.date + "T12:00:00Z").toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    }),
  );

  const hasData = sentimentTrend.some(
    (p) => p.POSITIVE + p.NEUTRAL + p.NEGATIVE + p.MIXED > 0,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sentiment Trends</CardTitle>
        <CardDescription>
          Daily sentiment distribution across all prompt runs
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="text-muted-foreground flex h-44 items-center justify-center text-sm">
            No sentiment data in this period
          </div>
        ) : (
          <AreaChart
            labels={labels}
            series={[
              {
                name: "Positive",
                color: "hsl(var(--success))",
                data: sentimentTrend.map((p) => p.POSITIVE),
              },
              {
                name: "Neutral",
                color: "hsl(var(--chart-2))",
                data: sentimentTrend.map((p) => p.NEUTRAL),
              },
              {
                name: "Mixed",
                color: "hsl(var(--chart-4))",
                data: sentimentTrend.map((p) => p.MIXED),
              },
              {
                name: "Negative",
                color: "hsl(var(--destructive))",
                data: sentimentTrend.map((p) => p.NEGATIVE),
              },
            ]}
            height={180}
          />
        )}
      </CardContent>
    </Card>
  );
}
