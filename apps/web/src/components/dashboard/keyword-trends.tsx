import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Sparkline } from "@/components/charts/sparkline";
import { Badge } from "@/components/ui/badge";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export type KeywordRow = {
  keyword: string;
  position: number;
  delta: number; // positions gained (positive = better)
  volume: number;
  trend: number[];
};

const formatNumber = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n.toString();

export function KeywordTrends({ rows }: Readonly<{ rows: KeywordRow[] }>) {
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Keyword Trends</CardTitle>
            <CardDescription>Tracked positions, 30-day window</CardDescription>
          </div>
          <Badge variant="outline">{rows.length} tracked</Badge>
        </div>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-muted-foreground border-border border-b text-left text-[11px] uppercase tracking-wider">
              <th className="px-5 py-2 font-medium">Keyword</th>
              <th className="px-3 py-2 font-medium">Position</th>
              <th className="px-3 py-2 font-medium">Δ</th>
              <th className="px-3 py-2 font-medium">Volume</th>
              <th className="px-5 py-2 font-medium">Trend</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const up = r.delta > 0;
              const flat = r.delta === 0;
              const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight;
              return (
                <tr
                  key={r.keyword}
                  className="border-border hover:bg-secondary/40 border-b transition-colors last:border-0"
                >
                  <td className="px-5 py-3 font-medium">{r.keyword}</td>
                  <td className="px-3 py-3 tabular-nums">#{r.position}</td>
                  <td className="px-3 py-3">
                    <span
                      className={cn(
                        "inline-flex items-center gap-0.5 text-xs font-medium tabular-nums",
                        flat
                          ? "text-muted-foreground"
                          : up
                            ? "text-success"
                            : "text-destructive",
                      )}
                    >
                      <Icon className="h-3 w-3" />
                      {Math.abs(r.delta)}
                    </span>
                  </td>
                  <td className="text-muted-foreground px-3 py-3 text-xs tabular-nums">
                    {formatNumber(r.volume)}/mo
                  </td>
                  <td className="px-5 py-3">
                    <Sparkline
                      data={r.trend}
                      width={100}
                      height={24}
                      color={
                        flat
                          ? "hsl(var(--muted-foreground))"
                          : up
                            ? "hsl(var(--success))"
                            : "hsl(var(--destructive))"
                      }
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
