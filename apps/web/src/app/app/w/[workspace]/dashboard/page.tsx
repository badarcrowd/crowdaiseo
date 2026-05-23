import { notFound } from "next/navigation";
import { Download, RefreshCw } from "lucide-react";
import { PageContent, PageHeader } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ScoreCard } from "@/components/dashboard/score-card";
import { StatCard } from "@/components/dashboard/stat-card";
import { TopCompetitors } from "@/components/dashboard/top-competitors";
import { KeywordTrends } from "@/components/dashboard/keyword-trends";
import { PlatformComparison } from "@/components/dashboard/platform-comparison";
import { RecentAlerts } from "@/components/dashboard/recent-alerts";
import { AreaChart } from "@/components/charts/area-chart";
import { MessageSquareQuote } from "lucide-react";
import { prisma } from "@/lib/prisma/client";
import { requireMembership } from "@/lib/auth/session";
import { fetchAnalytics } from "@/modules/ai-visibility/analytics/queries";
import { getSeoAnalytics } from "@/modules/seo/application/queries";
import { getSelectedProjectId } from "@/lib/actions/select-project-action";

export default async function DashboardPage({
  params,
}: Readonly<{ params: Promise<{ workspace: string }> }>) {
  const { workspace: slug } = await params;
  const ws = await prisma.workspace.findUnique({ where: { slug } });
  if (!ws) notFound();
  await requireMembership(ws.id);

  const selectedId = await getSelectedProjectId(ws.id);
  const project = await prisma.project.findFirst({
    where: {
      workspaceId: ws.id,
      deletedAt: null,
      ...(selectedId ? { id: selectedId } : {}),
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, domain: true },
  });

  const [visibility, seo, alerts, recommendations] = await Promise.all([
    fetchAnalytics(ws.id, "30d", "ALL"),
    getSeoAnalytics(ws.id, project?.id),
    project
      ? prisma.insightRecord.findMany({
          where: { workspaceId: ws.id, projectId: project.id },
          orderBy: { createdAt: "desc" },
          take: 4,
          select: {
            id: true,
            severity: true,
            title: true,
            body: true,
            createdAt: true,
          },
        })
      : Promise.resolve([]),
    project
      ? prisma.recommendation.findMany({
          where: { workspaceId: ws.id, projectId: project.id, status: "OPEN" },
          orderBy: { priorityScore: "desc" },
          take: 20,
          select: { impactScore: true, confidence: true },
        })
      : Promise.resolve([]),
  ]);

  const aiVisibilityScore = visibility.latestScore ?? 0;
  const aiVisibilityDelta =
    visibility.latestScore !== null && visibility.prevScore !== null
      ? visibility.latestScore - visibility.prevScore
      : 0;
  const geoScore =
    recommendations.length > 0
      ? Math.round(
          recommendations.reduce(
            (sum, item) => sum + item.impactScore * item.confidence,
            0,
          ) / recommendations.length,
        )
      : 0;
  const mentionsTrend = visibility.mentionTrend.map((point) => point.value);
  const aiMentions = visibility.mentionedRuns;
  const platformRows = visibility.providerStats.map((provider) => ({
    platform: provider.label,
    mentions: Math.round(provider.totalRuns * provider.mentionRate),
    sentiment: provider.sentimentAvg,
    share:
      visibility.totalRuns > 0
        ? (provider.totalRuns / visibility.totalRuns) * 100
        : 0,
    delta: 0,
  }));
  const competitorRows = visibility.competitorStats.slice(0, 5).map((competitor) => ({
    name: competitor.entity,
    share: competitor.share * 100,
    delta: 0,
  }));
  const alertRows = alerts.map((alert) => ({
    id: alert.id,
    severity:
      alert.severity === "CRITICAL"
        ? ("critical" as const)
        : alert.severity === "ATTENTION"
          ? ("warning" as const)
          : ("info" as const),
    title: alert.title,
    description: alert.body,
    timestamp: relativeTime(alert.createdAt),
  }));

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Your AI visibility and SEO performance at a glance."
        actions={
          <>
            <Badge variant="outline">Last 30 days</Badge>
            <Button variant="outline" size="sm">
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </Button>
            <Button size="sm">
              <Download className="h-3.5 w-3.5" /> Export
            </Button>
          </>
        }
      />
      <PageContent className="space-y-6">
        {/* Score row */}
        <div className="grid gap-4 lg:grid-cols-4">
          <ScoreCard
            label="AI Visibility"
            score={aiVisibilityScore}
            delta={aiVisibilityDelta}
            trend={visibility.scoreTrend.map((point) => point.value)}
            color="hsl(var(--chart-1))"
            description="Across configured LLM platforms"
          />
          <ScoreCard
            label="SEO Score"
            score={seo.score}
            delta={seo.scoreDelta}
            trend={seo.scoreTrend}
            color="hsl(var(--chart-2))"
            description="On-page + technical health"
          />
          <ScoreCard
            label="GEO Score"
            score={geoScore}
            delta={0}
            trend={seo.scoreTrend.map(() => geoScore)}
            color="hsl(var(--chart-4))"
            description="Generative Engine Optimization"
          />
          <StatCard
            label="AI Mentions"
            value={aiMentions.toLocaleString()}
            delta={0}
            trend={mentionsTrend}
            icon={MessageSquareQuote}
            color="hsl(var(--chart-3))"
            hint="Total citations across LLMs"
          />
        </div>

        {/* Traffic chart + alerts */}
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Search & AI traffic</CardTitle>
                  <CardDescription>
                    Sessions from organic search vs. AI-driven referrers
                  </CardDescription>
                </div>
                <Badge variant="outline">Trailing 30d</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <AreaChart
                labels={seo.labels}
                series={[
                  {
                    name: "Organic search",
                    color: "hsl(var(--chart-1))",
                    data: seo.organicSeries,
                  },
                  {
                    name: "AI referrers",
                    color: "hsl(var(--chart-4))",
                    data: seo.aiReferralSeries,
                  },
                ]}
                yFormatter="locale"
              />
            </CardContent>
          </Card>
          <RecentAlerts items={alertRows} />
        </div>

        {/* Platforms + Competitors */}
        <div className="grid gap-4 lg:grid-cols-2">
          <PlatformComparison rows={platformRows} />
          <TopCompetitors data={competitorRows} />
        </div>

        {/* Keywords */}
        <KeywordTrends rows={seo.keywordRows} />
      </PageContent>
    </>
  );
}

function relativeTime(date: Date) {
  const deltaMs = Date.now() - date.getTime();
  const hours = Math.floor(deltaMs / 3_600_000);
  if (hours < 1) return "now";
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
