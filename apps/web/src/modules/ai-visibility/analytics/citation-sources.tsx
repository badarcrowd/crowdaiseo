import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { HorizontalBars } from "@/components/charts/horizontal-bars";
import type { AnalyticsData } from "./types";

type Props = Pick<AnalyticsData, "citationStats">;

export function CitationSources({ citationStats }: Readonly<Props>) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Citation Source Analysis</CardTitle>
        <CardDescription>
          Domains most frequently cited in AI responses
        </CardDescription>
      </CardHeader>
      <CardContent>
        {citationStats.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No citations extracted yet. Citations appear when providers like
            Perplexity include source links.
          </p>
        ) : (
          <HorizontalBars
            rows={citationStats.slice(0, 12).map((c, i) => ({
              label: c.domain,
              value: c.count,
              meta: `${c.count} · ${Math.round(c.share * 100)}%`,
              color:
                i === 0
                  ? "hsl(var(--chart-1))"
                  : i < 3
                    ? "hsl(var(--chart-2))"
                    : "hsl(var(--chart-3))",
            }))}
          />
        )}
      </CardContent>
    </Card>
  );
}
