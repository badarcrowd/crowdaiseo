import type { Prisma } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { prisma } from "@/lib/prisma/client";
import type { ScanRepository } from "../domain/ports";

export const scanRepository: ScanRepository = {
  async startScan(scanId) {
    await prisma.visibilityScan.update({
      where: { id: scanId },
      data: { status: "RUNNING", startedAt: new Date() },
    });
  },

  async finishScan(scanId, outcome) {
    await prisma.visibilityScan.update({
      where: { id: scanId },
      data: {
        status: outcome.status,
        finishedAt: new Date(),
        error: outcome.error,
        score: outcome.score?.total,
        scoreBreakdown: outcome.score
          ? (outcome.score as unknown as Prisma.InputJsonValue)
          : undefined,
      },
    });
  },

  async countScanRuns(scanId) {
    const [total, completed, failed] = await Promise.all([
      prisma.promptRun.count({ where: { scanId } }),
      prisma.promptRun.count({
        where: { scanId, status: { in: ["COMPLETED", "CACHED"] } },
      }),
      prisma.promptRun.count({ where: { scanId, status: "FAILED" } }),
    ]);
    return { total, completed, failed };
  },

  async upsertQueuedRun({ scanId, workspaceId, promptId, promptVersion, provider, model }) {
    // Create first and let the DB unique constraint handle concurrent starts.
    // PromptRun intentionally has no updatedAt, so upsert cannot reliably tell
    // whether it inserted or returned an existing row.
    try {
      const run = await prisma.promptRun.create({
        data: {
          scanId,
          workspaceId,
          promptId,
          promptVersion,
          provider,
          model,
          status: "QUEUED",
        },
        select: { id: true },
      });
      return { id: run.id, created: true };
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
    }

    const run = await prisma.promptRun.findUnique({
      where: { scanId_promptId_provider: { scanId, promptId, provider } },
      select: { id: true },
    });
    if (!run) {
      throw new Error("Prompt run insert raced but existing row was not found");
    }
    return { id: run.id, created: false };
  },

  async saveRunOutcome(runId, scanId, outcome, analysis) {
    await prisma.$transaction(async (tx) => {
      await tx.promptRun.update({
        where: { id: runId },
        data: {
          status: outcome.status,
          cached: outcome.cached,
          rawResponse: outcome.response?.text,
          promptTokens: outcome.response?.usage?.inputTokens,
          completionTokens: outcome.response?.usage?.outputTokens,
          costUsd: outcome.costUsd
            ? new Decimal(outcome.costUsd.toFixed(6))
            : undefined,
          latencyMs: outcome.latencyMs,
          error: outcome.error,
          brandMentioned: analysis?.brandMentioned ?? false,
          brandRank: analysis?.brandRank ?? undefined,
          sentimentLabel: analysis?.sentiment?.label ?? undefined,
          sentimentScore: analysis?.sentiment?.score ?? undefined,
          attempts: { increment: 1 },
          finishedAt: new Date(),
        },
      });

      if (analysis && analysis.mentions.length > 0) {
        await tx.mention.createMany({
          data: analysis.mentions.map((m) => ({
            runId,
            kind: m.kind,
            entity: m.entity,
            rank: m.rank,
            position: m.position,
            excerpt: m.excerpt,
          })),
        });
      }
      if (analysis && analysis.citations.length > 0) {
        await tx.citation.createMany({
          data: analysis.citations.map((c) => ({
            runId,
            url: c.url,
            domain: c.domain,
            title: c.title,
            rank: c.rank,
          })),
        });
      }

      await tx.visibilityScan.update({
        where: { id: scanId },
        data: {
          completedRuns:
            outcome.status === "COMPLETED" || outcome.status === "CACHED"
              ? { increment: 1 }
              : undefined,
          failedRuns: outcome.status === "FAILED" ? { increment: 1 } : undefined,
        },
      });
    });
  },

  async finishScanIfRunning(scanId, outcome) {
    const result = await prisma.visibilityScan.updateMany({
      where: { id: scanId, status: "RUNNING" },
      data: {
        status: outcome.status,
        finishedAt: new Date(),
        error: outcome.error,
        score: outcome.score?.total,
        scoreBreakdown: outcome.score
          ? (outcome.score as unknown as Prisma.InputJsonValue)
          : undefined,
      },
    });
    return result.count > 0;
  },

  async markRunFailed(runId, error) {
    await prisma.promptRun.update({
      where: { id: runId },
      data: {
        status: "FAILED",
        error,
        attempts: { increment: 1 },
        finishedAt: new Date(),
      },
    });
  },

  async loadCompletedRuns(scanId) {
    const runs = await prisma.promptRun.findMany({
      where: { scanId, status: { in: ["COMPLETED", "CACHED"] } },
      select: {
        provider: true,
        brandMentioned: true,
        brandRank: true,
        sentimentScore: true,
        _count: { select: { citations: true } },
      },
    });
    return runs.map((r) => ({
      provider: r.provider,
      brandMentioned: r.brandMentioned,
      brandRank: r.brandRank,
      sentimentScore: r.sentimentScore,
      citationCount: r._count.citations,
    }));
  },
};

function isUniqueViolation(err: unknown) {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "P2002"
  );
}
