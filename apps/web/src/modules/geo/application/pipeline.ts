import { logger } from "@/lib/logger";
import { loadRecommendationContext } from "../infrastructure/context-loader";
import { recommendationRepository } from "../infrastructure/recommendation.repository";
import { allGenerators } from "./generators";
import { prioritize } from "./prioritize";
import type { PrioritizedRecommendation } from "../domain/types";

/**
 * GEO recommendation pipeline.
 *
 * 1. Load context (one DB pass).
 * 2. Run every generator over the context.
 * 3. Prioritize.
 * 4. Persist (idempotent on `kind + targetKey`).
 *
 * Safe to re-run at any time. Typical triggers:
 *   - After a visibility scan finalizes (handled by intelligence pipeline).
 *   - After a crawl completes (call from the crawler).
 *   - On-demand from a server action.
 */

export const runGeoPipeline = async (input: {
  workspaceId: string;
  projectId: string;
}): Promise<{ written: number; topPriorityScore: number | null }> => {
  assertServerRuntime();
  const ctx = await loadRecommendationContext(input.projectId);
  if (!ctx) {
    logger.warn(
      { projectId: input.projectId },
      "geo.pipeline: project not found",
    );
    return { written: 0, topPriorityScore: null };
  }
  if (ctx.crawl.pagesCrawled === 0 && ctx.visibility.sampleSize === 0) {
    logger.info(
      { projectId: input.projectId },
      "geo.pipeline: no data yet — skipping",
    );
    return { written: 0, topPriorityScore: null };
  }

  // Generators are pure — run them sequentially and accumulate.
  const raw = allGenerators.flatMap((gen) => gen(ctx));
  const prioritized: PrioritizedRecommendation[] = prioritize(raw);

  await recommendationRepository.writeRecommendations({
    workspaceId: input.workspaceId,
    projectId: input.projectId,
    day: new Date(),
    recommendations: prioritized,
  });

  logger.info(
    {
      projectId: input.projectId,
      generated: prioritized.length,
      top: prioritized[0]?.priorityScore ?? null,
    },
    "geo.pipeline: completed",
  );

  return {
    written: prioritized.length,
    topPriorityScore: prioritized[0]?.priorityScore ?? null,
  };
};

function assertServerRuntime() {
  if (typeof window !== "undefined") {
    throw new Error("runGeoPipeline must run on the server");
  }
}
