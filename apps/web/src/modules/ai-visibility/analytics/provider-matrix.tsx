import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Heatmap } from "@/components/charts/heatmap";
import {
  CATEGORY_META,
  CATEGORY_ORDER,
  PROVIDER_LABEL,
} from "../presentation/labels";
import type { AnalyticsData } from "./types";
import type { ProviderId, PromptCategory } from "@prisma/client";

type Props = Pick<AnalyticsData, "matrixCells">;

const PROVIDERS: ProviderId[] = ["OPENAI", "ANTHROPIC", "GOOGLE", "PERPLEXITY"];

export function ProviderMatrix({ matrixCells }: Readonly<Props>) {
  const cells = matrixCells.map((c) => ({
    row: c.provider,
    col: c.category,
    value: c.mentionRate,
    count: c.totalRuns,
  }));

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Provider × Category Matrix</CardTitle>
        <CardDescription>
          Brand mention rate for each provider × prompt category combination
        </CardDescription>
      </CardHeader>
      <CardContent>
        {matrixCells.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No data yet — run a scan with multiple prompt categories.
          </p>
        ) : (
          <Heatmap
            rows={PROVIDERS}
            cols={CATEGORY_ORDER}
            cells={cells}
            rowLabel={(r) => PROVIDER_LABEL[r as ProviderId] ?? r}
            colLabel={(c) =>
              CATEGORY_META[c as PromptCategory]?.label ?? c
            }
            color="hsl(var(--chart-1))"
          />
        )}
      </CardContent>
    </Card>
  );
}
