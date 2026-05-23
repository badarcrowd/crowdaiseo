import { DIFFICULTY_COST } from "../domain/types";
import type {
  GeneratedRecommendation,
  PrioritizedRecommendation,
} from "../domain/types";

/**
 * Prioritization framework.
 *
 * Recommendations are ranked by a single composite score derived from
 * three independently-scored signals so the UI can present a clean
 * "do this next" order without manual triage.
 *
 *   priority = (impactScore * confidence) / difficultyCost
 *
 * Rationale:
 *   - `impactScore` (0..100) is the engine's estimate of how much
 *     implementing this would move the AI visibility score. Larger
 *     impacts win on the numerator.
 *   - `confidence` (0..1) discounts impact when the evidence is thin —
 *     a high-impact suggestion based on 3 data points shouldn't beat a
 *     medium-impact suggestion backed by 100 data points.
 *   - `difficultyCost` divides priority, so a 2-day EASY win typically
 *     outranks a 2-week HARD effort with similar impact.
 *
 * The formula is intentionally transparent. Customers can ask "why is X
 * higher than Y?" and we can show them the three inputs.
 */

export const prioritize = (
  recs: GeneratedRecommendation[],
): PrioritizedRecommendation[] => {
  return recs
    .map((r) => ({
      ...r,
      priorityScore: round2(
        (r.impactScore * r.confidence) /
          (DIFFICULTY_COST[r.difficulty] ?? 1),
      ),
    }))
    .sort((a, b) => b.priorityScore - a.priorityScore);
};

const round2 = (n: number) => Math.round(n * 100) / 100;
