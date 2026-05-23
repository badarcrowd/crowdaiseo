import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Brain, RefreshCw, Download, AlertCircle, TrendingUp, Zap, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageContent, PageHeader } from "@/components/layout/app-shell";
import { prisma } from "@/lib/prisma/client";
import { requireMembership } from "@/lib/auth/session";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getIntelligenceProject,
  getExecutiveSummary,
  getCriticalAlerts,
  getGrowthOpportunities,
  getVisibilityTrends,
  getProviderIntelligence,
  getCitationIntelligence,
  getBrandTrustScore,
} from "@/modules/intelligence/queries";
import { ExecutiveSummary } from "@/modules/intelligence/executive/executive-summary";
import { CriticalAlerts } from "@/modules/intelligence/executive/critical-alerts";
import { GrowthOpportunities } from "@/modules/intelligence/executive/growth-opportunities";
import { VisibilityTrends } from "@/modules/intelligence/executive/visibility-trends";
import { ProviderIntelligence } from "@/modules/intelligence/executive/provider-intelligence";
import { CitationIntelligenceSection } from "@/modules/intelligence/executive/citation-intelligence-section";
import { BrandTrustScore } from "@/modules/intelligence/executive/brand-trust-score";
import { rerunExecutiveInsightPipelineAction } from "@/modules/executive-insights/presentation/actions";
import { getSelectedProjectId } from "@/lib/actions/select-project-action";

// ─── Skeleton loaders ─────────────────────────────────────────────────────────

function CardSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-4 w-32" />
      </CardHeader>
      <CardContent className="space-y-3">
        {Array.from({ length: rows }, (_, i) => (
          <Skeleton key={i} className="h-6 w-full" />
        ))}
      </CardContent>
    </Card>
  );
}

// ─── Data components (streamed via Suspense) ──────────────────────────────────

async function SummarySection({
  workspaceId,
  projectId,
}: {
  workspaceId: string;
  projectId: string;
}) {
  const data = await getExecutiveSummary(workspaceId, projectId);
  return <ExecutiveSummary data={data} />;
}

async function AlertsSection({
  workspaceId,
  projectId,
}: {
  workspaceId: string;
  projectId: string;
}) {
  const alerts = await getCriticalAlerts(workspaceId, projectId);
  return <CriticalAlerts alerts={alerts} workspaceId={workspaceId} />;
}

async function OpportunitiesSection({
  workspaceId,
  projectId,
  basePath,
}: {
  workspaceId: string;
  projectId: string;
  basePath: string;
}) {
  const opps = await getGrowthOpportunities(workspaceId, projectId);
  return <GrowthOpportunities opportunities={opps} basePath={basePath} />;
}

async function TrendsSection({
  workspaceId,
  projectId,
}: {
  workspaceId: string;
  projectId: string;
}) {
  const data = await getVisibilityTrends(workspaceId, projectId);
  return <VisibilityTrends data={data} />;
}

async function ProvidersSection({
  workspaceId,
  projectId,
}: {
  workspaceId: string;
  projectId: string;
}) {
  const data = await getProviderIntelligence(workspaceId, projectId);
  return <ProviderIntelligence providers={data} />;
}

async function CitationsSection({
  workspaceId,
  projectId,
}: {
  workspaceId: string;
  projectId: string;
}) {
  const data = await getCitationIntelligence(workspaceId, projectId);
  return <CitationIntelligenceSection data={data} />;
}

async function TrustScoreSection({
  workspaceId,
  projectId,
}: {
  workspaceId: string;
  projectId: string;
}) {
  const data = await getBrandTrustScore(workspaceId, projectId);
  return <BrandTrustScore data={data} />;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function IntelligencePage({
  params,
}: Readonly<{ params: Promise<{ workspace: string }> }>) {
  const { workspace: slug } = await params;

  const ws = await prisma.workspace.findUnique({ where: { slug } });
  if (!ws) notFound();
  await requireMembership(ws.id);

  const selectedId = await getSelectedProjectId(ws.id);
  const project = await getIntelligenceProject(ws.id, selectedId);
  const basePath = `/app/w/${slug}`;

  if (!project) {
    return (
      <>
        <PageHeader
          title="Intelligence Center"
          description="Executive AI visibility intelligence"
        />
        <PageContent>
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="bg-muted mb-4 flex h-14 w-14 items-center justify-center rounded-2xl">
              <Brain className="text-muted-foreground h-7 w-7" />
            </div>
            <h2 className="text-lg font-semibold">No project yet</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Create a project to start generating intelligence
            </p>
          </div>
        </PageContent>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Intelligence Center"
        description={`Strategic AI visibility intelligence for ${project.domain}`}
        actions={
          <>
            <form
              action={async () => {
                "use server";
                await rerunExecutiveInsightPipelineAction({
                  workspaceId: ws.id,
                  projectId: project.id,
                });
              }}
            >
              <Button type="submit" variant="outline" size="sm">
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh Intelligence
              </Button>
            </form>
          </>
        }
      />

      <PageContent className="space-y-6">
        {/* Top row: Summary + Alerts + Opportunities */}
        <div className="grid gap-4 xl:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <Brain className="text-muted-foreground h-4 w-4" />
                Executive Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<div className="space-y-3"><Skeleton className="h-20 w-full" /><Skeleton className="h-16 w-full" /></div>}>
                <SummarySection workspaceId={ws.id} projectId={project.id} />
              </Suspense>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <AlertCircle className="text-destructive h-4 w-4" />
                Critical Alerts
              </CardTitle>
              <CardDescription className="text-xs">
                Requires immediate attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<div className="space-y-2"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div>}>
                <AlertsSection workspaceId={ws.id} projectId={project.id} />
              </Suspense>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <Zap className="text-success h-4 w-4" />
                Growth Opportunities
              </CardTitle>
              <CardDescription className="text-xs">
                Positive signals to act on
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<div className="space-y-2"><Skeleton className="h-14 w-full" /><Skeleton className="h-14 w-full" /><Skeleton className="h-14 w-full" /></div>}>
                <OpportunitiesSection
                  workspaceId={ws.id}
                  projectId={project.id}
                  basePath={basePath}
                />
              </Suspense>
            </CardContent>
          </Card>
        </div>

        {/* Second row: Visibility Trends + Brand Trust */}
        <div className="grid gap-4 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <TrendingUp className="text-muted-foreground h-4 w-4" />
                  AI Visibility Trends
                </CardTitle>
              </div>
              <CardDescription className="text-xs">
                30-day score history across providers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<Skeleton className="h-52 w-full" />}>
                <TrendsSection workspaceId={ws.id} projectId={project.id} />
              </Suspense>
            </CardContent>
          </Card>

          <Suspense fallback={<CardSkeleton rows={4} />}>
            <TrustScoreSection workspaceId={ws.id} projectId={project.id} />
          </Suspense>
        </div>

        {/* Third row: Provider Intelligence + Citation Intelligence */}
        <div className="grid gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <Activity className="text-muted-foreground h-4 w-4" />
                Provider Intelligence
              </CardTitle>
              <CardDescription className="text-xs">
                Performance by AI platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<div className="space-y-3">{Array.from({length: 4}, (_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>}>
                <ProvidersSection workspaceId={ws.id} projectId={project.id} />
              </Suspense>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <Download className="text-muted-foreground h-4 w-4" />
                Citation Intelligence
              </CardTitle>
              <CardDescription className="text-xs">
                Top cited domains · 30d
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<div className="space-y-2">{Array.from({length: 6}, (_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>}>
                <CitationsSection workspaceId={ws.id} projectId={project.id} />
              </Suspense>
            </CardContent>
          </Card>
        </div>
      </PageContent>
    </>
  );
}
