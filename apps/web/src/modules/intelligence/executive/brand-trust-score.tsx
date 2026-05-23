import { Shield, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { BrandTrustData } from "../queries";

function ScoreArc({ score }: { score: number }) {
  const size = 120;
  const r = 44;
  const cx = size / 2;
  const cy = size / 2 + 8;
  const startAngle = -210;
  const endAngle = 30;
  const totalArc = endAngle - startAngle;
  const scoreArc = (score / 100) * totalArc;

  const toXY = (angle: number) => {
    const rad = (angle * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };

  const describeArc = (start: number, end: number) => {
    const s = toXY(start);
    const e = toXY(end);
    const large = end - start > 180 ? 1 : 0;
    return `M${s.x},${s.y} A${r},${r},0,${large},1,${e.x},${e.y}`;
  };

  const color =
    score >= 70
      ? "hsl(var(--success))"
      : score >= 40
        ? "hsl(var(--warning))"
        : "hsl(var(--destructive))";

  return (
    <svg width={size} height={size * 0.75} viewBox={`0 0 ${size} ${size * 0.75}`}>
      {/* Track */}
      <path
        d={describeArc(startAngle, endAngle)}
        fill="none"
        stroke="hsl(var(--border))"
        strokeWidth={7}
        strokeLinecap="round"
      />
      {/* Score fill */}
      {score > 0 && (
        <path
          d={describeArc(startAngle, startAngle + scoreArc)}
          fill="none"
          stroke={color}
          strokeWidth={7}
          strokeLinecap="round"
        />
      )}
      {/* Score label */}
      <text
        x={cx}
        y={cy + 2}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={22}
        fontWeight={700}
        fill="hsl(var(--foreground))"
        fontFamily="var(--font-sans)"
      >
        {score}
      </text>
    </svg>
  );
}

type Props = {
  data: BrandTrustData;
};

export function BrandTrustScore({ data }: Readonly<Props>) {
  const TrendIcon =
    data.delta === null ? null
    : data.delta > 0 ? TrendingUp
    : data.delta < 0 ? TrendingDown
    : Minus;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Shield className="h-4 w-4 text-muted-foreground" />
          Brand Trust Score
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col items-center">
            <ScoreArc score={data.score} />
            {TrendIcon && (
              <div
                className={`flex items-center gap-1 text-xs font-medium ${data.delta! > 0 ? "text-success" : "text-destructive"}`}
              >
                <TrendIcon className="h-3 w-3" />
                {Math.abs(data.delta!)} pts
              </div>
            )}
          </div>

          <div className="flex-1 space-y-2.5">
            <div>
              <div className="text-muted-foreground mb-1 text-[10px] font-medium uppercase tracking-wider">
                Citation Rate
              </div>
              <div className="flex items-center gap-2">
                <div className="bg-muted h-1.5 flex-1 overflow-hidden rounded-full">
                  <div
                    className="bg-chart-1 h-full rounded-full"
                    style={{ width: `${Math.min(100, data.citationRate * 100)}%` }}
                  />
                </div>
                <span className="text-foreground w-8 text-right text-xs tabular-nums">
                  {Math.round(data.citationRate * 100)}%
                </span>
              </div>
            </div>

            <div>
              <div className="text-muted-foreground mb-1 text-[10px] font-medium uppercase tracking-wider">
                Sentiment Bonus
              </div>
              <div className="flex items-center gap-2">
                <div className="bg-muted h-1.5 flex-1 overflow-hidden rounded-full">
                  <div
                    className={`h-full rounded-full ${data.sentimentBonus >= 0 ? "bg-success" : "bg-destructive"}`}
                    style={{
                      width: `${Math.min(100, Math.abs(data.sentimentBonus) * 5)}%`,
                    }}
                  />
                </div>
                <span className="text-foreground w-8 text-right text-xs tabular-nums">
                  {data.sentimentBonus > 0 ? "+" : ""}
                  {data.sentimentBonus.toFixed(1)}
                </span>
              </div>
            </div>

            <div>
              <div className="text-muted-foreground mb-1 text-[10px] font-medium uppercase tracking-wider">
                Confidence
              </div>
              <div className="flex items-center gap-2">
                <div className="bg-muted h-1.5 flex-1 overflow-hidden rounded-full">
                  <div
                    className="bg-chart-4 h-full rounded-full"
                    style={{ width: `${Math.min(100, data.confidence * 100)}%` }}
                  />
                </div>
                <span className="text-foreground w-8 text-right text-xs tabular-nums">
                  {Math.round(data.confidence * 100)}%
                </span>
              </div>
            </div>

            <div className="text-muted-foreground text-[10px]">
              Based on {data.sampleSize.toLocaleString()} samples
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
