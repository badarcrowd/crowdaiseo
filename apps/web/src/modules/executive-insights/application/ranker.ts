import type { InsightKind, InsightSeverity } from "@prisma/client";
import type { ExecutiveInsight, RankedInsight } from "../domain/types";

/**
 * Insight Ranker.
 *
 * Assigns a priority score (0..100) to each executive insight based on:
 *   - Severity weight (CRITICAL > ATTENTION > INFO)
 *   - Confidence
 *   - Novelty bonus (kind not seen in recent history)
 *
 * Then deduplicates: if two insights have the same `kind`, keeps the
 * highest-priority one. This mirrors the database's `(projectId, kind,
 * forDay)` unique constraint at the application layer so we persist
 * the best version.
 *
 * Final output is sorted descending by priority.
 */

const SEVERITY_WEIGHT: Record<InsightSeverity, number> = {
  CRITICAL: 1.0,
  ATTENTION: 0.65,
  INFO: 0.35,
};

const NOVELTY_BONUS = 1.25;
const BASE_SCALE = 100;

export type RankerInput = {
  insights: ExecutiveInsight[];
  recentKinds: Set<InsightKind>;
};

export const rankInsights = ({
  insights,
  recentKinds,
}: RankerInput): RankedInsight[] => {
  if (insights.length === 0) return [];

  // Score each insight
  const scored = insights.map((insight) => {
    const severityFactor = SEVERITY_WEIGHT[insight.severity] ?? 0.35;
    const novelty = recentKinds.has(insight.kind) ? 1.0 : NOVELTY_BONUS;
    const rawScore = severityFactor * insight.confidence * novelty;
    const priority = Math.round(clamp(rawScore * BASE_SCALE, 0, 100));
    const isNew = !recentKinds.has(insight.kind);
    return { ...insight, priority, isNew };
  });

  // Deduplicate by kind — keep highest priority per kind per day
  const byKind = new Map<string, RankedInsight>();
  for (const ranked of scored) {
    const key = `${ranked.kind}:${ranked.forDay}`;
    const existing = byKind.get(key);
    if (!existing || ranked.priority > existing.priority) {
      byKind.set(key, ranked);
    }
  }

  // Sort descending by priority, then severity, then confidence
  return Array.from(byKind.values()).sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    const sa = SEVERITY_WEIGHT[a.severity] ?? 0;
    const sb = SEVERITY_WEIGHT[b.severity] ?? 0;
    if (sb !== sa) return sb - sa;
    return b.confidence - a.confidence;
  });
};

const clamp = (n: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, n));
