import type { RecommendationGenerator } from "../../domain/types";
import { contentGenerators } from "./content";
import { technicalGenerators } from "./technical";
import { authorityGenerators } from "./authority";
import { aiOptimizationGenerators } from "./ai-optimization";

/**
 * Registry of all generators. The pipeline calls each, concatenates
 * results, and hands the combined list to the prioritization framework.
 *
 * Adding a new generator: write a pure function `(ctx) => Generated[]`
 * and add it to the appropriate category array. No other wiring needed.
 */
export const allGenerators: RecommendationGenerator[] = [
  ...contentGenerators,
  ...technicalGenerators,
  ...authorityGenerators,
  ...aiOptimizationGenerators,
];

export {
  contentGenerators,
  technicalGenerators,
  authorityGenerators,
  aiOptimizationGenerators,
};
