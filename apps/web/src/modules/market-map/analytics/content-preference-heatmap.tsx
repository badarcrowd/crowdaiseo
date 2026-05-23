import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Heatmap } from "@/components/charts/heatmap";
import type { ProviderProfile, DomainType } from "../domain/types";

const DOMAIN_TYPES: DomainType[] = [
  "Authority",
  "Documentation",
  "News",
  "Blog",
  "Community",
  "Web",
];

const PROVIDERS = ["OPENAI", "ANTHROPIC", "GOOGLE", "PERPLEXITY"] as const;

const PROVIDER_LABEL: Record<string, string> = {
  OPENAI: "ChatGPT",
  ANTHROPIC: "Claude",
  GOOGLE: "Gemini",
  PERPLEXITY: "Perplexity",
};

type Props = { profiles: ProviderProfile[] };

export function ContentPreferenceHeatmap({ profiles }: Readonly<Props>) {
  const cells = profiles.flatMap((p) =>
    DOMAIN_TYPES.map((dt) => ({
      row: p.provider,
      col: dt,
      value: p.citationsByDomainType[dt] ?? 0,
      count: Math.round((p.citationsByDomainType[dt] ?? 0) * 100),
    })),
  );

  const hasData = cells.some((c) => c.value > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Content-Type Preference</CardTitle>
        <CardDescription>
          Citation share by source type — darker = stronger preference for that content category
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <p className="text-muted-foreground text-sm">
            No citation data yet — run scans to populate source preferences.
          </p>
        ) : (
          <Heatmap
            rows={PROVIDERS as unknown as string[]}
            cols={DOMAIN_TYPES}
            cells={cells}
            rowLabel={(r) => PROVIDER_LABEL[r] ?? r}
            colLabel={(c) => c}
            formatValue={(v) => `${Math.round(v * 100)}%`}
            color="hsl(var(--chart-2))"
          />
        )}
      </CardContent>
    </Card>
  );
}
