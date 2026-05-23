import type { PromptCategory, ProviderId } from "@prisma/client";
import type {
  CompetitorAggregate,
  CompetitorGap,
  CompetitorIntelligence,
  CompetitorOverlap,
  IntelligenceRunSample,
} from "../domain/types";

/**
 * Competitor Comparison Engine.
 *
 * Inputs: per-run samples (brand status + competitor mentions, by
 * provider/category). Output: aggregated per-entity metrics plus
 * derived gap / overlap / dominance signals.
 *
 * Share-of-voice is computed within the *competitor set only* — the
 * brand is excluded from the denominator on purpose, because mixing the
 * two muddles "who else is the AI talking about?" with "are we
 * winning?". The two questions need separate metrics.
 *
 * Dominance is decided per-category and per-provider using a simple
 * threshold (>=50% of mentions in that slice). This is intentionally
 * conservative; tightening the threshold trades insight count for
 * insight confidence.
 */

const DOMINANCE_THRESHOLD = 0.5;

export const analyzeCompetitors = (
  samples: IntelligenceRunSample[],
): CompetitorIntelligence => {
  const totalRuns = samples.length;
  if (totalRuns === 0) {
    return { aggregates: [], gaps: [], overlaps: [], totalRuns: 0 };
  }

  // ---- Per-entity aggregates ----
  type AggBuilder = {
    entity: string;
    mentions: number;
    appearedInRuns: number;
    ranks: number[];
    byProvider: Record<string, number>;
    byCategory: Record<string, number>;
  };
  const builders = new Map<string, AggBuilder>();

  for (const run of samples) {
    const seenInRun = new Set<string>();
    for (const m of run.competitorMentions) {
      const key = m.entity.toLowerCase();
      let b = builders.get(key);
      if (!b) {
        b = {
          entity: m.entity,
          mentions: 0,
          appearedInRuns: 0,
          ranks: [],
          byProvider: {},
          byCategory: {},
        };
        builders.set(key, b);
      }
      b.mentions++;
      b.ranks.push(m.rank);
      b.byProvider[run.provider] = (b.byProvider[run.provider] ?? 0) + 1;
      b.byCategory[run.promptCategory] =
        (b.byCategory[run.promptCategory] ?? 0) + 1;
      if (!seenInRun.has(key)) {
        b.appearedInRuns++;
        seenInRun.add(key);
      }
    }
  }

  const totalMentions = [...builders.values()].reduce(
    (sum, b) => sum + b.mentions,
    0,
  );

  const aggregates: CompetitorAggregate[] = [...builders.values()]
    .map((b) => ({
      entity: b.entity,
      mentions: b.mentions,
      appearedInRuns: b.appearedInRuns,
      totalRuns,
      avgRank: b.ranks.length > 0 ? round1(mean(b.ranks)) : null,
      byProvider: b.byProvider as Record<ProviderId, number>,
      byCategory: b.byCategory as Record<PromptCategory, number>,
      shareOfVoice: totalMentions > 0 ? b.mentions / totalMentions : 0,
    }))
    .sort((a, b) => b.mentions - a.mentions);

  // ---- Brand mention totals for gap analysis ----
  const brandAppeared = samples.filter((s) => s.brandMentioned).length;

  // ---- Gap analysis ----
  // For each competitor, compute appearance delta vs brand, plus the
  // categories/providers where the competitor dominates the slice.
  const categoryTotals = countBy(samples, (s) => s.promptCategory);
  const providerTotals = countBy(samples, (s) => s.provider);

  const gaps: CompetitorGap[] = aggregates
    .map((a) => {
      const delta = brandAppeared - a.appearedInRuns;
      const dominantCategories: PromptCategory[] = [];
      for (const [cat, count] of Object.entries(a.byCategory)) {
        const total = categoryTotals.get(cat) ?? 0;
        if (total > 0 && count / total >= DOMINANCE_THRESHOLD) {
          dominantCategories.push(cat as PromptCategory);
        }
      }
      const dominantProviders: ProviderId[] = [];
      for (const [prov, count] of Object.entries(a.byProvider)) {
        const total = providerTotals.get(prov) ?? 0;
        if (total > 0 && count / total >= DOMINANCE_THRESHOLD) {
          dominantProviders.push(prov as ProviderId);
        }
      }
      return {
        entity: a.entity,
        delta,
        dominantCategories,
        dominantProviders,
      };
    })
    // Only surface competitors that beat the brand somewhere.
    .filter(
      (g) =>
        g.delta < 0 ||
        g.dominantCategories.length > 0 ||
        g.dominantProviders.length > 0,
    )
    .sort((a, b) => a.delta - b.delta);

  // ---- Overlap analysis ----
  // Per-competitor: how often did the brand also show up in the same
  // run? Distinguishes "we co-appear with this rival" (manageable) from
  // "they replace us" (urgent).
  const overlaps: CompetitorOverlap[] = aggregates.map((a) => {
    let both = 0;
    let onlyComp = 0;
    for (const run of samples) {
      const has = run.competitorMentions.some(
        (m) => m.entity.toLowerCase() === a.entity.toLowerCase(),
      );
      if (!has) continue;
      if (run.brandMentioned) both++;
      else onlyComp++;
    }
    return {
      entity: a.entity,
      overlapRate: totalRuns > 0 ? both / totalRuns : 0,
      exclusiveRate: totalRuns > 0 ? onlyComp / totalRuns : 0,
    };
  });

  return { aggregates, gaps, overlaps, totalRuns };
};

// ---------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------

const mean = (xs: number[]) =>
  xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length;

const round1 = (n: number) => Math.round(n * 10) / 10;

const countBy = <T>(arr: T[], key: (t: T) => string): Map<string, number> => {
  const m = new Map<string, number>();
  for (const item of arr) {
    const k = key(item);
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
};
