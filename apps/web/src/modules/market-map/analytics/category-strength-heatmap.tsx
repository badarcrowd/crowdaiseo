import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Heatmap } from "@/components/charts/heatmap";
import type { PromptCategory } from "@prisma/client";
import {
  CATEGORY_META,
  CATEGORY_ORDER,
  PROVIDER_LABEL,
} from "@/modules/ai-visibility/presentation/labels";
import type { ProviderProfile } from "../domain/types";

const PROVIDERS = ["OPENAI", "ANTHROPIC", "GOOGLE", "PERPLEXITY"] as const;

type Props = { profiles: ProviderProfile[] };

export function CategoryStrengthHeatmap({ profiles }: Readonly<Props>) {
  const cells = profiles.flatMap((p) =>
    CATEGORY_ORDER.map((cat) => ({
      row: p.provider,
      col: cat,
      value: p.categoryStrengths[cat as PromptCategory] ?? 0,
      count: p.raw.totalRuns,
    })),
  );

  const hasData = cells.some((c) => c.value > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Prompt-Category Strengths</CardTitle>
        <CardDescription>
          Brand mention rate per provider × prompt category — identifies where each AI is most likely to surface your brand
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <p className="text-muted-foreground text-sm">
            No prompt run data yet — run scans with multiple prompt categories.
          </p>
        ) : (
          <Heatmap
            rows={PROVIDERS as unknown as string[]}
            cols={CATEGORY_ORDER}
            cells={cells}
            rowLabel={(r) => PROVIDER_LABEL[r as keyof typeof PROVIDER_LABEL] ?? r}
            colLabel={(c) => CATEGORY_META[c as PromptCategory]?.label ?? c}
            formatValue={(v) => `${Math.round(v * 100)}%`}
            color="hsl(var(--chart-1))"
          />
        )}
      </CardContent>
    </Card>
  );
}
