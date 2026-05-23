import { logger } from "@/lib/logger";
import { aggregateEvidence } from "./evidence-aggregator";
import { generateWeeklySummary } from "./generators/weekly-summary";
import { generateCompetitiveThreats } from "./generators/competitive-threat";
import { generateAiPerception } from "./generators/ai-perception";
import { generateBrandTrust } from "./generators/brand-trust";
import { generateProviderRecommendations } from "./generators/provider-recommendations";
import { generateGrowthOpportunities } from "./generators/growth-opportunities";
import { generateStrategicAlerts } from "./generators/strategic-alerts";
import { rankInsights } from "./ranker";
import { executiveInsightRepository } from "../infrastructure/executive-insight.repository";

const MIN_CONFIDENCE = 0.45;

/**
 * Executive Insight Pipeline.
 *
 * Runs all 7 generators in sequence over the aggregated evidence
 * context, ranks the combined output, and persists insights to the
 * InsightRecord table.
 *
 * Idempotent — upserts by (projectId, kind, forDay). Safe to re-run
 * after a scan or on a cron schedule.
 *
 * Triggered from:
 *   1. The intelligence pipeline (after scoring completes).
 *   2. A weekly Monday cron for the executive summary.
 *   3. On-demand via server action.
 */
export const runExecutiveInsightPipeline = async (input: {
  workspaceId: string;
  projectId: string;
}): Promise<{ insightsGenerated: number; criticalCount: number }> => {
  const { workspaceId, projectId } = input;

  // ---- Load all evidence in one pass ----
  const ctx = await aggregateEvidence({ workspaceId, projectId });

  if (ctx.snapshots.length === 0 && ctx.latestRuns.length === 0) {
    logger.info(
      { workspaceId, projectId },
      "executive.pipeline: no data, skipping",
    );
    return { insightsGenerated: 0, criticalCount: 0 };
  }

  // ---- Run generators ----
  const rawInsights = [
    ...generateWeeklySummary(ctx),
    ...generateCompetitiveThreats(ctx),
    ...generateAiPerception(ctx),
    ...generateBrandTrust(ctx),
    ...generateProviderRecommendations(ctx),
    ...generateGrowthOpportunities(ctx),
    ...generateStrategicAlerts(ctx),
  ].filter((i) => i.confidence >= MIN_CONFIDENCE);

  // ---- Rank, deduplicate, embed priority ----
  const ranked = rankInsights({
    insights: rawInsights,
    recentKinds: ctx.recentKinds,
  });

  if (ranked.length === 0) {
    logger.info(
      { workspaceId, projectId },
      "executive.pipeline: no insights passed threshold",
    );
    return { insightsGenerated: 0, criticalCount: 0 };
  }

  // ---- Persist ----
  await executiveInsightRepository.upsertInsights({
    workspaceId,
    projectId,
    insights: ranked,
  });

  const criticalCount = ranked.filter((i) => i.severity === "CRITICAL").length;

  logger.info(
    {
      workspaceId,
      projectId,
      total: ranked.length,
      critical: criticalCount,
      generators: {
        weekly: rawInsights.filter((i) => i.kind === "EXECUTIVE_WEEKLY_SUMMARY").length,
        competitiveThreat: rawInsights.filter((i) => i.kind === "COMPETITIVE_THREAT" || i.kind === "COMPETITOR_NEW_ENTRANT" || i.kind === "COMPETITOR_DOMINANCE").length,
        aiPerception: rawInsights.filter((i) => i.kind === "AI_PERCEPTION_POSITIVE" || i.kind === "AI_PERCEPTION_NEGATIVE" || i.kind === "SENTIMENT_SHIFT" || i.kind === "CATEGORY_WEAK_SPOT").length,
        brandTrust: rawInsights.filter((i) => i.kind === "BRAND_TRUST_SIGNAL").length,
        providerRec: rawInsights.filter((i) => i.kind === "PROVIDER_RECOMMENDATION").length,
        growth: rawInsights.filter((i) => i.kind === "GROWTH_OPPORTUNITY").length,
        alerts: rawInsights.filter((i) => i.kind === "STRATEGIC_ALERT").length,
      },
    },
    "executive.pipeline: completed",
  );

  return { insightsGenerated: ranked.length, criticalCount };
};
