import { notFound } from "next/navigation";
import { Plus, Globe, Search } from "lucide-react";
import { PageContent, PageHeader } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkline } from "@/components/charts/sparkline";
import { prisma } from "@/lib/prisma/client";
import { requireMembership } from "@/lib/auth/session";
import { StartCrawlButton } from "@/modules/crawler/presentation/start-crawl-button";
import { ProjectWizard } from "@/modules/projects/presentation/project-wizard";
import { ProjectActionsMenu } from "@/modules/projects/presentation/project-actions-menu";

// Deterministic pseudo-random for consistent server/client hydration
const seededRandom = (seed: number) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

const series = (n: number, base = 50, jitter = 10, seed = 42) =>
  Array.from({ length: n }, (_, i) =>
    Math.round(base + Math.sin(i / 2) * jitter + (seededRandom(seed + i) - 0.5) * jitter),
  );

export default async function ProjectsPage({
  params,
}: Readonly<{ params: Promise<{ workspace: string }> }>) {
  const { workspace: slug } = await params;
  const ws = await prisma.workspace.findUnique({ where: { slug } });
  if (!ws) notFound();
  await requireMembership(ws.id);

  const projects = await prisma.project.findMany({
    where: { workspaceId: ws.id, deletedAt: null },
    orderBy: { createdAt: "desc" },
    include: {
      crawls: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          status: true,
          pagesCrawled: true,
          issuesFound: true,
          createdAt: true,
        },
      },
      competitors: {
        select: { name: true, domain: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  return (
    <>
      <PageHeader
        title="Projects"
        description="Sites and brands tracked in this workspace."
        actions={
          <>
            <div className="relative">
              <Search className="text-muted-foreground pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2" />
              <input
                placeholder="Search projects"
                className="border-input bg-background h-8 w-56 rounded-md border pl-8 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <ProjectWizard
              workspaceId={ws.id}
              trigger={
                <Button size="sm">
                  <Plus className="h-3.5 w-3.5" /> New project
                </Button>
              }
            />
          </>
        }
      />
      <PageContent>
        {projects.length === 0 ? (
          <Card>
            <CardContent className="text-muted-foreground flex flex-col items-center gap-3 py-16 text-center text-sm">
              <Globe className="text-muted-foreground h-8 w-8" />
              <div>
                <div className="text-foreground text-base font-medium">
                  No projects yet
                </div>
                <p className="mt-1">Create your first project to start tracking.</p>
              </div>
              <Button size="sm" className="mt-2">
                <Plus className="h-3.5 w-3.5" /> New project
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((p) => {
              const lastCrawl = p.crawls[0];
              return (
                <Card key={p.id} className="hover:border-foreground/20 group transition-colors">
                  <CardContent className="pt-5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="bg-secondary flex h-8 w-8 items-center justify-center rounded-md">
                          <Globe className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-foreground text-sm font-semibold">
                            {p.name}
                          </div>
                          <div className="text-muted-foreground font-mono text-xs">
                            {p.domain}
                          </div>
                        </div>
                      </div>
                      <ProjectActionsMenu
                        workspaceId={ws.id}
                        project={{
                          id: p.id,
                          name: p.name,
                          domain: p.domain,
                          description: p.description,
                          country: p.country,
                          language: p.language,
                          keywords: p.keywords,
                          competitors: p.competitors,
                        }}
                      />
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-3">
                      <div>
                        <div className="text-muted-foreground text-[10px] uppercase tracking-wider">
                          Last crawl
                        </div>
                        <div className="mt-0.5 text-sm font-medium">
                          {lastCrawl
                            ? statusLabel(lastCrawl.status)
                            : "Never"}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground text-[10px] uppercase tracking-wider">
                          Pages
                        </div>
                        <div className="mt-0.5 text-lg font-semibold tabular-nums">
                          {lastCrawl?.pagesCrawled ?? 0}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground text-[10px] uppercase tracking-wider">
                          Issues
                        </div>
                        <div className="mt-0.5 text-lg font-semibold tabular-nums">
                          {lastCrawl?.issuesFound ?? 0}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex items-end justify-between">
                      <Badge variant={badgeVariantFor(lastCrawl?.status)}>
                        {lastCrawl ? statusLabel(lastCrawl.status) : "Not crawled"}
                      </Badge>
                      <div className="flex items-center gap-2">
                        <Sparkline
                          data={series(16, 60)}
                          width={100}
                          height={26}
                          color="hsl(var(--chart-1))"
                        />
                        <StartCrawlButton
                          workspaceId={ws.id}
                          projectId={p.id}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </PageContent>
    </>
  );
}

const statusLabel = (s: string) =>
  s
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

const badgeVariantFor = (
  status: string | undefined,
): "outline" | "destructive" | "info" | "success" => {
  if (!status) return "outline";
  if (status === "FAILED") return "destructive";
  if (status === "RUNNING" || status === "QUEUED") return "info";
  return "success";
};
