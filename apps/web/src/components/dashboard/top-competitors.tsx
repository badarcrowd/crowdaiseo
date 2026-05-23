import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { HorizontalBars } from "@/components/charts/horizontal-bars";
import { Badge } from "@/components/ui/badge";

type Competitor = { name: string; share: number; delta: number };

export function TopCompetitors({ data }: Readonly<{ data: Competitor[] }>) {
  const max = Math.max(1, ...data.map((d) => d.share));
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Top Competitors</CardTitle>
            <CardDescription>Share of AI mentions, last 30 days</CardDescription>
          </div>
          <Badge variant="outline">Top 5</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="text-muted-foreground py-8 text-center text-sm">
            Competitor mentions will appear after scans complete.
          </div>
        ) : (
          <HorizontalBars
            max={max}
            rows={data.map((d, i) => ({
              label: d.name,
              value: d.share,
              color: `hsl(var(--chart-${(i % 5) + 1}))`,
              meta: `${d.share.toFixed(1)}%  ${d.delta >= 0 ? "▲" : "▼"} ${Math.abs(d.delta).toFixed(1)}`,
            }))}
          />
        )}
      </CardContent>
    </Card>
  );
}
