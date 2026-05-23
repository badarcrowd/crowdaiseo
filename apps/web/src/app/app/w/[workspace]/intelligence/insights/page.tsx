import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Lightbulb } from "lucide-react";
import { PageContent, PageHeader } from "@/components/layout/app-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { prisma } from "@/lib/prisma/client";
import { requireMembership } from "@/lib/auth/session";
import { getIntelligenceProject, getAllInsights } from "@/modules/intelligence/queries";
import { getSelectedProjectId } from "@/lib/actions/select-project-action";
import { InsightExplorer } from "@/modules/intelligence/insights/insight-explorer";

type SearchParams = { filter?: string };

async function ExplorerData({
  workspaceId,
  projectId,
  initialFilter,
}: {
  workspaceId: string;
  projectId: string;
  initialFilter?: string;
}) {
  const insights = await getAllInsights(workspaceId, projectId);
  return (
    <InsightExplorer
      insights={insights}
      workspaceId={workspaceId}
      initialFilter={initialFilter}
    />
  );
}

export default async function InsightsPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ workspace: string }>;
  searchParams: Promise<SearchParams>;
}>) {
  const [{ workspace: slug }, sp] = await Promise.all([params, searchParams]);

  const ws = await prisma.workspace.findUnique({ where: { slug } });
  if (!ws) notFound();
  await requireMembership(ws.id);

  const selectedId = await getSelectedProjectId(ws.id);
  const project = await getIntelligenceProject(ws.id, selectedId);

  return (
    <>
      <PageHeader
        title="Insight Explorer"
        description="Browse, filter, and act on all intelligence insights"
        actions={
          <div className="text-muted-foreground flex items-center gap-2 text-xs">
            <Lightbulb className="h-3.5 w-3.5" />
            90-day window
          </div>
        }
      />
      <PageContent>
        {!project ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-muted-foreground text-sm">
              Create a project to generate insights
            </p>
          </div>
        ) : (
          <Suspense
            fallback={
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Skeleton className="h-9 w-64" />
                  <Skeleton className="h-9 w-40" />
                </div>
                {Array.from({ length: 6 }, (_, i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-xl" />
                ))}
              </div>
            }
          >
            <ExplorerData
              workspaceId={ws.id}
              projectId={project.id}
              initialFilter={sp.filter}
            />
          </Suspense>
        )}
      </PageContent>
    </>
  );
}
