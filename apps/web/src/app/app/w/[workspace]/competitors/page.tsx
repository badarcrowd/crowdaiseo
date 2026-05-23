import { notFound } from "next/navigation";
import { Plus, Swords } from "lucide-react";
import { PageContent, PageHeader } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { TopCompetitors } from "@/components/dashboard/top-competitors";
import { AreaChart } from "@/components/charts/area-chart";
import { Sparkline } from "@/components/charts/sparkline";
import { prisma } from "@/lib/prisma/client";
import { requireMembership } from "@/lib/auth/session";
import { getCompetitorIntelligence } from "@/modules/intelligence/queries";

export default async function CompetitorsPage({
  params,
}: Readonly<{ params: Promise<{ workspace: string }> }>) {
  const { workspace: slug } = await params;
  const ws = await prisma.workspace.findUnique({ where: { slug } });
  if (!ws) notFound();
  await requireMembership(ws.id);

  const project = await prisma.project.findFirst({
    where: { workspaceId: ws.id, deletedAt: null },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  const [trackedCompetitors, intelligence] = project
    ? await Promise.all([
        prisma.competitor.findMany({
          where: { workspaceId: ws.id, projectId: project.id },
          orderBy: { createdAt: "asc" },
          select: { name: true, domain: true },
        }),
        getCompetitorIntelligence(ws.id, project.id),
      ])
    : [[], { shareOfVoice: [], trends: [] } as Awaited<ReturnType<typeof getCompetitorIntelligence>>];

  const labels = intelligence.trends.map((trend) => trend.day);
  const topEntities = intelligence.shareOfVoice.slice(0, 3).map((item) => item.entity);
  const chartSeries = topEntities.map((entity, index) => ({
    name: entity,
    color: `hsl(var(--chart-${(index % 5) + 1}))`,
    data: intelligence.trends.map((trend) =>
      Math.round((trend.byEntity[entity] ?? 0) * 100),
    ),
  }));
  const topCompetitors = intelligence.shareOfVoice.slice(0, 5).map((item) => ({
    name: item.entity,
    share: item.shareOfVoice * 100,
    delta: 0,
  }));
  const statsByName = new Map(
    intelligence.shareOfVoice.map((item) => [item.entity.toLowerCase(), item]),
  );
  const rows = trackedCompetitors.map((competitor) => {
    const stats = statsByName.get(competitor.name.toLowerCase());
    const aiScore = stats ? Math.round(stats.shareOfVoice * 100) : 0;
    return {
      name: competitor.name,
      domain: competitor.domain ?? "",
      aiScore,
      seoScore: 0,
      gap: -aiScore,
      trend: labels.map((day) => {
        const point = intelligence.trends.find((trend) => trend.day === day);
        return Math.round(((point?.byEntity[competitor.name] ?? 0) as number) * 100);
      }),
    };
  });

  return (
    <>
      <PageHeader
        title="Competitors"
        description="Benchmark your AI and SEO visibility against tracked competitors."
        actions={
          <Button size="sm">
            <Plus className="h-3.5 w-3.5" /> Add competitor
          </Button>
        }
      />
      <PageContent className="space-y-6">
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>AI visibility — head-to-head</CardTitle>
              <CardDescription>
                Daily mention share over the last 30 days
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AreaChart
                labels={labels.length > 0 ? labels : ["No data"]}
                series={
                  chartSeries.length > 0
                    ? chartSeries
                    : [{ name: "Competitors", color: "hsl(var(--chart-1))", data: [0] }]
                }
                height={280}
                yFormatter="percent"
              />
            </CardContent>
          </Card>
          <TopCompetitors data={topCompetitors} />
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>All tracked competitors</CardTitle>
                <CardDescription>
                  Side-by-side scoring and gap analysis
                </CardDescription>
              </div>
              <Badge variant="outline">
                <Swords className="h-3 w-3" /> {rows.length} tracked
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground border-border border-b text-left text-[11px] uppercase tracking-wider">
                  <th className="px-5 py-2 font-medium">Competitor</th>
                  <th className="px-3 py-2 font-medium">AI Score</th>
                  <th className="px-3 py-2 font-medium">SEO Score</th>
                  <th className="px-3 py-2 font-medium">Gap</th>
                  <th className="px-5 py-2 font-medium">30-day</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr
                    key={`${c.name}-${c.domain}`}
                    className="border-border hover:bg-secondary/40 border-b transition-colors last:border-0"
                  >
                    <td className="px-5 py-3">
                      <div className="text-foreground font-medium">{c.name}</div>
                      <div className="text-muted-foreground font-mono text-xs">
                        {c.domain}
                      </div>
                    </td>
                    <td className="px-3 py-3 tabular-nums">{c.aiScore}</td>
                    <td className="px-3 py-3 tabular-nums">{c.seoScore}</td>
                    <td className="px-3 py-3">
                      <Badge variant={c.gap >= 0 ? "success" : "destructive"}>
                        {c.gap >= 0 ? "+" : ""}
                        {c.gap}
                      </Badge>
                    </td>
                    <td className="px-5 py-3">
                      <Sparkline
                        data={c.trend.length > 0 ? c.trend : [0]}
                        width={120}
                        height={26}
                        color={
                          (c.trend.at(-1) ?? 0) >= (c.trend[0] ?? 0)
                            ? "hsl(var(--success))"
                            : "hsl(var(--destructive))"
                        }
                      />
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="text-muted-foreground px-5 py-10 text-center text-sm"
                    >
                      Run an AI visibility scan to identify and benchmark competitors.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </PageContent>
    </>
  );
}
