import { notFound } from "next/navigation";
import { PageContent, PageHeader } from "@/components/layout/app-shell";
import { prisma } from "@/lib/prisma/client";
import { requireMembership } from "@/lib/auth/session";
import { getSelectedProjectId } from "@/lib/actions/select-project-action";
import {
  PromptsList,
  type PromptListItem,
} from "@/modules/ai-visibility/presentation/prompts-list";
import { Card, CardContent } from "@/components/ui/card";

export default async function PromptsPage({
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
    select: { id: true, name: true, domain: true, description: true, country: true, language: true, keywords: true },
  });

  if (!project) {
    return (
      <>
        <PageHeader
          title="Prompts"
          description="Manage the prompts AIV sends to LLMs."
        />
        <PageContent>
          <Card>
            <CardContent className="text-muted-foreground flex flex-col items-center gap-2 py-12 text-center text-sm">
              <div className="text-foreground text-base font-medium">
                No project yet
              </div>
              <p>Create a project first — prompts belong to a project.</p>
            </CardContent>
          </Card>
        </PageContent>
      </>
    );
  }

  const promptsRaw = await prisma.prompt.findMany({
    where: { projectId: project.id },
    orderBy: { updatedAt: "desc" },
    include: {
      versions: { orderBy: { version: "desc" }, take: 1 },
      _count: { select: { versions: true, runs: true } },
      runs: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { createdAt: true },
      },
    },
  });

  // Aggregate recent mentions per prompt (last 30d) in one query.
  const since = new Date(Date.now() - 30 * 86_400_000);
  const mentionCounts = await prisma.promptRun.groupBy({
    by: ["promptId"],
    where: { workspaceId: ws.id, createdAt: { gte: since }, brandMentioned: true },
    _count: { _all: true },
  });
  const recentMap = new Map(
    mentionCounts.map((r) => [r.promptId, r._count._all]),
  );

  const prompts: PromptListItem[] = promptsRaw.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    status: p.status,
    currentVersion: p.currentVersion,
    preferredProviders: p.preferredProviders,
    latestContent: p.versions[0]?.content ?? "",
    versions: p._count.versions,
    updatedAt: p.updatedAt.toISOString(),
    lastRunAt: p.runs[0]?.createdAt.toISOString() ?? null,
    recentMentions: recentMap.get(p.id) ?? 0,
  }));

  return (
    <>
      <PageHeader
        title="Prompts"
        description={`Manage the prompts AIV sends to LLMs for "${project.name}".`}
      />
      <PageContent>
        <PromptsList
          workspaceId={ws.id}
          projectId={project.id}
          projectName={project.name}
          initialPersonas={undefined}
          prompts={prompts}
        />
      </PageContent>
    </>
  );
}
