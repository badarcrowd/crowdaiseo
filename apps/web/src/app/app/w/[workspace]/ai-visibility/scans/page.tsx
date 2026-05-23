import { notFound } from "next/navigation";
import { PageContent, PageHeader } from "@/components/layout/app-shell";
import { prisma } from "@/lib/prisma/client";
import { requireMembership } from "@/lib/auth/session";
import {
  ScansList,
  type RunRow,
} from "@/modules/ai-visibility/presentation/scans-list";

export default async function ScansPage({
  params,
}: Readonly<{ params: Promise<{ workspace: string }> }>) {
  const { workspace: slug } = await params;
  const ws = await prisma.workspace.findUnique({ where: { slug } });
  if (!ws) notFound();
  await requireMembership(ws.id);

  // Bounded fetch — last 200 runs is plenty for an interactive UI.
  const runs = await prisma.promptRun.findMany({
    where: { workspaceId: ws.id },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      prompt: {
        select: { name: true, category: true, versions: { orderBy: { version: "desc" }, take: 1, select: { content: true } } },
      },
      mentions: {
        orderBy: { rank: "asc" },
        select: { kind: true, entity: true, rank: true, excerpt: true },
      },
      citations: {
        orderBy: { rank: "asc" },
        select: { url: true, domain: true, title: true, rank: true },
      },
    },
  });

  const runningCount = await prisma.visibilityScan.count({
    where: { workspaceId: ws.id, status: "RUNNING" },
  });

  const initial: RunRow[] = runs.map((r) => ({
    id: r.id,
    provider: r.provider,
    promptName: r.prompt.name,
    promptCategory: r.prompt.category,
    promptText: r.prompt.versions[0]?.content ?? "",
    status: r.status,
    cached: r.cached,
    brandMentioned: r.brandMentioned,
    brandRank: r.brandRank,
    sentimentLabel: r.sentimentLabel,
    sentimentScore: r.sentimentScore,
    latencyMs: r.latencyMs,
    createdAt: r.createdAt.toISOString(),
    response: r.rawResponse,
    citations: r.citations.map((c) => ({
      url: c.url,
      domain: c.domain,
      title: c.title,
      rank: c.rank,
    })),
    mentions: r.mentions.map((m) => ({
      kind: m.kind,
      entity: m.entity,
      rank: m.rank,
      excerpt: m.excerpt,
    })),
  }));

  return (
    <>
      <PageHeader
        title="Scan results"
        description="Every LLM response captured by AIV — filter, expand, audit."
      />
      <PageContent>
        <ScansList
          workspaceId={ws.id}
          initial={initial}
          isAnyScanRunning={runningCount > 0}
        />
      </PageContent>
    </>
  );
}
