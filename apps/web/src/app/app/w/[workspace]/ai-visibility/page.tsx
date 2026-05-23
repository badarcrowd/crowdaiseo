import { Suspense } from "react";
import { notFound } from "next/navigation";
import { PageContent, PageHeader } from "@/components/layout/app-shell";
import { prisma } from "@/lib/prisma/client";
import { requireMembership } from "@/lib/auth/session";
import { DashboardShell } from "@/modules/ai-visibility/analytics/dashboard-shell";
import { fetchAnalytics } from "@/modules/ai-visibility/analytics/queries";
import {
  ScanSetupPanel,
  type SetupCompetitor,
} from "@/modules/ai-visibility/presentation/scan-setup-panel";
import type { DateRange, ProviderFilter } from "@/modules/ai-visibility/analytics/types";
import AIVisibilityLoading from "./loading";
import { getSelectedProjectId } from "@/lib/actions/select-project-action";

type SearchParams = { range?: string; provider?: string };

export default async function AIVisibilityPage({
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
  const project = await prisma.project.findFirst({
    where: {
      workspaceId: ws.id,
      deletedAt: null,
      ...(selectedId ? { id: selectedId } : {}),
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      competitors: {
        select: { id: true, name: true, domain: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  // Validate + normalise URL params
  const range: DateRange =
    sp.range === "7d" || sp.range === "90d" ? sp.range : "30d";

  const providerFilter: ProviderFilter =
    sp.provider === "OPENAI" ||
    sp.provider === "ANTHROPIC" ||
    sp.provider === "GOOGLE" ||
    sp.provider === "PERPLEXITY"
      ? sp.provider
      : "ALL";

  const [data, promptCount, scanCount] = await Promise.all([
    fetchAnalytics(ws.id, range, providerFilter),
    project
      ? prisma.prompt.count({
          where: { projectId: project.id, status: "ACTIVE" },
        })
      : Promise.resolve(0),
    project
      ? prisma.visibilityScan.count({ where: { projectId: project.id } })
      : Promise.resolve(0),
  ]);

  const competitors: SetupCompetitor[] = project?.competitors ?? [];

  return (
    <>
      <PageHeader
        title="AI Visibility"
        description="Track how your brand appears in answers from ChatGPT, Claude, Perplexity and Gemini."
      />
      <PageContent className="space-y-6">
        {project && (
          <ScanSetupPanel
            workspaceId={ws.id}
            workspaceSlug={slug}
            projectId={project.id}
            projectName={project.name}
            competitors={competitors}
            promptCount={promptCount}
            hasScans={scanCount > 0}
          />
        )}
        <Suspense fallback={<AIVisibilityLoading />}>
          <DashboardShell
            data={data}
            range={range}
            providerFilter={providerFilter}
          />
        </Suspense>
      </PageContent>
    </>
  );
}
