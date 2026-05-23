import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AreaChart } from "@/components/charts/area-chart";
import type { AnalyticsData } from "./types";

type Props = Pick<AnalyticsData, "mentionTrend">;

export function MentionTrend({ mentionTrend }: Readonly<Props>) {
  const labels = mentionTrend.map((p) =>
    new Date(p.date + "T12:00:00Z").toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    }),
  );

  const hasData = mentionTrend.some((p) => p.value > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Brand Mention Frequency</CardTitle>
        <CardDescription>
          % of prompt runs where your brand was cited — day by day
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="text-muted-foreground flex h-44 items-center justify-center text-sm">
            No mention data in this period
          </div>
        ) : (
          <AreaChart
            labels={labels}
            series={[
              {
                name: "Mention rate",
                color: "hsl(var(--chart-1))",
                data: mentionTrend.map((p) => p.value),
              },
            ]}
            height={180}
            yFormatter="percent"
          />
        )}
      </CardContent>
    </Card>
  );
}
