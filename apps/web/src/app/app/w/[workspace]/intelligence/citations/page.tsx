import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Quote } from "lucide-react";
import { PageContent, PageHeader } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma/client";
import { requireMembership } from "@/lib/auth/session";
import { getIntelligenceProject, getCitationIntelligence } from "@/modules/intelligence/queries";
import { getSelectedProjectId } from "@/lib/actions/select-project-action";
import { CitationCenter } from "@/modules/intelligence/citations/citation-center";

async function CitationData({
  workspaceId,
  projectId,
}: {
  workspaceId: string;
  projectId: string;
}) {
  const data = await getCitationIntelligence(workspaceId, projectId);
  return <CitationCenter data={data} />;
}

export default async function CitationsIntelligencePage({
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
        title="Citation Intelligence"
        description="Domain authority, citation trends, and provider citation behavior"
        actions={<Badge variant="outline">Last 30 days</Badge>}
      />
      <PageContent>
        {!project ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-muted-foreground text-sm">
              Create a project and run scans to collect citation data
            </p>
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <Quote className="text-muted-foreground h-4 w-4" />
                Citation Analysis
              </CardTitle>
              <CardDescription className="text-xs">
                Domains cited by AI models with authority scoring
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense
                fallback={
                  <div className="space-y-3">
                    {Array.from({ length: 6 }, (_, i) => (
                      <Skeleton key={i} className="h-12 w-full rounded-xl" />
                    ))}
                  </div>
                }
              >
                <CitationData workspaceId={ws.id} projectId={project.id} />
              </Suspense>
            </CardContent>
          </Card>
        )}
      </PageContent>
    </>
  );
}
