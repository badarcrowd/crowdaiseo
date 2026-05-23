import { notFound } from "next/navigation";
import { PageContent, PageHeader } from "@/components/layout/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScoreCard } from "@/components/dashboard/score-card";
import { StatCard } from "@/components/dashboard/stat-card";
import { KeywordTrends } from "@/components/dashboard/keyword-trends";
import { AreaChart } from "@/components/charts/area-chart";
import { HorizontalBars } from "@/components/charts/horizontal-bars";
import { Globe2, Link2, Gauge, Download } from "lucide-react";
import { prisma } from "@/lib/prisma/client";
import { requireMembership } from "@/lib/auth/session";
import { getSeoAnalytics } from "@/modules/seo/application/queries";
import { getSelectedProjectId } from "@/lib/actions/select-project-action";

export default async function SEOAnalyticsPage({
  params,
}: Readonly<{ params: Promise<{ workspace: string }> }>) {
  const { workspace: slug } = await params;
  const ws = await prisma.workspace.findUnique({ where: { slug } });
  if (!ws) notFound();
  await requireMembership(ws.id);

  const selectedId = await getSelectedProjectId(ws.id);
  const data = await getSeoAnalytics(ws.id, selectedId);
  const lastUpdated = data.latestCrawl?.finishedAt
    ? new Date(data.latestCrawl.finishedAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      })
    : "No crawl yet";

  return (
    <>
      <PageHeader
        title="SEO Analytics"
        description={
          data.project
            ? `Organic, technical, and keyword signals for ${data.project.domain}.`
            : "Organic performance, technical health, and keyword coverage."
        }
        actions={
          <>
            <Badge variant="outline">{lastUpdated}</Badge>
            <Button size="sm">
              <Download className="h-3.5 w-3.5" /> Export
            </Button>
          </>
        }
      />
      <PageContent className="space-y-6">
        <div className="grid gap-4 lg:grid-cols-4">
          <ScoreCard
            label="SEO Score"
            score={data.score}
            delta={data.scoreDelta}
            trend={data.scoreTrend}
            color="hsl(var(--chart-2))"
          />
          <StatCard
            label="Organic signals"
            value={data.organicSeries.at(-1)?.toLocaleString() ?? "0"}
            delta={0}
            trend={data.organicSeries}
            icon={Globe2}
            color="hsl(var(--chart-1))"
          />
          <StatCard
            label="Citing domains"
            value={data.backlinks.toLocaleString()}
            delta={0}
            trend={data.aiReferralSeries}
            icon={Link2}
            color="hsl(var(--chart-3))"
          />
          <StatCard
            label="Avg. AI rank"
            value={data.avgPosition ? data.avgPosition.toFixed(1) : "—"}
            delta={0}
            trend={data.scoreTrend.map((v) => 100 - v)}
            icon={Gauge}
            color="hsl(var(--chart-4))"
            hint="Lower is better"
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Organic vs. AI-referral signals</CardTitle>
            <CardDescription>Daily crawl-derived and AI mention signals for the last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <AreaChart
              labels={data.labels}
              series={[
                {
                  name: "Organic",
                  color: "hsl(var(--chart-1))",
                  data: data.organicSeries,
                },
                {
                  name: "AI referral",
                  color: "hsl(var(--chart-4))",
                  data: data.aiReferralSeries,
                },
              ]}
              height={280}
              yFormatter="locale"
            />
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Technical health</CardTitle>
              <CardDescription>Site audit subscores</CardDescription>
            </CardHeader>
            <CardContent>
              <HorizontalBars
                max={100}
                rows={data.technicalRows.map((r, i) => ({
                  ...r,
                  color: `hsl(var(--chart-${(i % 5) + 1}))`,
                }))}
              />
            </CardContent>
          </Card>
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Top landing pages</CardTitle>
              <CardDescription>Highest-traffic URLs in your project</CardDescription>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground border-border border-b text-left text-[11px] uppercase tracking-wider">
                    <th className="px-5 py-2 font-medium">URL</th>
                    <th className="px-3 py-2 font-medium">Sessions</th>
                    <th className="px-3 py-2 font-medium">Δ</th>
                    <th className="px-5 py-2 font-medium">Conv. rate</th>
                  </tr>
                </thead>
                <tbody>
                  {data.landingPages.map((r) => (
                    <tr
                      key={r.url}
                      className="border-border hover:bg-secondary/40 border-b transition-colors last:border-0"
                    >
                      <td className="px-5 py-3 font-mono text-xs">{r.url}</td>
                      <td className="px-3 py-3 tabular-nums">
                        {r.sessions.toLocaleString()}
                      </td>
                      <td
                        className={`px-3 py-3 text-xs tabular-nums ${r.delta >= 0 ? "text-success" : "text-destructive"}`}
                      >
                        {r.delta >= 0 ? "+" : ""}
                        {r.delta.toFixed(1)}%
                      </td>
                      <td className="text-muted-foreground px-5 py-3 text-xs tabular-nums">
                        {r.cvr}
                      </td>
                    </tr>
                  ))}
                  {data.landingPages.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="text-muted-foreground px-5 py-10 text-center text-sm"
                      >
                        Start a crawl to populate landing-page analytics.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>

        <KeywordTrends rows={data.keywordRows} />
      </PageContent>
    </>
  );
}
