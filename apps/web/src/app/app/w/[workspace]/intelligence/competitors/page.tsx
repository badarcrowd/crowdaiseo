import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Swords } from "lucide-react";
import { PageContent, PageHeader } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma/client";
import { requireMembership } from "@/lib/auth/session";
import { getIntelligenceProject, getCompetitorIntelligence } from "@/modules/intelligence/queries";
import { getSelectedProjectId } from "@/lib/actions/select-project-action";
import { CompetitorCenter } from "@/modules/intelligence/competitors/competitor-center";

async function CompetitorData({
  workspaceId,
  projectId,
}: {
  workspaceId: string;
  projectId: string;
}) {
  const data = await getCompetitorIntelligence(workspaceId, projectId);
  return <CompetitorCenter data={data} />;
}

export default async function CompetitorsIntelligencePage({
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
        title="Competitor Intelligence"
        description="Share of voice, provider dominance, and category performance"
        actions={<Badge variant="outline">Last 30 days</Badge>}
      />
      <PageContent>
        {!project ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-muted-foreground text-sm">Create a project to track competitors</p>
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <Swords className="text-muted-foreground h-4 w-4" />
                Competitor Analysis
              </CardTitle>
              <CardDescription className="text-xs">
                Competitive landscape across AI providers and prompt categories
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense
                fallback={
                  <div className="space-y-3">
                    {Array.from({ length: 5 }, (_, i) => (
                      <Skeleton key={i} className="h-12 w-full rounded-xl" />
                    ))}
                  </div>
                }
              >
                <CompetitorData workspaceId={ws.id} projectId={project.id} />
              </Suspense>
            </CardContent>
          </Card>
        )}
      </PageContent>
    </>
  );
}
