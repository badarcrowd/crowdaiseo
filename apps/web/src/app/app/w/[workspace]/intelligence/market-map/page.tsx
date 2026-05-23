import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Map } from "lucide-react";
import { PageContent, PageHeader } from "@/components/layout/app-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { prisma } from "@/lib/prisma/client";
import { requireMembership } from "@/lib/auth/session";
import { getIntelligenceProject } from "@/modules/intelligence/queries";
import { getSelectedProjectId } from "@/lib/actions/select-project-action";
import { buildMarketMap } from "@/modules/market-map";
import { ProviderProfileCards } from "@/modules/market-map/analytics/provider-profile-cards";
import { ProviderComparisonMatrix } from "@/modules/market-map/analytics/provider-comparison-matrix";
import { ProviderRadarGrid } from "@/modules/market-map/analytics/provider-radar-grid";
import { CitationInfluenceGraph } from "@/modules/market-map/analytics/citation-influence-graph";
import { ContentPreferenceHeatmap } from "@/modules/market-map/analytics/content-preference-heatmap";
import { CategoryStrengthHeatmap } from "@/modules/market-map/analytics/category-strength-heatmap";
import { RecommendationDrivers } from "@/modules/market-map/analytics/recommendation-drivers";

async function MarketMapContent({
  workspaceId,
  projectId,
}: {
  workspaceId: string;
  projectId: string;
}) {
  const data = await buildMarketMap(workspaceId, projectId, 30);

  return (
    <div className="space-y-6">
      {/* Provider intelligence profiles */}
      <ProviderProfileCards profiles={data.providers} />

      {/* Recommendation drivers */}
      <RecommendationDrivers
        crossProviderInsights={data.crossProviderInsights}
        dataWindow={data.dataWindow}
        totalRunsAnalyzed={data.totalRunsAnalyzed}
        computedAt={data.computedAt}
      />

      {/* Comparison matrix */}
      <ProviderComparisonMatrix profiles={data.providers} />

      {/* Radar behavioral profiles */}
      <ProviderRadarGrid profiles={data.providers} />

      {/* Side-by-side heatmaps */}
      <div className="grid gap-6 xl:grid-cols-2">
        <ContentPreferenceHeatmap profiles={data.providers} />
        <CategoryStrengthHeatmap profiles={data.providers} />
      </div>

      {/* Citation influence graph */}
      <CitationInfluenceGraph profiles={data.providers} />
    </div>
  );
}

function MarketMapSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-64 w-full rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-32 w-full rounded-xl" />
      <Skeleton className="h-72 w-full rounded-xl" />
      <Skeleton className="h-80 w-full rounded-xl" />
      <div className="grid gap-6 xl:grid-cols-2">
        <Skeleton className="h-56 w-full rounded-xl" />
        <Skeleton className="h-56 w-full rounded-xl" />
      </div>
      <Skeleton className="h-72 w-full rounded-xl" />
    </div>
  );
}

export default async function MarketMapPage({
  params,
}: Readonly<{ params: Promise<{ workspace: string }> }>) {
  const { workspace: slug } = await params;

  const ws = await prisma.workspace.findUnique({ where: { slug } });
  if (!ws) notFound();
  await requireMembership(ws.id);

  const selectedId = await getSelectedProjectId(ws.id);
  const project = await getIntelligenceProject(ws.id, selectedId);

  return (
    <>
      <PageHeader
        title="AI Search Market Map"
        description="Provider behavior intelligence — how each AI recommends, cites, and ranks your brand"
        actions={
          <div className="text-muted-foreground flex items-center gap-2 text-xs">
            <Map className="h-3.5 w-3.5" />
            30-day analysis window
          </div>
        }
      />
      <PageContent>
        {!project ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-muted-foreground text-sm">
              Create a project and run scans to generate your AI Search Market Map
            </p>
          </div>
        ) : (
          <Suspense fallback={<MarketMapSkeleton />}>
            <MarketMapContent workspaceId={ws.id} projectId={project.id} />
          </Suspense>
        )}
      </PageContent>
    </>
  );
}
