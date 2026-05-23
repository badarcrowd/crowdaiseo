import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { HorizontalBars } from "@/components/charts/horizontal-bars";
import type { AnalyticsData } from "./types";

type Props = Pick<AnalyticsData, "competitorStats">;

const PALETTE = [
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export function CompetitorChart({ competitorStats }: Readonly<Props>) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Competitor Comparison</CardTitle>
        <CardDescription>
          Competitor entities detected in LLM responses
        </CardDescription>
      </CardHeader>
      <CardContent>
        {competitorStats.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No competitor mentions detected. Add competitors in your project
            settings to start tracking.
          </p>
        ) : (
          <HorizontalBars
            rows={competitorStats.map((c, i) => ({
              label: c.entity,
              value: c.count,
              meta: `${c.count} · ${Math.round(c.share * 100)}%`,
              color: PALETTE[i % PALETTE.length],
            }))}
          />
        )}
      </CardContent>
    </Card>
  );
}
