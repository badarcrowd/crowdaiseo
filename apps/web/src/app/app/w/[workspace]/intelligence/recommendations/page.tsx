import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Map } from "lucide-react";
import { PageContent, PageHeader } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { prisma } from "@/lib/prisma/client";
import { requireMembership } from "@/lib/auth/session";
import { getIntelligenceProject, getRecommendations } from "@/modules/intelligence/queries";
import { getSelectedProjectId } from "@/lib/actions/select-project-action";
import { RecommendationCenter } from "@/modules/intelligence/recommendations/recommendation-center";

async function RecommendationData({ projectId }: { projectId: string }) {
  const { items } = await getRecommendations(projectId);
  return <RecommendationCenter items={items} />;
}

export default async function RecommendationsPage({
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
        title="Strategic Recommendations"
        description="GEO and AI optimization roadmap with priority scoring"
      />
      <PageContent>
        {!project ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-muted-foreground text-sm">
              Create a project to generate strategic recommendations
            </p>
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <Map className="text-muted-foreground h-4 w-4" />
                Recommendation Backlog
              </CardTitle>
              <CardDescription className="text-xs">
                Prioritized GEO and AI optimization actions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense
                fallback={
                  <div className="grid gap-4 md:grid-cols-3">
                    {Array.from({ length: 3 }, (_, col) => (
                      <div key={col} className="space-y-3">
                        <Skeleton className="h-6 w-24" />
                        {Array.from({ length: 3 }, (_, i) => (
                          <Skeleton key={i} className="h-32 w-full rounded-xl" />
                        ))}
                      </div>
                    ))}
                  </div>
                }
              >
                <RecommendationData projectId={project.id} />
              </Suspense>
            </CardContent>
          </Card>
        )}
      </PageContent>
    </>
  );
}
