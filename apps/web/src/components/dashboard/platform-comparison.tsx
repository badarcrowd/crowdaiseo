import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";

export type PlatformRow = {
  platform: string;
  mentions: number;
  sentiment: number; // -1..1
  share: number; // 0..100
  delta: number;
};

const sentimentBadge = (s: number) => {
  if (s >= 0.4)
    return { label: "Positive", className: "bg-[hsl(var(--success)/0.12)] text-[hsl(var(--success))]" };
  if (s <= -0.2)
    return { label: "Negative", className: "bg-destructive/10 text-destructive" };
  return { label: "Neutral", className: "bg-muted text-muted-foreground" };
};

export function PlatformComparison({
  rows,
}: Readonly<{ rows: PlatformRow[] }>) {
  const max = Math.max(1, ...rows.map((r) => r.share));
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>AI Platform Comparison</CardTitle>
            <CardDescription>
              Mentions, share, and sentiment across LLMs
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {rows.length === 0 && (
          <div className="text-muted-foreground py-8 text-center text-sm">
            Run an AI visibility scan to populate platform analytics.
          </div>
        )}
        {rows.map((r, i) => {
          const sent = sentimentBadge(r.sentiment);
          const color = `hsl(var(--chart-${(i % 5) + 1}))`;
          return (
            <div key={r.platform} className="space-y-1.5">
              <div className="flex items-center gap-2 text-sm">
                <span
                  className="inline-block h-2 w-2 shrink-0 rounded-sm"
                  style={{ background: color }}
                />
                <span className="font-medium">{r.platform}</span>
                <span
                  className={cn(
                    "ml-auto rounded-md px-1.5 py-0.5 text-[10px] font-medium",
                    sent.className,
                  )}
                >
                  {sent.label}
                </span>
                <span className="text-muted-foreground w-16 text-right text-xs tabular-nums">
                  {r.mentions.toLocaleString()}
                </span>
              </div>
              <div className="bg-muted relative h-1.5 overflow-hidden rounded-full">
                <div
                  className="h-full rounded-full transition-[width] duration-700 ease-out"
                  style={{
                    width: `${(r.share / max) * 100}%`,
                    backgroundColor: color,
                  }}
                />
              </div>
              <div className="text-muted-foreground flex justify-between text-[10px] tabular-nums">
                <span>{r.share.toFixed(1)}% share</span>
                <span className={r.delta >= 0 ? "text-success" : "text-destructive"}>
                  {r.delta >= 0 ? "+" : ""}
                  {r.delta.toFixed(1)}% vs last period
                </span>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
